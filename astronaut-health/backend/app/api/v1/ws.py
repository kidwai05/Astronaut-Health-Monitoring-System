"""WebSocket endpoint for real-time alert streaming."""

from collections import defaultdict
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(prefix="/ws", tags=["ws"])


class ConnectionManager:
    """Manages WebSocket connections keyed by crew_id.

    Allows publishing alert payloads to all active connections for a given crew member.
    """

    def __init__(self) -> None:
        self._connections: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, crew_id: str, ws: WebSocket) -> None:
        """Accept a WebSocket connection and register it for the crew member."""
        await ws.accept()
        self._connections[crew_id].append(ws)

    def disconnect(self, crew_id: str, ws: WebSocket) -> None:
        """Remove a WebSocket connection from the crew member's channel."""
        if ws in self._connections[crew_id]:
            self._connections[crew_id].remove(ws)

    async def publish(self, crew_id: str, payload: dict[str, Any]) -> None:
        """Publish an alert payload to all active connections for a crew member.

        Args:
            crew_id: The crew member whose connections should receive the payload
            payload: The alert data to send (will be JSON-serialized)
        """
        for ws in list(self._connections.get(crew_id, [])):
            try:
                await ws.send_json(payload)
            except Exception:
                # Silently ignore send failures (connection may have closed)
                pass


# Global singleton connection manager
connection_manager = ConnectionManager()


@router.websocket("/alerts")
async def ws_alerts(websocket: WebSocket, token: str | None = None) -> None:
    """WebSocket endpoint for real-time alert delivery.

    Clients connect with `WS /api/v1/ws/alerts?token=<jwt>`.
    The JWT is validated, and the connection is registered for the crew_id.
    Critical alerts are automatically pushed to all active connections.

    Args:
        websocket: The WebSocket connection
        token: JWT token passed as query parameter for authentication

    Behavior:
        - Closes with code 4001 if token is missing or invalid
        - Keeps connection alive by receiving (and ignoring) client frames
        - Automatically unregisters connection on disconnect
    """
    if not token:
        await websocket.close(code=4001)
        return

    # Validate JWT and extract crew_id
    try:
        from jose import JWTError, jwt

        from app.config import get_settings

        settings = get_settings()
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        crew_id: str = payload["sub"]
    except (JWTError, KeyError):
        await websocket.close(code=4001)
        return

    # Register connection
    await connection_manager.connect(crew_id, websocket)

    try:
        # Keep connection alive by receiving client frames (ignore content)
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        # Unregister on disconnect
        connection_manager.disconnect(crew_id, websocket)
