// ── POM Calculations ──────────────────────────────────────────────────────────
// Exposed as window.POM_CALC so all pages can use it via <script src>

window.POM_CALC = (() => {

  // ── BVO Formulas ────────────────────────────────────────────────────────────

  function calcPrimairBVO(leerlingen) {
    // 400 leerlingen → 2255 m²  (factor 5.6375)
    return Math.round(leerlingen * (2255/400));
  }

  function calcOnderbouwplein(leerlingen) {
    return Math.round(leerlingen * (350/400));
  }

  function calcBovenbouwplein(leerlingen) {
    return Math.round(leerlingen * (550/400));
  }

  function calcFietsenstalling(leerlingen) {
    // returns aantal fietsen
    return Math.round(leerlingen * (170/400));
  }

  function calcVoorschoolseBVO(groepen) {
    // 2 groepen → 230 m²  (factor 115)
    return Math.round(groepen * (230/2));
  }

  function calcVoorschoolsePlein(groepen) {
    return Math.round(groepen * (100/2));
  }

  function calcVoorschoolseFietsen(groepen) {
    return Math.round(groepen * (10/2));
  }

  const SPORT_BVO = { gymzaal: 600, sportzaal: 1200, sporthal: 2400 };

  function calcSportBVO(type) {
    return SPORT_BVO[type] || 600;
  }

  // ── Dashboard ────────────────────────────────────────────────────────────────

  function calcTotalBVO(voorzieningen) {
    let total = 0;
    const po = voorzieningen.primairOnderwijs;
    const vs = voorzieningen.voorschoolseOpvang;
    const sp = voorzieningen.sport;

    if (po.actief) {
      total += po.bvoHandmatig !== null ? po.bvoHandmatig : calcPrimairBVO(po.leerlingen);
    }
    if (vs.actief) {
      total += vs.bvoHandmatig !== null ? vs.bvoHandmatig : calcVoorschoolseBVO(vs.groepen);
    }
    if (sp.actief) {
      total += sp.bvoHandmatig !== null ? sp.bvoHandmatig : calcSportBVO(sp.type);
    }
    return total;
  }

  // gebruiksduur: aantal jaar (default 40)
  // ambities: pve.ambities object (optioneel – beïnvloedt kwaliteits­toeslagen & OPEX)
  function calcDashboard(voorzieningen, gebruiksduur, ambities) {
    const totalBVO = calcTotalBVO(voorzieningen);
    gebruiksduur   = gebruiksduur || 40;

    // Gebruik TCO-model als dat geladen is (js/tco-model.js)
    if (window.POM_TCO && totalBVO > 0) {
      const m = POM_TCO.calc(totalBVO, gebruiksduur, ambities);
      return {
        totalBVO,
        bouwkosten: m.investeringskosten,   // totale CAPEX (incl. kwaliteitstoeslagen)
        tco:        m.tco,                  // CAPEX + OPEX over gebruiksduur jaar
        tcoModel:   m,
      };
    }

    // Fallback (TCO-model niet beschikbaar)
    const bouwkosten = Math.round(totalBVO * 2500);
    const tco        = Math.round(bouwkosten + totalBVO * 88 * gebruiksduur);
    return { totalBVO, bouwkosten, tco, tcoModel: null };
  }

  // ── Ambitie Scores ───────────────────────────────────────────────────────────

  // Maps selection label to 0-100 score (internal scale, used for averaging).
  function selectionScore(val) {
    const map = {
      'BBL': 0,
      'C': 33, 'B': 67, 'A': 100,
      'Goed': 33, 'Beter': 67, 'Beste': 100,
      'BENG': 0, 'ENG': 100, 'E-neutraal': 100,
      '15%': 0,  '25%': 50,  '35%': 100,
      '30%': 0,  '40%': 50,  '50%': 100,
      'Geen': 0, 'Wel': 100,
      'Nee':  0, 'Ja':  100,
    };
    return map[val] ?? 0;
  }

  // Position-based score: score = index / lastIndex × 100
  // First option = 0, last option = 100, regardless of label.
  // This ensures C scores 0 on a [C,B,A] list but 33 on a [BBL,C,B,A] list.
  function itemScore(opts, val) {
    const idx = opts.indexOf(val);
    if (idx === -1 || opts.length <= 1) return 0;
    return Math.round(idx / (opts.length - 1) * 100);
  }

  // Maps an internal 0-100 dimension score to radar chart position (20-100).
  // Lowest option sits at 20% off-centre rather than at the origin.
  function toRadarScore(score) {
    return Math.round(20 + score * 0.8);
  }

  function dimensionScore(items) {
    const vals = Object.values(items).map(selectionScore);
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }

  function calcAmbitieScores(ambities) {
    return {
      gezondSchool:    dimensionScore(ambities.gezondSchool),
      duurzameSchool:  dimensionScore(ambities.duurzameSchool),
      adaptieveSchool: dimensionScore(ambities.adaptieveSchool),
      veiligSchool:    dimensionScore(ambities.veiligSchool),
      digitaleSchool:  dimensionScore(ambities.digitaleSchool),
      inclusiefSchool: dimensionScore(ambities.inclusiefSchool),
    };
  }

  // Fixed placeholder "gemiddelde ambities" (orange layer) – on the 20-100 scale
  const GEMIDDELDE_AMBITIES = {
    gezondSchool: 66, duurzameSchool: 70, adaptieveSchool: 64, veiligSchool: 72, digitaleSchool: 68, inclusiefSchool: 52
  };

  // ── Formatting ───────────────────────────────────────────────────────────────

  function formatEuro(n) {
    return '€\u202F' + n.toLocaleString('nl-NL');
  }

  function formatM2(n) {
    return n.toLocaleString('nl-NL') + ' m²';
  }

  return {
    calcPrimairBVO, calcOnderbouwplein, calcBovenbouwplein, calcFietsenstalling,
    calcVoorschoolseBVO, calcVoorschoolsePlein, calcVoorschoolseFietsen,
    calcSportBVO, calcTotalBVO, calcDashboard, calcAmbitieScores,
    GEMIDDELDE_AMBITIES, SPORT_BVO, formatEuro, formatM2, selectionScore, itemScore, toRadarScore
  };
})();
