// ── POM Calculations ──────────────────────────────────────────────────────────
// Exposed as window.POM_CALC so all pages can use it via <script src>

window.POM_CALC = (() => {

  // ── BVO Formulas ────────────────────────────────────────────────────────────

  function calcPrimairBVO(leerlingen) {
    // 400 leerlingen → 2255 m²  (factor 5.6375)
    return Math.round(leerlingen * 5.6375);
  }

  function calcKleuterplein(leerlingen) {
    return Math.round(leerlingen * 2.25);
  }

  function calcKinderplein(leerlingen) {
    return Math.round(leerlingen * 3.5);
  }

  function calcFietsenstalling(leerlingen) {
    // returns aantal fietsen
    return Math.round(leerlingen * 0.75);
  }

  function calcVoorschoolseBVO(groepen) {
    // 2 groepen → 230 m²  (factor 115)
    return Math.round(groepen * 115);
  }

  function calcVoorschoolsePlein(groepen) {
    return Math.round(groepen * 50);
  }

  function calcVoorschoolseFietsen(groepen) {
    return Math.round(groepen * 10);
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

  function calcDashboard(voorzieningen) {
    const totalBVO   = calcTotalBVO(voorzieningen);
    const bouwkosten = Math.round(totalBVO * 2500);          // €2,500 per m²
    const tco        = Math.round(bouwkosten * 2.2);         // 50-year placeholder
    return { totalBVO, bouwkosten, tco };
  }

  // ── Ambitie Scores ───────────────────────────────────────────────────────────

  // Maps selection label to 0-100 score
  function selectionScore(val) {
    const map = {
      // frisse scholen
      'C': 33, 'B': 67, 'A': 100,
      // goed/beter/beste
      'Goed': 33, 'Beter': 67, 'Beste': 100
    };
    return map[val] ?? 67;
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
    };
  }

  // Fixed placeholder "gemiddelde ambities" (orange layer)
  const GEMIDDELDE_AMBITIES = {
    gezondSchool: 58, duurzameSchool: 63, adaptieveSchool: 55, veiligSchool: 65, digitaleSchool: 60
  };

  // ── Formatting ───────────────────────────────────────────────────────────────

  function formatEuro(n) {
    return '€\u202F' + n.toLocaleString('nl-NL');
  }

  function formatM2(n) {
    return n.toLocaleString('nl-NL') + ' m²';
  }

  return {
    calcPrimairBVO, calcKleuterplein, calcKinderplein, calcFietsenstalling,
    calcVoorschoolseBVO, calcVoorschoolsePlein, calcVoorschoolseFietsen,
    calcSportBVO, calcTotalBVO, calcDashboard, calcAmbitieScores,
    GEMIDDELDE_AMBITIES, SPORT_BVO, formatEuro, formatM2, selectionScore
  };
})();
