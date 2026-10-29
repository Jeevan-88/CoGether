document.addEventListener('DOMContentLoaded', () => {
  const roomInput = document.getElementById('roomInput');
  const connectBtn = document.getElementById('connectBtn');
  const disconnectBtn = document.getElementById('disconnectBtn');
  const statusBadge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');

  // Check current status from background worker
  chrome.runtime.sendMessage({ action: 'GET_STATUS' }, (response) => {
    if (response && response.isConnected) {
      setConnectedUI(response.roomCode);
    } else {
      setDisconnectedUI();
    }
  });

  function setConnectedUI(roomCode) {
    statusBadge.classList.add('connected');
    statusText.textContent = `Synced (${roomCode})`;
    roomInput.value = roomCode;
    roomInput.disabled = true;
    connectBtn.style.display = 'none';
    disconnectBtn.style.display = 'block';
  }

  function setDisconnectedUI() {
    statusBadge.classList.remove('connected');
    statusText.textContent = 'Offline';
    roomInput.disabled = false;
    connectBtn.style.display = 'block';
    disconnectBtn.style.display = 'none';
  }

  connectBtn.addEventListener('click', () => {
    const code = roomInput.value.trim();
    if (!code) {
      roomInput.focus();
      return;
    }
    chrome.runtime.sendMessage({ action: 'JOIN_ROOM', roomCode: code }, (response) => {
      if (response && response.success) {
        setConnectedUI(code);
      }
    });
  });

  disconnectBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'LEAVE_ROOM' }, (response) => {
      setDisconnectedUI();
    });
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.from === 'background') {
      if (msg.status === 'connected' || msg.status === 'connected_local') {
        setConnectedUI(msg.room);
      } else if (msg.status === 'disconnected') {
        setDisconnectedUI();
      }
    }
  });
});
