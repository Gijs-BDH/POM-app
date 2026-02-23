// BVO Calculations - placeholder formulas

export function calcPrimairOnderwijs(leerlingen) {
  const n = Number(leerlingen) || 0
  return {
    bvo: Math.round(n * 5.6375),
    kleuterplein: Math.round(n * 2.25),
    kinderplein: Math.round(n * 3.5),
    fietsenstalling: Math.round(n * 0.75),
  }
}

export function calcVoorschoolseOpvang(groepen) {
  const n = Number(groepen) || 0
  return {
    bvo: Math.round(n * 115),
    plein: Math.round(n * 50),
    fietsenstalling: Math.round(n * 10),
  }
}

export const sportBVO = {
  gymzaal: 600,
  sportzaal: 1200,
  sporthal: 2400,
}

export function calcTotaalBVO(voorzieningen) {
  let totaal = 0

  const po = voorzieningen.primairOnderwijs
  if (po.actief) {
    totaal += Number(po.bvoHandmatig) || calcPrimairOnderwijs(po.leerlingen).bvo
  }

  const vso = voorzieningen.voorschoolseOpvang
  if (vso.actief) {
    totaal += Number(vso.bvoHandmatig) || calcVoorschoolseOpvang(vso.groepen).bvo
  }

  const sport = voorzieningen.sport
  if (sport.actief) {
    totaal += Number(sport.bvoHandmatig) || sportBVO[sport.type] || 0
  }

  return totaal
}

export function calcKosten(totaalBVO) {
  const bouwkosten = totaalBVO * 2500
  const tco = Math.round(bouwkosten * 2.2)
  return { bouwkosten, tco }
}

export function formatEuro(amount) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(amount)
}

// Radar score: maps quality selections to 0-100 score per dimension
const scoreMap = {
  "C": 33, "Goed": 33,
  "B": 67, "Beter": 67,
  "A": 100, "Beste": 100,
}

export function calcAmbitieScore(values) {
  const scores = Object.values(values).map(v => scoreMap[v] || 67)
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

export function calcAllAmbitieScores(ambities) {
  return {
    gezondSchool: calcAmbitieScore(ambities.gezondSchool),
    duurzameSchool: calcAmbitieScore(ambities.duurzameSchool),
    adaptieveSchool: calcAmbitieScore(ambities.adaptieveSchool),
    veiligSchool: calcAmbitieScore(ambities.veiligSchool),
    digitaleSchool: calcAmbitieScore(ambities.digitaleSchool),
  }
}

// Fixed placeholder average scores (orange line on radar)
export const gemiddeldeAmbities = {
  gezondSchool: 58,
  duurzameSchool: 63,
  adaptieveSchool: 55,
  veiligSchool: 65,
  digitaleSchool: 60,
}
