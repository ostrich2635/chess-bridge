// Popup UI script for Chess Analysis Bridge Extension

document.addEventListener('DOMContentLoaded', () => {
  const usernameInput = document.getElementById('username');
  const tokenInput = document.getElementById('token');
  const autoImportToggle = document.getElementById('auto-import');
  const saveBtn = document.getElementById('save-btn');
  const toggleTokenBtn = document.getElementById('toggle-token');
  const statusMsg = document.getElementById('status-msg');

  // Load saved settings
  chrome.storage.local.get(['username', 'token', 'autoImport'], (result) => {
    if (result.username) usernameInput.value = result.username;
    if (result.token) tokenInput.value = result.token;
    if (result.autoImport !== undefined) autoImportToggle.checked = result.autoImport;
  });

  // Toggle token visibility
  toggleTokenBtn.addEventListener('click', () => {
    if (tokenInput.type === 'password') {
      tokenInput.type = 'text';
      toggleTokenBtn.textContent = '🔒';
    } else {
      tokenInput.type = 'password';
      toggleTokenBtn.textContent = '👁';
    }
  });

  // Save settings
  saveBtn.addEventListener('click', () => {
    const settings = {
      username: usernameInput.value.trim(),
      token: tokenInput.value.trim(),
      autoImport: autoImportToggle.checked
    };

    chrome.storage.local.set(settings, () => {
      statusMsg.textContent = '✓ Settings Saved!';
      statusMsg.classList.remove('hidden');
      setTimeout(() => {
        statusMsg.classList.add('hidden');
      }, 2500);
    });
  });
});
