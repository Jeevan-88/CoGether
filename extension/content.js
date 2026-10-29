/**
 * CoGether Cinema Sync Companion — Content Script
 * Injected into Netflix, Prime Video, Disney+, Hotstar, Crunchyroll, and YouTube tabs.
 * Detects HTML5 video element and synchronizes playback states across party members.
 */

let videoElement = null;
let isSyncing = false; // Prevents recursive event loops
let toastElement = null;

// Initialize toast notification badge
function ensureToast() {
  if (toastElement) return toastElement;
  const toast = document.createElement('div');
  toast.id = 'cogether-sync-toast';
  toast.style.position = 'fixed';
  toast.style.top = '24px';
  toast.style.right = '24px';
  toast.style.zIndex = '2147483647';
  toast.style.display = 'none';
  toast.style.alignItems = 'center';
  toast.style.gap = '10px';
  toast.style.padding = '10px 18px';
  toast.style.background = 'rgba(15, 11, 14, 0.92)';
  toast.style.backdropFilter = 'blur(16px)';
  toast.style.webkitBackdropFilter = 'blur(16px)';
  toast.style.border = '1px solid rgba(176, 35, 71, 0.4)';
  toast.style.borderRadius = '999px';
  toast.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.7), 0 0 20px rgba(176, 35, 71, 0.2)';
  toast.style.fontFamily = "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif";
  toast.style.fontSize = '13px';
  toast.style.fontWeight = '500';
  toast.style.color = '#f2eef0';
  toast.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
  document.body.appendChild(toast);
  toastElement = toast;
  return toast;
}

function showToast(text, duration = 3000) {
  const toast = ensureToast();
  toast.innerHTML = `
    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#e0305a;box-shadow:0 0 8px #e0305a;"></span>
    <span>${text}</span>
  `;
  toast.style.display = 'inline-flex';
  toast.style.transform = 'translateY(0) scale(1)';
  toast.style.opacity = '1';

  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px) scale(0.95)';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 300);
  }, duration);
}

// Locate video element (handles dynamically rendered players)
function findVideo() {
  const videos = document.querySelectorAll('video');
  if (videos.length > 0) {
    // Pick the largest visible video player
    let bestVideo = videos[0];
    let maxArea = 0;
    videos.forEach((v) => {
      const rect = v.getBoundingClientRect();
      const area = rect.width * rect.height;
      if (area > maxArea) {
        maxArea = area;
        bestVideo = v;
      }
    });
    return bestVideo;
  }
  return null;
}

function attachVideoListeners(video) {
  if (!video || video._hasCoGetherListeners) return;
  video._hasCoGetherListeners = true;
  videoElement = video;

  video.addEventListener('play', () => {
    if (isSyncing) return;
    chrome.runtime.sendMessage({
      action: 'MEDIA_EVENT',
      event: 'play',
      time: video.currentTime
    }).catch(() => {});
  });

  video.addEventListener('pause', () => {
    if (isSyncing) return;
    chrome.runtime.sendMessage({
      action: 'MEDIA_EVENT',
      event: 'pause',
      time: video.currentTime
    }).catch(() => {});
  });

  video.addEventListener('seeked', () => {
    if (isSyncing) return;
    chrome.runtime.sendMessage({
      action: 'MEDIA_EVENT',
      event: 'seek',
      time: video.currentTime
    }).catch(() => {});
  });

  console.log('[CoGether Sync] Hooked video element for party synchronization');
}

// Poll for video element in single-page apps (SPAs)
const observer = new MutationObserver(() => {
  const v = findVideo();
  if (v && v !== videoElement) {
    attachVideoListeners(v);
  }
});
observer.observe(document.body, { childList: true, subtree: true });

// Listen for commands from the background service worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const v = videoElement || findVideo();

  if (request.action === 'SYNC_STATUS') {
    if (request.connected) {
      showToast(`CoGether Sync Active (Room ${request.room})`);
    } else {
      showToast('CoGether Sync Disconnected');
    }
    sendResponse({ ok: true });
    return true;
  }

  if (!v) {
    sendResponse({ error: 'No video player found on page' });
    return true;
  }

  if (request.action === 'EXEC_PLAY') {
    isSyncing = true;
    if (Math.abs(v.currentTime - request.time) > 1.5) {
      v.currentTime = request.time;
    }
    v.play().catch(() => {}).finally(() => {
      setTimeout(() => { isSyncing = false; }, 400);
    });
    showToast('▶ Party Host Resumed Playback');
  } else if (request.action === 'EXEC_PAUSE') {
    isSyncing = true;
    if (request.time !== undefined && Math.abs(v.currentTime - request.time) > 1.5) {
      v.currentTime = request.time;
    }
    v.pause();
    setTimeout(() => { isSyncing = false; }, 400);
    showToast('⏸ Party Host Paused Playback');
  } else if (request.action === 'EXEC_SEEK') {
    isSyncing = true;
    v.currentTime = request.time;
    setTimeout(() => { isSyncing = false; }, 400);
    showToast(`⏩ Jumped to ${Math.floor(request.time / 60)}:${Math.floor(request.time % 60).toString().padStart(2, '0')}`);
  }

  sendResponse({ ok: true });
  return true;
});

// Initial check
setTimeout(() => {
  const v = findVideo();
  if (v) attachVideoListeners(v);
}, 1000);
