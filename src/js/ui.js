import { updateTimeChart, updateWeekBarChart, updateHistorialChart } from "./chart";
import { downloadReportPDF } from "./pdf";
import * as state from "./state";
import { t as tr, plural, getLang } from "./i18n";

export function getTagStyle(tagName) {
  const colors = [
    { bg: 'rgba(59, 130, 246, 0.1)', text: '#2563eb', border: 'rgba(59, 130, 246, 0.2)' }, // Blue
    { bg: 'rgba(16, 185, 129, 0.1)', text: '#059669', border: 'rgba(16, 185, 129, 0.2)' }, // Green
    { bg: 'rgba(139, 92, 246, 0.1)', text: '#7c3aed', border: 'rgba(139, 92, 246, 0.2)' }, // Purple
    { bg: 'rgba(244, 63, 94, 0.1)',  text: '#e11d48', border: 'rgba(244, 63, 94, 0.2)' },  // Rose
    { bg: 'rgba(245, 158, 11, 0.1)', text: '#d97706', border: 'rgba(245, 158, 11, 0.2)' },  // Amber
    { bg: 'rgba(6, 182, 212, 0.1)',  text: '#0891b2', border: 'rgba(6, 182, 212, 0.2)' }   // Cyan
  ];
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

const activeSavedListFilters = {};
export let activeGeneralListFilters = [];

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
    shopItemTags: document.getElementById('shopItemTags'),
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
    btnTogglePendingForm: document.getElementById('btnTogglePendingForm'),
    pendingFormCollapse: document.getElementById('pendingFormCollapse'),
    pendingDesc: document.getElementById('pendingDesc'),
    pendingDeadline: document.getElementById('pendingDeadline'),
    btnToggleSavedListForm: document.getElementById('btnToggleSavedListForm'),
    savedListFormCollapse: document.getElementById('savedListFormCollapse'),
    savedListFormName: document.getElementById('savedListFormName'),
    savedListFormItems: document.getElementById('savedListFormItems'),
    btnSaveSavedListForm: document.getElementById('btnSaveSavedListForm'),
    savedListFormDestination: document.getElementById('savedListFormDestination'),
    savedListFormNewNameContainer: document.getElementById('savedListFormNewNameContainer'),
    savedListFormExistingContainer: document.getElementById('savedListFormExistingContainer'),
    savedListFormExistingSelect: document.getElementById('savedListFormExistingSelect'),
    btnShoppingShare: document.getElementById('btnShoppingShare'),
    btnShoppingFullscreenShare: document.getElementById('btnShoppingFullscreenShare'),
    builderUserTitle: document.getElementById('builderUserTitle'),
    btnEmailReport: document.getElementById('btnEmailReport'),
    btnEmailWeeklyReport: document.getElementById('btnEmailWeeklyReport'),
    
    // Saved lists edit modal
    editSavedListModal: document.getElementById('editSavedListModal'),
    editSavedListModalName: document.getElementById('editSavedListModalName'),
    editSavedListModalItems: document.getElementById('editSavedListModalItems'),
    btnSaveEditSavedListModal: document.getElementById('btnSaveEditSavedListModal'),
    btnCancelEditSavedListModal: document.getElementById('btnCancelEditSavedListModal'),
    btnCloseEditSavedListModal: document.getElementById('btnCloseEditSavedListModal'),

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
    streakOptions: document.getElementById('streakOptions'),

    // Chart tabs
    btnChartTabHoy: document.getElementById('btnChartTabHoy'),
    btnChartTabHistorial: document.getElementById('btnChartTabHistorial'),
    historialChart: document.getElementById('historialChart'),

    btnOpenWeeklyReport: document.getElementById('btnOpenWeeklyReport'),

    // Weekly report overlay
    weeklyReportOverlay: document.getElementById('weeklyReportOverlay'),
    weeklyReportContent: document.getElementById('weeklyReportContent'),
    btnCloseWeeklyReport: document.getElementById('btnCloseWeeklyReport'),
    btnDownloadWeeklyPDF: document.getElementById('btnDownloadWeeklyPDF'),

    // Saved shopping lists tab
    btnTabShoppingSaved: document.getElementById('btnTabShoppingSaved'),
    shoppingSavedTab: document.getElementById('shoppingSavedTab'),
    btnCreateSavedList: document.getElementById('btnCreateSavedList')
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

export function showConfirm(message, onConfirm, onCancel = null, yesLabel = null, noLabel = null) {
  if (!confirmOverlay) createConfirmContainer();
  
  document.getElementById('confirmMessage').innerText = message;
  
  const yesBtn = document.getElementById('confirmYesBtn');
  const noBtn = document.getElementById('confirmNoBtn');
  
  yesBtn.innerText = yesLabel || tr('confirm.yes') || 'Confirmar';
  noBtn.innerText = noLabel || tr('confirm.no') || 'Cancelar';
  
  confirmOverlay.classList.add('visible');
  
  const cleanUp = () => {
    confirmOverlay.classList.remove('visible');
    // Remove listeners to avoid accumulation
    yesBtn.onclick = null;
    noBtn.onclick = null;
  };

  yesBtn.onclick = () => {
    cleanUp();
    if (onConfirm) onConfirm();
  };

  noBtn.onclick = () => {
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
  // Reset FAB position on page switch
  const fab = document.getElementById('mainFab');
  if (fab) {
    fab.style.left = '';
    fab.style.right = '';
    fab.style.bottom = '';
    localStorage.removeItem('fabLeft');
    localStorage.removeItem('fabBottom');
  }

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
    elements.displayLabel.innerText = tr('tracker.pts.user', { name: activeUser.name });
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
      elements.dailyRem.innerText = tr('tracker.rem.left', { n: diff });
      elements.dailyRem.style.color = 'var(--text-muted)';
    } else {
      elements.dailyRem.innerText = tr('tracker.rem.exceeded', { n: Math.abs(diff) });
      elements.dailyRem.style.color = 'var(--success)';
    }
  }

  // 3. Weekly Balance Calculation
  let weeklyPts = 0;
  if (state.store.history) {
    state.store.history.forEach(h => {
      if (h.points && h.points[state.localProfileId] !== undefined) {
        weeklyPts += Math.min(h.points[state.localProfileId], userMeta);
      }
    });
  }
  weeklyPts += Math.min(activePts, userMeta);

  const configDays = state.store.config.days || 6;
  const weeklyGoal = userMeta * configDays;

  // How many active workdays have actually elapsed this week (Mon–today, capped at configDays).
  // JS getDay(): 0=Sun,1=Mon,...,6=Sat. We treat the week as Mon→configDays.
  const dowToday = new Date().getDay();
  const daysSinceMon = dowToday === 0 ? 6 : dowToday - 1; // 0=Mon, 5=Sat, 6=Sun
  const workdaysCovered = Math.min(daysSinceMon + 1, configDays); // days elapsed incl. today
  const maxEarnableNow  = workdaysCovered * userMeta;            // ceiling of what's possible so far
  const weekDone = weeklyPts >= maxEarnableNow;                  // earned everything possible

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
    if (weekDone) {
      // All earnable points for elapsed days are done — week is complete regardless of calendar
      elements.weeklyRem.innerText = weeklyPts >= weeklyGoal
        ? tr('tracker.weekly.done')
        : tr('tracker.weekly.done.alt');
      elements.weeklyRem.style.color = 'var(--success)';
    } else if (wDiff > 0) {
      elements.weeklyRem.innerText = tr('tracker.weekly.left', { n: wDiff });
      elements.weeklyRem.style.color = 'var(--text-muted)';
    } else {
      elements.weeklyRem.innerText = tr('tracker.weekly.met');
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
    
    let displayName = x.name;
    if (x.name === 'BONO Racha') {
      displayName = tr('toast.streak');
    } else if (x.name === 'Ahorro Usado') {
      displayName = tr('tracker.savings.used');
    }

    let badgeHtml = `<span class="badge">+${x.pts}</span>`;
    if (x.name.includes("Ahorro")) {
      badgeHtml = `<span class="badge badge-redeem">+${x.pts} (${tr('tracker.savings.badge')})</span>`;
    }

    const item = document.createElement('div');
    item.className = 'log-item';
    item.innerHTML = `
      <div>
        <span class="log-time">${x.time}</span>
        <span style="color:${esc(col)}; font-weight:700; margin-right:6px;">${esc(nam.substring(0, 5))}:</span>
        <span>${esc(displayName)}</span>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        ${badgeHtml}
        <button class="del-btn" data-id="${x.id}" style="display:flex; align-items:center; justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
      </div>
    `;

    item.querySelector('.del-btn').onclick = () => {
      showConfirm(tr('confirm.delete.log', { name: x.name }), () => {
        state.deleteLogEntry(x.id);
        showToast(tr('toast.log.deleted'));
      });
    };

    list.appendChild(item);
  });
}


// Visual config per priority level.
const PRIORITY_META = {
  alta:  { color: '#ef4444', get label() { return tr('priority.high'); } },
  media: { color: '#f59e0b', get label() { return tr('priority.medium'); } },
  baja:  { color: '#3b82f6', get label() { return tr('priority.low'); } }
};

