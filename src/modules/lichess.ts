export async function importToLichess(pgn: string, token: string): Promise<string> {
  console.log('[ChessBridge] Importing to Lichess...');
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
    throw new Error(`Error importing to Lichess: ${response.statusText}`);
  }

  const data = await response.json();
  return data.url;
}
