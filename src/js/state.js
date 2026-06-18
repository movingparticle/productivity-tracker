import { saveToCloudDb } from "./firebase";

// Color Palette for new users
export const COLORS = ['#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#a855f7', '#f97316', '#14b8a6'];

export let currentRoomId = localStorage.getItem('prodTrackerRoom') || null;
export let currentRoomName = localStorage.getItem('prodTrackerRoomName') || 'la Sala';
export let localProfileId = localStorage.getItem('localProfileId') || null;

// Priority weights used to rank pending tasks by urgency.
export const PRIORITY_ORDER = { alta: 3, media: 2, baja: 1 };

// Guard: blocks any write to the cloud until the room's real data has been
// loaded from Firebase. Without this, the default in-memory store (or the
// clock's daily-rollover check) overwrites real cloud data on startup,
// wiping out users, routines and tasks.
let roomDataLoaded = false;

function makeEmptyStore() {
  return {
    config: {
      users: [{ id: 'u1', name: 'User 1', color: '#3b82f6', meta: 15, bank: 0 }],
      days: 6
    },
    lastActiveDate: '',
    bonusCounters: {},
    todayLog: [],
    history: [],
    weekLog: [],
    pendingList: [],
    templates: [],
    roadmaps: {},
    shoppingList: [],
    savedShoppingLists: [],
    roadmapHistory: []
  };
}

export let store = makeEmptyStore();

/** Call before connecting to a new room so stale data from the previous room
 *  is never visible in the UI even for a single render frame. */
