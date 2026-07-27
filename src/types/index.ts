export interface GameData {
  timestamp: number;
  opponent: string;
  result: 'Win' | 'Loss' | 'Draw';
  userColor: 'White' | 'Black' | 'Unknown';
  opening: string;
  eco: string;
  timeControl: string;
  chesscomUrl: string;
  lichessUrl: string | null;
  pgn: string;
}

export interface Settings {
  username: string;
  token: string;
  autoImport: boolean;
  avatar?: string;
}

export interface PGNHeaders {
  [key: string]: string;
}

export type ToastType = 'success' | 'error' | 'info';
export type StatusState = 'idle' | 'polling' | 'found' | 'error';
export type GameResult = 'Win' | 'Loss' | 'Draw';
