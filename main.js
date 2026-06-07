import * as state from "./src/js/state";
import * as ui from "./src/js/ui";
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
      return 'Cerraste la ventana de Google antes de terminar. Intenta de nuevo.';
    case 'auth/popup-blocked':
      return 'El navegador bloqueó la ventana de Google. Permite las ventanas emergentes e intenta de nuevo.';
    case 'auth/unauthorized-domain':
      return 'Este dominio no está autorizado en Firebase. Agrégalo en Authentication → Settings → Dominios autorizados.';
    case 'auth/operation-not-allowed':
      return 'El acceso con Google no está habilitado en Firebase. Actívalo en la consola.';
    case 'auth/network-request-failed':
      return 'Error de red. Revisa tu conexión.';
    default:
      return 'No se pudo iniciar sesión con Google. Intenta de nuevo.';
  }
}

// Clock and rollover check loop
function startClock() {
  const updateClock = () => {
    const now = new Date();
    const options = {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    };
    const dateStr = now.toLocaleDateString('es-ES', options);

    if (ui.elements.liveClockDisplay) {
      ui.elements.liveClockDisplay.innerText = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    }

    // Check if day rollover is needed
    state.checkDateAutoClose();
  };

  updateClock();
  setInterval(updateClock, 1000);
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
    ui.showRoomsError("No se pudo abrir la sala. Puede que ya no seas miembro.");
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
        ui.elements.createRoomHint.innerText =
          'Para crear tu propia sala necesitas un código de acceso o una suscripción. Mientras tanto, puedes unirte a salas con un código de invitación.';
      } else {
        ui.elements.createRoomHint.innerText =
          `Tienes ${owned}/${allowance} salas propias. Cada sala admite hasta ${MAX_MEMBERS_PER_ROOM} miembros.`;
      }
    }
  } catch (e) {
    console.error(e);
    ui.showRoomsError("No se pudieron cargar tus salas. Revisa tu conexión o las reglas de Firebase.");
  }
}

