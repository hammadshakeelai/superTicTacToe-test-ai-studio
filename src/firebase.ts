import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyARCWspCtZwl4UZXznJM9n9awtaBmLvOFw",
  authDomain: "gen-lang-client-0977588738.firebaseapp.com",
  projectId: "gen-lang-client-0977588738",
  storageBucket: "gen-lang-client-0977588738.firebasestorage.app",
  messagingSenderId: "416425494606",
  appId: "1:416425494606:web:b9e5a4c3f82f85cff75b1f"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
