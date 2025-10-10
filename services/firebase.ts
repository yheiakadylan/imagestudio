
// FIX: Updated Firebase import to use the scoped package '@firebase/app' to resolve module export errors.
import { initializeApp, getApps } from "@firebase/app";
import { getFirestore } from "firebase/firestore";
// FIX: Updated Firebase import to use the scoped package '@firebase/auth' to resolve module export errors.
import { getAuth } from "@firebase/auth";

// The user's web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB9Ei6EMooh70bWftKzVvk0PbcXpsx0vTw",
  authDomain: "genart-d82c5.firebaseapp.com",
  projectId: "genart-d82c5",
  storageBucket: "genart-d82c5.appspot.com",
  messagingSenderId: "647192019197",
  appId: "1:647192019197:web:5d2623d5f3390402c3fe94",
  measurementId: "G-6EYTQJFXZR"
};

// Initialize Firebase
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Export services
export const db = getFirestore(app);
export const auth = getAuth(app);
