import * as state from "./src/js/state";
import * as ui from "./src/js/ui";
import { initI18n, applyLang, getLang, t as tr, plural } from "./src/js/i18n";
import {
  connectToRoomDb,
  disconnectRoomDb,
  observeAuthState,
  loginWithGoogle,
  logoutUser,
  getCurrentUser,
  createRoom,
  getUserRooms,
  getRoomMeta,
  observeRoomMembers,
  createInvite,
  acceptInvite,
  removeMember,
  deleteRoom,
  renameRoom,
  redeemAccessCode,
  isProUser,
  getRoomAllowance,
  MAX_ROOMS_PRO,
  MAX_MEMBERS_PER_ROOM
} from "./src/js/firebase";
import { askAssistant, fixShoppingListWithAI } from "./src/js/agent";

/* ------------------------------------------------------------------ */
/* GAME RULES (persisted in localStorage)                             */
/* ------------------------------------------------------------------ */

const DEFAULT_RULES = { streakEnabled: true, streakThreshold: 3, streakBonus: 1, urgencyDays: 3 };

function loadGameRules() {
  try {
    return { ...DEFAULT_RULES, ...JSON.parse(localStorage.getItem('gameRules') || '{}') };
  } catch { return { ...DEFAULT_RULES }; }
}

function saveGameRules(rules) {
  localStorage.setItem('gameRules', JSON.stringify(rules));
}

// Export so state/ui can read urgency days rule
export function getUrgencyDays() { return loadGameRules().urgencyDays; }

// Ensures the session only starts once per authenticated session
let appStarted = false;
// Current room context
let currentRoomMeta = null;
let currentIsOwner = false;
let currentMembersUnsub = null;

/**
 * Translate Firebase auth error codes into friendly Spanish messages.
 */
function authErrorMessage(error) {
  const code = error && error.code ? error.code : '';
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return tr('err.popup.closed');
    case 'auth/popup-blocked':
      return tr('err.popup.blocked');
    case 'auth/unauthorized-domain':
      return tr('err.domain');
    case 'auth/operation-not-allowed':
      return tr('err.not.allowed');
    case 'auth/network-request-failed':
      return tr('err.network');
    default:
      return tr('err.login');
  }
}

// Clock and rollover check loop
let clockInterval = null;
function updateClock() {
  const now = new Date();
  const options = {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  };
  const clockLocale = getLang() === 'en' ? 'en-US' : 'es-ES';
  const dateStr = now.toLocaleDateString(clockLocale, options);

  if (ui.elements.liveClockDisplay) {
    ui.elements.liveClockDisplay.innerText = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  }

  // Check if day rollover is needed
  state.checkDateAutoClose();
}

function startClock() {
  updateClock();
  if (clockInterval) clearInterval(clockInterval);
  clockInterval = setInterval(updateClock, 1000);
}

/* ------------------------------------------------------------------ */
/* ROOM CONNECTION                                                    */
/* ------------------------------------------------------------------ */

// Connect to a room (by its opaque id) and show the tracker.
async function connectToRoom(roomId) {
  const user = getCurrentUser();

  let meta;
  try {
    meta = await getRoomMeta(roomId);
  } catch (e) {
    console.error(e);
    ui.showRoomsError(tr('toast.room.open.err'));
    return;
  }

  state.setCurrentRoomId(roomId);
  ui.hideRoomsScreen();

  currentRoomMeta = meta;
  currentIsOwner = !!(meta && user && meta.ownerUid === user.uid);

  const roomName = meta ? meta.name : 'Sala';
  state.setCurrentRoomName(roomName);
  if (ui.elements.codeDisplay) ui.elements.codeDisplay.innerText = roomName;
  if (ui.elements.roomTitleDisplay) ui.elements.roomTitleDisplay.innerText = roomName;

  ui.applyRoomRole(currentIsOwner);

  // Live member list for the config modal
  if (currentMembersUnsub) currentMembersUnsub();
  currentMembersUnsub = observeRoomMembers(roomId, (members) => {
    ui.renderMembers(members, user ? user.uid : '', currentIsOwner, handleRemoveMember);
  });

  // Live tracker store
  connectToRoomDb(roomId, (newState) => {
    state.setRoomState(roomId, newState);
    ui.showSyncIndicator();
  });
}

/* ------------------------------------------------------------------ */
/* ROOMS SCREEN (MIS SALAS)                                           */
/* ------------------------------------------------------------------ */

async function openRoomsScreen() {
  const user = getCurrentUser();
  if (!user) return;
  ui.setRoomsUserLabel(user.email || 'Sesión iniciada');
  ui.clearRoomsError();
  ui.showRoomsScreen();
  await refreshRoomsList();
}

async function refreshRoomsList() {
  const user = getCurrentUser();
  if (!user) return;
  try {
    const rooms = await getUserRooms(user.uid);
    ui.renderRoomsList(rooms, (roomId) => connectToRoom(roomId));

    const owned = rooms.filter(r => r.role === 'owner').length;
    const [allowance, pro] = await Promise.all([
      getRoomAllowance(user),
      isProUser(user)
    ]);

    // Pro users don't need the redeem-code box anymore.
    ui.setRedeemVisible(!pro);

    if (ui.elements.createRoomHint) {
      if (allowance <= 0) {
        ui.elements.createRoomHint.innerText = tr('rooms.err.need.code');
      } else {
        ui.elements.createRoomHint.innerText = tr('rooms.hint.slots', { owned, max: allowance, members: MAX_MEMBERS_PER_ROOM });
      }
    }
  } catch (e) {
    console.error(e);
    ui.showRoomsError(tr('toast.room.load.err'));
  }
}

async function handleCreateRoom() {
  const user = getCurrentUser();
  const name = ui.elements.newRoomName.value.trim();
  if (!name) {
    ui.showRoomsError(tr('toast.room.name.empty'));
    return;
  }
  ui.clearRoomsError();
  ui.elements.btnCreateRoom.disabled = true;
  try {
    const roomId = await createRoom(user, name);
    ui.elements.newRoomName.value = '';
    await connectToRoom(roomId);
    ui.showToast(tr('toast.room.created', { name }));
  } catch (e) {
    if (e.code === 'limit/needPro') {
      ui.showRoomsError(tr('rooms.err.need.code'));
    } else if (e.code === 'limit/rooms') {
      ui.showRoomsError(tr('rooms.err.limit', { n: MAX_ROOMS_PRO }));
    } else {
      console.error(e);
      ui.showRoomsError(tr('rooms.err.create'));
    }
  } finally {
    ui.elements.btnCreateRoom.disabled = false;
  }
}

/* ------------------------------------------------------------------ */
/* ACCESS CODE REDEMPTION (free trial -> Pro)                         */
/* ------------------------------------------------------------------ */

async function handleRedeemCode() {
  const user = getCurrentUser();
  const input = ui.elements.redeemCodeInput;
  const code = input ? input.value.trim() : '';
  if (!code) {
    ui.showRoomsError(tr('rooms.code.empty'));
    return;
  }
  ui.clearRoomsError();
  if (ui.elements.btnRedeemCode) ui.elements.btnRedeemCode.disabled = true;
  try {
    await redeemAccessCode(code, user);
    if (input) input.value = '';
    ui.showToast(tr('toast.code.activated'));
    await refreshRoomsList();
  } catch (e) {
    if (e.code === 'code/invalid') {
      ui.showRoomsError(tr('rooms.code.invalid'));
    } else if (e.code === 'code/used') {
      ui.showRoomsError(tr('rooms.code.used'));
    } else if (e.code === 'code/expired') {
      ui.showRoomsError(tr('rooms.code.expired'));
    } else {
      console.error(e);
      ui.showRoomsError(tr('rooms.code.err'));
    }
  } finally {
    if (ui.elements.btnRedeemCode) ui.elements.btnRedeemCode.disabled = false;
  }
}

