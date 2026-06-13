import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, update, onValue, get, push, child } from "firebase/database";
import { normalizeCode } from "./accessCodes";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "firebase/auth";

// Serve Google's auth handler from our OWN domain (same-origin) to avoid the
// "missing initial state" error caused by third-party storage partitioning in
// mobile/strict browsers. On the deployed site, /__/auth/* is proxied to the
// firebaseapp.com handler (see vercel.json). On localhost we fall back to the
// default Firebase auth domain.
const isLocalhost =
  typeof location !== 'undefined' &&
  (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

const firebaseConfig = {
  apiKey: "AIzaSyApvyKCKutdRUriczevl7m9QLXz9wYi4g4",
  authDomain: isLocalhost ? "productivity-tracker-70063.firebaseapp.com" : location.hostname,
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

// Product limits
//
// Room creation is gated by the user's "tier":
//   - free  -> can only JOIN rooms they are invited to (0 own rooms)
//   - pro   -> can create up to MAX_ROOMS_PRO rooms (unlocked by a trial code
//              or, in the future, a paid subscription)
// Owner accounts (the app admin) can create many rooms to hand out to friends.
export const MAX_ROOMS_FREE = 0;
export const MAX_ROOMS_PRO = 2;
export const MAX_ROOMS_OWNER = 50;
export const MAX_MEMBERS_PER_ROOM = 5;

// Kept for backwards compatibility with older imports.
export const MAX_ROOMS_PER_OWNER = MAX_ROOMS_PRO;

// Admin account(s): always treated as Pro so they can create/distribute rooms.
export const OWNER_EMAILS = ['anfarmac@gmail.com'];

/**
 * Is this email one of the app admins?
 */
export function isOwnerEmail(email) {
  return OWNER_EMAILS.includes((email || '').trim().toLowerCase());
}

let currentOnValueUnsubscribe = null;

/* ------------------------------------------------------------------ */
/* AUTHENTICATION (Google)                                            */
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

/* ------------------------------------------------------------------ */
/* ROOM MEMBERSHIP                                                    */
/*                                                                    */
/* Data model:                                                        */
/*   rooms/{roomId}/meta    = { name, ownerUid, ownerEmail, createdAt }*/
/*   rooms/{roomId}/members/{uid} = { email, name, role, joinedAt }   */
/*   rooms/{roomId}/store   = the tracker data (config, logs, ...)    */
/*   invites/{code}         = { roomId, roomName, createdBy }         */
/*   userRooms/{uid}/{roomId} = { name, role }  (index of my rooms)   */
/* ------------------------------------------------------------------ */

function defaultStore() {
  return {
    config: {
      users: [{ id: 'u1', name: 'Usuario 1', color: '#3b82f6', meta: 15, bank: 0 }],
      days: 6
    },
    lastActiveDate: '',
    bonusCounters: {},
    todayLog: [],
    history: [],
    pendingList: [],
    templates: [],
    shoppingList: []
  };
}

/**
 * Read the rooms a user belongs to, including live member counts.
 * @returns {Promise<Array<{roomId, name, role, memberCount}>>}
 */
export async function getUserRooms(uid) {
  if (!uid) return [];
  const snap = await get(ref(db, `userRooms/${uid}`));
  if (!snap.exists()) return [];

  const entries = snap.val();
  const rooms = [];
  for (const roomId of Object.keys(entries)) {
    const info = entries[roomId] || {};
    let memberCount;
    try {
      const mSnap = await get(ref(db, `rooms/${roomId}/members`));
      if (!mSnap.exists()) continue; // room was deleted
      memberCount = Object.keys(mSnap.val()).length;
    } catch (e) {
      // Can't read members => no longer a member (stale index entry). Skip.
      continue;
    }
    rooms.push({
      roomId,
      name: info.name || 'Sala',
      role: info.role || 'member',
      memberCount
    });
  }
  return rooms;
}

/**
 * Count how many rooms a user owns (for the create limit).
 */
export async function countOwnedRooms(uid) {
  const snap = await get(ref(db, `userRooms/${uid}`));
  if (!snap.exists()) return 0;
  const entries = snap.val();
  return Object.values(entries).filter(r => r && r.role === 'owner').length;
}

/* ------------------------------------------------------------------ */
/* TIER (free / pro) & TRIAL CODES                                    */
/* ------------------------------------------------------------------ */

/**
 * Read a user's tier ('free' by default).
 */
export async function getUserTier(uid) {
  try {
    const snap = await get(ref(db, `users/${uid}/tier`));
    return snap.exists() ? snap.val() : 'free';
  } catch (e) {
    return 'free';
  }
}

/**
 * Is the user "Pro" (paid / redeemed a trial code / app admin)?
 */
export async function isProUser(user) {
  if (!user) return false;
  if (isOwnerEmail(user.email)) return true;
  const tier = await getUserTier(user.uid);
  return tier === 'pro';
}

/**
 * How many rooms is this user allowed to OWN.
 */
export async function getRoomAllowance(user) {
  if (!user) return MAX_ROOMS_FREE;
  if (isOwnerEmail(user.email)) return MAX_ROOMS_OWNER;
  const tier = await getUserTier(user.uid);
  return tier === 'pro' ? MAX_ROOMS_PRO : MAX_ROOMS_FREE;
}

/**
 * Redeem a trial access code -> upgrade to Pro.
 *
 * SECURITY: validation, single-use claiming and the tier upgrade all happen
 * SERVER-SIDE in /api/redeem (using the Admin SDK). The browser can no longer
 * set its own tier, and the list of valid codes never ships in the bundle.
 *
 * Throws:
 *   err.code === 'code/invalid' -> not a real code
 *   err.code === 'code/used'    -> already redeemed by someone else
 */
export async function redeemAccessCode(rawCode, user) {
  if (!user) throw new Error('No autenticado');
  const code = normalizeCode(rawCode);
  if (!code) {
    const err = new Error('invalid-code');
    err.code = 'code/invalid';
    throw err;
  }

  const token = await user.getIdToken();
  const res = await fetch('/api/redeem', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ code })
  });

  let data = {};
  try { data = await res.json(); } catch { /* ignore */ }

  if (!res.ok) {
    // The server returns 'code/invalid' or 'code/used' so the UI can react.
    const err = new Error(data.error || 'redeem-failed');
    err.code = data.error || 'code/invalid';
    throw err;
  }

  return true;
}

/**
 * Create a brand new room owned by the given user.
 * Enforces the per-owner room limit.
 * @returns {Promise<string>} the new room id
 */
export async function createRoom(user, name) {
  const cleanName = (name || '').trim() || 'Mi Sala';

  const allowance = await getRoomAllowance(user);
  const owned = await countOwnedRooms(user.uid);
  if (owned >= allowance) {
    const err = new Error('room-limit');
    // allowance 0 means the user needs Pro (a code or subscription) to create
    // any room at all; otherwise they simply hit their cap.
    err.code = allowance === 0 ? 'limit/needPro' : 'limit/rooms';
    throw err;
  }

  const roomId = push(child(ref(db), 'rooms')).key;
  const displayName = user.displayName || user.email || 'Usuario';

  const updates = {};
  updates[`rooms/${roomId}/meta`] = {
    name: cleanName,
    ownerUid: user.uid,
    ownerEmail: user.email || '',
    createdAt: Date.now()
  };
  updates[`rooms/${roomId}/members/${user.uid}`] = {
    email: user.email || '',
    name: displayName,
    role: 'owner',
    joinedAt: Date.now()
  };
  updates[`rooms/${roomId}/store`] = defaultStore();
  updates[`userRooms/${user.uid}/${roomId}`] = { name: cleanName, role: 'owner' };

  await update(ref(db), updates);
  return roomId;
}

/**
 * Get a room's metadata.
 */
export async function getRoomMeta(roomId) {
  const snap = await get(ref(db, `rooms/${roomId}/meta`));
  return snap.exists() ? snap.val() : null;
}

/**
 * Subscribe to a room's member list (live).
 * @returns {function} Unsubscribe function
 */
export function observeRoomMembers(roomId, callback) {
  const membersRef = ref(db, `rooms/${roomId}/members`);
  return onValue(membersRef, (snapshot) => {
    const val = snapshot.val() || {};
    const list = Object.keys(val).map(uid => ({ uid, ...val[uid] }));
    callback(list);
  });
}

/**
 * Generate a short invite code for a room.
 */
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create an invitation to a room. Returns the invite code.
 */
export async function createInvite(roomId, user) {
  const meta = await getRoomMeta(roomId);
  const code = generateInviteCode();
  await set(ref(db, `invites/${code}`), {
    roomId,
    roomName: meta ? meta.name : 'Sala',
    createdBy: user ? user.uid : '',
    createdAt: Date.now()
  });
  return code;
}

/**
 * Read an invitation by code.
 * @returns {Promise<{roomId, roomName}|null>}
 */
export async function getInvite(code) {
  if (!code) return null;
  const snap = await get(ref(db, `invites/${code.trim().toUpperCase()}`));
  return snap.exists() ? snap.val() : null;
}

/**
 * Accept an invitation: add the user to the room as a member.
 * Enforces the per-room member limit.
 * @returns {Promise<string>} the joined room id
 */
export async function acceptInvite(code, user) {
  const invite = await getInvite(code);
  if (!invite || !invite.roomId) {
    const err = new Error('invalid-invite');
    err.code = 'invite/invalid';
    throw err;
  }

  const roomId = invite.roomId;

  // If already a member, don't overwrite the role (e.g. owner re-opening
  // their own invite link). Non-members can't read this node, so a denied
  // read simply means "not a member yet" → proceed to join.
  try {
    const memberSnap = await get(ref(db, `rooms/${roomId}/members/${user.uid}`));
    if (memberSnap.exists()) {
      return roomId;
    }
  } catch (e) {
    // Not a member yet — continue.
  }

  const displayName = user.displayName || user.email || 'Usuario';
  const updates = {};
  updates[`rooms/${roomId}/members/${user.uid}`] = {
    email: user.email || '',
    name: displayName,
    role: 'member',
    joinedAt: Date.now()
  };
  updates[`userRooms/${user.uid}/${roomId}`] = {
    name: invite.roomName || 'Sala',
    role: 'member'
  };

  try {
    await update(ref(db), updates);
  } catch (e) {
    // The member-cap is enforced by security rules; a denied write here
    // almost always means the room is already full.
    const err = new Error('join-failed');
    err.code = 'limit/members';
    throw err;
  }
  return roomId;
}

/**
 * Remove a member from a room (owner action) or leave a room (self).
 */
export async function removeMember(roomId, uid) {
  const updates = {};
  updates[`rooms/${roomId}/members/${uid}`] = null;
  updates[`userRooms/${uid}/${roomId}`] = null;
  await update(ref(db), updates);
}

/**
 * Delete an entire room and all its membership references (owner only).
 */
export async function deleteRoom(roomId) {
  const membersSnap = await get(ref(db, `rooms/${roomId}/members`));
  const updates = {};
  if (membersSnap.exists()) {
    Object.keys(membersSnap.val()).forEach(uid => {
      updates[`userRooms/${uid}/${roomId}`] = null;
    });
  }
  updates[`rooms/${roomId}`] = null;
  await update(ref(db), updates);
}

/**
 * Rename a room (updates the friendly name in meta + each member's index).
 */
export async function renameRoom(roomId, newName) {
  const cleanName = (newName || '').trim();
  if (!cleanName) return;
  const membersSnap = await get(ref(db, `rooms/${roomId}/members`));
  const updates = {};
  updates[`rooms/${roomId}/meta/name`] = cleanName;
  if (membersSnap.exists()) {
    Object.keys(membersSnap.val()).forEach(uid => {
      updates[`userRooms/${uid}/${roomId}/name`] = cleanName;
    });
  }
  await update(ref(db), updates);
}

/* ------------------------------------------------------------------ */
/* ROOM TRACKER DATA (store)                                          */
/* ------------------------------------------------------------------ */

/**
 * Connect to a room's tracker store and listen for live updates.
 * @param {string} roomId
 * @param {function} onUpdateCallback Receives the store object (or null)
 */
export function connectToRoomDb(roomId, onUpdateCallback) {
  const storeRef = ref(db, `rooms/${roomId}/store`);

  // Clean up previous listener if any
  if (currentOnValueUnsubscribe) {
    currentOnValueUnsubscribe();
  }

  currentOnValueUnsubscribe = onValue(storeRef, (snapshot) => {
    const data = snapshot.val();
    onUpdateCallback(data);
  });

  return storeRef;
}

/**
 * Stop listening to the current room's store.
 */
export function disconnectRoomDb() {
  if (currentOnValueUnsubscribe) {
    currentOnValueUnsubscribe();
    currentOnValueUnsubscribe = null;
  }
}

/**
 * Save the tracker store under a room.
 */
export async function saveToCloudDb(roomId, store) {
  if (!roomId) return;
  await set(ref(db, `rooms/${roomId}/store`), store);
}
