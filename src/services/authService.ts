import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  verifyPasswordResetCode as firebaseVerifyPasswordResetCode,
  confirmPasswordReset as firebaseConfirmPasswordReset,
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions, googleProvider, isFirebaseConfigured } from '../config/firebase';
import type { User, UserRole } from '../types/models';

function buildPasswordActionSettings(email: string) {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://klubi35.web.app';
  return {
    url: `${origin}/?passwordSet=1&email=${encodeURIComponent(email.trim().toLowerCase())}`,
    handleCodeInApp: false,
  };
}

export const authService = {
  /** Live mode: Firebase sends a password-reset e-mail. Local sandbox: no-op (returns false). */
  async sendPasswordReset(email: string): Promise<boolean> {
    if (!(isFirebaseConfigured && auth)) return false;
    await sendPasswordResetEmail(auth, email.trim(), buildPasswordActionSettings(email));
    return true;
  },

  /** Verify a Firebase password-reset oobCode and return the associated e-mail address. */
  async verifyPasswordResetCode(oobCode: string): Promise<string> {
    if (!auth) throw new Error('Firebase Auth is not configured');
    return firebaseVerifyPasswordResetCode(auth, oobCode);
  },

  /** Confirm a new password using a Firebase password-reset oobCode. */
  async confirmPasswordReset(oobCode: string, newPassword: string): Promise<void> {
    if (!auth) throw new Error('Firebase Auth is not configured');
    await firebaseConfirmPasswordReset(auth, oobCode, newPassword);
  },

  /**
   * Live mode, admin only: Cloud Function creates the Auth account + Firestore profile for an
   * invited user. The invite e-mail is the standard Firebase "set your password" e-mail.
   */
  async inviteUser(input: {
    name: string;
    email: string;
    role: UserRole;
    currentDivision: number;
    groupIds: string[];
  }): Promise<string> {
    if (!(isFirebaseConfigured && auth && functions)) {
      throw new Error('Firebase is not configured');
    }
    const callable = httpsCallable<typeof input, { uid: string }>(functions, 'inviteUser');
    const res = await callable(input);
    try {
      await sendPasswordResetEmail(
        auth,
        input.email.trim(),
        buildPasswordActionSettings(input.email)
      );
    } catch (resetErr) {
      console.warn('Password reset invite email failed or was skipped:', resetErr);
    }
    return res.data.uid;
  },

  /** Live mode only: plain Firebase e-mail sign-in. Profile loading is handled by the auth-state listener. */
  async firebaseSignInWithEmail(email: string, password: string): Promise<void> {
    if (!auth) throw new Error('Firebase Auth is not configured');
    await signInWithEmailAndPassword(auth, email.trim(), password);
  },

  /** Live mode only: Google popup sign-in. Profile loading is handled by the auth-state listener. */
  async firebaseSignInWithGoogle(): Promise<void> {
    if (!auth || !googleProvider) throw new Error('Firebase Auth is not configured');
    await signInWithPopup(auth, googleProvider);
  },

  /** Default player profile for an authenticated Firebase user that has no Firestore profile yet. */
  profileFromFirebaseUser(fbUser: FirebaseUser): User {
    return {
      id: fbUser.uid,
      email: fbUser.email || undefined,
      name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Golf Player',
      role: 'player',
      groupIds: [],
      currentDivision: 1,
      xp: 0,
      attendanceCount: 0,
      createdAt: new Date().toISOString(),
    };
  },

  async signInWithEmail(
    email: string,
    password: string,
    allUsers: User[]
  ): Promise<User | null> {
    if (isFirebaseConfigured && auth) {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const matched = allUsers.find(
        (u) => u.id === cred.user.uid || u.email?.toLowerCase() === email.toLowerCase()
      );
      if (matched) return matched;
      return {
        id: cred.user.uid,
        email: cred.user.email || email,
        name: cred.user.displayName || email.split('@')[0],
        role: 'player',
        groupIds: ['grp-startti'],
        currentDivision: 1,
        xp: 0,
        attendanceCount: 0,
        createdAt: new Date().toISOString(),
      };
    }

    // Local sandbox fallback: match by email or name
    const normalized = email.trim().toLowerCase();
    const matched =
      allUsers.find((u) => u.email?.toLowerCase() === normalized) ||
      allUsers.find((u) => u.name.toLowerCase().includes(normalized));
    return matched || null;
  },

  async registerWithEmail(input: {
    name: string;
    email: string;
    password: string;
    groupId: string;
  }): Promise<User> {
    const cleanName = input.name.trim();
    const cleanEmail = input.email.trim().toLowerCase();

    if (isFirebaseConfigured && auth) {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, input.password);
      await updateProfile(cred.user, { displayName: cleanName });
      return {
        id: cred.user.uid,
        email: cred.user.email || cleanEmail,
        name: cleanName,
        role: 'player',
        groupIds: input.groupId ? [input.groupId] : [],
        currentDivision: 1,
        xp: 0,
        attendanceCount: 0,
        createdAt: new Date().toISOString(),
      };
    }

    // Local sandbox fallback: create a new local player account
    return {
      id: `player-${Date.now()}`,
      email: cleanEmail,
      name: cleanName,
      role: 'player',
      groupIds: input.groupId ? [input.groupId] : ['grp-startti'],
      currentDivision: 1,
      xp: 0,
      attendanceCount: 0,
      createdAt: new Date().toISOString(),
    };
  },

  async signInWithGoogle(allUsers: User[]): Promise<User | null> {
    if (isFirebaseConfigured && auth && googleProvider) {
      const cred = await signInWithPopup(auth, googleProvider);
      const matched = allUsers.find(
        (u) =>
          u.id === cred.user.uid ||
          (cred.user.email && u.email?.toLowerCase() === cred.user.email.toLowerCase())
      );
      if (matched) return matched;
      return {
        id: cred.user.uid,
        email: cred.user.email || undefined,
        name: cred.user.displayName || 'Golf Player',
        role: 'player',
        groupIds: ['grp-startti'],
        currentDivision: 1,
        xp: 0,
        attendanceCount: 0,
        createdAt: new Date().toISOString(),
      };
    }

    // Local sandbox fallback: sign in as first player or admin
    return allUsers.find((u) => u.id === 'player-onni') || allUsers[0] || null;
  },

  async signOut(): Promise<void> {
    if (isFirebaseConfigured && auth) {
      await firebaseSignOut(auth);
    }
  },
};
