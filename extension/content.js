// Content script injected into Chess.com pages
console.log("[ChessBridge Extension] Content script loaded.");

let isExtracting = false;
let lastProcessedGameUrl = null;

// Observe DOM changes to detect game end / new-game-buttons-buttons
const observer = new MutationObserver(() => {
  checkForGameEndButtons();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Periodic backup check
setInterval(checkForGameEndButtons, 1000);

function checkForGameEndButtons() {
  const container = document.querySelector('div.new-game-buttons-buttons') || 
                    document.querySelector('.new-game-buttons-buttons') ||
                    document.querySelector('[class*="new-game-buttons-buttons"]');

  if (!container) return;

  // Check if our button is already added
  if (document.getElementById('chess-bridge-analyze-btn')) return;

  console.log("[ChessBridge Extension] Game over container detected! Injecting Analyze button...");
  injectAnalyzeButton(container);
}

function injectAnalyzeButton(container) {
  const btn = document.createElement('button');
  btn.id = 'chess-bridge-analyze-btn';
  btn.title = 'Send this game to Lichess for free cloud analysis';
  btn.innerHTML = `
    <span class="bridge-icon">♞</span>
    <span class="btn-text">Analyze on Lichess</span>
    <span class="bridge-arrow">↗</span>
  `;

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isExtracting) return;
    await handleAnalyzeClick(btn);
  });

  // Insert at the top of the button group or after the first primary button
  if (container.firstChild) {
    container.insertBefore(btn, container.firstChild);
  } else {
    container.appendChild(btn);
  }

  // Check if auto-import is enabled
  chrome.storage.local.get(['autoImport'], (result) => {
    if (result.autoImport && window.location.href !== lastProcessedGameUrl) {
      console.log("[ChessBridge Extension] Auto-import enabled! Triggering analysis in 1s...");
      lastProcessedGameUrl = window.location.href;
      setTimeout(() => {
        if (!isExtracting && document.getElementById('chess-bridge-analyze-btn')) {
          handleAnalyzeClick(btn);
        }
      }, 1200);
    }
  });
}

async function handleAnalyzeClick(btn) {
  isExtracting = true;
  const textSpan = btn.querySelector('.btn-text');
  btn.classList.add('loading');
  if (textSpan) textSpan.textContent = 'Extracting PGN...';

  try {
    const pgn = await extractGamePGN();
    if (!pgn || !pgn.includes('1.')) {
      throw new Error("Could not extract valid PGN from page.");
    }

    if (textSpan) textSpan.textContent = 'Sending to Lichess...';
    console.log("[ChessBridge Extension] PGN extracted successfully. Sending to background script...");

    // Send PGN to background script to import to Lichess and open tab
    chrome.runtime.sendMessage({ action: "importToLichess", pgn: pgn }, (response) => {
      if (chrome.runtime.lastError) {
        throw new Error(chrome.runtime.lastError.message);
      }
      if (response && response.success) {
        if (textSpan) textSpan.textContent = 'Opened in Lichess!';
        btn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
      } else {
        throw new Error(response ? response.error : "Failed to import game.");
      }
      isExtracting = false;
      btn.classList.remove('loading');
    });

  } catch (err) {
    console.error("[ChessBridge Extension] Analysis failed:", err);
    if (textSpan) textSpan.textContent = 'Error (Try Share Button)';
    btn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
    isExtracting = false;
    btn.classList.remove('loading');

    setTimeout(() => {
      if (textSpan) textSpan.textContent = 'Analyze on Lichess';
      btn.style.background = '';
    }, 4000);
  }
}

async function extractGamePGN() {
  console.log("[ChessBridge Extension] Attempting PGN extraction...");

  // Strategy 1: Check if PGN is already directly in DOM
  let pgn = findPgnInDOM();
  if (pgn) {
    console.log("[ChessBridge Extension] PGN found directly in DOM!");
    return pgn;
  }

  // Strategy 2: API extraction (PRIMARY SILENT METHOD)
  // Auto-detect player usernames from the page DOM or use configured username
  const gameIdMatch = window.location.href.match(/(\d+)$/);
  if (gameIdMatch) {
    const gameId = gameIdMatch[1];
    const detectedUsername = await detectPlayerUsername();
    
    console.log(`[ChessBridge Extension] Trying silent API extraction for gameId: ${gameId}, username: ${detectedUsername || 'from storage'}...`);
    
    pgn = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "fetchPgnFromApi", gameId: gameId, username: detectedUsername }, (resp) => {
        resolve(resp && resp.success ? resp.pgn : null);
      });
    });
    if (pgn) {
      console.log("[ChessBridge Extension] PGN extracted silently via Chess.com Archives API! No popups opened!");
      return pgn;
    }
  }

  // Strategy 3: Share Button fallback (Only if API fails)
  console.log("[ChessBridge Extension] API extraction incomplete. Falling back to Share Button modal extraction...");
  pgn = await extractViaShareButton();
  if (pgn) {
    console.log("[ChessBridge Extension] PGN extracted via Share button modal!");
    return pgn;
  }

  return null;
}

