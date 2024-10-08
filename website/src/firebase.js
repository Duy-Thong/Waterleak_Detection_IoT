// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import 'firebase/auth';
import 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCR98EPOgJvByjRJPsapt15YsaEmHKGTcA",
    authDomain: "esp8266firebase-2f31a.firebaseapp.com",
    databaseURL: "https://esp8266firebase-2f31a-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "esp8266firebase-2f31a",
    storageBucket: "esp8266firebase-2f31a.appspot.com",
    messagingSenderId: "261851321671",
    appId: "1:261851321671:web:e2318ad58b052a6184e862"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database };
