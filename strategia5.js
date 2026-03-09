const TODAY = new Date();
const $ = id => document.getElementById(id);

// --- DATA ---
let bizObj = [
  { id: 'b1', nome: 'Crescita dei ricavi (Piano 2027)', icona: '📈', categoria: 'Crescita', kpiTipo: '%', kpiLabel: 'Crescita fatturato', kpiTarget: 20 },
  { id: 'b2', nome: 'Accesso mercati Green EU', icona: '🌍', categoria: 'Mercato', kpiTipo: '%', kpiLabel: 'Quota mercati EU green', kpiTarget: 15 },
  { id: 'b3', nome: 'Riduzione costi operativi', icona: '⚙️', categoria: 'Efficienza', kpiTipo: '%', kpiLabel: 'Riduzione OPEX', kpiTarget: 10 }
];

let progettiLiberi = [
  { id: 'p1', nome: 'Installazione Fotovoltaico HQ', sem: 'verde', ult: '2026-02-28', pct: 80 },
  { id: 'p2', nome: 'Audit energetico sedi produttive', sem: 'giallo', ult: '2026-01-20', pct: 45 },
  { id: 'p3', nome: 'R&D Nuovi Materiali riciclati', sem: 'rosso', ult: '2025-09-15', pct: 30 },
  { id: 'p4', nome: 'Academy Interna ESG', sem: 'verde', ult: '2026-03-01', pct: 90 },
  { id: 'p5', nome: 'Tracciamento Mobilità Elettrica', sem: 'rosso', ult: '2025-10-10', pct: 20 },
  { id: 'p6', nome: 'Nuovo Codice Etico e Fornitori', sem: 'verde', ult: '2026-02-25', pct: 70 }
];

let obESG = [
  {
    id: 'ob1',
    nome: 'Riduzione emissioni Scope 1-2',
    desc: 'Piano pluriennale per la decarbonizzazione delle attività operative.',
    cat: 'E', dept: 'Operations', owner: 'Mario Rossi',
    kpi: 'Tonnellate CO₂', unita: 'n.', ultimoAggiornamento: '2026-02-15',
    targets: [
      { id: 't1', date: '2026-12-31', target: 1000, attuale: 980 },
      { id: 't2', date: '2027-12-31', target: 840, attuale: 980 }
    ],
    biz: ['b1', 'b3'],
    progetti: ['p1', 'p2']
  },
  {
    id: 'ob2',
    nome: 'Certificazione Prodotti Sostenibili',
    desc: 'Aumentare la % di prodotti con certificazioni ambientali di filiera.',
    cat: 'E', dept: 'R&D', owner: 'Chiara Gallo',
    kpi: '% Ricavi Sostenibili', unita: '%', ultimoAggiornamento: '2025-10-01',
    targets: [
      { id: 't3', date: '2025-06-30', target: 10, attuale: 8 },
      { id: 't4', date: '2026-06-30', target: 20, attuale: 8 }
    ],
    biz: ['b1', 'b2'],
    progetti: ['p3']
  },
  {
    id: 'ob3',
    nome: 'Programma Benessere & Formazione',
    desc: 'Formazione ESG per tutti i dipendenti e piano di welfare aziendale.',
    cat: 'S', dept: 'HR', owner: 'Elena Ferri',
    kpi: '% Dipendenti formati', unita: '%', ultimoAggiornamento: '2026-02-28',
    targets: [{ id: 't5', date: '2026-12-31', target: 100, attuale: 70 }],
    biz: ['b3'],
    progetti: ['p4']
  }
];

let expanded = {};
let currentTab = 'esg';
let filters = { search: '', dept: '', status: '', dateStart: '', dateEnd: '' };
let editingObjId = null;
let editingProjEsId = null;

// --- UNIFIED MODAL STATE ---
let currentModalTab = 'biz';
let modalTargetRows = [];
let _projectLinkContext = null; // ESG obj ID to auto-link a new project
let _afterBizSaveReturnTab = null; // if set, after saving biz return to this modal tab

// --- HELPERS ---
const pc = v => v >= 70 ? '#4CAF50' : v >= 40 ? '#F59E0B' : '#EF4444';
const ownerInitials = name => name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
const formatDate = iso => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

function getNearestTarget(ob) {
  if (!ob.targets || !ob.targets.length) return null;
  const sorted = [...ob.targets].sort((a, b) => new Date(a.date) - new Date(b.date));
  const future = sorted.filter(t => new Date(t.date) >= TODAY);
  return future.length ? future[0] : sorted[sorted.length - 1];
}

function calcSem(ob) {
  const nt = getNearestTarget(ob);
  if (!nt) return 'rosso';
  const scad = new Date(nt.date);
  const lastUpd = new Date(ob.ultimoAggiornamento);
  const weeksStale = (TODAY - lastUpd) / (7 * 24 * 3600 * 1000);
  if (scad > TODAY || weeksStale < 4) return 'verde';
  if (weeksStale < 12) return 'giallo';
  return 'rosso';
}

function calcGlobalProgress(ob) {
  const nt = getNearestTarget(ob);
  if (!nt || nt.target === 0) return 0;
  return Math.min(100, Math.max(0, Math.round((nt.attuale / nt.target) * 100)));
}

