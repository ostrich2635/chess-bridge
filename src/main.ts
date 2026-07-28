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
    const maxX = window.innerWidth;
    const maxY = window.innerHeight;
    
    // Random position
    const randomX = Math.floor(Math.random() * (maxX + 400)) - 200;
    const randomY = Math.floor(Math.random() * (maxY + 400)) - 200;
    
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
