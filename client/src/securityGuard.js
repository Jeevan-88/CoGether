/**
 * CoGether Web Security & Anti-Theft Protection Engine
 * Prevents unauthorized inspection, code dumping, asset extraction, right-click, and DevTools scraping.
 */

export function initSecurityGuard() {
  if (typeof window === 'undefined') return;

  // 1. DISABLE RIGHT-CLICK CONTEXT MENU (PREVENTS "SAVE IMAGE AS" & "INSPECT")
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  }, { capture: true });

  // 2. DISABLE IMAGE & ASSET DRAGGING
  document.addEventListener('dragstart', (e) => {
    if (e.target.nodeName === 'IMG' || e.target.nodeName === 'VIDEO' || e.target.nodeName === 'CANVAS') {
      e.preventDefault();
      return false;
    }
  }, { capture: true });

  // 3. DISABLE INSPECTION KEYBOARD SHORTCUTS
  document.addEventListener('keydown', (e) => {
    // F12 (Inspect Element)
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    const isCtrlOrCmd = e.ctrlKey || e.metaKey;

    // Ctrl+Shift+I (DevTools), Ctrl+Shift+J (Console), Ctrl+Shift+C (Inspect Element)
    if (isCtrlOrCmd && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+U / Cmd+Opt+U (View Page Source)
    if (isCtrlOrCmd && (e.key === 'U' || e.key === 'u')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+S / Cmd+S (Save Webpage HTML & Assets)
    if (isCtrlOrCmd && (e.key === 'S' || e.key === 's')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+P / Cmd+P (Print to PDF / Save As PDF)
    if (isCtrlOrCmd && (e.key === 'P' || e.key === 'p')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, { capture: true });

  // 4. CONSOLE WARNING BANNER & CONTINUOUS CONSOLE PURGING IN PRODUCTION
  if (process.env.NODE_ENV === 'production') {
    setInterval(() => {
      console.clear();
      console.log(
        '%c⛔ STOP! COGETHER PROPRIETARY CODEBASE',
        'color: #ff0055; font-size: 24px; font-weight: bold; -webkit-text-stroke: 1px black;'
      );
      console.log(
        '%cAll assets, UI architectures, code, and systems are copyrighted by CoGether Inc. & Jeevan Yadav. Unauthorized extraction or reverse engineering is strictly prohibited.',
        'color: #ffffff; background: #000000; font-size: 14px; padding: 8px;'
      );
    }, 2500);
  }
}
