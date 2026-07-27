import { loadSettings, saveSettings } from './storage';
import { showToast } from './toast';
import { startMonitoring, stopMonitoring } from './polling';

export function initLogin(): void {
  const settings = loadSettings();
  const loginForm = document.getElementById('login-form') as HTMLFormElement | null;
  const loginUsername = document.getElementById('login-username') as HTMLInputElement | null;
  const loginToken = document.getElementById('login-token') as HTMLInputElement | null;
  const loginError = document.getElementById('login-error');
  const loginSubmitBtn = document.getElementById('login-submit-btn');
  const logoutBtn = document.getElementById('logout-btn');

  if (settings.username) {
    showDashboard(settings.username, settings.avatar);
  } else {
    showLogin();
  }

  if (loginForm && loginUsername && loginToken) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = loginUsername.value.trim();
      const token = loginToken.value.trim();

      if (!username) {
        if (loginError) {
          loginError.textContent = 'Username is required';
          loginError.classList.remove('hidden');
        }
        return;
      }

      if (loginError) loginError.classList.add('hidden');
      if (loginSubmitBtn) {
        loginSubmitBtn.setAttribute('disabled', 'true');
        loginSubmitBtn.innerHTML = '<span class="btn-text">Verifying account...</span>';
      }

      try {
        const res = await fetch(`https://api.chess.com/pub/player/${username}`);
        if (!res.ok) {
          throw new Error('Chess.com account not found. Please check spelling!');
        }
        const data = await res.json();
        const avatar = data.avatar || 'https://images.chesscomfiles.com/uploads/v1/user/default.a21d152a.100x100o.b92473ffefbf.png';

        saveSettings({
          username: data.username,
          token: token || settings.token || '',
          autoImport: true,
          avatar: avatar
        });

        const setupUser = document.getElementById('username') as HTMLInputElement | null;
        const setupToken = document.getElementById('token') as HTMLInputElement | null;
        const setupAuto = document.getElementById('auto-import') as HTMLInputElement | null;
        if (setupUser) setupUser.value = data.username;
        if (setupToken) setupToken.value = token || settings.token || '';
        if (setupAuto) setupAuto.checked = true;

        showToast(`Connected to Chess.com as ${data.username}!`, 'success');
        showDashboard(data.username, avatar);
        startMonitoring();
      } catch (err: any) {
        if (loginError) {
          loginError.textContent = err.message || 'Verification failed';
          loginError.classList.remove('hidden');
        }
      } finally {
        if (loginSubmitBtn) {
          loginSubmitBtn.removeAttribute('disabled');
          loginSubmitBtn.innerHTML = '<span class="btn-text">Connect Account ♞</span>';
        }
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      stopMonitoring();
      saveSettings({ username: '', token: '', autoImport: false });
      showToast('Logged out successfully', 'info');
      showLogin();
    });
  }
}

export function showLogin(): void {
  const loginOverlay = document.getElementById('login-overlay');
  const appDashboard = document.getElementById('app-dashboard');
  const userChip = document.getElementById('user-profile-chip');

  if (loginOverlay) loginOverlay.classList.remove('hidden');
  if (appDashboard) appDashboard.style.display = 'none';
  if (userChip) userChip.classList.add('hidden');
}

export function showDashboard(username: string, avatarUrl?: string): void {
  const loginOverlay = document.getElementById('login-overlay');
  const appDashboard = document.getElementById('app-dashboard');
  const userChip = document.getElementById('user-profile-chip');
  const userChipName = document.getElementById('user-chip-name');
  const userChipAvatar = document.getElementById('user-chip-avatar') as HTMLImageElement | null;

  if (loginOverlay) loginOverlay.classList.add('hidden');
  if (appDashboard) appDashboard.style.display = 'block';
  
  if (userChip && username) {
    userChip.classList.remove('hidden');
    if (userChipName) userChipName.textContent = username;
    if (userChipAvatar) {
      userChipAvatar.src = avatarUrl || 'https://images.chesscomfiles.com/uploads/v1/user/default.a21d152a.100x100o.b92473ffefbf.png';
    }
  }
}
