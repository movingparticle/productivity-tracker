import * as state from "./src/js/state";
import * as ui from "./src/js/ui";
import { connectToRoomDb, lookupUserRoom, renameRoomDb } from "./src/js/firebase";

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

  // Bind connection listener
  connectToRoomDb(roomId, (newState) => {
    state.setRoomState(roomId, newState);
    ui.showSyncIndicator();
  });
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
      ui.showConfirm("¿Estás seguro de que deseas salir de esta sala?", () => {
        localStorage.removeItem('prodTrackerRoom');
        location.reload();
      });
    };
  }
}

// Initial Load Handler
function initApp() {
  ui.initDomElements();
  bindEvents();
  
  // Register dynamic rendering hook to state updates
  state.registerUiRenderer(() => ui.updateUI());

  // Clock
  startClock();

  // Connect to room if cached in browser
  const savedRoom = localStorage.getItem('prodTrackerRoom');
  if (savedRoom) {
    connectToRoom(savedRoom);
  }
}

// Execute when DOM content is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
