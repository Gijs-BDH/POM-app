/* ── POM Dashboard Detail Popups ─────────────────────────────────────────────
   Clickable detail overlays for each dashboard metric pill.
   Included on all pages that render the dashboard widget.
──────────────────────────────────────────────────────────────────────────── */

function showDashboardDetail(type) {
  const project = getCurrentProject();
  const pveV    = getActivePveVariant();
  if (!project || !pveV) return;

  const V = pveV.voorzieningen;
  const { totalBVO, bouwkosten, tco, tcoModel } = POM_CALC.calcDashboard(V, project.gebruiksduur, pveV.ambities);

  let title, content;
  switch (type) {
    case 'bouwkosten':
      title   = 'Bouwkosten – berekening';
      content = renderBouwkostenDetail(V, totalBVO, bouwkosten, tcoModel);
      break;
    case 'tco':
      title   = 'TCO – Total Cost of Ownership';
      content = renderTCODetail(bouwkosten, tco, project.gebruiksduur, tcoModel);
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

function renderBouwkostenDetail(V, totalBVO, bouwkosten, tcoModel) {
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

  const fmtM2  = n => n.toLocaleString('nl-NL') + ' m²';
  const fmtEur = n => '€\u202F' + Math.round(n).toLocaleString('nl-NL');

  const bvoRows = rows.map(r => `
    <tr style="border-top:1px solid #F3F4F6">
      <td style="padding:0.55rem 0.75rem">
        <div style="font-size:0.8rem;color:#374151;font-weight:500">${r.label}</div>
        <div style="font-size:0.7rem;color:#9CA3AF">${r.sub}</div>
      </td>
      <td style="padding:0.55rem 0.75rem;text-align:right;font-size:0.8rem;font-weight:600;color:#6B7280;white-space:nowrap">${fmtM2(r.bvo)}</td>
    </tr>`).join('');

  // NEN2699 uitsplitsing (alleen als tcoModel beschikbaar)
  let nen2699Section = '';
  if (tcoModel) {
    const m = tcoModel;
    const perM2 = n => (n / m.bvo).toFixed(0);
    const costRows = [
      ['Bouwkundige werken',           m.capexDetail.bouwkundigeWerken],
      ['Installatietechnische werken', m.capexDetail.installatietechnischeWerken],
      ['Vaste inrichting',             m.capexDetail.vasteInrichting],
      ['Terrein',                      m.capexDetail.terrein],
      ['Indirecte bouwkosten',         m.capexDetail.indirecteBouwkosten],
      ['Bijkomende kosten',            m.capexDetail.bijkomendeKosten],
      ['Belasting (BTW)',              m.capexDetail.belasting],
    ].map(([label, val]) => `
      <tr style="border-top:1px solid #F3F4F6">
        <td style="padding:0.4rem 0.75rem;font-size:0.78rem;color:#374151">${label}</td>
        <td style="padding:0.4rem 0.75rem;text-align:right;font-size:0.75rem;color:#6B7280">${perM2(val)} /m²</td>
        <td style="padding:0.4rem 0.75rem;text-align:right;font-size:0.78rem;font-weight:600;color:#7C3AED;white-space:nowrap">${fmtEur(val)}</td>
      </tr>`).join('');

    const kwRows = [
      ['Energie neutraal',       m.kwaliteitDetail.energieNeutraal],
      ['Duurzaamheid',           m.kwaliteitDetail.duurzaamheid],
      ['Frisse scholen',         m.kwaliteitDetail.frisseScholen],
      ['Exploitatie-toeslag',    m.kwaliteitDetail.exploitatietoeslag],
      ['ICT',                    m.kwaliteitDetail.ict],
      ['Kwaliteit buitenruimte', m.kwaliteitDetail.kwaliteitBuitenruimte],
      ['Overig',                 m.kwaliteitDetail.overig],
      ...(m.kwaliteitDetail.ambitieExtra > 0
        ? [['Ambitie-surcharges', m.kwaliteitDetail.ambitieExtra]]
        : []),
    ].map(([label, val]) => `
      <tr style="border-top:1px solid #F3F4F6">
        <td style="padding:0.4rem 0.75rem;font-size:0.78rem;color:#374151">${label}</td>
        <td style="padding:0.4rem 0.75rem;text-align:right;font-size:0.75rem;color:#6B7280">${perM2(val)} /m²</td>
        <td style="padding:0.4rem 0.75rem;text-align:right;font-size:0.78rem;font-weight:600;color:#059669;white-space:nowrap">${fmtEur(val)}</td>
      </tr>`).join('');

    nen2699Section = `
      <div style="font-size:0.7rem;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.05em;margin:1rem 0 0.35rem">NEN2699 basisinvestering</div>
      <table style="width:100%;border-collapse:collapse;font-size:0.8rem;margin-bottom:0.75rem;border-radius:0.75rem;overflow:hidden">
        <tbody>${costRows}</tbody>
        <tfoot>
          <tr style="background:#F5F3FF;border-top:2px solid #DDD6FE">
            <td style="padding:0.5rem 0.75rem;font-size:0.8rem;font-weight:700;color:#374151">Totaal basis</td>
            <td></td>
            <td style="padding:0.5rem 0.75rem;text-align:right;font-size:0.88rem;font-weight:700;color:#7C3AED;white-space:nowrap">${fmtEur(m.basisInvestering)}</td>
          </tr>
        </tfoot>
      </table>

      <div style="font-size:0.7rem;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.35rem">Kwaliteitstoeslagen (incl. BTW)</div>
      <table style="width:100%;border-collapse:collapse;font-size:0.8rem;margin-bottom:0.75rem;border-radius:0.75rem;overflow:hidden">
        <tbody>${kwRows}</tbody>
        <tfoot>
          <tr style="background:#F0FDF4;border-top:2px solid #A7F3D0">
            <td style="padding:0.5rem 0.75rem;font-size:0.8rem;font-weight:700;color:#374151">Totaal toeslagen</td>
            <td></td>
            <td style="padding:0.5rem 0.75rem;text-align:right;font-size:0.88rem;font-weight:700;color:#059669;white-space:nowrap">${fmtEur(m.kwaliteitsToeslagen)}</td>
          </tr>
        </tfoot>
      </table>`;
  }

  return `
    <p style="font-size:0.8rem;color:#6B7280;margin:0 0 0.75rem">
      Investeringskosten op basis van <strong>NEN2699</strong> normbedragen voor primair onderwijs,
      geïnterpoleerd naar het totale BVO. Inclusief bijkomende kosten, BTW en kwaliteitstoeslagen.
    </p>

    <table style="width:100%;border-collapse:collapse;font-size:0.8rem;margin-bottom:0.75rem;overflow:hidden;border-radius:0.75rem">
      <thead>
        <tr style="background:#F3F4F6">
          <th style="padding:0.4rem 0.75rem;text-align:left;color:#9CA3AF;font-weight:600;text-transform:uppercase;font-size:0.65rem;letter-spacing:0.05em">Voorziening</th>
          <th style="padding:0.4rem 0.75rem;text-align:right;color:#9CA3AF;font-weight:600;text-transform:uppercase;font-size:0.65rem;letter-spacing:0.05em">BVO</th>
        </tr>
      </thead>
      <tbody>
        ${bvoRows || `<tr><td colspan="2" style="padding:0.75rem;color:#9CA3AF;text-align:center;font-size:0.8rem">Geen actieve voorzieningen</td></tr>`}
        <tr style="border-top:2px solid #E5E7EB;background:#F9FAFB">
          <td style="padding:0.5rem 0.75rem;font-size:0.8rem;font-weight:700;color:#374151">Totaal BVO</td>
          <td style="padding:0.5rem 0.75rem;text-align:right;font-size:0.88rem;font-weight:700;color:#374151">${fmtM2(totalBVO)}</td>
        </tr>
      </tbody>
    </table>

    ${nen2699Section}

    <div style="background:#F5F3FF;border-radius:0.75rem;padding:0.875rem 1rem;display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem">
      <div>
        <div style="font-size:0.65rem;color:#7C3AED;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.2rem">Totale investeringskosten</div>
        <div style="font-size:0.7rem;color:#7C3AED">${fmtM2(totalBVO)} · ${tcoModel ? Math.round(bouwkosten/totalBVO).toLocaleString('nl-NL') + ' €/m²' : '—'}</div>
      </div>
      <div style="font-size:1.15rem;font-weight:700;color:#7C3AED">${fmtEur(bouwkosten)}</div>
    </div>

    <p style="font-size:0.7rem;color:#9CA3AF;margin:0">
      * Indicatieve raming op basis van NEN2699 normbedragen (Kwaliteitskader 2026). Werkelijke kosten kunnen afwijken op basis van locatie, marktomstandigheden en specifieke ontwerpeisen.
    </p>`;
}

// ── TCO ────────────────────────────────────────────────────────────────────

function renderTCODetail(bouwkosten, tco, gebruiksduur, tcoModel) {
  const jaren       = gebruiksduur || 40;
  const exploitatie = tco - bouwkosten;
  const perJaar     = Math.round(exploitatie / jaren);
  const bPct        = Math.round(bouwkosten / tco * 100);
  const ePct        = 100 - bPct;

  const fmtEur = n => '€\u202F' + Math.round(n).toLocaleString('nl-NL');

  // OPEX-uitsplitsing (alleen als tcoModel beschikbaar)
  let opexSection = '';
  if (tcoModel) {
    const m = tcoModel;
    const opexRows = [
      ['Heffingen (OZB e.d.)',  m.opexDetail.heffingen],
      ['Verzekeringen',         m.opexDetail.verzekeringen],
      ['Onderhoud',             m.opexDetail.onderhoud],
      ['Energie­verbruik',      m.opexDetail.verbruik],
      ['Schoonmaak',            m.opexDetail.schoonmaak],
    ].map(([label, val]) => `
      <tr style="border-top:1px solid #DCFCE7">
        <td style="padding:0.35rem 0.75rem;font-size:0.78rem;color:#374151">${label}</td>
        <td style="padding:0.35rem 0.75rem;text-align:right;font-size:0.78rem;font-weight:600;color:#059669;white-space:nowrap">${fmtEur(val)}<span style="color:#9CA3AF;font-weight:400"> /jr</span></td>
      </tr>`).join('');

    opexSection = `
      <div style="font-size:0.7rem;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.05em;margin:0.75rem 0 0.3rem">Exploitatiekosten per jaar (${fmtEur(m.opexPerJaar)})</div>
      <table style="width:100%;border-collapse:collapse;font-size:0.8rem;margin-bottom:0.75rem;border-radius:0.75rem;overflow:hidden;background:#F0FDF4">
        <tbody>${opexRows}</tbody>
      </table>`;
  }

  const bronTekst = tcoModel
    ? `Berekend conform NEN2699 (TCO Calculator POM_V1) op basis van ${tcoModel.bvo.toLocaleString('nl-NL')} m² BVO.`
    : `TCO = investeringskosten + exploitatiekosten over ${jaren} jaar.`;

  return `
    <p style="font-size:0.8rem;color:#6B7280;margin:0 0 1rem">
      De <strong>Total Cost of Ownership (TCO)</strong> toont de totale kosten van het gebouw
      over de volledige exploitatieperiode van <strong>${jaren} jaar</strong>,
      inclusief investeringskosten, onderhoud, beheer en energie.
    </p>

    <div style="display:flex;flex-direction:column;gap:0.75rem;margin-bottom:1rem">

      <!-- Investeringskosten -->
      <div style="background:#F5F3FF;border-radius:0.75rem;padding:0.875rem 1rem">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:0.5rem">
          <span style="font-size:0.8rem;font-weight:600;color:#374151">Investeringskosten (CAPEX)</span>
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
          <span style="font-size:0.8rem;font-weight:600;color:#374151">Exploitatiekosten (OPEX &ndash; ${jaren} jaar)</span>
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

    ${opexSection}

    <div style="background:linear-gradient(135deg,#F5F3FF 0%,#F0FDF4 100%);border-radius:0.75rem;padding:0.875rem 1rem;display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem">
      <div>
        <div style="font-size:0.65rem;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.2rem">Totaal TCO &ndash; ${jaren} jaar</div>
        <div style="font-size:1.25rem;font-weight:700;color:#374151">${fmtEur(tco)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:0.7rem;color:#9CA3AF;margin-bottom:0.15rem">CAPEX + OPEX</div>
        <div style="font-size:0.8rem;font-weight:600;color:#6B7280">${fmtEur(bouwkosten)} + ${fmtEur(exploitatie)}</div>
      </div>
    </div>

    <p style="font-size:0.7rem;color:#9CA3AF;margin:0">
      * ${bronTekst} Exploitatielasten omvatten heffingen, verzekeringen, onderhoud, energie­verbruik en schoonmaak.
      Werkelijke kosten kunnen afwijken op basis van locatie, marktomstandigheden en beheer­keuzes.
    </p>`;
}
