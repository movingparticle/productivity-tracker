import { updateTimeChart } from "./chart";
import { downloadReportPDF } from "./pdf";
import * as state from "./state";

// DOM References Cache
let elements = {};

/**
 * Escapa texto del usuario antes de insertarlo con innerHTML.
 *
 * SEGURIDAD (anti-XSS almacenado): las salas son compartidas, así que el nombre
 * de una tarea, compra, perfil o miembro puede haberlo escrito otra persona. Sin
 * escapar, un valor como `<img src=x onerror="...">` ejecutaría código en el
 * navegador de los demás miembros y podría robarles la sesión. Usa esc() en CADA
 * dato del usuario que se interpole dentro de plantillas HTML (texto y atributos).
 */
function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
    inputRoadmapCustom: document.getElementById('inputRoadmapCustom'),
    btnAddCustomToRoadmap: document.getElementById('btnAddCustomToRoadmap'),
    btnTabRoadmapView: document.getElementById('btnTabRoadmapView'),
    btnTabRoadmapBuilder: document.getElementById('btnTabRoadmapBuilder'),
    btnBuilderSubPending: document.getElementById('btnBuilderSubPending'),
    btnBuilderSubRoutine: document.getElementById('btnBuilderSubRoutine'),
    btnBuilderSubPersonal: document.getElementById('btnBuilderSubPersonal'),
    btnBuilderGoToPlan: document.getElementById('btnBuilderGoToPlan'),
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
    
    bonusAlert: null, // removed – streak display now in Set Rules modal
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
    toggleAiMotivation: document.getElementById('toggleAiMotivation'),
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
    btnUploadImageTrigger: document.getElementById('btnUploadImageTrigger'),
    shopItemImage: document.getElementById('shopItemImage'),
    shopImageFileName: document.getElementById('shopImageFileName'),
    btnRemoveShopImage: document.getElementById('btnRemoveShopImage'),
    shopImagePreviewContainer: document.getElementById('shopImagePreviewContainer'),
    shopImagePreview: document.getElementById('shopImagePreview'),
    shopItemQty: document.getElementById('shopItemQty'),
    shopItemUser: document.getElementById('shopItemUser'),
    btnSaveShopItem: document.getElementById('btnSaveShopItem'),
    shoppingListDisplay: document.getElementById('shoppingListDisplay'),
    
    // Lightbox image viewer caching
    imageLightbox: document.getElementById('imageLightbox'),
    btnCloseLightbox: document.getElementById('btnCloseLightbox'),
    lightboxImage: document.getElementById('lightboxImage'),
    lightboxCaption: document.getElementById('lightboxCaption'),

    // Pending task priority
    pendingPriority: document.getElementById('pendingPriority'),

    // Room switcher (quick change room)
    btnRoomSwitcher: document.getElementById('btnRoomSwitcher'),
    roomSwitcherModal: document.getElementById('roomSwitcherModal'),
    roomSwitcherList: document.getElementById('roomSwitcherList'),
    btnCloseRoomSwitcher: document.getElementById('btnCloseRoomSwitcher'),
    btnGoToRooms: document.getElementById('btnGoToRooms'),

    // AI assistant
    btnOpenAssistant: document.getElementById('btnOpenAssistant'),
    agentModal: document.getElementById('agentModal'),
    agentMessages: document.getElementById('agentMessages'),
    agentInput: document.getElementById('agentInput'),
    btnSendAgent: document.getElementById('btnSendAgent'),
    btnCloseAgent: document.getElementById('btnCloseAgent'),
    agentSuggestions: document.getElementById('agentSuggestions'),

    // Shopping bulk + fullscreen
    shopBulkInput: document.getElementById('shopBulkInput'),
    btnAddBulkList: document.getElementById('btnAddBulkList'),
    btnFixListAI: document.getElementById('btnFixListAI'),
    btnShoppingFullscreen: document.getElementById('btnShoppingFullscreen'),
    shoppingFullscreenModal: document.getElementById('shoppingFullscreenModal'),
    shoppingListFullscreenDisplay: document.getElementById('shoppingListFullscreenDisplay'),
    btnCloseShoppingFullscreen: document.getElementById('btnCloseShoppingFullscreen'),

    // Access code redemption (rooms screen)
    redeemSection: document.getElementById('redeemSection'),
    redeemCodeInput: document.getElementById('redeemCodeInput'),
    btnRedeemCode: document.getElementById('btnRedeemCode'),

    // Pending task photo upload
    pendingImageFile: document.getElementById('pendingImageFile'),
    btnUploadPendingImage: document.getElementById('btnUploadPendingImage'),
    pendingImageLabel: document.getElementById('pendingImageLabel'),
    btnRemovePendingImage: document.getElementById('btnRemovePendingImage'),
    pendingImagePreviewContainer: document.getElementById('pendingImagePreviewContainer'),
    pendingImagePreview: document.getElementById('pendingImagePreview'),
    pendingTaskImage: document.getElementById('pendingTaskImage'),

    // Pending fullscreen
    btnPendingFullscreen: document.getElementById('btnPendingFullscreen'),
    pendingFullscreenModal: document.getElementById('pendingFullscreenModal'),
    pendingListFullscreenDisplay: document.getElementById('pendingListFullscreenDisplay'),
    btnClosePendingFullscreen: document.getElementById('btnClosePendingFullscreen'),

    // Today fullscreen
    btnTodayFullscreen: document.getElementById('btnTodayFullscreen'),
    todayFullscreenModal: document.getElementById('todayFullscreenModal'),
    todayFullscreenDisplay: document.getElementById('todayFullscreenDisplay'),
    btnCloseTodayFullscreen: document.getElementById('btnCloseTodayFullscreen'),

    // Shopping column toggles (inline + fullscreen – max 2 cols)
    btnCol1: document.getElementById('btnCol1'),
    btnCol2: document.getElementById('btnCol2'),
    btnFsCol1: document.getElementById('btnFsCol1'),
    btnFsCol2: document.getElementById('btnFsCol2'),

    // Game rules modal
    btnOpenGameRules: document.getElementById('btnOpenGameRules'),
    gameRulesModal: document.getElementById('gameRulesModal'),
    btnCloseGameRules: document.getElementById('btnCloseGameRules'),
    btnSaveGameRules: document.getElementById('btnSaveGameRules'),
    ruleStreakEnabled: document.getElementById('ruleStreakEnabled'),
    ruleStreakThreshold: document.getElementById('ruleStreakThreshold'),
    ruleStreakBonus: document.getElementById('ruleStreakBonus'),
    ruleUrgencyDays: document.getElementById('ruleUrgencyDays'),
    streakOptions: document.getElementById('streakOptions')
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
      <span>${esc(message)}</span>
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
  if (elements.toggleAiMotivation) {
    elements.toggleAiMotivation.checked = state.store.config.aiMotivation !== false;
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
    if (x.name.includes("Ahorro")) {
      badgeHtml = `<span class="badge badge-redeem">+${x.pts} (Ahorro)</span>`;
    }

    const item = document.createElement('div');
    item.className = 'log-item';
    item.innerHTML = `
      <div>
        <span class="log-time">${x.time}</span>
        <span style="color:${esc(col)}; font-weight:700; margin-right:6px;">${esc(nam.substring(0, 5))}:</span>
        <span>${esc(x.name)}</span>
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

// Visual config per priority level.
const PRIORITY_META = {
  alta:  { color: '#ef4444', label: 'Alta' },
  media: { color: '#f59e0b', label: 'Media' },
  baja:  { color: '#3b82f6', label: 'Baja' }
};

function buildPendingCard(t, i, onEdit) {
  const prio = PRIORITY_META[t.priority] || PRIORITY_META.media;
  const ageDays = state.taskAgeDays(t);
  const isUrgent = t.priority === 'alta' || ageDays >= 3;

  let ageLabel;
  if (ageDays <= 0) ageLabel = 'Hoy';
  else if (ageDays === 1) ageLabel = 'Hace 1 día';
  else ageLabel = `Hace ${ageDays} días`;

  const card = document.createElement('div');
  card.className = 'pending-card' + (isUrgent ? ' pending-urgent' : '');
  card.style.borderLeftColor = prio.color;

  const hasImage = !!t.image;
  const hasExtra = hasImage;

  card.innerHTML = `
    <div class="pending-card-main">
      <button class="btn-check-card" title="Completar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></button>
      <div class="pending-card-body">
        <div style="display:flex; align-items:center; gap:6px; overflow:hidden;">
          <span class="pending-card-name">${esc(t.name)}</span>
          ${hasExtra ? `<button class="btn-expand-card" title="Ver detalles"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>` : ''}
        </div>
        <div class="pending-card-meta">
          <span class="prio-pill" style="color:${prio.color}; background:${prio.color}18; border:1px solid ${prio.color}33;"><span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:${prio.color}; margin-right:2px;"></span>${prio.label}</span>
          <span class="badge" style="padding:1px 6px; font-size:0.65rem;">${t.pts} pts</span>
          <span class="task-age">${ageLabel}</span>
          ${isUrgent ? `<span class="urgency-flag" style="display:inline-flex; align-items:center; gap:3px;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>Urgente</span>` : ''}
        </div>
      </div>
      <div class="pending-card-actions">
        <button class="btn-edit-pen" title="Editar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
        <button class="btn-del-pen" title="Eliminar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
      </div>
    </div>
    ${hasExtra ? `<div class="pending-card-detail" style="display:none;">
      ${hasImage ? `<img class="pending-card-img" src="${esc(t.image)}" alt="${esc(t.name)}">` : ''}
    </div>` : ''}
  `;

  card.querySelector('.btn-check-card').onclick = () => {
    state.completePendingTask(i, () => {
      showToast("¡RACHA 3! +1 PUNTO", "warning");
    });
    showToast("¡Tarea completada!");
  };

  card.querySelector('.btn-edit-pen').onclick = () => {
    if (onEdit) onEdit(t, i);
  };

  card.querySelector('.btn-del-pen').onclick = () => {
    showConfirm(`¿Eliminar "${t.name}"?`, () => {
      state.deletePendingTask(i);
      showToast("Tarea eliminada");
    });
  };

  if (hasExtra) {
    const expandBtn = card.querySelector('.btn-expand-card');
    const detail = card.querySelector('.pending-card-detail');
    expandBtn.onclick = () => {
      const open = detail.style.display !== 'none';
      detail.style.display = open ? 'none' : 'block';
      expandBtn.style.transform = open ? '' : 'rotate(180deg)';
    };
    if (hasImage) {
      card.querySelector('.pending-card-img').onclick = () => openLightbox(t.image, t.name);
    }
  }

  return card;
}

function renderPending() {
  renderPendingInto(elements.pendingListDisplay, true);
  if (elements.pendingFullscreenModal && elements.pendingFullscreenModal.classList.contains('open')) {
    renderPendingInto(elements.pendingListFullscreenDisplay, false);
  }
}

function renderPendingInto(container, withEditFocus) {
  if (!container) return;
  container.innerHTML = '';

  const allTasks = state.store.pendingList.map((t, i) => ({ t, i }));

  if (allTasks.length === 0) {
    container.innerHTML = `<div style="padding: 30px 20px; text-align:center; color:var(--text-muted); font-size:0.9rem;">No tienes tareas pendientes. ¡Buen trabajo!</div>`;
    return;
  }

  const onEdit = withEditFocus ? (t, i) => {
    elements.pendingInput.value = t.name;
    elements.pendingPoints.value = t.pts;
    if (elements.pendingPriority) elements.pendingPriority.value = t.priority || 'media';
    elements.editPenIdx.value = i;
    elements.btnSavePen.innerText = "Actualizar";
    elements.pendingInput.focus();
    if (elements.pendingFullscreenModal) elements.pendingFullscreenModal.classList.remove('open');
  } : (t, i) => {
    elements.pendingInput.value = t.name;
    elements.pendingPoints.value = t.pts;
    if (elements.pendingPriority) elements.pendingPriority.value = t.priority || 'media';
    elements.editPenIdx.value = i;
    elements.btnSavePen.innerText = "Actualizar";
    if (elements.pendingFullscreenModal) elements.pendingFullscreenModal.classList.remove('open');
  };

  // Group by priority
  const groups = [
    { key: 'alta', label: 'Alta Prioridad' },
    { key: 'media', label: 'Media Prioridad' },
    { key: 'baja', label: 'Baja Prioridad' }
  ];

  groups.forEach(({ key, label }) => {
    const groupTasks = allTasks
      .filter(({ t }) => (t.priority || 'media') === key)
      .sort((a, b) => state.taskUrgencyScore(b.t) - state.taskUrgencyScore(a.t));

    if (groupTasks.length === 0) return;

    const prio = PRIORITY_META[key];
    const header = document.createElement('div');
    header.className = 'pending-section-header';
    header.style.borderLeftColor = prio.color;
    header.innerHTML = `<span style="display:inline-flex; align-items:center; gap:6px;"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${prio.color};"></span>${label}</span><span class="pending-section-count">${groupTasks.length}</span>`;
    container.appendChild(header);

    groupTasks.forEach(({ t, i }) => {
      container.appendChild(buildPendingCard(t, i, onEdit));
    });
  });
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
        <div class="percent-box" style="border-top-color: ${esc(u.color)}">
          <div class="percent-name" style="color:${esc(u.color)}">${esc(u.name)}</div>
          <div class="percent-value" style="color:${esc(u.color)}">${percent}%</div>
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
          <span style="font-weight:700; font-size:0.95rem;">${esc(t.name)}</span>
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
          <input type="color" class="user-color-picker" value="${esc(u.color)}" style="width:28px; height:28px; border:none; padding:0; background:none; border-radius:50%; cursor:pointer;">
          <span style="font-weight:700; font-size:1rem; color:var(--text-main);">${esc(u.name)}</span>
        </div>
        <button class="btn-delete-user" style="background:rgba(239, 68, 68, 0.1); color:var(--danger); border:none; border-radius:8px; padding:6px 12px; font-weight:700; font-size:0.75rem; cursor:pointer;">Eliminar</button>
      </div>
      
      <div style="display:flex; gap:10px;">
        <div style="flex:2;">
          <label style="font-size:0.65rem; color:var(--text-muted); font-weight:700; display:block; margin-bottom:4px;">NOMBRE</label>
          <input type="text" class="user-name-input" value="${esc(u.name)}" style="margin:0; padding:10px; background:rgba(15,23,42,0.25);">
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
        <div class="summary-card" style="border-left-color: ${esc(u.color)}">
          <span class="summary-label">PTS DE ${esc(u.name.toUpperCase())}</span>
          <span class="summary-value" style="color:${esc(u.color)}">${pts}</span>
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
          <td style="color:${esc(u?.color)}; font-weight:700;">${esc(u?.name || '???')}</td>
          <td>${esc(x.name)}</td>
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
    const roomName = state.currentRoomName || 'la Sala';
    select.innerHTML = '';
    const roomOpt = document.createElement('option');
    roomOpt.value = 'casa';
    roomOpt.innerText = roomName;
    select.appendChild(roomOpt);
    state.store.config.users.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id;
      opt.innerText = u.name;
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
    if (elements.shopItemImage) elements.shopItemImage.value = '';
    if (elements.shopImageFileName) elements.shopImageFileName.innerText = 'Sin foto seleccionada';
    if (elements.btnRemoveShopImage) elements.btnRemoveShopImage.style.display = 'none';
    if (elements.shopImagePreviewContainer) elements.shopImagePreviewContainer.style.display = 'none';
    if (elements.shopImagePreview) elements.shopImagePreview.src = '';
  }
}

