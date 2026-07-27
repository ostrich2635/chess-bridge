export function initTabs(): void {
  const tabButtons = document.querySelectorAll('[data-tab]');
  const tabPanels = document.querySelectorAll('.tab-content');
  const tabTrack = document.querySelector('.tab-track') as HTMLElement | null;

  function updateIndicator(btn: HTMLElement) {
    if (!tabTrack) return;
    const left = btn.offsetLeft;
    const width = btn.offsetWidth;
    tabTrack.style.setProperty('--indicator-left', `${left}px`);
    tabTrack.style.setProperty('--indicator-width', `${width}px`);
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetBtn = e.currentTarget as HTMLElement;
      const targetId = targetBtn.getAttribute('data-tab');

      tabButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabPanels.forEach(p => p.classList.remove('active'));

      targetBtn.classList.add('active');
      targetBtn.setAttribute('aria-selected', 'true');
      
      if (targetId) {
        const panel = document.getElementById(targetId);
        if (panel) panel.classList.add('active');
      }

      updateIndicator(targetBtn);
    });
  });

  const activeTab = document.querySelector('[data-tab].active') as HTMLElement;
  if (activeTab) {
    updateIndicator(activeTab);
  }

  window.addEventListener('resize', () => {
    const currentActiveTab = document.querySelector('[data-tab].active') as HTMLElement;
    if (currentActiveTab) {
      updateIndicator(currentActiveTab);
    }
  });

  console.log('[ChessBridge] Tabs initialized');
}
