import { GameData } from '../types';
import { loadSettings, loadHistory, saveHistory, clearHistory } from './storage';
import { showToast } from './toast';
import { importToLichess } from './lichess';

export async function fixUnknownHistory(): Promise<void> {
  const history = loadHistory();
  const settings = loadSettings();
  if (!settings.username || history.length === 0) return;

  let needsUpdate = false;
  
  // Group unknown games by month (YYYY/MM) to optimize API calls
  const fetchTasks = new Map<string, any>();

  for (let i = 0; i < history.length; i++) {
    const game = history[i];
    if (game.opening === 'Unknown' || game.termination === 'Unknown') {
      const date = new Date(game.timestamp);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const archiveUrl = `https://api.chess.com/pub/player/${settings.username}/games/${year}/${month}`;
      
      if (!fetchTasks.has(archiveUrl)) {
        try {
          const res = await fetch(archiveUrl);
          const data = await res.json();
          fetchTasks.set(archiveUrl, data.games || []);
        } catch (e) {
          fetchTasks.set(archiveUrl, []);
        }
      }

      const gamesData = fetchTasks.get(archiveUrl);
      const apiGame = gamesData.find((g: any) => g.url === game.chesscomUrl);
      
      if (apiGame) {
        // Fix Opening
        if (typeof apiGame.eco === 'string' && apiGame.eco) {
          try {
            const parts = new URL(apiGame.eco).pathname.split('/').filter(Boolean);
            const slug = parts[parts.length - 1];
            if (slug) game.opening = slug.replace(/-/g, ' ');
          } catch (e) {}
        }
        
        // Fix Termination
        if (apiGame.white && apiGame.black) {
          const wRes = apiGame.white.result;
          const bRes = apiGame.black.result;
          let term = game.termination;
          if (wRes === 'win' || bRes === 'win') {
            const loserCode = wRes === 'win' ? bRes : wRes;
            if (loserCode === 'checkmated') term = 'by checkmate';
            else if (loserCode === 'timeout') term = 'on time';
            else if (loserCode === 'resigned') term = 'by resignation';
            else if (loserCode === 'abandoned') term = 'by abandonment';
          } else if (wRes === bRes) {
            if (wRes === 'agreed') term = 'drawn by agreement';
            else if (wRes === 'repetition') term = 'drawn by repetition';
            else if (wRes === 'stalemate') term = 'drawn by stalemate';
            else if (wRes === 'insufficient') term = 'drawn by insufficient material';
            else if (wRes === 'timevsinsufficient') term = 'drawn by timeout vs insufficient material';
          }
          game.termination = term;
        }
        
        needsUpdate = true;
      }
    }
  }

  if (needsUpdate) {
    saveHistory(history);
    renderHistory();
    console.log('[ChessBridge] Retroactively fixed Unknown history fields.');
  }
}

export function addToHistory(gameData: GameData): void {
  const history = loadHistory();
  history.unshift(gameData);
  saveHistory(history);
  renderHistory();
}

interface HistoryFilter {
  result: string | null;
  format: string | null;
  date: string | null;
}
const currentFilter: HistoryFilter = { result: null, format: null, date: null };

export function renderHistory(): void {
  const historyList = document.getElementById('history-list');
  if (!historyList) return;

  const settings = loadSettings();
  const allHistory = loadHistory();
  let history = [...allHistory];

  // Update dynamic format options based on all history
  const formatSubMenu = document.getElementById('format-sub-menu');
  if (formatSubMenu) {
    const formats = Array.from(new Set(allHistory.map(g => g.timeControl))).filter(Boolean);
    formatSubMenu.innerHTML = formats.map(f => `<div class="dropdown-item ${currentFilter.format === f ? 'active' : ''}" data-filter-type="format" data-filter-val="${f}">${f}</div>`).join('') + '<div class="dropdown-item filter-clear" data-filter-type="format" data-filter-val="">Clear Format</div>';
  }

  // Apply filters
  if (currentFilter.result) {
    history = history.filter(g => g.result.toLowerCase() === currentFilter.result!.toLowerCase());
  }
  if (currentFilter.format) {
    history = history.filter(g => g.timeControl === currentFilter.format);
  }
  if (currentFilter.date) {
    history = history.filter(g => {
      const d = new Date(g.timestamp);
      const gDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return gDate === currentFilter.date;
    });
  }

  if (history.length === 0) {
    historyList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">♟</div>
        <p class="empty-title">${allHistory.length > 0 ? 'No games match your filters' : 'No games recorded yet'}</p>
        <p class="empty-desc">${allHistory.length > 0 ? 'Try clearing your filters' : 'Start monitoring to detect completed games'}</p>
      </div>
    `;
    return;
  }

  historyList.innerHTML = '';

  history.forEach(async (game, index) => {
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
      lichessLinkOrButton = `<button class="import-history-btn" data-index="${allHistory.indexOf(game)}">Import to Lichess</button>`;
    }

    const entry = document.createElement('div');
    entry.className = 'history-entry fade-in';
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
            <div class="history-entry-detail"><strong>Reason:</strong> ${game.termination || 'Unknown'}</div>
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
        const { replayPGN, boardToFEN } = await import('./chess-engine');
        const board = replayPGN(game.pgn);
        const fen = boardToFEN(board);
        const pov = game.userColor === 'Black' ? 'black' : 'white';
        
        const img = document.createElement('img');
        img.src = `https://fen2image.chessvision.ai/${fen}?pov=${pov}`;
        img.alt = 'Final Board Position';
        boardContainer.appendChild(img);
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

  const dropdownWrapper = document.getElementById('history-dropdown-wrapper');
  if (dropdownWrapper) {
    dropdownWrapper.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const item = target.closest('.dropdown-item[data-filter-type]') as HTMLElement;
      if (item) {
        const type = item.getAttribute('data-filter-type') as keyof HistoryFilter;
        const val = item.getAttribute('data-filter-val');
        
        if (type && type !== 'date') {
          currentFilter[type] = val || null;
          
          // Update active classes for visual feedback
          const siblings = item.parentElement?.querySelectorAll('.dropdown-item');
          siblings?.forEach(s => s.classList.remove('active'));
          if (val) item.classList.add('active');
          
          renderHistory();
        }
      }
    });
  }

  const dateInput = document.getElementById('filter-date-input') as HTMLInputElement | null;
  if (dateInput) {
    dateInput.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      currentFilter.date = target.value || null;
      renderHistory();
    });
    
    // Clear date button
    const clearDateBtn = document.querySelector('.dropdown-item[data-filter-type="date"]');
    if (clearDateBtn) {
      clearDateBtn.addEventListener('click', () => {
        dateInput.value = '';
        currentFilter.date = null;
        renderHistory();
      });
    }
  }
}
