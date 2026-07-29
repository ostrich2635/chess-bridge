import { loadSettings, saveSettings, fetchCloudData, loadHistory, clearHistory } from './storage';
import { showToast } from './toast';
import { auth, db } from './firebase';
import { updatePassword, deleteUser } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';

export function initSettings(): void {
  const usernameInput = document.getElementById('chess-username') as HTMLInputElement | null;
  const tokenInput = document.getElementById('lichess-token') as HTMLInputElement | null;
  const autoImportToggle = document.getElementById('auto-import-toggle') as HTMLInputElement | null;
  const toggleTokenBtn = document.getElementById('toggle-token-btn');
  const saveBtn = document.getElementById('save-settings-btn');
  
  // Modal Elements
  const headerSettingsBtn = document.getElementById('header-settings-btn');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const settingsModalOverlay = document.getElementById('settings-modal-overlay');

  const settings = loadSettings();

  if (usernameInput) usernameInput.value = settings.username || '';
  if (tokenInput) tokenInput.value = settings.token || '';
  if (autoImportToggle) autoImportToggle.checked = settings.autoImport || false;

  // Tab Switching
  const tabBtns = document.querySelectorAll('.settings-tab-btn');
  const panes = document.querySelectorAll('.settings-pane');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));
      
      btn.classList.add('active');
      const targetId = `settings-tab-${(btn as HTMLElement).dataset.settingsTab}`;
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');
    });
  });

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

  // General Settings Save
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const newSettings = {
        username: usernameInput ? usernameInput.value.trim() : '',
        token: tokenInput ? tokenInput.value.trim() : '',
        autoImport: autoImportToggle ? autoImportToggle.checked : false,
        avatar: settings.avatar
      };
      saveSettings(newSettings);
      showToast('Settings saved successfully', 'success');
      
      if (settingsModalOverlay) {
        settingsModalOverlay.classList.add('hidden');
      }
    });
  }

  // Cloud & Sync Features
  const forceSyncBtn = document.getElementById('force-sync-btn');
  const exportDataBtn = document.getElementById('export-data-btn');

  if (forceSyncBtn) {
    forceSyncBtn.addEventListener('click', async () => {
      if (!auth.currentUser) return;
      forceSyncBtn.textContent = "Syncing...";
      await saveSettings(loadSettings());
      await fetchCloudData(auth.currentUser.uid);
      forceSyncBtn.textContent = "Sync Now";
      showToast("Cloud sync complete", "success");
    });
  }

  if (exportDataBtn) {
    exportDataBtn.addEventListener('click', () => {
      const data = {
        settings: loadSettings(),
        history: loadHistory()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chessbridge_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Data exported", "success");
    });
  }

  // Danger Zone Features
  const newPasswordInput = document.getElementById('new-password') as HTMLInputElement;
  const changePasswordBtn = document.getElementById('change-password-btn');
  const deleteAccountBtn = document.getElementById('delete-account-btn');

  if (changePasswordBtn && newPasswordInput) {
    changePasswordBtn.addEventListener('click', async () => {
      const pwd = newPasswordInput.value;
      if (!pwd || pwd.length < 6) {
        showToast("Password must be at least 6 characters", "error");
        return;
      }
      if (!auth.currentUser) return;
      
      try {
        await updatePassword(auth.currentUser, pwd);
        showToast("Password updated successfully", "success");
        newPasswordInput.value = "";
      } catch (e: any) {
        if (e.code === 'auth/requires-recent-login') {
          showToast("Please log out and back in to change your password", "error");
        } else {
          showToast(e.message, "error");
        }
      }
    });
  }

  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', async () => {
      const confirmDelete = confirm("Are you sure? This permanently deletes your account and all data.");
      if (!confirmDelete) return;
      
      const user = auth.currentUser;
      if (!user) return;
      
      try {
        await deleteDoc(doc(db, "users", user.uid));
        await deleteUser(user);
        await clearHistory();
        showToast("Account deleted", "success");
        setTimeout(() => window.location.reload(), 1500);
      } catch (e: any) {
        if (e.code === 'auth/requires-recent-login') {
          showToast("Please log out and back in to delete your account", "error");
        } else {
          showToast(e.message, "error");
        }
      }
    });
  }

  // Modal Open/Close Logic
  if (headerSettingsBtn && settingsModalOverlay) {
    headerSettingsBtn.addEventListener('click', () => {
      settingsModalOverlay.classList.remove('hidden');
    });
  }

  if (closeSettingsBtn && settingsModalOverlay) {
    closeSettingsBtn.addEventListener('click', () => {
      settingsModalOverlay.classList.add('hidden');
    });
  }

  if (settingsModalOverlay) {
    settingsModalOverlay.addEventListener('click', (e) => {
      if (e.target === settingsModalOverlay) {
        settingsModalOverlay.classList.add('hidden');
      }
    });
  }
}