// Current column count for shopping (1 or 2). Persisted in localStorage.
let shopCols = Math.min(2, parseInt(localStorage.getItem('shopCols') || '1', 10));

export function setShopCols(n) {
  shopCols = Math.min(2, Math.max(1, n));
  localStorage.setItem('shopCols', shopCols);
  // Update toggle button active states (inline + fullscreen)
  ['', 'Fs'].forEach(prefix => {
    [1, 2].forEach(c => {
      const btn = elements[`btn${prefix}Col${c}`];
      if (btn) btn.classList.toggle('active', c === shopCols);
    });
  });
  _applyShopGrid(elements.shoppingListDisplay);
  _applyShopGrid(elements.shoppingListFullscreenDisplay);
  // Re-render to switch between row/tile layouts
  renderShoppingList();
}

function _applyShopGrid(container) {
  if (!container) return;
  container.classList.remove('shop-grid-1', 'shop-grid-2');
  container.classList.add(`shop-grid-${shopCols}`);

  // Force inline styles on the fullscreen container — CSS class specificity
  // fights with flex:1 from .fullscreen-body in some browsers.
  if (container === elements.shoppingListFullscreenDisplay) {
    if (shopCols === 2) {
      container.style.display = 'flex';
      container.style.flexWrap = 'wrap';
      container.style.flexDirection = '';
      container.style.gap = '16px';
      container.style.alignContent = 'start';
      container.style.alignItems = '';
      container.style.gridTemplateColumns = '';
    } else {
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.flexWrap = '';
      container.style.gap = '10px';
      container.style.alignContent = '';
      container.style.alignItems = '';
      container.style.gridTemplateColumns = '';
    }
  }
}

