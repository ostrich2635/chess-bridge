/**
 * Chess.com -> Lichess Analysis Bridge
 * script.js
 */

(() => {
    'use strict';

    console.log('[ChessBridge] Initializing application...');

    // DOM Elements
    const elements = {
        // Tabs
        tabBtns: document.querySelectorAll('[data-tab]'),
        tabPanels: document.querySelectorAll('.tab-content'),
        
        // Settings
        usernameInput: document.getElementById('chess-username'),
        tokenInput: document.getElementById('lichess-token'),
        tokenToggleBtn: document.getElementById('toggle-token-btn'),
        autoImportToggle: document.getElementById('auto-import-toggle'),
        saveSettingsBtn: document.getElementById('save-settings-btn'),
        settingsStatus: document.getElementById('settings-status'),
        
        // Monitor
        monitorBtn: document.getElementById('monitor-btn'),
        monitorStatusDot: document.querySelector('#monitor-status .status-dot'),
        statusText: document.getElementById('status-text'),
        gamePreview: document.getElementById('game-preview'),
        analyzeBtn: document.getElementById('analyze-btn'),
        importStatus: document.getElementById('import-status'),
        
        // History
        historyList: document.getElementById('history-list'),
        clearHistoryBtn: document.getElementById('clear-history-btn'),
    };

    // State
    const state = {
        pollingInterval: null,
        lastKnownGameUrl: null,
        isFirstPoll: true,
        currentGameData: null // Stores the latest found game to allow manual import
    };

    // --- Module 1: Tab Controller ---
    function initTabs() {
        elements.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.getAttribute('data-tab');
                
                // Remove active class from all
                elements.tabBtns.forEach(b => b.classList.remove('active'));
                elements.tabPanels.forEach(p => p.classList.remove('active'));
                
                // Add active to clicked
                btn.classList.add('active');
                const targetPanel = document.getElementById(targetTab);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                }
            });
        });
    }

    // --- Module 2: LocalStorage Manager ---
    const STORAGE_PREFIX = 'chess_bridge_';
    const storageManager = {
        saveSettings(username, token, autoImport) {
            localStorage.setItem(`${STORAGE_PREFIX}username`, username);
            localStorage.setItem(`${STORAGE_PREFIX}token`, token);
            localStorage.setItem(`${STORAGE_PREFIX}autoImport`, autoImport);
        },
        loadSettings() {
            return {
                username: localStorage.getItem(`${STORAGE_PREFIX}username`) || '',
                token: localStorage.getItem(`${STORAGE_PREFIX}token`) || '',
                autoImport: localStorage.getItem(`${STORAGE_PREFIX}autoImport`) === 'true'
            };
        },
        saveHistory(historyArray) {
            localStorage.setItem(`${STORAGE_PREFIX}history`, JSON.stringify(historyArray));
        },
        loadHistory() {
            const history = localStorage.getItem(`${STORAGE_PREFIX}history`);
            return history ? JSON.parse(history) : [];
        },
        clearHistory() {
            localStorage.removeItem(`${STORAGE_PREFIX}history`);
        }
    };

    // --- Module 3: Settings UI ---
    function initSettingsUI() {
        // Load settings on init
        const settings = storageManager.loadSettings();
        if (elements.usernameInput) elements.usernameInput.value = settings.username;
        if (elements.tokenInput) elements.tokenInput.value = settings.token;
        if (elements.autoImportToggle) elements.autoImportToggle.checked = settings.autoImport;

        // Toggle Password visibility
        if (elements.tokenToggleBtn) {
            elements.tokenToggleBtn.addEventListener('click', () => {
                if (elements.tokenInput.type === 'password') {
                    elements.tokenInput.type = 'text';
                    elements.tokenToggleBtn.textContent = 'Hide';
                } else {
                    elements.tokenInput.type = 'password';
                    elements.tokenToggleBtn.innerHTML = '&#128065;';
                }
            });
        }

        // Save Settings
        if (elements.saveSettingsBtn) {
            elements.saveSettingsBtn.addEventListener('click', () => {
                const username = elements.usernameInput.value.trim();
                const token = elements.tokenInput.value.trim();
                const autoImport = elements.autoImportToggle.checked;
                
                storageManager.saveSettings(username, token, autoImport);
                
                elements.settingsStatus.textContent = 'Settings saved successfully!';
                elements.settingsStatus.classList.remove('hidden');
                elements.settingsStatus.style.color = 'var(--success)';
                
                setTimeout(() => {
                    elements.settingsStatus.textContent = '';
                    elements.settingsStatus.classList.add('hidden');
                }, 3000);
            });
        }
    }

    // --- Module 5: PGN Parser ---
    function parsePGNHeaders(pgn) {
        const headers = {};
        const regex = /\[(\w+)\s+"([^"]*)"\]/g;
        let match;
        
        while ((match = regex.exec(pgn)) !== null) {
            headers[match[1]] = match[2];
        }
        
        return headers;
    }

    // --- Module 6: Lichess Import ---
    async function importToLichess(pgn, token) {
        console.log('[ChessBridge] Importing game to Lichess...');
        if (!token) throw new Error('No Lichess API token provided. Please add it in Settings.');

        try {
            const response = await fetch('https://lichess.org/api/import', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `pgn=${encodeURIComponent(pgn)}`
            });

            if (response.status === 401) {
                throw new Error('Invalid or expired Lichess token');
            }

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Import failed: ${response.status} ${errText}`);
            }

            const data = await response.json();
            return data.url;
        } catch (error) {
            console.error('[ChessBridge] Lichess import error:', error);
            throw error;
        }
    }

    // --- Module 7: History Manager ---
    function addToHistory(gameData) {
        const history = storageManager.loadHistory();
        history.unshift(gameData); // Add to beginning
        storageManager.saveHistory(history);
        renderHistory();
    }

    function renderHistory() {
        if (!elements.historyList) return;
        
        const history = storageManager.loadHistory();
        elements.historyList.innerHTML = '';
        
        if (history.length === 0) {
            elements.historyList.innerHTML = '<p class="empty-message">No games in history yet.</p>';
            return;
        }
        
        history.forEach((game, index) => {
            const card = document.createElement('div');
            card.className = 'history-card';
            
            const resultColor = game.result === 'Win' ? 'green' : game.result === 'Loss' ? 'red' : 'gray';
            
            let lichessLinkHtml = '';
            if (game.lichessUrl) {
                lichessLinkHtml = `<a href="${game.lichessUrl}" target="_blank" class="lichess-link">View Analysis</a>`;
            } else {
                const settings = storageManager.loadSettings();
                if (settings.token) {
                    lichessLinkHtml = `<button class="import-history-btn" data-index="${index}">Import to Lichess</button>`;
                }
            }
            
            card.innerHTML = `
                <div class="history-header">
                    <span class="history-date">${new Date(game.timestamp).toLocaleString()}</span>
                    <span class="history-result" style="color: ${resultColor}; font-weight: bold;">${game.result}</span>
                </div>
                <div class="history-body">
                    <p><strong>Opponent:</strong> ${game.opponent}</p>
                    <p><strong>Color:</strong> ${game.userColor}</p>
                    <p><strong>Opening:</strong> ${game.opening} (${game.eco})</p>
                    <p><strong>Time Control:</strong> ${game.timeControl}</p>
                </div>
                <div class="history-actions">
                    <a href="${game.chesscomUrl}" target="_blank" class="chesscom-link">Chess.com Game</a>
                    ${lichessLinkHtml}
                </div>
            `;
            elements.historyList.appendChild(card);
        });

        // Add event listeners for history import buttons
        const importBtns = elements.historyList.querySelectorAll('.import-history-btn');
        importBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const index = parseInt(e.target.getAttribute('data-index'), 10);
                const history = storageManager.loadHistory();
                const gameToImport = history[index];
                
                try {
                    e.target.disabled = true;
                    e.target.textContent = 'Importing...';
                    
                    const settings = storageManager.loadSettings();
                    const lichessUrl = await importToLichess(gameToImport.pgn, settings.token);
                    
                    // Update history
                    history[index].lichessUrl = lichessUrl;
                    storageManager.saveHistory(history);
                    renderHistory(); // Re-render to show link
                } catch (error) {
                    console.error('[ChessBridge] History import error:', error);
                    alert(`Import failed: ${error.message || error}`);
                    e.target.disabled = false;
                    e.target.textContent = 'Import to Lichess';
                }
            });
        });
    }

    function initHistoryManager() {
        if (elements.clearHistoryBtn) {
            elements.clearHistoryBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear all history?')) {
                    storageManager.clearHistory();
                    renderHistory();
                }
            });
        }
        renderHistory();
    }

    // --- Module 4: Polling Engine ---
    async function fetchLatestGame(username) {
        try {
            console.log(`[ChessBridge] Fetching archives for ${username}...`);
            const archivesRes = await fetch(`https://api.chess.com/pub/player/${username}/games/archives`);
            
            if (archivesRes.status === 404) {
                throw new Error('Player not found');
            }
            if (!archivesRes.ok) {
                throw new Error(`API error: ${archivesRes.status}`);
            }

            const archivesData = await archivesRes.json();
            if (!archivesData.archives || archivesData.archives.length === 0) {
                throw new Error('No games found for this player');
            }

            const latestArchiveUrl = archivesData.archives[archivesData.archives.length - 1];
            console.log(`[ChessBridge] Fetching latest archive: ${latestArchiveUrl}`);
            
            const gamesRes = await fetch(latestArchiveUrl);
            if (!gamesRes.ok) {
                throw new Error(`Failed to fetch games archive: ${gamesRes.status}`);
            }

            const gamesData = await gamesRes.json();
            if (!gamesData.games || gamesData.games.length === 0) {
                throw new Error('No games found in the latest archive');
            }

            return gamesData.games[gamesData.games.length - 1]; // Last game
        } catch (error) {
            console.error('[ChessBridge] Fetch error:', error);
            throw error;
        }
    }

    function setStatus(dotClass, text) {
        if (elements.monitorStatusDot) {
            elements.monitorStatusDot.className = 'status-dot ' + dotClass;
        } else {
            const dot = document.querySelector('#monitor-status .status-dot');
            if (dot) dot.className = 'status-dot ' + dotClass;
        }
        if (elements.statusText) {
            elements.statusText.textContent = text;
        }
    }

    function getResultAndColor(headers, username) {
        let userColor = '';
        let opponent = '';
        const white = headers['White'] || '';
        const black = headers['Black'] || '';
        const result = headers['Result'] || '*';

        if (white.toLowerCase() === username.toLowerCase()) {
            userColor = 'White';
            opponent = black;
        } else if (black.toLowerCase() === username.toLowerCase()) {
            userColor = 'Black';
            opponent = white;
        } else {
            userColor = 'Unknown';
            opponent = 'Unknown';
        }

        let userResult = 'Draw';
        if (result === '1-0') {
            userResult = userColor === 'White' ? 'Win' : 'Loss';
        } else if (result === '0-1') {
            userResult = userColor === 'Black' ? 'Win' : 'Loss';
        }

        return { userColor, opponent, userResult };
    }

    function displayGamePreview(gameData) {
        if (!elements.gamePreview) return;
        
        const resultColor = gameData.result === 'Win' ? 'var(--success)' : gameData.result === 'Loss' ? 'var(--error)' : 'var(--text-secondary)';
        
        const opponentEl = document.getElementById('preview-opponent');
        const resultEl = document.getElementById('preview-result');
        const openingEl = document.getElementById('preview-opening');
        const timeEl = document.getElementById('preview-time');
        const chessLink = document.getElementById('preview-chess-link');
        
        if (opponentEl) opponentEl.textContent = `${gameData.opponent} (${gameData.userColor})`;
        if (resultEl) {
            resultEl.textContent = gameData.result;
            resultEl.style.color = resultColor;
            resultEl.style.fontWeight = 'bold';
        }
        if (openingEl) openingEl.textContent = `${gameData.opening} (${gameData.eco})`;
        if (timeEl) timeEl.textContent = gameData.timeControl;
        if (chessLink) chessLink.href = gameData.chesscomUrl;
        
        elements.gamePreview.classList.remove('hidden');
    }

    async function processNewGame(game, username, autoImport, token) {
        console.log('[ChessBridge] Processing new game...');
        
        const pgn = game.pgn;
        const headers = parsePGNHeaders(pgn);
        const { userColor, opponent, userResult } = getResultAndColor(headers, username);
        
        const gameUrl = headers['Link'] || headers['Site'] || game.url;
        
        const gameData = {
            timestamp: Date.now(),
            opponent: opponent,
            result: userResult,
            userColor: userColor,
            opening: headers['Opening'] || 'Unknown',
            eco: headers['ECO'] || '?',
            timeControl: headers['TimeControl'] || 'Unknown',
            chesscomUrl: gameUrl,
            lichessUrl: null,
            pgn: pgn
        };

        state.currentGameData = gameData;
        displayGamePreview(gameData);
        setStatus('found', 'New game detected!');

        if (autoImport && token) {
            try {
                if(elements.importStatus) elements.importStatus.textContent = 'Auto-importing to Lichess...';
                const lichessUrl = await importToLichess(pgn, token);
                gameData.lichessUrl = lichessUrl;
                if(elements.importStatus) {
                    elements.importStatus.innerHTML = `Success: <a href="${lichessUrl}" target="_blank">View Analysis</a>`;
                }
            } catch (error) {
                if(elements.importStatus) elements.importStatus.textContent = `Auto-import failed: ${error.message || error}`;
            }
        } else {
            if (elements.analyzeBtn) elements.analyzeBtn.classList.remove('hidden');
            if (elements.importStatus) elements.importStatus.textContent = '';
        }

        addToHistory(gameData);
    }

    async function pollCycle(username, autoImport, token) {
        try {
            console.log('[ChessBridge] Running poll cycle...');
            const latestGame = await fetchLatestGame(username);
            const gameUrl = latestGame.url; // Use URL as unique identifier

            if (state.isFirstPoll) {
                console.log('[ChessBridge] First poll complete. Baseline set to:', gameUrl);
                state.lastKnownGameUrl = gameUrl;
                state.isFirstPoll = false;
                return;
            }

            if (gameUrl !== state.lastKnownGameUrl) {
                console.log('[ChessBridge] NEW GAME DETECTED!');
                state.lastKnownGameUrl = gameUrl;
                await processNewGame(latestGame, username, autoImport, token);
            } else {
                console.log('[ChessBridge] No new game detected.');
                // Return to polling status if it was stuck on 'found' from a previous cycle
                if (elements.statusText && elements.statusText.textContent.includes('New game')) {
                     setStatus('polling', 'Monitoring... checking every 30s');
                }
            }

        } catch (error) {
            const errMsg = error.message === 'Failed to fetch' ? 'Connection failed. Check your internet.' : error.message;
            setStatus('error', `Error: ${errMsg}`);
        }
    }

    function toggleMonitoring() {
        if (state.pollingInterval) {
            // Stop monitoring
            clearInterval(state.pollingInterval);
            state.pollingInterval = null;
            state.lastKnownGameUrl = null;
            state.isFirstPoll = true;
            
            if (elements.monitorBtn) elements.monitorBtn.textContent = 'Start Monitoring';
            setStatus('idle', 'Not monitoring');
            console.log('[ChessBridge] Monitoring stopped.');
        } else {
            // Start monitoring
            const settings = storageManager.loadSettings();
            if (!settings.username) {
                alert('Please enter a Chess.com username in the Settings tab.');
                // Switch to setup tab
                const setupTabBtn = document.querySelector('[data-tab="tab-setup"]');
                if (setupTabBtn) setupTabBtn.click();
                return;
            }

            if (elements.monitorBtn) elements.monitorBtn.textContent = 'Stop Monitoring';
            setStatus('polling', 'Monitoring... checking every 30s');
            
            if (elements.gamePreview) elements.gamePreview.classList.add('hidden');
            if (elements.analyzeBtn) elements.analyzeBtn.classList.add('hidden');
            if (elements.importStatus) elements.importStatus.textContent = '';
            
            state.isFirstPoll = true;
            console.log(`[ChessBridge] Monitoring started for user: ${settings.username}`);

            // Initial poll
            pollCycle(settings.username, settings.autoImport, settings.token);

            // Set interval (30s)
            state.pollingInterval = setInterval(() => {
                const currentSettings = storageManager.loadSettings(); // Fetch fresh in case they changed it
                pollCycle(currentSettings.username, currentSettings.autoImport, currentSettings.token);
            }, 30000);
        }
    }

    function initMonitor() {
        if (elements.monitorBtn) {
            elements.monitorBtn.addEventListener('click', toggleMonitoring);
        }

        if (elements.analyzeBtn) {
            elements.analyzeBtn.addEventListener('click', async () => {
                if (!state.currentGameData) return;
                
                const settings = storageManager.loadSettings();
                if (!settings.token) {
                    elements.importStatus.textContent = 'Error: No Lichess token in Settings';
                    return;
                }

                try {
                    elements.analyzeBtn.disabled = true;
                    elements.importStatus.textContent = 'Importing to Lichess...';
                    
                    const lichessUrl = await importToLichess(state.currentGameData.pgn, settings.token);
                    
                    elements.importStatus.innerHTML = `Success: <a href="${lichessUrl}" target="_blank">View Analysis</a>`;
                    elements.analyzeBtn.classList.add('hidden'); // Hide button after success
                    
                    // Update history with new URL
                    const history = storageManager.loadHistory();
                    if (history.length > 0 && history[0].chesscomUrl === state.currentGameData.chesscomUrl) {
                        history[0].lichessUrl = lichessUrl;
                        storageManager.saveHistory(history);
                        renderHistory();
                    }
                    
                } catch (error) {
                    elements.importStatus.textContent = `Error: ${error.message || error}`;
                } finally {
                    elements.analyzeBtn.disabled = false;
                }
            });
        }
    }


    // --- Module 9: Initialization ---
    function init() {
        initTabs();
        initSettingsUI();
        initHistoryManager();
        initMonitor();
        
        // Elements start hidden via CSS class already
        // Just ensure correct initial state
        if (elements.analyzeBtn) elements.analyzeBtn.classList.add('hidden');
    }

    // Run on DOM load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
