import './style.css';
import { initSettings } from './modules/settings';
import { initTabs } from './modules/tabs';
import { initMonitorListeners } from './modules/polling';
import { renderHistory, initHistoryListeners, fixUnknownHistory } from './modules/history';
import { initLogin } from './modules/login';
import { initGreeting } from './modules/greeting';
import { initAuthListeners } from './modules/auth';


function init(): void {
  console.log('[ChessBridge] Initializing application...');
  
  initAuthListeners();
  initTabs();
  initSettings();
  initGreeting();
  initMonitorListeners();
  renderHistory();
  initHistoryListeners();
  initLogin();
  fixUnknownHistory();

  window.addEventListener('cloudDataSynced', () => {
    console.log('[ChessBridge] Cloud data synced, re-rendering UI...');
    renderHistory();
    initSettings(); // re-populate inputs
    initGreeting(); // in case username changed
  });
  
  console.log('[ChessBridge] Application ready.');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
