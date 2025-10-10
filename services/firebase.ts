import firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/auth';

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
if (firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
}

// Export services
export const db = firebase.firestore();
export const auth = firebase.auth();
