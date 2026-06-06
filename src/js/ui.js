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
    btnEditRoadmap: document.getElementById('btnEditRoadmap'),
    roadmapView: document.getElementById('roadmapView'),
    roadmapGoalText: document.getElementById('roadmapGoalText'),
    roadmapEndText: document.getElementById('roadmapEndText'),
    roadmapStatusBadge: document.getElementById('roadmapStatusBadge'),
    roadmapForm: document.getElementById('roadmapForm'),
    inputRoadmapGoal: document.getElementById('inputRoadmapGoal'),
    inputRoadmapEnd: document.getElementById('inputRoadmapEnd'),
    selectRoadmapStatus: document.getElementById('selectRoadmapStatus'),
    btnCancelRoadmap: document.getElementById('btnCancelRoadmap'),
    btnSaveRoadmap: document.getElementById('btnSaveRoadmap'),
    
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
    btnRedeemBank: document.getElementById('btnRedeemBank')
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
 * Render the current profile's daily roadmap
 */
export function renderRoadmap() {
  const activeUser = state.store.config.users.find(u => u.id === state.localProfileId) || state.store.config.users[0];
  if (!activeUser) return;

  const plan = state.store.roadmaps && state.store.roadmaps[state.localProfileId];
  
  if (elements.roadmapContainer) {
    elements.roadmapContainer.style.borderLeftColor = activeUser.color;
  }

  if (plan && (plan.goal || plan.end)) {
    if (elements.roadmapGoalText) {
      elements.roadmapGoalText.innerText = plan.goal || "Sin plan establecido.";
      elements.roadmapGoalText.classList.remove('empty');
    }
    if (elements.roadmapEndText) {
      elements.roadmapEndText.innerText = plan.end || "Sin plan establecido.";
      elements.roadmapEndText.classList.remove('empty');
    }
    if (elements.roadmapStatusBadge) {
      let statusText = "Sin iniciar";
      let statusClass = "status-todo";
      
      switch(plan.status) {
        case 'doing':
          statusText = "En progreso";
          statusClass = "status-doing";
          break;
        case 'done':
          statusText = "¡Cumplido!";
          statusClass = "status-done";
          break;
        case 'partial':
          statusText = "Parcialmente cumplido";
          statusClass = "status-partial";
          break;
      }
      
      elements.roadmapStatusBadge.innerText = statusText;
      elements.roadmapStatusBadge.className = `roadmap-badge ${statusClass}`;
    }
  } else {
    if (elements.roadmapGoalText) {
      elements.roadmapGoalText.innerText = "Sin plan establecido para hoy.";
      elements.roadmapGoalText.classList.add('empty');
    }
    if (elements.roadmapEndText) {
      elements.roadmapEndText.innerText = "Sin plan establecido para hoy.";
      elements.roadmapEndText.classList.add('empty');
    }
    if (elements.roadmapStatusBadge) {
      elements.roadmapStatusBadge.innerText = "Sin iniciar";
      elements.roadmapStatusBadge.className = "roadmap-badge status-todo";
    }
  }
}

/**
 * Toggle roadmap edit mode inline
 */
export function toggleRoadmapForm(show) {
  if (show) {
    if (elements.roadmapForm) elements.roadmapForm.classList.remove('hidden');
    if (elements.roadmapView) elements.roadmapView.classList.add('hidden');
    
    // Populate form inputs
    const plan = state.store.roadmaps && state.store.roadmaps[state.localProfileId];
    if (elements.inputRoadmapGoal) elements.inputRoadmapGoal.value = plan ? plan.goal || '' : '';
    if (elements.inputRoadmapEnd) elements.inputRoadmapEnd.value = plan ? plan.end || '' : '';
    if (elements.selectRoadmapStatus) elements.selectRoadmapStatus.value = plan ? plan.status || 'todo' : 'todo';
    
    if (elements.inputRoadmapGoal) elements.inputRoadmapGoal.focus();
  } else {
    if (elements.roadmapForm) elements.roadmapForm.classList.add('hidden');
    if (elements.roadmapView) elements.roadmapView.classList.remove('hidden');
  }
}

export { elements };
