import { GameData } from '../types';
import { loadSettings, loadHistory, saveHistory, clearHistory } from './storage';
import { showToast } from './toast';
import { importToLichess } from './lichess';
import { replayPGN } from './chess-engine';
import { renderMiniBoard } from './board-renderer';

export function addToHistory(gameData: GameData): void {
  const history = loadHistory();
  history.unshift(gameData);
  saveHistory(history);
  renderHistory();
}

export function renderHistory(): void {
  const historyList = document.getElementById('history-list');
  if (!historyList) return;

  const history = loadHistory();
  const settings = loadSettings();

  if (history.length === 0) {
    historyList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">♟</div>
        <h3>No games recorded yet</h3>
        <p>Start monitoring to detect completed games</p>
      </div>
    `;
    return;
  }

  historyList.innerHTML = '';

  history.forEach((game, index) => {
    const resultClass = game.result.toLowerCase();
    let resultColor = 'var(--draw)';
    let resultSymbol = '½';
    if (game.result === 'Win') {
      resultColor = 'var(--success)';
      resultSymbol = '♛';
    } else if (game.result === 'Loss') {
      resultColor = 'var(--error)';
      resultSymbol = '⚐';
    }

    const formattedDate = new Date(game.timestamp).toLocaleString();

    let lichessLinkOrButton = '';
    if (game.lichessUrl) {
      lichessLinkOrButton = `<a href="${game.lichessUrl}" target="_blank">Analysis ↗</a>`;
    } else if (settings.token) {
      lichessLinkOrButton = `<button class="import-history-btn" data-index="${index}">Import to Lichess</button>`;
    }

    const entry = document.createElement('div');
    entry.className = 'history-entry';
    entry.style.animationDelay = `${index * 0.05}s`;
    entry.innerHTML = `
      <div class="history-entry-accent" style="background: ${resultColor}"></div>
      <div class="history-entry-body">
        <div class="history-entry-info">
          <div class="history-entry-top">
            <span class="history-entry-date">${formattedDate}</span>
            <span class="result-badge ${resultClass}">${resultSymbol} ${game.result}</span>
          </div>
          <div class="history-entry-details">
            <div class="history-entry-detail"><strong>vs</strong> ${game.opponent}</div>
            <div class="history-entry-detail"><strong>as</strong> ${game.userColor}</div>
            <div class="history-entry-detail"><strong>Opening:</strong> ${game.opening}</div>
            <div class="history-entry-detail mono"><strong>Time:</strong> ${game.timeControl}</div>
          </div>
          <div class="history-entry-actions">
            <a href="${game.chesscomUrl}" target="_blank">Chess.com ↗</a>
            ${lichessLinkOrButton}
          </div>
        </div>
        <div class="history-entry-board"></div>
      </div>
    `;
    historyList.appendChild(entry);

    // Render mini chessboard of final position
    const boardContainer = entry.querySelector('.history-entry-board') as HTMLElement;
    if (boardContainer && game.pgn) {
      try {
        const board = replayPGN(game.pgn);
        const flipped = game.userColor === 'Black';
        const canvas = renderMiniBoard(board, flipped);
        boardContainer.appendChild(canvas);
      } catch (e) {
        console.warn('[ChessBridge] Could not render mini board:', e);
        boardContainer.innerHTML = '<span class="board-error">♞</span>';
      }
    }
  });

  // Attach import button listeners
  const importBtns = historyList.querySelectorAll('.import-history-btn');
  importBtns.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      const indexStr = target.getAttribute('data-index');
      if (indexStr === null) return;
      const index = parseInt(indexStr, 10);
      
      target.disabled = true;
      target.textContent = 'Importing...';

      const currentHistory = loadHistory();
      const currentSettings = loadSettings();
      const game = currentHistory[index];

      try {
        const url = await importToLichess(game.pgn, currentSettings.token);
        currentHistory[index].lichessUrl = url;
        saveHistory(currentHistory);
        renderHistory();
      } catch (err: any) {
        showToast(err.message || 'Import failed', 'error');
        target.disabled = false;
        target.textContent = 'Import to Lichess';
      }
    });
  });
}

export function initHistoryListeners(): void {
  const clearBtn = document.getElementById('clear-history-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Clear all game history?')) {
        clearHistory();
        renderHistory();
        showToast('History cleared', 'success');
      }
    });
  }
}