async function handleJoinRoom() {
  const user = getCurrentUser();
  const code = ui.elements.joinCodeInput.value.trim().toUpperCase();
  if (!code) {
    ui.showRoomsError(tr('rooms.join.empty'));
    return;
  }
  ui.clearRoomsError();
  ui.elements.btnJoinRoom.disabled = true;
  try {
    const roomId = await acceptInvite(code, user);
    ui.elements.joinCodeInput.value = '';
    await connectToRoom(roomId);
    ui.showToast(tr('toast.joined'));
  } catch (e) {
    if (e.code === 'invite/invalid') {
      ui.showRoomsError(tr('rooms.join.invalid'));
    } else if (e.code === 'limit/members') {
      ui.showRoomsError(tr('rooms.join.full', { n: MAX_MEMBERS_PER_ROOM }));
    } else {
      console.error(e);
      ui.showRoomsError(tr('rooms.join.err'));
    }
  } finally {
    ui.elements.btnJoinRoom.disabled = false;
  }
}

/* ------------------------------------------------------------------ */
/* MEMBERS & INVITE (inside a room)                                   */
/* ------------------------------------------------------------------ */

async function handleInvite() {
  const user = getCurrentUser();
  const roomId = state.currentRoomId;
  if (!roomId) return;
  try {
    const code = await createInvite(roomId, user);
    const link = `${location.origin}${location.pathname}?invite=${code}`;
    ui.showInviteLink(link);
    ui.showToast(tr('toast.invite.generated'));
  } catch (e) {
    console.error(e);
    ui.showToast(tr('toast.invite.err'), "error");
  }
}

function handleRemoveMember(uid) {
  const roomId = state.currentRoomId;
  ui.showConfirm(tr('confirm.remove.member'), async () => {
    try {
      await removeMember(roomId, uid);
      ui.showToast(tr('toast.member.removed'));
    } catch (e) {
      console.error(e);
      ui.showToast(tr('toast.member.remove.err'), "error");
    }
  });
}

// Return to the rooms screen by reloading (clean teardown of listeners/state).
function backToRooms() {
  disconnectRoomDb();
  if (currentMembersUnsub) currentMembersUnsub();
  location.reload();
}

/* ------------------------------------------------------------------ */
/* QUICK ROOM SWITCHER                                                 */
/* ------------------------------------------------------------------ */

async function openRoomSwitcher() {
  const user = getCurrentUser();
  if (!user) return;
  ui.openModal(ui.elements.roomSwitcherModal);
  try {
    const rooms = await getUserRooms(user.uid);
    ui.renderRoomSwitcher(rooms, state.currentRoomId, (roomId) => switchRoom(roomId));
  } catch (e) {
    console.error(e);
    ui.showToast(tr('toast.room.load.err.short'), "error");
  }
}

// Switch to another room in place (no full page reload).
async function switchRoom(roomId) {
  if (!roomId || roomId === state.currentRoomId) {
    ui.closeModal(ui.elements.roomSwitcherModal);
    return;
  }
  ui.closeModal(ui.elements.roomSwitcherModal);
  disconnectRoomDb();
  if (currentMembersUnsub) currentMembersUnsub();
  // Wipe local store BEFORE connecting so no stale data flashes in the UI.
  state.resetRoomState();
  await connectToRoom(roomId);
  // Reset to the main tab for the new room.
  const trackerBtn = document.getElementById('navTrackerBtn');
  if (trackerBtn) ui.navTo('tracker', trackerBtn);
  ui.showToast(tr('toast.room.changed'));
}

/* ------------------------------------------------------------------ */
/* AI ASSISTANT                                                        */
/* ------------------------------------------------------------------ */

let agentBusy = false;

function openAssistant() {
  ui.openModal(ui.elements.agentModal);
  setTimeout(() => {
    if (ui.elements.agentInput) ui.elements.agentInput.focus();
  }, 200);
}

async function sendAgentMessage(text) {
  const prompt = (text || (ui.elements.agentInput ? ui.elements.agentInput.value : '')).trim();
  if (!prompt || agentBusy) return;

  agentBusy = true;
  if (ui.elements.agentInput) ui.elements.agentInput.value = '';
  ui.appendAgentMessage(prompt, 'user');

  const thinking = ui.appendAgentMessage(tr('ai.thinking'), 'bot');
  if (thinking) thinking.classList.add('agent-thinking');

  try {
    const reply = await askAssistant(prompt);
    if (thinking) {
      thinking.classList.remove('agent-thinking');
      thinking.innerText = reply || tr('ai.no.answer');
    }
  } catch (e) {
    let msg = tr('ai.contact.err');
    if (e.code === 'limit') {
      msg = e.message || msg;
    } else if (e.message) {
      msg = e.message;
    }
    if (thinking) {
      thinking.classList.remove('agent-thinking');
      thinking.classList.add('agent-msg-error');
      thinking.innerText = msg;
    }
  } finally {
    agentBusy = false;
    ui.scrollAgentToBottom();
  }
}

/* ------------------------------------------------------------------ */
/* AUTH                                                               */
/* ------------------------------------------------------------------ */

async function handleGoogleLogin() {
  ui.clearAuthError();
  const btn = ui.elements.btnGoogleLogin;
  if (btn) btn.disabled = true;
  try {
    await loginWithGoogle();
    // onAuthStateChanged takes over from here
  } catch (error) {
    console.error("Auth error:", error);
    ui.showAuthError(authErrorMessage(error));
  } finally {
    if (btn) btn.disabled = false;
  }
}

function doSignOut() {
  ui.showConfirm(tr('confirm.signout'), async () => {
    try {
      await logoutUser();
      location.reload();
    } catch (error) {
      console.error(error);
      ui.showToast(tr('toast.signout.err'), "error");
    }
  });
}

function bindAuthEvents() {
  if (ui.elements.btnGoogleLogin) {
    ui.elements.btnGoogleLogin.onclick = handleGoogleLogin;
  }
  if (ui.elements.btnSignOut) {
    ui.elements.btnSignOut.onclick = doSignOut;
  }
  if (ui.elements.btnRoomsSignOut) {
    ui.elements.btnRoomsSignOut.onclick = doSignOut;
  }
}

/* ------------------------------------------------------------------ */
/* ROOMS-SCREEN EVENT BINDINGS                                        */
/* ------------------------------------------------------------------ */

function bindRoomsEvents() {
  if (ui.elements.btnCreateRoom) {
    ui.elements.btnCreateRoom.onclick = handleCreateRoom;
  }
  if (ui.elements.newRoomName) {
    ui.elements.newRoomName.onkeyup = (e) => { if (e.key === 'Enter') handleCreateRoom(); };
  }
  if (ui.elements.btnJoinRoom) {
    ui.elements.btnJoinRoom.onclick = handleJoinRoom;
  }
  if (ui.elements.joinCodeInput) {
    ui.elements.joinCodeInput.onkeyup = (e) => { if (e.key === 'Enter') handleJoinRoom(); };
  }
  if (ui.elements.btnRedeemCode) {
    ui.elements.btnRedeemCode.onclick = handleRedeemCode;
  }
  if (ui.elements.redeemCodeInput) {
    ui.elements.redeemCodeInput.onkeyup = (e) => { if (e.key === 'Enter') handleRedeemCode(); };
  }
}

/**
 * Split a free-form block of text into shopping items, parsing tags and quantities.
 */
