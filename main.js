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
  MAX_ROOMS_PER_OWNER,
  MAX_MEMBERS_PER_ROOM
} from "./src/js/firebase";

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
    if (ui.elements.createRoomHint) {
      ui.elements.createRoomHint.innerText =
        `Tienes ${owned}/${MAX_ROOMS_PER_OWNER} salas propias. Cada sala admite hasta ${MAX_MEMBERS_PER_ROOM} miembros.`;
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
    if (e.code === 'limit/rooms') {
      ui.showRoomsError(`Solo puedes crear ${MAX_ROOMS_PER_OWNER} salas. Elimina una para crear otra.`);
    } else {
      console.error(e);
      ui.showRoomsError("No se pudo crear la sala. Revisa las reglas de Firebase.");
    }
  } finally {
    ui.elements.btnCreateRoom.disabled = false;
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
}

// Event Bindings (in-app)
function bindEvents() {
  // Navigation Item Clicks
  const navItems = [
    { id: 'navTrackerBtn', target: 'tracker' },
    { id: 'navRoadmapBtn', target: 'roadmap' },
    { id: 'navPendingBtn', target: 'pending' },
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
      const idx = ui.elements.editPenIdx.value;

      if (!name) {
        ui.showToast("El nombre de la tarea no puede estar vacío.", "warning");
        return;
      }

      state.savePendingTask(name, pts, idx);
      ui.showToast(idx !== "" ? "Tarea actualizada" : "Tarea guardada");

      ui.elements.pendingInput.value = "";
      ui.elements.editPenIdx.value = "";
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
