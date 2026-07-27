import './style.css';
import { initTabs } from './modules/tabs';
import { initSettings } from './modules/settings';
import { initMonitorListeners } from './modules/polling';
import { renderHistory, initHistoryListeners } from './modules/history';

function init(): void {
  console.log('[ChessBridge] Initializing application...');
  
  initTabs();
  initSettings();
  initMonitorListeners();
  renderHistory();
  initHistoryListeners();
  
  console.log('[ChessBridge] Application ready.');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
