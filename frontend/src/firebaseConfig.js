// Import the functions you need from the SDKs you need

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
// Your web app's Firebase configuration

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: "nearcare-b47c3.firebasestorage.app",
  messagingSenderId: "1024086128248",
  appId: "1:1024086128248:web:a4300882c1df95a31f5f8d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the tools we need
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Email Link Authentication Config
export const actionCodeSettings = {
  url: `${import.meta.env.VITE_APP_URL || 'http://localhost:5173'}/verify-email`,
  handleCodeInApp: true,
};
