import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB5omV36xJpze5lK9YJ3eeUrre3AZiU1K0",
  authDomain: "chessbridge-3297f.firebaseapp.com",
  projectId: "chessbridge-3297f",
  storageBucket: "chessbridge-3297f.firebasestorage.app",
  messagingSenderId: "450944236504",
  appId: "1:450944236504:web:96f51988994da03a91d0ad",
  measurementId: "G-SV3VVSSLDZ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
