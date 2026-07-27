import { GameData, StatusState } from '../types';
import { loadSettings, loadHistory, saveHistory } from './storage';
import { showToast } from './toast';
import { parsePGNHeaders } from './pgn';
import { importToLichess } from './lichess';
import { addToHistory, renderHistory } from './history';

let pollingInterval: number | null = null;
let lastKnownGameUrl: string | null = null;
let isFirstPoll: boolean = true;
let currentGameData: GameData | null = null;

function setStatus(state: StatusState, text: string): void {
  const monitorStatus = document.getElementById('monitor-status');
  if (!monitorStatus) return;
  const statusDot = monitorStatus.querySelector('.status-dot');
  if (statusDot) {
    statusDot.className = `status-dot ${state}`;
  }
  const statusText = document.getElementById('status-text');
  if (statusText) {
    statusText.textContent = text;
  }
}

async function processNewGame(game: any, username: string, autoImport: boolean, token: string): Promise<void> {
  const headers = parsePGNHeaders(game.pgn);
  const white = headers['White'] || '';
  const black = headers['Black'] || '';
  
  let userColor: 'White' | 'Black' | 'Unknown' = 'Unknown';
  let opponent = 'Unknown';
  if (white.toLowerCase() === username.toLowerCase()) {
    userColor = 'White';
    opponent = black;
  } else if (black.toLowerCase() === username.toLowerCase()) {
    userColor = 'Black';
    opponent = white;
  }

  const resultHeader = headers['Result'] || '';
  let result: 'Win' | 'Loss' | 'Draw' = 'Loss';
  if (resultHeader === '1/2-1/2') {
    result = 'Draw';
  } else if ((resultHeader === '1-0' && userColor === 'White') || (resultHeader === '0-1' && userColor === 'Black')) {
    result = 'Win';
  }

  const gameData: GameData = {
    timestamp: Date.now(),
    opponent,
    result,
    userColor,
    opening: headers['Opening'] || 'Unknown',
    eco: headers['ECO'] || '?',
    timeControl: game.time_class || 'Unknown',
    chesscomUrl: headers['Link'] || headers['Site'] || game.url,
    lichessUrl: null,
    pgn: game.pgn
  };

  currentGameData = gameData;
  displayGamePreview(gameData);
  setStatus('found', 'New game detected!');

  if (autoImport && token) {
    const importStatus = document.getElementById('import-status');
    if (importStatus) importStatus.textContent = 'Auto-importing...';
    try {
      const url = await importToLichess(game.pgn, token);
      gameData.lichessUrl = url;
      if (importStatus) {
        importStatus.innerHTML = `<a href="${url}" target="_blank">Success ↗</a>`;
      }
    } catch (e: any) {
      if (importStatus) importStatus.textContent = e.message || 'Import failed';
      showToast(e.message || 'Import failed', 'error');
    }
  }
  
  if (!autoImport) {
    const analyzeBtn = document.getElementById('analyze-btn');
    if (analyzeBtn) analyzeBtn.classList.remove('hidden');
  }

  addToHistory(gameData);
  showToast(`Game detected: ${result} vs ${opponent}`, 'success');
}

async function pollCycle(username: string, autoImport: boolean, token: string): Promise<void> {
  try {
    const archivesRes = await fetch(`https://api.chess.com/pub/player/${username}/games/archives`);
    if (archivesRes.status === 404) throw new Error('Player not found');
    const archivesData = await archivesRes.json();
    if (!archivesData.archives || archivesData.archives.length === 0) {
      throw new Error('No games found for this player');
    }

    const lastArchiveUrl = archivesData.archives[archivesData.archives.length - 1];
    const gamesRes = await fetch(lastArchiveUrl);
    const gamesData = await gamesRes.json();
    
    if (!gamesData.games || gamesData.games.length === 0) return;
    
    const game = gamesData.games[gamesData.games.length - 1];
    
    if (isFirstPoll) {
      lastKnownGameUrl = game.url;
      isFirstPoll = false;
      
      const history = loadHistory();
      const alreadyInHistory = history.some(h => h.chesscomUrl === game.url);
      const isRecent = game.end_time && (Date.now() / 1000 - game.end_time < 7200);
      
      if (!alreadyInHistory && isRecent) {
        console.log('[ChessBridge] Instant Catch-up: Detected recently completed game played while website was closed!');
        await processNewGame(game, username, autoImport, token);
      }
      return;
    }

    if (game.url !== lastKnownGameUrl) {
      lastKnownGameUrl = game.url;
      await processNewGame(game, username, autoImport, token);
    } else {
      const monitorStatus = document.getElementById('monitor-status');
      const statusDot = monitorStatus?.querySelector('.status-dot');
      if (statusDot && statusDot.classList.contains('found')) {
        setStatus('polling', 'Monitoring... checking every 30s');
      }
    }
  } catch (error: any) {
    setStatus('error', error.message || 'Connection failed. Check your internet.');
  }
}