export function renderShoppingList() {
  _applyShopGrid(elements.shoppingListDisplay, false);
  renderShoppingItemsInto(elements.shoppingListDisplay);
  if (elements.shoppingFullscreenModal && elements.shoppingFullscreenModal.classList.contains('open')) {
    _applyShopGrid(elements.shoppingListFullscreenDisplay, true);
    renderShoppingItemsInto(elements.shoppingListFullscreenDisplay);
  }
}

function renderShoppingItemsInto(list) {
  if (!list) return;
  list.innerHTML = '';

  const items = state.store.shoppingList || [];
  const isTile = shopCols === 2;

  if (items.length === 0) {
    list.innerHTML = `<div style="padding: 40px 20px; text-align: center; color: var(--text-muted); font-size: 0.9rem;">No hay compras pendientes. ¡Todo al día!</div>`;
    return;
  }

  const roomName = state.currentRoomName || 'la Sala';

  items.forEach((item, index) => {
    let targetBadge = '';
    if (!item.assignedTo || item.assignedTo === 'casa') {
      targetBadge = `<span class="shop-badge-room">${esc(roomName)}</span>`;
    } else {
      const assignedUser = state.store.config.users.find(u => u.id === item.assignedTo);
      const color = assignedUser ? assignedUser.color : 'var(--text-muted)';
      const name = assignedUser ? assignedUser.name : '???';
      targetBadge = `<span class="shop-badge-user" style="background:${esc(color)}15;color:${esc(color)};border-color:${esc(color)}30;">${esc(name)}</span>`;
    }

    const displayName = item.name && item.name.trim() ? item.name : 'Artículo en foto';
    const hasImage = !!item.image;

    const card = document.createElement('div');
    card.className = `shop-card${isTile ? ' shop-card-tile' : ''}`;

    if (isTile) {
      // ─── TILE LAYOUT (2-col): image on top, info + buttons below ───
      card.innerHTML = `
        <div class="shop-tile-img-wrap">
          ${hasImage
            ? `<img class="shop-tile-img" src="${esc(item.image)}" alt="${esc(displayName)}">`
            : `<div class="shop-tile-placeholder"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity=".25"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`
          }
        </div>
        <div class="shop-tile-info">
          <span class="shop-tile-name">${esc(displayName)}</span>
          <div class="shop-tile-meta">
            ${item.qty ? `<span class="shop-qty">${esc(item.qty)}</span>` : ''}
            ${targetBadge}
          </div>
          <div class="shop-tile-btns">
            <button class="shop-tile-btn shop-tile-buy" title="Comprado"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Comprado</button>
            <button class="shop-tile-btn shop-tile-del" title="Eliminar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
        </div>
      `;
    } else {
      // ─── ROW LAYOUT (1-col): image on left, info + actions on right ───
      card.innerHTML = `
        <div class="shop-card-inner">
          ${hasImage ? `<img class="shop-card-img" src="${esc(item.image)}" alt="${esc(displayName)}">` : ''}
          <div class="shop-card-info">
            <span class="shop-card-name">${esc(displayName)}</span>
            <div class="shop-card-meta">
              ${item.qty ? `<span class="shop-qty">${esc(item.qty)}</span>` : ''}
              ${targetBadge}
            </div>
          </div>
          <div class="shop-card-btns">
            <button class="btn-buy-shop" title="Comprado"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></button>
            <button class="btn-del-shop" title="Eliminar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
        </div>
        <div class="shop-card-detail" style="display:none;">
          ${hasImage ? `<img class="shop-card-detail-img" src="${esc(item.image)}" alt="${esc(displayName)}">` : ''}
          ${item.qty ? `<div class="shop-card-detail-row"><span class="shop-detail-label">Cantidad:</span> ${esc(item.qty)}</div>` : ''}
          <div class="shop-card-detail-row"><span class="shop-detail-label">Para:</span> ${targetBadge}</div>
        </div>
      `;
    }

    // ── Actions ──
    const doBuy = () => { state.buyShoppingItem(index); showToast(`${displayName} comprado`); };
    const doDelete = () => {
      showConfirm(`¿Eliminar "${displayName}"?`, () => {
        state.deleteShoppingItem(index);
        showToast("Artículo eliminado");
      });
    };

    // Single-tap on row card → toggle expand
    if (!isTile) {
      card.addEventListener('click', (e) => {
        if (e.target.closest('button') || e.target.closest('img')) return;
        const detail = card.querySelector('.shop-card-detail');
        if (detail) detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
      });
      card.querySelector('.btn-buy-shop').onclick = (e) => { e.stopPropagation(); doBuy(); };
      card.querySelector('.btn-del-shop').onclick = (e) => { e.stopPropagation(); doDelete(); };
      if (hasImage) {
        card.querySelector('.shop-card-img').onclick = (e) => { e.stopPropagation(); openLightbox(item.image, displayName); };
      }
    } else {
      card.querySelector('.shop-tile-buy').onclick = (e) => { e.stopPropagation(); doBuy(); };
      card.querySelector('.shop-tile-del').onclick = (e) => { e.stopPropagation(); doDelete(); };
      if (hasImage) {
        card.querySelector('.shop-tile-img').onclick = (e) => { e.stopPropagation(); openLightbox(item.image, displayName); };
      }
    }

    list.appendChild(card);
  });
}

