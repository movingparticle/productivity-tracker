import { updateTimeChart } from "./chart";
import { downloadReportPDF } from "./pdf";
import * as state from "./state";

// DOM References Cache
let elements = {};

/**
 * Caches all DOM elements used by the UI
 */
export function initDomElements() {
  elements = {
    // Auth screen
    authScreen: document.getElementById('authScreen'),
    btnGoogleLogin: document.getElementById('btnGoogleLogin'),
    authError: document.getElementById('authError'),
    btnSignOut: document.getElementById('btnSignOut'),

    // Rooms screen (Mis Salas)
    roomsScreen: document.getElementById('roomsScreen'),
    roomsUserLabel: document.getElementById('roomsUserLabel'),
    roomsList: document.getElementById('roomsList'),
    roomsEmpty: document.getElementById('roomsEmpty'),
    newRoomName: document.getElementById('newRoomName'),
    btnCreateRoom: document.getElementById('btnCreateRoom'),
    createRoomHint: document.getElementById('createRoomHint'),
    joinCodeInput: document.getElementById('joinCodeInput'),
    btnJoinRoom: document.getElementById('btnJoinRoom'),
    roomsError: document.getElementById('roomsError'),
    btnRoomsSignOut: document.getElementById('btnRoomsSignOut'),

    // Members & invite (in config modal)
    memberCount: document.getElementById('memberCount'),
    membersList: document.getElementById('membersList'),
    btnInvite: document.getElementById('btnInvite'),
    inviteBox: document.getElementById('inviteBox'),
    inviteLink: document.getElementById('inviteLink'),
    btnCopyInvite: document.getElementById('btnCopyInvite'),
    btnLeaveRoom: document.getElementById('btnLeaveRoom'),
    btnDeleteRoom: document.getElementById('btnDeleteRoom'),

    appContainer: document.getElementById('appContainer'),
    syncIndicator: document.getElementById('syncIndicator'),
    
    liveClockDisplay: document.getElementById('liveClockDisplay'),
    roomTitleDisplay: document.getElementById('roomTitleDisplay'),
    codeDisplay: document.getElementById('codeDisplay'),
    
    profileSwitcher: document.getElementById('profileSwitcher'),
    scoreCard: document.getElementById('scoreCard'),
    displayScore: document.getElementById('displayScore'),
    displayLabel: document.getElementById('displayLabel'),
    
    dailyText: document.getElementById('dailyText'),
    dailyBar: document.getElementById('dailyBar'),
    dailyRem: document.getElementById('dailyRem'),
    
    weeklyText: document.getElementById('weeklyText'),
    weeklyBar: document.getElementById('weeklyBar'),
    weeklyRem: document.getElementById('weeklyRem'),
    
    dailyLogList: document.getElementById('dailyLogList'),
    mainFab: document.getElementById('mainFab'),
    
    // Roadmap elements
    roadmapContainer: document.getElementById('roadmapContainer'),
    roadmapProfileSwitcher: document.getElementById('roadmapProfileSwitcher'),
    roadmapUserTitle: document.getElementById('roadmapUserTitle'),
    roadmapItemsList: document.getElementById('roadmapItemsList'),
    selectRoadmapPending: document.getElementById('selectRoadmapPending'),
    selectRoadmapRoutine: document.getElementById('selectRoadmapRoutine'),
    inputRoadmapCustom: document.getElementById('inputRoadmapCustom'),
    btnAddPendingToRoadmap: document.getElementById('btnAddPendingToRoadmap'),
    btnAddRoutineToRoadmap: document.getElementById('btnAddRoutineToRoadmap'),
    btnAddCustomToRoadmap: document.getElementById('btnAddCustomToRoadmap'),
    btnTabRoadmapView: document.getElementById('btnTabRoadmapView'),
    btnTabRoadmapBuilder: document.getElementById('btnTabRoadmapBuilder'),
    btnShowProgressTree: document.getElementById('btnShowProgressTree'),
    modalProgressTree: document.getElementById('modalProgressTree'),
    btnCloseTreeModal: document.getElementById('btnCloseTreeModal'),
    btnTreeInfo: document.getElementById('btnTreeInfo'),
    modalTreeInfo: document.getElementById('modalTreeInfo'),
    btnCloseTreeInfo: document.getElementById('btnCloseTreeInfo'),
    btnCloseTreeInfoOk: document.getElementById('btnCloseTreeInfoOk'),
    badgeWater: document.getElementById('badgeWater'),
    badgeFertilized: document.getElementById('badgeFertilized'),
    badgeBloomed: document.getElementById('badgeBloomed'),
    badgeWithered: document.getElementById('badgeWithered'),
    focusTreeSvgContainer: document.getElementById('focusTreeSvgContainer'),
    treeTooltip: document.getElementById('treeTooltip'),
    treeStatusHint: document.getElementById('treeStatusHint'),
    
    bonusAlert: document.getElementById('bonusAlert'),
    pendingInput: document.getElementById('pendingInput'),
    pendingPoints: document.getElementById('pendingPoints'),
    editPenIdx: document.getElementById('editPenIdx'),
    btnSavePen: document.getElementById('btnSavePen'),
    pendingListDisplay: document.getElementById('pendingListDisplay'),
    
    userPercentDisplay: document.getElementById('userPercentDisplay'),
    monthTotal: document.getElementById('monthTotal'),
    timeChartCanvas: document.getElementById('timeChart'),
    
    // Modals
    templateModal: document.getElementById('templateModal'),
    bankWidget: document.getElementById('bankWidget'),
    bankBalanceDisplay: document.getElementById('bankBalanceDisplay'),
    searchInput: document.getElementById('searchInput'),
    templateListDisplay: document.getElementById('templateListDisplay'),
    tplFormTitle: document.getElementById('tplFormTitle'),
    editTplIndex: document.getElementById('editTplIndex'),
    tplName: document.getElementById('tplName'),
    tplPts: document.getElementById('tplPts'),
    btnDeleteTpl: document.getElementById('btnDeleteTpl'),
    
    configModal: document.getElementById('configModal'),
    newRoomNameInput: document.getElementById('newRoomNameInput'),
    inputWorkDays: document.getElementById('inputWorkDays'),
    
    usersModal: document.getElementById('usersModal'),
    userConfigListFull: document.getElementById('userConfigListFull'),
    
    reportOverlay: document.getElementById('reportOverlay'),
    reportContent: document.getElementById('reportContent'),
    docDate: document.getElementById('docDate'),
    reportSummary: document.getElementById('reportSummary'),
    docBody: document.getElementById('docBody'),
    
    // Action Buttons cached for main.js binding
    btnOpenReport: document.getElementById('btnOpenReport'),
    btnCloseReport: document.getElementById('btnCloseReport'),
    btnDownloadPDF: document.getElementById('btnDownloadPDF'),
    btnOpenConfig: document.getElementById('btnOpenConfig'),
    btnCloseConfig: document.getElementById('btnCloseConfig'),
    btnCloseTplModal: document.getElementById('btnCloseTplModal'),
    btnSaveTpl: document.getElementById('btnSaveTpl'),
    btnOpenUsers: document.getElementById('btnOpenUsers'),
    btnCloseUsers: document.getElementById('btnCloseUsers'),
    btnAddNewUser: document.getElementById('btnAddNewUser'),
    btnSaveConfig: document.getElementById('btnSaveConfig'),
    btnRenameRoom: document.getElementById('btnRenameRoom'),
    btnWeeklyReset: document.getElementById('btnWeeklyReset'),
    btnHardReset: document.getElementById('btnHardReset'),
    btnLogout: document.getElementById('btnLogout'),
    btnBackToConfig: document.getElementById('btnBackToConfig'),
    btnRedeemBank: document.getElementById('btnRedeemBank'),
    
    // Shopping tab navigation and views caching
    navShoppingBtn: document.getElementById('navShoppingBtn'),
    screenShopping: document.getElementById('screenShopping'),
    btnTabShoppingList: document.getElementById('btnTabShoppingList'),
    btnTabShoppingAdd: document.getElementById('btnTabShoppingAdd'),
    shoppingListViewTab: document.getElementById('shoppingListViewTab'),
    shoppingAddTab: document.getElementById('shoppingAddTab'),
    
    // Shopping list input controls caching
    shopItemName: document.getElementById('shopItemName'),
    btnVoiceRecord: document.getElementById('btnVoiceRecord'),
    btnUploadImageTrigger: document.getElementById('btnUploadImageTrigger'),
    shopItemImage: document.getElementById('shopItemImage'),
    shopImageFileName: document.getElementById('shopImageFileName'),
    btnRemoveShopImage: document.getElementById('btnRemoveShopImage'),
    shopImagePreviewContainer: document.getElementById('shopImagePreviewContainer'),
    shopImagePreview: document.getElementById('shopImagePreview'),
    shopItemQty: document.getElementById('shopItemQty'),
    shopItemUser: document.getElementById('shopItemUser'),
    shopItemPts: document.getElementById('shopItemPts'),
    btnSaveShopItem: document.getElementById('btnSaveShopItem'),
    shoppingListDisplay: document.getElementById('shoppingListDisplay'),
    
    // Lightbox image viewer caching
    imageLightbox: document.getElementById('imageLightbox'),
    btnCloseLightbox: document.getElementById('btnCloseLightbox'),
    lightboxImage: document.getElementById('lightboxImage'),
    lightboxCaption: document.getElementById('lightboxCaption')
  };

  createToastContainer();
  createConfirmContainer();
}

