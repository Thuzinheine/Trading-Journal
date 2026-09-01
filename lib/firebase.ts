import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

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
      let activeToken = cachedAccessToken;
      // Restore access token from localStorage upon page refresh if available and not expired
      if (!activeToken && typeof window !== 'undefined') {
        const storedToken = localStorage.getItem('google_oauth_access_token');
        const expiryStr = localStorage.getItem('google_oauth_token_expiry');
        const expiry = expiryStr ? parseInt(expiryStr, 10) : 0;
        
        if (storedToken && expiry && Date.now() > expiry) {
          // Token is expired!
          localStorage.removeItem('google_oauth_access_token');
          localStorage.removeItem('google_oauth_token_expiry');
          activeToken = null;
        } else if (storedToken) {
          activeToken = storedToken;
          cachedAccessToken = storedToken;
        }
      }

      // Maintain user login state in UI
      if (onAuthSuccess) {
        onAuthSuccess(user, activeToken || '');
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
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
      if (typeof window !== 'undefined') {
        const expiry = Date.now() + 3500 * 1000; // ~58 minutes
        localStorage.setItem('google_oauth_access_token', cachedAccessToken);
        localStorage.setItem('google_oauth_token_expiry', expiry.toString());
      }
    }
    
    return { user: result.user, accessToken: cachedAccessToken || '' };
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

import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';

export interface LearningNote {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  createdAt: any; 
  userId: string;
  userEmail: string;
  tags?: string[];
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function fetchLearningNotes(userId: string): Promise<LearningNote[]> {
  const path = 'learning_notes';
  try {
    const q = query(
      collection(db, path),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const notes = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || '',
        content: data.content || '',
        imageUrl: data.imageUrl || '',
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || '',
        userId: data.userId || '',
        userEmail: data.userEmail || '',
        tags: data.tags || []
      } as LearningNote;
    });
    // Client-side sort by createdAt descending to bypass composite index requirement and speed up the query instantly
    return notes.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveLearningNote(note: Omit<LearningNote, 'createdAt'>, isNew: boolean): Promise<void> {
  const path = `learning_notes/${note.id}`;
  try {
    const docRef = doc(db, 'learning_notes', note.id);
    const dataToSave: any = {
      id: note.id,
      title: note.title,
      content: note.content,
      userId: note.userId,
      userEmail: note.userEmail,
      tags: note.tags || [],
      updatedAt: serverTimestamp()
    };
    if (note.imageUrl !== undefined) {
      dataToSave.imageUrl = note.imageUrl;
    }
    if (isNew) {
      dataToSave.createdAt = serverTimestamp();
    }
    await setDoc(docRef, dataToSave, { merge: true });
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function deleteLearningNote(noteId: string): Promise<void> {
  const path = `learning_notes/${noteId}`;
  try {
    const docRef = doc(db, 'learning_notes', noteId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
