// ── POM TCO Model ──────────────────────────────────────────────────────────────
// Gebaseerd op "TCO Calculator POM_V1.xlsx" – NEN2699 kostenstructuur
// Bronsheet: PO BASIS (referentiegebouwen) & PO TCO (scenariomatrix)
//
// Exporteert: window.POM_TCO
//   .calc(bvo, gebruiksduur, ambities) → volledige TCO-berekening
// ─────────────────────────────────────────────────────────────────────────────

window.POM_TCO = (() => {

  // ── Referentiegebouwen ─────────────────────────────────────────────────────
  // Bron: PO BASIS sheet, kolommen "PO Klein 1312m²" en "PO Groot 2423m²"
  // Alle bedragen in €/m² BVO, inclusief BTW

  const REF = {
    klein: {
      bvo: 1312,
      // CAPEX – NEN2699 basiskosten (€/m² BVO, incl. BTW)
      bouwkundigeWerken:           1211,
      installatietechnischeWerken:  573,
      vasteInrichting:               45,
      terrein:                       88,
      indirecteBouwkosten:          385,
      bijkomendeKosten:             413,
      belasting:                    567,
      investeringskosten:          3283,   // = som NEN2699 basiskosten
      // Kwaliteitskader-toeslagen (incl. BTW)
      energieNeutraal:              143,
      duurzaamheid:                 212,
      frisseScholen:                233,
      exploitatietoeslag:            24,
      ict:                            5,
      kwaliteitBuitenruimte:         96,
      overig:                       113,
      totaalAanvullend:             826,   // = som kwaliteitskader-toeslagen
      // OPEX – exploitatiekosten per m² BVO per jaar (incl. BTW)
      heffingen:                     13,
      verzekeringen:                  6,
      onderhoud:                     54,
      verbruik:                      13,
      schoonmaak:                    15,
      totaalOpex:                   100,   // = som OPEX/m²/jr
    },
    groot: {
      bvo: 2423,
      bouwkundigeWerken:           1071,
      installatietechnischeWerken:  527,
      vasteInrichting:               36,
      terrein:                       95,
      indirecteBouwkosten:          348,
      bijkomendeKosten:             373,
      belasting:                    512,
      investeringskosten:          2962,
      energieNeutraal:              138,
      duurzaamheid:                 212,
      frisseScholen:                203,
      exploitatietoeslag:            20,
      ict:                            5,
      kwaliteitBuitenruimte:        100,
      overig:                        83,
      totaalAanvullend:             762,
      heffingen:                     11,
      verzekeringen:                  5,
      onderhoud:                     47,
      verbruik:                      13,
      schoonmaak:                    14,
      totaalOpex:                    91,
    },
  };

  // ── Machts­wet interpolatie ────────────────────────────────────────────────
  // Methode: "Power law (F3) with caps (+5% / -3%)" – bron: PO BASIS sheet
  // Grotere gebouwen zijn (tot op zekere hoogte) goedkoper per m² BVO.

  function powerLaw(bvo, bvo1, v1, bvo2, v2) {
    if (!bvo || bvo <= 0 || v1 === v2) return v1;
    const b = Math.log(v2 / v1) / Math.log(bvo2 / bvo1);
    const a = v1 / Math.pow(bvo1, b);
    const raw = a * Math.pow(bvo, b);
    // Caps: maximaal +5% boven klein-referentie, minimaal -3% onder groot-referentie
    return Math.max(v2 * 0.97, Math.min(v1 * 1.05, raw));
  }

  function interp(bvo, key) {
    return powerLaw(bvo, REF.klein.bvo, REF.klein[key], REF.groot.bvo, REF.groot[key]);
  }

  // ── Ambitieniveaus ─────────────────────────────────────────────────────────
  // Mapping ambitiewaarden → numerieke score (0–100)
  //
  // Dekt alle optietypen die in de UI worden gebruikt:
  //  - frisse scholen schaal:    BBL(0) < C(33) < B(67) < A(100)
  //  - energieklasse schaal:     BENG(0) < C(33) < B(67) < A(100) < ENG/E-neutraal(100)
  //  - materiaalpercentages:     15%(0) < 25%(50) < 35%(100)
  //  - hergebruikpercentages:    30%(0) < 40%(50) < 50%(100)
  //  - binair:                   Geen(0) < Wel(100)

  const SCORE_MAP = {
    'BBL': 0,
    'C': 0,  'B': 50, 'A': 100,   // C is baseline; only B/A add cost
    'Goed': 0, 'Beter': 50, 'Beste': 100,
    'BENG': 0, 'ENG': 100, 'E-neutraal': 100,
    '15%': 0,  '25%': 50,  '35%': 100,
    '30%': 0,  '40%': 50,  '50%': 100,
    'Geen': 0, 'Wel': 100,
    'Nee': 0,  'Ja':  100,
  };

  // Gemiddelde score voor een set waarden; onbekende waarden tellen als 0 (Goed)
  function ambitieScore(values) {
    const scores = Object.values(values || {}).map(v => SCORE_MAP[v] ?? 0);
    return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  }

  function scoreToLevel(score) {
    if (score <= 45) return 'Goed';
    if (score <= 80) return 'Beter';
    return 'Beste';
  }

  // Proportionele interpolatie voor gemiddelde dimensies (reageert op elke deelwijziging)
  // 0–50: lineair van Goed naar Beter; 50–100: lineair van Beter naar Beste
  function proportionalSurcharge(score, surcharge) {
    const s = Math.max(0, Math.min(100, score));
    if (s <= 50) return surcharge.Goed + (surcharge.Beter - surcharge.Goed) * (s / 50);
    return surcharge.Beter + (surcharge.Beste - surcharge.Beter) * ((s - 50) / 50);
  }

  // ── Ambities → Kostenmeerwerk ──────────────────────────────────────────────
  // Surcharges (€/m² BVO) bovenop de basisinvestering en kwaliteitskader.
  // Gebaseerd op Elementclusters-multipliers en PO BASIS "eigen berekening".
  //
  // Koppeling concept → UI-label:
  //  gezondSchool     – gemiddelde BBL/C/B/A over alle gezonde school items
  //  energiegebruik   – BENG / Frisse Scholen C/B/A / ENG / E-neutraal
  //  materiaalgebruik – aandeel biobased/hergebruikt (15% / 25% / 35%)
  //  hergebruik       – losmaakbaarheidsindex / herbruikbaarheid (30% / 40% / 50%)
  //  watergebruik     – gemiddelde van: subbemetering + afvalwater hergebruik + grijswatersysteem
  //  groendak         – groendak (Geen / Wel)
  //  klimaatAdaptie   – waterretentiesysteem (Geen / Wel)
  //  veilig           – gemiddelde van: extra beveiligingsmaatregelen + toegangscontrole + camera + vandaalbestendig
  //  digitaal         – slim gebouw (Geen / Wel)

  const CAPEX_SURCHARGE = {
    gezondSchool:     { Goed: 0, Beter: 20, Beste: 45 },
    energiegebruik:   { Goed: 0, Beter: 22, Beste: 55 },
    materiaalgebruik: { Goed: 0, Beter: 18, Beste: 36 },
    hergebruik:       { Goed: 0, Beter: 12, Beste: 28 },
    watergebruik:     { Goed: 0, Beter:  8, Beste: 15 },
    groendak:         { Goed: 0, Beter: 10, Beste: 20 },
    klimaatAdaptie:   { Goed: 0, Beter:  8, Beste: 15 },
    veilig:           { Goed: 0, Beter: 12, Beste: 35 },
    digitaal:         { Goed: 0, Beter: 12, Beste: 25 },
    inclusiefSchool:  { Goed: 0, Beter: 18, Beste: 35 },
  };

  // OPEX-correctie (€/m²/jr) – hogere energieklasse verlaagt verbruikskosten
  const OPEX_CORRECTIE = {
    energiegebruik: { Goed: 0, Beter: -3, Beste: -9 },
  };

  function calcAmbities(ambities) {
    if (!ambities) return { capex: 0, opexPerJaar: 0, detail: {} };

    const gs = ambities.gezondSchool    || {};
    const du = ambities.duurzameSchool  || {};
    const vi = ambities.veiligSchool    || {};
    const di = ambities.digitaleSchool  || {};
    const ii = ambities.inclusiefSchool || {};

    // Gezonde school: proportioneel gemiddelde BBL/C/B/A over alle items
    const gezondScore = ambitieScore(gs);
    const gezondCapex = proportionalSurcharge(gezondScore, CAPEX_SURCHARGE.gezondSchool);

    // Energiegebruik: BENG/C/B/A/ENG/E-neutraal (discrete stap)
    const energieLevel = scoreToLevel(SCORE_MAP[du.energiegebruik] ?? 0);

    // Materiaalgebruik: 15%/25%/35% (discrete stap)
    const materLevel = scoreToLevel(SCORE_MAP[du.materiaalgebruik] ?? 0);

    // Herbruikbaarheid van materialen (losmaakbaarheidsindex): 30%/40%/50% (discrete stap)
    const hergebruikLevel = scoreToLevel(SCORE_MAP[du.meteriaalhergebruik] ?? 0);

    // Watergebruik: proportioneel gemiddelde van subbemetering + afvalwater hergebruik + grijswatersysteem
    const waterKeys = ['Subbemetering', 'afvalwater hergebruik', 'grijswatersysteem'];
    const waterScore = waterKeys.map(k => SCORE_MAP[du[k]] ?? 0).reduce((a, b) => a + b, 0) / waterKeys.length;
    const waterCapex = proportionalSurcharge(waterScore, CAPEX_SURCHARGE.watergebruik);

    // Groendak: Geen/Wel (discrete stap)
    const groendakLevel = scoreToLevel(SCORE_MAP[du.natuurInclusiviteit] ?? 0);

    // Klimaatadaptie / waterretentiesysteem: Geen/Wel (discrete stap)
    const klimaatLevel = scoreToLevel(SCORE_MAP[du.klimaatAdaptie] ?? 0);

    // Veilig: proportioneel gemiddelde van de 4 beveiligingsitems (Geen/Wel)
    const veiligKeys = ['bouwkundigInbraak', 'technischInbraak', 'bouwkundigVandalisme', 'technischVandalisme'];
    const veiligScore = veiligKeys.map(k => SCORE_MAP[vi[k]] ?? 0).reduce((a, b) => a + b, 0) / veiligKeys.length;
    const veiligCapex = proportionalSurcharge(veiligScore, CAPEX_SURCHARGE.veilig);

    // Digitaal: slim gebouw (Geen/Wel, discrete stap)
    const digitaalLevel = scoreToLevel(SCORE_MAP[di.technischeIntegratie] ?? 0);

    // Inclusief: voldoen aan NEN9120 (Nee/Ja, discrete stap)
    const inclusiefLevel = scoreToLevel(SCORE_MAP[ii.nen9120] ?? 0);

    const detail = {
      gezond:     { score: gezondScore,   capex: Math.round(gezondCapex)                              },
      energie:    { level: energieLevel,  capex: CAPEX_SURCHARGE.energiegebruik[energieLevel]  || 0  },
      materiaal:  { level: materLevel,    capex: CAPEX_SURCHARGE.materiaalgebruik[materLevel]  || 0  },
      hergebruik: { level: hergebruikLevel, capex: CAPEX_SURCHARGE.hergebruik[hergebruikLevel] || 0  },
      water:      { score: waterScore,    capex: Math.round(waterCapex)                               },
      groendak:   { level: groendakLevel, capex: CAPEX_SURCHARGE.groendak[groendakLevel]       || 0  },
      klimaat:    { level: klimaatLevel,  capex: CAPEX_SURCHARGE.klimaatAdaptie[klimaatLevel]  || 0  },
      veilig:     { score: veiligScore,   capex: Math.round(veiligCapex)                              },
      digitaal:   { level: digitaalLevel, capex: CAPEX_SURCHARGE.digitaal[digitaalLevel]       || 0  },
      inclusief:  { level: inclusiefLevel, capex: CAPEX_SURCHARGE.inclusiefSchool[inclusiefLevel] || 0 },
    };

    const capex = Object.values(detail).reduce((s, d) => s + d.capex, 0);
    const opexPerJaar = OPEX_CORRECTIE.energiegebruik[energieLevel] || 0;

    return { capex, opexPerJaar, detail };
  }

  // ── Hoofdberekening ────────────────────────────────────────────────────────

  function calc(bvo, gebruiksduur, ambities) {
    if (!bvo || bvo <= 0) return null;

    const jaren = Math.max(1, gebruiksduur || 40);

    // ── CAPEX (eenmalig) ──────────────────────────────────────────────────
    // NEN2699 basisinvestering per m² BVO (interpolated)
    const basisPerM2      = interp(bvo, 'investeringskosten');
    // Kwaliteitskader-toeslagen per m² BVO (interpolated)
    const kwaliteitPerM2  = interp(bvo, 'totaalAanvullend');

    // Ambitie-surcharges (extra keuzes boven kwaliteitskader)
    const ambitieResult   = calcAmbities(ambities);
    const ambExtraPerM2   = ambitieResult.capex;

    const basisInvestering   = Math.round(basisPerM2 * bvo);
    const kwaliteitsToeslagen = Math.round((kwaliteitPerM2 + ambExtraPerM2) * bvo);
    const investeringskosten  = basisInvestering + kwaliteitsToeslagen;

    // ── OPEX (jaarlijks) ───────────────────────────────────────────────────
    const opexBasePerM2  = interp(bvo, 'totaalOpex');
    const opexAdjPerM2   = ambitieResult.opexPerJaar;   // energie­correctie (negatief = besparing)
    const opexPerM2      = opexBasePerM2 + opexAdjPerM2;

    const opexPerJaar    = Math.round(opexPerM2 * bvo);
    const opexTotaal     = Math.round(opexPerJaar * jaren);

    // ── TCO ────────────────────────────────────────────────────────────────
    const tco = investeringskosten + opexTotaal;

    // ── Detail­uitsplitsing ─────────────────────────────────────────────────
    const capexDetail = {
      bouwkundigeWerken:           Math.round(interp(bvo, 'bouwkundigeWerken')           * bvo),
      installatietechnischeWerken: Math.round(interp(bvo, 'installatietechnischeWerken') * bvo),
      vasteInrichting:             Math.round(interp(bvo, 'vasteInrichting')             * bvo),
      terrein:                     Math.round(interp(bvo, 'terrein')                     * bvo),
      indirecteBouwkosten:         Math.round(interp(bvo, 'indirecteBouwkosten')         * bvo),
      bijkomendeKosten:            Math.round(interp(bvo, 'bijkomendeKosten')            * bvo),
      belasting:                   Math.round(interp(bvo, 'belasting')                   * bvo),
    };

    const kwaliteitDetail = {
      energieNeutraal:       Math.round(interp(bvo, 'energieNeutraal')       * bvo),
      duurzaamheid:          Math.round(interp(bvo, 'duurzaamheid')          * bvo),
      frisseScholen:         Math.round(interp(bvo, 'frisseScholen')         * bvo),
      exploitatietoeslag:    Math.round(interp(bvo, 'exploitatietoeslag')    * bvo),
      ict:                   Math.round(interp(bvo, 'ict')                   * bvo),
      kwaliteitBuitenruimte: Math.round(interp(bvo, 'kwaliteitBuitenruimte') * bvo),
      overig:                Math.round(interp(bvo, 'overig')                * bvo),
      ambitieExtra:          Math.round(ambExtraPerM2 * bvo),
    };

    const opexDetail = {
      heffingen:     Math.round(interp(bvo, 'heffingen')     * bvo),
      verzekeringen: Math.round(interp(bvo, 'verzekeringen') * bvo),
      onderhoud:     Math.round(interp(bvo, 'onderhoud')     * bvo),
      verbruik:      Math.round((interp(bvo, 'verbruik') + opexAdjPerM2) * bvo),
      schoonmaak:    Math.round(interp(bvo, 'schoonmaak')    * bvo),
    };

    return {
      bvo,
      jaren,
      // CAPEX
      basisInvestering,       // NEN2699 basisinvestering (excl. kwaliteitstoeslagen)
      kwaliteitsToeslagen,    // kwaliteitskader + ambitie-surcharges
      investeringskosten,     // totale CAPEX = basisInvestering + kwaliteitsToeslagen
      // OPEX
      opexPerM2,              // €/m²/jr (netto, incl. energiecorrectie)
      opexPerJaar,            // €/jr (totaal gebouw)
      opexTotaal,             // €  (over volledige gebruiksduur)
      // TCO
      tco,                    // totale TCO = investeringskosten + opexTotaal
      // Detail
      capexDetail,
      kwaliteitDetail,
      opexDetail,
      ambitieDetail: ambitieResult.detail,
    };
  }

  return { calc, interp, REF, CAPEX_SURCHARGE };

})();