/* --- TOAST SYSTEM (ELEGANT CUSTOM NOTIFICATIONS) --- */
let toastContainer = null;

function createToastContainer() {
  toastContainer = document.createElement('div');
  toastContainer.className = 'toast-container';
  document.body.appendChild(toastContainer);
}

export function showToast(message, type = 'success') {
  if (!toastContainer) createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // Custom icons based on toast type (inline SVGs for premium look)
  let icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-svg"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
  if (type === 'success') icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="icon-svg"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  else if (type === 'error') icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="icon-svg"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
  else if (type === 'warning') icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-svg"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';

  toast.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px;">
      <span class="icon-span">${icon}</span>
      <span>${message}</span>
    </div>
    <button class="toast-close" style="display:flex; align-items:center; justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
  `;

  toastContainer.appendChild(toast);

  // Trigger reflow to apply animation
  toast.offsetHeight;
  toast.classList.add('show');

  const closeToast = () => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => toast.remove());
  };

  toast.querySelector('.toast-close').onclick = closeToast;

  // Auto remove after 3.5 seconds
  setTimeout(closeToast, 3500);
}

/* --- CONFIRMATION SYSTEM (PREMIUM POPUPS) --- */
let confirmOverlay = null;

function createConfirmContainer() {
  confirmOverlay = document.createElement('div');
  confirmOverlay.className = 'confirm-overlay';
  confirmOverlay.innerHTML = `
    <div class="confirm-box">
      <div class="confirm-message" id="confirmMessage">¿Estás seguro?</div>
      <div class="confirm-actions">
        <button class="btn-confirm-no" id="confirmNoBtn">Cancelar</button>
        <button class="btn-confirm-yes" id="confirmYesBtn">Confirmar</button>
      </div>
    </div>
  `;
  document.body.appendChild(confirmOverlay);
}

export function showConfirm(message, onConfirm, onCancel = null) {
  if (!confirmOverlay) createConfirmContainer();
  
  document.getElementById('confirmMessage').innerText = message;
  confirmOverlay.classList.add('visible');
  
  const cleanUp = () => {
    confirmOverlay.classList.remove('visible');
    // Remove listeners to avoid accumulation
    document.getElementById('confirmYesBtn').onclick = null;
    document.getElementById('confirmNoBtn').onclick = null;
  };

  document.getElementById('confirmYesBtn').onclick = () => {
    cleanUp();
    if (onConfirm) onConfirm();
  };

  document.getElementById('confirmNoBtn').onclick = () => {
    cleanUp();
    if (onCancel) onCancel();
  };
}

/* --- SYNC STATUS INDICATOR --- */
export function showSyncIndicator() {
  if (elements.syncIndicator) {
    elements.syncIndicator.classList.add('show');
    setTimeout(() => {
      elements.syncIndicator.classList.remove('show');
    }, 1000);
  }
}

/* --- SCREEN SWAPPING --- */
export function navTo(screenId, navButton) {
  // Hide all screens
  document.querySelectorAll('.screen').forEach(x => x.classList.remove('active'));
  
  // Show active screen
  const targetId = 'screen' + (screenId.charAt(0).toUpperCase() + screenId.slice(1));
  const screenEl = document.getElementById(targetId);
  if (screenEl) {
    screenEl.classList.add('active');
  }

  // Handle active navigation item styles
  document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
  if (navButton) {
    navButton.classList.add('active');
  }

  // Render metrics if swapping to stats screen
  if (screenId === 'metrics') {
    renderMetrics();
  }
  
  // Initialize and load shopping tab contents
  if (screenId === 'shopping') {
    populateShoppingUsers();
    toggleShoppingTab('list');
  }
}

/* --- RENDER FUNCTIONS --- */

export function updateUI() {
  if (!elements.appContainer) return;
  
  renderProfileSwitcher();
  renderTracker();
  renderPending();
  renderMetrics();
  renderTemplates();
  renderUserConfigList();
  renderRoadmap();
  renderShoppingList();

  if (elements.inputWorkDays) {
    elements.inputWorkDays.value = state.store.config.days || 6;
  }
}

function renderProfileSwitcher() {
  const container = elements.profileSwitcher;
  if (!container) return;
  
  container.innerHTML = '';
  
  state.store.config.users.forEach(u => {
    const btn = document.createElement('button');
    btn.className = `profile-btn ${state.localProfileId === u.id ? 'active' : ''}`;
    btn.innerText = u.name;
    
    // Apply user color dynamically
    if (state.localProfileId === u.id) {
      btn.style.color = u.color;
      btn.style.borderBottom = `2px solid ${u.color}`;
      
      if (elements.scoreCard) {
        elements.scoreCard.style.borderTopColor = u.color;
      }
      if (elements.mainFab) {
        elements.mainFab.style.background = u.color;
      }
      
      document.documentElement.style.setProperty('--active-color', u.color);
    }
    
    btn.onclick = () => {
      state.changeProfile(u.id);
    };
    container.appendChild(btn);
  });
}

function renderTracker() {
  const activeUser = state.store.config.users.find(u => u.id === state.localProfileId) || state.store.config.users[0];
  if (!activeUser) return;

  // 1. Calculate active user's total points today
  let activePts = 0;
  state.store.todayLog.forEach(x => {
    if (x.who === state.localProfileId) activePts += x.pts;
  });

  // 2. Daily Goal Calculation
  const userMeta = activeUser.meta || 15;
  if (elements.displayScore) {
    elements.displayScore.innerText = activePts;
    elements.displayScore.style.color = activeUser.color;
  }
  if (elements.displayLabel) {
    elements.displayLabel.innerText = `Puntos de ${activeUser.name}`;
  }

  const dailyPercent = Math.min((activePts / userMeta) * 100, 100);
  if (elements.dailyBar) {
    elements.dailyBar.style.width = dailyPercent + "%";
    elements.dailyBar.style.background = activeUser.color;
  }
  if (elements.dailyText) {
    elements.dailyText.innerText = `${activePts} / ${userMeta}`;
  }

  const diff = userMeta - activePts;
  if (elements.dailyRem) {
    if (diff > 0) {
      elements.dailyRem.innerText = `Faltan: ${diff} pts`;
      elements.dailyRem.style.color = 'var(--text-muted)';
    } else {
      elements.dailyRem.innerText = `¡Meta superada! (+${Math.abs(diff)} para Ahorro)`;
      elements.dailyRem.style.color = 'var(--success)';
    }
  }

  // 3. Weekly Balance Calculation
  let weeklyPts = 0;
  if (state.store.history) {
    state.store.history.forEach(h => {
      if (h.points && h.points[state.localProfileId] !== undefined) {
        // Cap daily points at meta to calculate weekly progress fairly, matching original logic
        weeklyPts += Math.min(h.points[state.localProfileId], userMeta);
      }
    });
  }
  weeklyPts += Math.min(activePts, userMeta);

  const weeklyGoal = userMeta * (state.store.config.days || 6);
  const weeklyPercent = Math.min((weeklyPts / weeklyGoal) * 100, 100);
  
  if (elements.weeklyBar) {
    elements.weeklyBar.style.width = weeklyPercent + "%";
    elements.weeklyBar.style.background = `linear-gradient(90deg, ${activeUser.color}, #a855f7)`;
  }
  if (elements.weeklyText) {
    elements.weeklyText.innerText = `${weeklyPts} / ${weeklyGoal}`;
  }

  const wDiff = weeklyGoal - weeklyPts;
  if (elements.weeklyRem) {
    if (wDiff > 0) {
      elements.weeklyRem.innerText = `Faltan para cierre: ${wDiff} pts`;
      elements.weeklyRem.style.color = 'var(--text-muted)';
    } else {
      elements.weeklyRem.innerText = `¡Meta semanal cumplida!`;
      elements.weeklyRem.style.color = 'var(--success)';
    }
  }

  // 4. Daily Log Render
  const list = elements.dailyLogList;
  if (!list) return;
  list.innerHTML = '';
  
  // Render today's log in reverse chronological order
  [...state.store.todayLog].reverse().forEach(x => {
    const logUser = state.store.config.users.find(us => us.id === x.who);
    const col = logUser ? logUser.color : 'var(--text-muted)';
    const nam = logUser ? logUser.name : '???';
    
    let badgeHtml = `<span class="badge">+${x.pts}</span>`;
    if (x.name.includes("💎 Ahorro")) {
      badgeHtml = `<span class="badge badge-redeem">+${x.pts} (Ahorro)</span>`;
    }

    const item = document.createElement('div');
    item.className = 'log-item';
    item.innerHTML = `
      <div>
        <span class="log-time">${x.time}</span>
        <span style="color:${col}; font-weight:700; margin-right:6px;">${nam.substring(0, 5)}:</span>
        <span>${x.name}</span>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        ${badgeHtml}
        <button class="del-btn" data-id="${x.id}" style="display:flex; align-items:center; justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
      </div>
    `;

    item.querySelector('.del-btn').onclick = () => {
      showConfirm(`¿Borrar actividad "${x.name}"?`, () => {
        state.deleteLogEntry(x.id);
        showToast("Registro eliminado");
      });
    };

    list.appendChild(item);
  });
}

