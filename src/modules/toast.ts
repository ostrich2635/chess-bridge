import { ToastType } from '../types';

export function showToast(message: string, type: ToastType = 'info', duration: number = 4000): void {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;

  let icon = 'ℹ';
  if (type === 'success') icon = '✓';
  else if (type === 'error') icon = '✕';

  toast.innerHTML = `<span class="toast-icon">${icon}</span><div class="toast-content"><p class="toast-message">${message}</p></div>`;
  
  container.appendChild(toast);

  const toasts = container.querySelectorAll('.toast');
  if (toasts.length > 5) {
    toasts[0].remove();
  }

  setTimeout(() => {
    toast.classList.add('toast-exit');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, duration);
}
