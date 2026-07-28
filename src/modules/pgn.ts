import { PGNHeaders } from '../types';

export function parsePGNHeaders(pgn: string): PGNHeaders {
  const headers: PGNHeaders = {};
  const regex = /\[(\w+)\s+"([^"]*)"\]/g;
  let match;
  while ((match = regex.exec(pgn)) !== null) {
    headers[match[1]] = match[2];
  }
  return headers;
}

/**
 * Extract a human-readable opening name from PGN headers.
 * Chess.com does NOT provide an [Opening "..."] header.
 * Instead it provides [ECOUrl "https://www.chess.com/openings/Sicilian-Defense-Alapin-Variation"]
 * We parse the URL path to get "Sicilian Defense: Alapin Variation".
 * Falls back to ECO code (e.g. "B22") if ECOUrl is missing.
 */
export function extractOpeningName(headers: PGNHeaders): string {
  // Priority 1: If there's an explicit Opening header (rare, some PGN sources)
  if (headers['Opening'] && headers['Opening'] !== 'Unknown' && headers['Opening'] !== '?') {
    return headers['Opening'];
  }

  // Priority 2: Parse ECOUrl from Chess.com
  const ecoUrl = headers['ECOUrl'] || '';
  if (ecoUrl) {
    try {
      const urlPath = new URL(ecoUrl).pathname; // e.g. /openings/Sicilian-Defense-Alapin-Variation
      const slug = urlPath.split('/').pop() || '';
      if (slug) {
        // Convert slug like "Sicilian-Defense-Alapin-Variation" to "Sicilian Defense: Alapin Variation"
        // Heuristic: first 1-2 words are the defense name, rest after next hyphen group is the variation
        const name = slug
          .replace(/-/g, ' ')       // "Sicilian Defense Alapin Variation"
          .replace(/\b\w/g, c => c.toUpperCase()); // Title case
        return name;
      }
    } catch {
      // URL parsing failed, fall through
    }
  }

  // Priority 3: Just use ECO code
  if (headers['ECO'] && headers['ECO'] !== '?') {
    return `ECO ${headers['ECO']}`;
  }

  return 'Unknown';
}
