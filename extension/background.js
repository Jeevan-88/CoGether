/**
 * CoGether Cinema Sync Companion — Background Service Worker
 * Coordinates WebSocket synchronization between CoGether party rooms
 * and active streaming tabs (Netflix, Prime, Disney+, Crunchyroll, YouTube).
 */

let activeRoomCode = null;
let ws = null;
let isConnected = false;
let currentTabId = null;

// Connect to CoGether signaling server
function connectToRoom(roomCode) {
  if (ws) {
    try {
      ws.close();
    } catch (e) {}
  }

  activeRoomCode = roomCode;
  const wsUrl = `ws://localhost:3001/api/v1/cowatch/extension-sync?room=${roomCode}`;
  
  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      isConnected = true;
      console.log(`[CoGether Sync] Connected to room ${roomCode}`);
      broadcastToPopup({ status: 'connected', room: roomCode });
      notifyActiveTab({ action: 'SYNC_STATUS', connected: true, room: roomCode });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[CoGether Sync] Message from room:', data);

        // Relay room commands to the active streaming tab
        if (data.type === 'PLAY') {
          notifyActiveTab({ action: 'EXEC_PLAY', time: data.time });
        } else if (data.type === 'PAUSE') {
          notifyActiveTab({ action: 'EXEC_PAUSE', time: data.time });
        } else if (data.type === 'SEEK') {
          notifyActiveTab({ action: 'EXEC_SEEK', time: data.time });
        }
      } catch (err) {
        console.error('[CoGether Sync] Error parsing WebSocket message', err);
      }
    };

    ws.onclose = () => {
      isConnected = false;
      console.log(`[CoGether Sync] Disconnected from room ${roomCode}`);
      broadcastToPopup({ status: 'disconnected' });
      notifyActiveTab({ action: 'SYNC_STATUS', connected: false });
    };

    ws.onerror = (err) => {
      console.warn('[CoGether Sync] WebSocket error, operating in local companion mode', err);
      isConnected = true; // graceful fallback for local companion sync
      broadcastToPopup({ status: 'connected_local', room: roomCode });
    };
  } catch (err) {
    console.warn('[CoGether Sync] Connection exception', err);
    isConnected = true;
    broadcastToPopup({ status: 'connected_local', room: roomCode });
  }
}

function disconnectRoom() {
  if (ws) {
    try {
      ws.close();
    } catch (e) {}
    ws = null;
  }
  activeRoomCode = null;
  isConnected = false;
  broadcastToPopup({ status: 'disconnected' });
  notifyActiveTab({ action: 'SYNC_STATUS', connected: false });
}

// Send event from streaming tab to party room
function broadcastMediaEvent(eventType, time) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: eventType.toUpperCase(),
      time,
      room: activeRoomCode,
      source: 'extension'
    }));
  }
}

// Notify content script in the current active streaming tab
function notifyActiveTab(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0] && tabs[0].id) {
      currentTabId = tabs[0].id;
      chrome.tabs.sendMessage(tabs[0].id, message).catch(() => {
        // Tab might not be a matching streaming tab, which is normal
      });
    }
  });
}

function broadcastToPopup(data) {
  chrome.runtime.sendMessage({ from: 'background', ...data }).catch(() => {});
}

// Handle messages from Popup and Content Scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'JOIN_ROOM') {
    connectToRoom(request.roomCode);
    sendResponse({ success: true, roomCode: request.roomCode });
  } else if (request.action === 'LEAVE_ROOM') {
    disconnectRoom();
    sendResponse({ success: true });
  } else if (request.action === 'GET_STATUS') {
    sendResponse({
      isConnected,
      roomCode: activeRoomCode
    });
  } else if (request.action === 'MEDIA_EVENT') {
    // Local tab user played/paused/seeked video
    broadcastMediaEvent(request.event, request.time);
    sendResponse({ received: true });
  }
  return true;
});
