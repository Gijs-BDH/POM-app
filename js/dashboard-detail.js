/* ── POM Dashboard Detail Popups ─────────────────────────────────────────────
   Clickable detail overlays for each dashboard metric pill.
   Included on all pages that render the dashboard widget.
──────────────────────────────────────────────────────────────────────────── */

function showDashboardDetail(type) {
  const project = getCurrentProject();
  const pveV    = getActivePveVariant();
  if (!project || !pveV) return;

  const V = pveV.voorzieningen;
  const { totalBVO, bouwkosten, tco } = POM_CALC.calcDashboard(V);

  let title, content;
  switch (type) {
    case 'bouwkosten':
      title   = 'Bouwkosten – berekening';
      content = renderBouwkostenDetail(V, totalBVO, bouwkosten);
      break;
    case 'tco':
      title   = 'TCO – Total Cost of Ownership';
      content = renderTCODetail(bouwkosten, tco, project.gebruiksduur);
      break;
    default: return;
  }

  // Create overlay once, reuse afterwards
  let overlay = document.getElementById('dd-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'dd-overlay';
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);' +
      'display:flex;align-items:center;justify-content:center;z-index:999';
    overlay.innerHTML = `
      <div class="card" style="width:500px;max-width:92vw;padding:1.5rem;max-height:82vh;overflow-y:auto">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
          <h3 id="dd-title" style="font-size:1rem;font-weight:600;color:#374151;margin:0"></h3>
          <button onclick="closeDashboardDetail()"
            style="color:#9CA3AF;font-size:1.5rem;line-height:1;background:none;border:none;cursor:pointer;padding:0;flex-shrink:0">&times;</button>
        </div>
        <div id="dd-content"></div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeDashboardDetail(); });
  }

  document.getElementById('dd-title').textContent = title;
  document.getElementById('dd-content').innerHTML  = content;
  overlay.style.display = 'flex';
}

function closeDashboardDetail() {
  const overlay = document.getElementById('dd-overlay');
  if (overlay) overlay.style.display = 'none';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeDashboardDetail();
});

// ── Bouwkosten ─────────────────────────────────────────────────────────────

function renderBouwkostenDetail(V, totalBVO, bouwkosten) {
  const po = V.primairOnderwijs;
  const vs = V.voorschoolseOpvang;
  const sp = V.sport;

  const poBVO = po.actief ? (po.bvoHandmatig !== null ? po.bvoHandmatig : POM_CALC.calcPrimairBVO(po.leerlingen)) : 0;
  const vsBVO = vs.actief ? (vs.bvoHandmatig !== null ? vs.bvoHandmatig : POM_CALC.calcVoorschoolseBVO(vs.groepen)) : 0;
  const spBVO = sp.actief ? (sp.bvoHandmatig !== null ? sp.bvoHandmatig : POM_CALC.calcSportBVO(sp.type)) : 0;

  const rows = [];
  if (po.actief) rows.push({
    label: 'Primair onderwijs',
    sub:   `${po.leerlingen} leerlingen${po.bvoHandmatig !== null ? ' · handmatig BVO' : ''}`,
    bvo:   poBVO
  });
  if (vs.actief) rows.push({
    label: 'Voorschoolse opvang',
    sub:   `${vs.groepen} groepen${vs.bvoHandmatig !== null ? ' · handmatig BVO' : ''}`,
    bvo:   vsBVO
  });
  if (sp.actief) rows.push({
    label: 'Sport',
    sub:   `${sp.type}${sp.bvoHandmatig !== null ? ' · handmatig BVO' : ''}`,
    bvo:   spBVO
  });

  const RATE   = 2500;
  const fmtM2  = n => n.toLocaleString('nl-NL') + ' m²';
  const fmtEur = n => '€\u202F' + n.toLocaleString('nl-NL');

  const tableRows = rows.map(r => `
    <tr style="border-top:1px solid #F3F4F6">
      <td style="padding:0.55rem 0.75rem">
        <div style="font-size:0.8rem;color:#374151;font-weight:500">${r.label}</div>
        <div style="font-size:0.7rem;color:#9CA3AF">${r.sub}</div>
      </td>
      <td style="padding:0.55rem 0.75rem;text-align:right;font-size:0.8rem;font-weight:600;color:#6B7280;white-space:nowrap">${fmtM2(r.bvo)}</td>
      <td style="padding:0.55rem 0.75rem;text-align:right;font-size:0.8rem;font-weight:600;color:#7C3AED;white-space:nowrap">${fmtEur(Math.round(r.bvo * RATE))}</td>
    </tr>`).join('');

  return `
    <p style="font-size:0.8rem;color:#6B7280;margin:0 0 1rem">
      Bouwkosten worden berekend op basis van het totale bruto vloeroppervlak (BVO)
      vermenigvuldigd met een normatieve kostprijs van <strong>&euro;&thinsp;${RATE.toLocaleString('nl-NL')} per m&sup2;</strong>.
    </p>

    <table style="width:100%;border-collapse:collapse;font-size:0.8rem;margin-bottom:1rem;overflow:hidden;border-radius:0.75rem">
      <thead>
        <tr style="background:#F3F4F6">
          <th style="padding:0.4rem 0.75rem;text-align:left;color:#9CA3AF;font-weight:600;text-transform:uppercase;font-size:0.65rem;letter-spacing:0.05em">Voorziening</th>
          <th style="padding:0.4rem 0.75rem;text-align:right;color:#9CA3AF;font-weight:600;text-transform:uppercase;font-size:0.65rem;letter-spacing:0.05em">BVO</th>
          <th style="padding:0.4rem 0.75rem;text-align:right;color:#9CA3AF;font-weight:600;text-transform:uppercase;font-size:0.65rem;letter-spacing:0.05em">Kosten</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows || `<tr><td colspan="3" style="padding:0.75rem;color:#9CA3AF;text-align:center;font-size:0.8rem">Geen actieve voorzieningen</td></tr>`}
      </tbody>
    </table>

    <div style="background:#F5F3FF;border-radius:0.75rem;padding:0.875rem 1rem;display:flex;justify-content:space-between;align-items:center;margin-bottom:0.875rem">
      <div>
        <div style="font-size:0.65rem;color:#7C3AED;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.2rem">Totaal BVO</div>
        <div style="font-size:1.1rem;font-weight:700;color:#374151">${fmtM2(totalBVO)}</div>
      </div>
      <div style="font-size:0.85rem;color:#7C3AED;font-weight:600;padding:0 0.75rem">&times;&thinsp;${fmtEur(RATE)}&thinsp;/&thinsp;m&sup2;</div>
      <div style="text-align:right">
        <div style="font-size:0.65rem;color:#7C3AED;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.2rem">Bouwkosten</div>
        <div style="font-size:1.1rem;font-weight:700;color:#7C3AED">${fmtEur(bouwkosten)}</div>
      </div>
    </div>

    <p style="font-size:0.7rem;color:#9CA3AF;margin:0">
      * Indicatieve raming op basis van normbedragen. Werkelijke kosten kunnen afwijken op basis van locatie, kwaliteitsniveau en marktontwikkelingen.
    </p>`;
}

// ── TCO ────────────────────────────────────────────────────────────────────

function renderTCODetail(bouwkosten, tco, gebruiksduur) {
  const jaren       = gebruiksduur || 50;
  const exploitatie = tco - bouwkosten;
  const perJaar     = Math.round(exploitatie / jaren);
  const bPct        = Math.round(bouwkosten / tco * 100);
  const ePct        = 100 - bPct;

  const fmtEur = n => '€\u202F' + n.toLocaleString('nl-NL');

  return `
    <p style="font-size:0.8rem;color:#6B7280;margin:0 0 1rem">
      De <strong>Total Cost of Ownership (TCO)</strong> toont de totale kosten van het gebouw
      over de volledige exploitatieperiode van <strong>${jaren} jaar</strong>,
      inclusief stichtingskosten, onderhoud en beheer.
    </p>

    <div style="display:flex;flex-direction:column;gap:0.75rem;margin-bottom:1.25rem">

      <!-- Stichtingskosten -->
      <div style="background:#F5F3FF;border-radius:0.75rem;padding:0.875rem 1rem">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:0.5rem">
          <span style="font-size:0.8rem;font-weight:600;color:#374151">Stichtingskosten</span>
          <span style="font-size:1rem;font-weight:700;color:#7C3AED">${fmtEur(bouwkosten)}</span>
        </div>
        <div style="height:6px;background:#DDD6FE;border-radius:99px;overflow:hidden;margin-bottom:0.3rem">
          <div style="height:100%;background:#7C3AED;border-radius:99px;width:${bPct}%"></div>
        </div>
        <div style="font-size:0.7rem;color:#7C3AED">${bPct}% van TCO &middot; eenmalige investering bij oplevering</div>
      </div>

      <!-- Exploitatiekosten -->
      <div style="background:#F0FDF4;border-radius:0.75rem;padding:0.875rem 1rem">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:0.5rem">
          <span style="font-size:0.8rem;font-weight:600;color:#374151">Exploitatiekosten (${jaren} jaar)</span>
          <span style="font-size:1rem;font-weight:700;color:#059669">${fmtEur(exploitatie)}</span>
        </div>
        <div style="height:6px;background:#A7F3D0;border-radius:99px;overflow:hidden;margin-bottom:0.3rem">
          <div style="height:100%;background:#34D399;border-radius:99px;width:${ePct}%"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.7rem;color:#059669">
          <span>${ePct}% van TCO</span>
          <span>gem. ${fmtEur(perJaar)} / jaar</span>
        </div>
      </div>

    </div>

    <div style="background:linear-gradient(135deg,#F5F3FF 0%,#F0FDF4 100%);border-radius:0.75rem;padding:0.875rem 1rem;display:flex;justify-content:space-between;align-items:center;margin-bottom:0.875rem">
      <div>
        <div style="font-size:0.65rem;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.2rem">Totaal TCO &ndash; ${jaren} jaar</div>
        <div style="font-size:1.25rem;font-weight:700;color:#374151">${fmtEur(tco)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:0.7rem;color:#9CA3AF;margin-bottom:0.15rem">Berekening</div>
        <div style="font-size:0.85rem;font-weight:600;color:#6B7280">Stichtingskosten &times; 2,2</div>
      </div>
    </div>

    <p style="font-size:0.7rem;color:#9CA3AF;margin:0">
      * TCO is berekend als bouwkosten &times; 2,2 (normatieve aanname). De exploitatielasten omvatten
      onderhoud, beheer en energiekosten, verdeeld over ${jaren} jaar.
    </p>`;
}
