// ==================== FIREBASE CONFIGURATION ====================
// Replace these values with your Firebase project credentials

const firebaseConfig = {
  apiKey: "AIzaSyCPN46YkG5NlOcZiTy3W748lDUKVWdq2Gg",
  authDomain: "pss-loading-data-4e817.firebaseapp.com",
  projectId: "pss-loading-data-4e817",
  storageBucket: "pss-loading-data-4e817.firebasestorage.app",
  messagingSenderId: "136985780442",
  appId: "1:136985780442:web:a941c7e63921588e9c05e3"
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
            console.warn('The current browser does not support offline persistence');
        }
    });

console.log('✅ Firebase initialized successfully');
