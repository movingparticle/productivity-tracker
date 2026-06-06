import * as state from "./src/js/state";
import * as ui from "./src/js/ui";
import {
  connectToRoomDb,
  lookupUserRoom,
  renameRoomDb,
  observeAuthState,
  loginWithGoogle,
  logoutUser,
  getCurrentUser,
  rememberUserRoom,
  getUserRoom,
  clearUserRoom
} from "./src/js/firebase";

// Ensures the room connection only happens once per authenticated session
let appStarted = false;

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

// Room Connection Handler
function connectToRoom(roomId) {
  state.setCurrentRoomId(roomId);
  
  if (ui.elements.loginScreen) {
    ui.elements.loginScreen.classList.add('hidden');
  }
  if (ui.elements.codeDisplay) {
    ui.elements.codeDisplay.innerText = roomId;
  }
  if (ui.elements.roomTitleDisplay) {
    ui.elements.roomTitleDisplay.innerText = "Sala: " + roomId;
  }

  // Remember this room for the account so it auto-reconnects on any device
  const user = getCurrentUser();
  if (user) {
    rememberUserRoom(user.uid, roomId);
  }

  // Bind connection listener
  connectToRoomDb(roomId, (newState) => {
    state.setRoomState(roomId, newState);
    ui.showSyncIndicator();
  });
}

// Handle Google sign-in
async function handleGoogleLogin() {
  ui.clearAuthError();
  const btn = ui.elements.btnGoogleLogin;
  if (btn) btn.disabled = true;

  try {
    await loginWithGoogle();
    // onAuthStateChanged will take over from here (shows room login / app)
  } catch (error) {
    console.error("Auth error:", error);
    ui.showAuthError(authErrorMessage(error));
  } finally {
    if (btn) btn.disabled = false;
  }
}

// Auth-related event bindings
function bindAuthEvents() {
  if (ui.elements.btnGoogleLogin) {
    ui.elements.btnGoogleLogin.onclick = handleGoogleLogin;
  }

  if (ui.elements.btnSignOut) {
    ui.elements.btnSignOut.onclick = () => {
      ui.showConfirm("¿Cerrar sesión de tu cuenta?", async () => {
        try {
          await logoutUser();
          // Full reset of UI state for a clean logged-out screen
          location.reload();
        } catch (error) {
          console.error(error);
          ui.showToast("No se pudo cerrar sesión. Intenta de nuevo.", "error");
        }
      });
    };
  }
}

