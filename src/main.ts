import './style.css';
import { initTabs } from './modules/tabs';
import { initSettings } from './modules/settings';
import { initMonitorListeners } from './modules/polling';
import { renderHistory, initHistoryListeners, fixUnknownHistory } from './modules/history';
import { initLogin } from './modules/login';
import { initGreeting } from './modules/greeting';

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

function initRandomOrbs(): void {
  const orbs = document.querySelectorAll('.bg-orb:not(.bg-orb--cursor)');
  
  if (orbs.length === 0) return;

  function moveOrb(orb: HTMLElement) {
    // Reset any CSS positioning so translate is predictable from (0,0)
    orb.style.top = '0px';
    orb.style.left = '0px';
    
    const maxX = window.innerWidth;
    const maxY = window.innerHeight;
    const size = orb.offsetWidth || 400; // fallback if not rendered yet
    
    // Keep centers strictly within the screen
    // X range: from -size/2 to maxX - size/2
    const minX = -size / 2;
    const rangeX = maxX; // The center can be from 0 to maxX, meaning left goes from -size/2 to maxX - size/2
    
    const minY = -size / 2;
    const rangeY = maxY;
    
    const randomX = minX + Math.floor(Math.random() * rangeX);
    const randomY = minY + Math.floor(Math.random() * rangeY);
    
    // Extremely slow movement (60 to 120 seconds)
    const duration = Math.floor(Math.random() * 60000) + 60000;
    
    orb.style.transition = `transform ${duration}ms linear, opacity ${duration}ms ease-in-out`;
    orb.style.transform = `translate(${randomX}px, ${randomY}px) scale(${0.7 + Math.random() * 0.6})`;
    orb.style.opacity = `${0.15 + Math.random() * 0.15}`;

    setTimeout(() => moveOrb(orb), duration);
  }

  // Initial call with staggered delays
  orbs.forEach((orb, index) => {
    setTimeout(() => moveOrb(orb as HTMLElement), index * 400);
  });
}

function init(): void {
  console.log('[ChessBridge] Initializing application...');
  
  initTabs();
  initSettings();
  initGreeting();
  initMonitorListeners();
  renderHistory();
  initHistoryListeners();
  initCursorTracking();
  initLogin();
  fixUnknownHistory();
  initRandomOrbs();
  
  console.log('[ChessBridge] Application ready.');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
