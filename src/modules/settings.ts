import { loadSettings, saveSettings } from './storage';
import { showToast } from './toast';

export function initSettings(): void {
  const usernameInput = document.getElementById('chess-username') as HTMLInputElement | null;
  const tokenInput = document.getElementById('lichess-token') as HTMLInputElement | null;
  const autoImportToggle = document.getElementById('auto-import-toggle') as HTMLInputElement | null;
  const toggleTokenBtn = document.getElementById('toggle-token-btn');
  const saveBtn = document.getElementById('save-settings-btn');

  const settings = loadSettings();

  if (usernameInput) usernameInput.value = settings.username || '';
  if (tokenInput) tokenInput.value = settings.token || '';
  if (autoImportToggle) autoImportToggle.checked = settings.autoImport || false;

  if (toggleTokenBtn && tokenInput) {
    toggleTokenBtn.addEventListener('click', () => {
      const eyeOpen = toggleTokenBtn.querySelector('.eye-open');
      const eyeClosed = toggleTokenBtn.querySelector('.eye-closed');

      if (tokenInput.type === 'password') {
        tokenInput.type = 'text';
        if (eyeClosed) eyeClosed.classList.remove('hidden');
        if (eyeOpen) eyeOpen.classList.add('hidden');
      } else {
        tokenInput.type = 'password';
        if (eyeOpen) eyeOpen.classList.remove('hidden');
        if (eyeClosed) eyeClosed.classList.add('hidden');
      }
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const newSettings = {
        username: usernameInput ? usernameInput.value.trim() : '',
        token: tokenInput ? tokenInput.value.trim() : '',
        autoImport: autoImportToggle ? autoImportToggle.checked : false
      };
      saveSettings(newSettings);
      showToast('Settings saved successfully', 'success');
    });
  }
}
