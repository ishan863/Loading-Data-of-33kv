// ==================== FIREBASE CONFIGURATION ====================
// Replace these values with your Firebase project credentials

const firebaseConfig = {
  apiKey: "AIzaSyCNTu9cgnV129XNtyfPTlM0O8xhSARApyQ",
  authDomain: "loading-data-33kv.firebaseapp.com",
  projectId: "loading-data-33kv",
  storageBucket: "loading-data-33kv.firebasestorage.app",
  messagingSenderId: "511899118817",
  appId: "1:511899118817:web:0eafc3cf2b906a8b085ba0"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get Firebase services
const db = firebase.firestore();
const auth = firebase.auth();

// Enable offline persistence
db.enablePersistence()
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code == 'unimplemented') {
            console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        }
    });

console.log('✅ Firebase initialized successfully');
