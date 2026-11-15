"""Unit tests for WebSocket ConnectionManager."""

import pytest
from unittest.mock import AsyncMock, Mock

from app.api.v1.ws import ConnectionManager


@pytest.mark.anyio
async def test_connection_manager_connect():
    """Test ConnectionManager registers WebSocket connections."""
    manager = ConnectionManager()
    mock_ws = AsyncMock()
    
    await manager.connect("crew_123", mock_ws)
    
    # Verify connection was accepted and registered
    mock_ws.accept.assert_called_once()
    assert mock_ws in manager._connections["crew_123"]


@pytest.mark.anyio
async def test_connection_manager_multiple_connections_same_crew():
    """Test ConnectionManager handles multiple connections for the same crew member."""
    manager = ConnectionManager()
    mock_ws1 = AsyncMock()
    mock_ws2 = AsyncMock()
    
    await manager.connect("crew_123", mock_ws1)
    await manager.connect("crew_123", mock_ws2)
    
    assert len(manager._connections["crew_123"]) == 2
    assert mock_ws1 in manager._connections["crew_123"]
    assert mock_ws2 in manager._connections["crew_123"]


@pytest.mark.anyio
async def test_connection_manager_multiple_crew_members():
    """Test ConnectionManager isolates connections by crew_id."""
    manager = ConnectionManager()
    mock_ws_crew1 = AsyncMock()
    mock_ws_crew2 = AsyncMock()
    
    await manager.connect("crew_123", mock_ws_crew1)
    await manager.connect("crew_456", mock_ws_crew2)
    
    assert mock_ws_crew1 in manager._connections["crew_123"]
    assert mock_ws_crew2 in manager._connections["crew_456"]
    assert mock_ws_crew1 not in manager._connections["crew_456"]
    assert mock_ws_crew2 not in manager._connections["crew_123"]


def test_connection_manager_disconnect():
    """Test ConnectionManager removes connections on disconnect."""
    manager = ConnectionManager()
    mock_ws = Mock()
    
    # Manually add connection (bypass async connect)
    manager._connections["crew_123"].append(mock_ws)
    
    manager.disconnect("crew_123", mock_ws)
    
    assert mock_ws not in manager._connections["crew_123"]


def test_connection_manager_disconnect_nonexistent():
    """Test ConnectionManager handles disconnecting non-existent connections gracefully."""
    manager = ConnectionManager()
    mock_ws = Mock()
    
    # Should not raise an error
    manager.disconnect("crew_123", mock_ws)
    
    # Connection should still not be present
    assert mock_ws not in manager._connections["crew_123"]


@pytest.mark.anyio
async def test_connection_manager_publish_single_connection():
    """Test ConnectionManager publishes to a single connection."""
    manager = ConnectionManager()
    mock_ws = AsyncMock()
    
    await manager.connect("crew_123", mock_ws)
    
    payload = {"type": "alert", "severity": "critical"}
    await manager.publish("crew_123", payload)
    
    mock_ws.send_json.assert_called_once_with(payload)


@pytest.mark.anyio
async def test_connection_manager_publish_multiple_connections():
    """Test ConnectionManager publishes to all connections for a crew member."""
    manager = ConnectionManager()
    mock_ws1 = AsyncMock()
    mock_ws2 = AsyncMock()
    
    await manager.connect("crew_123", mock_ws1)
    await manager.connect("crew_123", mock_ws2)
    
    payload = {"type": "alert", "severity": "critical"}
    await manager.publish("crew_123", payload)
    
    mock_ws1.send_json.assert_called_once_with(payload)
    mock_ws2.send_json.assert_called_once_with(payload)


@pytest.mark.anyio
async def test_connection_manager_publish_handles_exceptions():
    """Test ConnectionManager catches and ignores send failures."""
    manager = ConnectionManager()
    mock_ws1 = AsyncMock()
    mock_ws2 = AsyncMock()
    
    # Make first connection fail
    mock_ws1.send_json.side_effect = Exception("Connection closed")
    
    await manager.connect("crew_123", mock_ws1)
    await manager.connect("crew_123", mock_ws2)
    
    payload = {"type": "alert", "severity": "critical"}
    
    # Should not raise an exception
    await manager.publish("crew_123", payload)
    
    # Second connection should still receive the payload
    mock_ws1.send_json.assert_called_once_with(payload)
    mock_ws2.send_json.assert_called_once_with(payload)


@pytest.mark.anyio
async def test_connection_manager_publish_no_connections():
    """Test ConnectionManager handles publishing when no connections exist."""
    manager = ConnectionManager()
    
    payload = {"type": "alert", "severity": "critical"}
    
    # Should not raise an exception
    await manager.publish("crew_123", payload)


@pytest.mark.anyio
async def test_connection_manager_publish_only_to_specific_crew():
    """Test ConnectionManager publishes only to the specified crew member."""
    manager = ConnectionManager()
    mock_ws_crew1 = AsyncMock()
    mock_ws_crew2 = AsyncMock()
    
    await manager.connect("crew_123", mock_ws_crew1)
    await manager.connect("crew_456", mock_ws_crew2)
    
    payload = {"type": "alert", "severity": "critical"}
    await manager.publish("crew_123", payload)
    
    # Only crew_123's connection should receive the message
    mock_ws_crew1.send_json.assert_called_once_with(payload)
    mock_ws_crew2.send_json.assert_not_called()
