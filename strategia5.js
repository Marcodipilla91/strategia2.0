const TODAY = new Date('2026-03-04');
const $ = id => document.getElementById(id);

// --- DATA ---
let bizObj = [
  { id: 'b1', nome: 'Crescita dei ricavi (Piano 2027)', icona: '📈' },
  { id: 'b2', nome: 'Accesso mercati Green EU', icona: '🌍' },
  { id: 'b3', nome: 'Riduzione costi operativi', icona: '⚙️' }
];

// Project Library (all available projects in Operia)
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
    progetti: ['p1', 'p2'] // array di ID progetto
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
let currentTab = 'esg'; // 'esg' or 'business'
let filters = { search: '', dept: '', status: '', dateStart: '', dateEnd: '' };
let editingObjId = null; // ID of the object currently being edited, null if creating
let editingProjEsId = null; // ID of the ESG obj when editing linked projects

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
  const p = Math.round((nt.attuale / nt.target) * 100);
  return Math.min(100, Math.max(0, p));
}

// --- INITIALIZE ---
window.onload = () => {
  initTabs();
  renderAll();

  $('btnNuovoESG').addEventListener('click', () => { window._tempModalData = null; editingObjId = null; openESGModal(); });
  $('btnNuovoBiz').addEventListener('click', () => { window._tempModalData = null; editingObjId = null; openBizModal(); });
  $('modalOverlay').addEventListener('click', e => { if (e.target.id === 'modalOverlay') closeModal(); });
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
    <div class="sum-card"><span class="sum-ico" style="color:#4CAF50">✅</span><div><div class="sum-num" style="color:#2E7D32">${sems.filter(x => x === 'verde').length}</div><div class="sum-lbl" style="color:#2E7D32">In piano</div></div></div>
    <div class="sum-card"><span class="sum-ico" style="color:#F59E0B">⚠️</span><div><div class="sum-num" style="color:#92400E">${sems.filter(x => x === 'giallo').length}</div><div class="sum-lbl" style="color:#92400E">Attenzione</div></div></div>
    <div class="sum-card"><span class="sum-ico" style="color:#EF4444">🔴</span><div><div class="sum-num" style="color:#991B1B">${sems.filter(x => x === 'rosso').length}</div><div class="sum-lbl" style="color:#991B1B">A rischio</div></div></div>
  `;

  if (currentTab === 'esg') renderESGTab();
  else renderBizTab();
}

function renderESGTab() {
  $('listHeader').innerHTML = `
    <div class="lh-col col-esg">Obiettivo ESG</div><div class="lh-col col-dept">Funzione Az.</div>
    <div class="lh-col col-own">Owner</div><div class="lh-col col-tgt">Prospettiva KPI</div>
    <div class="lh-col col-scad">Prox. Scadenza</div><div class="lh-col col-sem">Stato</div>
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
    const semColor = sem === 'verde' ? 'In piano' : sem === 'giallo' ? 'Attenzione' : 'A rischio';
    const nt = getNearestTarget(o);
    const prog = calcGlobalProgress(o);
    const isExp = nt && new Date(nt.date) < TODAY;
    const expOpen = expanded[o.id] ? 'open' : '';

    const projs = o.progetti.map(pid => progettiLiberi.find(pl => pl.id === pid)).filter(Boolean);

    return `
      <div class="obj-row-wrap">
        <div class="obj-row ${expOpen}" onclick="toggleExpand('${o.id}')">
          <div class="row-cell col-esg"><div class="or-name"><span class="cat-badge cat-${o.cat}">${o.cat}</span> ${o.nome}</div><div class="or-desc">${o.desc}</div></div>
          <div class="row-cell col-dept"><span class="dept-tag">${o.dept || '—'}</span></div>
          <div class="row-cell col-own"><div class="owner-wrap"><div class="owner-av" style="background:#555">${ownerInitials(o.owner)}</div><span class="owner-name">${o.owner.split(' ')[0]}</span></div></div>
          <div class="row-cell col-tgt" style="padding-right:20px">
             <div class="prog-val">${nt ? nt.attuale + ' / ' + nt.target + ' ' + o.unita : '—'}</div>
             <div class="prog-track"><div class="prog-fill" style="width:${prog}%; background:${pc(prog)}"></div></div>
          </div>
          <div class="row-cell col-scad"><div class="date-txt ${isExp ? 'expired' : ''}">${nt ? formatDate(nt.date) : '—'}</div><div class="date-sub">${o.targets.length > 1 ? `+${o.targets.length - 1} scadenze` : ''}</div></div>
          <div class="row-cell col-sem"><span class="sem-tag sem-${sem}"><div class="sem-dot sd-${sem}"></div>${semColor}</span></div>
          <div class="chevron ${expOpen}">∨</div>
        </div>
        
        <div class="obj-expanded ${expOpen}" id="exp-${o.id}">
           <div class="exp-grid">
             <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
                   <div class="sec-title" style="margin:0">Cronoprogramma & Target (${o.kpi})</div>
                   <button class="btn-ghost" style="padding:4px 10px; font-size:11px" onclick="editESG('${o.id}')">✎ Modifica Obiettivo e Target</button>
                </div>
                <div class="target-board">
                  <div class="tb-row tb-head"><div class="tb-date">SCADENZA</div><div class="tb-val">ATTUALE / TARGET</div><div class="tb-status">STATO TARGET</div></div>
                  ${o.targets.sort((a, b) => new Date(a.date) - new Date(b.date)).map(t => {
      const tExp = new Date(t.date) < TODAY;
      const done = t.attuale >= t.target;
      const st = done ? '<span style="color:#4CAF50">Raggiunto ✓</span>' : tExp ? '<span style="color:#EF4444">Scaduto ⚠</span>' : '<span style="color:#F59E0B">In corso</span>';
      return `<div class="tb-row"><div class="tb-date ${tExp && !done ? 'expired' : ''}">${formatDate(t.date)}</div><div class="tb-val">${t.attuale} / <span style="color:#2E7D32">${t.target} ${o.unita}</span></div><div class="tb-status">${st}</div></div>`;
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
                   <button class="btn-ghost" style="padding:4px 10px; font-size:11px" onclick="editProgetti('${o.id}')">🔗 Collega / Rimuovi progetti</button>
                </div>
                ${projs.map(p => `
                  <div class="proj-row">
                    <div class="p-dot sd-${p.sem}"></div>
                    <div class="p-name">${p.nome} <br><span class="date-sub">Aggiornato: ${formatDate(p.ult)}</span></div>
                    <div class="p-bar"><div class="prog-track"><div class="prog-fill" style="width:${p.pct}%;background:${pc(p.pct)}"></div></div></div>
                    <div style="font-size:12px; font-weight:700">${p.pct}%</div>
                  </div>
                `).join('') || '<div class="date-sub">Nessun progetto collegato. Clicca il tasto sopra per associare i progetti esistenti in Operia.</div>'}
             </div>
           </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderBizTab() {
  $('listHeader').innerHTML = `
    <div class="lh-col col-biz">Obiettivo di Business</div>
    <div class="lh-col col-bdesc">Motore ESG collegato</div>
    <div class="lh-col col-tgt">Progetti sottostanti</div>
  `;

  if (!bizObj.length) {
    $('mainList').innerHTML = `<div class="empty-state">Nessun obiettivo di business.</div>`;
    return;
  }

  $('mainList').innerHTML = bizObj.map(b => {
    const linkedESG = obESG.filter(o => o.biz.includes(b.id));
    const totalProj = linkedESG.reduce((acc, o) => acc + o.progetti.length, 0);
    const expOpen = expanded[b.id] ? 'open' : '';

    return `
      <div class="obj-row-wrap">
        <div class="obj-row ${expOpen}" onclick="toggleExpand('${b.id}')">
           <div class="row-cell col-biz" style="flex-direction:row; justify-content:flex-start; align-items:center;">
              <div class="biz-icon-box">${b.icona}</div>
              <div class="or-name" style="margin:0">${b.nome}</div>
           </div>
           <div class="row-cell col-bdesc"><span class="date-txt">${linkedESG.length} Obiettivi ESG collegati</span></div>
           <div class="row-cell col-tgt"><span class="date-txt" style="color:var(--text-m)">${totalProj} progetti operativi</span></div>
           <div class="chevron ${expOpen}">∨</div>
        </div>

        <div class="obj-expanded ${expOpen}" id="exp-${b.id}">
           <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
             <div class="sec-title" style="margin:0">Cascata Strategica</div>
             <button class="btn-ghost" style="padding:4px 10px; font-size:11px" onclick="editBiz('${b.id}')">✎ Modifica Obiettivo Business</button>
           </div>
           ${linkedESG.length ? linkedESG.map(o => {
      const nt = getNearestTarget(o);
      const projs = o.progetti.map(pid => progettiLiberi.find(pl => pl.id === pid)).filter(Boolean);
      return `
                <div style="margin-bottom:16px; background:#fff; border:1px solid var(--border); border-radius:var(--rs); padding:16px;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
                     <strong style="font-size:13px"><span class="cat-badge cat-${o.cat}">${o.cat}</span> ${o.nome}</strong>
                     <span class="dept-tag">${nt ? nt.attuale + '/' + nt.target + ' ' + o.unita : ''}</span>
                  </div>
                  <div style="padding-left:34px">
                    ${projs.map(p => `
                      <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px">
                        <span style="font-size:14px;color:#cbd5e1">↳</span>
                        <div class="p-dot sd-${p.sem}" style="width:6px; height:6px; margin:0"></div>
                        <span style="font-size:12px; color:var(--text-m); flex:1">${p.nome}</span>
                        <strong style="font-size:11px">${p.pct}%</strong>
                      </div>
                    `).join('')}
                    ${projs.length === 0 ? '<span style="font-size:11px;color:#aaa">↳ Nessun progetto collegato</span>' : ''}
                  </div>
                </div>
              `;
    }).join('') : '<div class="date-sub">Nessun obiettivo ESG collegato a questo obiettivo di business.</div>'}
        </div>
      </div>
    `;
  }).join('');
}

function toggleExpand(id) {
  if (!event.target.closest('button')) {
    expanded[id] = !expanded[id];
    renderAll();
  }
}

// --- MODALS ---
function openModal(html) {
  $('modalBox').innerHTML = html;
  $('modalOverlay').classList.add('open');
}
function closeModal() {
  $('modalOverlay').classList.remove('open');
}

// --- BIZ MODAL ---
function openBizModal() {
  let initial = { nome: '', icona: '📈' };
  if (editingObjId) {
    const ex = bizObj.find(x => x.id === editingObjId);
    if (ex) initial = ex;
  }

  const html = `
    <div class="m-head">\
      <div class="m-close" onclick="closeModal()">✕</div>\
      <div class="m-title">${editingObjId ? 'Modifica' : 'Nuovo'} Obiettivo di Business</div>\
      <div class="m-sub">Obiettivo strategico aziendale a cui ancorare le iniziative ESG.</div>\
    </div>\
    <div class="m-body">\
      <div class="fg">\
        <label class="fl">Nome Obiettivo *</label>\
        <input class="fi" id="newBizName" value="${initial.nome}" placeholder="Es. Riduzione dei costi OPEX">\
      </div>\
      <div class="fg">\
        <label class="fl">Icona</label>\
        <select class="fi" id="newBizIcon">\
          <option value="📈" ${initial.icona === '📈' ? 'selected' : ''}>📈 Crescita</option>\
          <option value="🌍" ${initial.icona === '🌍' ? 'selected' : ''}>🌍 Mercati / Internazionale</option>\
          <option value="⚙️" ${initial.icona === '⚙️' ? 'selected' : ''}>⚙️ Efficienza / Costi</option>\
          <option value="💳" ${initial.icona === '💳' ? 'selected' : ''}>💳 Finanza</option>\
          <option value="🛡️" ${initial.icona === '🛡️' ? 'selected' : ''}>🛡️ Rischi</option>\
          <option value="🎯" ${initial.icona === '🎯' ? 'selected' : ''}>🎯 Strategia generica</option>\
        </select>\
      </div>\
    </div>\
    <div class="m-foot">\
      <button class="btn-ghost" onclick="closeModal()">Annulla</button>\
      <button class="btn-primary" onclick="saveBiz()">✓ Salva Obiettivo</button>\
    </div>\
  `;
  openModal(html);
}

function editBiz(id) {
  editingObjId = id;
  openBizModal();
}

function saveBiz() {
  const nome = $('newBizName').value;
  if (!nome) return;
  const icona = $('newBizIcon').value;

  if (editingObjId) {
    const ex = bizObj.find(x => x.id === editingObjId);
    ex.nome = nome; ex.icona = icona;
  } else {
    bizObj.push({ id: 'b' + Date.now(), nome, icona });
  }
  closeModal();
  renderAll();
}

// --- COLLEGAMENTO PROGETTI MODAL ---
function editProgetti(obId) {
  editingProjEsId = obId;
  const o = obESG.find(x => x.id === obId);
  if (!o) return;

  const html = `
    <div class="m-head">\
      <div class="m-close" onclick="closeModal()">✕</div>\
      <div class="m-title">🔗 Collega / Rimuovi Progetti</div>\
      <div class="m-sub">Seleziona i progetti operativi per: <strong>${o.nome}</strong></div>\
    </div>\
    <div class="m-body" style="padding:24px 30px">\
      <div class="sec-title" style="margin-bottom:16px">Seleziona i progetti attivi dal modulo Progetti</div>\
      <div style="display:flex; flex-direction:column; gap:8px;">\
        ${progettiLiberi.map(p => `
          <label style="display:flex; align-items:center; gap:16px; background:#fff; border:1px solid var(--border); padding:14px; border-radius:var(--rs); cursor:pointer; transition:var(--t)" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='#fff'">
             <input type="checkbox" value="${p.id}" ${o.progetti.includes(p.id) ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--green);cursor:pointer">\
             <div style="flex:1">\
               <div style="font-size:14px; font-weight:700">${p.nome}</div>\
               <div style="font-size:11px; color:var(--text-m); margin-top:2px">Avanzamento: ${p.pct}% · Aggiornato: ${formatDate(p.ult)}</div>\
             </div>\
             <div class="sd-${p.sem}" style="width:10px;height:10px;border-radius:50%"></div>\
          </label>
        `).join('')}\
      </div>\
    </div>\
    <div class="m-foot">\
      <button class="btn-ghost" onclick="closeModal()">Annulla</button>\
      <button class="btn-primary" onclick="saveProgetti()">✓ Salva Modifiche</button>\
    </div>\
  `;
  openModal(html);
}

function saveProgetti() {
  const o = obESG.find(x => x.id === editingProjEsId);
  if (!o) return;
  const selected = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(el => el.value);
  o.progetti = selected;
  o.ultimoAggiornamento = new Date().toISOString().slice(0, 10);
  closeModal();
  renderAll();
}

// --- ESG MODAL ---
let modalTargetRows = [];
function openESGModal() {
  let initial = { nome: '', desc: '', cat: 'E', dept: 'HR', owner: '', kpi: '', unita: '%', biz: [] };
  if (editingObjId) {
    const o = obESG.find(x => x.id === editingObjId);
    if (window._tempModalData) { // recovering from an add/delete row render 
      initial = window._tempModalData;
    } else if (o) {
      initial = {
        nome: o.nome, desc: o.desc, cat: o.cat, dept: o.dept, owner: o.owner,
        kpi: o.kpi, unita: o.unita, biz: o.biz
      };
      modalTargetRows = JSON.parse(JSON.stringify(o.targets));
    }
  } else {
    if (window._tempModalData) initial = window._tempModalData;
    else modalTargetRows = [{ id: Date.now().toString(), date: '', target: '', attuale: '0' }];
  }

  window._tempModalData = initial;
  renderESGModalContent();
}

function editESG(id) {
  window._tempModalData = null;
  editingObjId = id;
  openESGModal();
}

function renderESGModalContent() {
  const d = window._tempModalData;
  const isEdit = !!editingObjId;

  const html = `
    <div class="m-head">\
      <div class="m-close" onclick="closeModal()">✕</div>\
      <div class="m-title">${isEdit ? 'Modifica' : 'Nuovo'} Obiettivo ESG</div>\
      <div class="m-sub">Definisci l'obiettivo, l'owner e applica scadenze modulari.</div>\
    </div>\
    <div class="m-body" style="padding:24px 30px">\
      <div class="fg">\
        <label class="fl">Nome Obiettivo *</label>\
        <input class="fi" id="m_nome" value="${d.nome}" placeholder="Es. Formazione diversità e inclusione">\
      </div>\
      <div class="fg">\
        <label class="fl">Descrizione</label>\
        <textarea class="fi" id="m_desc" rows="2" placeholder="Breve strategia di progetto...">${d.desc}</textarea>\
      </div>\
      <div class="fg2">\
        <div class="fg">\
          <label class="fl">Area ESG *</label>\
          <select class="fi" id="m_cat">\
            <option value="E" ${d.cat === 'E' ? 'selected' : ''}>Environmental (E)</option>\
            <option value="S" ${d.cat === 'S' ? 'selected' : ''}>Social (S)</option>\
            <option value="G" ${d.cat === 'G' ? 'selected' : ''}>Governance (G)</option>\
          </select>\
        </div>\
        <div class="fg">\
          <label class="fl">Funzione Aziendale (Target)</label>\
          <select class="fi" id="m_dept">\
            <option value="HR" ${d.dept === 'HR' ? 'selected' : ''}>HR & Organization</option>\
            <option value="Finance" ${d.dept === 'Finance' ? 'selected' : ''}>Finance & Administration</option>\
            <option value="Operations" ${d.dept === 'Operations' ? 'selected' : ''}>Operations & Production</option>\
            <option value="Sales" ${d.dept === 'Sales' ? 'selected' : ''}>Sales & Marketing</option>\
            <option value="R&D" ${d.dept === 'R&D' ? 'selected' : ''}>R&D / Innovation</option>\
            <option value="Procurement" ${d.dept === 'Procurement' ? 'selected' : ''}>Procurement / Supply Chain</option>\
            <option value="IT" ${d.dept === 'IT' ? 'selected' : ''}>IT & Digital</option>\
            <option value="Legal" ${d.dept === 'Legal' ? 'selected' : ''}>Legal & Compliance</option>\
          </select>\
        </div>\
      </div>\
      <div class="fg2">\
        <div class="fg">\
          <label class="fl">Owner (Nome)</label>\
          <input class="fi" id="m_owner" value="${d.owner}" placeholder="Es. Giulia Verdi">\
        </div>\
        <div class="fg">\
          <label class="fl">Collega a Business</label>\
          <select class="fi" id="m_biz" multiple style="height:auto">\
            ${bizObj.map(b => `<option value="${b.id}" ${d.biz.includes(b.id) ? 'selected' : ''}>${b.icona} ${b.nome}</option>`).join('')}\
          </select>\
          <div style="font-size:10px; color:var(--text-l); margin-top:4px">Tieni premuto CTRL/CMD per selezione multipla</div>\
        </div>\
      </div>\
      \
      <div style="background:#f4f6f8; border-radius:12px; padding:18px; border:1px solid #e2e8f0; margin-top:4px;">\
        <div class="fg2" style="margin-bottom:12px;">\
          <div class="fg" style="margin:0"><label class="fl">Nome KPI *</label><input class="fi" id="m_kpi" value="${d.kpi}" placeholder="Es. N. dipendenti formati"></div>\
          <div class="fg" style="margin:0"><label class="fl">Unità di Misura</label>\
            <select class="fi" id="m_unita">\
              <option value="%" ${d.unita === '%' ? 'selected' : ''}>% (Percentuale)</option>\
              <option value="n." ${d.unita === 'n.' ? 'selected' : ''}>n. (Numero assoluto)</option>\
              <option value="ton" ${d.unita === 'ton' ? 'selected' : ''}>ton (Tonnellate)</option>\
              <option value="K€" ${d.unita === 'K€' ? 'selected' : ''}>K€ (Migliaia di Euro)</option>\
            </select>\
          </div>\
        </div>\
        \
        <label class="fl" style="margin-top:20px; margin-bottom:10px">Cronologia Scadenze e Target</label>\
        <div class="target-list-wrap" id="modalTargetContainer">\
          ${modalTargetRows.map(tr => `
            <div class="target-item-row">
              <input type="date" class="fi" value="${tr.date}" onchange="updateMTarget('${tr.id}', 'date', this.value)" style="width:140px">
              <input type="number" class="fi" placeholder="Target KPI" value="${tr.target}" onchange="updateMTarget('${tr.id}', 'target', this.value)">
              <input type="number" class="fi" placeholder="Valore Attuale" value="${tr.attuale}" onchange="updateMTarget('${tr.id}', 'attuale', this.value)">
              ${modalTargetRows.length > 1 ? `<button class="btn-del" onclick="delMTarget('${tr.id}')">✕</button>` : '<div style="width:26px"></div>'}
            </div>
          `).join('')}
          <div class="btn-add-target" onclick="addMTarget()">+ Aggiungi Nuovo Traguardo Intermedio</div>\
        </div>\
      </div>\
    </div>\
    <div class="m-foot">\
      <button class="btn-ghost" onclick="closeModal()">Annulla</button>\
      <button class="btn-primary" onclick="saveESG()">✓ Salva Obiettivo ESG</button>\
    </div>\
  `;
  openModal(html);
}

function updateMTarget(id, field, value) {
  const row = modalTargetRows.find(x => x.id == id);
  if (row) row[field] = value;
}
function syncModalDOMToState() {
  if ($('m_nome')) {
    window._tempModalData = {
      nome: $('m_nome').value, desc: $('m_desc').value, cat: $('m_cat').value, dept: $('m_dept').value,
      owner: $('m_owner').value,
      biz: Array.from($('m_biz').selectedOptions).map(opt => opt.value),
      kpi: $('m_kpi').value, unita: $('m_unita').value
    };
  }
}
function addMTarget() {
  syncModalDOMToState();
  modalTargetRows.push({ id: Date.now().toString(), date: '', target: '', attuale: '0' });
  renderESGModalContent();
}
function delMTarget(id) {
  syncModalDOMToState();
  modalTargetRows = modalTargetRows.filter(x => x.id != id);
  renderESGModalContent();
}

function saveESG() {
  const nome = $('m_nome').value;
  if (!nome) return;

  const validateTargets = modalTargetRows.filter(t => t.date && t.target !== '');
  const tgs = validateTargets.map(t => ({
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
    o.targets = tgs; o.biz = selBiz; o.ultimoAggiornamento = new Date().toISOString().slice(0, 10);
  } else {
    obESG.push({
      id: 'ob' + Date.now(),
      nome, desc: $('m_desc').value, cat: $('m_cat').value, dept: $('m_dept').value,
      owner: $('m_owner').value || 'Unassigned', kpi: $('m_kpi').value, unita: $('m_unita').value,
      ultimoAggiornamento: new Date().toISOString().slice(0, 10), targets: tgs, biz: selBiz, progetti: []
    });
  }

  window._tempModalData = null;
  editingObjId = null;
  closeModal();
  renderAll();
}
