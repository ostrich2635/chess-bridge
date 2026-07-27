import { Settings, GameData } from '../types';

const PREFIX = 'chess_bridge_';

export function saveSettings(settings: Settings): void {
  localStorage.setItem(`${PREFIX}settings`, JSON.stringify(settings));
}

export function loadSettings(): Settings {
  const data = localStorage.getItem(`${PREFIX}settings`);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('[ChessBridge] Error parsing settings from storage', e);
    }
  }
  return { username: '', token: '', autoImport: false };
}

export function saveHistory(history: GameData[]): void {
  localStorage.setItem(`${PREFIX}history`, JSON.stringify(history));
}

export function loadHistory(): GameData[] {
  const data = localStorage.getItem(`${PREFIX}history`);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('[ChessBridge] Error parsing history from storage', e);
    }
  }
  return [];
}

export function clearHistory(): void {
  localStorage.removeItem(`${PREFIX}history`);
}
