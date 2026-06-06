import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, get, remove } from "firebase/database";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyApvyKCKutdRUriczevl7m9QLXz9wYi4g4",
  authDomain: "productivity-tracker-70063.firebaseapp.com",
  databaseURL: "https://productivity-tracker-70063-default-rtdb.firebaseio.com",
  projectId: "productivity-tracker-70063",
  storageBucket: "productivity-tracker-70063.firebasestorage.app",
  messagingSenderId: "841484934198",
  appId: "1:841484934198:web:1b6ba48c267569d5888c97",
  measurementId: "G-115168X1L0"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

let currentOnValueUnsubscribe = null;

/* ------------------------------------------------------------------ */
/* AUTHENTICATION (Email + Password)                                  */
/* ------------------------------------------------------------------ */

/**
 * Subscribe to auth state changes (logged in / logged out)
 * @param {function} callback Receives the Firebase user object, or null
 * @returns {function} Unsubscribe function
 */
export function observeAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

const googleProvider = new GoogleAuthProvider();

/**
 * Sign in with Google (popup flow)
 */
export function loginWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

/**
 * Sign the current user out
 */
export function logoutUser() {
  return signOut(auth);
}

/**
 * Get the currently authenticated user (or null)
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Remember which room an account last used, so it auto-reconnects on any device
 */
export async function rememberUserRoom(uid, roomId) {
  if (!uid || !roomId) return;
  try {
    await set(ref(db, `users/${uid}/lastRoom`), roomId);
  } catch (err) {
    console.warn("Could not remember user room:", err);
  }
}

/**
 * Forget the room an account last used (e.g. when the user leaves a room)
 */
export async function clearUserRoom(uid) {
  if (!uid) return;
  try {
    await remove(ref(db, `users/${uid}/lastRoom`));
  } catch (err) {
    console.warn("Could not clear user room:", err);
  }
}

/**
 * Look up the room an account last used
 * @returns {Promise<string|null>}
 */
export async function getUserRoom(uid) {
  if (!uid) return null;
  try {
    const snap = await get(ref(db, `users/${uid}/lastRoom`));
    return snap.exists() ? snap.val() : null;
  } catch (err) {
    console.warn("Could not read user room:", err);
    return null;
  }
}

/**
 * Connect to a specific room in Firebase Realtime Database
 * @param {string} roomId 
 * @param {function} onUpdateCallback Callback triggered when room data changes
 */
export function connectToRoomDb(roomId, onUpdateCallback) {
  const roomRef = ref(db, `rooms/${roomId}`);
  
  // Clean up previous listener if any
  if (currentOnValueUnsubscribe) {
    // onValue doesn't return an unsubscribe function in standard Web SDK, 
    // but we can unsubscribe by calling it with off() or by managing it.
    // In Firebase SDK 9+, onValue returns an unsubscribe function!
    currentOnValueUnsubscribe();
  }

  currentOnValueUnsubscribe = onValue(roomRef, (snapshot) => {
    const data = snapshot.val();
    onUpdateCallback(data);
  });

  return roomRef;
}

/**
 * Look up room ID associated with a user in the directory
 * @param {string} username 
 * @returns {Promise<string|null>}
 */
export async function lookupUserRoom(username) {
  const cleanUsername = username.trim().toUpperCase();
  if (!cleanUsername) return null;
  
  const userDirRef = ref(db, `directory/${cleanUsername}`);
  const snapshot = await get(userDirRef);
  if (snapshot.exists()) {
    return snapshot.val();
  }
  return null;
}

/**
 * Save store data to the cloud under the current room
 * Also maps user names to the room ID in the directory
 * @param {string} roomId 
 * @param {object} store 
 * @returns {Promise<void>}
 */
export async function saveToCloudDb(roomId, store) {
  if (!roomId) return;
  const roomRef = ref(db, `rooms/${roomId}`);
  
  // Save room state
  await set(roomRef, store);
  
  // Register active users in the directory
  if (store.config && store.config.users) {
    const promises = store.config.users.map(u => {
      const nameKey = u.name.trim().toUpperCase();
      if (nameKey) {
        return set(ref(db, `directory/${nameKey}`), roomId).catch(err => {
          console.warn(`Could not register directory entry for ${nameKey}:`, err);
        });
      }
      return Promise.resolve();
    });
    await Promise.all(promises);
  }
}

/**
 * Rename/migrate a room by copying data and deleting the old room
 * @param {string} oldRoomId 
 * @param {string} newRoomId 
 * @param {object} storeData 
 * @returns {Promise<void>}
 */
export async function renameRoomDb(oldRoomId, newRoomId, storeData) {
  const newRoomRef = ref(db, `rooms/${newRoomId}`);
  const oldRoomRef = ref(db, `rooms/${oldRoomId}`);
  
  // Set new data
  await set(newRoomRef, storeData);
  
  // Remove old database node
  await remove(oldRoomRef);
  
  // Register directory mappings for the new room
  if (storeData.config && storeData.config.users) {
    const promises = storeData.config.users.map(u => {
      const nameKey = u.name.trim().toUpperCase();
      if (nameKey) {
        return set(ref(db, `directory/${nameKey}`), newRoomId).catch(e => e);
      }
      return Promise.resolve();
    });
    await Promise.all(promises);
  }
}
