import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAKzcK5PZcAcTUFyojDgZRieYEGxJyMznY",
  authDomain: "screenkiss-e2c59.firebaseapp.com",
  projectId: "screenkiss-e2c59",
  storageBucket: "screenkiss-e2c59.firebasestorage.app",
  messagingSenderId: "760640170562",
  appId: "1:760640170562:web:8a4f9df0be4778693a1bdb",
  measurementId: "G-3N0J6VH54S",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

export { auth, db, analytics };
