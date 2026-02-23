// ── POM State Management ──────────────────────────────────────────────────────

const PROJECTS_KEY = 'pom_projects';
const CURRENT_KEY  = 'pom_current_id';
const DRAFT_KEY    = 'pom_draft';

function getAllProjects() {
  return JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]');
}

function getCurrentProject() {
  const id = localStorage.getItem(CURRENT_KEY);
  if (!id) return null;
  let project = getAllProjects().find(p => p.id === id) || null;
  // Migrate old single-pve format → pveVarianten array
  if (project && project.pve && !project.pveVarianten) {
    const migratedVariant = { id: crypto.randomUUID(), naam: 'PVE variant 1', ...project.pve };
    project = { ...project, pveVarianten: [migratedVariant], activePveId: migratedVariant.id };
    delete project.pve;
    saveProject(project);
  }
  return project;
}

function saveProject(project) {
  const projects = getAllProjects();
  const idx = projects.findIndex(p => p.id === project.id);
  if (idx >= 0) projects[idx] = project;
  else projects.push(project);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

function setCurrentId(id) {
  localStorage.setItem(CURRENT_KEY, id);
}

function updateCurrentProject(updates) {
  const project = getCurrentProject();
  if (!project) return;
  const updated = deepMerge(project, updates);
  saveProject(updated);
  return updated;
}

function getDraft() {
  return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
}

function setDraft(data) {
  const existing = getDraft();
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...existing, ...data }));
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

function createProjectFromDraft() {
  const draft = getDraft();
  const project = {
    id: crypto.randomUUID(),
    naam: draft.naam || 'Naamloos project',
    huidigeStap: draft.huidigeStap || 'Definitie fase',
    rol: draft.rol || '',
    ervaring: draft.ervaring || '',
    gebruiksduur: draft.gebruiksduur || 40,
    stakeholders: draft.stakeholders || [],
    rolToewijzingen: draft.rolToewijzingen || {},
    sliders: draft.sliders || defaultSliders(),
    pveVarianten: [],
    activePveId: null,
    gebiedVarianten: [],
    gebouwVarianten: [],
    createdAt: Date.now()
  };
  saveProject(project);
  setCurrentId(project.id);
  clearDraft();
  return project;
}

// ── PVE Variant Helpers ───────────────────────────────────────────────────────

function getActivePveVariant() {
  const p = getCurrentProject();
  if (!p || !p.pveVarianten || !p.pveVarianten.length) return null;
  return (p.activePveId && p.pveVarianten.find(v => v.id === p.activePveId))
    || p.pveVarianten[0];
}

function setActivePveId(id) {
  const p = getCurrentProject();
  if (!p) return;
  saveProject({ ...p, activePveId: id });
}

function updateActivePveVariant(updates) {
  const p = getCurrentProject();
  if (!p || !p.activePveId) return;
  const pveVarianten = (p.pveVarianten || []).map(v =>
    v.id === p.activePveId ? deepMerge(v, updates) : v
  );
  saveProject({ ...p, pveVarianten });
}

// Update a specific PVE variant by id (for pve-instellingen.html)
function updatePveVariantById(id, updates) {
  const p = getCurrentProject();
  if (!p) return;
  const pveVarianten = (p.pveVarianten || []).map(v =>
    v.id === id ? { ...deepMerge(v, updates) } : v
  );
  saveProject({ ...p, pveVarianten });
}