export function resetRoomState() {
  store = makeEmptyStore();
  roomDataLoaded = false;
}

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

  // Firebase has given us an authoritative answer for this room (real data,
  // or null meaning the room is brand new). It is now safe to persist changes.
  roomDataLoaded = true;

  if (newState) {
    // Start from a clean slate so previous room's data never bleeds in.
    store = { ...makeEmptyStore(), ...newState };
    
    // Ensure all critical arrays exist
    ['todayLog', 'history', 'weekLog', 'pendingList', 'templates', 'roadmapHistory', 'shoppingList', 'savedShoppingLists'].forEach(k => {
      if (!Array.isArray(store[k])) store[k] = [];
    });
    
    // Ensure roadmaps exists as an object
    if (!store.roadmaps || typeof store.roadmaps !== 'object') {
      store.roadmaps = {};
    }
    
    // Ensure config exists
    if (!store.config) {
      store.config = { 
        users: [{ id: 'u1', name: 'User 1', color: '#3b82f6', meta: 15, bank: 0 }],
        days: 6,
        treeDifficulty: 'medio'
      };
    }
    if (!store.config.treeDifficulty) {
      store.config.treeDifficulty = 'medio';
    }
    
    // Check/sync local profile
    if (!localProfileId || !store.config.users.find(u => u.id === localProfileId)) {
      localProfileId = store.config.users[0].id;
      localStorage.setItem('localProfileId', localProfileId);
    }

    // Migrate older pending tasks so they have a priority + creation date
    // (needed for the urgency/priority feature). Persist once if anything
    // was missing.
    let migrated = false;
    (store.pendingList || []).forEach(t => {
      if (!t.priority) { t.priority = 'media'; migrated = true; }
      if (!t.createdAt) { t.createdAt = Date.now(); migrated = true; }
    });

    // Ensure persistentTags exists as an array
    if (!Array.isArray(store.persistentTags)) {
      store.persistentTags = [];
      const tagMap = new Map();
      const gather = (t) => {
        const trimmed = (t || '').trim();
        if (!trimmed) return;
        const lower = trimmed.toLowerCase();
        if (!tagMap.has(lower)) {
          tagMap.set(lower, trimmed);
        } else {
          const existing = tagMap.get(lower);
          if (trimmed[0] === trimmed[0].toUpperCase() && existing[0] !== existing[0].toUpperCase()) {
            tagMap.set(lower, trimmed);
          }
        }
      };
      if (store.shoppingList) {
        store.shoppingList.forEach(it => {
          if (Array.isArray(it.tags)) it.tags.forEach(gather);
        });
      }
      if (store.savedShoppingLists) {
        store.savedShoppingLists.forEach(list => {
          if (Array.isArray(list.items)) {
            list.items.forEach(it => {
              if (Array.isArray(it.tags)) it.tags.forEach(gather);
            });
          }
        });
      }
      store.persistentTags = [...tagMap.values()];
      migrated = true;
    }

    // Check for day change
    checkDateAutoClose();

    if (migrated) saveState();
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
  // Never write before the initial cloud snapshot has arrived, otherwise we
  // could overwrite real data with the default in-memory store.
  if (!roomDataLoaded) return;
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
  
  // Weekly reset check on Mondays: clear weekly history + weekLog
  if (now.getDay() === 1 && store.history && store.history.length > 0) {
    store.history = [];
    store.weekLog = [];
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

      // Archive each individual task entry into weekLog (drives weekly report)
      if (!store.weekLog) store.weekLog = [];
      store.todayLog.forEach(x => {
        store.weekLog.push({
          date: store.lastActiveDate,
          who: x.who,
          name: x.name,
          pts: Number(x.pts) || 0
        });
      });
      // Cap at 1000 entries to avoid bloat
      if (store.weekLog.length > 1000) store.weekLog = store.weekLog.slice(-1000);
    }

    // Weekly reset check double check
    if (now.getDay() === 1) {
      store.history = [];
      store.weekLog = [];
    }

    // Archive daily roadmaps to history before clearing
    if (!store.roadmapHistory) store.roadmapHistory = [];
    Object.keys(store.roadmaps || {}).forEach(uId => {
      const plan = store.roadmaps[uId];
      if (plan && plan.items && plan.items.length > 0) {
        store.roadmapHistory.push({
          date: store.lastActiveDate, // archive under the day that just ended
          userId: uId,
          items: plan.items
        });
      }
    });
    // Keep last 100 historical entries
    if (store.roadmapHistory.length > 100) {
      store.roadmapHistory = store.roadmapHistory.slice(-100);
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
 * Adds or updates a pending task.
 * Tasks carry a priority ('alta' | 'media' | 'baja') and a createdAt timestamp
 * so the UI can rank them by urgency (priority + how long they've been waiting).
 */
export function savePendingTask(name, pts, priority, editIndexStr, imageBase64 = null, desc = "", deadline = "", shopItems = []) {
  const ptsNum = Number(pts) || 5;
  const prio = PRIORITY_ORDER[priority] ? priority : 'media';
  if (editIndexStr !== "") {
    const idx = parseInt(editIndexStr);
    if (store.pendingList[idx]) {
      const existing = store.pendingList[idx];
      store.pendingList[idx] = {
        name,
        pts: ptsNum,
        priority: prio,
        createdAt: existing.createdAt || Date.now(),
        image: imageBase64 !== null ? imageBase64 : (existing.image || null),
        desc: desc || "",
        deadline: deadline || "",
        shopItems: Array.isArray(shopItems) ? shopItems : []
      };
    }
  } else {
    store.pendingList.push({
      name,
      pts: ptsNum,
      priority: prio,
      createdAt: Date.now(),
      image: imageBase64 || null,
      desc: desc || "",
      deadline: deadline || "",
      shopItems: Array.isArray(shopItems) ? shopItems : []
    });
  }
  saveState();
}

/**
 * Compute an urgency score for a pending task. Higher = more urgent.
 * Combines its priority with how many days it has been waiting.
 */
export function taskUrgencyScore(task) {
  const weight = PRIORITY_ORDER[task.priority] || PRIORITY_ORDER.media;
  const created = Number(task.createdAt) || Date.now();
  const ageDays = Math.floor((Date.now() - created) / 86400000);
  return weight * 1000 + ageDays;
}

/**
 * Days a task has been waiting since it was created.
 */
export function taskAgeDays(task) {
  const created = Number(task.createdAt) || Date.now();
  return Math.floor((Date.now() - created) / 86400000);
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

  // Sync with roadmap items: if there is a pending roadmap item with matching name, mark it completed!
  const plan = store.roadmaps && store.roadmaps[localProfileId];
  if (plan && Array.isArray(plan.items)) {
    const matchingRoadmapItem = plan.items.find(it => it.type === 'pending' && !it.completed && it.text.trim().toLowerCase() === task.name.trim().toLowerCase());
    if (matchingRoadmapItem) {
      matchingRoadmapItem.completed = true;
      matchingRoadmapItem.completedAt = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
  }

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
  addLogEntry("Ahorro Usado", val);
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
    weekLog: [],
    pendingList: [],
    templates: [],
    roadmaps: {},
    roadmapHistory: []
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
  store.weekLog = [];
  store.todayLog = [];
  store.roadmaps = {};
  store.roadmapHistory = [];
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
  // New connection: wait for its fresh snapshot before allowing any writes.
  roomDataLoaded = false;
}

/**
 * Remember the human-readable name of the current room (used in Shopping, etc).
 */
export function setCurrentRoomName(name) {
  currentRoomName = (name || '').trim() || 'la Sala';
  localStorage.setItem('prodTrackerRoomName', currentRoomName);
}

/**
 * Add an item to the current profile's daily roadmap
 */
export function addRoadmapItem(text, type, pts = 0) {
  if (!localProfileId) return;
  if (!store.roadmaps) store.roadmaps = {};
  if (!store.roadmaps[localProfileId]) {
    store.roadmaps[localProfileId] = { items: [] };
  }
  if (!Array.isArray(store.roadmaps[localProfileId].items)) {
    store.roadmaps[localProfileId].items = [];
  }
  store.roadmaps[localProfileId].items.push({
    id: 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    text,
    type,
    pts: Number(pts),
    completed: false
  });
  saveState();
}

/**
 * Reorder the current profile's roadmap items to match a new order of ids.
 * Any item not present in orderedIds is appended (safety).
 */
export function reorderRoadmapItems(orderedIds) {
  if (!localProfileId || !store.roadmaps || !store.roadmaps[localProfileId]) return;
  const items = store.roadmaps[localProfileId].items || [];
  if (!Array.isArray(items) || items.length === 0) return;

  const byId = new Map(items.map(it => [it.id, it]));
  const reordered = [];
  orderedIds.forEach(id => {
    if (byId.has(id)) {
      reordered.push(byId.get(id));
      byId.delete(id);
    }
  });
  byId.forEach(it => reordered.push(it)); // append leftovers

  store.roadmaps[localProfileId].items = reordered;
  saveState();
}

/**
 * Toggle completion of a roadmap item
 */
export function toggleRoadmapItem(itemId) {
  if (!localProfileId || !store.roadmaps || !store.roadmaps[localProfileId]) return;
  const items = store.roadmaps[localProfileId].items || [];
  const item = items.find(x => x.id === itemId);
  if (item) {
    item.completed = !item.completed;
    if (item.completed) {
      item.completedAt = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      addLogEntry(item.text, item.pts || 0);

      // Auto-complete matching pending task
      if (item.type === 'pending') {
        const tIndex = store.pendingList.findIndex(t => t.name.trim().toLowerCase() === item.text.trim().toLowerCase());
        if (tIndex !== -1) {
          store.pendingList.splice(tIndex, 1);
          if (!store.bonusCounters) store.bonusCounters = {};
          if (!store.bonusCounters[localProfileId]) store.bonusCounters[localProfileId] = 0;
          store.bonusCounters[localProfileId]++;
          if (store.bonusCounters[localProfileId] >= 3) {
            store.bonusCounters[localProfileId] = 0;
            addLogEntry("BONO Racha", 1);
          }
        }
      }
    } else {
      delete item.completedAt;
      if (store.todayLog) {
        for (let i = store.todayLog.length - 1; i >= 0; i--) {
          if (store.todayLog[i].who === localProfileId && store.todayLog[i].name === item.text) {
            store.todayLog.splice(i, 1);
            break;
          }
        }
      }
    }
    saveState();
  }
}

/**
 * Delete a roadmap item
 */
export function deleteRoadmapItem(itemId) {
  if (!localProfileId || !store.roadmaps || !store.roadmaps[localProfileId]) return;
  const items = store.roadmaps[localProfileId].items || [];
  store.roadmaps[localProfileId].items = items.filter(x => x.id !== itemId);
  saveState();
}

/**
 * Lock the current daily roadmap
 */
export function lockRoadmap() {
  if (!localProfileId) return;
  if (!store.roadmaps) store.roadmaps = {};
  if (!store.roadmaps[localProfileId]) {
    store.roadmaps[localProfileId] = { items: [] };
  }
  store.roadmaps[localProfileId].locked = true;
  saveState();
}

/**
 * Unlock the current daily roadmap
 */
export function unlockRoadmap() {
  if (!localProfileId || !store.roadmaps || !store.roadmaps[localProfileId]) return;
  store.roadmaps[localProfileId].locked = false;
  saveState();
}

/**
 * Set the difficulty level of the focus tree
 */
export function setTreeDifficulty(level) {
  if (!store.config) store.config = {};
  store.config.treeDifficulty = level;
  saveState();
}

export function normalizeTags(tagsArray) {
  if (!tagsArray) return [];
  const normalized = [];
  tagsArray.forEach(tag => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    const existing = (store.persistentTags || []).find(t => t.toLowerCase() === trimmed.toLowerCase());
    const finalTag = existing || trimmed;
    if (!normalized.some(t => t.toLowerCase() === finalTag.toLowerCase())) {
      normalized.push(finalTag);
    }
  });
  return normalized;
}

export function addPersistentTags(tagsArray, skipSave = false) {
  if (!store.persistentTags) store.persistentTags = [];
  let changed = false;
  (tagsArray || []).forEach(tag => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    const exists = store.persistentTags.some(t => t.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      store.persistentTags.push(trimmed);
      changed = true;
    }
  });
  if (changed && !skipSave) {
    saveState();
  }
  return changed;
}

/**
 * Adds a new item to the shopping list.
 * Shopping items no longer use points. The name is optional when there is a
 * photo (e.g. the user just snaps a picture of what's needed).
 */
export function saveShoppingItem(name, qty, assignedTo, imageBase64, tags) {
  if (!store.shoppingList) store.shoppingList = [];
  
  let finalTags = Array.isArray(tags) ? [...tags] : [];
  let cleanName = name || '';
  const tagMatches = [...cleanName.matchAll(/#([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_]+)/g)];
  if (tagMatches.length > 0) {
    tagMatches.forEach(m => {
      const t = m[1];
      if (!finalTags.some(ft => ft.toLowerCase() === t.toLowerCase())) finalTags.push(t);
    });
    cleanName = cleanName.replace(/#([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_]+)/g, '').trim();
  }

  finalTags = normalizeTags(finalTags);
  if (finalTags.length > 0) {
    addPersistentTags(finalTags, true);
  }

  store.shoppingList.push({
    id: 'shop_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    name: cleanName.trim().slice(0, 80),
    qty: (qty || '').trim(),
    assignedTo: assignedTo || "casa",
    addedBy: localProfileId,
    image: imageBase64 || null,
    dateAdded: new Date().toISOString(),
    tags: finalTags
  });
  saveState();
}

/**
 * Add many shopping items at once from a list of { name, qty, tags } objects.
 * Used by the bulk text box and the "fix list with AI" feature.
 */
export function saveShoppingItemsBulk(items, assignedTo) {
  if (!store.shoppingList) store.shoppingList = [];
  let count = 0;
  const allTags = [];
  (items || []).forEach((it, i) => {
    let cleanName = (it.name || '').trim();
    if (!cleanName) return;

    let finalTags = Array.isArray(it.tags) ? [...it.tags] : [];
    const tagMatches = [...cleanName.matchAll(/#([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_]+)/g)];
    if (tagMatches.length > 0) {
      tagMatches.forEach(m => {
        const t = m[1];
        if (!finalTags.some(ft => ft.toLowerCase() === t.toLowerCase())) finalTags.push(t);
      });
      cleanName = cleanName.replace(/#([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_]+)/g, '').trim();
    }

    finalTags = normalizeTags(finalTags);
    finalTags.forEach(t => allTags.push(t));

    store.shoppingList.push({
      id: 'shop_' + Date.now() + '_' + i + '_' + Math.floor(Math.random() * 1000),
      name: cleanName.trim().slice(0, 80),
      qty: (it.qty || '').trim(),
      assignedTo: assignedTo || 'casa',
      addedBy: localProfileId,
      image: it.image || null,
      dateAdded: new Date().toISOString(),
      tags: finalTags
    });
    count++;
  });
  if (allTags.length > 0) {
    addPersistentTags(allTags, true);
  }
  if (count > 0) saveState();
  return count;
}

/**
 * Deletes a shopping item by its unique ID
 */
export function deleteShoppingItem(id) {
  if (!store.shoppingList) return;
  store.shoppingList = store.shoppingList.filter(x => x.id !== id);
  saveState();
}

/**
 * Marks a shopping item as bought by its unique ID (just removes it from the list —
 * shopping items no longer award points).
 */
export function buyShoppingItem(id) {
  if (!store.shoppingList) return;
  store.shoppingList = store.shoppingList.filter(x => x.id !== id);
  saveState();
}

/* ------------------------------------------------------------------ */
/* WEEKLY AGGREGATION HELPERS                                         */
/* ------------------------------------------------------------------ */

/**
 * All task entries for a user this week: weekLog (past days) + todayLog (today).
 * userId = null → all users combined.
 */
export function getWeekEntries(userId) {
  const past = (store.weekLog || []).filter(x => !userId || x.who === userId);
  const today = (store.todayLog || [])
    .filter(x => !userId || x.who === userId)
    .map(x => ({ date: store.lastActiveDate, who: x.who, name: x.name, pts: Number(x.pts) || 0 }));
  return [...past, ...today];
}

/**
 * Per-task aggregates for the week.
 * Returns array of { name, count, totalPts, maxSingle } sorted by totalPts desc.
 */
export function getWeekTaskAggregates(userId) {
  const entries = getWeekEntries(userId);
  const map = new Map();
  entries.forEach(x => {
    const key = x.name.toLowerCase().trim();
    if (!map.has(key)) map.set(key, { name: x.name, count: 0, totalPts: 0, maxSingle: 0 });
    const r = map.get(key);
    r.count++;
    r.totalPts += x.pts;
    if (x.pts > r.maxSingle) r.maxSingle = x.pts;
  });
  return [...map.values()].sort((a, b) => b.totalPts - a.totalPts);
}

/**
 * Points per calendar day this week (Mon–Sun).
 * Returns array of { dateStr, label, pts } for each day that has data,
 * plus today's partial if it has data.
 */
export function getWeekDailyTotals(userId) {
  const entries = getWeekEntries(userId);
  const map = new Map();
  entries.forEach(x => {
    const d = x.date || '';
    if (!map.has(d)) map.set(d, 0);
    map.set(d, map.get(d) + x.pts);
  });

  const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return [...map.entries()]
    .map(([dateStr, pts]) => {
      const d = new Date(dateStr);
      const label = isNaN(d.getTime()) ? dateStr : DAY_LABELS[d.getDay()];
      return { dateStr, label, pts };
    })
    .sort((a, b) => new Date(a.dateStr) - new Date(b.dateStr));
}

/**
 * High-level summary for a user (or the whole sala if userId is null).
 * Returns { totalPts, avgPtsPerDay, daysActive, daysGoalMet, streak }.
 */
export function getWeekSummary(userId) {
  const dailyTotals = getWeekDailyTotals(userId);

  // For goal-met checks we need per-user meta; for sala-wide we average metas
  const users = store.config.users || [];
  const getGoal = (uid) => {
    if (uid) {
      const u = users.find(u => u.id === uid);
      return u ? (Number(u.meta) || 15) : 15;
    }
    // sala-wide: average of all user metas
    if (!users.length) return 15;
    return users.reduce((s, u) => s + (Number(u.meta) || 15), 0) / users.length;
  };
  const goal = getGoal(userId);

  const daysActive = dailyTotals.length;
  const totalPts = dailyTotals.reduce((s, d) => s + d.pts, 0);
  const avgPtsPerDay = daysActive ? Math.round(totalPts / daysActive) : 0;
  const daysGoalMet = dailyTotals.filter(d => d.pts >= goal).length;

  // Streak: consecutive days ending today where goal was met
  let streak = 0;
  const sorted = [...dailyTotals].sort((a, b) => new Date(b.dateStr) - new Date(a.dateStr));
  for (const d of sorted) {
    if (d.pts >= goal) streak++;
    else break;
  }

  return { totalPts, avgPtsPerDay, daysActive, daysGoalMet, streak };
}

/* ------------------------------------------------------------------ */
/* SAVED SHOPPING LISTS (REGULARS)                                    */
/* ------------------------------------------------------------------ */

const MAX_SAVED_LISTS = 10;

export function getSavedShoppingLists() {
  if (!Array.isArray(store.savedShoppingLists)) store.savedShoppingLists = [];
  return store.savedShoppingLists;
}

export function createSavedShoppingList(name) {
  if (!Array.isArray(store.savedShoppingLists)) store.savedShoppingLists = [];
  if (store.savedShoppingLists.length >= MAX_SAVED_LISTS) return null;
  const list = {
    id: 'sl_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    name: (name || 'Mi lista').trim().slice(0, 40),
    items: []
  };
  store.savedShoppingLists.push(list);
  saveState();
  return list;
}

export function renameSavedShoppingList(listId, newName) {
  const list = (store.savedShoppingLists || []).find(l => l.id === listId);
  if (!list) return;
  list.name = (newName || '').trim().slice(0, 40) || list.name;
  saveState();
}

export function deleteSavedShoppingList(listId) {
  if (!Array.isArray(store.savedShoppingLists)) return;
  store.savedShoppingLists = store.savedShoppingLists.filter(l => l.id !== listId);
  saveState();
}

export function addItemToSavedList(listId, name, qty, tags, image) {
  const list = (store.savedShoppingLists || []).find(l => l.id === listId);
  if (!list) return;
  if (!Array.isArray(list.items)) list.items = [];
  
  let finalTags = Array.isArray(tags) ? tags : [];
  finalTags = normalizeTags(finalTags);
  if (finalTags.length > 0) {
    addPersistentTags(finalTags, true);
  }

  list.items.push({
    id: 'sli_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    name: (name || '').trim().slice(0, 80),
    qty: (qty || '').trim(),
    tags: finalTags,
    image: image || null
  });
  saveState();
}

export function removeItemFromSavedList(listId, itemId) {
  const list = (store.savedShoppingLists || []).find(l => l.id === listId);
  if (!list || !Array.isArray(list.items)) return;
  list.items = list.items.filter(i => i.id !== itemId);
  saveState();
}

export function updateItemInSavedList(listId, itemId, name, qty, tags, image) {
  const list = (store.savedShoppingLists || []).find(l => l.id === listId);
  if (!list || !Array.isArray(list.items)) return;
  const item = list.items.find(i => i.id === itemId);
  if (!item) return;
  
  let finalTags = Array.isArray(tags) ? tags : [];
  finalTags = normalizeTags(finalTags);
  if (finalTags.length > 0) {
    addPersistentTags(finalTags, true);
  }

  item.name = (name || '').trim().slice(0, 80);
  item.qty = (qty || '').trim();
  item.tags = finalTags;
  item.image = image || null;
  saveState();
}

export function replaceSavedListItems(listId, newItems) {
  const list = (store.savedShoppingLists || []).find(l => l.id === listId);
  if (!list) return;
  
  const allTags = [];
  list.items = (newItems || []).map((it, i) => {
    let finalTags = Array.isArray(it.tags) ? it.tags : [];
    finalTags = normalizeTags(finalTags);
    finalTags.forEach(t => allTags.push(t));
    return {
      id: 'sli_' + Date.now() + '_' + i + '_' + Math.floor(Math.random() * 1000),
      name: (it.name || '').trim().slice(0, 80),
      qty: (it.qty || '').trim(),
      tags: finalTags,
      image: it.image || null
    };
  });
  
  if (allTags.length > 0) {
    addPersistentTags(allTags, true);
  }
  saveState();
}

/**
 * Add items from a saved list to the active shopping list.
 * selectedIds = null → add all; array of ids → add only those.
 */
export function addSavedListToShopping(listId, selectedIds, assignedTo) {
  const list = (store.savedShoppingLists || []).find(l => l.id === listId);
  if (!list || !Array.isArray(list.items)) return 0;
  const items = selectedIds
    ? list.items.filter(i => selectedIds.includes(i.id))
    : list.items;
  return saveShoppingItemsBulk(items.map(i => ({ name: i.name, qty: i.qty, tags: i.tags, image: i.image })), assignedTo || 'casa');
}

export function buildShareText(listId, filterTags = []) {
  const list = (store.savedShoppingLists || []).find(l => l.id === listId);
  if (!list) return '';
  let items = list.items || [];
  if (filterTags && filterTags.length > 0) {
    items = items.filter(it => (it.tags || []).some(t => filterTags.some(ft => ft.toLowerCase() === t.toLowerCase())));
  }
  if (items.length === 0) return '';
  const lines = items.map(i => {
    let line = `- ${i.name}`;
    if (i.qty) line += ` (${i.qty})`;
    if (i.tags && i.tags.length > 0) {
      line += ` ${i.tags.map(t => `#${t}`).join(' ')}`;
    }
    return line;
  });
  return `${list.name}\n${lines.join('\n')}`;
}

export function buildGeneralShareText(filterTags = []) {
  let list = store.shoppingList || [];
  if (filterTags && filterTags.length > 0) {
    list = list.filter(it => (it.tags || []).some(t => filterTags.some(ft => ft.toLowerCase() === t.toLowerCase())));
  }
  if (list.length === 0) return '';
  const roomName = currentRoomName || 'la Sala';
  const lines = list.map(i => {
    let name = i.name && i.name.trim() ? i.name.trim() : 'Artículo en foto';
    if (i.qty) name += ` (${i.qty.trim()})`;
    if (i.tags && i.tags.length > 0) {
      name += ` ${i.tags.map(t => `#${t}`).join(' ')}`;
    }
    return `- ${name}`;
  });
  return `Lista de Compras - ${roomName}\n${lines.join('\n')}`;
}