export function startMonitoring(): void {
  const settings = loadSettings();
  if (!settings.username) {
    showToast('Please enter a Chess.com username in Settings', 'error');
    const setupTabBtn = document.querySelector('[data-tab="tab-setup"]') as HTMLElement | null;
    if (setupTabBtn) setupTabBtn.click();
    return;
  }

  const monitorBtn = document.getElementById('monitor-btn');
  const gamePreview = document.getElementById('game-preview');
  const analyzeBtn = document.getElementById('analyze-btn');
  const importStatus = document.getElementById('import-status');

  if (monitorBtn) {
    monitorBtn.innerHTML = '<span class="icon">■</span> Stop Monitoring';
  }

  setStatus('polling', 'Monitoring... checking every 30s');
  
  if (gamePreview) gamePreview.classList.add('hidden');
  if (analyzeBtn) analyzeBtn.classList.add('hidden');
  if (importStatus) importStatus.textContent = '';

  localStorage.setItem('chess_bridge_is_monitoring', 'true');
  isFirstPoll = true;
  pollCycle(settings.username, settings.autoImport, settings.token);
  
  if (pollingInterval) clearInterval(pollingInterval);
  pollingInterval = window.setInterval(() => {
    const currentSettings = loadSettings();
    pollCycle(currentSettings.username, currentSettings.autoImport, currentSettings.token);
  }, 30000);
}

export function stopMonitoring(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  localStorage.removeItem('chess_bridge_is_monitoring');
  const monitorBtn = document.getElementById('monitor-btn');
  if (monitorBtn) {
    monitorBtn.innerHTML = '<span class="icon">▶</span> Start Monitoring';
  }
  setStatus('idle', 'Not monitoring');
  lastKnownGameUrl = null;
  isFirstPoll = true;
  currentGameData = null;
}

function displayGamePreview(gameData: GameData): void {
  const opponentEl = document.getElementById('preview-opponent');
  const resultEl = document.getElementById('preview-result');
  const openingEl = document.getElementById('preview-opening');
  const timeEl = document.getElementById('preview-time');
  const chessLinkEl = document.getElementById('preview-chess-link') as HTMLAnchorElement | null;
  const gameCardAccent = document.getElementById('game-card-accent');
  const gamePreview = document.getElementById('game-preview');

  if (opponentEl) opponentEl.textContent = gameData.opponent;
  if (resultEl) {
    resultEl.textContent = gameData.result;
    resultEl.className = `result-badge ${gameData.result.toLowerCase()}`;
  }
  if (openingEl) openingEl.textContent = gameData.opening;
  if (timeEl) timeEl.textContent = gameData.timeControl;
  if (chessLinkEl) chessLinkEl.href = gameData.chesscomUrl;
  
  if (gameCardAccent) {
    if (gameData.result === 'Win') gameCardAccent.style.backgroundColor = 'var(--success)';
    else if (gameData.result === 'Loss') gameCardAccent.style.backgroundColor = 'var(--error)';
    else gameCardAccent.style.backgroundColor = 'var(--draw)';
  }

  if (gamePreview) {
    gamePreview.classList.remove('hidden');
  }
}

export function initMonitorListeners(): void {
  const monitorBtn = document.getElementById('monitor-btn');
  const analyzeBtn = document.getElementById('analyze-btn');

  if (monitorBtn) {
    monitorBtn.addEventListener('click', () => {
      if (pollingInterval) {
        stopMonitoring();
      } else {
        startMonitoring();
      }
    });
  }

  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', async () => {
      if (!currentGameData) return;
      const settings = loadSettings();
      if (!settings.token) {
        showToast('Lichess token required for analysis', 'error');
        return;
      }
      analyzeBtn.setAttribute('disabled', 'true');
      const importStatus = document.getElementById('import-status');
      if (importStatus) importStatus.textContent = 'Importing...';

      try {
        const url = await importToLichess(currentGameData.pgn, settings.token);
        if (importStatus) {
          importStatus.innerHTML = `<a href="${url}" target="_blank">View on Lichess ↗</a>`;
        }
        currentGameData.lichessUrl = url;
        
        const history = loadHistory();
        if (history.length > 0 && history[0].timestamp === currentGameData.timestamp) {
          history[0].lichessUrl = url;
          saveHistory(history);
          renderHistory();
        }
        
        analyzeBtn.classList.add('hidden');
      } catch (e: any) {
        if (importStatus) importStatus.textContent = e.message || 'Import failed';
        showToast(e.message || 'Import failed', 'error');
      } finally {
        analyzeBtn.removeAttribute('disabled');
      }
    });
  }

  if (localStorage.getItem('chess_bridge_is_monitoring') === 'true') {
    console.log('[ChessBridge] Resuming active monitoring from stored localStorage state...');
    startMonitoring();
  }
}