function renderPending() {
  const list = elements.pendingListDisplay;
  if (!list) return;
  
  list.innerHTML = '';
  
  state.store.pendingList.forEach((t, i) => {
    const card = document.createElement('div');
    card.className = 'pending-card';
    card.style.borderLeftColor = state.store.config.users[i % state.store.config.users.length]?.color || 'var(--text-muted)';
    card.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px; flex:1; overflow:hidden;">
        <button class="btn-check-card" style="display:flex; align-items:center; justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></button>
        <div style="display:flex; flex-direction:column; overflow:hidden;">
          <span style="font-weight:700; font-size:0.95rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t.name}</span>
          <div style="display:flex; gap:5px; margin-top:2px;">
            <span class="badge" style="padding:1px 6px; font-size:0.65rem;">${t.pts} pts</span>
          </div>
        </div>
      </div>
      <div style="display:flex; gap:8px; margin-left:10px;">
        <button class="btn-edit-pen" style="display:flex; align-items:center; justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
        <button class="btn-del-pen" style="display:flex; align-items:center; justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
      </div>
    `;

    card.querySelector('.btn-check-card').onclick = () => {
      state.completePendingTask(i, () => {
        showToast("🔥 ¡RACHA 3! +1 PUNTO 🔥", "warning");
      });
      showToast("¡Tarea completada!");
    };

    card.querySelector('.btn-edit-pen').onclick = () => {
      elements.pendingInput.value = t.name;
      elements.pendingPoints.value = t.pts;
      elements.editPenIdx.value = i;
      elements.btnSavePen.innerText = "Actualizar";
      elements.pendingInput.focus();
    };

    card.querySelector('.btn-del-pen').onclick = () => {
      showConfirm(`¿Eliminar la tarea pendiente "${t.name}"?`, () => {
        state.deletePendingTask(i);
        showToast("Tarea eliminada");
      });
    };

    list.appendChild(card);
  });

  // Streaks alert
  const bCount = (state.store.bonusCounters && state.store.bonusCounters[state.localProfileId]) || 0;
  const alertEl = elements.bonusAlert;
  if (alertEl) {
    if (bCount > 0) {
      alertEl.style.display = 'block';
      alertEl.innerText = `¡RACHA ${bCount}/3! COMPLETA ${3 - bCount} MÁS PARA BONO`;
    } else {
      alertEl.style.display = 'none';
    }
  }
}

export function renderMetrics() {
  if (!elements.appContainer) return;
  if (!state.store.config || !Array.isArray(state.store.config.users)) return;
  
  let mt = 0;
  const pointsToday = {};
  state.store.config.users.forEach(u => pointsToday[u.id] = 0);
  
  // Sum today's log
  state.store.todayLog.forEach(x => {
    mt += x.pts;
    if (pointsToday[x.who] !== undefined) pointsToday[x.who] += x.pts;
  });

  // Add past weekly logs cap-based totals
  state.store.history.forEach(h => {
    if (h.points) {
      Object.values(h.points).forEach(p => mt += p);
    }
  });

  if (elements.monthTotal) {
    elements.monthTotal.innerText = mt;
  }

  // Percentage Boxes Grid
  const pList = elements.userPercentDisplay;
  if (pList) {
    pList.innerHTML = '';
    state.store.config.users.forEach(u => {
      const earned = pointsToday[u.id] || 0;
      const meta = u.meta || 15;
      const percent = Math.floor((earned / meta) * 100);
      
      pList.innerHTML += `
        <div class="percent-box" style="border-top-color: ${u.color}">
          <div class="percent-name" style="color:${u.color}">${u.name}</div>
          <div class="percent-value" style="color:${u.color}">${percent}%</div>
          <div style="font-size:0.6rem; color:var(--text-muted); font-weight:700;">${earned}/${meta} PTS</div>
        </div>
      `;
    });
  }

  // Cumulative Chart Trigger with try-catch
  if (elements.timeChartCanvas) {
    try {
      updateTimeChart(elements.timeChartCanvas, state.store.todayLog, state.store.config.users);
    } catch (err) {
      console.warn("Chart.js failed to initialize:", err);
    }
  }
}

export function renderTemplates() {
  const list = elements.templateListDisplay;
  if (!list) return;
  
  list.innerHTML = '';
  const searchQ = elements.searchInput?.value.toLowerCase() || '';

  state.store.templates.forEach((t, i) => {
    if (t.name.toLowerCase().includes(searchQ)) {
      const item = document.createElement('div');
      item.className = 'tpl-item';
      item.innerHTML = `
        <div style="flex:1; display:flex; justify-content:space-between; align-items:center;">
          <span style="font-weight:700; font-size:0.95rem;">${t.name}</span>
          <span class="badge" style="margin-right:10px;">+${t.pts} pts</span>
        </div>
        <button class="btn-edit-tpl" style="display:flex; align-items:center; justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
      `;

      item.onclick = () => {
        state.addLogEntry(t.name, t.pts);
        closeModal(elements.templateModal);
        showToast(`Rutina "${t.name}" registrada`);
      };

      item.querySelector('.btn-edit-tpl').onclick = (e) => {
        e.stopPropagation(); // Avoid triggering use on click
        elements.tplName.value = t.name;
        elements.tplPts.value = t.pts;
        elements.editTplIndex.value = i;
        elements.tplFormTitle.innerText = "EDITAR RUTINA";
        elements.btnDeleteTpl.style.display = 'inline-block';
      };

      list.appendChild(item);
    }
  });
}

function renderUserConfigList() {
  const list = elements.userConfigListFull;
  if (!list) return;
  
  list.innerHTML = '';

  state.store.config.users.forEach(u => {
    const card = document.createElement('div');
    card.style.background = 'rgba(15, 23, 42, 0.4)';
    card.style.border = '1px solid var(--card-border)';
    card.style.borderRadius = 'var(--radius-md)';
    card.style.padding = '15px';
    card.style.marginBottom = '15px';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.gap = '10px';
    card.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.15)';

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:10px;">
          <input type="color" class="user-color-picker" value="${u.color}" style="width:28px; height:28px; border:none; padding:0; background:none; border-radius:50%; cursor:pointer;">
          <span style="font-weight:700; font-size:1rem; color:var(--text-main);">${u.name}</span>
        </div>
        <button class="btn-delete-user" style="background:rgba(239, 68, 68, 0.1); color:var(--danger); border:none; border-radius:8px; padding:6px 12px; font-weight:700; font-size:0.75rem; cursor:pointer;">Eliminar</button>
      </div>
      
      <div style="display:flex; gap:10px;">
        <div style="flex:2;">
          <label style="font-size:0.65rem; color:var(--text-muted); font-weight:700; display:block; margin-bottom:4px;">NOMBRE</label>
          <input type="text" class="user-name-input" value="${u.name}" style="margin:0; padding:10px; background:rgba(15,23,42,0.25);">
        </div>
        <div style="flex:1;">
          <label style="font-size:0.65rem; color:var(--text-muted); font-weight:700; display:block; margin-bottom:4px;">META DIARIA</label>
          <input type="number" class="user-meta-input" value="${u.meta || 15}" style="margin:0; text-align:center; padding:10px; background:rgba(15,23,42,0.25);">
        </div>
      </div>
    `;

    // Bind color picker change
    card.querySelector('.user-color-picker').onchange = (e) => {
      u.color = e.target.value;
      state.saveState();
      showToast("Color actualizado");
    };

    // Bind name changes
    card.querySelector('.user-name-input').onchange = (e) => {
      u.name = e.target.value.trim();
      state.saveState();
      showToast("Nombre actualizado");
    };

    // Bind meta goal changes
    card.querySelector('.user-meta-input').onchange = (e) => {
      u.meta = parseInt(e.target.value) || 15;
      state.saveState();
      showToast("Meta diaria actualizada");
    };

    // Bind delete user
    card.querySelector('.btn-delete-user').onclick = () => {
      if (state.store.config.users.length <= 1) {
        showToast("La sala debe tener al menos un usuario.", "error");
        return;
      }
      showConfirm(`¿Eliminar permanentemente al miembro ${u.name}?`, () => {
        state.store.config.users = state.store.config.users.filter(x => x.id !== u.id);
        if (state.localProfileId === u.id) {
          state.setLocalProfileId(state.store.config.users[0].id);
        }
        state.saveState();
        renderUserConfigList();
        showToast("Miembro eliminado");
      });
    };

    list.appendChild(card);
  });
}