function buildPendingCard(t, i, onEdit) {
  const prio = PRIORITY_META[t.priority] || PRIORITY_META.media;
  const ageDays = state.taskAgeDays(t);
  const isUrgent = t.priority === 'alta' || ageDays >= 3;

  let ageLabel;
  if (ageDays <= 0) ageLabel = tr('pending.age.today');
  else if (ageDays === 1) ageLabel = tr('pending.age.one');
  else ageLabel = tr('pending.age.many', { n: ageDays });

  const card = document.createElement('div');
  card.className = 'pending-card' + (isUrgent ? ' pending-urgent' : '');
  card.style.borderLeftColor = prio.color;
  card.style.cursor = 'pointer';

  const hasImage = !!t.image;

  // Google Calendar URL construction
  const getGoogleCalendarUrl = (task) => {
    const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
    const text = encodeURIComponent(task.name);
    const details = encodeURIComponent((task.desc || '') + '\n\nProductivity Tracker Task');
    let datesStr = '';
    if (task.deadline) {
      const cleanDate = task.deadline.replace(/-/g, ''); // YYYYMMDD
      // Calculate next day
      const d = new Date(task.deadline + 'T12:00:00');
      d.setDate(d.getDate() + 1);
      const nextDate = d.toISOString().split('T')[0].replace(/-/g, '');
      datesStr = `&dates=${cleanDate}/${nextDate}`;
    }
    return `${base}&text=${text}&details=${details}${datesStr}`;
  };

  card.innerHTML = `
    <div class="pending-card-main" style="width:100%; display:flex; align-items:center; justify-content:space-between;">
      <button class="btn-check-card" title="Completar" style="flex-shrink:0;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></button>
      <div class="pending-card-body" style="flex:1; margin-left:10px; overflow:hidden;">
        <div style="display:flex; align-items:center; gap:6px; overflow:hidden;">
          <span class="pending-card-name" style="font-weight:700; word-break:break-word; overflow-wrap:break-word;">${esc(t.name)}</span>
          <button class="btn-expand-card" title="Ver detalles" style="background:none; border:none; color:var(--text-muted); display:flex; align-items:center; cursor:pointer; padding:2px; transition: transform 0.2s;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
        </div>
        <div class="pending-card-meta" style="display:flex; align-items:center; gap:6px; margin-top:4px; flex-wrap:wrap;">
          <span class="prio-pill" style="color:${prio.color}; background:${prio.color}18; border:1px solid ${prio.color}33; padding:1px 6px; border-radius:4px; font-size:0.65rem; display:inline-flex; align-items:center; gap:3px;"><span style="display:inline-block; width:5px; height:5px; border-radius:50%; background:${prio.color};"></span>${prio.label}</span>
          <span class="badge" style="padding:1px 6px; font-size:0.65rem; border-radius:4px;">${t.pts} pts</span>
          <span class="task-age" style="font-size:0.65rem; color:var(--text-muted);">${ageLabel}</span>
          ${isUrgent ? `<span class="urgency-flag" style="display:inline-flex; align-items:center; gap:3px; font-size:0.65rem; color:var(--danger); font-weight:700;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>Urgente</span>` : ''}
        </div>
      </div>
      <div class="pending-card-actions" style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
        <button class="btn-edit-pen" title="Editar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
        <button class="btn-del-pen" title="Eliminar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
      </div>
    </div>
    <div class="pending-card-detail" style="display:none; width:100%; border-top: 1px solid var(--card-border); margin-top:10px; padding-top:10px;">
      <!-- Priority Detail Line -->
      <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:8px; display:flex; align-items:center; gap:6px;">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${prio.color};"></span>
        <span><strong>${getLang() === 'en' ? 'Priority' : 'Prioridad'}:</strong> ${prio.label}</span>
      </div>
      <!-- Waiting Time Detail Line -->
      <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:8px; display:flex; align-items:center; gap:6px;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span><strong>${getLang() === 'en' ? 'Waiting Time' : 'Tiempo de Espera'}:</strong> ${ageLabel}</span>
      </div>
      <!-- Urgency warning if applicable -->
      ${ageDays >= 3 ? `<div style="font-size:0.8rem; color:var(--danger); margin-bottom:8px; display:flex; align-items:center; gap:6px; font-weight:600;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span>${getLang() === 'en' ? 'Urgent: Waiting more than 3 days!' : '¡Urgente: Lleva más de 3 días esperando!'}</span>
      </div>` : ''}

      ${t.desc ? `<div style="font-size:0.85rem; color:var(--text-main); margin-bottom:8px; white-space:pre-wrap; line-height:1.4;">${esc(t.desc)}</div>` : ''}
      ${t.deadline ? `<div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:8px; display:flex; align-items:center; gap:4px;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span><strong>${tr('pending.deadline')}:</strong> ${esc(t.deadline)}</span>
      </div>` : ''}
      ${hasImage ? `<div style="margin-top:10px;"><img class="pending-card-img" src="${esc(t.image)}" alt="${esc(t.name)}" style="max-height:120px; border-radius:8px; cursor:zoom-in; object-fit:cover; border:1px solid var(--card-border);"></div>` : ''}
      <div style="margin-top:10px; display:flex; justify-content:flex-end;">
        <a href="${getGoogleCalendarUrl(t)}" target="_blank" class="btn-save" style="display:inline-flex; align-items:center; gap:6px; font-size:0.75rem; padding:6px 12px; background:#4285f4; border-color:#4285f4; color:white; border-radius:6px; text-decoration:none; font-weight:700; width:auto; text-align:center; box-shadow:none;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          ${tr('pending.add.calendar')}
        </a>
      </div>
    </div>
  `;

  // Prevent parent card clicks from firing on action buttons/inputs
  card.querySelector('.btn-check-card').onclick = (e) => {
    e.stopPropagation();
    state.completePendingTask(i, () => {
      showToast(tr('toast.streak'), "warning");
    });
    showToast(tr('toast.task.done'));
  };

  card.querySelector('.btn-edit-pen').onclick = (e) => {
    e.stopPropagation();
    if (onEdit) onEdit(t, i);
  };

  card.querySelector('.btn-del-pen').onclick = (e) => {
    e.stopPropagation();
    showConfirm(tr('confirm.delete.task', { name: t.name }), () => {
      state.deletePendingTask(i);
      showToast(tr('toast.task.deleted'));
    });
  };

  // Expand detail on card click
  card.onclick = (e) => {
    if (e.target.closest('.btn-check-card') || e.target.closest('.btn-edit-pen') || e.target.closest('.btn-del-pen') || e.target.closest('.pending-card-img') || e.target.closest('a')) {
      return;
    }
    const detail = card.querySelector('.pending-card-detail');
    if (detail) {
      const open = detail.style.display !== 'none';
      detail.style.display = open ? 'none' : 'block';
      const expandBtn = card.querySelector('.btn-expand-card');
      if (expandBtn) {
        expandBtn.style.transform = open ? '' : 'rotate(180deg)';
      }
    }
  };

  if (hasImage) {
    card.querySelector('.pending-card-img').onclick = (e) => {
      e.stopPropagation();
      openLightbox(t.image, t.name);
    };
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
    container.innerHTML = `<div style="padding: 30px 20px; text-align:center; color:var(--text-muted); font-size:0.9rem;">${tr('pending.empty')}</div>`;
    return;
  }

  const onEdit = withEditFocus ? (t, i) => {
    elements.pendingInput.value = t.name;
    elements.pendingPoints.value = t.pts;
    if (elements.pendingPriority) elements.pendingPriority.value = t.priority || 'media';
    elements.editPenIdx.value = i;
    elements.btnSavePen.innerText = tr('pending.update');
    if (elements.pendingDesc) elements.pendingDesc.value = t.desc || '';
    if (elements.pendingDeadline) elements.pendingDeadline.value = t.deadline || '';
    if (elements.pendingFormCollapse) elements.pendingFormCollapse.style.display = 'block';
    if (elements.btnTogglePendingForm) elements.btnTogglePendingForm.innerText = getLang() === 'en' ? 'Cancel' : 'Cancelar';
    elements.pendingInput.focus();
    if (elements.pendingFullscreenModal) elements.pendingFullscreenModal.classList.remove('open');
  } : (t, i) => {
    elements.pendingInput.value = t.name;
    elements.pendingPoints.value = t.pts;
    if (elements.pendingPriority) elements.pendingPriority.value = t.priority || 'media';
    elements.editPenIdx.value = i;
    elements.btnSavePen.innerText = tr('pending.update');
    if (elements.pendingDesc) elements.pendingDesc.value = t.desc || '';
    if (elements.pendingDeadline) elements.pendingDeadline.value = t.deadline || '';
    if (elements.pendingFormCollapse) elements.pendingFormCollapse.style.display = 'block';
    if (elements.btnTogglePendingForm) elements.btnTogglePendingForm.innerText = getLang() === 'en' ? 'Cancel' : 'Cancelar';
    if (elements.pendingFullscreenModal) elements.pendingFullscreenModal.classList.remove('open');
  };

  // Group by priority
  const groups = [
    { key: 'alta', label: tr('priority.high.label') },
    { key: 'media', label: tr('priority.medium.label') },
    { key: 'baja', label: tr('priority.low.label') }
  ];

  groups.forEach(({ key, label }) => {
    const groupTasks = allTasks
      .filter(({ t }) => (t.priority || 'media') === key)
      .sort((a, b) => state.taskUrgencyScore(b.t) - state.taskUrgencyScore(a.t));

    if (groupTasks.length === 0) return;

    const prio = PRIORITY_META[key];
    const collapsedKey = `collapsed_prio_${key}`;
    const isCollapsed = localStorage.getItem(collapsedKey) === 'true';

    const header = document.createElement('div');
    header.className = 'pending-section-header';
    header.style.borderLeftColor = prio.color;
    header.style.cursor = 'pointer';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.userSelect = 'none';

    const chevronSvg = `<svg width="12" height="12" class="prio-chevron" style="transition: transform 0.2s; margin-right:4px; ${isCollapsed ? '' : 'transform: rotate(90deg);'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`;

    header.innerHTML = `
      <span style="display:inline-flex; align-items:center; gap:6px;">
        ${chevronSvg}
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${prio.color};"></span>
        ${label}
      </span>
      <span class="pending-section-count">${groupTasks.length}</span>
    `;
    container.appendChild(header);

    const listContainer = document.createElement('div');
    listContainer.className = 'pending-group-list';
    listContainer.style.display = isCollapsed ? 'none' : 'flex';
    listContainer.style.flexDirection = 'column';
    listContainer.style.gap = '10px';
    listContainer.style.marginTop = '6px';
    listContainer.style.marginBottom = '12px';

    groupTasks.forEach(({ t, i }) => {
      listContainer.appendChild(buildPendingCard(t, i, onEdit));
    });
    container.appendChild(listContainer);

    header.onclick = () => {
      const currentlyCollapsed = listContainer.style.display === 'none';
      listContainer.style.display = currentlyCollapsed ? 'flex' : 'none';
      localStorage.setItem(collapsedKey, currentlyCollapsed ? 'false' : 'true');
      const chevron = header.querySelector('.prio-chevron');
      if (chevron) {
        chevron.style.transform = currentlyCollapsed ? 'rotate(90deg)' : '';
      }
    };
  });
}