function parseBulkLines(raw) {
  const lines = String(raw || '')
    .split(/[\n,]+/)
    .map(s => s.trim())
    .filter(Boolean);
  
  const parsedItems = [];
  lines.forEach(line => {
    // Clean bullet points
    let cleanLine = line.replace(/^[-*•\d.\)\s]+/, '').trim();
    
    // Parse tags
    const tags = [];
    const tagMatches = [...cleanLine.matchAll(/#([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_]+)/g)];
    if (tagMatches.length > 0) {
      tagMatches.forEach(m => tags.push(m[1]));
      cleanLine = cleanLine.replace(/#([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_]+)/g, '').trim();
    }

    // Parse quantity
    const qtyMatch = cleanLine.match(/\s+(?:x|×)(\d+\S*)$/i) || cleanLine.match(/\s+\(([^)]+)\)$/);
    const qty = qtyMatch ? qtyMatch[1] : '';
    const name = qtyMatch ? cleanLine.slice(0, cleanLine.length - qtyMatch[0].length).trim() : cleanLine;
    
    if (name) {
      parsedItems.push({ name, qty, tags });
    }
  });
  return parsedItems;
}

/* ------------------------------------------------------------------ */
/* TAB SWIPE NAVIGATION                                               */
/* ------------------------------------------------------------------ */

// Tab definitions for swipe navigation (fixed order).
const TAB_DEFS = [
  { id: 'navTrackerBtn',  target: 'tracker'  },
  { id: 'navRoadmapBtn',  target: 'roadmap'  },
  { id: 'navPendingBtn',  target: 'pending'  },
  { id: 'navShoppingBtn', target: 'shopping' },
  { id: 'navMetricsBtn',  target: 'metrics'  }
];

function getActiveTabIndex() {
  const active = document.querySelector('.nav-item.active');
  if (!active) return 0;
  return TAB_DEFS.findIndex(d => d.id === active.id);
}

function navigateToTabIndex(idx) {
  const clamped = Math.max(0, Math.min(TAB_DEFS.length - 1, idx));
  const def = TAB_DEFS[clamped];
  const btn = document.getElementById(def.id);
  if (btn) ui.navTo(def.target, btn);
}

function initTabSwipe() {
  const appContainer = document.getElementById('appContainer');
  if (!appContainer) return;

  let tsX = 0, tsY = 0, isHoriz = null;

  appContainer.addEventListener('touchstart', e => {
    tsX = e.touches[0].clientX;
    tsY = e.touches[0].clientY;
    isHoriz = null;
  }, { passive: true });

  appContainer.addEventListener('touchmove', e => {
    if (isHoriz === null) {
      const dx = Math.abs(e.touches[0].clientX - tsX);
      const dy = Math.abs(e.touches[0].clientY - tsY);
      if (dx > 8 || dy > 8) isHoriz = dx > dy;
    }
    // Don't prevent default — let vertical scroll work normally
  }, { passive: true });

  appContainer.addEventListener('touchend', e => {
    if (!isHoriz) return;
    const dx = e.changedTouches[0].clientX - tsX;
    if (Math.abs(dx) < 55) return;
    // Block swipe if inside a horizontally-scrollable element
    const target = e.target.closest('.roadmap-tabs, .profile-switch, input, textarea, select');
    if (target) return;
    navigateToTabIndex(getActiveTabIndex() + (dx < 0 ? 1 : -1));
  }, { passive: true });
}

/* ------------------------------------------------------------------ */
/* NAV LONG-PRESS DRAG REORDER                                        */
/* ------------------------------------------------------------------ */

// Event Bindings (in-app)
function bindEvents() {
  // Navigation Item Clicks
  const navItems = TAB_DEFS;
  navItems.forEach(item => {
    const btn = document.getElementById(item.id);
    if (btn) {
      btn.onclick = () => {
        ui.navTo(item.target, btn);
      };
    }
  });

  // Modals and Overlays toggles
  if (ui.elements.btnOpenReport) {
    ui.elements.btnOpenReport.onclick = () => ui.showReport();
  }

  // --- QUICK ROOM SWITCHER ---
  if (ui.elements.btnRoomSwitcher) {
    ui.elements.btnRoomSwitcher.onclick = () => openRoomSwitcher();
  }
  if (ui.elements.btnCloseRoomSwitcher) {
    ui.elements.btnCloseRoomSwitcher.onclick = () => ui.closeModal(ui.elements.roomSwitcherModal);
  }
  if (ui.elements.btnGoToRooms) {
    ui.elements.btnGoToRooms.onclick = () => {
      ui.closeModal(ui.elements.roomSwitcherModal);
      ui.showConfirm(tr('confirm.go.rooms'), () => backToRooms());
    };
  }

  // --- AI ASSISTANT ---
  if (ui.elements.btnOpenAssistant) {
    ui.elements.btnOpenAssistant.onclick = () => openAssistant();
  }
  if (ui.elements.btnCloseAgent) {
    ui.elements.btnCloseAgent.onclick = () => ui.closeModal(ui.elements.agentModal);
  }
  if (ui.elements.btnSendAgent) {
    ui.elements.btnSendAgent.onclick = () => sendAgentMessage();
  }
  if (ui.elements.agentInput) {
    ui.elements.agentInput.onkeyup = (e) => { if (e.key === 'Enter') sendAgentMessage(); };
  }
  if (ui.elements.agentSuggestions) {
    ui.elements.agentSuggestions.querySelectorAll('.agent-chip').forEach(chip => {
      chip.onclick = () => sendAgentMessage(chip.getAttribute('data-q'));
    });
  }

  // --- SHOPPING LIST EVENT BINDINGS ---
  let selectedImageBase64 = null;

  if (ui.elements.btnTabShoppingList) {
    ui.elements.btnTabShoppingList.onclick = () => ui.toggleShoppingTab('list');
  }
  if (ui.elements.btnTabShoppingAdd) {
    ui.elements.btnTabShoppingAdd.onclick = () => ui.toggleShoppingTab('add');
  }
  if (ui.elements.btnTabShoppingSaved) {
    ui.elements.btnTabShoppingSaved.onclick = () => ui.toggleShoppingTab('saved');
  }
  if (ui.elements.btnCreateSavedList) {
    ui.elements.btnCreateSavedList.onclick = () => {
      const name = prompt(tr('prompt.new.list'));
      if (!name || !name.trim()) return;
      const result = state.createSavedShoppingList(name.trim());
      if (!result) {
        ui.showToast(tr('toast.list.limit'), 'warning');
        return;
      }
      ui.showToast(tr('toast.list.created', { name: result.name }));
      ui.renderSavedLists();
    };
  }
  
  if (ui.elements.btnUploadImageTrigger) {
    ui.elements.btnUploadImageTrigger.onclick = (e) => {
      e.preventDefault();
      if (ui.elements.shopItemImage) ui.elements.shopItemImage.click();
    };
  }
  
  if (ui.elements.shopItemImage) {
    ui.elements.shopItemImage.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      if (ui.elements.shopImageFileName) ui.elements.shopImageFileName.innerText = file.name;
      
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement('canvas');
          const max_size = 300;
          let width = image.width;
          let height = image.height;
          
          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(image, 0, 0, width, height);
          
          selectedImageBase64 = canvas.toDataURL('image/jpeg', 0.7);
          
          if (ui.elements.shopImagePreview) ui.elements.shopImagePreview.src = selectedImageBase64;
          if (ui.elements.shopImagePreviewContainer) ui.elements.shopImagePreviewContainer.style.display = 'block';
          if (ui.elements.btnRemoveShopImage) ui.elements.btnRemoveShopImage.style.display = 'inline-block';
        };
        image.src = readerEvent.target.result;
      };
      reader.readAsDataURL(file);
    };
  }
  
  if (ui.elements.btnRemoveShopImage) {
    ui.elements.btnRemoveShopImage.onclick = (e) => {
      e.preventDefault();
      selectedImageBase64 = null;
      if (ui.elements.shopItemImage) ui.elements.shopItemImage.value = '';
      if (ui.elements.shopImageFileName) ui.elements.shopImageFileName.innerText = tr('shop.item.no.photo');
      if (ui.elements.btnRemoveShopImage) ui.elements.btnRemoveShopImage.style.display = 'none';
      if (ui.elements.shopImagePreviewContainer) ui.elements.shopImagePreviewContainer.style.display = 'none';
      if (ui.elements.shopImagePreview) ui.elements.shopImagePreview.src = '';
    };
  }
  
  const resetShopForm = () => {
    if (ui.elements.shopItemName) ui.elements.shopItemName.value = '';
    if (ui.elements.shopItemQty) ui.elements.shopItemQty.value = '';
    if (ui.elements.shopItemTags) ui.elements.shopItemTags.value = '';
    selectedImageBase64 = null;
    if (ui.elements.shopItemImage) ui.elements.shopItemImage.value = '';
    if (ui.elements.shopImageFileName) ui.elements.shopImageFileName.innerText = tr('shop.item.no.photo');
    if (ui.elements.btnRemoveShopImage) ui.elements.btnRemoveShopImage.style.display = 'none';
    if (ui.elements.shopImagePreviewContainer) ui.elements.shopImagePreviewContainer.style.display = 'none';
    if (ui.elements.shopImagePreview) ui.elements.shopImagePreview.src = '';
  };

  if (ui.elements.btnSaveShopItem) {
    ui.elements.btnSaveShopItem.onclick = () => {
      const name = ui.elements.shopItemName.value.trim();
      const qty = ui.elements.shopItemQty.value.trim();
      const target = ui.elements.shopItemUser.value;

      // A photo on its own is enough (no name required).
      if (!name && !selectedImageBase64) {
        ui.showToast(tr('toast.item.empty'), "warning");
        return;
      }

      // Parse tags from the input
      let tags = [];
      if (ui.elements.shopItemTags) {
        const rawTags = ui.elements.shopItemTags.value.trim();
        if (rawTags) {
          tags = rawTags.split(',')
            .map(t => t.trim().replace(/^#/, ''))
            .filter(t => t.length > 0);
        }
      }

      state.saveShoppingItem(name, qty, target, selectedImageBase64, tags);
      ui.showToast(tr('toast.item.added'));
      resetShopForm();
      ui.toggleShoppingTab('list');
    };
  }

  if (ui.elements.shopItemTags) {
    ui.elements.shopItemTags.oninput = () => {
      ui.updateQuickTagChipStyles();
    };
  }

  // Bulk: add the whole pasted/typed list as-is (one item per line/comma).
  if (ui.elements.btnAddBulkList) {
    ui.elements.btnAddBulkList.onclick = () => {
      const raw = ui.elements.shopBulkInput ? ui.elements.shopBulkInput.value : '';
      const target = ui.elements.shopItemUser ? ui.elements.shopItemUser.value : 'casa';
      const items = parseBulkLines(raw);
      if (items.length === 0) {
        ui.showToast(tr('toast.bulk.empty'), "warning");
        return;
      }
      const count = state.saveShoppingItemsBulk(items, target);
      if (ui.elements.shopBulkInput) ui.elements.shopBulkInput.value = '';
      // Use plural helper via ui
      ui.showToast(plural('toast.bulk.added', count));
      ui.toggleShoppingTab('list');
    };
  }

  // Bulk: let the AI clean up the messy list into proper items.
  if (ui.elements.btnFixListAI) {
    ui.elements.btnFixListAI.onclick = async () => {
      const raw = ui.elements.shopBulkInput ? ui.elements.shopBulkInput.value.trim() : '';
      const target = ui.elements.shopItemUser ? ui.elements.shopItemUser.value : 'casa';
      if (!raw) {
        ui.showToast(tr('toast.bulk.ai.empty'), "warning");
        return;
      }
      const btn = ui.elements.btnFixListAI;
      const original = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = tr('toast.bulk.ai.sorting');
      try {
        const items = await fixShoppingListWithAI(raw);
        if (!items.length) {
          ui.showToast(tr('toast.bulk.ai.err'), "error");
          return;
        }
        const count = state.saveShoppingItemsBulk(items, target);
        if (ui.elements.shopBulkInput) ui.elements.shopBulkInput.value = '';
        ui.showToast(plural('toast.bulk.ai.done', count));
        ui.toggleShoppingTab('list');
      } catch (e) {
        let msg = "No se pudo usar la IA. Revisa la configuración del agente.";
        if (e.code === 'limit') msg = e.message || msg;
        else if (e.message) msg = e.message;
        ui.showToast(msg, "error");
      } finally {
        btn.disabled = false;
        btn.innerHTML = original;
      }
    };
  }

  // Fullscreen shopping list
  if (ui.elements.btnShoppingFullscreen) {
    ui.elements.btnShoppingFullscreen.onclick = () => ui.openShoppingFullscreen();
  }
  if (ui.elements.btnCloseShoppingFullscreen) {
    ui.elements.btnCloseShoppingFullscreen.onclick = () => ui.closeShoppingFullscreen();
  }
  
  // General shopping list sharing
  const shareHandler = () => {
    const text = state.buildGeneralShareText(ui.activeGeneralListFilters);
    if (!text) {
      ui.showToast(tr('toast.shop.empty.share') || 'La lista de compras está vacía', 'warning');
      return;
    }
    if (navigator.share) {
      navigator.share({ title: 'Lista de Compras', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      ui.showToast(tr('toast.copied.clipboard') || 'Copiado al portapapeles');
    }
  };

  if (ui.elements.btnShoppingShare) {
    ui.elements.btnShoppingShare.onclick = shareHandler;
  }
  if (ui.elements.btnShoppingFullscreenShare) {
    ui.elements.btnShoppingFullscreenShare.onclick = shareHandler;
  }

  // Shopping column toggles (1 or 2 cols)
  [ui.elements.btnCol1, ui.elements.btnCol2, ui.elements.btnFsCol1, ui.elements.btnFsCol2].forEach(btn => {
    if (btn) btn.onclick = () => ui.setShopCols(parseInt(btn.dataset.cols, 10));
  });

  // Fullscreen pending list
  if (ui.elements.btnPendingFullscreen) {
    ui.elements.btnPendingFullscreen.onclick = () => ui.openPendingFullscreen();
  }
  if (ui.elements.btnClosePendingFullscreen) {
    ui.elements.btnClosePendingFullscreen.onclick = () => ui.closePendingFullscreen();
  }

  // Fullscreen today activity
  if (ui.elements.btnTodayFullscreen) {
    ui.elements.btnTodayFullscreen.onclick = () => ui.openTodayFullscreen();
  }
  if (ui.elements.btnCloseTodayFullscreen) {
    ui.elements.btnCloseTodayFullscreen.onclick = () => ui.closeTodayFullscreen();
  }

  // Pending task creation form collapse/expand toggle
  if (ui.elements.btnTogglePendingForm && ui.elements.pendingFormCollapse) {
    ui.elements.btnTogglePendingForm.onclick = () => {
      const isHidden = ui.elements.pendingFormCollapse.style.display === 'none';
      ui.elements.pendingFormCollapse.style.display = isHidden ? 'block' : 'none';
      ui.elements.btnTogglePendingForm.innerText = isHidden 
        ? tr('pending.cancel') 
        : tr('pending.add.toggle');
      
      // Close saved list form if open
      if (isHidden && ui.elements.savedListFormCollapse) {
        ui.elements.savedListFormCollapse.style.display = 'none';
        if (ui.elements.btnToggleSavedListForm) {
          ui.elements.btnToggleSavedListForm.innerText = tr('pending.add.list.toggle');
        }
      }
      
      // Clear inputs if canceling/closing
      if (!isHidden) {
        ui.elements.pendingInput.value = "";
        ui.elements.editPenIdx.value = "";
        if (ui.elements.pendingDesc) ui.elements.pendingDesc.value = "";
        if (ui.elements.pendingDeadline) ui.elements.pendingDeadline.value = "";
        if (ui.elements.pendingPriority) ui.elements.pendingPriority.value = 'media';
        ui.elements.btnSavePen.innerText = tr('pending.save');
        // Reset photo
        if (ui.elements.pendingTaskImage) ui.elements.pendingTaskImage.value = '';
        if (ui.elements.pendingImageFile) ui.elements.pendingImageFile.value = '';
        if (ui.elements.pendingImageLabel) ui.elements.pendingImageLabel.innerText = tr('pending.photo.none.label');
        if (ui.elements.pendingImagePreviewContainer) ui.elements.pendingImagePreviewContainer.style.display = 'none';
        if (ui.elements.btnRemovePendingImage) ui.elements.btnRemovePendingImage.style.display = 'none';
      }
    };
  }

  // Saved list creation form toggle
  if (ui.elements.btnToggleSavedListForm && ui.elements.savedListFormCollapse) {
    ui.elements.btnToggleSavedListForm.onclick = () => {
      const isHidden = ui.elements.savedListFormCollapse.style.display === 'none';
      ui.elements.savedListFormCollapse.style.display = isHidden ? 'block' : 'none';
      ui.elements.btnToggleSavedListForm.innerText = isHidden
        ? tr('pending.cancel')
        : tr('pending.add.list.toggle');

      if (!isHidden) {
        if (ui.elements.savedListFormName) ui.elements.savedListFormName.value = '';
        if (ui.elements.savedListFormItems) ui.elements.savedListFormItems.value = '';
      }
    };
  }

  // Pending task photo upload
  if (ui.elements.btnUploadPendingImage) {
    ui.elements.btnUploadPendingImage.onclick = () => ui.elements.pendingImageFile && ui.elements.pendingImageFile.click();
  }
  if (ui.elements.pendingImageFile) {
    ui.elements.pendingImageFile.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const b64 = ev.target.result;
        if (ui.elements.pendingTaskImage) ui.elements.pendingTaskImage.value = b64;
        if (ui.elements.pendingImageLabel) ui.elements.pendingImageLabel.innerText = file.name;
        if (ui.elements.pendingImagePreview) ui.elements.pendingImagePreview.src = b64;
        if (ui.elements.pendingImagePreviewContainer) ui.elements.pendingImagePreviewContainer.style.display = 'block';
        if (ui.elements.btnRemovePendingImage) ui.elements.btnRemovePendingImage.style.display = 'inline-flex';
      };
      reader.readAsDataURL(file);
    };
  }
  if (ui.elements.btnRemovePendingImage) {
    ui.elements.btnRemovePendingImage.onclick = () => {
      if (ui.elements.pendingTaskImage) ui.elements.pendingTaskImage.value = '';
      if (ui.elements.pendingImageFile) ui.elements.pendingImageFile.value = '';
      if (ui.elements.pendingImageLabel) ui.elements.pendingImageLabel.innerText = tr('pending.photo.none.label');
      if (ui.elements.pendingImagePreviewContainer) ui.elements.pendingImagePreviewContainer.style.display = 'none';
      if (ui.elements.btnRemovePendingImage) ui.elements.btnRemovePendingImage.style.display = 'none';
    };
  }

  if (ui.elements.btnCloseLightbox) {
    ui.elements.btnCloseLightbox.onclick = () => {
      ui.closeModal(ui.elements.imageLightbox);
    };
  }
  if (ui.elements.btnCloseReport) {
    ui.elements.btnCloseReport.onclick = () => ui.closeReport();
  }
  if (ui.elements.btnDownloadPDF) {
    ui.elements.btnDownloadPDF.onclick = () => ui.triggerDownloadPDF();
  }
  if (ui.elements.btnEmailReport) {
    ui.elements.btnEmailReport.onclick = () => ui.emailDailyReport();
  }

  // Chart tab toggle
  if (ui.elements.btnChartTabHoy) {
    ui.elements.btnChartTabHoy.onclick = () => ui.switchChartTab('hoy');
  }
  if (ui.elements.btnChartTabHistorial) {
    ui.elements.btnChartTabHistorial.onclick = () => ui.switchChartTab('historial');
  }

  // Weekly report
  if (ui.elements.btnOpenWeeklyReport) {
    ui.elements.btnOpenWeeklyReport.onclick = () => ui.showWeeklyReport();
  }
  if (ui.elements.btnCloseWeeklyReport) {
    ui.elements.btnCloseWeeklyReport.onclick = () => ui.closeWeeklyReport();
  }
  if (ui.elements.btnDownloadWeeklyPDF) {
    ui.elements.btnDownloadWeeklyPDF.onclick = () => ui.triggerDownloadWeeklyPDF();
  }
  if (ui.elements.btnEmailWeeklyReport) {
    ui.elements.btnEmailWeeklyReport.onclick = () => ui.emailWeeklyReport();
  }

  // --- LANG + THEME TOGGLES ---
  const btnLangEs = document.getElementById('btnLangEs');
  const btnLangEn = document.getElementById('btnLangEn');
  const handleLangToggle = (lang) => {
    applyLang(lang);
    syncLangButtons(lang);
    updateClock();
    if (state.currentRoomId) {
      ui.updateUI();
      // Re-render open overlays
      if (ui.elements.weeklyReportOverlay && ui.elements.weeklyReportOverlay.classList.contains('open')) {
        ui.showWeeklyReport();
      }
      if (ui.elements.reportOverlay && ui.elements.reportOverlay.classList.contains('open')) {
        ui.showReport();
      }
    } else {
      refreshRoomsList();
    }
  };
  if (btnLangEs) btnLangEs.onclick = () => handleLangToggle('es');
  if (btnLangEn) btnLangEn.onclick = () => handleLangToggle('en');

  const toggleDark = document.getElementById('toggleDarkMode');
  if (toggleDark) {
    toggleDark.onchange = () => applyTheme(toggleDark.checked ? 'dark' : 'light');
  }

  if (ui.elements.btnOpenConfig) {
    ui.elements.btnOpenConfig.onclick = () => {
      // Sync dark toggle state when opening settings
      const dm = document.getElementById('toggleDarkMode');
      if (dm) dm.checked = (localStorage.getItem('prodTrackerTheme') === 'dark');
      ui.openModal(ui.elements.configModal);
    };
  }
  if (ui.elements.btnCloseConfig) {
    ui.elements.btnCloseConfig.onclick = () => {
      ui.closeModal(ui.elements.configModal);
    };
  }

  // Danger zone collapsible
  const btnToggleDanger = document.getElementById('btnToggleDangerZone');
  const dangerPanel = document.getElementById('dangerZonePanel');
  if (btnToggleDanger && dangerPanel) {
    btnToggleDanger.onclick = () => {
      const open = dangerPanel.classList.toggle('open');
      btnToggleDanger.classList.toggle('open', open);
    };
  }

  // Game Rules modal
  if (ui.elements.btnOpenGameRules) {
    ui.elements.btnOpenGameRules.onclick = () => {
      // Load saved rules into UI
      const rules = loadGameRules();
      if (ui.elements.ruleStreakEnabled) ui.elements.ruleStreakEnabled.checked = rules.streakEnabled;
      if (ui.elements.ruleStreakThreshold) ui.elements.ruleStreakThreshold.value = rules.streakThreshold;
      if (ui.elements.ruleStreakBonus) ui.elements.ruleStreakBonus.value = rules.streakBonus;
      if (ui.elements.ruleUrgencyDays) ui.elements.ruleUrgencyDays.value = rules.urgencyDays;
      if (ui.elements.streakOptions) ui.elements.streakOptions.style.display = rules.streakEnabled ? '' : 'none';
      ui.closeModal(ui.elements.configModal);
      ui.openModal(ui.elements.gameRulesModal);
    };
  }
  if (ui.elements.ruleStreakEnabled) {
    ui.elements.ruleStreakEnabled.onchange = () => {
      if (ui.elements.streakOptions) {
        ui.elements.streakOptions.style.display = ui.elements.ruleStreakEnabled.checked ? '' : 'none';
      }
    };
  }
  if (ui.elements.btnSaveGameRules) {
    ui.elements.btnSaveGameRules.onclick = () => {
      const rules = {
        streakEnabled: ui.elements.ruleStreakEnabled?.checked ?? true,
        streakThreshold: parseInt(ui.elements.ruleStreakThreshold?.value || '3', 10),
        streakBonus: parseInt(ui.elements.ruleStreakBonus?.value || '1', 10),
        urgencyDays: parseInt(ui.elements.ruleUrgencyDays?.value || '3', 10)
      };
      saveGameRules(rules);
      ui.closeModal(ui.elements.gameRulesModal);
      ui.showToast(tr('toast.rules.saved'));
    };
  }
  if (ui.elements.btnCloseGameRules) {
    ui.elements.btnCloseGameRules.onclick = () => ui.closeModal(ui.elements.gameRulesModal);
  }

  if (ui.elements.mainFab) {
    ui.elements.mainFab.onclick = () => ui.openTemplateModal();
  }
  if (ui.elements.btnCloseTplModal) {
    ui.elements.btnCloseTplModal.onclick = () => {
      ui.closeModal(ui.elements.templateModal);
    };
  }

  // Edit Saved List Modal listeners
  if (ui.elements.btnCloseEditSavedListModal) {
    ui.elements.btnCloseEditSavedListModal.onclick = () => ui.closeModal(ui.elements.editSavedListModal);
  }
  if (ui.elements.btnCancelEditSavedListModal) {
    ui.elements.btnCancelEditSavedListModal.onclick = () => ui.closeModal(ui.elements.editSavedListModal);
  }
  if (ui.elements.editSavedListModal) {
    ui.elements.editSavedListModal.onclick = (e) => {
      if (e.target === ui.elements.editSavedListModal) {
        ui.closeModal(ui.elements.editSavedListModal);
      }
    };
  }

  if (ui.elements.btnSaveEditSavedListModal) {
    ui.elements.btnSaveEditSavedListModal.onclick = () => {
      const listId = ui.elements.editSavedListModal.dataset.listId;
      const newName = ui.elements.editSavedListModalName.value.trim();
      const raw = ui.elements.editSavedListModalItems.value.trim();

      if (!newName) {
        ui.showToast(tr('toast.list.name.empty'), 'warning');
        return;
      }

      state.renameSavedShoppingList(listId, newName);

      const lines = raw ? raw.split('\n').map(l => l.trim()).filter(Boolean) : [];
      const parsedItems = [];
      lines.forEach(line => {
        const tags = [];
        let cleanLine = line;
        const tagMatches = [...line.matchAll(/#([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_]+)/g)];
        if (tagMatches.length > 0) {
          tagMatches.forEach(m => tags.push(m[1]));
          cleanLine = line.replace(/#([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_]+)/g, '').trim();
        }

        const qtyMatch = cleanLine.match(/\s+(?:x|×)(\d+\S*)$/i) || cleanLine.match(/\s+\(([^)]+)\)$/);
        const qty = qtyMatch ? qtyMatch[1] : '';
        const name = qtyMatch ? cleanLine.slice(0, cleanLine.length - qtyMatch[0].length).trim() : cleanLine;
        if (name) {
          parsedItems.push({ name, qty, tags });
        }
      });

      state.replaceSavedListItems(listId, parsedItems);
      ui.showToast(tr('saved.list.updated'));
      ui.closeModal(ui.elements.editSavedListModal);
      ui.renderSavedLists();
    };
  }

  // Save Pending Task Form
  if (ui.elements.btnSavePen) {
    ui.elements.btnSavePen.onclick = () => {
      const name = ui.elements.pendingInput.value.trim();
      const pts = ui.elements.pendingPoints.value.trim();
      const priority = ui.elements.pendingPriority ? ui.elements.pendingPriority.value : 'media';
      const idx = ui.elements.editPenIdx.value;

      if (!name) {
        ui.showToast(tr('toast.task.empty.name'), "warning");
        return;
      }

      const desc = ui.elements.pendingDesc ? ui.elements.pendingDesc.value.trim() : '';
      const deadline = ui.elements.pendingDeadline ? ui.elements.pendingDeadline.value : '';

      const imageB64 = ui.elements.pendingTaskImage ? ui.elements.pendingTaskImage.value || null : null;
      state.savePendingTask(name, pts, priority, idx, imageB64, desc, deadline, []);
      ui.showToast(tr(idx !== "" ? 'toast.task.updated' : 'toast.task.saved'));

      ui.elements.pendingInput.value = "";
      ui.elements.editPenIdx.value = "";
      if (ui.elements.pendingPriority) ui.elements.pendingPriority.value = 'media';
      ui.elements.btnSavePen.innerText = tr('pending.save');
      if (ui.elements.pendingDesc) ui.elements.pendingDesc.value = "";
      if (ui.elements.pendingDeadline) ui.elements.pendingDeadline.value = "";

      // Collapse the form
      if (ui.elements.pendingFormCollapse) {
        ui.elements.pendingFormCollapse.style.display = 'none';
      }
      if (ui.elements.btnTogglePendingForm) {
        ui.elements.btnTogglePendingForm.innerText = tr('pending.add.toggle');
      }

      // Reset photo
      if (ui.elements.pendingTaskImage) ui.elements.pendingTaskImage.value = '';
      if (ui.elements.pendingImageFile) ui.elements.pendingImageFile.value = '';
      if (ui.elements.pendingImageLabel) ui.elements.pendingImageLabel.innerText = tr('pending.photo.none.label');
      if (ui.elements.pendingImagePreviewContainer) ui.elements.pendingImagePreviewContainer.style.display = 'none';
      if (ui.elements.btnRemovePendingImage) ui.elements.btnRemovePendingImage.style.display = 'none';
    };
  }

  // Destination selection logic inside task-associated shopping list form
  if (ui.elements.savedListFormDestination) {
    ui.elements.savedListFormDestination.onchange = () => {
      const dest = ui.elements.savedListFormDestination.value;
      if (ui.elements.savedListFormNewNameContainer) {
        ui.elements.savedListFormNewNameContainer.style.display = dest === 'new' ? 'block' : 'none';
      }
      if (ui.elements.savedListFormExistingContainer) {
        ui.elements.savedListFormExistingContainer.style.display = dest === 'existing' ? 'block' : 'none';
      }
      
      // Populate existing select
      if (dest === 'existing' && ui.elements.savedListFormExistingSelect) {
        ui.elements.savedListFormExistingSelect.innerHTML = '';
        const lists = state.getSavedShoppingLists();
        if (lists.length === 0) {
          const opt = document.createElement('option');
          opt.value = '';
          opt.innerText = tr('saved.no.lists') || 'No hay listas guardadas';
          ui.elements.savedListFormExistingSelect.appendChild(opt);
        } else {
          lists.forEach(l => {
            const opt = document.createElement('option');
            opt.value = l.id;
            opt.innerText = l.name;
            ui.elements.savedListFormExistingSelect.appendChild(opt);
          });
        }
      }
    };
  }

  // Save Saved List Form (from Pending Screen)
  if (ui.elements.btnSaveSavedListForm) {
    ui.elements.btnSaveSavedListForm.onclick = () => {
      const dest = ui.elements.savedListFormDestination ? ui.elements.savedListFormDestination.value : 'general';
      const name = ui.elements.savedListFormName.value.trim();
      const raw = ui.elements.savedListFormItems.value.trim();

      if (!raw) {
        ui.showToast(tr('toast.list.items.empty'), "warning");
        return;
      }

      // Parse items
      const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
      const parsedItems = [];
      lines.forEach(line => {
        const tags = [];
        let cleanLine = line;
        const tagMatches = [...line.matchAll(/#([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_]+)/g)];
        if (tagMatches.length > 0) {
          tagMatches.forEach(m => tags.push(m[1]));
          cleanLine = line.replace(/#([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_]+)/g, '').trim();
        }

        const qtyMatch = cleanLine.match(/\s+(?:x|×)(\d+\S*)$/i) || cleanLine.match(/\s+\(([^)]+)\)$/);
        const qty = qtyMatch ? qtyMatch[1] : '';
        const itemName = qtyMatch ? cleanLine.slice(0, cleanLine.length - qtyMatch[0].length).trim() : cleanLine;
        if (itemName) {
          parsedItems.push({ name: itemName, qty, tags });
        }
      });

      if (parsedItems.length === 0) {
        ui.showToast(tr('toast.list.items.empty'), "warning");
        return;
      }

      if (dest === 'general') {
        state.saveShoppingItemsBulk(parsedItems, 'casa');
        ui.showToast(tr('toast.items.added.general') || 'Artículos añadidos a la lista general');
      } else if (dest === 'existing') {
        const listId = ui.elements.savedListFormExistingSelect ? ui.elements.savedListFormExistingSelect.value : '';
        if (!listId) {
          ui.showToast(tr('saved.no.lists') || 'No hay listas guardadas', "warning");
          return;
        }
        parsedItems.forEach(item => {
          state.addItemToSavedList(listId, item.name, item.qty, item.tags);
        });
        ui.showToast(tr('toast.items.added.existing') || 'Artículos añadidos a la lista guardada');
      } else { // dest === 'new'
        if (!name) {
          ui.showToast(tr('toast.list.name.empty'), "warning");
          return;
        }
        const currentLists = state.getSavedShoppingLists();
        if (currentLists.length >= 10) {
          ui.showToast(tr('toast.list.limit'), "warning");
          return;
        }
        const createdList = state.createSavedShoppingList(name);
        if (!createdList) {
          ui.showToast(tr('toast.list.limit'), "warning");
          return;
        }
        parsedItems.forEach(item => {
          state.addItemToSavedList(createdList.id, item.name, item.qty, item.tags);
        });
        ui.showToast(tr('toast.list.created', { name }));
      }

      // Clear and collapse
      ui.elements.savedListFormName.value = '';
      ui.elements.savedListFormItems.value = '';
      if (ui.elements.savedListFormDestination) {
        ui.elements.savedListFormDestination.value = 'general';
      }
      if (ui.elements.savedListFormNewNameContainer) {
        ui.elements.savedListFormNewNameContainer.style.display = 'none';
      }
      if (ui.elements.savedListFormExistingContainer) {
        ui.elements.savedListFormExistingContainer.style.display = 'none';
      }
      if (ui.elements.savedListFormCollapse) {
        ui.elements.savedListFormCollapse.style.display = 'none';
      }
      if (ui.elements.btnToggleSavedListForm) {
        ui.elements.btnToggleSavedListForm.innerText = tr('pending.add.list.toggle');
      }

      ui.renderSavedLists();
      ui.renderShoppingList();
    };
  }

  // Template modal form actions
  if (ui.elements.btnSaveTpl) {
    ui.elements.btnSaveTpl.onclick = () => {
      const name = ui.elements.tplName.value.trim();
      const pts = ui.elements.tplPts.value.trim();
      const idx = ui.elements.editTplIndex.value;

      if (!name || !pts) {
        ui.showToast(tr('toast.routine.empty'), "warning");
        return;
      }

      state.saveTemplateItem(name, pts, idx);
      ui.showToast(tr(idx !== "" ? 'toast.routine.updated' : 'toast.routine.saved'));
      ui.resetTplForm();
      ui.renderTemplates();
    };
  }

  if (ui.elements.btnDeleteTpl) {
    ui.elements.btnDeleteTpl.onclick = () => {
      const idx = ui.elements.editTplIndex.value;
      if (idx !== "") {
        ui.showConfirm(tr('confirm.delete.routine'), () => {
          state.deleteTemplateItem(parseInt(idx));
          ui.resetTplForm();
          ui.renderTemplates();
          ui.showToast(tr('toast.routine.deleted'));
        });
      }
    };
  }

  if (ui.elements.btnRedeemBank) {
    ui.elements.btnRedeemBank.onclick = () => ui.redeemPoints();
  }

  if (ui.elements.searchInput) {
    ui.elements.searchInput.onkeyup = () => ui.renderTemplates();
  }

  // Profiles management buttons
  if (ui.elements.btnOpenUsers) {
    ui.elements.btnOpenUsers.onclick = () => {
      ui.elements.configModal.classList.remove('visible');
      ui.elements.configModal.style.display = 'none';
      ui.openModal(ui.elements.usersModal);
    };
  }
  if (ui.elements.btnCloseUsers || ui.elements.btnBackToConfig) {
    const backBtnAction = () => {
      ui.elements.usersModal.classList.remove('visible');
      ui.elements.usersModal.style.display = 'none';
      ui.openModal(ui.elements.configModal);
    };
    if (ui.elements.btnCloseUsers) ui.elements.btnCloseUsers.onclick = backBtnAction;
    if (ui.elements.btnBackToConfig) ui.elements.btnBackToConfig.onclick = backBtnAction;
  }

  if (ui.elements.btnAddNewUser) {
    ui.elements.btnAddNewUser.onclick = () => {
      const id = 'u' + Date.now();
      const randomColor = state.COLORS[state.store.config.users.length % state.COLORS.length];

      state.store.config.users.push({
        id: id,
        name: 'Nuevo Perfil',
        color: randomColor,
        meta: 15,
        bank: 0
      });

      state.saveState();
      ui.renderTemplates();
      ui.updateUI();
      ui.showToast(tr('toast.profile.added'));
    };
  }

  // General configuration buttons
  if (ui.elements.btnSaveConfig) {
    ui.elements.btnSaveConfig.onclick = () => {
      const workDays = parseInt(ui.elements.inputWorkDays.value) || 6;
      state.store.config.days = workDays;
      if (ui.elements.toggleAiMotivation) {
        state.store.config.aiMotivation = ui.elements.toggleAiMotivation.checked;
      }
      state.saveState();
      ui.closeModal(ui.elements.configModal);
      ui.showToast(tr('toast.settings.saved'));
    };
  }

  // Members & invite
  if (ui.elements.btnInvite) {
    ui.elements.btnInvite.onclick = handleInvite;
  }
  if (ui.elements.btnCopyInvite) {
    ui.elements.btnCopyInvite.onclick = () => {
      if (ui.elements.inviteLink && ui.elements.inviteLink.value) {
        navigator.clipboard.writeText(ui.elements.inviteLink.value);
        ui.showToast(tr('toast.invite.copied'));
      }
    };
  }

  // Rename room (owner)
  if (ui.elements.btnRenameRoom) {
    ui.elements.btnRenameRoom.onclick = () => {
      const newName = ui.elements.newRoomNameInput.value.trim();
      if (!newName) return;

      ui.showConfirm(tr('confirm.rename', { name: newName }), async () => {
        try {
          await renameRoom(state.currentRoomId, newName);
          currentRoomMeta = { ...(currentRoomMeta || {}), name: newName };
          state.setCurrentRoomName(newName);
          if (ui.elements.roomTitleDisplay) ui.elements.roomTitleDisplay.innerText = newName;
          if (ui.elements.codeDisplay) ui.elements.codeDisplay.innerText = newName;
          ui.elements.newRoomNameInput.value = "";
          ui.showToast(tr('toast.room.renamed'));
        } catch (error) {
          console.error(error);
          ui.showToast(tr('toast.room.rename.err'), "error");
        }
      });
    };
  }

  if (ui.elements.btnWeeklyReset) {
    ui.elements.btnWeeklyReset.onclick = () => {
      ui.showConfirm(tr('confirm.weekly.reset'), () => {
        state.weeklyResetState();
        ui.closeModal(ui.elements.configModal);
        ui.showToast(tr('toast.weekly.reset'));
      });
    };
  }

  if (ui.elements.btnHardReset) {
    ui.elements.btnHardReset.onclick = () => {
      ui.showConfirm(tr('confirm.hard.reset'), () => {
        state.hardResetState();
        ui.closeModal(ui.elements.configModal);
        ui.showToast(tr('toast.hard.reset'));
      });
    };
  }

  // Leave room (member)
  if (ui.elements.btnLeaveRoom) {
    ui.elements.btnLeaveRoom.onclick = () => {
      ui.showConfirm(tr('confirm.leave.room'), async () => {
        try {
          const user = getCurrentUser();
          await removeMember(state.currentRoomId, user.uid);
          backToRooms();
        } catch (error) {
          console.error(error);
          ui.showToast(tr('toast.leave.err'), "error");
        }
      });
    };
  }

  // Delete room (owner)
  if (ui.elements.btnDeleteRoom) {
    ui.elements.btnDeleteRoom.onclick = () => {
      ui.showConfirm(tr('confirm.delete.room'), async () => {
        try {
          await deleteRoom(state.currentRoomId);
          backToRooms();
        } catch (error) {
          console.error(error);
          ui.showToast(tr('toast.delete.room.err'), "error");
        }
      });
    };
  }

  // Back to rooms list
  if (ui.elements.btnLogout) {
    ui.elements.btnLogout.onclick = () => {
      ui.showConfirm(tr('confirm.back.rooms'), () => {
        backToRooms();
      });
    };
  }

  // Roadmap Sub-Tab Swapping
  if (ui.elements.btnTabRoadmapView) {
    ui.elements.btnTabRoadmapView.onclick = () => ui.toggleRoadmapTab('view');
  }
  if (ui.elements.btnTabRoadmapBuilder) {
    ui.elements.btnTabRoadmapBuilder.onclick = () => ui.toggleRoadmapTab('builder');
  }

  // Tree Progress Modal bindings
  if (ui.elements.btnShowProgressTree) {
    ui.elements.btnShowProgressTree.onclick = () => {
      ui.openModal(ui.elements.modalProgressTree);
      ui.renderFocusTree();
    };
  }
  if (ui.elements.btnCloseTreeModal) {
    ui.elements.btnCloseTreeModal.onclick = () => ui.closeModal(ui.elements.modalProgressTree);
  }
  if (ui.elements.btnTreeInfo) {
    ui.elements.btnTreeInfo.onclick = () => ui.openModal(ui.elements.modalTreeInfo);
  }
  if (ui.elements.btnCloseTreeInfo) {
    ui.elements.btnCloseTreeInfo.onclick = () => ui.closeModal(ui.elements.modalTreeInfo);
  }
  if (ui.elements.btnCloseTreeInfoOk) {
    ui.elements.btnCloseTreeInfoOk.onclick = () => ui.closeModal(ui.elements.modalTreeInfo);
  }

  // Builder inner sub-tabs (Pendientes / Rutinas / Personal)
  if (ui.elements.btnBuilderSubPending) {
    ui.elements.btnBuilderSubPending.onclick = () => ui.toggleBuilderSubtab('pending');
  }
  if (ui.elements.btnBuilderSubRoutine) {
    ui.elements.btnBuilderSubRoutine.onclick = () => ui.toggleBuilderSubtab('routine');
  }
  if (ui.elements.btnBuilderSubPersonal) {
    ui.elements.btnBuilderSubPersonal.onclick = () => ui.toggleBuilderSubtab('personal');
  }

  // "Ver plan →" jumps to the plan view once you've added blocks
  if (ui.elements.btnBuilderGoToPlan) {
    ui.elements.btnBuilderGoToPlan.onclick = () => ui.toggleRoadmapTab('view');
  }

  // Personal free activity: add and STAY in the builder (allows adding several)
  if (ui.elements.btnAddCustomToRoadmap) {
    const addCustom = () => {
      const input = ui.elements.inputRoadmapCustom;
      const val = input.value.trim();
      if (!val) {
        ui.showToast(tr('toast.personal.empty'), "warning");
        return;
      }
      state.addRoadmapItem(val, 'personal', 0);
      ui.showToast(tr('toast.personal.added', { name: val }));
      input.value = "";
      input.focus();
      ui.updateBuilderCount();
    };
    ui.elements.btnAddCustomToRoadmap.onclick = addCustom;
    if (ui.elements.inputRoadmapCustom) {
      ui.elements.inputRoadmapCustom.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); addCustom(); }
      });
    }
  }
}

/* ------------------------------------------------------------------ */
/* SESSION START                                                      */
/* ------------------------------------------------------------------ */

// After login: handle an invite link if present, otherwise show rooms.
async function startSession(user) {
  ui.setRoomsUserLabel(user.email || 'Sesión iniciada');

  const params = new URLSearchParams(location.search);
  const invite = params.get('invite');
  if (invite) {
    // Clean the URL so a refresh doesn't re-trigger the invite.
    history.replaceState(null, '', location.pathname);
    try {
      const roomId = await acceptInvite(invite, user);
      await connectToRoom(roomId);
      ui.showToast(tr('toast.joined'));
      return;
    } catch (e) {
      if (e.code === 'limit/members') {
        ui.showToast(tr('toast.invite.full', { max: MAX_MEMBERS_PER_ROOM }), "error");
      } else if (e.code === 'invite/invalid') {
        ui.showToast(tr('toast.invite.invalid'), "error");
      } else {
        console.error(e);
        ui.showToast(tr('toast.invite.accept.err'), "error");
      }
    }
  }

  openRoomsScreen();
}

function handleAuthState(user) {
  if (user) {
    ui.hideAuthScreen();
    if (!appStarted) {
      appStarted = true;
      startSession(user);
    }
  } else {
    appStarted = false;
    ui.showAuthScreen();
  }
}

// ── i18n + theme helpers ─────────────────────────────────────────

function initTheme() {
  const saved = localStorage.getItem('prodTrackerTheme') || 'light';
  applyTheme(saved);
  const toggle = document.getElementById('toggleDarkMode');
  if (toggle) toggle.checked = (saved === 'dark');
}

function applyTheme(theme) {
  localStorage.setItem('prodTrackerTheme', theme);
  document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : '';
}

function syncLangButtons(lang) {
  const es = document.getElementById('btnLangEs');
  const en = document.getElementById('btnLangEn');
  if (!es || !en) return;
  es.classList.toggle('active', lang === 'es');
  en.classList.toggle('active', lang === 'en');
  es.style.background = lang === 'es' ? 'var(--active-color)' : 'transparent';
  es.style.color      = lang === 'es' ? '#fff' : 'var(--text-muted)';
  es.style.borderColor= lang === 'es' ? 'var(--active-color)' : 'var(--card-border)';
  en.style.background = lang === 'en' ? 'var(--active-color)' : 'transparent';
  en.style.color      = lang === 'en' ? '#fff' : 'var(--text-muted)';
  en.style.borderColor= lang === 'en' ? 'var(--active-color)' : 'var(--card-border)';
}

function initDraggableFab() {
  const fab = document.getElementById('mainFab');
  if (!fab) return;

  // Restore saved position
  const sL = localStorage.getItem('fabLeft');
  const sB = localStorage.getItem('fabBottom');
  if (sL !== null) {
    fab.style.left   = sL;
    fab.style.right  = 'auto';
    fab.style.bottom = sB ?? '20px';
  }

  let dragging = false;
  let moved = false;
  let ox = 0, oy = 0, startL = 0, startB = 0;

  fab.addEventListener('pointerdown', e => {
    dragging = true;
    moved = false;
    fab.setPointerCapture(e.pointerId);
    ox = e.clientX;
    oy = e.clientY;
    const r = fab.getBoundingClientRect();
    startL = r.left;
    startB = window.innerHeight - r.bottom;
    fab.classList.add('dragging');
    e.preventDefault();
  });

  fab.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - ox;
    const dy = e.clientY - oy;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) moved = true;
    const sz = 56;
    const nl = Math.max(8, Math.min(window.innerWidth  - sz - 8, startL + dx));
    const nb = Math.max(8, Math.min(window.innerHeight - sz - 8, startB - dy));
    fab.style.left   = nl + 'px';
    fab.style.right  = 'auto';
    fab.style.bottom = nb + 'px';
  });

  fab.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    fab.classList.remove('dragging');
    if (moved) {
      localStorage.setItem('fabLeft',   fab.style.left);
      localStorage.setItem('fabBottom', fab.style.bottom);
    }
  });

  // Absorb click when drag happened so template modal doesn't open
  fab.addEventListener('click', e => {
    if (moved) { e.stopImmediatePropagation(); moved = false; }
  }, true);
}

// ── Initial Load Handler ─────────────────────────────────────────
function initApp() {
  ui.initDomElements();
  initI18n();
  initTheme();
  syncLangButtons(getLang());
  bindAuthEvents();
  bindRoomsEvents();
  bindEvents();
  initTabSwipe();
  initDraggableFab();

  state.registerUiRenderer(() => ui.updateUI());

  startClock();

  // Gate everything behind authentication. Rooms (and their data) are only
  // accessed after a user is confirmed, satisfying the secured DB rules.
  observeAuthState(handleAuthState);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
