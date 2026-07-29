import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User
} from "firebase/auth";
import { auth } from "./firebase";
import { showToast } from "./toast";
import { fetchCloudData } from "./storage";
import { initGreeting } from "./greeting";

// Helper to convert chess.com username into a valid fake email for Firebase
function formatEmail(username: string): string {
  return `${username.toLowerCase().trim()}@chessbridge.local`;
}

// Extract username from fake email
function extractUsername(email: string | null): string {
  if (!email) return "";
  return email.split('@')[0];
}

export function initAuthListeners() {
  const loginOverlay = document.getElementById('login-overlay');
  const authForm = document.getElementById('auth-form') as HTMLFormElement;
  const authModeToggle = document.getElementById('auth-mode-toggle');
  const authSubmitBtn = document.getElementById('auth-submit-btn');
  const usernameInput = document.getElementById('auth-username') as HTMLInputElement;
  const passwordInput = document.getElementById('auth-password') as HTMLInputElement;
  const headerUserDisplay = document.getElementById('header-user-display');
  const headerLogoutBtn = document.getElementById('header-logout-btn');

  let isRegisterMode = false;

  // Toggle Login/Register Mode
  if (authModeToggle && authSubmitBtn) {
    authModeToggle.addEventListener('click', (e) => {
      e.preventDefault();
      isRegisterMode = !isRegisterMode;
      const btnText = authSubmitBtn.querySelector('.btn-text');
      if (isRegisterMode) {
        if (btnText) btnText.textContent = 'Register ♞';
        authModeToggle.textContent = 'Already have an account? Log In';
      } else {
        if (btnText) btnText.textContent = 'Log In ♞';
        authModeToggle.textContent = 'Need an account? Register';
      }
    });
  }

  // Handle Form Submission
  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = usernameInput.value;
      const password = passwordInput.value;
      const email = formatEmail(username);

      if (!username || !password) {
        showToast("Username and password required.", "error");
        return;
      }

      const btnText = authSubmitBtn?.querySelector('.btn-text');
      if (btnText) btnText.textContent = 'Loading...';

      try {
        if (isRegisterMode) {
          await createUserWithEmailAndPassword(auth, email, password);
          showToast("Account created & logged in!", "success");
        } else {
          await signInWithEmailAndPassword(auth, email, password);
          showToast("Successfully logged in!", "success");
        }
        authForm.reset();
      } catch (error: any) {
        showToast(error.message, "error");
      } finally {
        if (btnText) {
          btnText.textContent = isRegisterMode ? 'Register ♞' : 'Log In ♞';
        }
      }
    });
  }

  // Handle Logout
  if (headerLogoutBtn) {
    headerLogoutBtn.addEventListener('click', async () => {
      try {
        await signOut(auth);
        showToast("Logged out of cloud.", "success");
      } catch (error: any) {
        showToast("Logout failed.", "error");
      }
    });
  }

  // Listen to Auth State Changes
  onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      // User is logged in
      const username = extractUsername(user.email);
      if (headerUserDisplay) {
        headerUserDisplay.classList.remove('hidden');
        headerUserDisplay.innerHTML = `☁️ Synced as <strong>${username}</strong>`;
      }
      if (headerLogoutBtn) headerLogoutBtn.classList.remove('hidden');
      
      // Load data from cloud, which populates localStorage
      await fetchCloudData(user.uid);
      
      // We rely on login.ts initLogin() to show the dashboard if localStorage is populated.
      // But if we just logged in, initLogin() already ran. We should call showDashboard manually.
      // To avoid circular dependencies, we can just dispatch a custom event or manipulate the DOM directly.
      if (loginOverlay) loginOverlay.classList.add('hidden');
      const appDashboard = document.getElementById('app-dashboard');
      if (appDashboard) appDashboard.style.display = 'block';
      const userChip = document.getElementById('user-profile-chip');
      const userChipName = document.getElementById('user-chip-name');
      if (userChip && userChipName) {
        userChip.classList.remove('hidden');
        userChipName.textContent = username;
      }
      
      // Refresh greeting
      initGreeting();
    } else {
      // User is logged out
      if (headerUserDisplay) headerUserDisplay.classList.add('hidden');
      if (headerLogoutBtn) headerLogoutBtn.classList.add('hidden');
      
      if (loginOverlay) loginOverlay.classList.remove('hidden');
      const appDashboard = document.getElementById('app-dashboard');
      if (appDashboard) appDashboard.style.display = 'none';
      const userChip = document.getElementById('user-profile-chip');
      if (userChip) userChip.classList.add('hidden');
    }
  });
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}