// --- INITIALIZE ---
window.onload = () => {
  initTabs();
  renderAll();

  $('btnNuovoESG').addEventListener('click', () => {
    window._tempModalData = null;
    editingObjId = null;
    modalTargetRows = [{ id: Date.now().toString(), date: '', target: '', attuale: '0' }];
    openUnifiedModal('esg');
  });
  $('btnNuovoBiz').addEventListener('click', () => {
    window._tempModalData = null;
    editingObjId = null;
    openUnifiedModal('biz');
  });
  $('modalOverlay').addEventListener('click', e => {
    if (e.target.id === 'modalOverlay') closeModal();
  });
};

// --- TABS LOGIC ---
function initTabs() {
  document.querySelectorAll('.tab-item').forEach(el => {
    el.addEventListener('click', e => {
      document.querySelectorAll('.tab-item').forEach(x => x.classList.remove('active'));
      e.target.classList.add('active');
      currentTab = e.target.dataset.tab;
      const ind = document.querySelector('.tab-indicator');
      ind.style.width = e.target.offsetWidth + 'px';
      ind.style.left = e.target.offsetLeft + 'px';
      renderAll();
    });
  });
  const activeTab = document.querySelector('.tab-item.active');
  const ind = document.querySelector('.tab-indicator');
  ind.style.width = activeTab.offsetWidth + 'px';
  ind.style.left = activeTab.offsetLeft + 'px';
}

function applyFilters() {
  filters.search = $('search').value.toLowerCase();
  filters.dept = $('filterDept').value;
  filters.status = $('filterStatus').value;
  filters.dateStart = $('dateStart').value;
  filters.dateEnd = $('dateEnd').value;
  renderAll();
}

// --- RENDER MAIN ---
function renderAll() {
  const sems = obESG.map(calcSem);
  $('summaryRow').innerHTML = `
    <div class="sum-card"><span class="sum-ico">🎯</span><div><div class="sum-num">${obESG.length}</div><div class="sum-lbl">Obiettivi ESG</div></div></div>
    <div class="sum-card"><span class="sum-ico" style="color:#4CAF50">✅</span><div><div class="sum-num" style="color:#2E7D32">${sems.filter(x => x === 'verde').length}</div><div class="sum-lbl" style="color:#2E7D32">Tutto ok</div></div></div>
    <div class="sum-card"><span class="sum-ico" style="color:#F59E0B">⚠️</span><div><div class="sum-num" style="color:#92400E">${sems.filter(x => x === 'giallo').length}</div><div class="sum-lbl" style="color:#92400E">Attenzione</div></div></div>
    <div class="sum-card"><span class="sum-ico" style="color:#EF4444">🔴</span><div><div class="sum-num" style="color:#991B1B">${sems.filter(x => x === 'rosso').length}</div><div class="sum-lbl" style="color:#991B1B">A rischio</div></div></div>
  `;
  if (currentTab === 'esg') renderESGTab();
  else renderBizTab();
}