export function openShoppingFullscreen() {
  const modal = elements.shoppingFullscreenModal;
  if (!modal) return;
  _applyShopGrid(elements.shoppingListFullscreenDisplay, true);
  renderShoppingItemsInto(elements.shoppingListFullscreenDisplay);
  // Sync fs column toggle states
  setShopCols(shopCols);
  modal.classList.add('open');
}

export function closeShoppingFullscreen() {
  if (elements.shoppingFullscreenModal) {
    elements.shoppingFullscreenModal.classList.remove('open');
  }
}

export function openPendingFullscreen() {
  const modal = elements.pendingFullscreenModal;
  if (!modal) return;
  renderPendingInto(elements.pendingListFullscreenDisplay, false);
  modal.classList.add('open');
}

export function closePendingFullscreen() {
  if (elements.pendingFullscreenModal) elements.pendingFullscreenModal.classList.remove('open');
}

export function openTodayFullscreen() {
  const modal = elements.todayFullscreenModal;
  if (!modal) return;
  renderTodayLogInto(elements.todayFullscreenDisplay);
  modal.classList.add('open');
}

export function closeTodayFullscreen() {
  if (elements.todayFullscreenModal) elements.todayFullscreenModal.classList.remove('open');
}

function renderTodayLogInto(container) {
  if (!container) return;
  container.innerHTML = '';
  const logs = [...state.store.todayLog].reverse();
  if (logs.length === 0) {
    container.innerHTML = `<div style="padding:40px 20px; text-align:center; color:var(--text-muted); font-size:0.9rem;">No hay actividad registrada hoy todavía.</div>`;
    return;
  }
  logs.forEach(x => {
    const logUser = state.store.config.users.find(us => us.id === x.who);
    const col = logUser ? logUser.color : 'var(--text-muted)';
    const nam = logUser ? logUser.name : '???';
    const item = document.createElement('div');
    item.className = 'log-item';
    item.innerHTML = `
      <div>
        <span class="log-time">${x.time}</span>
        <span style="color:${esc(col)}; font-weight:700; margin-right:6px;">${esc(nam.substring(0,5))}:</span>
        <span>${esc(x.name)}</span>
      </div>
      <span class="badge">+${x.pts}</span>
    `;
    container.appendChild(item);
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
        <div class="room-card-name">${esc(r.name)}</div>
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
        <div class="member-email">${esc(m.email || m.name || 'Usuario')}</div>
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
 * Enable pointer-based drag-to-reorder on a roadmap block via its handle.
 * Works for both touch and mouse (Pointer Events + pointer capture).
 */
function _setupRoadmapDrag(handle, row, list) {
  let dragging = false;

  const onMove = (e) => {
    if (!dragging) return;
    const y = e.clientY;
    const siblings = [...list.querySelectorAll('.roadmap-item-row:not(.roadmap-dragging)')];
    let inserted = false;
    for (const sib of siblings) {
      const rect = sib.getBoundingClientRect();
      if (y < rect.top + rect.height / 2) {
        list.insertBefore(row, sib);
        inserted = true;
        break;
      }
    }
    if (!inserted) list.appendChild(row);
  };

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    row.classList.remove('roadmap-dragging');
    try { handle.releasePointerCapture(e.pointerId); } catch (_) {}
    handle.removeEventListener('pointermove', onMove);
    handle.removeEventListener('pointerup', endDrag);
    handle.removeEventListener('pointercancel', endDrag);
    const orderedIds = [...list.querySelectorAll('.roadmap-item-row')].map(r => r.dataset.itemId);
    state.reorderRoadmapItems(orderedIds);
  };

  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    dragging = true;
    row.classList.add('roadmap-dragging');
    try { handle.setPointerCapture(e.pointerId); } catch (_) {}
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
  });
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

  // 3+4. Populate the interactive block builder (Pendientes + Rutinas grids)
  renderRoadmapBuilder();

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
    el.dataset.itemId = item.id;
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

    // Drag handle (only when the plan is unlocked) — lets you reorder blocks
    const dragHandleHtml = locked
      ? ''
      : `<button class="roadmap-drag-handle" aria-label="Mover bloque" title="Arrastra para mover"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="9" cy="6" r="1.6"></circle><circle cx="15" cy="6" r="1.6"></circle><circle cx="9" cy="12" r="1.6"></circle><circle cx="15" cy="12" r="1.6"></circle><circle cx="9" cy="18" r="1.6"></circle><circle cx="15" cy="18" r="1.6"></circle></svg></button>`;

    const deleteBtnHtml = locked
      ? ''
      : `<button class="btn-del-roadmap" style="display: flex; align-items: center; justify-content: center; opacity: 0.5; cursor: pointer; border: none; background: none; color: var(--danger); padding: 4px; transition: var(--transition);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>`;

    el.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px; overflow: hidden; flex: 1;">
        ${dragHandleHtml}
        <button class="btn-check-roadmap" style="display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 6px; flex-shrink: 0; background: ${item.completed ? 'var(--success)' : 'none'}; border: 1.5px solid ${item.completed ? 'var(--success)' : 'var(--text-muted)'}; color: ${item.completed ? 'white' : 'var(--text-muted)'}; cursor: pointer; transition: var(--transition);">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="display: ${item.completed ? 'block' : 'none'}"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </button>
        <div style="display: flex; flex-direction: column; overflow: hidden;">
          <span style="font-weight: 600; font-size: 0.88rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-main); ${item.completed ? 'text-decoration: line-through;' : ''}">${esc(item.text)}</span>
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

    // Bind drag-to-reorder on the handle
    const handle = el.querySelector('.roadmap-drag-handle');
    if (handle) {
      _setupRoadmapDrag(handle, el, list);
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
      unlockBtn.style.display = 'inline-flex';
      unlockBtn.style.alignItems = 'center';
      unlockBtn.style.justifyContent = 'center';
      unlockBtn.style.gap = '6px';
      unlockBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>Modificar Plan';
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
      lockBtn.style.display = 'inline-flex';
      lockBtn.style.alignItems = 'center';
      lockBtn.style.justifyContent = 'center';
      lockBtn.style.gap = '8px';
      lockBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>Listo, Fijar Plan de Hoy';
      lockBtn.onclick = () => {
        state.lockRoadmap();
        showToast("¡Plan de hoy fijado! A enfocarse.");
      };
      actionDiv.appendChild(lockBtn);
    }
    list.appendChild(actionDiv);
  }

  // Re-render tree if the modal is open to keep it in sync in real time
  // (without replaying the growth animation, which would be jarring)
  if (elements.modalProgressTree && elements.modalProgressTree.classList.contains('visible')) {
    renderFocusTree(false);
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
    // Refresh the available blocks every time the builder opens
    renderRoadmapBuilder();
  }
}

