import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";



export const firebaseConfig = {
  apiKey: "AIzaSyBcSyIap5cJ8U3AGyHXksUfvr5Cm0h2W8k",
  authDomain: "musicapp265204.firebaseapp.com",
  projectId: "musicapp265204",
  storageBucket: "musicapp265204.firebasestorage.app",
  messagingSenderId: "654255707414",
  appId: "1:654255707414:web:70f9a517aabecf06622c37",
  measurementId: "G-6TPD10VYRP"
};

// tránh khởi tạo lặp khi HMR
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
// (optional) chỉ chạy trên browser, không SSR
// export const analytics = (await isSupported()) ? getAnalytics(app) : null;

export default app;