async function handleCreateRoom() {
  const user = getCurrentUser();
  const name = ui.elements.newRoomName.value.trim();
  if (!name) {
    ui.showRoomsError("Escribe un nombre para la sala.");
    return;
  }
  ui.clearRoomsError();
  ui.elements.btnCreateRoom.disabled = true;
  try {
    const roomId = await createRoom(user, name);
    ui.elements.newRoomName.value = '';
    await connectToRoom(roomId);
    ui.showToast(`Sala "${name}" creada`);
  } catch (e) {
    if (e.code === 'limit/needPro') {
      ui.showRoomsError("Necesitas un código de acceso o una suscripción para crear salas. Usa el campo \"Tengo un código de acceso\".");
    } else if (e.code === 'limit/rooms') {
      ui.showRoomsError(`Llegaste a tu límite de ${MAX_ROOMS_PRO} salas. Elimina una para crear otra.`);
    } else {
      console.error(e);
      ui.showRoomsError("No se pudo crear la sala. Revisa las reglas de Firebase.");
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
    ui.showRoomsError("Escribe tu código de acceso.");
    return;
  }
  ui.clearRoomsError();
  if (ui.elements.btnRedeemCode) ui.elements.btnRedeemCode.disabled = true;
  try {
    await redeemAccessCode(code, user);
    if (input) input.value = '';
    ui.showToast("🎉 ¡Código activado! Ya puedes crear salas y usar el asistente.");
    await refreshRoomsList();
  } catch (e) {
    if (e.code === 'code/invalid') {
      ui.showRoomsError("Código inválido. Revisa que esté bien escrito.");
    } else if (e.code === 'code/used') {
      ui.showRoomsError("Ese código ya fue usado por otra persona.");
    } else {
      console.error(e);
      ui.showRoomsError("No se pudo activar el código. Intenta de nuevo.");
    }
  } finally {
    if (ui.elements.btnRedeemCode) ui.elements.btnRedeemCode.disabled = false;
  }
}

async function handleJoinRoom() {
  const user = getCurrentUser();
  const code = ui.elements.joinCodeInput.value.trim().toUpperCase();
  if (!code) {
    ui.showRoomsError("Escribe el código de invitación.");
    return;
  }
  ui.clearRoomsError();
  ui.elements.btnJoinRoom.disabled = true;
  try {
    const roomId = await acceptInvite(code, user);
    ui.elements.joinCodeInput.value = '';
    await connectToRoom(roomId);
    ui.showToast("¡Te uniste a la sala!");
  } catch (e) {
    if (e.code === 'invite/invalid') {
      ui.showRoomsError("Código de invitación inválido o expirado.");
    } else if (e.code === 'limit/members') {
      ui.showRoomsError(`Esa sala ya está llena (${MAX_MEMBERS_PER_ROOM} miembros).`);
    } else {
      console.error(e);
      ui.showRoomsError("No se pudo unir a la sala.");
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
    ui.showToast("Enlace de invitación generado");
  } catch (e) {
    console.error(e);
    ui.showToast("No se pudo generar la invitación.", "error");
  }
}

function handleRemoveMember(uid) {
  const roomId = state.currentRoomId;
  ui.showConfirm("¿Quitar a este miembro de la sala?", async () => {
    try {
      await removeMember(roomId, uid);
      ui.showToast("Miembro eliminado");
    } catch (e) {
      console.error(e);
      ui.showToast("No se pudo quitar al miembro.", "error");
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
    ui.showToast("No se pudieron cargar tus salas.", "error");
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
  await connectToRoom(roomId);
  // Reset to the main tab for the new room.
  const trackerBtn = document.getElementById('navTrackerBtn');
  if (trackerBtn) ui.navTo('tracker', trackerBtn);
  ui.showToast("Sala cambiada");
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

  const thinking = ui.appendAgentMessage('Pensando…', 'bot');
  if (thinking) thinking.classList.add('agent-thinking');

  try {
    const reply = await askAssistant(prompt);
    if (thinking) {
      thinking.classList.remove('agent-thinking');
      thinking.innerText = reply || 'No tengo una respuesta para eso.';
    }
  } catch (e) {
    let msg = "No pude contactar al asistente. Revisa la configuración del agente.";
    if (e.code === 'limit') {
      msg = e.message || "Llegaste a tu límite diario gratis del asistente. Vuelve mañana.";
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
  ui.showConfirm("¿Cerrar sesión de tu cuenta?", async () => {
    try {
      await logoutUser();
      location.reload();
    } catch (error) {
      console.error(error);
      ui.showToast("No se pudo cerrar sesión. Intenta de nuevo.", "error");
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
 * Split a free-form block of text into shopping items.
 * Items are separated by new lines or commas. Each becomes { name, qty:'' }.
 */
function parseBulkLines(raw) {
  return String(raw || '')
    .split(/[\n,]+/)
    .map(s => s.trim())
    // Drop leading bullets/numbers like "1.", "- ", "• "
    .map(s => s.replace(/^[-*•\d.\)\s]+/, '').trim())
    .filter(Boolean)
    .map(name => ({ name, qty: '' }));
}

// Event Bindings (in-app)
function bindEvents() {
  // Navigation Item Clicks
  const navItems = [
    { id: 'navTrackerBtn', target: 'tracker' },
    { id: 'navRoadmapBtn', target: 'roadmap' },
    { id: 'navPendingBtn', target: 'pending' },
    { id: 'navShoppingBtn', target: 'shopping' },
    { id: 'navMetricsBtn', target: 'metrics' }
  ];
  navItems.forEach(item => {
    const btn = document.getElementById(item.id);
    if (btn) {
      btn.onclick = () => ui.navTo(item.target, btn);
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
      ui.showConfirm("¿Ir a tus salas (crear o unirte)?", () => backToRooms());
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
      if (ui.elements.shopImageFileName) ui.elements.shopImageFileName.innerText = 'Sin foto seleccionada';
      if (ui.elements.btnRemoveShopImage) ui.elements.btnRemoveShopImage.style.display = 'none';
      if (ui.elements.shopImagePreviewContainer) ui.elements.shopImagePreviewContainer.style.display = 'none';
      if (ui.elements.shopImagePreview) ui.elements.shopImagePreview.src = '';
    };
  }
  
  const resetShopForm = () => {
    if (ui.elements.shopItemName) ui.elements.shopItemName.value = '';
    if (ui.elements.shopItemQty) ui.elements.shopItemQty.value = '';
    selectedImageBase64 = null;
    if (ui.elements.shopItemImage) ui.elements.shopItemImage.value = '';
    if (ui.elements.shopImageFileName) ui.elements.shopImageFileName.innerText = 'Sin foto seleccionada';
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
        ui.showToast("Escribe el artículo o sube una foto.", "warning");
        return;
      }

      state.saveShoppingItem(name, qty, target, selectedImageBase64);
      ui.showToast("Artículo añadido a la lista");
      resetShopForm();
      ui.toggleShoppingTab('list');
    };
  }

  // Bulk: add the whole pasted/typed list as-is (one item per line/comma).
  if (ui.elements.btnAddBulkList) {
    ui.elements.btnAddBulkList.onclick = () => {
      const raw = ui.elements.shopBulkInput ? ui.elements.shopBulkInput.value : '';
      const target = ui.elements.shopItemUser ? ui.elements.shopItemUser.value : 'casa';
      const items = parseBulkLines(raw);
      if (items.length === 0) {
        ui.showToast("Escribe al menos un artículo.", "warning");
        return;
      }
      const count = state.saveShoppingItemsBulk(items, target);
      if (ui.elements.shopBulkInput) ui.elements.shopBulkInput.value = '';
      ui.showToast(`${count} artículo${count === 1 ? '' : 's'} añadido${count === 1 ? '' : 's'}`);
      ui.toggleShoppingTab('list');
    };
  }

  // Bulk: let the AI clean up the messy list into proper items.
  if (ui.elements.btnFixListAI) {
    ui.elements.btnFixListAI.onclick = async () => {
      const raw = ui.elements.shopBulkInput ? ui.elements.shopBulkInput.value.trim() : '';
      const target = ui.elements.shopItemUser ? ui.elements.shopItemUser.value : 'casa';
      if (!raw) {
        ui.showToast("Escribe tu lista primero.", "warning");
        return;
      }
      const btn = ui.elements.btnFixListAI;
      const original = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '✨ Ordenando...';
      try {
        const items = await fixShoppingListWithAI(raw);
        if (!items.length) {
          ui.showToast("No pude ordenar la lista. Intenta de nuevo.", "error");
          return;
        }
        const count = state.saveShoppingItemsBulk(items, target);
        if (ui.elements.shopBulkInput) ui.elements.shopBulkInput.value = '';
        ui.showToast(`✨ ${count} artículo${count === 1 ? '' : 's'} ordenado${count === 1 ? '' : 's'} y añadido${count === 1 ? '' : 's'}`);
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

  if (ui.elements.btnOpenConfig) {
    ui.elements.btnOpenConfig.onclick = () => {
      ui.openModal(ui.elements.configModal);
    };
  }
  if (ui.elements.btnCloseConfig) {
    ui.elements.btnCloseConfig.onclick = () => {
      ui.closeModal(ui.elements.configModal);
    };
  }

  if (ui.elements.mainFab) {
    ui.elements.mainFab.onclick = () => ui.openTemplateModal();
  }
  if (ui.elements.btnCloseTplModal) {
    ui.elements.btnCloseTplModal.onclick = () => {
      ui.closeModal(ui.elements.templateModal);
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
        ui.showToast("El nombre de la tarea no puede estar vacío.", "warning");
        return;
      }

      state.savePendingTask(name, pts, priority, idx);
      ui.showToast(idx !== "" ? "Tarea actualizada" : "Tarea guardada");

      ui.elements.pendingInput.value = "";
      ui.elements.editPenIdx.value = "";
      if (ui.elements.pendingPriority) ui.elements.pendingPriority.value = 'media';
      ui.elements.btnSavePen.innerText = "Guardar";
    };
  }

  // Template modal form actions
  if (ui.elements.btnSaveTpl) {
    ui.elements.btnSaveTpl.onclick = () => {
      const name = ui.elements.tplName.value.trim();
      const pts = ui.elements.tplPts.value.trim();
      const idx = ui.elements.editTplIndex.value;

      if (!name || !pts) {
        ui.showToast("Completa el nombre y valor de puntos de la rutina.", "warning");
        return;
      }

      state.saveTemplateItem(name, pts, idx);
      ui.showToast(idx !== "" ? "Rutina actualizada" : "Rutina creada");
      ui.resetTplForm();
      ui.renderTemplates();
    };
  }

  if (ui.elements.btnDeleteTpl) {
    ui.elements.btnDeleteTpl.onclick = () => {
      const idx = ui.elements.editTplIndex.value;
      if (idx !== "") {
        ui.showConfirm("¿Eliminar esta rutina permanentemente?", () => {
          state.deleteTemplateItem(parseInt(idx));
          ui.resetTplForm();
          ui.renderTemplates();
          ui.showToast("Rutina eliminada");
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
      ui.showToast("Nuevo perfil añadido");
    };
  }

  // General configuration buttons
  if (ui.elements.btnSaveConfig) {
    ui.elements.btnSaveConfig.onclick = () => {
      const workDays = parseInt(ui.elements.inputWorkDays.value) || 6;
      state.store.config.days = workDays;
      state.saveState();
      ui.closeModal(ui.elements.configModal);
      ui.showToast("Ajustes guardados correctamente");
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
        ui.showToast("Enlace copiado al portapapeles");
      }
    };
  }

  // Rename room (owner)
  if (ui.elements.btnRenameRoom) {
    ui.elements.btnRenameRoom.onclick = () => {
      const newName = ui.elements.newRoomNameInput.value.trim();
      if (!newName) return;

      ui.showConfirm(`¿Renombrar la sala a "${newName}"?`, async () => {
        try {
          await renameRoom(state.currentRoomId, newName);
          currentRoomMeta = { ...(currentRoomMeta || {}), name: newName };
          state.setCurrentRoomName(newName);
          if (ui.elements.roomTitleDisplay) ui.elements.roomTitleDisplay.innerText = newName;
          if (ui.elements.codeDisplay) ui.elements.codeDisplay.innerText = newName;
          ui.elements.newRoomNameInput.value = "";
          ui.showToast("Sala renombrada");
        } catch (error) {
          console.error(error);
          ui.showToast("No se pudo renombrar la sala.", "error");
        }
      });
    };
  }

  if (ui.elements.btnWeeklyReset) {
    ui.elements.btnWeeklyReset.onclick = () => {
      ui.showConfirm("🔄 ¿RESETEO SEMANAL?\nSe borrará el acumulado de esta semana y el log de hoy. Se conservan perfiles, ahorros y rutinas.", () => {
        state.weeklyResetState();
        ui.closeModal(ui.elements.configModal);
        ui.showToast("Progreso semanal reiniciado");
      });
    };
  }

  if (ui.elements.btnHardReset) {
    ui.elements.btnHardReset.onclick = () => {
      ui.showConfirm("⚠️ ¿RESET TOTAL?\nEsto borrará todos los registros, perfiles, rutinas y datos de ESTA sala.", () => {
        state.hardResetState();
        ui.closeModal(ui.elements.configModal);
        ui.showToast("Los datos de la sala han sido borrados.");
      });
    };
  }

  // Leave room (member)
  if (ui.elements.btnLeaveRoom) {
    ui.elements.btnLeaveRoom.onclick = () => {
      ui.showConfirm("¿Salir de esta sala? Dejarás de tener acceso a ella.", async () => {
        try {
          const user = getCurrentUser();
          await removeMember(state.currentRoomId, user.uid);
          backToRooms();
        } catch (error) {
          console.error(error);
          ui.showToast("No se pudo salir de la sala.", "error");
        }
      });
    };
  }

  // Delete room (owner)
  if (ui.elements.btnDeleteRoom) {
    ui.elements.btnDeleteRoom.onclick = () => {
      ui.showConfirm("⚠️ ¿Eliminar la sala para SIEMPRE?\nSe borran todos los datos y se expulsa a todos los miembros.", async () => {
        try {
          await deleteRoom(state.currentRoomId);
          backToRooms();
        } catch (error) {
          console.error(error);
          ui.showToast("No se pudo eliminar la sala.", "error");
        }
      });
    };
  }

  // Back to rooms list
  if (ui.elements.btnLogout) {
    ui.elements.btnLogout.onclick = () => {
      ui.showConfirm("¿Volver a tus salas?", () => {
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

  // Roadmap Lego Builder actions (Add Pending, Add Routine, Add Custom)
  if (ui.elements.btnAddPendingToRoadmap) {
    ui.elements.btnAddPendingToRoadmap.onclick = () => {
      const select = ui.elements.selectRoadmapPending;
      const val = select.value;
      if (val === "") {
        ui.showToast("Selecciona una tarea pendiente.", "warning");
        return;
      }
      const task = state.store.pendingList[parseInt(val)];
      if (task) {
        state.addRoadmapItem(task.name, 'pending', task.pts);
        ui.showToast("Tarea añadida al plan");
        select.value = "";
        ui.toggleRoadmapTab('view'); // Redirect to plan view
      }
    };
  }

  if (ui.elements.btnAddRoutineToRoadmap) {
    ui.elements.btnAddRoutineToRoadmap.onclick = () => {
      const select = ui.elements.selectRoadmapRoutine;
      const val = select.value;
      if (val === "") {
        ui.showToast("Selecciona una rutina.", "warning");
        return;
      }
      const routine = state.store.templates[parseInt(val)];
      if (routine) {
        state.addRoadmapItem(routine.name, 'routine', routine.pts);
        ui.showToast("Rutina añadida al plan");
        select.value = "";
        ui.toggleRoadmapTab('view'); // Redirect to plan view
      }
    };
  }

  if (ui.elements.btnAddCustomToRoadmap) {
    ui.elements.btnAddCustomToRoadmap.onclick = () => {
      const input = ui.elements.inputRoadmapCustom;
      const val = input.value.trim();
      if (!val) {
        ui.showToast("Escribe una actividad personal.", "warning");
        return;
      }
      state.addRoadmapItem(val, 'personal', 0);
      ui.showToast("Actividad personal añadida");
      input.value = "";
      ui.toggleRoadmapTab('view'); // Redirect to plan view
    };
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
      ui.showToast("¡Te uniste a la sala!");
      return;
    } catch (e) {
      if (e.code === 'limit/members') {
        ui.showToast(`La sala está llena (máx. ${MAX_MEMBERS_PER_ROOM}).`, "error");
      } else if (e.code === 'invite/invalid') {
        ui.showToast("Invitación inválida o expirada.", "error");
      } else {
        console.error(e);
        ui.showToast("No se pudo aceptar la invitación.", "error");
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

// Initial Load Handler
function initApp() {
  ui.initDomElements();
  bindAuthEvents();
  bindRoomsEvents();
  bindEvents();

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