/**
 * Switch between the builder's inner sub-tabs (pending / routine / personal)
 */
export function toggleBuilderSubtab(sub) {
  const panels = {
    pending: 'builderPanelPending',
    routine: 'builderPanelRoutine',
    personal: 'builderPanelPersonal'
  };
  Object.entries(panels).forEach(([key, panelId]) => {
    const panel = document.getElementById(panelId);
    if (panel) panel.classList.toggle('hidden', key !== sub);
  });
  document.querySelectorAll('.builder-subtab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sub === sub);
  });
}

/**
 * Build a single tappable block tile. Each tap adds a copy to the plan.
 */
function _buildBlock(name, pts, type) {
  const btn = document.createElement('button');
  btn.className = `builder-block ${type === 'routine' ? 'routine' : ''}`;
  btn.type = 'button';

  const nameSpan = document.createElement('span');
  nameSpan.className = 'builder-block-name';
  nameSpan.textContent = name;

  const foot = document.createElement('div');
  foot.className = 'builder-block-foot';
  const ptsLabel = type === 'routine' ? `+${pts} pts` : `${pts} pts`;
  foot.innerHTML = `<span class="builder-block-pts">${ptsLabel}</span><span class="builder-block-add">+</span>`;

  btn.appendChild(nameSpan);
  btn.appendChild(foot);

  btn.onclick = () => {
    state.addRoadmapItem(name, type, pts);
    // Restart the "added" pulse animation
    btn.classList.remove('just-added');
    void btn.offsetWidth;
    btn.classList.add('just-added');
    updateBuilderCount();
    showToast(`"${name}" añadido al plan`);
  };

  return btn;
}

/**
 * Populate the Pendientes + Rutinas grids with available blocks
 */
export function renderRoadmapBuilder() {
  const pendingGrid = document.getElementById('builderGridPending');
  if (pendingGrid) {
    pendingGrid.innerHTML = '';
    const pend = state.store.pendingList || [];
    if (pend.length === 0) {
      pendingGrid.innerHTML = `<div class="builder-empty">No tienes tareas pendientes.<br>Créalas en la pestaña Pendientes.</div>`;
    } else {
      pend.forEach(t => pendingGrid.appendChild(_buildBlock(t.name, t.pts, 'pending')));
    }
  }

  const routineGrid = document.getElementById('builderGridRoutine');
  if (routineGrid) {
    routineGrid.innerHTML = '';
    const tpls = state.store.templates || [];
    if (tpls.length === 0) {
      routineGrid.innerHTML = `<div class="builder-empty">No tienes rutinas guardadas.<br>Guárdalas desde el menú de plantillas.</div>`;
    } else {
      tpls.forEach(t => routineGrid.appendChild(_buildBlock(t.name, t.pts, 'routine')));
    }
  }

  updateBuilderCount();
}

