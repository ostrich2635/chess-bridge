import './style.css';
import { initTabs } from './modules/tabs';
import { initSettings } from './modules/settings';
import { initMonitorListeners } from './modules/polling';
import { renderHistory, initHistoryListeners, fixUnknownHistory } from './modules/history';
import { initLogin } from './modules/login';

function initCursorTracking(): void {
  const cursorOrb = document.getElementById('cursor-orb');
  if (!cursorOrb) return;

  window.addEventListener('mousemove', (e: MouseEvent) => {
    const x = e.clientX - 190; // center of 380px orb
    const y = e.clientY - 190;
    cursorOrb.style.transform = `translate(${x}px, ${y}px)`;
    cursorOrb.style.opacity = '0.28';
  });

  window.addEventListener('mouseleave', () => {
    cursorOrb.style.opacity = '0';
  });
}

function init(): void {
  console.log('[ChessBridge] Initializing application...');
  
  initTabs();
  initSettings();
  initMonitorListeners();
  renderHistory();
  initHistoryListeners();
  initCursorTracking();
  initLogin();
  fixUnknownHistory();
  
  console.log('[ChessBridge] Application ready.');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