/* --- BANCO / REDEEM DIALOGS --- */
export function openTemplateModal() {
  if (elements.searchInput) elements.searchInput.value = '';
  renderTemplates();
  updateBankInModal();
  openModal(elements.templateModal);
}

export function updateBankInModal() {
  const activeUser = state.store.config.users.find(u => u.id === state.localProfileId);
  const balance = activeUser && activeUser.bank ? activeUser.bank : 0;
  
  if (elements.bankBalanceDisplay) {
    elements.bankBalanceDisplay.innerText = balance + " pts";
  }

  const widget = elements.bankWidget;
  if (widget) {
    if (balance > 0) {
      widget.style.background = 'linear-gradient(135deg, #f59e0b, #e65c00)';
      widget.style.boxShadow = '0 4px 15px rgba(230, 92, 0, 0.3)';
    } else {
      widget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))';
      widget.style.boxShadow = 'none';
    }
  }
}

export function redeemPoints() {
  const activeUser = state.store.config.users.find(u => u.id === state.localProfileId);
  const balance = activeUser && activeUser.bank ? activeUser.bank : 0;
  
  if (balance <= 0) {
    showToast("No tienes puntos ahorrados en tu saldo.", "error");
    return;
  }

  // Tally today's points to warn user if they already reached goal
  let activePts = 0;
  state.store.todayLog.forEach(x => {
    if (x.who === state.localProfileId) activePts += x.pts;
  });
  
  if (activePts >= (activeUser.meta || 15)) {
    showToast("¡Ya cumpliste tu meta de hoy! Te sugerimos no gastar tus ahorros.", "warning");
    return;
  }

  const amount = prompt(`Tienes ${balance} pts ahorrados.\n¿Cuántos deseas rescatar para hoy?`);
  if (amount !== null) {
    state.redeemPointsFromBank(
      amount,
      (redeemedVal) => {
        showToast(`¡Rescate exitoso! Se agregaron ${redeemedVal} pts a hoy.`);
        updateBankInModal();
      },
      (errorMsg) => {
        showToast(errorMsg, "error");
      }
    );
  }
}

/* --- REPORTS SCREEN HANDLERS --- */
export function showReport() {
  if (!elements.reportOverlay) return;
  
  elements.docDate.innerText = new Date().toLocaleDateString('es-ES', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }).toUpperCase();

  // Summary Grid
  const summaryGrid = elements.reportSummary;
  if (summaryGrid) {
    summaryGrid.innerHTML = '';
    state.store.config.users.forEach(u => {
      let pts = 0;
      state.store.todayLog.forEach(x => {
        if (x.who === u.id) pts += x.pts;
      });
      
      summaryGrid.innerHTML += `
        <div class="summary-card" style="border-left-color: ${u.color}">
          <span class="summary-label">PTS DE ${u.name.toUpperCase()}</span>
          <span class="summary-value" style="color:${u.color}">${pts}</span>
        </div>
      `;
    });
  }

  // Activities Table
  const tableBody = elements.docBody;
  if (tableBody) {
    tableBody.innerHTML = '';
    [...state.store.todayLog].reverse().forEach(x => {
      const u = state.store.config.users.find(us => us.id === x.who);
      tableBody.innerHTML += `
        <tr>
          <td style="font-family:monospace; color:var(--text-muted);">${x.time}</td>
          <td style="color:${u?.color}; font-weight:700;">${u?.name || '???'}</td>
          <td>${x.name}</td>
          <td style="text-align:right; font-weight:700; color:var(--success);">+${x.pts}</td>
        </tr>
      `;
    });
  }

  elements.reportOverlay.classList.add('open');
}

export function closeReport() {
  if (elements.reportOverlay) {
    elements.reportOverlay.classList.remove('open');
  }
}

export function triggerDownloadPDF() {
  if (elements.reportContent) {
    downloadReportPDF(elements.reportContent, state.currentRoomId || "Sala");
  }
}

export function populateShoppingUsers() {
  const select = elements.shopItemUser;
  if (select) {
    const currentVal = select.value;
    select.innerHTML = '<option value="casa">Para la Casa 🏠</option>';
    state.store.config.users.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id;
      opt.innerText = `Para ${u.name} 👤`;
      select.appendChild(opt);
    });
    if (currentVal && select.querySelector(`option[value="${currentVal}"]`)) {
      select.value = currentVal;
    } else {
      select.value = 'casa';
    }
  }
}

export function toggleShoppingTab(tabId) {
  const viewTab = document.getElementById('shoppingListViewTab');
  const addTab = document.getElementById('shoppingAddTab');
  const viewBtn = elements.btnTabShoppingList;
  const addBtn = elements.btnTabShoppingAdd;

  if (tabId === 'list') {
    if (viewTab) viewTab.classList.remove('hidden');
    if (addTab) addTab.classList.add('hidden');
    if (viewBtn) viewBtn.classList.add('active');
    if (addBtn) addBtn.classList.remove('active');
    renderShoppingList();
  } else if (tabId === 'add') {
    if (viewTab) viewTab.classList.add('hidden');
    if (addTab) addTab.classList.remove('hidden');
    if (viewBtn) viewBtn.classList.remove('active');
    if (addBtn) addBtn.classList.add('active');
    
    // Clear inputs in add form
    if (elements.shopItemName) elements.shopItemName.value = '';
    if (elements.shopItemQty) elements.shopItemQty.value = '';
    if (elements.shopItemPts) elements.shopItemPts.value = '5';
    if (elements.shopItemImage) elements.shopItemImage.value = '';
    if (elements.shopImageFileName) elements.shopImageFileName.innerText = 'Sin foto seleccionada';
    if (elements.btnRemoveShopImage) elements.btnRemoveShopImage.style.display = 'none';
    if (elements.shopImagePreviewContainer) elements.shopImagePreviewContainer.style.display = 'none';
    if (elements.shopImagePreview) elements.shopImagePreview.src = '';
  }
}