export function renderMetrics() {
  if (!elements.appContainer) return;
  if (!state.store.config || !Array.isArray(state.store.config.users)) return;

  const users = state.store.config.users;

  let mt = 0;
  const pointsToday = {};
  users.forEach(u => pointsToday[u.id] = 0);

  state.store.todayLog.forEach(x => {
    mt += x.pts;
    if (pointsToday[x.who] !== undefined) pointsToday[x.who] += x.pts;
  });

  state.store.history.forEach(h => {
    if (h.points) Object.values(h.points).forEach(p => mt += p);
  });

  if (elements.monthTotal) elements.monthTotal.innerText = mt;

  // Percentage boxes (today)
  const pList = elements.userPercentDisplay;
  if (pList) {
    pList.innerHTML = '';
    users.forEach(u => {
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

  // Render the active chart tab
  renderActiveChartTab();
}

let activeChartTab = 'hoy';

export function switchChartTab(tab) {
  activeChartTab = tab;
  const hoyCanvas = elements.timeChartCanvas;
  const histCanvas = elements.historialChart;
  const hoyBtn = elements.btnChartTabHoy;
  const histBtn = elements.btnChartTabHistorial;

  if (tab === 'hoy') {
    if (hoyCanvas) hoyCanvas.style.display = 'block';
    if (histCanvas) histCanvas.style.display = 'none';
    if (hoyBtn) hoyBtn.classList.add('active');
    if (histBtn) histBtn.classList.remove('active');
    try {
      updateTimeChart(hoyCanvas, state.store.todayLog, state.store.config.users);
    } catch (err) { console.warn(err); }
  } else {
    if (hoyCanvas) hoyCanvas.style.display = 'none';
    if (histCanvas) histCanvas.style.display = 'block';
    if (hoyBtn) hoyBtn.classList.remove('active');
    if (histBtn) histBtn.classList.add('active');

    // Build today's points map
    const pointsToday = {};
    state.store.config.users.forEach(u => pointsToday[u.id] = 0);
    state.store.todayLog.forEach(x => {
      if (pointsToday[x.who] !== undefined) pointsToday[x.who] += x.pts;
    });
    const todayLabel = new Date().toLocaleDateString(getLang() === 'en' ? 'en-US' : 'es-ES', { day: '2-digit', month: '2-digit' });

    try {
      updateHistorialChart(histCanvas, state.store.config.users, state.store.history, pointsToday, todayLabel);
    } catch (err) { console.warn(err); }
  }
}

function renderActiveChartTab() {
  switchChartTab(activeChartTab);
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
        showToast(tr('routines.template.registered', { name: t.name }));
      };

      item.querySelector('.btn-edit-tpl').onclick = (e) => {
        e.stopPropagation(); // Avoid triggering use on click
        elements.tplName.value = t.name;
        elements.tplPts.value = t.pts;
        elements.editTplIndex.value = i;
        elements.tplFormTitle.innerText = tr('routines.edit');
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
        <button class="btn-delete-user" style="background:rgba(239, 68, 68, 0.1); color:var(--danger); border:none; border-radius:8px; padding:6px 12px; font-weight:700; font-size:0.75rem; cursor:pointer;">${tr('user.delete.btn')}</button>
      </div>

      <div style="display:flex; gap:10px;">
        <div style="flex:2;">
          <label style="font-size:0.65rem; color:var(--text-muted); font-weight:700; display:block; margin-bottom:4px;">${tr('user.name.label')}</label>
          <input type="text" class="user-name-input" value="${esc(u.name)}" style="margin:0; padding:10px; background:rgba(15,23,42,0.25);">
        </div>
        <div style="flex:1;">
          <label style="font-size:0.65rem; color:var(--text-muted); font-weight:700; display:block; margin-bottom:4px;">${tr('user.meta.label')}</label>
          <input type="number" class="user-meta-input" value="${u.meta || 15}" style="margin:0; text-align:center; padding:10px; background:rgba(15,23,42,0.25);">
        </div>
      </div>
    `;

    // Bind color picker change
    card.querySelector('.user-color-picker').onchange = (e) => {
      u.color = e.target.value;
      state.saveState();
      showToast(tr('toast.color.updated'));
    };

    // Bind name changes
    card.querySelector('.user-name-input').onchange = (e) => {
      u.name = e.target.value.trim();
      state.saveState();
      showToast(tr('toast.name.updated'));
    };

    // Bind meta goal changes
    card.querySelector('.user-meta-input').onchange = (e) => {
      u.meta = parseInt(e.target.value) || 15;
      state.saveState();
      showToast(tr('toast.meta.updated'));
    };

    // Bind delete user
    card.querySelector('.btn-delete-user').onclick = () => {
      if (state.store.config.users.length <= 1) {
        showToast(tr('toast.min.users'), "error");
        return;
      }
      showConfirm(tr('confirm.delete.profile', { name: u.name }), () => {
        state.store.config.users = state.store.config.users.filter(x => x.id !== u.id);
        if (state.localProfileId === u.id) {
          state.setLocalProfileId(state.store.config.users[0].id);
        }
        state.saveState();
        renderUserConfigList();
        showToast(tr('toast.profile.deleted'));
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
    showToast(tr('bank.redeem.no.pts'), "error");
    return;
  }

  // Tally today's points to warn user if they already reached goal
  let activePts = 0;
  state.store.todayLog.forEach(x => {
    if (x.who === state.localProfileId) activePts += x.pts;
  });
  
  if (activePts >= (activeUser.meta || 15)) {
    showToast(tr('bank.redeem.goal.warn'), "warning");
    return;
  }

  const amount = prompt(tr('bank.redeem.prompt', { n: balance }));
  if (amount !== null) {
    state.redeemPointsFromBank(
      amount,
      (redeemedVal) => {
        showToast(tr('bank.redeem.success', { n: redeemedVal }));
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
  
  const reportLocale = getLang() === 'en' ? 'en-US' : 'es-ES';
  elements.docDate.innerText = new Date().toLocaleDateString(reportLocale, {
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
          <span class="summary-label">${getLang() === 'en' ? 'PTS FOR' : 'PTS DE'} ${esc(u.name.toUpperCase())}</span>
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

export function emailDailyReport() {
  const roomName = state.currentRoomName && state.currentRoomName !== 'la Sala' ? state.currentRoomName : tr('tracker.default.room');
  const dateStr = elements.docDate ? elements.docDate.innerText : new Date().toDateString();
  const subject = `[Productivity Tracker] Daily Report - ${roomName} (${dateStr})`;
  
  let body = `REGISTRO DE PRODUCTIVIDAD\n`;
  body += `Fecha: ${dateStr}\n`;
  body += `Sala: ${roomName}\n\n`;
  
  body += `PUNTOS POR USUARIO:\n`;
  state.store.config.users.forEach(u => {
    let pts = 0;
    state.store.todayLog.forEach(x => {
      if (x.who === u.id) pts += x.pts;
    });
    body += `- ${u.name}: ${pts} PTS\n`;
  });
  
  body += `\nDETALLE DE ACTIVIDADES:\n`;
  [...state.store.todayLog].reverse().forEach(x => {
    const u = state.store.config.users.find(us => us.id === x.who);
    body += `- [${x.time}] ${u?.name || '???'}: ${x.name} (+${x.pts} pts)\n`;
  });
  
  body += `\nEnviado desde Productivity Tracker.`;
  
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(gmailUrl, '_blank');
}

export function emailWeeklyReport() {
  const roomName = state.currentRoomName && state.currentRoomName !== 'la Sala' ? state.currentRoomName : tr('tracker.default.room');
  const now = new Date();
  const dateLocale = getLang() === 'en' ? 'en-US' : 'es-ES';
  const dateStr = now.toLocaleDateString(dateLocale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase();
  
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weekRange = `${monday.getDate().toString().padStart(2,'0')}/${(monday.getMonth()+1).toString().padStart(2,'0')} — ${now.getDate().toString().padStart(2,'0')}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getFullYear()}`;
  
  const salaAggs   = state.getWeekTaskAggregates(null);
  const salaSummary = state.getWeekSummary(null);
  const salaDaily  = state.getWeekDailyTotals(null);
  const uniqueTasks = salaAggs.length;

  const subject = `[Productivity Tracker] Weekly Report - ${roomName} (${weekRange})`;
  
  let body = `REPORTE DE PRODUCTIVIDAD SEMANAL\n`;
  body += `Fecha: ${dateStr}\n`;
  body += `Sala: ${roomName}\n`;
  body += `Rango: ${weekRange}\n\n`;
  
  body += `RESUMEN GENERAL:\n`;
  body += `- Puntos Totales: ${salaSummary.totalPts}\n`;
  body += `- Días Activos: ${salaSummary.daysActive}\n`;
  body += `- Días Meta Cumplida: ${salaSummary.daysGoalMet}\n`;
  body += `- Promedio Diario: ${salaSummary.avgPtsPerDay} pts\n`;
  body += `- Tareas Únicas: ${uniqueTasks}\n`;
  body += `- Racha Consecutiva: ${salaSummary.streak} días\n\n`;
  
  body += `PROGRESO POR DÍA:\n`;
  if (salaDaily.length > 0) {
    salaDaily.forEach(d => {
      body += `- ${d.label} (${d.dateStr}): ${d.pts} pts\n`;
    });
  } else {
    body += `(Sin datos esta semana)\n`;
  }
  
  body += `\nACTIVIDADES MÁS REPETIDAS:\n`;
  const mostRep = [...salaAggs].sort((a,b)=>b.count-a.count).slice(0, 5);
  if (mostRep.length > 0) {
    mostRep.forEach((t, i) => {
      body += `${i+1}. ${t.name}: ×${t.count} veces (+${t.totalPts} pts)\n`;
    });
  } else {
    body += `(Ninguna)\n`;
  }
  
  body += `\nEnviado desde Productivity Tracker.`;

  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(gmailUrl, '_blank');
}

/* --- WEEKLY REPORT --- */

// ── Weekly report helpers ──────────────────────────────────────────

function _weekStatCard(label, value, color) {
  return `
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:14px 12px;border-top:3px solid ${color};min-width:0;">
      <div style="font-size:0.58rem;font-weight:700;color:#94a3b8;letter-spacing:0.07em;text-transform:uppercase;margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${label}</div>
      <div style="font-size:1.55rem;font-weight:900;color:${color};font-family:'Outfit',sans-serif;line-height:1;">${value}</div>
    </div>`;
}

function _weekSvgBars(days) {
  if (!days.length) return '';
  const W = 520, H = 110, pad = 12;
  const n = days.length;
  const maxPts = Math.max(...days.map(d => d.pts), 1);
  const barW = Math.min(50, (W - pad * 2 - (n - 1) * 8) / n);
  const totalW = n * barW + (n - 1) * 8;
  const x0 = (W - totalW) / 2;
  const chartH = H - 30;

  const bars = days.map((d, i) => {
    const x = x0 + i * (barW + 8);
    const bh = Math.max(4, Math.round((d.pts / maxPts) * chartH));
    const y = chartH - bh;
    const isMax = d.pts === maxPts;
    const fill = isMax ? '#1d4ed8' : '#3b82f6';
    const opacity = isMax ? '1' : '0.7';
    return `
      <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW}" height="${bh}" rx="4" fill="${fill}" opacity="${opacity}"/>
      <text x="${(x + barW / 2).toFixed(1)}" y="${(chartH + 14).toFixed(1)}" text-anchor="middle" font-size="10" font-family="Inter,sans-serif" fill="#64748b">${esc(d.label)}</text>
      <text x="${(x + barW / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle" font-size="10" font-family="Inter,sans-serif" font-weight="700" fill="${isMax ? '#1d4ed8' : '#475569'}">${d.pts}</text>`;
  });

  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="display:block;">${bars.join('')}</svg>`;
}

function _weekProfileCard(u, todayPts) {
  const s = state.getWeekSummary(u.id);
  const meta = Number(u.meta) || 15;
  const metaWeek = meta * (state.store.config.days || 6);
  const pct = metaWeek > 0 ? Math.min(100, Math.round((s.totalPts / metaWeek) * 100)) : 0;
  const r = 28, cx = 36, cy = 36, circ = 2 * Math.PI * r;
  const filled = circ * (pct / 100);
  return `
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:14px;display:flex;align-items:center;gap:12px;">
      <svg width="72" height="72" viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="5"/>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${esc(u.color)}" stroke-width="5"
          stroke-dasharray="${filled.toFixed(1)} ${circ.toFixed(1)}"
          stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})"/>
        <text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="13" font-weight="900" font-family="Outfit,sans-serif" fill="${esc(u.color)}">${pct}%</text>
      </svg>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:800;font-size:0.95rem;color:${esc(u.color)};margin-bottom:5px;">${esc(u.name)}</div>
        <div style="font-size:0.78rem;color:#475569;margin-bottom:2px;"><strong style="color:#1e293b;">${s.totalPts}</strong> ${tr('report.weekly.pts.week')}</div>
        <div style="font-size:0.78rem;color:#475569;margin-bottom:2px;"><strong style="color:#1e293b;">${s.daysGoalMet}</strong> ${tr('report.weekly.days.goal')}</div>
        <div style="font-size:0.78rem;color:#475569;"><strong style="color:#1e293b;">${s.avgPtsPerDay}</strong> ${tr('report.weekly.avg.day')}</div>
        ${s.streak > 1 ? `<div style="font-size:0.78rem;color:#f59e0b;font-weight:700;margin-top:3px;">🔥 ${s.streak} ${tr('report.weekly.streak.label')}</div>` : ''}
      </div>
    </div>`;
}

function _weekHBars(aggs, totalPts) {
  return aggs.slice(0, 9).map(t => {
    const pct = totalPts > 0 ? Math.round((t.totalPts / totalPts) * 100) : 0;
    return `
      <div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;font-size:0.8rem;margin-bottom:4px;">
          <span style="font-weight:700;color:#1e293b;max-width:60%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(t.name)}</span>
          <span style="color:#64748b;white-space:nowrap;font-size:0.74rem;">${pct}% &nbsp;·&nbsp; +${t.totalPts} pts &nbsp;·&nbsp; ×${t.count}</span>
        </div>
        <div style="height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#3b82f6,#6366f1);border-radius:4px;"></div>
        </div>
      </div>`;
  }).join('');
}

function _weekInsights(users, salaDaily, salaAggs, salaSummary) {
  const lines = [];
  if (salaDaily.length > 0) {
    const best = salaDaily.reduce((a, b) => b.pts > a.pts ? b : a);
    lines.push(tr('report.weekly.best.day', { day: `<strong>${esc(best.label)}</strong>`, pts: `<strong>${best.pts}</strong>` }));
  }
  if (salaAggs.length > 0) {
    lines.push(tr('report.weekly.tasks.count', { tasks: `<strong>${salaAggs.length}</strong>`, sessions: `<strong>${salaAggs.reduce((s,t)=>s+t.count,0)}</strong>` }));
    const top = salaAggs[0];
    lines.push(tr('report.weekly.top.by.pts', { name: `<strong>${esc(top.name)}</strong>`, pts: top.totalPts, count: top.count }));
    const topRep = [...salaAggs].sort((a,b)=>b.count-a.count)[0];
    if (topRep !== top) lines.push(tr('report.weekly.top.by.count', { name: `<strong>${esc(topRep.name)}</strong>`, count: topRep.count, pts: topRep.totalPts }));
  }
  if (salaSummary.daysGoalMet > 0)
    lines.push(tr('report.weekly.goal.days', { met: `<strong>${salaSummary.daysGoalMet}</strong>`, active: salaSummary.daysActive }));
  if (salaSummary.streak > 1)
    lines.push(tr('report.weekly.streak', { n: `<strong>${salaSummary.streak}</strong>` }));
  // Trend
  if (salaDaily.length >= 4) {
    const mid = Math.floor(salaDaily.length / 2);
    const f = salaDaily.slice(0, mid).reduce((s,d)=>s+d.pts,0);
    const s2 = salaDaily.slice(mid).reduce((s,d)=>s+d.pts,0);
    if (s2 > f * 1.1) lines.push(tr('report.weekly.trend.up'));
    else if (s2 < f * 0.9) lines.push(tr('report.weekly.trend.down'));
    else lines.push(tr('report.weekly.trend.stable'));
  }
  return lines;
}

export function showWeeklyReport() {
  if (!elements.weeklyReportOverlay || !elements.weeklyReportContent) return;

  const users = state.store.config.users || [];
  const roomName = state.currentRoomName && state.currentRoomName !== 'la Sala' ? state.currentRoomName : tr('tracker.default.room');
  const now = new Date();
  const dateLocale = getLang() === 'en' ? 'en-US' : 'es-ES';
  const dateStr = now.toLocaleDateString(dateLocale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weekRange = `${monday.getDate().toString().padStart(2,'0')}/${(monday.getMonth()+1).toString().padStart(2,'0')} — ${now.getDate().toString().padStart(2,'0')}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getFullYear()}`;

  const salaAggs   = state.getWeekTaskAggregates(null);
  const salaSummary = state.getWeekSummary(null);
  const salaDaily  = state.getWeekDailyTotals(null);
  const totalActPts = salaAggs.reduce((s, t) => s + t.totalPts, 0) || 1;
  const uniqueTasks = salaAggs.length;
  const totalReps   = salaAggs.reduce((s, t) => s + t.count, 0);
  const insights    = _weekInsights(users, salaDaily, salaAggs, salaSummary);

  const html = `
    <!-- HEADER -->
    <div class="report-header">
      <h1 class="report-title">${tr('report.weekly.title')}</h1>
      <div class="report-date">${esc(dateStr)}</div>
      <div style="font-size:0.72rem;color:#64748b;margin-top:4px;font-weight:700;letter-spacing:0.05em;">${esc(roomName.toUpperCase())} &nbsp;·&nbsp; ${esc(weekRange)}</div>
    </div>

    <!-- 6 KPI CARDS -->
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:20px;">
      ${_weekStatCard(tr('report.weekly.kpi.pts'), salaSummary.totalPts, '#3b82f6')}
      ${_weekStatCard(tr('report.weekly.kpi.days'), salaSummary.daysActive, '#10b981')}
      ${_weekStatCard(tr('report.weekly.kpi.goal'), salaSummary.daysGoalMet, '#f59e0b')}
      ${_weekStatCard(tr('report.weekly.kpi.avg'), salaSummary.avgPtsPerDay, '#6366f1')}
      ${_weekStatCard(tr('report.weekly.kpi.tasks'), uniqueTasks, '#ec4899')}
      ${_weekStatCard(tr('report.weekly.kpi.streak'), salaSummary.streak > 0 ? tr('report.weekly.streak.val', { n: salaSummary.streak }) : tr('report.weekly.no.streak'), '#f97316')}
    </div>

    <!-- SVG BAR CHART -->
    <div class="report-subtitle">${tr('report.weekly.days.chart')}</div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 14px 6px;margin-bottom:20px;">
      ${salaDaily.length > 0 ? _weekSvgBars(salaDaily) : `<div style="text-align:center;color:#94a3b8;padding:20px 0;font-size:0.85rem;">${tr('report.weekly.no.data')}</div>`}
    </div>

    <!-- POR PERFIL -->
    <div class="report-subtitle">${tr('report.weekly.by.profile')}</div>
    <div style="display:grid;grid-template-columns:1fr;gap:10px;margin-bottom:20px;">
      ${users.map(u => _weekProfileCard(u)).join('')}
    </div>

    <!-- DÓNDE SE VA LA FUERZA -->
    ${salaAggs.length > 0 ? `
    <div class="report-subtitle">${tr('report.weekly.where.force')}</div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;">
      ${_weekHBars(salaAggs, totalActPts)}
    </div>

    <!-- DOS TABLAS EN PARALELO -->
    <div style="display:flex;flex-direction:column;gap:20px;margin-bottom:20px;">
      <div>
        <div class="report-subtitle" style="margin-top:0;">${tr('report.weekly.most.rep')}</div>
        <table class="doc-table">
          <thead><tr><th>#</th><th>${tr('report.weekly.col.activity')}</th><th style="text-align:right;">${tr('report.weekly.col.times')}</th><th style="text-align:right;">${tr('report.weekly.col.pts')}</th></tr></thead>
          <tbody>
            ${[...salaAggs].sort((a,b)=>b.count-a.count).slice(0,7).map((t,i)=>`
              <tr>
                <td style="color:#94a3b8;font-size:0.7rem;">${i+1}</td>
                <td style="font-weight:700;font-size:0.78rem;">${esc(t.name)}</td>
                <td style="text-align:right;font-weight:700;color:#10b981;">×${t.count}</td>
                <td style="text-align:right;color:#64748b;font-size:0.78rem;">+${t.totalPts}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div>
        <div class="report-subtitle" style="margin-top:0;">${tr('report.weekly.heaviest')}</div>
        <table class="doc-table">
          <thead><tr><th>#</th><th>${tr('report.weekly.col.activity')}</th><th style="text-align:right;">${tr('report.weekly.col.total')}</th><th style="text-align:right;">${tr('report.weekly.col.max')}</th></tr></thead>
          <tbody>
            ${salaAggs.slice(0,7).map((t,i)=>`
              <tr>
                <td style="color:#94a3b8;font-size:0.7rem;">${i+1}</td>
                <td style="font-weight:700;font-size:0.78rem;">${esc(t.name)}</td>
                <td style="text-align:right;font-weight:700;color:#3b82f6;">+${t.totalPts}</td>
                <td style="text-align:right;color:#f59e0b;font-size:0.78rem;">+${t.maxSingle}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}

    <!-- INSIGHTS -->
    ${insights.length > 0 ? `
    <div class="report-subtitle">${tr('report.weekly.insights')}</div>
    <div style="background:linear-gradient(135deg,#eff6ff,#f0fdf4);border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin-bottom:20px;">
      <ul style="margin:0;padding-left:18px;list-style:disc;">
        ${insights.map(i=>`<li style="font-size:0.84rem;color:#1e293b;margin-bottom:7px;line-height:1.5;">${i}</li>`).join('')}
      </ul>
    </div>` : ''}

    ${salaAggs.length === 0 ? `
    <div style="text-align:center;padding:30px;color:#94a3b8;font-size:0.88rem;border:1px dashed #e2e8f0;border-radius:8px;">
      ${tr('report.weekly.no.detail')}
    </div>` : ''}
  `;

  elements.weeklyReportContent.innerHTML = html;
  elements.weeklyReportOverlay.classList.add('open');
}

export function closeWeeklyReport() {
  if (elements.weeklyReportOverlay) {
    elements.weeklyReportOverlay.classList.remove('open');
  }
}

export function triggerDownloadWeeklyPDF() {
  if (elements.weeklyReportContent) {
    const roomName = state.currentRoomName || 'Sala';
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadReportPDF(elements.weeklyReportContent, `${roomName}_Semana_${dateStr}`);
  }
}

export function populateShoppingUsers() {
  const select = elements.shopItemUser;
  if (select) {
    const currentVal = select.value;
    const roomName = state.currentRoomName && state.currentRoomName !== 'la Sala' ? state.currentRoomName : tr('tracker.default.room');
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
  const savedTab = document.getElementById('shoppingSavedTab');
  const viewBtn = elements.btnTabShoppingList;
  const addBtn = elements.btnTabShoppingAdd;
  const savedBtn = elements.btnTabShoppingSaved;

  // Scroll to top
  const screenShopping = document.getElementById('screenShopping');
  if (screenShopping) {
    screenShopping.scrollTop = 0;
  }

  // Hide all, deactivate all buttons
  [viewTab, addTab, savedTab].forEach(t => t && t.classList.add('hidden'));
  [viewBtn, addBtn, savedBtn].forEach(b => b && b.classList.remove('active'));

  if (tabId === 'list') {
    if (viewTab) viewTab.classList.remove('hidden');
    if (viewBtn) viewBtn.classList.add('active');
    renderShoppingList();
  } else if (tabId === 'add') {
    if (addTab) addTab.classList.remove('hidden');
    if (addBtn) addBtn.classList.add('active');
    // Clear inputs in add form
    if (elements.shopItemName) elements.shopItemName.value = '';
    if (elements.shopItemQty) elements.shopItemQty.value = '';
    if (elements.shopItemImage) elements.shopItemImage.value = '';
    if (elements.shopItemTags) elements.shopItemTags.value = '';
    renderQuickTagChips();
    updateQuickTagChipStyles();
    renderShopItemSuggestions();
  } else if (tabId === 'saved') {
    if (savedTab) savedTab.classList.remove('hidden');
    if (savedBtn) savedBtn.classList.add('active');
    renderSavedLists();
  }
}

export function renderSavedLists() {
  const container = document.getElementById('savedListsContainer');
  const emptyEl = document.getElementById('savedListsEmpty');
  const limitHint = document.getElementById('savedListsLimitHint');
  const createBtn = document.getElementById('btnCreateSavedList');
  if (!container) return;

  const lists = state.getSavedShoppingLists();

  if (emptyEl) emptyEl.style.display = lists.length === 0 ? 'block' : 'none';
  if (limitHint) limitHint.style.display = lists.length >= 10 ? 'block' : 'none';
  if (createBtn) createBtn.style.display = lists.length >= 10 ? 'none' : 'flex';

  container.innerHTML = '';
  lists.forEach(list => {
    const items = list.items || [];
    const isCardCollapsed = localStorage.getItem(`collapsed_saved_list_${list.id}`) === 'true';

    const allTags = [];
    items.forEach(it => {
      (it.tags || []).forEach(t => {
        if (!allTags.includes(t)) allTags.push(t);
      });
    });

    const activeFilters = activeSavedListFilters[list.id] || [];
    const displayedItems = activeFilters.length > 0
      ? items.filter(it => (it.tags || []).some(t => activeFilters.includes(t)))
      : items;

    let filtersHtml = '';
    if (allTags.length > 0) {
      filtersHtml = `
        <div class="saved-list-filters" style="display:flex; gap:6px; margin-bottom:12px; flex-wrap:wrap; align-items:center;">
          <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">${tr('saved.filter.label')}</span>
          <span class="filter-pill ${activeFilters.length === 0 ? 'active' : ''}" data-tag="" style="font-size:0.72rem; padding:2px 8px; border-radius:12px; cursor:pointer; background:${activeFilters.length === 0 ? '#3b82f6' : 'rgba(15,23,42,0.05)'}; color:${activeFilters.length === 0 ? '#fff' : 'var(--text-muted)'}; font-weight:700;">${tr('saved.filter.all')}</span>
          ${allTags.map(tag => {
            const isActive = activeFilters.includes(tag);
            return `<span class="filter-pill ${isActive ? 'active' : ''}" data-tag="${esc(tag)}" style="font-size:0.72rem; padding:2px 8px; border-radius:12px; cursor:pointer; background:${isActive ? '#3b82f6' : 'rgba(15,23,42,0.05)'}; color:${isActive ? '#fff' : 'var(--text-muted)'}; font-weight:700;">${esc(tag)}</span>`;
          }).join('')}
        </div>
      `;
    }

    const card = document.createElement('div');
    card.className = 'saved-list-card';
    card.style.cssText = 'background:var(--card-bg); border:1px solid var(--card-border); border-radius:var(--radius-md); padding:16px; margin-bottom:16px; box-shadow:0 4px 12px rgba(15,23,42,0.02);';

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
        <div style="display:flex; align-items:center; gap:6px; cursor:pointer;" data-action="toggle-collapse" data-id="${esc(list.id)}">
          <button style="border:none; background:none; color:var(--text-muted); cursor:pointer; display:flex; align-items:center; justify-content:center; width:24px; height:24px; pointer-events:none; transition: transform 0.2s; ${isCardCollapsed ? '' : 'transform: rotate(90deg);'}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
          <span style="font-weight:800; font-size:1rem; color:var(--text-primary);">${esc(list.name)}</span>
        </div>
        <div style="display:flex; gap:6px;">
          <button data-action="toggle-edit-panel" data-id="${esc(list.id)}" style="border:none; background:rgba(79,70,229,0.08); border-radius:6px; width:30px; height:30px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#4f46e5;" title="${esc(tr('saved.edit.panel.tooltip'))}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button data-action="delete" data-id="${esc(list.id)}" style="border:none; background:rgba(220,38,38,0.08); border-radius:6px; width:30px; height:30px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--danger);" title="${esc(tr('saved.delete.tooltip'))}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4h6v2"></path></svg>
          </button>
        </div>
      </div>

      <div class="saved-list-body" id="savedListBody_${list.id}" style="display:${isCardCollapsed ? 'none' : 'block'};">
        ${filtersHtml}
        <div style="margin-bottom:14px;">
          ${displayedItems.length === 0
            ? `<p style="font-size:0.82rem; color:var(--text-muted); margin:0 0 10px;">${tr('saved.list.empty')}</p>`
            : displayedItems.map(item => {
              const itemTagsHtml = (item.tags || []).map(t => {
                const s = getTagStyle(t);
                return `<span style="font-size:0.65rem; padding:1px 5px; border-radius:4px; font-weight:700; background:${s.bg}; color:${s.text}; border:1px solid ${s.border}; margin-left:4px; display:inline-block;">${esc(t)}</span>`;
              }).join('');

              return `
                <label style="display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid var(--card-border); cursor:pointer;">
                  <input type="checkbox" class="saved-item-check" checked data-item-id="${esc(item.id)}" style="width:17px; height:17px; flex-shrink:0; accent-color:#3b82f6; cursor:pointer;">
                  <span style="flex:1; font-size:0.9rem; color:var(--text-primary); display:flex; align-items:center; flex-wrap:wrap; gap:4px;">
                    ${esc(item.name)}
                    ${item.qty ? `<span style="color:var(--text-muted); font-size:0.78rem;">(${esc(item.qty)})</span>` : ''}
                    ${itemTagsHtml}
                  </span>
                  <button data-action="edit-item" data-list-id="${esc(list.id)}" data-item-id="${esc(item.id)}" style="border:none; background:none; color:var(--text-muted); cursor:pointer; font-size:0.9rem; padding:4px 6px; display:flex; align-items:center;" title="${esc(tr('saved.edit.item.tooltip'))}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                  </button>
                  <button data-action="remove-item" data-list-id="${esc(list.id)}" data-item-id="${esc(item.id)}" style="border:none; background:none; color:var(--text-muted); cursor:pointer; font-size:1.2rem; line-height:1; padding:0 4px; flex-shrink:0;">×</button>
                </label>
              `;
            }).join('')
          }
        </div>

        <div style="display:flex; gap:8px;">
          <button class="btn-save saved-list-use-selected" data-list-id="${esc(list.id)}" style="flex:1; margin:0; padding:10px 8px; font-size:0.82rem; background:#334155; box-shadow:none;">${tr('saved.use.selected')}</button>
          <button class="btn-save saved-list-use-all" data-list-id="${esc(list.id)}" style="flex:1; margin:0; padding:10px 8px; font-size:0.82rem; background:var(--active-color); box-shadow:none;">${tr('saved.use.all')}</button>
          <button class="btn-save saved-list-share" data-list-id="${esc(list.id)}" style="flex:0 0 42px; margin:0; padding:10px; background:#7c3aed; box-shadow:none; display:flex; align-items:center; justify-content:center;" title="${esc(tr('saved.share.tooltip'))}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
          </button>
        </div>
      </div>
    `;

    card.addEventListener('click', e => {
      const filterPill = e.target.closest('.filter-pill');
      if (filterPill) {
        const tag = filterPill.dataset.tag;
        if (!tag) {
          activeSavedListFilters[list.id] = [];
        } else {
          let activeFilters = activeSavedListFilters[list.id] || [];
          const idx = activeFilters.indexOf(tag);
          if (idx >= 0) {
            activeFilters.splice(idx, 1);
          } else {
            activeFilters.push(tag);
          }
          activeSavedListFilters[list.id] = activeFilters;
        }
        renderSavedLists();
        return;
      }

      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      const listId = btn.dataset.listId;
      const itemId = btn.dataset.itemId;

      if (action === 'delete') {
        showConfirm(tr('confirm.delete.list', { name: list.name }), () => {
          state.deleteSavedShoppingList(id);
          renderSavedLists();
          showToast(tr('toast.list.deleted'));
        });
      } else if (action === 'rename') {
        const newName = prompt(tr('saved.rename.prompt'), list.name);
        if (newName && newName.trim()) {
          state.renameSavedShoppingList(id, newName.trim());
          renderSavedLists();
        }
      } else if (action === 'remove-item') {
        state.removeItemFromSavedList(listId, itemId);
        renderSavedLists();
      } else if (action === 'toggle-collapse') {
        const collapsedKey = `collapsed_saved_list_${id}`;
        const currentlyCollapsed = localStorage.getItem(collapsedKey) === 'true';
        localStorage.setItem(collapsedKey, currentlyCollapsed ? 'false' : 'true');
        renderSavedLists();
      } else if (action === 'toggle-edit-panel') {
        const currentList = state.getSavedShoppingLists().find(l => l.id === id);
        if (currentList) {
          elements.editSavedListModalName.value = currentList.name;
          elements.editSavedListModal.dataset.listId = id;
          if (Array.isArray(currentList.items)) {
            elements.editSavedListModalItems.value = currentList.items.map(it => {
              let lineStr = it.name;
              if (it.qty) {
                lineStr += ` x${it.qty}`;
              }
              if (it.tags && it.tags.length > 0) {
                lineStr += ` ${it.tags.map(t => `#${t}`).join(' ')}`;
              }
              return lineStr;
            }).join('\n');
          } else {
            elements.editSavedListModalItems.value = '';
          }
          openModal(elements.editSavedListModal);
          setTimeout(() => elements.editSavedListModalItems.focus(), 100);
        }
      } else if (action === 'edit-item') {
        const labelRow = btn.closest('label');
        if (!labelRow) return;
        const itemObj = items.find(i => i.id === itemId);
        if (!itemObj) return;

        const editDiv = document.createElement('div');
        editDiv.style.cssText = 'display:flex; flex-direction:column; gap:8px; padding:10px; border-bottom:1px solid var(--card-border); background:rgba(15,23,42,0.01); width:100%; border-radius:6px; box-sizing:border-box; margin:4px 0;';
        editDiv.innerHTML = `
          <div style="display:flex; gap:6px; align-items:center;">
            <input type="text" class="edit-item-name" value="${esc(itemObj.name)}" placeholder="${esc(tr('saved.item.name'))}" style="flex:2; margin:0; padding:6px 10px; font-size:0.85rem;">
            <input type="text" class="edit-item-qty" value="${esc(itemObj.qty)}" placeholder="${esc(tr('saved.item.qty'))}" style="flex:1; margin:0; padding:6px 10px; font-size:0.85rem; max-width:65px;">
          </div>
          <div>
            <input type="text" class="edit-item-tags" value="${esc((itemObj.tags || []).join(', '))}" placeholder="${esc(tr('saved.item.tags'))}" style="width:100%; margin:0; padding:6px 10px; font-size:0.85rem;">
          </div>
          <div style="display:flex; gap:6px; justify-content:flex-end;">
            <button class="btn-save save-inline-edit" style="width:auto; margin:0; padding:6px 12px; font-size:0.78rem; background:#3b82f6;">${tr('saved.save.btn')}</button>
            <button class="btn-confirm-no cancel-inline-edit" style="width:auto; margin:0; padding:6px 12px; font-size:0.78rem;">${tr('saved.cancel.btn')}</button>
          </div>
        `;
        
        labelRow.style.display = 'none';
        labelRow.parentNode.insertBefore(editDiv, labelRow);

        editDiv.querySelector('.cancel-inline-edit').onclick = (ev) => {
          ev.preventDefault();
          editDiv.remove();
          labelRow.style.display = 'flex';
        };

        editDiv.querySelector('.save-inline-edit').onclick = (ev) => {
          ev.preventDefault();
          const nameVal = editDiv.querySelector('.edit-item-name').value.trim();
          const qtyVal = editDiv.querySelector('.edit-item-qty').value.trim();
          const tagsVal = editDiv.querySelector('.edit-item-tags').value;
          const parsedTags = tagsVal.split(',').map(t => t.trim()).filter(Boolean);

          if (!nameVal) {
            showToast(tr('toast.item.empty'), 'warning');
            return;
          }

          state.updateItemInSavedList(listId, itemId, nameVal, qtyVal, parsedTags);
          showToast(tr('saved.item.updated'));
          renderSavedLists();
        };
      }
    });

    const useSelectedBtn = card.querySelector('.saved-list-use-selected');
    if (useSelectedBtn) {
      useSelectedBtn.onclick = () => {
        const listId = useSelectedBtn.dataset.listId;
        const checks = card.querySelectorAll('.saved-item-check:checked');
        if (!checks.length) { showToast(tr('toast.list.select.first'), 'warning'); return; }
        const selectedIds = [...checks].map(c => c.dataset.itemId);
        const count = state.addSavedListToShopping(listId, selectedIds, 'casa');
        showToast(plural('toast.list.added.shop', count));
        toggleShoppingTab('list');
      };
    }

    const useAllBtn = card.querySelector('.saved-list-use-all');
    if (useAllBtn) {
      useAllBtn.onclick = () => {
        const count = state.addSavedListToShopping(useAllBtn.dataset.listId, null, 'casa');
        showToast(plural('toast.list.added.shop', count));
        toggleShoppingTab('list');
      };
    }

    const shareBtn = card.querySelector('.saved-list-share');
    if (shareBtn) {
      shareBtn.onclick = () => {
        const activeFilters = activeSavedListFilters[list.id] || [];
        const text = state.buildShareText(shareBtn.dataset.listId, activeFilters);
        if (!text) { showToast(tr('toast.list.empty'), 'warning'); return; }
        if (navigator.share) {
          navigator.share({ title: list.name, text }).catch(() => {});
        } else {
          navigator.clipboard.writeText(text)
            .then(() => showToast(tr('toast.list.copied')))
            .catch(() => showToast(tr('toast.list.copy.err'), 'error'));
        }
      };
    }

    container.appendChild(card);
  });
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

function renderGeneralShoppingFilters() {
  const container = document.getElementById('generalShoppingFilters');
  if (!container) return;
  container.innerHTML = '';
  
  const rawItems = state.store.shoppingList || [];
  const allTags = [];
  rawItems.forEach(it => {
    (it.tags || []).forEach(t => {
      if (!allTags.includes(t)) allTags.push(t);
    });
  });
  
  if (allTags.length === 0) {
    activeGeneralListFilters = [];
    return;
  }
  
  const div = document.createElement('div');
  div.className = 'saved-list-filters';
  div.style.cssText = 'display:flex; gap:6px; margin-bottom:12px; flex-wrap:wrap; align-items:center;';
  
  div.innerHTML = `
    <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">${tr('saved.filter.label')}</span>
    <span class="filter-pill ${activeGeneralListFilters.length === 0 ? 'active' : ''}" data-tag="" style="font-size:0.72rem; padding:2px 8px; border-radius:12px; cursor:pointer; background:${activeGeneralListFilters.length === 0 ? 'var(--active-color)' : 'rgba(15,23,42,0.05)'}; color:${activeGeneralListFilters.length === 0 ? '#fff' : 'var(--text-muted)'}; font-weight:700;">${tr('saved.filter.all')}</span>
    ${allTags.map(tag => {
      const isActive = activeGeneralListFilters.includes(tag);
      return `<span class="filter-pill ${isActive ? 'active' : ''}" data-tag="${esc(tag)}" style="font-size:0.72rem; padding:2px 8px; border-radius:12px; cursor:pointer; background:${isActive ? 'var(--active-color)' : 'rgba(15,23,42,0.05)'}; color:${isActive ? '#fff' : 'var(--text-muted)'}; font-weight:700;">${esc(tag)}</span>`;
    }).join('')}
  `;
  
  div.querySelectorAll('.filter-pill').forEach(pill => {
    pill.onclick = () => {
      const tag = pill.dataset.tag;
      if (!tag) {
        activeGeneralListFilters = [];
      } else {
        const idx = activeGeneralListFilters.indexOf(tag);
        if (idx >= 0) {
          activeGeneralListFilters.splice(idx, 1);
        } else {
          activeGeneralListFilters.push(tag);
        }
      }
      renderShoppingList();
    };
  });
  
  container.appendChild(div);
}

export function renderShoppingList() {
  _applyShopGrid(elements.shoppingListDisplay, false);
  
  renderGeneralShoppingFilters();
  
  renderShoppingItemsInto(elements.shoppingListDisplay);
  if (elements.shoppingFullscreenModal && elements.shoppingFullscreenModal.classList.contains('open')) {
    _applyShopGrid(elements.shoppingListFullscreenDisplay, true);
    renderShoppingItemsInto(elements.shoppingListFullscreenDisplay);
  }
}

function renderShoppingItemsInto(list) {
  if (!list) return;
  list.innerHTML = '';

  const rawItems = state.store.shoppingList || [];
  const items = activeGeneralListFilters.length > 0
    ? rawItems.filter(it => (it.tags || []).some(t => activeGeneralListFilters.includes(t)))
    : rawItems;
  const isTile = shopCols === 2;

  if (items.length === 0) {
    list.innerHTML = `<div style="padding: 40px 20px; text-align: center; color: var(--text-muted); font-size: 0.9rem;">${tr('shop.empty')}</div>`;
    return;
  }

  const roomName = state.currentRoomName && state.currentRoomName !== 'la Sala' ? state.currentRoomName : tr('tracker.default.room');

  items.forEach((item) => {
    let targetBadge = '';
    if (!item.assignedTo || item.assignedTo === 'casa') {
      targetBadge = `<span class="shop-badge-room">${esc(roomName)}</span>`;
    } else {
      const assignedUser = state.store.config.users.find(u => u.id === item.assignedTo);
      const color = assignedUser ? assignedUser.color : 'var(--text-muted)';
      const name = assignedUser ? assignedUser.name : '???';
      targetBadge = `<span class="shop-badge-user" style="background:${esc(color)}15;color:${esc(color)};border-color:${esc(color)}30;">${esc(name)}</span>`;
    }

    const displayName = item.name && item.name.trim() ? item.name : tr('shop.item.photo.fallback');
    const hasImage = !!item.image;

    const card = document.createElement('div');
    card.className = `shop-card${isTile ? ' shop-card-tile' : ''}`;

    const displayQty = item.qty ? (/^\d+$/.test(item.qty) ? `x${item.qty}` : item.qty) : '';

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
            ${displayQty ? `<span class="shop-qty">${esc(displayQty)}</span>` : ''}
            ${targetBadge}
            ${(item.tags || []).map(t => {
              const s = getTagStyle(t);
              return `<span style="font-size:0.65rem; padding:1px 5px; border-radius:4px; font-weight:700; background:${s.bg}; color:${s.text}; border:1px solid ${s.border}; margin-left:2px; display:inline-block;">${esc(t)}</span>`;
            }).join('')}
          </div>
          <div class="shop-tile-btns">
            <button class="shop-tile-btn shop-tile-buy" title="${esc(tr('shop.item.bought'))}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> ${tr('shop.item.bought')}</button>
            <button class="shop-tile-btn shop-tile-del" title="${esc(tr('shop.item.delete'))}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
        </div>
      `;
    } else {
      // ─── ROW LAYOUT (1-col): image on left, info + actions on right ───
      card.innerHTML = `
        <div class="shop-card-inner">
          <div class="shop-card-img-wrap">
            ${hasImage
              ? `<img class="shop-card-img" src="${esc(item.image)}" alt="${esc(displayName)}">`
              : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity=".4"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>`
            }
          </div>
          <div class="shop-card-info">
            <span class="shop-card-name">${esc(displayName)}</span>
            <div class="shop-card-meta">
              ${displayQty ? `<span class="shop-qty">${esc(displayQty)}</span>` : ''}
              ${targetBadge}
              ${(item.tags || []).map(t => {
                const s = getTagStyle(t);
                return `<span style="font-size:0.65rem; padding:1px 5px; border-radius:4px; font-weight:700; background:${s.bg}; color:${s.text}; border:1px solid ${s.border}; margin-left:2px; display:inline-block;">${esc(t)}</span>`;
              }).join('')}
            </div>
          </div>
          <div class="shop-card-btns">
            <button class="btn-buy-shop" title="${esc(tr('shop.item.bought'))}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></button>
            <button class="btn-del-shop" title="${esc(tr('shop.item.delete'))}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
        </div>
        <div class="shop-card-detail" style="display:none;">
          ${hasImage ? `<img class="shop-card-detail-img" src="${esc(item.image)}" alt="${esc(displayName)}">` : ''}
          ${item.qty ? `<div class="shop-card-detail-row"><span class="shop-detail-label">${tr('shop.detail.qty')}</span> ${esc(item.qty)}</div>` : ''}
          <div class="shop-card-detail-row"><span class="shop-detail-label">${tr('shop.detail.for')}</span> ${targetBadge}</div>
        </div>
      `;
    }

    // ── Actions ──
    const doBuy = () => { state.buyShoppingItem(item.id); showToast(tr('toast.item.bought', { name: displayName })); };
    const doDelete = () => {
      showConfirm(tr('confirm.delete.item', { name: displayName }), () => {
        state.deleteShoppingItem(item.id);
        showToast(tr('toast.item.deleted'));
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
    container.innerHTML = `<div style="padding:40px 20px; text-align:center; color:var(--text-muted); font-size:0.9rem;">${tr('tracker.empty')}</div>`;
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
  if (elements.tplFormTitle) elements.tplFormTitle.innerText = tr('routines.new');
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
    const roleLabel = r.role === 'owner' ? tr('role.owner') : tr('role.member');
    const badgeClass = r.role === 'owner' ? 'badge-owner' : 'badge-member';
    card.innerHTML = `
      <div style="overflow:hidden;">
        <div class="room-card-name">${esc(r.name)}</div>
        <div class="room-card-meta">${plural('rooms.member.count', r.memberCount)}</div>
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
    const roleLabel = m.role === 'owner' ? tr('role.owner') : tr('role.member');
    const isSelf = m.uid === currentUid;
    const canRemove = isOwner && m.role !== 'owner' && !isSelf;

    row.innerHTML = `
      <div style="overflow:hidden;">
        <div class="member-email">${esc(m.email || m.name || 'Usuario')}</div>
        <div class="member-role">${roleLabel}${isSelf ? tr('role.self') : ''}</div>
      </div>
      ${canRemove ? `<button class="btn-remove-member">${tr('member.remove.btn')}</button>` : ''}
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
    elements.roadmapUserTitle.innerText = tr('plan.today.user', { name: activeUser.name });
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

  // Day change rollover prompt logic
  if (plan && items.length > 0) {
    const todayStr = new Date().toDateString();
    const planDate = plan.date || state.store.lastActiveDate;
    if (planDate && planDate !== todayStr && !plan.promptedRollover) {
      plan.promptedRollover = true; // prevent double prompts
      showConfirm(
        tr('plan.rollover.query') || 'Tienes objetivos del día anterior en tu roadmap. ¿Deseas conservarlos para hoy?',
        () => {
          // Keep: Filter to keep only uncompleted items, reset date and unlock
          plan.items = plan.items.filter(it => !it.completed);
          plan.date = todayStr;
          plan.locked = false;
          delete plan.promptedRollover;
          state.saveState();
        },
        () => {
          // Clear: Remove all items, reset date and unlock
          plan.items = [];
          plan.date = todayStr;
          plan.locked = false;
          delete plan.promptedRollover;
          state.saveState();
        },
        tr('plan.rollover.keep') || 'Conservar',
        tr('plan.rollover.clear') || 'Limpiar todo'
      );
      return;
    }
  } else if (plan && (!plan.date || plan.date !== new Date().toDateString())) {
    plan.date = new Date().toDateString();
    plan.locked = false;
    state.saveState();
  }

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
    list.innerHTML = `<p class="roadmap-text empty" style="padding: 15px 5px; text-align: center;">${tr('plan.empty')}</p>`;
    return;
  }

  items.forEach(item => {
    const el = document.createElement('div');
    
    // Determine badge and colors based on block type
    let badgeText = tr('plan.tab.personal');
    let badgeStyle = "background: rgba(100, 116, 139, 0.1); color: var(--text-muted);";
    let pointsHtml = "";

    if (item.type === 'pending') {
      badgeText = tr('plan.badge.pending');
      badgeStyle = "background: rgba(59, 130, 246, 0.1); color: #2563eb;";
      if (item.pts) pointsHtml = `<span class="badge" style="padding: 1px 5px; font-size: 0.6rem; margin-left: 6px;">${item.pts} pts</span>`;
    } else if (item.type === 'routine') {
      badgeText = tr('plan.badge.routine');
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
      showToast(tr(item.completed ? 'toast.block.pending' : 'toast.block.done'));
    };

    // Bind delete item
    const delBtn = el.querySelector('.btn-del-roadmap');
    if (delBtn) {
      delBtn.onclick = (e) => {
        e.stopPropagation();
        state.deleteRoadmapItem(item.id);
        showToast(tr('toast.block.removed'));
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
      unlockBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>' + tr('plan.unlock.btn');
      unlockBtn.onclick = () => {
        state.unlockRoadmap();
        showToast(tr('toast.plan.unlocked'));
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
      lockBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>' + tr('plan.lock.btn');
      lockBtn.onclick = () => {
        state.lockRoadmap();
        showToast(tr('toast.plan.locked'));
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
  
  const screenRoadmap = document.getElementById('screenRoadmap');
  if (screenRoadmap) {
    screenRoadmap.scrollTop = 0;
  }

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
    showToast(tr('toast.added.to.plan', { name }));
  };

  return btn;
}

/**
 * Populate the Pendientes + Rutinas grids with available blocks
 */
export function renderRoadmapBuilder() {
  const activeUser = state.store.config.users.find(u => u.id === state.localProfileId) || state.store.config.users[0];
  if (elements.builderUserTitle && activeUser) {
    elements.builderUserTitle.innerText = tr('plan.builder.title', { name: activeUser.name });
  }

  const pendingGrid = document.getElementById('builderGridPending');
  if (pendingGrid) {
    pendingGrid.innerHTML = '';
    const pend = state.store.pendingList || [];
    if (pend.length === 0) {
      pendingGrid.innerHTML = `<div class="builder-empty">${tr('plan.pending.empty').replace('\n', '<br>')}</div>`;
    } else {
      pend.forEach(t => pendingGrid.appendChild(_buildBlock(t.name, t.pts, 'pending')));
    }
  }

  const routineGrid = document.getElementById('builderGridRoutine');
  if (routineGrid) {
    routineGrid.innerHTML = '';
    const tpls = state.store.templates || [];
    if (tpls.length === 0) {
      routineGrid.innerHTML = `<div class="builder-empty">${tr('plan.routines.empty').replace('\n', '<br>')}</div>`;
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
  countEl.textContent = tr('plan.blocks.count', { n });
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
      const levelKey = e.target.value === 'minimo' ? 'tree.level.min' : e.target.value === 'maximo' ? 'tree.level.max' : 'tree.level.mid';
      showToast(tr('tree.toast.difficulty', { level: tr(levelKey) }));
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
      niceName: d.toLocaleDateString(getLang() === 'en' ? 'en-US' : 'es-ES', { weekday: 'short', day: 'numeric' })
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
            text: tr('tree.activity.logged'),
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

  // Bloom requires 5+ days of real consistent care per the difficulty rules.
  // Weekly point totals alone do not bloom the tree — constancy does.
  const isBloomed = fullBranchesCount >= 5;

  // Watered: at least 1 activity in "Hoy" tab today
  const userDailyLogs = state.store.todayLog.filter(x => x.who === state.localProfileId);
  const isWatered = userDailyLogs.length >= 1;

  // Fertilized: today's points >= daily meta
  let todayPts = 0;
  userDailyLogs.forEach(x => todayPts += x.pts);
  const userMeta = Number(activeUser.meta) || 15;
  const isFertilized = todayPts >= userMeta;

  // Withered: no activity in the last N days per difficulty setting.
  let isWithered = true;
  for (let offset = 0; offset < witheredDaysThreshold; offset++) {
    const d = new Date(now);
    d.setDate(now.getDate() - offset);
    if (getDailyLeafItems(d.toDateString()).length > 0) {
      isWithered = false;
      break;
    }
  }

  // Earned-rest override: if the week is already complete (all earnable points
  // for elapsed workdays are done), the tree holds — it does not wither during
  // weekends or the first day of the new week. Rest is earned, not abandonment.
  if (isWithered) {
    const cfgDays = state.store.config.days || 6;
    const dow = now.getDay();
    const daysSinceMon = dow === 0 ? 6 : dow - 1;
    const coveredDays = Math.min(daysSinceMon + 1, cfgDays);
    const treeUserMeta = Number(activeUser.meta) || 15;
    let wkPts = 0;
    (state.store.history || []).forEach(h => {
      if (h.points?.[state.localProfileId] !== undefined)
        wkPts += Math.min(h.points[state.localProfileId], treeUserMeta);
    });
    wkPts += Math.min(todayPts, treeUserMeta);
    const weekDone = wkPts >= coveredDays * treeUserMeta;

    // Also protect Monday morning (day 1 of new week, nothing logged yet)
    const isMondayStart = dow === 1 && wkPts === 0;

    if (weekDone || isMondayStart) isWithered = false;
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
      statusHint.innerHTML = `<span style="color: var(--danger); font-weight:700;">${leafIcon} ${tr('tree.withering')}</span> ${tr('tree.withering.hint')}`;
    } else if (isBloomed) {
      statusHint.innerHTML = `<span style="color: #db2777; font-weight:700;">${flowerIcon} ${tr('tree.bloomed')}</span> ${tr('tree.bloomed.hint')}`;
    } else {
      const daysNeeded = Math.max(0, 5 - fullBranchesCount);
      statusHint.innerHTML = `${dropIcon} ${tr('tree.growing')} ${tr('tree.growing.hint', { n: fullBranchThreshold, days: daysNeeded })}`;
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
    svgContent += `<text x="${textX}" y="${y - 28}" text-anchor="${textAnchor}" font-family="var(--font-title)" font-size="10.5px" font-weight="${isToday ? '800' : '600'}" fill="${textFill}">${isToday ? tr('nav.today') : day.niceName}</text>`;

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
        + `<circle cx="${p2.x}" cy="${p2.y}" r="9" fill="transparent" class="tree-flower" data-name="${tr('tree.flower.name')}" data-desc="${tr('tree.flower.desc')}"/>`
        + `</g></g>`;

      // Lush foliage sprouted along the branch
      [0.2, 0.5, 0.78].forEach((td, k) => {
        const P = getBezierPoint(td, p0, p1, p2);
        const angD = (growsLeft ? 1 : -1) * (140 + k * 28);
        svgContent += `<g transform="translate(${P.x.toFixed(1)} ${(P.y + 2).toFixed(1)}) rotate(${angD})"><path d="${leafPath(9)}" fill="#10b981" opacity="0.85" class="tree-decor-leaf" data-name="${tr('tree.foliage.name')}" data-desc="${tr('tree.foliage.desc')}"/></g>`;
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
        let typeText = tr('tree.tooltip.personal');
        if (type === 'pending') typeText = tr('tree.tooltip.pending', { pts });
        else if (type === 'routine') typeText = tr('tree.tooltip.routine', { pts });
        
        text += `<br/><span style="color: #cbd5e1;">${typeText}</span>`;
        if (time) {
          text += `<br/><span style="color: #94a3b8; font-size: 0.7rem;">${tr('tree.tooltip.completed', { time })}</span>`;
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
    list.innerHTML = `<div class="rooms-hint" style="padding:10px 0;">${tr('switcher.no.others')}</div>`;
    return;
  }

  rooms.forEach(r => {
    const isCurrent = r.roomId === currentRoomId;
    const card = document.createElement('div');
    card.className = 'room-card' + (isCurrent ? ' room-card-current' : '');
    const roleLabel = r.role === 'owner' ? tr('role.owner') : tr('role.member');
    const badgeClass = r.role === 'owner' ? 'badge-owner' : 'badge-member';
    card.innerHTML = `
      <div style="overflow:hidden;">
        <div class="room-card-name">${esc(r.name)}${isCurrent ? ` <span style="color:var(--success); font-size:0.7rem;">${tr('rooms.current.badge')}</span>` : ''}</div>
        <div class="room-card-meta">${plural('rooms.member.count', r.memberCount)}</div>
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

export function renderQuickTagChips() {
  const container = document.querySelector('.quick-tags-container');
  if (!container) return;
  container.innerHTML = '';

  const existingTags = new Set();
  if (state.store.shoppingList) {
    state.store.shoppingList.forEach(it => {
      if (Array.isArray(it.tags)) {
        it.tags.forEach(t => {
          const trimmed = t.trim();
          if (trimmed) existingTags.add(trimmed);
        });
      }
    });
  }
  if (state.store.savedShoppingLists) {
    state.store.savedShoppingLists.forEach(list => {
      if (Array.isArray(list.items)) {
        list.items.forEach(it => {
          if (Array.isArray(it.tags)) {
            it.tags.forEach(t => {
              const trimmed = t.trim();
              if (trimmed) existingTags.add(trimmed);
            });
          }
        });
      }
    });
  }

  if (existingTags.size === 0) {
    container.innerHTML = `<span style="font-size:0.75rem; color:var(--text-muted); font-style:italic;">${tr('shop.tags.empty')}</span>`;
    return;
  }

  [...existingTags].forEach(tag => {
    const chip = document.createElement('span');
    chip.className = 'quick-tag-chip';
    chip.innerText = tag;
    chip.onclick = () => {
      const input = elements.shopItemTags;
      if (!input) return;
      let tags = input.value.split(',')
        .map(x => x.trim())
        .filter(x => x.length > 0);
      
      const tagIndex = tags.indexOf(tag);
      if (tagIndex >= 0) {
        tags.splice(tagIndex, 1);
      } else {
        tags.push(tag);
      }
      input.value = tags.join(', ');
      updateQuickTagChipStyles();
    };
    container.appendChild(chip);
  });
}

export function renderShopItemSuggestions() {
  const datalist = document.getElementById('shopItemSuggestions');
  if (!datalist) return;
  datalist.innerHTML = '';

  const uniqueNames = new Set();

  if (state.store.shoppingList) {
    state.store.shoppingList.forEach(it => {
      if (it.name) {
        const trimmed = it.name.trim();
        if (trimmed) uniqueNames.add(trimmed);
      }
    });
  }

  if (state.store.savedShoppingLists) {
    state.store.savedShoppingLists.forEach(list => {
      if (Array.isArray(list.items)) {
        list.items.forEach(it => {
          if (it.name) {
            const trimmed = it.name.trim();
            if (trimmed) uniqueNames.add(trimmed);
          }
        });
      }
    });
  }

  const isEn = getLang() === 'en';
  const defaultCommonItems = isEn ? [
    'Milk', 'Bread', 'Eggs', 'Cheese', 'Butter', 'Yogurt', 'Sugar', 'Salt', 'Coffee', 'Tea', 
    'Olive oil', 'Rice', 'Pasta', 'Tomato sauce', 'Onion', 'Garlic', 'Potatoes', 'Carrots', 
    'Bananas', 'Apples', 'Oranges', 'Lemons', 'Chicken', 'Beef', 'Canned tuna', 
    'Dish soap', 'Laundry detergent', 'Fabric softener', 'Toilet paper', 'Paper towels', 
    'Trash bags', 'Shampoo', 'Shower gel', 'Toothpaste'
  ] : [
    'Leche', 'Pan', 'Huevos', 'Queso', 'Mantequilla', 'Yogur', 'Azúcar', 'Sal', 'Café', 'Té', 
    'Aceite de oliva', 'Arroz', 'Pasta', 'Tomate frito', 'Cebolla', 'Ajo', 'Patatas', 'Zanahorias',
    'Plátanos', 'Manzanas', 'Naranjas', 'Limones', 'Pollo', 'Ternera', 'Atún en lata', 
    'Jabón de platos', 'Detergente', 'Suavizante', 'Papel higiénico', 'Papel de cocina', 
    'Bolsas de basura', 'Champú', 'Gel de ducha', 'Pasta de dientes'
  ];

  defaultCommonItems.forEach(name => {
    uniqueNames.add(name);
  });

  uniqueNames.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    datalist.appendChild(option);
  });
}

export function updateQuickTagChipStyles() {
  const container = document.querySelector('.quick-tags-container');
  if (!container) return;
  const input = elements.shopItemTags;
  if (!input) return;
  const currentTags = input.value.split(',')
    .map(x => x.trim().toLowerCase())
    .filter(x => x.length > 0);

  container.querySelectorAll('.quick-tag-chip').forEach(chip => {
    const tag = chip.innerText.trim().toLowerCase();
    if (currentTags.includes(tag)) {
      chip.classList.add('active');
      chip.style.background = 'var(--active-color)';
      chip.style.borderColor = 'var(--active-color)';
      chip.style.color = '#fff';
    } else {
      chip.classList.remove('active');
      chip.style.background = '';
      chip.style.borderColor = '';
      chip.style.color = '';
    }
  });
}

export { elements };
