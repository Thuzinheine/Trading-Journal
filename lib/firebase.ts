import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const provider = new GoogleAuthProvider();
// Request Sheets, Docs, and Drive scopes
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/documents');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      // Try to restore the access token from localStorage upon page refresh
      if (!cachedAccessToken && typeof window !== 'undefined') {
        const storedToken = localStorage.getItem('google_oauth_access_token');
        const storedExpiry = localStorage.getItem('google_oauth_token_expiry');
        if (storedToken && storedExpiry) {
          const expiryTime = parseInt(storedExpiry, 10);
          // Only restore if the token has not expired yet
          if (Date.now() < expiryTime) {
            cachedAccessToken = storedToken;
          }
        }
      }

      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // If we are actively in the middle of a sign-in flow (popup), do not auto-signout
        if (isSigningIn) {
          return;
        }
        // If user is authenticated in Firebase but we lack a valid Google token,
        // sign out of Firebase as well so they are prompted to login again
        await auth.signOut();
        cachedAccessToken = null;
        if (typeof window !== 'undefined') {
          localStorage.removeItem('google_oauth_access_token');
          localStorage.removeItem('google_oauth_token_expiry');
        }
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('google_oauth_access_token');
        localStorage.removeItem('google_oauth_token_expiry');
      }
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }
    cachedAccessToken = credential.accessToken;
    
    // Persist the token to localStorage along with an expiration timestamp (~1 hour)
    if (typeof window !== 'undefined') {
      const expiry = Date.now() + 3500 * 1000; // 58 minutes (safety buffer)
      localStorage.setItem('google_oauth_access_token', cachedAccessToken);
      localStorage.setItem('google_oauth_token_expiry', expiry.toString());
    }
    
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      const expiry = Date.now() + 3500 * 1000; // 58 minutes
      localStorage.setItem('google_oauth_access_token', token);
      localStorage.setItem('google_oauth_token_expiry', expiry.toString());
    } else {
      localStorage.removeItem('google_oauth_access_token');
      localStorage.removeItem('google_oauth_token_expiry');
    }
  }
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('google_oauth_access_token');
    localStorage.removeItem('google_oauth_token_expiry');
  }
};