/**
 * Update the live "Tu plan: N bloques" footer counter
 */
export function updateBuilderCount() {
  const countEl = document.getElementById('builderPlanCount');
  if (!countEl) return;
  const plan = state.store.roadmaps && state.store.roadmaps[state.localProfileId];
  const n = plan && Array.isArray(plan.items) ? plan.items.length : 0;
  countEl.textContent = `Tu plan: ${n} ${n === 1 ? 'bloque' : 'bloques'}`;
}

/**
 * Render the Weekly Focus Tree (Árbol de Enfoque) dynamic SVG inside the modal
 */
export function renderFocusTree(animate = true) {
  const activeUser = state.store.config.users.find(u => u.id === state.localProfileId) || state.store.config.users[0];
  if (!activeUser) return;

  const todayStr = new Date().toDateString();

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
    const leafIcon = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path><path d="M2 21c0-3 1.85-5.36 5.08-6"></path></svg>`;
    const flowerIcon = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><circle cx="12" cy="12" r="3"></circle><path d="M12 9.5V4M12 14.5V20M9.5 12H4M14.5 12H20M10.2 10.2 6.5 6.5M13.8 10.2 17.5 6.5M10.2 13.8 6.5 17.5M13.8 13.8 17.5 17.5"></path></svg>`;
    const dropIcon = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>`;
    if (isWithered) {
      statusHint.innerHTML = `<span style="color: var(--danger); font-weight:700;">${leafIcon} Tu árbol se está marchitando por falta de constancia.</span> ¡Completa tareas del roadmap o registra actividades hoy para revivirlo!`;
    } else if (isBloomed) {
      statusHint.innerHTML = `<span style="color: #db2777; font-weight:700;">${flowerIcon} ¡Espectacular! Tu árbol ha florecido.</span> Has mantenido un ritmo de enfoque excelente esta semana.`;
    } else {
      const daysNeeded = Math.max(0, 5 - fullBranchesCount);
      statusHint.innerHTML = `${dropIcon} Regado y creciendo con tu constancia. Completa ${fullBranchThreshold}+ actividades por día para hacerlo florecer (Faltan ${daysNeeded} días de enfoque).`;
    }
  }

  // 3. Build SVG Tree (organic shapes + growth, sway and bloom animations)
  const rnd = treeRnd;
  const skyTint = isWithered ? '#e2e8f0' : (isBloomed ? '#fdf2f8' : '#ecfdf5');
  const woodDark = isWithered ? '#64748b' : '#4a2c10';
  const woodLight = isWithered ? '#94a3b8' : '#8a5a2b';
  const branchWood = isWithered ? '#94a3b8' : '#6b4423';

  let svgContent = `<svg width="100%" height="440" viewBox="0 0 400 450" xmlns="http://www.w3.org/2000/svg" class="focus-tree-svg${animate ? '' : ' no-anim'}">`;

  svgContent += `<defs>
    <radialGradient id="ft-sky" cx="50%" cy="28%" r="78%">
      <stop offset="0%" stop-color="${skyTint}" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="${skyTint}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ft-trunk" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="${woodDark}"/>
      <stop offset="100%" stop-color="${woodLight}"/>
    </linearGradient>
    <linearGradient id="ft-ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${isWithered ? '#94a3b8' : '#4d7c0f'}" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="${isWithered ? '#cbd5e1' : '#84cc16'}" stop-opacity="0.05"/>
    </linearGradient>
  </defs>`;

  // Atmosphere + ground mound + grass blades
  svgContent += `<rect x="0" y="0" width="400" height="450" fill="url(#ft-sky)"/>`;
  svgContent += `<ellipse cx="200" cy="426" rx="170" ry="20" fill="url(#ft-ground)"/>`;
  for (let g = 0; g < 12; g++) {
    const gx = 58 + g * 25 + rnd(g) * 14;
    const gh = 6 + rnd(g + 50) * 9;
    const lean = (rnd(g + 90) - 0.5) * 9;
    svgContent += `<path d="M ${gx.toFixed(1)} 425 Q ${(gx + lean).toFixed(1)} ${(425 - gh).toFixed(1)} ${(gx + lean * 1.7).toFixed(1)} ${(423 - gh).toFixed(1)}" stroke="${isWithered ? '#94a3b8' : '#65a30d'}" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.5"/>`;
  }

  // Trunk: tapered with a soft S-curve, sprouts from the ground on open
  svgContent += `<g class="trunk-grow" style="transform-origin:200px 426px;">
    <path d="M 187 426 C 194 360 190 300 196 235 C 199 178 196 118 198 62 L 203 62 C 205 118 203 178 206 235 C 211 300 208 360 215 426 Q 201 420 187 426 Z" fill="url(#ft-trunk)"/>
    <path d="M 174 426 Q 187 417 200 420 Q 215 417 228 426 L 215 425 Q 200 422 186 425 Z" fill="${woodDark}" opacity="0.55"/>
  </g>`;

  // Draw 7 Branches (bottom = oldest day; they sprout in order, then sway)
  const yCoordinates = [360, 315, 270, 225, 180, 135, 90];

  daysList.forEach((day, i) => {
    const y = yCoordinates[i];
    const growsLeft = i % 2 === 0;
    const isToday = i === 6;

    // Define Curve Coordinates (withered branches droop towards the ground)
    const p0 = { x: 200, y: y };
    const p1 = growsLeft ? { x: 150, y: y + (isWithered ? 26 : 10) } : { x: 250, y: y + (isWithered ? 26 : 10) };
    const p2 = growsLeft ? { x: 112, y: y + (isWithered ? 34 : -25) } : { x: 288, y: y + (isWithered ? 34 : -25) };

    const branchColor = isWithered ? '#94a3b8' : (isToday ? activeUser.color : branchWood);
    const branchDelay = 0.3 + i * 0.13;
    const swayDur = (5.5 + i * 0.5 + rnd(i) * 1.5).toFixed(2);
    const swayDelay = (rnd(i + 20) * 2.5).toFixed(2);

    svgContent += `<g class="branch-sway" style="transform-origin:200px ${y}px; animation-duration:${swayDur}s; animation-delay:${swayDelay}s;">`;
    svgContent += `<g class="branch-grow" style="transform-origin:200px ${y}px; animation-delay:${branchDelay.toFixed(2)}s;">`;

    // Tapered main branch
    const glowClass = isToday && isWatered && !isWithered ? ' class="watered-branch"' : '';
    svgContent += `<path d="${taperedQuadPath(p0, p1, p2, isToday ? 7.5 : 6, 1.6)}" fill="${branchColor}"${glowClass} style="--active-color:${activeUser.color}"/>`;

    // Render Day Label
    const textX = growsLeft ? 96 : 304;
    const textAnchor = growsLeft ? 'end' : 'start';
    const textFill = isToday && !isWithered ? activeUser.color : 'var(--text-muted)';
    svgContent += `<text x="${textX}" y="${y - 28}" text-anchor="${textAnchor}" font-family="var(--font-title)" font-size="10.5px" font-weight="${isToday ? '800' : '600'}" fill="${textFill}">${isToday ? 'Hoy' : day.niceName}</text>`;

    // Get Completed tasks and activities for this day
    const leafItems = getDailyLeafItems(day.dateStr);
    const MAX_LEAVES = 9;
    const visible = leafItems.slice(0, MAX_LEAVES);
    const M = visible.length;
    const leafColor = isWithered ? '#b45309' : (isToday ? activeUser.color : '#22c55e');

    // Draw Leaves (organic shape, each pops in with its own delay)
    visible.forEach((task, j) => {
      const t = 0.28 + (j / Math.max(1, M - 1)) * 0.58;
      const P = getBezierPoint(t, p0, p1, p2);
      const twigLen = 8 + rnd(i * 7 + j * 3) * 5;
      const tx = P.x + (growsLeft ? -twigLen * 0.45 : twigLen * 0.45);
      const ty = P.y - twigLen;
      const ang = (growsLeft ? -1 : 1) * (16 + rnd(i * 31 + j * 13) * 26) + (j % 2 ? 12 : -12);
      const size = 11 + rnd(i * 13 + j * 17) * 4.5;
      const leafDelay = (branchDelay + 0.4 + j * 0.09).toFixed(2);

      svgContent += `<path d="M ${P.x.toFixed(1)} ${P.y.toFixed(1)} Q ${((P.x + tx) / 2).toFixed(1)} ${(P.y - twigLen * 0.7).toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}" stroke="${isWithered ? '#94a3b8' : branchWood}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
      svgContent += `<g class="leaf-pop" style="transform-origin:${tx.toFixed(1)}px ${ty.toFixed(1)}px; animation-delay:${leafDelay}s;">`
        + `<g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) rotate(${ang.toFixed(0)})">`
        + `<path d="${leafPath(size)}" fill="${leafColor}" class="tree-leaf" data-name="${esc(task.text)}" data-time="${esc(task.time || '')}" data-type="${esc(task.type)}" data-pts="${task.pts || 0}"/>`
        + `<path d="M 0 -1.5 L 0 ${(-(size - 2.5)).toFixed(1)}" stroke="rgba(255,255,255,0.4)" stroke-width="1" stroke-linecap="round" pointer-events="none"/>`
        + `</g></g>`;

      // Fertilized extra leaf on today's tasks
      if (isToday && isFertilized && !isWithered) {
        const fx = P.x + (growsLeft ? 3 : -3);
        const fy = P.y - twigLen - 7;
        svgContent += `<g class="leaf-pop" style="transform-origin:${fx.toFixed(1)}px ${fy.toFixed(1)}px; animation-delay:${(branchDelay + 0.6 + j * 0.09).toFixed(2)}s;">`
          + `<g transform="translate(${fx.toFixed(1)} ${fy.toFixed(1)}) rotate(${(-ang * 0.6).toFixed(0)})">`
          + `<path d="${leafPath(size + 3)}" fill="#15803d" class="tree-leaf" data-name="${esc(task.text)} (Meta Diaria)" data-time="${esc(task.time || '')}" data-type="${esc(task.type)}" data-pts="${task.pts || 0}"/>`
          + `</g></g>`;
      }
    });

    // If a day has more activities than fit on the branch, show a "+N" hint
    if (leafItems.length > MAX_LEAVES) {
      const tipP = getBezierPoint(0.95, p0, p1, p2);
      svgContent += `<text x="${tipP.x.toFixed(1)}" y="${(tipP.y - 14).toFixed(1)}" text-anchor="middle" font-size="9px" font-weight="700" fill="${leafColor}">+${leafItems.length - MAX_LEAVES}</text>`;
    }

    // Draw Blooming Flowers/Leaves
    if (isBloomed && !isWithered) {
      // 5-petal flower at the branch tip
      svgContent += `<g class="leaf-pop" style="transform-origin:${p2.x}px ${p2.y}px; animation-delay:${(branchDelay + 0.85).toFixed(2)}s;"><g class="flower-pulse">`
        + `<g transform="translate(${p2.x} ${p2.y})">`;
      for (let k = 0; k < 5; k++) {
        svgContent += `<ellipse cx="0" cy="-4.8" rx="3.1" ry="4.8" fill="#f9a8d4" stroke="#f472b6" stroke-width="0.6" transform="rotate(${k * 72})"/>`;
      }
      svgContent += `</g><circle cx="${p2.x}" cy="${p2.y}" r="2.6" fill="#fbbf24"/><circle cx="${p2.x}" cy="${p2.y}" r="1.1" fill="#fde68a"/>`
        + `<circle cx="${p2.x}" cy="${p2.y}" r="9" fill="transparent" class="tree-flower" data-name="Flor de Enfoque" data-desc="¡Rama de Enfoque Llena!"/>`
        + `</g></g>`;

      // Lush foliage sprouted along the branch
      [0.2, 0.5, 0.78].forEach((td, k) => {
        const P = getBezierPoint(td, p0, p1, p2);
        const angD = (growsLeft ? 1 : -1) * (140 + k * 28);
        svgContent += `<g transform="translate(${P.x.toFixed(1)} ${(P.y + 2).toFixed(1)}) rotate(${angD})"><path d="${leafPath(9)}" fill="#10b981" opacity="0.85" class="tree-decor-leaf" data-name="Follaje Florecido" data-desc="El árbol rebosa vida"/></g>`;
      });
    }

    svgContent += `</g></g>`;
  });

  // Blossoms on the trunk + falling petals if bloomed
  if (isBloomed && !isWithered) {
    [{ x: 194, y: 182 }, { x: 205, y: 243 }, { x: 197, y: 303 }].forEach((f, k) => {
      svgContent += `<g class="leaf-pop" style="transform-origin:${f.x}px ${f.y}px; animation-delay:${(1.3 + k * 0.15).toFixed(2)}s;"><g transform="translate(${f.x} ${f.y})">`;
      for (let p = 0; p < 5; p++) {
        svgContent += `<ellipse cx="0" cy="-3.2" rx="2" ry="3.2" fill="#f9a8d4" transform="rotate(${p * 72})"/>`;
      }
      svgContent += `<circle r="1.7" fill="#fbbf24"/></g></g>`;
    });
    for (let k = 0; k < 7; k++) {
      const px = (110 + rnd(k * 3 + 1) * 180).toFixed(0);
      const py = (70 + rnd(k * 5 + 2) * 140).toFixed(0);
      const dur = (6.5 + rnd(k * 7 + 3) * 4).toFixed(1);
      const del = (rnd(k * 11 + 4) * 6).toFixed(1);
      const drift = ((rnd(k * 13 + 5) - 0.5) * 70).toFixed(0);
      svgContent += `<g class="petal-fall" style="animation-duration:${dur}s; animation-delay:${del}s; --fall-x:${drift}px;"><ellipse cx="${px}" cy="${py}" rx="3.1" ry="2" fill="#f9a8d4" opacity="0.85"/></g>`;
    }
  }

  // Dry leaves drifting down if withered
  if (isWithered) {
    for (let k = 0; k < 4; k++) {
      const px = (130 + rnd(k * 3 + 9) * 140).toFixed(0);
      const py = (100 + rnd(k * 5 + 9) * 120).toFixed(0);
      const dur = (5 + rnd(k * 7 + 9) * 3).toFixed(1);
      const del = (rnd(k * 11 + 9) * 4).toFixed(1);
      const drift = ((rnd(k * 13 + 9) - 0.5) * 50).toFixed(0);
      svgContent += `<g class="petal-fall" style="animation-duration:${dur}s; animation-delay:${del}s; --fall-x:${drift}px;"><path d="${leafPath(9)}" transform="translate(${px} ${py})" fill="#b45309" opacity="0.7"/></g>`;
    }
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

      let text = `<strong>${esc(name)}</strong>`;

      if (desc) {
        text += `<br/><span style="color: #cbd5e1;">${esc(desc)}</span>`;
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

/**
 * Deterministic pseudo-random in [0,1): the tree keeps the same organic shape
 * between re-renders instead of "dancing" on every state change.
 */
function treeRnd(seed) {
  const s = Math.sin((seed + 1) * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Closed path for a branch that follows a quadratic bezier, tapering from
 * width w0 at the base to w1 at the tip.
 */
function taperedQuadPath(p0, p1, p2, w0, w1) {
  const steps = 8;
  const left = [];
  const right = [];
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const P = getBezierPoint(t, p0, p1, p2);
    const dx = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
    const dy = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const w = (w0 + (w1 - w0) * t) / 2;
    left.push(`${(P.x + nx * w).toFixed(1)} ${(P.y + ny * w).toFixed(1)}`);
    right.push(`${(P.x - nx * w).toFixed(1)} ${(P.y - ny * w).toFixed(1)}`);
  }
  return `M ${left.join(' L ')} L ${right.reverse().join(' L ')} Z`;
}

/**
 * Path for an organic leaf of the given height, anchored at its stem (0,0)
 * and pointing up. Place it with a translate+rotate wrapper group.
 */
function leafPath(size) {
  const h = size;
  const w = size * 0.62;
  return `M 0 0 C ${(-w).toFixed(1)} ${(-h * 0.35).toFixed(1)} ${(-w * 0.7).toFixed(1)} ${(-h * 0.85).toFixed(1)} 0 ${(-h).toFixed(1)} C ${(w * 0.7).toFixed(1)} ${(-h * 0.85).toFixed(1)} ${w.toFixed(1)} ${(-h * 0.35).toFixed(1)} 0 0 Z`;
}

/* --- ROOM SWITCHER --- */

/**
 * Render the quick room-switcher list.
 * @param {Array} rooms [{roomId, name, role, memberCount}]
 * @param {string} currentRoomId
 * @param {function} onSwitch  called with roomId when a room is chosen
 */
export function renderRoomSwitcher(rooms, currentRoomId, onSwitch) {
  const list = elements.roomSwitcherList;
  if (!list) return;
  list.innerHTML = '';

  if (!rooms || rooms.length === 0) {
    list.innerHTML = `<div class="rooms-hint" style="padding:10px 0;">No tienes otras salas.</div>`;
    return;
  }

  rooms.forEach(r => {
    const isCurrent = r.roomId === currentRoomId;
    const card = document.createElement('div');
    card.className = 'room-card' + (isCurrent ? ' room-card-current' : '');
    const roleLabel = r.role === 'owner' ? 'Dueño' : 'Miembro';
    const badgeClass = r.role === 'owner' ? 'badge-owner' : 'badge-member';
    card.innerHTML = `
      <div style="overflow:hidden;">
        <div class="room-card-name">${esc(r.name)}${isCurrent ? ' <span style="color:var(--success); font-size:0.7rem;">• actual</span>' : ''}</div>
        <div class="room-card-meta">${r.memberCount} miembro${r.memberCount === 1 ? '' : 's'}</div>
      </div>
      <span class="room-card-badge ${badgeClass}">${roleLabel}</span>
    `;
    if (!isCurrent) {
      card.onclick = () => onSwitch(r.roomId);
    }
    list.appendChild(card);
  });
}

/* --- AI ASSISTANT --- */

/**
 * Append a message bubble to the assistant chat. Returns the element so the
 * caller can update it (e.g. replace a "thinking…" placeholder with the reply).
 */
export function appendAgentMessage(text, who) {
  const wrap = elements.agentMessages;
  if (!wrap) return null;
  const msg = document.createElement('div');
  msg.className = `agent-msg agent-msg-${who === 'user' ? 'user' : 'bot'}`;
  msg.innerText = text;
  wrap.appendChild(msg);
  wrap.scrollTop = wrap.scrollHeight;
  return msg;
}

export function scrollAgentToBottom() {
  const wrap = elements.agentMessages;
  if (wrap) wrap.scrollTop = wrap.scrollHeight;
}

/* --- ACCESS CODE SECTION --- */

/**
 * Hide the "redeem code" section once the user is already Pro.
 */
export function setRedeemVisible(visible) {
  if (elements.redeemSection) {
    elements.redeemSection.style.display = visible ? '' : 'none';
  }
}

export { elements };
