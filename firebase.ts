// FIX: Reverting to namespaced syntax to resolve type errors with installed firebase version.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/database';
import 'firebase/compat/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD7zgFq2vHx4WYg-nEDQXU_vi1HOwfy2Xc",
  authDomain: "edtech-course.firebaseapp.com",
  databaseURL: "https://edtech-course-default-rtdb.firebaseio.com",
  projectId: "edtech-course",
  storageBucket: "edtech-course.appspot.com",
  messagingSenderId: "885280216510",
  appId: "1:885280216510:web:8de6c763c252c9b08c95ef",
  measurementId: "G-1N64QWP9TB"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const app = firebase.app();
const db = firebase.database();
const auth = firebase.auth();
const storage = firebase.storage();

export const uploadFile = async (file: File, path: string): Promise<string> => {
    const fileRef = storage.ref(path);
    const snapshot = await fileRef.put(file);
    return await snapshot.ref.getDownloadURL();
};

// Shims to maintain some compatibility with consumers expecting v9-like named exports if any
export const deleteObject = (ref: any) => ref.delete();
export const storageRef = (storageInstance: any, path: string) => storageInstance.ref(path);

export { app, db, storage, auth };
export default firebase;