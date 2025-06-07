// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "boedi-blog-411d6.firebaseapp.com",
  projectId: "boedi-blog-411d6",
  storageBucket: "boedi-blog-411d6.firebasestorage.app",
  messagingSenderId: "1041022725074",
  appId: "1:1041022725074:web:0beb3b3673a4a1b383f60b"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);