// Event Bindings
function bindEvents() {
  // 1. Enter Room Button
  if (ui.elements.btnEnterRoom) {
    ui.elements.btnEnterRoom.onclick = async () => {
      const uVal = ui.elements.userInput.value.trim().toUpperCase();
      const rVal = ui.elements.roomInput.value.trim().toUpperCase();

      if (uVal.length < 1 && rVal.length < 1) {
        ui.showToast("Ingresa un Usuario o una Sala para acceder.", "warning");
        return;
      }

      try {
        if (uVal.length > 0) {
          const matchedRoom = await lookupUserRoom(uVal);
          if (matchedRoom) {
            connectToRoom(matchedRoom);
            ui.showToast(`Bienvenido de nuevo, ${uVal}`);
          } else {
            ui.showToast("Usuario no registrado. Accede usando el nombre de tu Sala.", "error");
          }
        } else if (rVal.length > 0) {
          connectToRoom(rVal);
          ui.showToast(`Conectado a la sala: ${rVal}`);
        }
      } catch (error) {
        console.error("Connection Error:", error);
        if (rVal.length > 0) {
          connectToRoom(rVal);
        } else {
          ui.showToast("Error de red. Intenta ingresando el código de la sala directamente.", "error");
        }
      }
    };
  }

  // 2. Navigation Item Clicks
  const navItems = [
    { id: 'navTrackerBtn', target: 'tracker' },
    { id: 'navPendingBtn', target: 'pending' },
    { id: 'navMetricsBtn', target: 'metrics' }
  ];

  navItems.forEach(item => {
    const btn = document.getElementById(item.id);
    if (btn) {
      btn.onclick = () => ui.navTo(item.target, btn);
    }
  });

  // 3. Modals and Overlays toggles
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

  // 4. Save Pending Task Form
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
      
      // Reset form fields
      ui.elements.pendingInput.value = "";
      ui.elements.editPenIdx.value = "";
      ui.elements.btnSavePen.innerText = "Guardar";
    };
  }

  // 5. Template modal form actions
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

  // 6. Users management buttons
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
        name: 'Nuevo Miembro',
        color: randomColor,
        meta: 15,
        bank: 0
      });
      
      state.saveState();
      ui.renderTemplates(); // Update dynamic values if necessary
      ui.updateUI();
      ui.showToast("Nuevo miembro añadido al equipo");
    };
  }

  // 7. General configuration buttons
  if (ui.elements.btnSaveConfig) {
    ui.elements.btnSaveConfig.onclick = () => {
      const workDays = parseInt(ui.elements.inputWorkDays.value) || 6;
      state.store.config.days = workDays;
      state.saveState();
      ui.closeModal(ui.elements.configModal);
      ui.showToast("Ajustes guardados correctamente");
    };
  }

  if (ui.elements.btnRenameRoom) {
    ui.elements.btnRenameRoom.onclick = () => {
      const newName = ui.elements.newRoomNameInput.value.trim().toUpperCase();
      if (!newName || newName === state.currentRoomId) return;

      ui.showConfirm(`¿Migrar todos los datos a la sala "${newName}"? El código anterior dejará de funcionar.`, async () => {
        try {
          const oldRoomId = state.currentRoomId;
          await renameRoomDb(oldRoomId, newName, state.store);
          
          state.setCurrentRoomId(newName);
          ui.elements.newRoomNameInput.value = "";
          ui.closeModal(ui.elements.configModal);
          
          ui.showToast(`Sala renombrada con éxito a ${newName}`);
          // Reload to establish fresh connection structure
          setTimeout(() => location.reload(), 1500);
        } catch (error) {
          console.error(error);
          ui.showToast("Error al renombrar la sala. Verifica tu conexión.", "error");
        }
      });
    };
  }

  if (ui.elements.btnWeeklyReset) {
    ui.elements.btnWeeklyReset.onclick = () => {
      ui.showConfirm("🔄 ¿RESETEO SEMANAL?\nSe borrará el acumulado de esta semana y el log de hoy. Se conservan usuarios, ahorros y rutinas.", () => {
        state.weeklyResetState();
        ui.closeModal(ui.elements.configModal);
        ui.showToast("Progreso semanal reiniciado");
      });
    };
  }

  if (ui.elements.btnHardReset) {
    ui.elements.btnHardReset.onclick = () => {
      ui.showConfirm("⚠️ ¿RESET TOTAL?\nEsto borrará ABSOLUTAMENTE todos los registros, usuarios, rutinas y datos de la base de datos.", () => {
        state.hardResetState();
        ui.closeModal(ui.elements.configModal);
        ui.showToast("La base de datos ha sido borrada.");
      });
    };
  }

  // 8. Stats Screen Buttons & Copy/Logout Actions
  if (ui.elements.codeDisplay) {
    ui.elements.codeDisplay.onclick = () => {
      const textToCopy = ui.elements.codeDisplay.innerText;
      if (textToCopy && textToCopy !== "---") {
        navigator.clipboard.writeText(textToCopy);
        ui.showToast("¡Código copiado al portapapeles!");
      }
    };
  }

  if (ui.elements.btnLogout) {
    ui.elements.btnLogout.onclick = () => {
      ui.showConfirm("¿Estás seguro de que deseas salir de esta sala?", async () => {
        localStorage.removeItem('prodTrackerRoom');
        const user = getCurrentUser();
        if (user) await clearUserRoom(user.uid);
        location.reload();
      });
    };
  }
}

// Decide what to show once we know the room for a logged-in user.
async function routeAuthenticatedUser(user) {
  // Prefer the room cached in this browser; otherwise look up the
  // account's last room (so it works across devices).
  let savedRoom = localStorage.getItem('prodTrackerRoom');
  if (!savedRoom) {
    savedRoom = await getUserRoom(user.uid);
  }

  if (savedRoom) {
    connectToRoom(savedRoom);
  } else {
    ui.showRoomLogin();
  }
}

// React to login / logout
function handleAuthState(user) {
  if (user) {
    ui.hideAuthScreen();
    if (!appStarted) {
      appStarted = true;
      routeAuthenticatedUser(user);
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
  bindEvents();

  // Register dynamic rendering hook to state updates
  state.registerUiRenderer(() => ui.updateUI());

  // Clock
  startClock();

  // Gate the whole app behind authentication. The room connection only
  // happens after a user is confirmed, so the secured database rules
  // (auth != null) are always satisfied.
  observeAuthState(handleAuthState);
}

// Execute when DOM content is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
