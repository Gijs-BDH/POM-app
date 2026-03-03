/* ── POM Dashboard Detail Popup ───────────────────────────────────────────────
   Unified kostenraming popup for bouwkosten & TCO pills.
   Table visibility adapts to the current page.
──────────────────────────────────────────────────────────────────────────── */

// ── Page / visibility config ────────────────────────────────────────────────

const _STAP124 = new Set([
  'pve-stap-1-invoer.html', 'pve-stap-1b-gebruiksduur.html',
  'pve-stap-2-voorzieningen.html',
  'pve-stap-4b-ruimtestaat.html', 'pve-stap-4c-vlekkenplan.html',
]);
const _GEBOUW = new Set([
  'gebouw-stap-2-opties.html', 'project-overzicht.html', 'besluit.html',
]);

function _getVis() {
  const p = window.location.pathname.split('/').pop();
  return { ambitie: !_STAP124.has(p), vormfactor: _GEBOUW.has(p) };
}

// ── Overlay helper ───────────────────────────────────────────────────────────

function _showOverlay(title, content) {
  let ov = document.getElementById('dd-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'dd-overlay';
    ov.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);' +
      'display:flex;align-items:center;justify-content:center;z-index:999';
    ov.innerHTML = `
      <div class="card" style="width:540px;max-width:94vw;padding:1.5rem;max-height:86vh;overflow-y:auto">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
          <h3 id="dd-title" style="font-size:1rem;font-weight:600;color:#374151;margin:0"></h3>
          <button onclick="closeDashboardDetail()"
            style="color:#9CA3AF;font-size:1.5rem;line-height:1;background:none;border:none;cursor:pointer;padding:0;flex-shrink:0">&times;</button>
        </div>
        <div id="dd-content"></div>
      </div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) closeDashboardDetail(); });
  }
  document.getElementById('dd-title').textContent = title;
  document.getElementById('dd-content').innerHTML  = content;
  ov.style.display = 'flex';
}

// ── Public entry points ──────────────────────────────────────────────────────

// Called from state.js renderDashboard pills and pve-instellingen.html.
// data (optional): { totalBVO, bouwkosten, tco, tcoModel, gebruiksduur }
function showDashboardDetail(_type, data) {
  let tcoModel, gebruiksduur;
  if (data) {
    ({ tcoModel, gebruiksduur } = data);
  } else {
    const project = getCurrentProject();
    const pveV    = getActivePveVariant();
    if (!project || !pveV) return;
    gebruiksduur = project.gebruiksduur;
    ({ tcoModel } = POM_CALC.calcDashboard(pveV.voorzieningen, gebruiksduur, pveV.ambities));
  }
  const jaren = gebruiksduur || 40;
  // Fallback: BVO=0 means no active voorzieningen; use reference building so tables always render
  let isRef = false;
  if (!tcoModel && window.POM_TCO) {
    const pveV = getActivePveVariant();
    tcoModel = POM_TCO.calc(POM_TCO.REF.klein.bvo, jaren, pveV?.ambities || null);
    isRef = true;
  }
  _showOverlay('Kostenraming', _renderUnified(tcoModel, _getVis(), jaren, isRef));
}

// Called from gebouw-stap-2, project-overzicht, besluit card pills.
function showGebouwOptieDetail(_type, optieId, gebruiksduur) {
  const optie = window.getGebouwOptie && window.getGebouwOptie(optieId);
  if (!optie) return;
  const jaren = parseInt(gebruiksduur) || 40;

  // Resolve linked PVE ambities (first gebouw variant that has this optie selected)
  let ambities = null;
  const project = getCurrentProject();
  if (project) {
    const gv  = (project.gebouwVarianten || []).find(v => v.geselecteerdeOptie === optieId);
    const pve = gv && (project.pveVarianten || []).find(p => p.id === gv.pveId);
    ambities = pve?.ambities || null;
  }

  const tcoModel = window.POM_TCO ? POM_TCO.calc(optie.bvo, jaren, ambities) : null;
  _showOverlay('Kostenraming – ' + optie.naam, _renderUnified(tcoModel, _getVis(), jaren));
}

function closeDashboardDetail() {
  const ov = document.getElementById('dd-overlay');
  if (ov) ov.style.display = 'none';
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDashboardDetail(); });

// ── Section header helper ────────────────────────────────────────────────────

function _hdr(label, color) {
  return `<div style="font-size:0.68rem;font-weight:700;color:${color};text-transform:uppercase;` +
    `letter-spacing:0.07em;margin:1rem 0 0.25rem;padding-bottom:0.2rem;` +
    `border-bottom:2px solid ${color}44">${label}</div>`;
}

