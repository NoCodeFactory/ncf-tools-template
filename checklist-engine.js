/**
 * checklist-engine.js — Moteur générique de checklist
 *
 * Lit sa configuration depuis window.TOOL_CONFIG défini dans chaque page outil.
 * Structure attendue :
 *   window.TOOL_CONFIG = {
 *     webhookUrl:     'https://...',   // URL du Worker Cloudflare (proxy)
 *     storageKey:     'xxx_progress',  // Clé localStorage
 *     totalItems:     36,              // Nombre total d'items
 *     checklistType:  'migration-crm', // Identifiant type (pour Airtable)
 *     checklistTitle: 'Checklist Migration CRM No-Code',
 *     phases: [ { id, name, items: [{ id, text }] } ]
 *   };
 */

'use strict';

const {
  webhookUrl:     WEBHOOK_URL,
  storageKey:     STORAGE_KEY,
  totalItems:     TOTAL_ITEMS,
  checklistType:  CHECKLIST_TYPE,
  checklistTitle: CHECKLIST_TITLE,
  shareText:      SHARE_TEXT = 'Partagez cet outil avec vos équipes et recevez un récapitulatif de votre avancement ainsi qu\'un accès gratuit à nos experts no-code.',
  phases:         PHASES,
} = window.TOOL_CONFIG;

/* =============================================
   ÉTAT DE L'APPLICATION
============================================= */
const state = {
  checkedItems:      new Set(),
  userEmail:         null,
  sessionId:         null,
  emailModalShown50: false,
  openPhases:        new Set([1]), // phase 1 ouverte par défaut
};

function genUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { state.sessionId = genUUID(); return; }
    const d = JSON.parse(raw);
    state.checkedItems      = new Set(d.checkedItems || []);
    state.userEmail         = d.userEmail || null;
    state.sessionId         = d.sessionId || genUUID();
    state.emailModalShown50 = !!d.emailModalShown50;
    state.openPhases        = new Set(d.openPhases || [1]);
  } catch (_) {
    state.sessionId = genUUID();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      checkedItems:      [...state.checkedItems],
      userEmail:         state.userEmail,
      sessionId:         state.sessionId,
      emailModalShown50: state.emailModalShown50,
      openPhases:        [...state.openPhases],
      lastUpdated:       new Date().toISOString(),
    }));
  } catch (_) { /* quota dépassé ou mode privé */ }
}

/* =============================================
   CALCUL DE LA PROGRESSION
============================================= */
function getProgress() {
  const checked = state.checkedItems.size;
  const pct     = Math.round((checked / TOTAL_ITEMS) * 100);
  const phases  = PHASES.map(ph => {
    const done = ph.items.filter(i => state.checkedItems.has(i.id)).length;
    return {
      id: ph.id, name: ph.name,
      completed: done, total: ph.items.length,
      percentComplete: Math.round((done / ph.items.length) * 100),
    };
  });
  return { totalItems: TOTAL_ITEMS, checkedItems: checked, percentComplete: pct, phases };
}

/* =============================================
   WEBHOOK — appelle le Worker Cloudflare (proxy)
   Silencieux, jamais bloquant pour l'UI
============================================= */
let _wTimer = null;

function sendWebhook(event, immediate = false) {
  if (!WEBHOOK_URL) return;

  const fire = () => {
    const p = getProgress();
    fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        checklistType:  CHECKLIST_TYPE,
        checklistTitle: CHECKLIST_TITLE,
        email:          state.userEmail,
        progress:       p,
        checkedItemIds: [...state.checkedItems],
        timestamp:      new Date().toISOString(),
        sessionId:      state.sessionId,
      }),
    }).catch(() => {});
  };

  if (immediate) {
    clearTimeout(_wTimer);
    fire();
  } else {
    clearTimeout(_wTimer);
    _wTimer = setTimeout(fire, 3000);
  }
}

