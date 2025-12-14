import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBhjv5prhRxwmlEgBT3otTCvqBKoTrpkPw",
  authDomain: "turplace-8468f.firebaseapp.com",
  projectId: "turplace-8468f",
  storageBucket: "turplace-8468f.firebasestorage.app",
  messagingSenderId: "899849542348",
  appId: "1:899849542348:web:0b50a15a8a9abbd7ea0069",
  measurementId: "G-JXDB8QV2SR"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