// ── Unified renderer ─────────────────────────────────────────────────────────

function _renderUnified(tcoModel, vis, jaren, isRef) {
  jaren = jaren || 40;
  const fmtEur = n => '€\u202F' + Math.round(n).toLocaleString('nl-NL');
  const fmtM2  = n => n.toLocaleString('nl-NL') + '\u202Fm²';

  if (!tcoModel) {
    return `<p style="color:#9CA3AF;font-size:0.8rem;text-align:center;padding:1rem 0">Geen berekening beschikbaar.</p>`;
  }

  const refNote = isRef ? `
    <div style="background:#FEF3C7;border:1px solid #FCD34D;border-radius:0.6rem;padding:0.5rem 0.75rem;margin-bottom:0.75rem;font-size:0.75rem;color:#92400E">
      Referentieraming op basis van een gebouw van ${fmtM2(tcoModel.bvo)} BVO.
      Activeer voorzieningen in stap 1 voor een projectspecifieke berekening.
    </div>` : '';

  const m     = tcoModel;
  const perM2 = n => Math.round(n / m.bvo);

  // ── Row builders ────────────────────────────────────────────────────────────

  function capexRow(label, val, color) {
    color = color || '#7C3AED';
    return `
      <tr style="border-top:1px solid #F3F4F6">
        <td style="padding:0.35rem 0.75rem;font-size:0.78rem;color:#374151">${label}</td>
        <td style="padding:0.35rem 0.75rem;text-align:right;font-size:0.72rem;color:#9CA3AF;white-space:nowrap">${val !== null ? perM2(val) + '\u202F€/m²' : '—'}</td>
        <td style="padding:0.35rem 0.75rem;text-align:right;font-size:0.78rem;font-weight:600;color:${color};white-space:nowrap">${val !== null ? fmtEur(val) : '—'}</td>
      </tr>`;
  }

  function opexRow(label, val) {
    return `
      <tr style="border-top:1px solid #DCFCE7">
        <td style="padding:0.35rem 0.75rem;font-size:0.78rem;color:#374151">${label}</td>
        <td style="padding:0.35rem 0.75rem;text-align:right;font-size:0.78rem;font-weight:600;color:${val !== null ? '#059669' : '#9CA3AF'};white-space:nowrap">
          ${val !== null ? fmtEur(val) + '<span style="font-weight:400;color:#9CA3AF"> /jr</span>' : '—'}
        </td>
      </tr>`;
  }

  function placeholderRow(label) {
    return `
      <tr style="border-top:1px solid #F3F4F6">
        <td style="padding:0.35rem 0.75rem;font-size:0.78rem;color:#9CA3AF;font-style:italic">${label}</td>
        <td style="padding:0.35rem 0.75rem;text-align:right;font-size:0.78rem;color:#D1D5DB">—</td>
        <td style="padding:0.35rem 0.75rem;text-align:right;font-size:0.78rem;color:#D1D5DB">—</td>
      </tr>`;
  }

  // ── Table 1: Hoofdbouwkosten ─────────────────────────────────────────────

  const t1Rows = [
    ['Bouwkundige werken',           m.capexDetail.bouwkundigeWerken],
    ['Installatietechnische werken', m.capexDetail.installatietechnischeWerken],
    ['Vaste inrichting',             m.capexDetail.vasteInrichting],
    ['Terrein',                      m.capexDetail.terrein],
    ['Indirecte bouwkosten',         m.capexDetail.indirecteBouwkosten],
    ['Belasting (BTW)',              m.capexDetail.belasting],
  ].map(([l, v]) => capexRow(l, v)).join('');

  const t1Sub = [
    m.capexDetail.bouwkundigeWerken, m.capexDetail.installatietechnischeWerken,
    m.capexDetail.vasteInrichting, m.capexDetail.terrein,
    m.capexDetail.indirecteBouwkosten, m.capexDetail.belasting,
  ].reduce((s, v) => s + v, 0);

  const table1 = `
    ${_hdr('Hoofdbouwkosten (NEN2699)', '#7C3AED')}
    <table style="width:100%;border-collapse:collapse;margin-bottom:0.5rem;border-radius:0.5rem;overflow:hidden">
      <colgroup><col/><col style="width:5rem"/><col style="width:6.5rem"/></colgroup>
      <tbody>${t1Rows}</tbody>
      <tfoot>
        <tr style="background:#F5F3FF;border-top:2px solid #DDD6FE">
          <td style="padding:0.45rem 0.75rem;font-size:0.78rem;font-weight:700;color:#374151">Subtotaal</td>
          <td style="padding:0.45rem 0.75rem;text-align:right;font-size:0.72rem;color:#7C3AED">${perM2(t1Sub)}\u202F€/m²</td>
          <td style="padding:0.45rem 0.75rem;text-align:right;font-size:0.85rem;font-weight:700;color:#7C3AED;white-space:nowrap">${fmtEur(t1Sub)}</td>
        </tr>
      </tfoot>
    </table>`;

  // ── Table 2: Ambitiekosten ───────────────────────────────────────────────

  let table2 = '';
  if (vis.ambitie && m.ambitieDetail) {
    const LABEL = {
      gezond:     'Gezonde school',       energie:    'Energiegebruik',
      materiaal:  'Materiaalgebruik',     hergebruik: 'Materiaalhergebruik',
      water:      'Watergebruik',         groendak:   'Groendak',
      klimaat:    'Klimaatadaptie',       veilig:     'Veilige school',
      digitaal:   'Digitale school',      inclusief:  'Inclusieve school',
    };

    const t2Rows = Object.entries(m.ambitieDetail).map(([key, d]) => {
      const niveau = d.level !== undefined ? d.level : (Math.round(d.score || 0) + '%');
      const totaal = Math.round(d.capex * m.bvo);
      return `
        <tr style="border-top:1px solid #FEF3C7">
          <td style="padding:0.35rem 0.75rem;font-size:0.78rem;color:#374151">${LABEL[key] || key}</td>
          <td style="padding:0.35rem 0.75rem;text-align:center;font-size:0.72rem;color:#6B7280">${niveau}</td>
          <td style="padding:0.35rem 0.75rem;text-align:right;font-size:0.72rem;color:#9CA3AF;white-space:nowrap">${d.capex > 0 ? d.capex + '\u202F€/m²' : '—'}</td>
          <td style="padding:0.35rem 0.75rem;text-align:right;font-size:0.78rem;font-weight:600;color:${d.capex > 0 ? '#D97706' : '#9CA3AF'};white-space:nowrap">${d.capex > 0 ? fmtEur(totaal) : '—'}</td>
        </tr>`;
    }).join('');

    const t2Total = Math.round(m.kwaliteitDetail.ambitieExtra);

    table2 = `
      ${_hdr('Ambitie-meerwerk', '#D97706')}
      <table style="width:100%;border-collapse:collapse;background:#FFFBEB;margin-bottom:0.5rem;border-radius:0.5rem;overflow:hidden">
        <colgroup><col/><col style="width:4rem"/><col style="width:5rem"/><col style="width:6.5rem"/></colgroup>
        <thead>
          <tr style="background:#FEF3C7">
            <th style="padding:0.3rem 0.75rem;text-align:left;font-size:0.63rem;color:#92400E;font-weight:600;text-transform:uppercase">Dimensie</th>
            <th style="padding:0.3rem 0.75rem;text-align:center;font-size:0.63rem;color:#92400E;font-weight:600;text-transform:uppercase">Niveau</th>
            <th style="padding:0.3rem 0.75rem;text-align:right;font-size:0.63rem;color:#92400E;font-weight:600;text-transform:uppercase">Per m²</th>
            <th style="padding:0.3rem 0.75rem;text-align:right;font-size:0.63rem;color:#92400E;font-weight:600;text-transform:uppercase">Totaal</th>
          </tr>
        </thead>
        <tbody>${t2Rows}</tbody>
        <tfoot>
          <tr style="background:#FEF3C7;border-top:2px solid #FCD34D">
            <td colspan="3" style="padding:0.45rem 0.75rem;font-size:0.78rem;font-weight:700;color:#374151">Subtotaal ambitie-meerwerk</td>
            <td style="padding:0.45rem 0.75rem;text-align:right;font-size:0.85rem;font-weight:700;color:#D97706;white-space:nowrap">${fmtEur(t2Total)}</td>
          </tr>
        </tfoot>
      </table>`;
  }

  // ── Table 3: Vormfactor meerkosten bouw ─────────────────────────────────

  let table3 = '';
  if (vis.vormfactor) {
    const t3Rows = [
      'Gevel oppervlak', 'Dakoppervlak', 'Grote overspanningen',
    ].map(l => placeholderRow(l)).join('');

    table3 = `
      ${_hdr('Vormfactor meerkosten bouw', '#6B7280')}
      <table style="width:100%;border-collapse:collapse;background:#F9FAFB;margin-bottom:0.5rem;border-radius:0.5rem;overflow:hidden">
        <colgroup><col/><col style="width:5rem"/><col style="width:6.5rem"/></colgroup>
        <tbody>${t3Rows}</tbody>
      </table>`;
  }

  // ── CAPEX total bar ──────────────────────────────────────────────────────

  const capexBar = `
    <div style="background:#F5F3FF;border-radius:0.75rem;padding:0.7rem 1rem;display:flex;justify-content:space-between;align-items:center;margin:0.75rem 0">
      <div>
        <div style="font-size:0.63rem;color:#7C3AED;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:0.15rem">Totale investeringskosten (CAPEX)</div>
        <div style="font-size:0.7rem;color:#7C3AED">${fmtM2(m.bvo)} &middot; ${Math.round(m.investeringskosten / m.bvo).toLocaleString('nl-NL')}\u202F€/m²</div>
      </div>
      <div style="font-size:1.1rem;font-weight:700;color:#7C3AED">${fmtEur(m.investeringskosten)}</div>
    </div>`;

  // ── Table 4: OPEX ────────────────────────────────────────────────────────

  const t4Rows = [
    ['Heffingen (OZB e.d.)',  m.opexDetail.heffingen],
    ['Verzekeringen',         m.opexDetail.verzekeringen],
    ['Onderhoud',             m.opexDetail.onderhoud],
    ['Verbruik',              m.opexDetail.verbruik],
    ['Beheerkosten',          null],
    ['Financieringskosten',   null],
    ['Schoonmaakkosten',      m.opexDetail.schoonmaak],
  ].map(([l, v]) => opexRow(l, v)).join('');

  const table4 = `
    ${_hdr('Exploitatiekosten (OPEX)', '#059669')}
    <table style="width:100%;border-collapse:collapse;background:#F0FDF4;margin-bottom:0.5rem;border-radius:0.5rem;overflow:hidden">
      <colgroup><col/><col style="width:8rem"/></colgroup>
      <tbody>${t4Rows}</tbody>
      <tfoot>
        <tr style="background:#DCFCE7;border-top:2px solid #A7F3D0">
          <td style="padding:0.45rem 0.75rem;font-size:0.78rem;font-weight:700;color:#374151">Subtotaal per jaar</td>
          <td style="padding:0.45rem 0.75rem;text-align:right;font-size:0.85rem;font-weight:700;color:#059669;white-space:nowrap">
            ${fmtEur(m.opexPerJaar)}<span style="font-size:0.7rem;font-weight:400;color:#9CA3AF"> /jr</span>
          </td>
        </tr>
        <tr style="background:#DCFCE7">
          <td style="padding:0.3rem 0.75rem;font-size:0.75rem;color:#6B7280">Over ${jaren} jaar</td>
          <td style="padding:0.3rem 0.75rem;text-align:right;font-size:0.78rem;font-weight:600;color:#059669;white-space:nowrap">${fmtEur(m.opexTotaal)}</td>
        </tr>
      </tfoot>
    </table>`;

  // ── Table 5: Vormfactor meerkosten gebruik ───────────────────────────────

  let table5 = '';
  if (vis.vormfactor) {
    const t5Rows = ['Koellast', 'Verlichting'].map(l => `
      <tr style="border-top:1px solid #F3F4F6">
        <td style="padding:0.35rem 0.75rem;font-size:0.78rem;color:#9CA3AF;font-style:italic">${l}</td>
        <td style="padding:0.35rem 0.75rem;text-align:right;font-size:0.78rem;color:#D1D5DB">—</td>
      </tr>`).join('');

    table5 = `
      ${_hdr('Vormfactor meerkosten gebruik', '#6B7280')}
      <table style="width:100%;border-collapse:collapse;background:#F9FAFB;margin-bottom:0.5rem;border-radius:0.5rem;overflow:hidden">
        <colgroup><col/><col style="width:8rem"/></colgroup>
        <tbody>${t5Rows}</tbody>
      </table>`;
  }

  // ── TCO total bar ────────────────────────────────────────────────────────

  const bPct = Math.round(m.investeringskosten / m.tco * 100);
  const ePct = 100 - bPct;

  const tcoBar = `
    <div style="background:linear-gradient(135deg,#F5F3FF 0%,#F0FDF4 100%);border-radius:0.75rem;padding:0.7rem 1rem;margin:0.75rem 0">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:0.4rem">
        <div style="font-size:0.63rem;color:#6B7280;font-weight:700;text-transform:uppercase;letter-spacing:0.06em">Totaal TCO – ${jaren} jaar</div>
        <div style="font-size:1.1rem;font-weight:700;color:#374151">${fmtEur(m.tco)}</div>
      </div>
      <div style="height:6px;background:#E5E7EB;border-radius:99px;overflow:hidden;margin-bottom:0.3rem">
        <div style="height:100%;background:linear-gradient(90deg,#7C3AED ${bPct}%,#34D399 ${bPct}%);border-radius:99px"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.68rem;color:#6B7280">
        <span style="color:#7C3AED">${bPct}% CAPEX (${fmtEur(m.investeringskosten)})</span>
        <span style="color:#059669">${ePct}% OPEX (${fmtEur(m.opexTotaal)})</span>
      </div>
    </div>`;

  // ── Intro + assemble ─────────────────────────────────────────────────────

  return `
    ${refNote}
    <p style="font-size:0.8rem;color:#6B7280;margin:0 0 0.5rem">
      Kostenraming op basis van <strong>NEN2699</strong> normbedragen (Kwaliteitskader 2026),
      geïnterpoleerd voor <strong>${fmtM2(m.bvo)}</strong> BVO over <strong>${jaren} jaar</strong>.
    </p>

    ${table1}
    ${table2}
    ${table3}
    ${capexBar}
    ${table4}
    ${table5}
    ${tcoBar}

    <p style="font-size:0.68rem;color:#9CA3AF;margin:0.5rem 0 0">
      * CAPEX inclusief bijkomende kosten en standaard kwaliteitstoeslagen (energieneutraal, frisse scholen, ICT e.a.).
      Beheerkosten, financieringskosten en vormfactorkosten worden in een toekomstige versie toegevoegd.
      Werkelijke kosten kunnen afwijken op basis van locatie en marktomstandigheden.
    </p>`;
}
