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
  const loginModalOverlay = document.getElementById('login-modal-overlay');
  const cloudLoginBtn = document.getElementById('header-cloud-login-btn');
  const closeLoginBtn = document.getElementById('close-login-btn');
  const authForm = document.getElementById('auth-form') as HTMLFormElement;
  const authModeToggle = document.getElementById('auth-mode-toggle');
  const authSubmitBtn = document.getElementById('auth-submit-btn');
  const authTitle = document.getElementById('auth-title');
  const usernameInput = document.getElementById('auth-username') as HTMLInputElement;
  const passwordInput = document.getElementById('auth-password') as HTMLInputElement;
  const headerUserDisplay = document.getElementById('header-user-display');
  const headerLogoutBtn = document.getElementById('header-logout-btn');

  let isRegisterMode = false;

  // Toggle modal
  if (cloudLoginBtn && loginModalOverlay) {
    cloudLoginBtn.addEventListener('click', () => {
      loginModalOverlay.classList.remove('hidden');
    });
  }

  if (closeLoginBtn && loginModalOverlay) {
    closeLoginBtn.addEventListener('click', () => {
      loginModalOverlay.classList.add('hidden');
    });
  }

  if (loginModalOverlay) {
    loginModalOverlay.addEventListener('click', (e) => {
      if (e.target === loginModalOverlay) {
        loginModalOverlay.classList.add('hidden');
      }
    });
  }

  // Toggle Login/Register Mode
  if (authModeToggle && authSubmitBtn && authTitle) {
    authModeToggle.addEventListener('click', (e) => {
      e.preventDefault();
      isRegisterMode = !isRegisterMode;
      if (isRegisterMode) {
        authTitle.textContent = 'Create Cloud Account';
        authSubmitBtn.textContent = 'Register';
        authModeToggle.textContent = 'Already have an account? Log In';
      } else {
        authTitle.textContent = 'Cloud Login';
        authSubmitBtn.textContent = 'Log In';
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

      if (authSubmitBtn) authSubmitBtn.textContent = 'Loading...';

      try {
        if (isRegisterMode) {
          await createUserWithEmailAndPassword(auth, email, password);
          showToast("Account created & logged in!", "success");
        } else {
          await signInWithEmailAndPassword(auth, email, password);
          showToast("Successfully logged in!", "success");
        }
        if (loginModalOverlay) loginModalOverlay.classList.add('hidden');
        authForm.reset();
      } catch (error: any) {
        showToast(error.message, "error");
      } finally {
        if (authSubmitBtn) {
          authSubmitBtn.textContent = isRegisterMode ? 'Register' : 'Log In';
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
      if (cloudLoginBtn) cloudLoginBtn.classList.add('hidden');
      if (headerUserDisplay) {
        headerUserDisplay.classList.remove('hidden');
        headerUserDisplay.innerHTML = `☁️ Synced as <strong>${username}</strong>`;
      }
      if (headerLogoutBtn) headerLogoutBtn.classList.remove('hidden');
      
      // Load data from cloud
      await fetchCloudData(user.uid);
      
      // Refresh greeting
      initGreeting();
    } else {
      // User is logged out
      if (cloudLoginBtn) cloudLoginBtn.classList.remove('hidden');
      if (headerUserDisplay) headerUserDisplay.classList.add('hidden');
      if (headerLogoutBtn) headerLogoutBtn.classList.add('hidden');
    }
  });
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}