export function renderShoppingList() {
  const list = elements.shoppingListDisplay;
  if (!list) return;
  list.innerHTML = '';

  const items = state.store.shoppingList || [];
  if (items.length === 0) {
    list.innerHTML = `
      <div style="padding: 40px 20px; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
        No hay compras pendientes. ¡Todo al día! 🎉
      </div>
    `;
    return;
  }

  items.forEach((item, index) => {
    const el = document.createElement('div');
    el.className = 'tpl-item';
    el.style.display = 'flex';
    el.style.justifyContent = 'space-between';
    el.style.alignItems = 'center';
    el.style.padding = '12px 14px';
    el.style.cursor = 'default';

    // Badge styling for assignment
    let targetBadge = '';
    if (item.assignedTo === 'casa') {
      targetBadge = `<span class="badge" style="background: rgba(15, 23, 42, 0.05); color: var(--text-muted); border: none; font-size: 0.65rem; padding: 2px 6px; font-weight: 700;">🏠 Casa</span>`;
    } else {
      const assignedUser = state.store.config.users.find(u => u.id === item.assignedTo);
      const color = assignedUser ? assignedUser.color : 'var(--text-muted)';
      const name = assignedUser ? assignedUser.name : '???';
      targetBadge = `<span class="badge" style="background: ${color}15; color: ${color}; border: 1px solid ${color}30; font-size: 0.65rem; padding: 2px 6px; font-weight: 700;">👤 ${name}</span>`;
    }

    // Thumbnail html
    const imageHtml = item.image 
      ? `<img class="shop-thumbnail" src="${item.image}" alt="${item.name}">` 
      : '';

    el.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; flex:1; overflow:hidden; margin-right:10px;">
        ${imageHtml}
        <div style="display:flex; flex-direction:column; gap:3px; flex:1; overflow:hidden;">
          <div style="display:flex; align-items:center; gap:8px; overflow:hidden;">
            <span style="font-weight:700; font-size:0.95rem; color: var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.name}</span>
            ${item.qty ? `<span style="font-size:0.75rem; color:var(--text-muted); background:rgba(15,23,42,0.05); padding:1px 6px; border-radius:4px; font-weight:600; flex-shrink:0;">${item.qty}</span>` : ''}
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            ${targetBadge}
            <span class="badge" style="font-size:0.6rem; padding:1px 4px; border:none; background:rgba(16, 185, 129, 0.08); color:var(--success); font-weight:700;">+${item.pts} pts</span>
          </div>
        </div>
      </div>
      <div style="display:flex; gap:8px; align-items:center; flex-shrink:0;">
        <button class="btn-buy-shop" style="display:flex; align-items:center; justify-content:center; background:var(--success); color:white; border:none; border-radius:8px; padding:6px; cursor:pointer; width:32px; height:32px; transition:var(--transition);" title="Marcar como comprado y ganar puntos"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></button>
        <button class="btn-del-shop" style="display:flex; align-items:center; justify-content:center; background:rgba(239, 68, 68, 0.1); color:var(--danger); border:none; border-radius:8px; padding:6px; cursor:pointer; width:32px; height:32px; transition:var(--transition);" title="Eliminar de la lista"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
      </div>
    `;

    // Bind check toggle
    el.querySelector('.btn-buy-shop').onclick = (e) => {
      e.stopPropagation();
      const activeUser = state.store.config.users.find(u => u.id === state.localProfileId);
      const buyerName = activeUser ? activeUser.name : 'Usuario';
      
      showConfirm(`¿Compraste "${item.name}"? Se te asignarán +${item.pts} pts.`, () => {
        state.buyShoppingItem(index);
        showToast(`🛒 ¡${buyerName} compró ${item.name}! +${item.pts} pts`);
      });
    };

    // Bind delete item
    el.querySelector('.btn-del-shop').onclick = (e) => {
      e.stopPropagation();
      showConfirm(`¿Eliminar "${item.name}" de la lista de compras?`, () => {
        state.deleteShoppingItem(index);
        showToast("Artículo eliminado de la lista");
      });
    };

    // Bind image lightbox
    if (item.image) {
      el.querySelector('.shop-thumbnail').onclick = (e) => {
        e.stopPropagation();
        openLightbox(item.image, `${item.name} ${item.qty ? '(' + item.qty + ')' : ''}`);
      };
    }

    list.appendChild(el);
  });
}

export function openLightbox(src, caption) {
  if (elements.lightboxImage) elements.lightboxImage.src = src;
  if (elements.lightboxCaption) elements.lightboxCaption.innerText = caption;
  openModal(elements.imageLightbox);
}

/* --- TEMPLATE FORM RESET --- */
export function resetTplForm() {
  if (elements.tplName) elements.tplName.value = "";
  if (elements.tplPts) elements.tplPts.value = "";
  if (elements.editTplIndex) elements.editTplIndex.value = "";
  if (elements.tplFormTitle) elements.tplFormTitle.innerText = "NUEVA RUTINA";
  if (elements.btnDeleteTpl) elements.btnDeleteTpl.style.display = 'none';
}

/* --- AUTH SCREEN HELPERS --- */

/**
 * Show the Google auth gate, hiding the rooms screen.
 */
export function showAuthScreen() {
  if (elements.authScreen) elements.authScreen.classList.remove('hidden');
  if (elements.roomsScreen) elements.roomsScreen.classList.add('hidden');
}

/**
 * Hide the auth gate once the user is logged in.
 */
export function hideAuthScreen() {
  if (elements.authScreen) elements.authScreen.classList.add('hidden');
}

/**
 * Show the "Mis Salas" screen (room list / create / join).
 */
export function showRoomsScreen() {
  if (elements.authScreen) elements.authScreen.classList.add('hidden');
  if (elements.roomsScreen) elements.roomsScreen.classList.remove('hidden');
}

/**
 * Hide the rooms screen (when entering a room).
 */
export function hideRoomsScreen() {
  if (elements.roomsScreen) elements.roomsScreen.classList.add('hidden');
}

/**
 * Display an inline error on the auth screen.
 */
export function showAuthError(message) {
  if (!elements.authError) return;
  elements.authError.innerText = message;
  elements.authError.classList.add('show');
}

/**
 * Clear the auth screen error.
 */
export function clearAuthError() {
  if (!elements.authError) return;
  elements.authError.innerText = '';
  elements.authError.classList.remove('show');
}

/* --- ROOMS SCREEN RENDERING --- */

export function setRoomsUserLabel(text) {
  if (elements.roomsUserLabel) elements.roomsUserLabel.innerText = text;
}

export function showRoomsError(message) {
  if (!elements.roomsError) return;
  elements.roomsError.innerText = message;
  elements.roomsError.classList.add('show');
}

export function clearRoomsError() {
  if (!elements.roomsError) return;
  elements.roomsError.innerText = '';
  elements.roomsError.classList.remove('show');
}

/**
 * Render the list of rooms the user belongs to.
 * @param {Array} rooms  [{roomId, name, role, memberCount}]
 * @param {function} onOpen  called with roomId when a card is clicked
 */
export function renderRoomsList(rooms, onOpen) {
  const list = elements.roomsList;
  if (!list) return;
  list.innerHTML = '';

  if (!rooms || rooms.length === 0) {
    if (elements.roomsEmpty) elements.roomsEmpty.style.display = 'block';
    return;
  }
  if (elements.roomsEmpty) elements.roomsEmpty.style.display = 'none';

  rooms.forEach(r => {
    const card = document.createElement('div');
    card.className = 'room-card';
    const roleLabel = r.role === 'owner' ? 'Dueño' : 'Miembro';
    const badgeClass = r.role === 'owner' ? 'badge-owner' : 'badge-member';
    card.innerHTML = `
      <div style="overflow:hidden;">
        <div class="room-card-name">${r.name}</div>
        <div class="room-card-meta">${r.memberCount} miembro${r.memberCount === 1 ? '' : 's'}</div>
      </div>
      <span class="room-card-badge ${badgeClass}">${roleLabel}</span>
    `;
    card.onclick = () => onOpen(r.roomId);
    list.appendChild(card);
  });
}

/**
 * Render the member list inside the config modal.
 * @param {Array} members  [{uid, email, name, role}]
 * @param {string} currentUid
 * @param {boolean} isOwner  whether the viewer can remove members
 * @param {function} onRemove  called with member uid
 */
export function renderMembers(members, currentUid, isOwner, onRemove) {
  const list = elements.membersList;
  if (!list) return;
  list.innerHTML = '';

  if (elements.memberCount) elements.memberCount.innerText = members.length;

  members.forEach(m => {
    const row = document.createElement('div');
    row.className = 'member-row';
    const roleLabel = m.role === 'owner' ? 'Dueño' : 'Miembro';
    const isSelf = m.uid === currentUid;
    const canRemove = isOwner && m.role !== 'owner' && !isSelf;

    row.innerHTML = `
      <div style="overflow:hidden;">
        <div class="member-email">${m.email || m.name || 'Usuario'}</div>
        <div class="member-role">${roleLabel}${isSelf ? ' · tú' : ''}</div>
      </div>
      ${canRemove ? '<button class="btn-remove-member">Quitar</button>' : ''}
    `;

    if (canRemove) {
      row.querySelector('.btn-remove-member').onclick = () => onRemove(m.uid);
    }
    list.appendChild(row);
  });
}

/**
 * Toggle owner-only controls (invite, delete) vs member controls (leave).
 */
export function applyRoomRole(isOwner) {
  if (elements.btnInvite) elements.btnInvite.style.display = isOwner ? 'block' : 'none';
  if (elements.btnDeleteRoom) elements.btnDeleteRoom.style.display = isOwner ? 'block' : 'none';
  if (elements.btnLeaveRoom) elements.btnLeaveRoom.style.display = isOwner ? 'none' : 'block';
  // Only the owner can rename / reset destructive things
  if (elements.btnRenameRoom) elements.btnRenameRoom.disabled = !isOwner;
}

/**
 * Show an invite link/code in the config modal.
 */
export function showInviteLink(link) {
  if (elements.inviteBox) elements.inviteBox.style.display = 'block';
  if (elements.inviteLink) elements.inviteLink.value = link;
}

/* --- BASE MODAL HELPER FUNCTIONS --- */
export function openModal(modalEl) {
  if (modalEl) {
    modalEl.style.display = 'flex';
    // Small timeout to allow browser layout calculation before animating opacity/translate
    setTimeout(() => {
      modalEl.classList.add('visible');
    }, 10);
  }
}

export function closeModal(modalEl) {
  if (modalEl) {
    modalEl.classList.remove('visible');
    modalEl.addEventListener('transitionend', function handler() {
      modalEl.style.display = 'none';
      modalEl.removeEventListener('transitionend', handler);
    });
  }
}

/**
 * Render the current profile's daily roadmap (Lego planner style)
 */
export function renderRoadmap() {
  const activeUser = state.store.config.users.find(u => u.id === state.localProfileId) || state.store.config.users[0];
  if (!activeUser) return;

  // 1. Render Profile Switcher for Roadmap Screen
  const switcher = elements.roadmapProfileSwitcher;
  if (switcher) {
    switcher.innerHTML = '';
    state.store.config.users.forEach(u => {
      const btn = document.createElement('button');
      btn.className = `profile-btn ${state.localProfileId === u.id ? 'active' : ''}`;
      btn.innerText = u.name;
      
      if (state.localProfileId === u.id) {
        btn.style.color = u.color;
        btn.style.borderBottom = `2px solid ${u.color}`;
      }
      btn.onclick = () => {
        state.changeProfile(u.id);
      };
      switcher.appendChild(btn);
    });
  }

  // 2. Set border color of the card
  if (elements.roadmapContainer) {
    elements.roadmapContainer.style.borderLeftColor = activeUser.color;
  }
  
  if (elements.roadmapUserTitle) {
    elements.roadmapUserTitle.innerText = `Plan de Hoy · ${activeUser.name}`;
    elements.roadmapUserTitle.style.color = activeUser.color;
  }

  // 3. Populate Pending drop-down (only show tasks from pending list)
  const pendingSelect = elements.selectRoadmapPending;
  if (pendingSelect) {
    const currentVal = pendingSelect.value;
    pendingSelect.innerHTML = '<option value="">-- Seleccionar Tarea --</option>';
    state.store.pendingList.forEach((t, index) => {
      const opt = document.createElement('option');
      opt.value = index;
      opt.innerText = `📌 ${t.name} (${t.pts} pts)`;
      pendingSelect.appendChild(opt);
    });
    // Restore value if still exists
    if (state.store.pendingList[currentVal]) {
      pendingSelect.value = currentVal;
    }
  }

  // 4. Populate Routine drop-down
  const routineSelect = elements.selectRoadmapRoutine;
  if (routineSelect) {
    const currentVal = routineSelect.value;
    routineSelect.innerHTML = '<option value="">-- Seleccionar Rutina --</option>';
    state.store.templates.forEach((t, index) => {
      const opt = document.createElement('option');
      opt.value = index;
      opt.innerText = `🔄 ${t.name} (+${t.pts} pts)`;
      routineSelect.appendChild(opt);
    });
    if (state.store.templates[currentVal]) {
      routineSelect.value = currentVal;
    }
  }

  // 5. Render Plan Items list
  const list = elements.roadmapItemsList;
  if (!list) return;
  list.innerHTML = '';

  const plan = state.store.roadmaps && state.store.roadmaps[state.localProfileId];
  const items = plan && Array.isArray(plan.items) ? plan.items : [];
  const locked = plan && plan.locked === true;

  // Toggle internal sub-tabs bar visibility based on lock status
  const tabsContainer = document.querySelector('.roadmap-tabs');
  if (tabsContainer) {
    if (locked) {
      tabsContainer.classList.add('hidden');
    } else {
      tabsContainer.classList.remove('hidden');
    }
  }

  // Keep view aligned based on lock state
  const viewTab = document.getElementById('roadmapViewTab');
  const builderTab = document.getElementById('roadmapBuilderTab');
  if (locked) {
    if (viewTab) viewTab.classList.remove('hidden');
    if (builderTab) builderTab.classList.add('hidden');
  } else {
    // Show correct sub-tab based on active button
    const viewBtn = elements.btnTabRoadmapView;
    const builderBtn = elements.btnTabRoadmapBuilder;
    if (viewBtn && viewBtn.classList.contains('active')) {
      if (viewTab) viewTab.classList.remove('hidden');
      if (builderTab) builderTab.classList.add('hidden');
    } else if (builderBtn && builderBtn.classList.contains('active')) {
      if (viewTab) viewTab.classList.add('hidden');
      if (builderTab) builderTab.classList.remove('hidden');
    }
  }

  if (items.length === 0) {
    list.innerHTML = `<p class="roadmap-text empty" style="padding: 15px 5px; text-align: center;">No hay bloques en el plan de hoy. ¡Construye uno en la pestaña de Actividades!</p>`;
    return;
  }

  items.forEach(item => {
    const el = document.createElement('div');
    
    // Determine badge and colors based on block type
    let badgeText = "Personal";
    let badgeStyle = "background: rgba(100, 116, 139, 0.1); color: var(--text-muted);";
    let pointsHtml = "";

    if (item.type === 'pending') {
      badgeText = "Pendiente";
      badgeStyle = "background: rgba(59, 130, 246, 0.1); color: #2563eb;";
      if (item.pts) pointsHtml = `<span class="badge" style="padding: 1px 5px; font-size: 0.6rem; margin-left: 6px;">${item.pts} pts</span>`;
    } else if (item.type === 'routine') {
      badgeText = "Rutina";
      badgeStyle = "background: rgba(16, 185, 129, 0.1); color: #059669;";
      if (item.pts) pointsHtml = `<span class="badge" style="padding: 1px 5px; font-size: 0.6rem; margin-left: 6px;">+${item.pts} pts</span>`;
    }

    el.className = `roadmap-item-row`;
    el.style.padding = '10px 12px';
    el.style.background = 'rgba(15, 23, 42, 0.02)';
    el.style.border = '1px solid var(--card-border)';
    el.style.borderRadius = 'var(--radius-md)';
    el.style.display = 'flex';
    el.style.justifyContent = 'space-between';
    el.style.alignItems = 'center';
    el.style.transition = 'var(--transition)';

    if (item.completed) {
      el.style.opacity = '0.6';
    }

    const deleteBtnHtml = locked
      ? ''
      : `<button class="btn-del-roadmap" style="display: flex; align-items: center; justify-content: center; opacity: 0.5; cursor: pointer; border: none; background: none; color: var(--danger); padding: 4px; transition: var(--transition);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>`;

    el.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px; overflow: hidden; flex: 1;">
        <button class="btn-check-roadmap" style="display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 6px; flex-shrink: 0; background: ${item.completed ? 'var(--success)' : 'none'}; border: 1.5px solid ${item.completed ? 'var(--success)' : 'var(--text-muted)'}; color: ${item.completed ? 'white' : 'var(--text-muted)'}; cursor: pointer; transition: var(--transition);">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="display: ${item.completed ? 'block' : 'none'}"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </button>
        <div style="display: flex; flex-direction: column; overflow: hidden;">
          <span style="font-weight: 600; font-size: 0.88rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-main); ${item.completed ? 'text-decoration: line-through;' : ''}">${item.text}</span>
          <div style="display: flex; align-items: center; gap: 4px; margin-top: 2px;">
            <span class="roadmap-badge" style="${badgeStyle} padding: 1px 6px; font-size: 0.6rem; font-weight: 800;">${badgeText}</span>
            ${pointsHtml}
          </div>
        </div>
      </div>
      ${deleteBtnHtml}
    `;

    // Bind check toggle
    el.querySelector('.btn-check-roadmap').onclick = (e) => {
      e.stopPropagation();
      state.toggleRoadmapItem(item.id);
      showToast(item.completed ? "Bloque pendiente" : "¡Bloque completado!");
    };

    // Bind delete item
    const delBtn = el.querySelector('.btn-del-roadmap');
    if (delBtn) {
      delBtn.onclick = (e) => {
        e.stopPropagation();
        state.deleteRoadmapItem(item.id);
        showToast("Bloque quitado del plan");
      };
    }

    list.appendChild(el);
  });

  // 6. Lock/Unlock Action Button
  if (items.length > 0) {
    const actionDiv = document.createElement('div');
    actionDiv.style.marginTop = '15px';
    actionDiv.style.display = 'flex';
    actionDiv.style.justifyContent = 'center';
    
    if (locked) {
      const unlockBtn = document.createElement('button');
      unlockBtn.className = 'btn-save';
      unlockBtn.id = 'btnUnlockRoadmap';
      unlockBtn.style.background = 'none';
      unlockBtn.style.border = '1.5px dashed var(--text-muted)';
      unlockBtn.style.color = 'var(--text-muted)';
      unlockBtn.style.fontSize = '0.8rem';
      unlockBtn.style.fontWeight = '600';
      unlockBtn.style.padding = '8px 16px';
      unlockBtn.style.width = 'auto';
      unlockBtn.style.margin = '0';
      unlockBtn.innerHTML = '⚙️ Modificar Plan';
      unlockBtn.onclick = () => {
        state.unlockRoadmap();
        showToast("Plan desbloqueado para modificación");
      };
      actionDiv.appendChild(unlockBtn);
    } else {
      const lockBtn = document.createElement('button');
      lockBtn.className = 'btn-save';
      lockBtn.id = 'btnLockRoadmap';
      lockBtn.style.background = 'var(--active-color)';
      lockBtn.style.color = '#ffffff';
      lockBtn.style.fontSize = '0.85rem';
      lockBtn.style.fontWeight = '700';
      lockBtn.style.padding = '10px 20px';
      lockBtn.style.width = '100%';
      lockBtn.style.margin = '0';
      lockBtn.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.1)';
      lockBtn.innerHTML = '🎯 Listo, Fijar Plan de Hoy';
      lockBtn.onclick = () => {
        state.lockRoadmap();
        showToast("¡Plan de hoy fijado! A enfocarse.");
      };
      actionDiv.appendChild(lockBtn);
    }
    list.appendChild(actionDiv);
  }

  // Re-render tree if the modal is open to keep it in sync in real time
  if (elements.modalProgressTree && elements.modalProgressTree.classList.contains('visible')) {
    renderFocusTree();
  }
}

/**
 * Toggle between view plan and build plan tabs in Roadmap screen
 */
export function toggleRoadmapTab(tabName) {
  const viewTab = document.getElementById('roadmapViewTab');
  const builderTab = document.getElementById('roadmapBuilderTab');
  const viewBtn = elements.btnTabRoadmapView;
  const builderBtn = elements.btnTabRoadmapBuilder;
  
  if (tabName === 'view') {
    if (viewTab) viewTab.classList.remove('hidden');
    if (builderTab) builderTab.classList.add('hidden');
    if (viewBtn) viewBtn.classList.add('active');
    if (builderBtn) builderBtn.classList.remove('active');
  } else {
    if (viewTab) viewTab.classList.add('hidden');
    if (builderTab) builderTab.classList.remove('hidden');
    if (viewBtn) viewBtn.classList.remove('active');
    if (builderBtn) builderBtn.classList.add('active');
  }
}

/**
 * Render the Weekly Focus Tree (Árbol de Enfoque) dynamic SVG inside the modal
 */
export function renderFocusTree() {
  const activeUser = state.store.config.users.find(u => u.id === state.localProfileId) || state.store.config.users[0];
  if (!activeUser) return;

  const todayStr = new Date().toDateString();
  const yesterdayStr = new Date(new Date().setDate(new Date().getDate() - 1)).toDateString();

  // 1. Get Tree Difficulty configuration
  const difficulty = state.store.config.treeDifficulty || 'medio';
  const diffSelect = document.getElementById('selectTreeDifficulty');
  if (diffSelect) {
    diffSelect.value = difficulty;
    diffSelect.onchange = (e) => {
      state.setTreeDifficulty(e.target.value);
      renderFocusTree();
      showToast(`Exigencia del árbol configurada en: ${e.target.value === 'minimo' ? 'Mínimo' : e.target.value === 'maximo' ? 'Máximo' : 'Medio'}`);
    };
  }

  let fullBranchThreshold = 2; // medio default
  let witheredDaysThreshold = 2; // medio default
  if (difficulty === 'minimo') {
    fullBranchThreshold = 1;
    witheredDaysThreshold = 3;
  } else if (difficulty === 'maximo') {
    fullBranchThreshold = 3;
    witheredDaysThreshold = 1;
  }

  // Generate last 7 days
  const daysList = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    daysList.push({
      dateStr: d.toDateString(),
      niceName: d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
    });
  }

  // Helper to get total daily activity (completed roadmap items + logged entries)
  function getDailyLeafItems(dayStr) {
    const isToday = dayStr === todayStr;
    const leafItems = [];
    
    // 1. Roadmap tasks
    let roadmapItems = [];
    if (isToday) {
      const plan = state.store.roadmaps && state.store.roadmaps[state.localProfileId];
      roadmapItems = plan && Array.isArray(plan.items) ? plan.items : [];
    } else {
      const historyEntries = state.store.roadmapHistory || [];
      const entry = historyEntries.find(x => x.date === dayStr && x.userId === state.localProfileId);
      roadmapItems = entry && Array.isArray(entry.items) ? entry.items : [];
    }
    roadmapItems.filter(x => x.completed).forEach(task => {
      leafItems.push({
        text: task.text,
        type: task.type,
        pts: task.pts || 0,
        time: task.completedAt || ''
      });
    });

    // 2. Logged daily activities in Hoy
    if (isToday) {
      const logs = state.store.todayLog.filter(x => x.who === state.localProfileId);
      logs.forEach(log => {
        leafItems.push({
          text: log.name,
          type: 'activityLog',
          pts: log.pts || 0,
          time: log.time || ''
        });
      });
    } else {
      const dObj = new Date(dayStr);
      const niceDate = `${dObj.getDate().toString().padStart(2, '0')}/${(dObj.getMonth() + 1).toString().padStart(2, '0')}/${dObj.getFullYear()}`;
      const hist = state.store.history || [];
      const histEntry = hist.find(x => x.date === niceDate);
      if (histEntry && histEntry.points && histEntry.points[state.localProfileId] !== undefined) {
        const earned = Number(histEntry.points[state.localProfileId]) || 0;
        const count = Math.ceil(earned / 5);
        for (let j = 0; j < count; j++) {
          leafItems.push({
            text: `Actividad registrada`,
            type: 'activityLog',
            pts: earned,
            time: ''
          });
        }
      }
    }
    return leafItems;
  }

  // 2. Calculate Gamification Metrics
  const fullBranchesCount = daysList.filter(day => getDailyLeafItems(day.dateStr).length >= fullBranchThreshold).length;
  const isBloomed = fullBranchesCount >= 5;

  // Watered: at least 1 activity in "Hoy" tab today
  const userDailyLogs = state.store.todayLog.filter(x => x.who === state.localProfileId);
  const isWatered = userDailyLogs.length >= 1;

  // Fertilized: today's points >= daily meta
  let todayPts = 0;
  userDailyLogs.forEach(x => todayPts += x.pts);
  const userMeta = Number(activeUser.meta) || 15;
  const isFertilized = todayPts >= userMeta;

  // Withered: 0 completed tasks/activities across the last W days
  let isWithered = true;
  for (let offset = 0; offset < witheredDaysThreshold; offset++) {
    const d = new Date(now);
    d.setDate(now.getDate() - offset);
    if (getDailyLeafItems(d.toDateString()).length > 0) {
      isWithered = false;
      break;
    }
  }

  // Update Badge Visibilities
  const badgeWater = elements.badgeWater;
  const badgeFertilized = elements.badgeFertilized;
  const badgeBloomed = elements.badgeBloomed;
  const badgeWithered = elements.badgeWithered;

  if (badgeWater) {
    if (isWatered && !isWithered) badgeWater.classList.remove('hidden');
    else badgeWater.classList.add('hidden');
  }
  if (badgeFertilized) {
    if (isFertilized && !isWithered) badgeFertilized.classList.remove('hidden');
    else badgeFertilized.classList.add('hidden');
  }
  if (badgeBloomed) {
    if (isBloomed && !isWithered) badgeBloomed.classList.remove('hidden');
    else badgeBloomed.classList.add('hidden');
  }
  if (badgeWithered) {
    if (isWithered) badgeWithered.classList.remove('hidden');
    else badgeWithered.classList.add('hidden');
  }

  // Set Status Hint Text
  const statusHint = elements.treeStatusHint;
  if (statusHint) {
    if (isWithered) {
      statusHint.innerHTML = `<span style="color: var(--danger); font-weight:700;">🍂 Tu árbol se está marchitando por falta de constancia.</span> ¡Completa tareas del roadmap o registra actividades hoy para revivirlo!`;
    } else if (isBloomed) {
      statusHint.innerHTML = `<span style="color: #db2777; font-weight:700;">🌸 ¡Espectacular! Tu árbol ha florecido.</span> Has mantenido un ritmo de enfoque excelente esta semana.`;
    } else {
      const daysNeeded = Math.max(0, 5 - fullBranchesCount);
      statusHint.innerHTML = `💧 Regado y creciendo con tu constancia. Completa ${fullBranchThreshold}+ actividades por día para hacerlo florecer (Faltan ${daysNeeded} días de enfoque).`;
    }
  }

  // 3. Build SVG Tree
  let svgContent = `<svg width="100%" height="440" viewBox="0 0 400 450" xmlns="http://www.w3.org/2000/svg">`;

  // Draw Ground
  svgContent += `<path d="M 50 420 Q 200 400 350 420 L 350 440 L 50 440 Z" fill="${isWithered ? '#94a3b8' : '#3f6212'}" opacity="0.15" />`;

  // Draw Trunk
  const trunkColor = isWithered ? '#64748b' : '#78350f';
  svgContent += `<path d="M 192 420 Q 200 220 197 40 L 203 40 Q 200 220 208 420 Z" fill="${trunkColor}" opacity="0.95" />`;

  // Draw 7 Branches
  const yCoordinates = [360, 315, 270, 225, 180, 135, 90];

  daysList.forEach((day, i) => {
    const y = yCoordinates[i];
    const growsLeft = i % 2 === 0;
    const isToday = i === 6;

    // Define Curve Coordinates
    const p0 = { x: 200, y: y };
    const p1 = growsLeft ? { x: 150, y: y + 10 } : { x: 250, y: y + 10 };
    const p2 = growsLeft ? { x: 110, y: y - 25 } : { x: 290, y: y - 25 };

    // Branch Color
    let branchColor = trunkColor;
    let branchStrokeWidth = 3.5;
    let extraClass = '';

    if (!isWithered) {
      if (isToday) {
        branchColor = activeUser.color;
        branchStrokeWidth = 5;
        if (isWatered) extraClass = 'watered-branch';
      } else {
        branchColor = '#854d0e'; // healthy brown
      }
    } else {
      branchColor = '#94a3b8'; // dry slate
    }

    // Render Main Branch Path
    svgContent += `<path d="M ${p0.x} ${p0.y} Q ${p1.x} ${p1.y} ${p2.x} ${p2.y}" stroke="${branchColor}" stroke-width="${branchStrokeWidth}" fill="none" class="${extraClass}" stroke-linecap="round" />`;

    // Render Day Label
    const textX = growsLeft ? 95 : 305;
    const textAnchor = growsLeft ? 'end' : 'start';
    const textFill = isToday && !isWithered ? activeUser.color : 'var(--text-muted)';
    const textWeight = isToday ? '800' : '600';
    const textLabel = isToday ? 'Hoy' : day.niceName;

    svgContent += `<text x="${textX}" y="${y - 28}" text-anchor="${textAnchor}" font-family="var(--font-title)" font-size="10.5px" font-weight="${textWeight}" fill="${textFill}">${textLabel}</text>`;

    // Get Completed tasks and activities for this day
    const leafItems = getDailyLeafItems(day.dateStr);
    const M = leafItems.length;

    // Determine Leaf Colors
    let leafColor = '#22c55e'; // default healthy green
    if (isWithered) {
      leafColor = '#b45309'; // dry amber
    } else if (isToday) {
      leafColor = activeUser.color;
    }

    // Draw Leaves
    leafItems.forEach((task, j) => {
      const t = 0.25 + (j / Math.max(1, M - 1)) * 0.55;
      const P = getBezierPoint(t, p0, p1, p2);

      // Branching Twig
      const twigX = growsLeft ? P.x - 8 : P.x + 8;
      const twigY = P.y - 12;

      svgContent += `<line x1="${P.x}" y1="${P.y}" x2="${twigX}" y2="${twigY}" stroke="${isWithered ? '#94a3b8' : '#78350f'}" stroke-width="2" stroke-linecap="round" />`;

      // Draw Leaf Circle
      svgContent += `<circle cx="${twigX}" cy="${twigY}" r="6.5" fill="${leafColor}" class="tree-leaf" data-name="${task.text}" data-time="${task.time || ''}" data-type="${task.type}" data-pts="${task.pts || 0}" />`;

      // Fertilized extra leaf on today's tasks
      if (isToday && isFertilized && !isWithered) {
        const Q2 = growsLeft ? { x: P.x - 2, y: P.y - 16 } : { x: P.x + 2, y: P.y - 16 };
        svgContent += `<line x1="${P.x}" y1="${P.y}" x2="${Q2.x}" y2="${Q2.y}" stroke="#78350f" stroke-width="1.8" />`;
        svgContent += `<circle cx="${Q2.x}" cy="${Q2.y}" r="8.5" fill="#15803d" class="tree-leaf" data-name="${task.text} (Meta Diaria)" data-time="${task.time || ''}" data-type="${task.type}" data-pts="${task.pts || 0}" />`;
      }
    });

    // Draw Blooming Flowers/Leaves
    if (isBloomed && !isWithered) {
      const tipX = p2.x;
      const tipY = p2.y;
      
      svgContent += `
        <!-- Petals -->
        <circle cx="${tipX - 4}" cy="${tipY}" r="4.5" fill="#f472b6" opacity="0.85" class="tree-flower" data-name="Flor de Enfoque" data-desc="¡Rama de Enfoque Llena!" />
        <circle cx="${tipX + 4}" cy="${tipY}" r="4.5" fill="#f472b6" opacity="0.85" class="tree-flower" data-name="Flor de Enfoque" data-desc="¡Rama de Enfoque Llena!" />
        <circle cx="${tipX}" cy="${tipY - 4}" r="4.5" fill="#f472b6" opacity="0.85" class="tree-flower" data-name="Flor de Enfoque" data-desc="¡Rama de Enfoque Llena!" />
        <circle cx="${tipX}" cy="${tipY + 4}" r="4.5" fill="#f472b6" opacity="0.85" class="tree-flower" data-name="Flor de Enfoque" data-desc="¡Rama de Enfoque Llena!" />
        <!-- Flower Center -->
        <circle cx="${tipX}" cy="${tipY}" r="3" fill="#fef08a" />
      `;

      // Extra decorative leaves sprouted along the branch
      const tDecors = [0.15, 0.45, 0.75];
      tDecors.forEach(td => {
        const P = getBezierPoint(td, p0, p1, p2);
        const leafOffsetX = growsLeft ? -6 : 6;
        const leafOffsetY = -4;
        svgContent += `<path d="M ${P.x} ${P.y} Q ${P.x + leafOffsetX/2} ${P.y - 8} ${P.x + leafOffsetX} ${P.y + leafOffsetY} Z" fill="#10b981" opacity="0.9" class="tree-decor-leaf" data-name="Follaje Florecido" data-desc="El árbol rebosa vida" />`;
      });
    }
  });

  // Extra decorative blossoms on the trunk if bloomed
  if (isBloomed && !isWithered) {
    svgContent += `
      <circle cx="194" cy="180" r="4.5" fill="#f472b6" opacity="0.9" />
      <circle cx="204" cy="240" r="5" fill="#f472b6" opacity="0.9" />
      <circle cx="196" cy="300" r="4" fill="#f472b6" opacity="0.9" />
    `;
  }

  svgContent += `</svg>`;

  // Render SVG in Container
  const svgContainer = elements.focusTreeSvgContainer;
  if (svgContainer) {
    svgContainer.innerHTML = svgContent + `<div id="treeTooltip" class="hidden" style="position: absolute; background: rgba(15, 23, 42, 0.9); color: #ffffff; padding: 6px 10px; border-radius: 6px; font-size: 0.75rem; pointer-events: none; z-index: 1200; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: var(--font-main); transition: opacity 0.15s; max-width: 200px; text-align: left;"></div>`;
  }

  bindTreeTooltips();
}

/**
 * Handle Tooltips display for Tree SVG elements
 */
function bindTreeTooltips() {
  const container = elements.focusTreeSvgContainer;
  if (!container) return;

  const tooltip = document.getElementById('treeTooltip');
  if (!tooltip) return;

  const leaves = container.querySelectorAll('.tree-leaf, .tree-flower, .tree-decor-leaf');

  leaves.forEach(leaf => {
    leaf.onmouseover = (e) => {
      const name = leaf.getAttribute('data-name');
      const time = leaf.getAttribute('data-time');
      const type = leaf.getAttribute('data-type');
      const pts = leaf.getAttribute('data-pts');
      const desc = leaf.getAttribute('data-desc');

      let text = `<strong>${name}</strong>`;
      
      if (desc) {
        text += `<br/><span style="color: #cbd5e1;">${desc}</span>`;
      } else {
        let typeText = "Personal";
        if (type === 'pending') typeText = `Pendiente (${pts} pts)`;
        else if (type === 'routine') typeText = `Rutina (+${pts} pts)`;
        
        text += `<br/><span style="color: #cbd5e1;">${typeText}</span>`;
        if (time) {
          text += `<br/><span style="color: #94a3b8; font-size: 0.7rem;">Completado: ${time}</span>`;
        }
      }

      tooltip.innerHTML = text;
      tooltip.classList.remove('hidden');

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left + 15;
      const y = e.clientY - rect.top - 15;

      tooltip.style.left = `${x}px`;
      tooltip.style.top = `${y}px`;
    };

    leaf.onmousemove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left + 15;
      const y = e.clientY - rect.top - 15;
      tooltip.style.left = `${x}px`;
      tooltip.style.top = `${y}px`;
    };

    leaf.onmouseout = () => {
      tooltip.classList.add('hidden');
    };
  });
}

// Bezier curve point helper
function getBezierPoint(t, p0, p1, p2) {
  const x = (1-t)*(1-t)*p0.x + 2*(1-t)*t*p1.x + t*t*p2.x;
  const y = (1-t)*(1-t)*p0.y + 2*(1-t)*t*p1.y + t*t*p2.y;
  return { x, y };
}

export { elements };
