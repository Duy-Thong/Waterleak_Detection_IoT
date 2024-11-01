import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth'; // Import getAuth to initialize Firebase Authentication

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCR98EPOgJvByjRJPsapt15YsaEmHKGTcA",
    authDomain: "esp8266firebase-2f31a.firebaseapp.com",
    databaseURL: "https://esp8266firebase-2f31a-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "esp8266firebase-2f31a",
    storageBucket: "esp8266firebase-2f31a.appspot.com",
    messagingSenderId: "261851321671",
    appId: "1:261851321671:web:e2318ad58b052a6184e862"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const database = getDatabase(app);
const auth = getAuth(app); // Initialize Firebase Authentication
// Export both services
export { database, auth };
