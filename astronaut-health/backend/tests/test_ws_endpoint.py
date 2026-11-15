"""Integration test for WebSocket endpoint."""

import pytest
from jose import jwt
from starlette.websockets import WebSocketDisconnect

from app.config import get_settings


def test_ws_endpoint_rejects_missing_token(client):
    """Test WebSocket endpoint closes connection when token is missing."""
    # Connection should be closed immediately with code 4001
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/api/v1/ws/alerts") as websocket:
            websocket.receive_text()


def test_ws_endpoint_rejects_invalid_token(client):
    """Test WebSocket endpoint closes connection with invalid token."""
    # Connection should be closed immediately with code 4001
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/api/v1/ws/alerts?token=invalid_token") as websocket:
            websocket.receive_text()


def test_ws_endpoint_accepts_valid_token(client, crew_id):
    """Test WebSocket endpoint accepts valid JWT token."""
    settings = get_settings()
    
    # Create a valid JWT token
    token = jwt.encode(
        {"sub": crew_id, "role": "crew", "exp": 9999999999},
        settings.secret_key,
        algorithm="HS256"
    )
    
    with client.websocket_connect(f"/api/v1/ws/alerts?token={token}") as websocket:
        # Connection should be established successfully
        # Send a ping to verify connection is alive
        websocket.send_text("ping")
        
        # The endpoint should ignore the message and keep connection alive
        # We don't expect a response, so we just verify no exception is raised
        assert websocket is not None