/* =============================================
   UTILITAIRES
============================================= */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const SVG_CHECK_WHITE = `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5" aria-hidden="true"><polyline points="20,6 9,17 4,12"/></svg>`;
const SVG_CHECK_GREEN = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><polyline points="20,6 9,17 4,12"/></svg>`;
const SVG_CHEVRON     = `<svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="6,9 12,15 18,9"/></svg>`;

/* =============================================
   CONSTRUCTION DU HTML D'UNE PHASE
============================================= */
function buildPhaseHTML(ph, phP, isComplete) {
  const badge = isComplete ? SVG_CHECK_GREEN : ph.id;

  const itemsHTML = ph.items.map(item => {
    const checked = state.checkedItems.has(item.id);
    return `
      <div class="item">
        <label>
          <input type="checkbox" data-item="${item.id}"${checked ? ' checked' : ''}
                 aria-label="${esc(item.text)}">
          <span class="cb-box" aria-hidden="true">${SVG_CHECK_WHITE}</span>
          <span class="item-text">${esc(item.text)}</span>
        </label>
      </div>`;
  }).join('');

  const banner = isComplete ? `
    <p class="complete-banner" aria-live="polite">
      ${SVG_CHECK_GREEN}
      Phase complétée - excellent travail !
    </p>` : '';

  return `
    <button class="phase-btn" type="button"
            aria-expanded="false"
            aria-controls="ph-body-${ph.id}">
      <span class="phase-badge" aria-hidden="true">${badge}</span>
      <span class="phase-info">
        <span class="phase-name">${esc(ph.name)}</span>
        <span class="phase-count" id="ph-count-${ph.id}">${phP.completed} / ${phP.total} étapes</span>
      </span>
      <span class="phase-bar" aria-hidden="true">
        <span class="mini-track">
          <span class="mini-fill" style="width:${phP.percentComplete}%"></span>
        </span>
      </span>
      ${SVG_CHEVRON}
    </button>
    <div class="phase-body" id="ph-body-${ph.id}" role="list">
      <div class="phase-body-inner">
        ${itemsHTML}
        ${banner}
      </div>
    </div>`;
}

/* =============================================
   RENDU COMPLET DES PHASES
============================================= */
function renderPhases() {
  const container = document.getElementById('main-content');
  container.innerHTML = `
    <div class="intro">
      <p><strong>${esc(CHECKLIST_TITLE)}.</strong> Cochez chaque étape au fur et à mesure de votre avancement. Votre progression est automatiquement sauvegardée dans votre navigateur.</p>
    </div>`;

  const progress = getProgress();
  const activeId = progress.phases.find(p => p.percentComplete < 100)?.id ?? null;

  PHASES.forEach(ph => {
    const phP        = progress.phases.find(p => p.id === ph.id);
    const isComplete = phP.percentComplete === 100;
    const isActive   = ph.id === activeId;
    const isOpen     = state.openPhases.has(ph.id);

    const sec = document.createElement('section');
    sec.className = ['phase', isComplete && 'is-complete', isActive && 'is-active', isOpen && 'is-open']
      .filter(Boolean).join(' ');
    sec.dataset.phaseId = ph.id;
    sec.setAttribute('aria-label', `Phase ${ph.id} - ${ph.name}`);
    sec.innerHTML = buildPhaseHTML(ph, phP, isComplete);

    sec.querySelector('.phase-btn').setAttribute('aria-expanded', isOpen);
    sec.querySelector('.phase-btn').addEventListener('click', () => togglePhase(ph.id));
    sec.querySelectorAll('input[type="checkbox"]').forEach(cb =>
      cb.addEventListener('change', e => onCheck(e, ph.id))
    );

    container.appendChild(sec);
  });
}

/* =============================================
   MISE À JOUR DE LA BARRE GLOBALE
============================================= */
function renderGlobalProgress() {
  const p = getProgress();
  document.getElementById('g-bar').style.width = p.percentComplete + '%';
  document.getElementById('g-pct').textContent  = p.percentComplete + '%';
  document.getElementById('hdr-sub').textContent =
    `${p.checkedItems} étape${p.checkedItems !== 1 ? 's' : ''} sur ${TOTAL_ITEMS} complétée${p.checkedItems !== 1 ? 's' : ''}`;
  document.querySelector('.g-progress').setAttribute('aria-valuenow', p.percentComplete);
}

/* =============================================
   ACCORDÉON
============================================= */
function togglePhase(phId) {
  const isOpen = state.openPhases.has(phId);
  if (isOpen) state.openPhases.delete(phId);
  else         state.openPhases.add(phId);
  saveState();

  const sec = document.querySelector(`[data-phase-id="${phId}"]`);
  if (!sec) return;
  sec.classList.toggle('is-open', !isOpen);
  sec.querySelector('.phase-btn').setAttribute('aria-expanded', !isOpen);
}

/* =============================================
   GESTION DES CASES À COCHER
============================================= */
function onCheck(e, phId) {
  const itemId = e.target.dataset.item;

  const pBefore    = getProgress();
  const wasComplete = {};
  pBefore.phases.forEach(p => { wasComplete[p.id] = p.percentComplete === 100; });

  if (e.target.checked) state.checkedItems.add(itemId);
  else                   state.checkedItems.delete(itemId);
  saveState();

  updatePhaseDisplay(phId);
  renderGlobalProgress();

  const pAfter = getProgress();

  pAfter.phases.forEach(p => {
    const justCompleted   = !wasComplete[p.id] && p.percentComplete === 100;
    const justUncompleted =  wasComplete[p.id] && p.percentComplete < 100;

    if (justCompleted) {
      showToast(`Phase ${p.id} complétée - excellent travail !`);
      rerenderPhase(p.id, pAfter);
    } else if (justUncompleted) {
      rerenderPhase(p.id, pAfter);
    }
  });

  if (pAfter.percentComplete >= 50 && !state.emailModalShown50 && !state.userEmail) {
    state.emailModalShown50 = true;
    saveState();
    setTimeout(openModal, 600);
  }

  sendWebhook('progress_update');
}

function updatePhaseDisplay(phId) {
  const sec  = document.querySelector(`[data-phase-id="${phId}"]`);
  if (!sec) return;
  const ph   = PHASES.find(p => p.id === phId);
  const done = ph.items.filter(i => state.checkedItems.has(i.id)).length;
  const pct  = Math.round((done / ph.items.length) * 100);

  const countEl = document.getElementById(`ph-count-${phId}`);
  if (countEl) countEl.textContent = `${done} / ${ph.items.length} étapes`;

  const miniFill = sec.querySelector('.mini-fill');
  if (miniFill) miniFill.style.width = pct + '%';
}

function rerenderPhase(phId, progress) {
  const sec = document.querySelector(`[data-phase-id="${phId}"]`);
  if (!sec) return;

  const ph       = PHASES.find(p => p.id === phId);
  const phP      = progress.phases.find(p => p.id === phId);
  const isComplete = phP.percentComplete === 100;
  const activeId   = progress.phases.find(p => p.percentComplete < 100)?.id ?? null;
  const isActive   = phId === activeId;
  const isOpen     = state.openPhases.has(phId);

  sec.className = ['phase', isComplete && 'is-complete', isActive && 'is-active', isOpen && 'is-open']
    .filter(Boolean).join(' ');
  sec.innerHTML = buildPhaseHTML(ph, phP, isComplete);

  const btn = sec.querySelector('.phase-btn');
  btn.setAttribute('aria-expanded', isOpen);
  btn.addEventListener('click', () => togglePhase(phId));
  sec.querySelectorAll('input[type="checkbox"]').forEach(cb =>
    cb.addEventListener('change', e => onCheck(e, phId))
  );

  PHASES.forEach(p2 => {
    if (p2.id === phId) return;
    document.querySelector(`[data-phase-id="${p2.id}"]`)
      ?.classList.toggle('is-active', p2.id === activeId);
  });
}

/* =============================================
   MODALE EMAIL
============================================= */
function openModal() {
  const box = document.getElementById('modal-box');
  box.innerHTML = `
    <div class="modal-icon" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1FAAFF" stroke-width="2">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
    </div>
    <h2 id="modal-heading">Recevez votre récapitulatif gratuit</h2>
    <p>${SHARE_TEXT}</p>
    <div class="email-row">
      <label for="m-email" class="sr-only">Adresse email professionnelle</label>
      <input type="email" id="m-email" class="email-input"
             placeholder="votre@email.com" autocomplete="email">
      <button class="btn btn-primary" id="m-submit" type="button">Envoyer</button>
    </div>
    <div class="modal-skip">
      <button id="m-skip" type="button">Continuer sans sauvegarder</button>
    </div>`;

  document.getElementById('modal-overlay').classList.add('is-open');

  const submit = () => {
    const inp   = document.getElementById('m-email');
    const email = inp?.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      inp.classList.add('error');
      inp.focus();
      setTimeout(() => inp.classList.remove('error'), 2500);
      return;
    }
    state.userEmail = email;
    saveState();
    sendWebhook('email_captured', true);

    box.innerHTML = `
      <div class="modal-success">
        <div class="success-ring" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20,6 9,17 4,12"/>
          </svg>
        </div>
        <p class="success-title">Progression sauvegardée !</p>
        <p class="success-sub">Vous recevrez un récapitulatif et les conseils de nos experts no-code.</p>
      </div>`;

    setTimeout(closeModal, 2000);
  };

  document.getElementById('m-submit').addEventListener('click', submit);
  document.getElementById('m-skip').addEventListener('click', closeModal);
  document.getElementById('m-email').addEventListener('keydown', e => {
    if (e.key === 'Enter') submit();
  });

  setTimeout(() => document.getElementById('m-email')?.focus(), 150);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('is-open');
}

document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});

/* =============================================
   BOUTON PARTAGER
============================================= */
document.getElementById('btn-share').addEventListener('click', openModal);

/* =============================================
   TOAST
============================================= */
let _tTimer = null;
function showToast(msg, ms = 3500) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_tTimer);
  _tTimer = setTimeout(() => el.classList.remove('show'), ms);
}

/* =============================================
   INITIALISATION
============================================= */
loadState();
renderPhases();
renderGlobalProgress();
