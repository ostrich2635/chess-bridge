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
