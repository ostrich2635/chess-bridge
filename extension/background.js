// Background service worker for Chess Analysis Bridge Extension

console.log("[ChessBridge Background] Service worker initialized.");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "importToLichess") {
    handleLichessImport(request.pgn)
      .then((url) => sendResponse({ success: true, url: url }))
      .catch((err) => sendResponse({ success: false, error: err.message || "Failed to import to Lichess" }));
    return true; // Keep message channel open for async response
  }

  if (request.action === "fetchPgnFromApi") {
    handleApiPgnFetch(request.gameId, request.username)
      .then((pgn) => sendResponse({ success: true, pgn: pgn }))
      .catch((err) => sendResponse({ success: false, error: err.message || "Failed to fetch from API" }));
    return true;
  }
});

async function handleLichessImport(pgn) {
  if (!pgn) throw new Error("No PGN provided.");

  // Get token from storage
  const storage = await chrome.storage.local.get(['token']);
  const token = storage.token || '';

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  console.log("[ChessBridge Background] Sending POST request to Lichess API...", { hasToken: !!token });

  const response = await fetch('https://lichess.org/api/import', {
    method: 'POST',
    headers: headers,
    body: `pgn=${encodeURIComponent(pgn)}`
  });

  if (response.status === 401) {
    throw new Error("Invalid or expired Lichess token in extension settings.");
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Lichess API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  if (!data.url) {
    throw new Error("Lichess did not return an analysis URL.");
  }

  console.log("[ChessBridge Background] Successfully imported game! Opening tab:", data.url);

  // Open in new browser tab right next to the active Chess.com tab
  chrome.tabs.create({ url: data.url });

  return data.url;
}

async function handleApiPgnFetch(gameId, providedUsername, retries = 1) {
  const storage = await chrome.storage.local.get(['username']);
  let username = providedUsername || storage.username;

  if (!username) {
    console.log(`[ChessBridge Background] Username not set, auto-detecting via callback API for game ${gameId}...`);
    try {
      const cbRes = await fetch(`https://www.chess.com/callback/live/game/${gameId}`);
      if (cbRes.ok) {
        const cbData = await cbRes.json();
        username = cbData?.players?.bottom?.username || cbData?.players?.top?.username;
      }
    } catch (e) {
      console.warn("[ChessBridge Background] Could not fetch username from callback API:", e);
    }
  }

  if (!username) {
    throw new Error("Please set your Chess.com username in the extension popup.");
  }

  console.log(`[ChessBridge Background] Fetching archives for ${username}, looking for gameId: ${gameId}`);

  try {
    const archivesRes = await fetch(`https://api.chess.com/pub/player/${username}/games/archives`);
    if (!archivesRes.ok) throw new Error("Player archives not found.");
    const archivesData = await archivesRes.json();

    if (!archivesData.archives || archivesData.archives.length === 0) {
      throw new Error("No game archives found.");
    }

    const lastArchiveUrl = archivesData.archives[archivesData.archives.length - 1];
    const gamesRes = await fetch(lastArchiveUrl);
    const gamesData = await gamesRes.json();

    if (!gamesData.games) throw new Error("No games in archive.");

    // Find matching game by ID
    for (let i = gamesData.games.length - 1; i >= 0; i--) {
      const g = gamesData.games[i];
      if (g.url && g.url.includes(gameId)) {
        console.log("[ChessBridge Background] Game found in API!");
        return g.pgn;
      }
    }

    // If not found and we have retries left, wait 2 seconds and retry (API indexing delay)
    if (retries > 0) {
      console.log("[ChessBridge Background] Game not found yet, retrying in 2s...");
      await new Promise((r) => setTimeout(r, 2000));
      return await handleApiPgnFetch(gameId, providedUsername, retries - 1);
    }

    throw new Error("Game not found in Chess.com archives.");

  } catch (err) {
    console.error("[ChessBridge Background] API Fetch error:", err);
    throw err;
  }
}
