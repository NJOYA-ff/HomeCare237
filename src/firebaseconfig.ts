import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBTITuiGdKTyYlgQ5CIoN890xHPRTZkghc",
  authDomain: "homecare-1c228.firebaseapp.com",
  projectId: "homecare-1c228",
  storageBucket: "homecare-1c228.firebasestorage.app",
  messagingSenderId: "770997904222",
  appId: "1:770997904222:web:855359e3b960dcb7c225cf",
  measurementId: "G-98C841L6FG",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { auth, db, storage };
