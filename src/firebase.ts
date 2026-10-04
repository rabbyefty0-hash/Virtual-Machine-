import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Create/update user profile in Firestore
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      lastLogin: serverTimestamp(),
      createdAt: serverTimestamp() // setDoc with merge: true or check if exists
    }, { merge: true });
    
    return user;
  } catch (error: any) {
    if (error?.code !== 'auth/popup-closed-by-user') {
      console.error("Error signing in with Google:", error);
    }
    throw error;
  }
};

export const signInWithPhoneMock = async (phoneNumber: string) => {
  try {
    const result = await signInAnonymously(auth);
    const user = result.user;
    
    // Create/update user profile in Firestore with mock phone number
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      phoneNumber: phoneNumber,
      displayName: phoneNumber,
      photoURL: '',
      lastLogin: serverTimestamp(),
      createdAt: serverTimestamp()
    }, { merge: true });
    
    return user;
  } catch (error: any) {
    console.error("Error signing in anonymously:", error);
    throw error;
  }
};

export const logout = () => signOut(auth);

export { onAuthStateChanged };
export type { User };
