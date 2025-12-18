import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Configure Firebase Auth for better compatibility
auth.useDeviceLanguage();

// Set persistence to local (default)
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn('Firebase Auth persistence error:', error);
});

// Configure auth domain for production
if (!import.meta.env.DEV) {
  // Ensure we're using the correct auth domain
  console.log('Firebase Auth domain:', auth.app.options.authDomain);
}