async function detectPlayerUsername() {
  // First check if user set their username in extension settings
  const storage = await new Promise((resolve) => chrome.storage.local.get(['username'], resolve));
  if (storage.username) return storage.username;

  // Auto-detect player username from Chess.com board links or tags
  const selectors = [
    'a[href*="/member/"]',
    '.user-username',
    '.user-tagline-username',
    '.player-tagline-username',
    '.game-player-username',
    '[data-cy="user-tagline-username"]',
    '.user-tagline-link'
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      const text = el.textContent.trim();
      if (text && !text.includes(' ') && text.length > 2) {
        return text;
      }
      const href = el.getAttribute('href') || '';
      const match = href.match(/\/member\/([^\/\?]+)/);
      if (match) return match[1];
    }
  }
  return null;
}

function findPgnInDOM() {
  const elements = document.querySelectorAll('textarea, input[type="text"], pre, code, [pgn]');
  for (const el of elements) {
    const val = el.value || el.textContent || el.getAttribute('pgn') || '';
    if (val.includes('[Event ') && val.includes('1.')) {
      return val.trim();
    }
  }
  return null;
}

async function extractViaShareButton() {
  const shareBtn = document.querySelector('button[aria-label="Share"], [data-cy="share-button"], .icon-font-chess.share, button[title="Share"], .share-button, [class*="share-button"]');
  
  if (!shareBtn) {
    console.warn("[ChessBridge Extension] Could not locate Share button in DOM.");
    return null;
  }

  // Click share button to open popup
  shareBtn.click();

  let pgn = null;
  // Wait up to 2000ms for modal to appear, switch to PGN tab, and populate textarea
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 100));
    
    // On every tick, try to click the PGN tab inside the share modal if present
    const pgnTab = Array.from(document.querySelectorAll('button, div, span, a, [role="tab"]')).find(el => {
      const txt = el.textContent.trim().toUpperCase();
      return (txt === 'PGN' || txt === 'COPY PGN') && el.offsetParent !== null;
    });
    if (pgnTab) pgnTab.click();

    pgn = findPgnInDOM();
    if (pgn) break;
  }

  // BULLETPROOF MODAL CLOSING & CLEANUP
  closeAllModals();

  return pgn;
}

function closeAllModals() {
  console.log("[ChessBridge Extension] Cleaning up and closing all share/PGN popups...");
  
  // 1. Click standard close selectors
  const closeSelectors = [
    'button[aria-label="Close"]', 'button[aria-label="close"]', '[data-cy*="close"]',
    '.icon-font-chess.x', '.icon-font-chess.x-button', '.modal-close-icon',
    '.ui_v5-modal-close', 'button.close', '[class*="close-icon"]', '[class*="modal-close"]',
    '.cc-modal-close', '[data-cy="modal-close-button"]', 'button:has-text("Close")'
  ];
  closeSelectors.forEach(sel => {
    try {
      document.querySelectorAll(sel).forEach(btn => {
        if (btn && typeof btn.click === 'function') btn.click();
      });
    } catch(e) {}
  });

  // 2. Search inside dialog/modal containers for X or Close buttons
  document.querySelectorAll('[class*="modal"], [role="dialog"], [class*="dialog"], [class*="share-menu"], .cc-modal-container, .share-modal-component, [data-cy="share-modal"]').forEach(modal => {
    modal.querySelectorAll('button, a, span').forEach(btn => {
      const txt = btn.textContent.trim();
      const aria = btn.getAttribute('aria-label') || '';
      if (aria.toLowerCase() === 'close' || btn.className.toString().includes('close') || txt === '✕' || txt === '×' || txt === 'X' || txt === 'Close') {
        if (typeof btn.click === 'function') btn.click();
      }
    });
  });

  // 3. Dispatch Escape keys
  ['keydown', 'keyup'].forEach(eventType => {
    const evt = new KeyboardEvent(eventType, { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true });
    window.dispatchEvent(evt);
    document.dispatchEvent(evt);
    if (document.body) document.body.dispatchEvent(evt);
  });

  // 4. Guaranteed fallback cleanup: after 150ms, if any share menu or modal is still visible, remove or hide it
  setTimeout(() => {
    document.querySelectorAll('[class*="share-menu"], [class*="modal-container"], .ui_v5-modal-container, .cc-modal-container, .share-modal-component, [data-cy="share-modal"], div[role="dialog"][aria-modal="true"], dialog[open]').forEach(modal => {
      if (modal && modal.style) {
        modal.style.display = 'none';
        modal.style.opacity = '0';
        modal.style.pointerEvents = 'none';
      }
    });
  }, 150);
}
