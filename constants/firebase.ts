import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';
import { getStorage } from 'firebase/storage';
import { firebaseConfig } from './firebaseConfig';
// --- Add for persistent auth ---
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { Auth, getReactNativePersistence, initializeAuth } from 'firebase/auth';

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with persistence for React Native - Singleton pattern
let auth: Auth;

// Use a flag to prevent multiple initializations
if (!global._firebaseAuthInitialized) {
  try {
    // Try to initialize with persistence first
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    });
    global._firebaseAuthInitialized = true;
  } catch (e) {
    // If auth is already initialized, get the existing instance
    try {
      const { getAuth } = require('firebase/auth');
      auth = getAuth(app);
      global._firebaseAuthInitialized = true;
      console.warn('Firebase Auth was already initialized, using existing instance.');
    } catch (fallbackError) {
      console.error('Failed to get existing auth instance:', fallbackError);
      // Create a minimal auth instance as last resort
      auth = initializeAuth(app);
      global._firebaseAuthInitialized = true;
    }
  }
} else {
  // Auth already initialized, get existing instance
  const { getAuth } = require('firebase/auth');
  auth = getAuth(app);
}

const db = getFirestore(app);
const storage = getStorage(app);

// Initialize Firebase Cloud Messaging
let messaging: any = null;
isSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
  }
});

export { app, auth, db, messaging, storage };

