
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration.
// This is read from environment variables to keep it secure and flexible.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase App
let app: FirebaseApp;
// Check if all required config values are present before initializing
if (
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId
) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
} else {
    // This will log an error in the server console if the configuration is missing
    console.error("Firebase configuration is missing or incomplete. Please check your .env file.");
    // In a production app, you might want to throw an error or handle this differently.
    // For now, we will prevent the app from crashing by not initializing Firebase.
    // The parts of the app that depend on Firebase will fail gracefully.
    app = {} as FirebaseApp; // Provide a dummy object to prevent further crashes on import
}

const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider };
