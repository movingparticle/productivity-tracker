import { saveToCloudDb } from "./firebase";

// Color Palette for new users
export const COLORS = ['#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#a855f7', '#f97316', '#14b8a6'];

export let currentRoomId = localStorage.getItem('prodTrackerRoom') || null;
export let localProfileId = localStorage.getItem('localProfileId') || null;

export let store = {
  config: { 
    users: [{ id: 'u1', name: 'User 1', color: '#3b82f6', meta: 15, bank: 0 }], 
    days: 6 
  },
  lastActiveDate: '',
  bonusCounters: {},
  todayLog: [], 
  history: [], 
  pendingList: [], 
  templates: []
};

// UI Re-render callback registration
let uiRenderCallback = null;

export function registerUiRenderer(callback) {
  uiRenderCallback = callback;
}

export function triggerUiUpdate() {
  if (uiRenderCallback) {
    uiRenderCallback();
  }
}

/**
 * Initialize or update the state with new database snapshot
 */
export function setRoomState(roomId, newState) {
  currentRoomId = roomId;
  localStorage.setItem('prodTrackerRoom', roomId);

  if (newState) {
    store = { ...store, ...newState };
    
    // Ensure all critical arrays exist
    ['todayLog', 'history', 'pendingList', 'templates'].forEach(k => {
      if (!Array.isArray(store[k])) store[k] = [];
    });
    
    // Ensure config exists
    if (!store.config) {
      store.config = { 
        users: [{ id: 'u1', name: 'User 1', color: '#3b82f6', meta: 15, bank: 0 }],
        days: 6
      };
    }
    
    // Check/sync local profile
    if (!localProfileId || !store.config.users.find(u => u.id === localProfileId)) {
      localProfileId = store.config.users[0].id;
      localStorage.setItem('localProfileId', localProfileId);
    }
    
    // Check for day change
    checkDateAutoClose();
  } else {
    // If room is empty, save initial store to Firebase
    saveState();
  }
  
  triggerUiUpdate();
}

/**
 * Change local profile selection
 */
export function changeProfile(profileId) {
  if (store.config.users.find(u => u.id === profileId)) {
    localProfileId = profileId;
    localStorage.setItem('localProfileId', profileId);
    triggerUiUpdate();
  }
}

/**
 * Triggers saving the state object to Firebase Realtime Database
 */
export async function saveState() {
  if (currentRoomId) {
    await saveToCloudDb(currentRoomId, store);
  }
}

/**
 * Localized clock update handler and daily rollover checking logic
 */
export function checkDateAutoClose() {
  const now = new Date();
  const todayStr = now.toDateString();
  
  // Weekly reset check on Mondays: clear weekly history
  if (now.getDay() === 1 && store.history && store.history.length > 0) {
    store.history = [];
    saveState();
  }

  // Daily rollover check
  if (store.lastActiveDate && store.lastActiveDate !== todayStr) {
    const pointsMap = {};
    store.config.users.forEach(u => pointsMap[u.id] = 0);
    
    // Accumulate today's points
    store.todayLog.forEach(x => {
      if (pointsMap[x.who] !== undefined) pointsMap[x.who] += x.pts;
    });

    // Handle Surplus banking
    store.config.users.forEach(u => {
      const earned = Number(pointsMap[u.id]) || 0;
      const goal = Number(u.meta) || 15;
      const currentBank = Number(u.bank) || 0;

      if (earned > goal) {
        const surplus = earned - goal;
        u.bank = currentBank + surplus;
      }
    });

    // Save history
    const dObj = new Date(store.lastActiveDate);
    const niceDate = `${dObj.getDate().toString().padStart(2, '0')}/${(dObj.getMonth() + 1).toString().padStart(2, '0')}/${dObj.getFullYear()}`;
    
    if (store.todayLog.length > 0) {
      store.history.push({ date: niceDate, points: pointsMap });
    }

    // Weekly reset check double check
    if (now.getDay() === 1) {
      store.history = [];
    }

    // Clear daily arrays and update date marker
    store.todayLog = [];
    store.lastActiveDate = todayStr;
    store.bonusCounters = {};
    
    saveState();
  } else if (!store.lastActiveDate) {
    store.lastActiveDate = todayStr;
    saveState();
  }
}

/**
 * Logs points activity for the current profile
 */
export function addLogEntry(name, pts) {
  if (!localProfileId) return;
  const time = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  
  store.todayLog.push({
    id: Date.now(),
    who: localProfileId,
    name: name,
    pts: Number(pts),
    time: time
  });
  
  saveState();
}

/**
 * Deletes a logged activity
 */
export function deleteLogEntry(id) {
  store.todayLog = store.todayLog.filter(x => x.id !== id);
  saveState();
}

/**
 * Adds or updates a pending task
 */
export function savePendingTask(name, pts, editIndexStr) {
  const ptsNum = Number(pts) || 5;
  if (editIndexStr !== "") {
    const idx = parseInt(editIndexStr);
    if (store.pendingList[idx]) {
      store.pendingList[idx] = { name, pts: ptsNum };
    }
  } else {
    store.pendingList.push({ name, pts: ptsNum });
  }
  saveState();
}

/**
 * Deletes a pending task
 */
export function deletePendingTask(index) {
  store.pendingList.splice(index, 1);
  saveState();
}

/**
 * Completes a pending task, records the log and awards streaks bonuses
 */
export function completePendingTask(index, onBonusCallback) {
  const task = store.pendingList[index];
  if (!task || !localProfileId) return;

  // Remove from list
  store.pendingList.splice(index, 1);
  
  // Add activity log
  addLogEntry(task.name, task.pts);

  // Manage Streak logic (+1 pt after 3 tasks)
  if (!store.bonusCounters) store.bonusCounters = {};
  if (!store.bonusCounters[localProfileId]) store.bonusCounters[localProfileId] = 0;
  
  store.bonusCounters[localProfileId]++;
  
  if (store.bonusCounters[localProfileId] >= 3) {
    store.bonusCounters[localProfileId] = 0;
    // Delay slightly so UI updates task completion first
    setTimeout(() => {
      addLogEntry("BONO Racha", 1);
      saveState();
      if (onBonusCallback) onBonusCallback();
    }, 300);
  } else {
    saveState();
  }
}

/**
 * Withdraw saved points from the surplus bank
 */
export function redeemPointsFromBank(amount, onRedemptionSuccess, onRedemptionError) {
  const u = store.config.users.find(u => u.id === localProfileId);
  if (!u) return;
  
  const balance = u.bank || 0;
  
  // Calculate today's points
  let activePts = 0;
  store.todayLog.forEach(x => {
    if (x.who === localProfileId) activePts += x.pts;
  });
  
  if (activePts >= (u.meta || 15)) {
    if (onRedemptionError) onRedemptionError("¡Ya cumpliste tu meta de hoy! No gastes tus ahorros.");
    return;
  }
  
  if (balance <= 0) {
    if (onRedemptionError) onRedemptionError("No tienes puntos ahorrados.");
    return;
  }
  
  const val = parseInt(amount);
  if (isNaN(val) || val <= 0) {
    if (onRedemptionError) onRedemptionError("Ingresa una cantidad de puntos válida.");
    return;
  }
  
  if (val > balance) {
    if (onRedemptionError) onRedemptionError("No tienes suficientes puntos.");
    return;
  }
  
  u.bank = balance - val;
  addLogEntry("💎 Ahorro Usado", val);
  saveState();
  
  if (onRedemptionSuccess) onRedemptionSuccess(val);
}

/**
 * Add or update routine template
 */
export function saveTemplateItem(name, pts, editIndexStr) {
  const ptsNum = Number(pts) || 1;
  if (editIndexStr !== "") {
    const idx = parseInt(editIndexStr);
    if (store.templates[idx]) {
      store.templates[idx] = { name, pts: ptsNum };
    }
  } else {
    store.templates.push({ name, pts: ptsNum });
  }
  saveState();
}

/**
 * Delete routine template
 */
export function deleteTemplateItem(index) {
  store.templates.splice(index, 1);
  saveState();
}

/**
 * Triggers full data reset
 */
export function hardResetState() {
  store = {
    config: { users: [{ id: 'u1', name: 'User 1', color: '#3b82f6', meta: 15, bank: 0 }], days: 6 },
    lastActiveDate: new Date().toDateString(),
    bonusCounters: {},
    todayLog: [], 
    history: [], 
    pendingList: [], 
    templates: []
  };
  localProfileId = 'u1';
  localStorage.setItem('localProfileId', localProfileId);
  saveState();
}

/**
 * Triggers weekly history reset
 */
export function weeklyResetState() {
  store.history = [];
  store.todayLog = [];
  store.lastActiveDate = new Date().toDateString();
  store.bonusCounters = {};
  saveState();
}

/**
 * Set active profile selection manually
 */
export function setLocalProfileId(id) {
  localProfileId = id;
  localStorage.setItem('localProfileId', id);
  triggerUiUpdate();
}

/**
 * Set current room identifier manually
 */
export function setCurrentRoomId(id) {
  currentRoomId = id;
  localStorage.setItem('prodTrackerRoom', id);
}
