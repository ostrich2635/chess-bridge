import { Settings, GameData } from '../types';
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getCurrentUser } from './auth';

const PREFIX = 'chess_bridge_';

// ----------------------------------------------------
// LOCAL STORAGE FALLBACKS
// ----------------------------------------------------
function saveSettingsLocal(settings: Settings): void {
  localStorage.setItem(`${PREFIX}settings`, JSON.stringify(settings));
}

function loadSettingsLocal(): Settings {
  const data = localStorage.getItem(`${PREFIX}settings`);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('[ChessBridge] Error parsing settings', e);
    }
  }
  return { username: '', token: '', autoImport: false };
}

function saveHistoryLocal(history: GameData[]): void {
  localStorage.setItem(`${PREFIX}history`, JSON.stringify(history));
}

function loadHistoryLocal(): GameData[] {
  const data = localStorage.getItem(`${PREFIX}history`);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('[ChessBridge] Error parsing history', e);
    }
  }
  return [];
}

// ----------------------------------------------------
// CLOUD + LOCAL SYNC ABSTRACTION
// ----------------------------------------------------

export async function saveSettings(settings: Settings): Promise<void> {
  saveSettingsLocal(settings);
  const user = getCurrentUser();
  if (user) {
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { settings }, { merge: true });
    } catch (e) {
      console.error("[ChessBridge] Failed to sync settings to cloud:", e);
    }
  }
}

export function loadSettings(): Settings {
  // Always returns synchronous local cache.
  // The cloud data overrides this cache when user logs in via fetchCloudData.
  return loadSettingsLocal();
}

export async function saveHistory(history: GameData[]): Promise<void> {
  saveHistoryLocal(history);
  const user = getCurrentUser();
  if (user) {
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { history }, { merge: true });
    } catch (e) {
      console.error("[ChessBridge] Failed to sync history to cloud:", e);
    }
  }
}

export function loadHistory(): GameData[] {
  return loadHistoryLocal();
}

export async function clearHistory(): Promise<void> {
  localStorage.removeItem(`${PREFIX}history`);
  const user = getCurrentUser();
  if (user) {
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { history: [] }, { merge: true });
    } catch (e) {
      console.error("[ChessBridge] Failed to clear history on cloud:", e);
    }
  }
}

// ----------------------------------------------------
// CLOUD FETCH
// ----------------------------------------------------
export async function fetchCloudData(uid: string): Promise<void> {
  try {
    const userRef = doc(db, "users", uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.settings) saveSettingsLocal(data.settings);
      if (data.history) saveHistoryLocal(data.history);
      
      // Dispatch a custom event so the UI can re-render
      window.dispatchEvent(new Event('cloudDataSynced'));
    }
  } catch (e) {
    console.error("[ChessBridge] Failed to fetch cloud data:", e);
  }
}