// --- ESG TAB ---
function renderESGTab() {
  $('listHeader').innerHTML = `
    <div class="lh-col col-esg">Obiettivo ESG</div>
    <div class="lh-col col-dept">Funzione Az.</div>
    <div class="lh-col col-own">Owner</div>
    <div class="lh-col col-tgt">Prospettiva KPI</div>
    <div class="lh-col col-scad">Prox. Scadenza</div>
    <div class="lh-col col-sem">Stato <span class="info-icon" data-tooltip="🟢 Tutto ok: scadenza futura o aggiornato entro 4 settimane&#10;🟡 Attenzione: nessun aggiornamento da 4 a 12 settimane&#10;🔴 A rischio: nessun aggiornamento da oltre 12 settimane">i</span></div>
  `;

  let list = obESG.filter(o => {
    if (filters.search && !o.nome.toLowerCase().includes(filters.search) && !o.desc.toLowerCase().includes(filters.search)) return false;
    if (filters.dept && o.dept !== filters.dept) return false;
    if (filters.status && calcSem(o) !== filters.status) return false;
    if (filters.dateStart || filters.dateEnd) {
      const start = filters.dateStart ? new Date(filters.dateStart) : new Date('2000-01-01');
      const end = filters.dateEnd ? new Date(filters.dateEnd) : new Date('2099-12-31');
      return o.targets.some(t => new Date(t.date) >= start && new Date(t.date) <= end);
    }
    return true;
  });

  if (!list.length) {
    $('mainList').innerHTML = `<div class="empty-state">Nessun obiettivo trovato.</div>`;
    return;
  }

  $('mainList').innerHTML = list.map(o => {
    const sem = calcSem(o);
    const semLabel = sem === 'verde' ? 'Tutto ok' : sem === 'giallo' ? 'Attenzione' : 'A rischio';
    const nt = getNearestTarget(o);
    const prog = calcGlobalProgress(o);
    const isExp = nt && new Date(nt.date) < TODAY;
    const expOpen = expanded[o.id] ? 'open' : '';
    const projs = o.progetti.map(pid => progettiLiberi.find(pl => pl.id === pid)).filter(Boolean);

    return `
      <div class="obj-row-wrap">
        <div class="obj-row ${expOpen}" onclick="toggleExpand(event, '${o.id}')">
          <div class="row-cell col-esg">
            <div class="or-name"><span class="cat-badge cat-${o.cat}">${o.cat}</span> ${o.nome}</div>
            <div class="or-desc">${o.desc}</div>
          </div>
          <div class="row-cell col-dept"><span class="dept-tag">${o.dept || '—'}</span></div>
          <div class="row-cell col-own">
            <div class="owner-wrap">
              <div class="owner-av" style="background:#555">${ownerInitials(o.owner)}</div>
              <span class="owner-name">${o.owner.split(' ')[0]}</span>
            </div>
          </div>
          <div class="row-cell col-tgt" style="padding-right:20px">
            <div class="prog-val">${nt ? nt.attuale + ' / ' + nt.target + ' ' + o.unita : '—'}</div>
            <div class="prog-track"><div class="prog-fill" style="width:${prog}%; background:${pc(prog)}"></div></div>
          </div>
          <div class="row-cell col-scad">
            <div class="date-txt ${isExp ? 'expired' : ''}">${nt ? formatDate(nt.date) : '—'}</div>
            <div class="date-sub">${o.targets.length > 1 ? `+${o.targets.length - 1} scadenze` : ''}</div>
          </div>
          <div class="row-cell col-sem">
            <span class="sem-tag sem-${sem}"><div class="sem-dot sd-${sem}"></div>${semLabel}</span>
          </div>
          <div class="chevron ${expOpen}">∨</div>
        </div>

        <div class="obj-expanded ${expOpen}" id="exp-${o.id}">
          <div class="exp-grid">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
                <div class="sec-title" style="margin:0">Cronoprogramma & Target (${o.kpi})</div>
                <button class="btn-ghost" style="padding:4px 10px; font-size:11px" onclick="editESG('${o.id}')">✎ Modifica</button>
              </div>
              <div class="target-board">
                <div class="tb-row tb-head">
                  <div class="tb-date">SCADENZA</div>
                  <div class="tb-val">ATTUALE / TARGET</div>
                  <div class="tb-status">STATO TARGET</div>
                </div>
                ${o.targets.sort((a, b) => new Date(a.date) - new Date(b.date)).map(t => {
                  const tExp = new Date(t.date) < TODAY;
                  const done = t.attuale >= t.target;
                  const st = done
                    ? '<span style="color:#4CAF50">Raggiunto ✓</span>'
                    : tExp ? '<span style="color:#EF4444">Scaduto ⚠</span>'
                    : '<span style="color:#F59E0B">In corso</span>';
                  return `<div class="tb-row">
                    <div class="tb-date ${tExp && !done ? 'expired' : ''}">${formatDate(t.date)}</div>
                    <div class="tb-val">${t.attuale} / <span style="color:#2E7D32">${t.target} ${o.unita}</span></div>
                    <div class="tb-status">${st}</div>
                  </div>`;
                }).join('')}
              </div>
            </div>
            <div>
              ${o.biz.map(bId => {
                const b = bizObj.find(x => x.id === bId);
                return b ? `<div class="link-box-row link-box"><div class="lb-icon">${b.icona}</div><div class="lb-title">${b.nome}</div></div>` : '';
              }).join('') || '<div class="date-sub">Nessun collegamento business.</div>'}

              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px; margin-bottom:12px">
                <div class="sec-title" style="margin:0">Progetti operativi collegati</div>
                <div style="display:flex; gap:6px;">
                  <button class="btn-quickadd" onclick="openQuickAddProject('${o.id}')">+ Nuovo</button>
                  <button class="btn-ghost" style="padding:4px 10px; font-size:11px" onclick="editProgetti('${o.id}')">🔗 Collega / Rimuovi</button>
                </div>
              </div>
              ${projs.map(p => `
                <div class="proj-row">
                  <div class="p-dot sd-${p.sem}"></div>
                  <div class="p-name">${p.nome}<br><span class="date-sub">Aggiornato: ${formatDate(p.ult)}</span></div>
                  <div class="p-bar"><div class="prog-track"><div class="prog-fill" style="width:${p.pct}%;background:${pc(p.pct)}"></div></div></div>
                  <div style="font-size:12px; font-weight:700">${p.pct}%</div>
                </div>
              `).join('') || '<div class="date-sub">Nessun progetto collegato. Usa "+ Nuovo" per crearne uno o "Collega" per associarne di esistenti.</div>'}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// --- BUSINESS TAB ---
function renderBizTab() {
  $('listHeader').innerHTML = `
    <div class="lh-col col-biz">Obiettivo di Business</div>
    <div class="lh-col col-bdesc">Categoria / KPI</div>
    <div class="lh-col col-tgt">Copertura Strategica</div>
  `;

  // Filter bizObj: keep only those whose linked ESG objectives match active filters
  let list = bizObj.filter(b => {
    // Search on biz name
    if (filters.search && !b.nome.toLowerCase().includes(filters.search)) return false;

    // Dept filter: biz is visible only if it has ≥1 linked ESG obj in that dept
    if (filters.dept) {
      const hasMatchingDept = obESG.some(o => o.biz.includes(b.id) && o.dept === filters.dept);
      if (!hasMatchingDept) return false;
    }

    // Status filter: biz is visible only if it has ≥1 linked ESG obj with that sem status
    if (filters.status) {
      const hasMatchingStatus = obESG.some(o => o.biz.includes(b.id) && calcSem(o) === filters.status);
      if (!hasMatchingStatus) return false;
    }

    return true;
  });

  if (!list.length) {
    $('mainList').innerHTML = `<div class="empty-state">Nessun obiettivo di business trovato con i filtri selezionati.</div>`;
    return;
  }

  $('mainList').innerHTML = list.map(b => {
    // When dept filter is active, show only matching ESG objs in the cascade
    const linkedESG = obESG.filter(o => {
      if (!o.biz.includes(b.id)) return false;
      if (filters.dept && o.dept !== filters.dept) return false;
      if (filters.status && calcSem(o) !== filters.status) return false;
      return true;
    });
    const totalProj = linkedESG.reduce((acc, o) => acc + o.progetti.length, 0);
    const expOpen = expanded[b.id] ? 'open' : '';

    return `
      <div class="obj-row-wrap">
        <div class="obj-row ${expOpen}" onclick="toggleExpand(event, '${b.id}')">
          <div class="row-cell col-biz" style="flex-direction:row; justify-content:flex-start; align-items:center;">
            <div class="biz-icon-box">${b.icona}</div>
            <div>
              <div class="or-name" style="margin:0">${b.nome}</div>
              ${b.categoria ? `<div class="date-sub" style="margin-top:2px">${b.categoria}</div>` : ''}
            </div>
          </div>
          <div class="row-cell col-bdesc">
            ${b.kpiLabel
              ? `<div style="font-size:12px; font-weight:700; color:var(--text)">${b.kpiLabel}</div>
                 <div class="date-sub">Target: <strong>${b.kpiTarget}${b.kpiTipo}</strong></div>`
              : '<span class="date-sub">—</span>'}
          </div>
          <div class="row-cell col-tgt">
            <span class="date-txt" style="color:var(--text-m)">${linkedESG.length} obiettivi ESG · ${totalProj} progetti</span>
          </div>
          <div class="chevron ${expOpen}">∨</div>
        </div>

        <div class="obj-expanded ${expOpen}" id="exp-${b.id}">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px">
            <div class="sec-title" style="margin:0">Cascata Strategica End-to-End</div>
            <button class="btn-ghost" style="padding:4px 10px; font-size:11px" onclick="editBiz('${b.id}')">✎ Modifica</button>
          </div>

          ${linkedESG.length ? linkedESG.map(o => {
            const nt = getNearestTarget(o);
            const prog = calcGlobalProgress(o);
            const sem = calcSem(o);
            const semLabel = sem === 'verde' ? 'Tutto ok' : sem === 'giallo' ? 'Attenzione' : 'A rischio';
            const projs = o.progetti.map(pid => progettiLiberi.find(pl => pl.id === pid)).filter(Boolean);
            return `
              <div class="cascade-esg-block">
                <div class="cascade-esg-header">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span class="cat-badge cat-${o.cat}">${o.cat}</span>
                    <strong style="font-size:13px">${o.nome}</strong>
                  </div>
                  <div style="display:flex; align-items:center; gap:10px;">
                    <span class="dept-tag">${o.dept}</span>
                    <span class="sem-tag sem-${sem}" style="font-size:10px; padding:3px 10px;">
                      <div class="sem-dot sd-${sem}"></div>${semLabel}
                    </span>
                    ${nt ? `<span style="font-size:12px; font-weight:700; color:var(--text-m)">${nt.attuale}/${nt.target} ${o.unita}</span>` : ''}
                  </div>
                </div>
                <div class="cascade-prog-bar">
                  <div class="prog-track" style="margin:0; flex:1">
                    <div class="prog-fill" style="width:${prog}%; background:${pc(prog)}"></div>
                  </div>
                  <span style="font-size:11px; font-weight:800; color:${pc(prog)}; min-width:32px; text-align:right">${prog}%</span>
                </div>
                <div class="cascade-projects">
                  ${projs.length ? projs.map(p => `
                    <div class="cascade-proj-item">
                      <div style="display:flex; align-items:center; gap:8px; flex:1;">
                        <span style="font-size:13px; color:#cbd5e1">↳</span>
                        <div class="p-dot sd-${p.sem}" style="width:7px; height:7px; margin:0; flex-shrink:0"></div>
                        <span style="font-size:12px; color:var(--text-m); flex:1">${p.nome}</span>
                      </div>
                      <div style="display:flex; align-items:center; gap:8px;">
                        <div class="prog-track" style="width:80px; margin:0">
                          <div class="prog-fill" style="width:${p.pct}%; background:${pc(p.pct)}"></div>
                        </div>
                        <strong style="font-size:11px; color:${pc(p.pct)}; min-width:28px; text-align:right">${p.pct}%</strong>
                      </div>
                    </div>
                  `).join('') : '<div style="font-size:11px; color:#aaa; padding:4px 0 0 22px;">↳ Nessun progetto collegato</div>'}
                </div>
              </div>
            `;
          }).join('') : '<div class="date-sub">Nessun obiettivo ESG collegato a questo obiettivo di business.</div>'}
        </div>
      </div>
    `;
  }).join('');
}

function toggleExpand(event, id) {
  if (!event.target.closest('button')) {
    expanded[id] = !expanded[id];
    renderAll();
  }
}

// ═══════════════════════════════════════════════════════════════
// UNIFIED MODAL SYSTEM
// ═══════════════════════════════════════════════════════════════

function openModal(html) {
  $('modalBox').innerHTML = html;
  $('modalOverlay').classList.add('open');
}
function closeModal() {
  $('modalOverlay').classList.remove('open');
  _projectLinkContext = null;
  _afterBizSaveReturnTab = null;
  window._tempModalData = null;
}

// Main entry: opens the Hub di Creazione on a given tab
function openUnifiedModal(defaultTab = 'biz') {
  currentModalTab = defaultTab;
  _renderUnifiedModal();
}

// Tab switch inside the unified modal
function switchModalTab(tab) {
  if (currentModalTab === 'esg') syncModalDOMToState();
  currentModalTab = tab;
  if (tab === 'esg' && !modalTargetRows.length) {
    modalTargetRows = [{ id: Date.now().toString(), date: '', target: '', attuale: '0' }];
  }
  _renderUnifiedModal();
}

function _renderUnifiedModal() {
  const isEditing = !!editingObjId;
  const projContext = _projectLinkContext
    ? obESG.find(x => x.id === _projectLinkContext)
    : null;

  const modalTitle = isEditing
    ? (currentModalTab === 'esg' ? 'Modifica Obiettivo ESG' : 'Modifica Obiettivo Business')
    : projContext
      ? `Nuovo Progetto → ${projContext.nome}`
      : 'Hub di Creazione';

  const tabsDef = [
    { id: 'biz',      label: '🏢 Obiettivo Business' },
    { id: 'esg',      label: '🌱 Obiettivo ESG'      },
    { id: 'progetto', label: '📋 Nuovo Progetto'      }
  ];

  // When editing, lock to the relevant tab; hide tab switcher only for project quick-add
  const showTabs = !projContext;

  const tabsHTML = showTabs
    ? tabsDef.map(t =>
        `<button class="um-tab ${currentModalTab === t.id ? 'active' : ''}" onclick="switchModalTab('${t.id}')">${t.label}</button>`
      ).join('')
    : '';

  let bodyHTML = '';
  let saveLabel = '';
  let saveAction = '';

  if (currentModalTab === 'biz') {
    bodyHTML = _renderBizFormHTML();
    saveLabel = isEditing ? '✓ Aggiorna Obiettivo Business' : '✓ Salva Obiettivo Business';
    saveAction = 'saveBiz()';
  } else if (currentModalTab === 'esg') {
    bodyHTML = _renderESGFormHTML();
    saveLabel = isEditing ? '✓ Aggiorna Obiettivo ESG' : '✓ Salva Obiettivo ESG';
    saveAction = 'saveESG()';
  } else {
    bodyHTML = _renderProgettoFormHTML();
    saveLabel = '✓ Salva Progetto';
    saveAction = 'saveProgetto()';
  }

  const html = `
    <div class="m-head" style="padding-bottom:0">
      <div class="m-close" onclick="closeModal()">✕</div>
      <div class="m-title">${modalTitle}</div>
      ${!isEditing && !projContext ? '<div class="m-sub" style="margin-bottom:14px">Crea nuovi contenuti strategici in un unico punto.</div>' : '<div style="margin-bottom:14px"></div>'}
      ${showTabs ? `<div class="um-tabs">${tabsHTML}</div>` : ''}
    </div>
    <div class="m-body" style="padding:24px 30px">
      ${bodyHTML}
    </div>
    <div class="m-foot">
      <button class="btn-ghost" onclick="closeModal()">Annulla</button>
      <button class="btn-primary" onclick="${saveAction}">${saveLabel}</button>
    </div>
  `;
  openModal(html);
}

// ─── BIZ FORM ───────────────────────────────────────────────────
function _renderBizFormHTML() {
  let d = { nome: '', icona: '📈', categoria: '', kpiTipo: '%', kpiLabel: '', kpiTarget: '' };
  if (editingObjId) {
    const ex = bizObj.find(x => x.id === editingObjId);
    if (ex) d = { ...d, ...ex };
  }

  const categorie = ['Crescita', 'Efficienza', 'Mercato', 'Rischio', 'Reputazione', 'Innovazione'];

  return `
    <div class="fg">
      <label class="fl">Nome Obiettivo *</label>
      <input class="fi" id="newBizName" value="${d.nome}" placeholder="Es. Riduzione dei costi OPEX">
    </div>
    <div class="fg">
      <label class="fl">Categoria</label>
      <select class="fi" id="newBizCategoria">
        <option value="">Seleziona categoria…</option>
        ${categorie.map(c => `<option value="${c}" ${d.categoria === c ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
    </div>
    <div style="background:#f4f6f8; border-radius:12px; padding:18px; border:1px solid #e2e8f0; margin-top:4px;">
      <div class="sec-title" style="margin-bottom:16px">📊 KPI di Riferimento</div>
      <div class="fg2">
        <div class="fg" style="margin:0">
          <label class="fl">Tipo Valore</label>
          <select class="fi" id="newBizKpiTipo">
            <option value="%" ${d.kpiTipo === '%' ? 'selected' : ''}>% (Percentuale)</option>
            <option value="N°" ${d.kpiTipo === 'N°' ? 'selected' : ''}>N° (Numerico)</option>
          </select>
        </div>
        <div class="fg" style="margin:0">
          <label class="fl">Descrizione KPI</label>
          <input class="fi" id="newBizKpiLabel" value="${d.kpiLabel}" placeholder="Es. Crescita fatturato">
        </div>
      </div>
      <div class="fg" style="margin-top:16px; margin-bottom:0">
        <label class="fl">Valore Target</label>
        <input class="fi" type="number" id="newBizKpiTarget" value="${d.kpiTarget}" placeholder="Es. 20">
      </div>
    </div>
  `;
}

// ─── ESG FORM ───────────────────────────────────────────────────
function _renderESGFormHTML() {
  const d = window._tempModalData || {
    nome: '', desc: '', cat: 'E', dept: 'HR', owner: '', kpi: '', unita: '%', biz: []
  };

  return `
    <div class="fg">
      <label class="fl">Nome Obiettivo *</label>
      <input class="fi" id="m_nome" value="${d.nome}" placeholder="Es. Formazione diversità e inclusione">
    </div>
    <div class="fg">
      <label class="fl">Descrizione</label>
      <textarea class="fi" id="m_desc" rows="2" placeholder="Breve strategia di progetto...">${d.desc}</textarea>
    </div>
    <div class="fg2">
      <div class="fg">
        <label class="fl">Area ESG *</label>
        <select class="fi" id="m_cat">
          <option value="E" ${d.cat === 'E' ? 'selected' : ''}>Environmental (E)</option>
          <option value="S" ${d.cat === 'S' ? 'selected' : ''}>Social (S)</option>
          <option value="G" ${d.cat === 'G' ? 'selected' : ''}>Governance (G)</option>
        </select>
      </div>
      <div class="fg">
        <label class="fl">Funzione Aziendale</label>
        <select class="fi" id="m_dept">
          <option value="HR" ${d.dept === 'HR' ? 'selected' : ''}>HR & Organization</option>
          <option value="Finance" ${d.dept === 'Finance' ? 'selected' : ''}>Finance & Administration</option>
          <option value="Operations" ${d.dept === 'Operations' ? 'selected' : ''}>Operations & Production</option>
          <option value="Sales" ${d.dept === 'Sales' ? 'selected' : ''}>Sales & Marketing</option>
          <option value="R&D" ${d.dept === 'R&D' ? 'selected' : ''}>R&D / Innovation</option>
          <option value="Procurement" ${d.dept === 'Procurement' ? 'selected' : ''}>Procurement / Supply Chain</option>
          <option value="IT" ${d.dept === 'IT' ? 'selected' : ''}>IT & Digital</option>
          <option value="Legal" ${d.dept === 'Legal' ? 'selected' : ''}>Legal & Compliance</option>
        </select>
      </div>
    </div>
    <div class="fg2">
      <div class="fg">
        <label class="fl">Owner (Nome)</label>
        <input class="fi" id="m_owner" value="${d.owner}" placeholder="Es. Giulia Verdi">
      </div>
      <div class="fg">
        <label class="fl">Collega a Obiettivo Business</label>
        <div style="display:flex; gap:6px; align-items:flex-start">
          <select class="fi" id="m_biz" multiple style="height:auto; flex:1; min-height:44px">
            ${bizObj.map(b => `<option value="${b.id}" ${d.biz.includes(b.id) ? 'selected' : ''}>${b.icona} ${b.nome}</option>`).join('')}
          </select>
          <button class="btn-quickadd" title="Crea nuovo obiettivo Business" onclick="addQuickBiz()">+</button>
        </div>
        <div style="font-size:10px; color:var(--text-l); margin-top:4px">CTRL/CMD per multipla · <strong>+</strong> per crearne uno nuovo</div>
      </div>
    </div>
    <div style="background:#f4f6f8; border-radius:12px; padding:18px; border:1px solid #e2e8f0; margin-top:4px;">
      <div class="fg2" style="margin-bottom:12px;">
        <div class="fg" style="margin:0">
          <label class="fl">Nome KPI *</label>
          <input class="fi" id="m_kpi" value="${d.kpi}" placeholder="Es. N. dipendenti formati">
        </div>
        <div class="fg" style="margin:0">
          <label class="fl">Unità di Misura</label>
          <select class="fi" id="m_unita">
            <option value="%" ${d.unita === '%' ? 'selected' : ''}>% (Percentuale)</option>
            <option value="n." ${d.unita === 'n.' ? 'selected' : ''}>N° (Numero assoluto)</option>
          </select>
        </div>
      </div>
      <label class="fl" style="margin-top:20px; margin-bottom:10px">Cronologia Scadenze e Target</label>
      <div class="target-list-wrap" id="modalTargetContainer">
        ${modalTargetRows.map(tr => `
          <div class="target-item-row">
            <input type="date" class="fi" value="${tr.date}" onchange="updateMTarget('${tr.id}', 'date', this.value)" style="width:140px">
            <input type="number" class="fi" placeholder="Target KPI" value="${tr.target}" onchange="updateMTarget('${tr.id}', 'target', this.value)">
            <input type="number" class="fi" placeholder="Valore Attuale" value="${tr.attuale}" onchange="updateMTarget('${tr.id}', 'attuale', this.value)">
            ${modalTargetRows.length > 1
              ? `<button class="btn-del" onclick="delMTarget('${tr.id}')">✕</button>`
              : '<div style="width:26px"></div>'}
          </div>
        `).join('')}
        <div class="btn-add-target" onclick="addMTarget()">+ Aggiungi Nuovo Traguardo Intermedio</div>
      </div>
    </div>
  `;
}

// ─── PROGETTO FORM ──────────────────────────────────────────────
function _renderProgettoFormHTML() {
  const projContext = _projectLinkContext ? obESG.find(x => x.id === _projectLinkContext) : null;

  return `
    <div class="proj-placeholder-notice">
      <div class="proj-placeholder-icon">📋</div>
      <div class="proj-placeholder-title">Stessa schermata dell'area Crea Progetto ESG</div>
      <div class="proj-placeholder-sub">La creazione dei progetti operativi avviene nell'area dedicata del modulo Progetti, mantenendo un'unica fonte di verità per tutta la piattaforma.</div>
      ${projContext ? `<div class="quick-link-notice" style="margin-top:16px; text-align:left">✓ Una volta creato, il progetto sarà collegato automaticamente a: <strong>${projContext.nome}</strong></div>` : ''}
    </div>
  `;
}

// ─── QUICK ADD ACTIONS ──────────────────────────────────────────

// Open the unified modal pre-set on "Progetto" tab, with auto-link to an ESG obj
function openQuickAddProject(obId) {
  _projectLinkContext = obId;
  editingObjId = null;
  window._tempModalData = null;
  openUnifiedModal('progetto');
}

// From ESG form: switch to Biz tab to create inline, then return to ESG
function addQuickBiz() {
  syncModalDOMToState();
  _afterBizSaveReturnTab = 'esg';
  editingObjId = null;
  currentModalTab = 'biz';
  _renderUnifiedModal();
}

// ─── TARGET ROW HELPERS ─────────────────────────────────────────
function updateMTarget(id, field, value) {
  const row = modalTargetRows.find(x => x.id == id);
  if (row) row[field] = value;
}

function syncModalDOMToState() {
  if ($('m_nome')) {
    window._tempModalData = {
      nome: $('m_nome').value,
      desc: $('m_desc').value,
      cat: $('m_cat').value,
      dept: $('m_dept').value,
      owner: $('m_owner').value,
      biz: Array.from($('m_biz').selectedOptions).map(opt => opt.value),
      kpi: $('m_kpi').value,
      unita: $('m_unita').value
    };
  }
}

function addMTarget() {
  syncModalDOMToState();
  modalTargetRows.push({ id: Date.now().toString(), date: '', target: '', attuale: '0' });
  _renderUnifiedModal();
}

function delMTarget(id) {
  syncModalDOMToState();
  modalTargetRows = modalTargetRows.filter(x => x.id != id);
  _renderUnifiedModal();
}

// ─── SAVE FUNCTIONS ─────────────────────────────────────────────

function saveESG() {
  const nome = $('m_nome').value;
  if (!nome) { $('m_nome').focus(); return; }

  const validTargets = modalTargetRows.filter(t => t.date && t.target !== '');
  const tgs = validTargets.map(t => ({
    id: String(t.id).startsWith('t') ? t.id : 't' + Date.now() + Math.random(),
    date: t.date,
    target: parseFloat(t.target) || 0,
    attuale: parseFloat(t.attuale) || 0
  }));
  const selBiz = Array.from($('m_biz').selectedOptions).map(opt => opt.value);

  if (editingObjId) {
    const o = obESG.find(x => x.id === editingObjId);
    o.nome = nome; o.desc = $('m_desc').value; o.cat = $('m_cat').value;
    o.dept = $('m_dept').value; o.owner = $('m_owner').value || 'Unassigned';
    o.kpi = $('m_kpi').value; o.unita = $('m_unita').value;
    o.targets = tgs; o.biz = selBiz;
    o.ultimoAggiornamento = new Date().toISOString().slice(0, 10);
  } else {
    obESG.push({
      id: 'ob' + Date.now(),
      nome, desc: $('m_desc').value, cat: $('m_cat').value,
      dept: $('m_dept').value, owner: $('m_owner').value || 'Unassigned',
      kpi: $('m_kpi').value, unita: $('m_unita').value,
      ultimoAggiornamento: new Date().toISOString().slice(0, 10),
      targets: tgs, biz: selBiz, progetti: []
    });
  }

  window._tempModalData = null;
  editingObjId = null;
  closeModal();
  renderAll();
}

function saveBiz() {
  const nome = $('newBizName').value;
  if (!nome) { $('newBizName').focus(); return; }

  const icona    = $('newBizIcon').value;
  const categoria = $('newBizCategoria').value;
  const kpiTipo  = $('newBizKpiTipo').value;
  const kpiLabel = $('newBizKpiLabel').value;
  const kpiTarget = parseFloat($('newBizKpiTarget').value) || 0;

  let newId = null;

  if (editingObjId) {
    const ex = bizObj.find(x => x.id === editingObjId);
    ex.nome = nome; ex.icona = icona; ex.categoria = categoria;
    ex.kpiTipo = kpiTipo; ex.kpiLabel = kpiLabel; ex.kpiTarget = kpiTarget;
  } else {
    newId = 'b' + Date.now();
    bizObj.push({ id: newId, nome, icona, categoria, kpiTipo, kpiLabel, kpiTarget });
  }

  editingObjId = null;

  // If called from "Quick Add" inside ESG form, return to ESG tab
  if (_afterBizSaveReturnTab) {
    const returnTab = _afterBizSaveReturnTab;
    _afterBizSaveReturnTab = null;
    currentModalTab = returnTab;
    // Pre-select the newly created biz in the ESG form
    if (newId && window._tempModalData) {
      window._tempModalData.biz = [...(window._tempModalData.biz || []), newId];
    }
    _renderUnifiedModal();
    return;
  }

  closeModal();
  renderAll();
}

function saveProgetto() {
  const nome = $('newProjNome').value;
  if (!nome) { $('newProjNome').focus(); return; }

  const pct   = Math.min(100, Math.max(0, parseInt($('newProjPct').value) || 0));
  const sem   = $('newProjSem').value;
  const today = new Date().toISOString().slice(0, 10);
  const newP  = { id: 'p' + Date.now(), nome, sem, ult: today, pct };
  progettiLiberi.push(newP);

  // Link to ESG objective
  if (_projectLinkContext) {
    const ob = obESG.find(x => x.id === _projectLinkContext);
    if (ob) { ob.progetti.push(newP.id); ob.ultimoAggiornamento = today; }
  } else {
    const esgLink = $('newProjESGLink');
    if (esgLink && esgLink.value) {
      const ob = obESG.find(x => x.id === esgLink.value);
      if (ob) { ob.progetti.push(newP.id); ob.ultimoAggiornamento = today; }
    }
  }

  _projectLinkContext = null;
  closeModal();
  renderAll();
}

// ─── EDITING ENTRY POINTS ────────────────────────────────────────

function editESG(id) {
  window._tempModalData = null;
  editingObjId = id;
  const o = obESG.find(x => x.id === id);
  if (o) {
    modalTargetRows = JSON.parse(JSON.stringify(o.targets));
    window._tempModalData = {
      nome: o.nome, desc: o.desc, cat: o.cat, dept: o.dept,
      owner: o.owner, kpi: o.kpi, unita: o.unita, biz: [...o.biz]
    };
  }
  currentModalTab = 'esg';
  _renderUnifiedModal();
}

function editBiz(id) {
  editingObjId = id;
  currentModalTab = 'biz';
  _renderUnifiedModal();
}

// ─── COLLEGA PROGETTI MODAL ──────────────────────────────────────

function editProgetti(obId) {
  editingProjEsId = obId;
  const o = obESG.find(x => x.id === obId);
  if (!o) return;

  const html = `
    <div class="m-head">
      <div class="m-close" onclick="closeModal()">✕</div>
      <div class="m-title">🔗 Collega / Rimuovi Progetti</div>
      <div class="m-sub">Seleziona i progetti operativi per: <strong>${o.nome}</strong></div>
    </div>
    <div class="m-body" style="padding:24px 30px">
      <div class="sec-title" style="margin-bottom:16px">Seleziona i progetti attivi dal modulo Progetti</div>
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${progettiLiberi.map(p => `
          <label style="display:flex; align-items:center; gap:16px; background:#fff; border:1px solid var(--border); padding:14px; border-radius:var(--rs); cursor:pointer; transition:var(--t)" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='#fff'">
            <input type="checkbox" value="${p.id}" ${o.progetti.includes(p.id) ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--green);cursor:pointer">
            <div style="flex:1">
              <div style="font-size:14px; font-weight:700">${p.nome}</div>
              <div style="font-size:11px; color:var(--text-m); margin-top:2px">Avanzamento: ${p.pct}% · Aggiornato: ${formatDate(p.ult)}</div>
            </div>
          </label>
        `).join('')}
      </div>
    </div>
    <div class="m-foot">
      <button class="btn-ghost" onclick="closeModal()">Annulla</button>
      <button class="btn-primary" onclick="saveProgetti()">✓ Salva Modifiche</button>
    </div>
  `;
  openModal(html);
}

function saveProgetti() {
  const o = obESG.find(x => x.id === editingProjEsId);
  if (!o) return;
  o.progetti = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(el => el.value);
  o.ultimoAggiornamento = new Date().toISOString().slice(0, 10);
  closeModal();
  renderAll();
}