function createNewPveVariant() {
  const p = getCurrentProject();
  if (!p) return null;
  const naam = 'PVE variant ' + ((p.pveVarianten || []).length + 1);
  const variant = { id: crypto.randomUUID(), naam, ...defaultPve() };
  const pveVarianten = [...(p.pveVarianten || []), variant];
  saveProject({ ...p, pveVarianten, activePveId: variant.id });
  return variant;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

function defaultSliders() {
  return {
    betereSchool: 3, functioneleSchool: 3, aantrekkelijkeSchool: 3,
    inclusieveSchool: 3, gezondSchool: 3, duurzameSchool: 3,
    veiligSchool: 3, digitaleSchool: 3, onderhoudsvriendelijkeSchool: 3
  };
}

function defaultPve() {
  return {
    voorzieningen: {
      primairOnderwijs: {
        actief: false, leerlingen: 400,
        bvoHandmatig: null, kleuterpleinHandmatig: null,
        kinderpleinHandmatig: null, fietsenstallingHandmatig: null
      },
      voorschoolseOpvang: {
        actief: false, groepen: 2,
        bvoHandmatig: null, pleinHandmatig: null, fietsenstallingHandmatig: null
      },
      sport: { actief: false, type: 'gymzaal', bvoHandmatig: null }
    },
    ambities: {
      gezondSchool: { geluid: 'B', temperatuur: 'B', licht: 'B', lucht: 'B', kwaliteitsborging: 'B', comfortNietOnderwijs: 'B' },
      duurzameSchool: { energiegebruik: 'Beter', materiaalgebruik: 'Beter', watergebruik: 'Beter', natuurInclusiviteit: 'Beter', klimaatAdaptie: 'Beter' },
      adaptieveSchool: { adaptievePlattegrond: 'Beter', adaptieveTechniek: 'Beter' },
      veiligSchool: { bouwkundigInbraak: 'Beter', technischInbraak: 'Beter', bouwkundigVandalisme: 'Beter', technischVandalisme: 'Beter' },
      digitaleSchool: { technischeIntegratie: 'Beter' }
    },
    ruimtestaat: null,
    planning: {}
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// Which nav panel item should be highlighted as "next step"
function getNavHighlight(project) {
  if (!project) return 'pve';
  if (!project.pveVarianten || project.pveVarianten.length === 0) return 'pve';
  if (project.gebiedVarianten.length === 0) return 'gebied';
  if (project.gebouwVarianten.length === 0) return 'gebouw';
  return 'besluit';
}

// ── UI Builders ───────────────────────────────────────────────────────────────

function renderNavPanel(activePage, project) {
  const highlight = getNavHighlight(project);

  const link = (key, label, href) => {
    const isActive    = activePage === key;
    const isHighlight = !isActive && highlight === key;
    let cls = 'nav-btn ';
    if (isActive)         cls += 'active';
    else if (isHighlight) cls += 'next';
    else                  cls += 'inactive';
    return `<a href="${href}" class="${cls}">${label}</a>`;
  };

  return `
    <nav class="nav-panel">
      ${link('pve',    'PVE',    'pve-stap-1.html')}
      ${link('gebied', 'Gebied', 'gebied.html')}
      ${link('gebouw', 'Gebouw', 'gebouw.html')}
      ${link('besluit','Besluit','besluit.html')}
    </nav>`;
}

function renderStepIndicator(activeStep, totalSteps, urls) {
  totalSteps = totalSteps || 5;
  const steps = Array.from({ length: totalSteps }, (_, i) => 'Stap ' + (i + 1));
  return `
    <div class="step-indicator">
      ${steps.map((s, i) => {
        const n = i + 1;
        const isDone    = n < activeStep;
        const isCurrent = n === activeStep;
        const cls = 'step-item' + (isCurrent ? ' active' : isDone ? ' done' : '');
        const arrow = i < steps.length - 1
          ? `<span class="step-arrow">→</span>`
          : '';
        const url = urls && urls[i];
        if (isDone && url) {
          return `<a href="${url}" class="${cls}">${s}</a>${arrow}`;
        }
        return `<span class="${cls}">${s}</span>${arrow}`;
      }).join('')}
    </div>`;
}

// ── Gebied Variant Helpers ────────────────────────────────────────────────────

function defaultGebied() {
  return {
    stedenbouwbeleid: { mode: 'simpel', goedgekeurd: false },
    bouwbaarGebied:   { geo: [], opp: 0 },
    uitsluiting:      { geo: [], opp: 0 },
    parkeren:         { geo: [], opp: 0 },
    onderbouwplein:   { geo: [], opp: 0 },
    bovenbouwPlein:   { geo: [], opp: 0 },
    fietsenstalling:  { geo: [], opp: 0 },
    bomen:            { aantal: 0 }
  };
}

function createNewGebiedVariant(naam) {
  const p = getCurrentProject();
  if (!p) return null;
  naam = naam || ('Locatie ' + ((p.gebiedVarianten || []).length + 1));
  const variant = { id: crypto.randomUUID(), naam, opp: 0, geo: [], ...defaultGebied() };
  const gebiedVarianten = [...(p.gebiedVarianten || []), variant];
  saveProject({ ...p, gebiedVarianten });
  return variant;
}

function updateGebiedVariantById(id, updates) {
  const p = getCurrentProject();
  if (!p) return;
  const gebiedVarianten = (p.gebiedVarianten || []).map(g =>
    g.id === id ? { ...deepMerge(g, updates) } : g
  );
  saveProject({ ...p, gebiedVarianten });
}

// ── Gebouw Variant Helpers ────────────────────────────────────────────────────

function defaultGebouw() {
  return {
    pveId: null, gebiedId: null, geselecteerdeOptie: null,
    kwaliteitsBeoordeling: {
      locatie:               { verkeer: 2, parkeren: 2, fietsenstalling: 2, buitenruimte: 2, beschrijving: '' },
      kenmerkenSchool:       { structuur: 2, aanvullendeFuncties: 2, combinatieFuncties: 2, beschrijving: '' },
      uitstraling:           { interieur: 2, exterieur: 2, beschrijving: '' },
      huisvestingConcept:    { algemeen: 2, ruimtelijkeIndeling: 2, logistiek: 2, gemeenschappelijkeRuimtes: 2, typologieLokalen: 2, beschrijving: '' },
      vandalismeBestendig:   { overzichtEnControle: 2, beschrijving: '' },
      gebruiksvriendelijkheid: { hoogteverschillen: 2, socialeVeiligheid: 2, beschrijving: '' }
    }
  };
}

function createNewGebouwVariant(naam, pveId, gebiedId) {
  const p = getCurrentProject();
  if (!p) return null;
  naam = naam || ('Gebouw variant ' + ((p.gebouwVarianten || []).length + 1));
  const variant = { id: crypto.randomUUID(), naam, ...defaultGebouw(), pveId, gebiedId };
  const gebouwVarianten = [...(p.gebouwVarianten || []), variant];
  saveProject({ ...p, gebouwVarianten });
  return variant;
}

function updateGebouwVariantById(id, updates) {
  const p = getCurrentProject();
  if (!p) return;
  const gebouwVarianten = (p.gebouwVarianten || []).map(g =>
    g.id === id ? { ...deepMerge(g, updates) } : g
  );
  saveProject({ ...p, gebouwVarianten });
}

function renderDashboard(project) {
  if (!project || !project.pveVarianten || !project.pveVarianten.length) return '';
  const activeVariant = (project.activePveId && project.pveVarianten.find(v => v.id === project.activePveId))
    || project.pveVarianten[0];
  if (!activeVariant) return '';

  const { bouwkosten, tco, totalBVO } = window.POM_CALC
    ? window.POM_CALC.calcDashboard(activeVariant.voorzieningen)
    : { bouwkosten: 0, tco: 0, totalBVO: 0 };

  const fmt = n => '€\u202F' + n.toLocaleString('nl-NL');
  const pct = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0;

  // placeholder % relative to a budget of 10 000 000
  const budget = 10_000_000;
  const bPct = Math.min(pct(bouwkosten, budget), 100);
  const tPct = Math.min(pct(tco, budget * 2), 100);

  const badge = (color, val) =>
    `<span style="background:${color};color:white;border-radius:99px;padding:0.1rem 0.45rem;font-size:0.7rem">${val}</span>`;

  return `
    <div class="dashboard-pill">
      <span style="color:#6B7280;font-weight:500">Bouwkosten:</span>
      ${badge('#7C3AED', bPct + '%')}
      <span style="color:#374151;font-weight:600">${fmt(bouwkosten)}</span>
    </div>
    <div class="dashboard-pill">
      <span style="color:#6B7280;font-weight:500">TCO:</span>
      ${badge('#34D399', tPct + '%')}
      <span style="color:#374151;font-weight:600">${fmt(tco)}</span>
    </div>`;
}
