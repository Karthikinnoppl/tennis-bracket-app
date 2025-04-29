// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA_TUu9ESh_glhXNRXRc16DCblrYC51_AU",
  authDomain: "tennis-bracket-app.firebaseapp.com",
  projectId: "tennis-bracket-app",
  storageBucket: "tennis-bracket-app.firebasestorage.app",
  messagingSenderId: "82581257792",
  appId: "1:82581257792:web:f179cb96b018e9749ce9a5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };