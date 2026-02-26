/* ── POM Ruimtestaat Calculator ─────────────────────────────────────────────
   Converts the Excel "Rekenmodel Ruimtestaat.xlsx" calculation logic to JS.

   Source sheets:
     - Vragenlijst        → input cell references (D4, D6, D7, D15–D41)
     - Rekenmodel (achter)→ all formulas (C4–C123, I4–J30)
     - Dropdowns          → allowed values per field

   Usage:
     const result = RUIMTESTAAT_CALC.compute(inputs);
     // result = { budget, netBudget, totaalGebruikt, clusters }
     // clusters shape matches ruimtestaat_compact.json
─────────────────────────────────────────────────────────────────────────── */

const RUIMTESTAAT_CALC = (function () {

  // Fixed constants from "Rekenmodel (achterkant)" sheet
  const K = {
    bvoPerStudent:    5.03,   // C4 — m² BVO per leerling
    bvoBase:          200,    // C5 — vaste voet BVO
    studentsPerClass: 30,     // C11
    m2PerStudent:     2,      // C17 — m² per leerling in lokaal/leerplein
    m2PerTeacher:     4,      // C18 — m² per leerkracht
    m2PerFTE:         2,      // C31 — m² per FTE teamruimte
    m2PerSeat:        0.5,    // C37 — m² per persoon ontmoetingsruimte
    podiumSize:       16,     // C41 — vaste podiumruimte (altijd inbegrepen)
    speellokaalSize:  90,     // fixed
    trafficPct:       0.10,   // I5 — % verkeersruimten
    constructionPct:  0.20,   // I6 — % constructie
  };

  const roundUp = x => Math.ceil(x);
  const round   = x => Math.round(x);

  // Build a room record (matches compact JSON format)
  const room = (name, aantal, oppervlakte) => ({
    name,
    aantal:      String(aantal),
    oppervlakte: String(oppervlakte),
  });

  function compute(inp) {
    // ── Resolve inputs with defaults ────────────────────────────────────────
    const leerlingen      = parseInt(inp.leerlingen)      || 240;
    const fte             = parseInt(inp.fte)             || 12;
    const clusterType     = inp.clusters                  || '2 clusters OB+BB';
    const extraLokalen    = parseInt(inp.extraLokalen)    || 0;
    const leerpleinPct    = parseFloat(inp.leerpleinPercentage) || 0.30;
    const cor             = inp.centraleOntmoetingsruimte || 'Hele cluster';
    const speellokaal     = inp.speellokaal               || 'Ja';
    const bibliotheek     = inp.bibliotheek               || 'Nee';
    const biblioGrootte   = inp.bibliotheekGrootte        || 'Kwart klas';
    const creatiefTech    = inp.creatiefTechniek          || 'Nee';
    const kantoorFormaat  = inp.kantoorFormaat            || 'Basis (8m²)';
    const prikkelarmAantal = Math.max(0, parseInt(inp.aantalPrikkelarm) || 1);
    const prikkelarmGrootte = inp.prikkelarmGrootte       || '8 m² (1-2 kinderen)';
    const zorgBehandel    = inp.zorgBehandel              || 'Nee';
    const wasDroog        = inp.wasDroog                  || 'Nee';
    const bergruimteFormaat = inp.bergruimteFormaat       || 'Basis (3m²)';
    const printKopie      = inp.printKopie                || 'Ja';
    const ehboKolfRust    = inp.ehboKolfRust              || 'Ja';
    const spreekruimteFormaat = inp.spreekruimteFormaat   || 'Basis (12m²)';

    // ── Space budget (C7/C8/I4–I8) ──────────────────────────────────────────
    const budget    = leerlingen * K.bvoPerStudent + K.bvoBase;       // C7
    const netBudget = budget * (1 - K.trafficPct - K.constructionPct); // I8

    // ── Classrooms (C11–C20) ─────────────────────────────────────────────────
    const klasGrootte   = K.studentsPerClass * K.m2PerStudent + K.m2PerTeacher; // C19 = 64
    const baseKlassen   = roundUp(leerlingen / K.studentsPerClass);               // C12
    const totaalLokalen = baseKlassen + extraLokalen;                              // C14

    // ── Cluster distribution (C23–C28) ───────────────────────────────────────
    let obLokalen = 0, mbLokalen = 0, bbLokalen = 0;
    if (clusterType === '1 cluster') {
      obLokalen = totaalLokalen;
    } else if (clusterType === '2 clusters OB+BB') {
      obLokalen = parseInt(inp.aantalLokalenOB) || roundUp(totaalLokalen / 2);
      bbLokalen = parseInt(inp.aantalLokalenBB) || Math.floor(totaalLokalen / 2);
    } else { // 3 clusters OB+MB+BB
      obLokalen = parseInt(inp.aantalLokalenOB) || roundUp(totaalLokalen / 3);
      mbLokalen = parseInt(inp.aantalLokalenMB) || round(totaalLokalen / 3);
      bbLokalen = parseInt(inp.aantalLokalenBB) || Math.floor(totaalLokalen / 3);
    }
    const maxCluster = Math.max(obLokalen, mbLokalen, bbLokalen); // C28

    // ── Teamruimte (C31–C33) ────────────────────────────────────────────────
    const teamruimteOpp = fte * K.m2PerFTE; // C33

    // ── Centrale ontmoetingsruimte (C36–C42) ─────────────────────────────────
    let meetingUsers;
    if      (cor === 'Hele klas')    meetingUsers = K.studentsPerClass + 1;
    else if (cor === 'Hele cluster') meetingUsers = maxCluster * K.studentsPerClass + maxCluster;
    else                             meetingUsers = leerlingen + fte; // Hele school
    const corOpp = round(K.podiumSize + meetingUsers * K.m2PerSeat); // C42

    // ── Leerpleinen (C46–C52): per cluster ──────────────────────────────────
    // C50 = (obLokalen × 30 × pct) × 2 + (obLokalen × 4)
    const leerplein = n => n > 0
      ? round((n * K.studentsPerClass * leerpleinPct * K.m2PerStudent) + (n * K.m2PerTeacher))
      : 0;

    // ── Toiletten kinderen (C105–C108): 2 per 3 lokalen, 2.5 m² each ────────
    const toilettenKinderen = n => n > 0 ? roundUp(n / 3 * 2) : 0;

    // ── Toiletten personeel (C110–C113): 1 per 15 FTE, 2.5 m² each ─────────
    const personeelToiletten = Math.max(1, roundUp(fte / 15));

    // ── Bergruimte formaat (C92–C93) ─────────────────────────────────────────
    const bergruimteSizes = { 'Basis (3m²)': 3, 'Middel (6m²)': 6, 'Groot (12m²)': 12 };
    const bergruimteOpp = bergruimteSizes[bergruimteFormaat] || 3;

    // ── Prikkelarme ruimten (C79–C81) ────────────────────────────────────────
    // C79: if leerlingen > 200, at least 1
    const prikkelarmCount = leerlingen > 200 ? Math.max(1, prikkelarmAantal) : prikkelarmAantal;
    const prikkelarmSizes = { '8 m² (1-2 kinderen)': 8, '16 m² (3-4 kinderen)': 16, '32 m² (4-8 kinderen)': 32 };
    const prikkelarmOpp = prikkelarmSizes[prikkelarmGrootte] || 8;

    // ── Kantoorruimten (C71–C76) ─────────────────────────────────────────────
    // C71: ≤200 → 2, ≤350 → 3, else 4
    const kantoorCount = leerlingen <= 200 ? 2 : leerlingen <= 350 ? 3 : 4;
    const kantoorOpp   = kantoorFormaat === 'Groot (16m²)' ? 16 : 8;

    // ── Spreekruimten (C119–C123) ─────────────────────────────────────────────
    // C119: <200 → 2, <350 → 3, else 4
    const spreekruimteCount = leerlingen < 200 ? 2 : leerlingen < 350 ? 3 : 4;
    const spreekruimteOpp   = spreekruimteFormaat === 'Groot (24m²)' ? 24 : 12;

    // ── Bibliotheek (C63–C64) ────────────────────────────────────────────────
    const biblioSizes = {
      'Kwart klas': round(klasGrootte * 0.25),
      'Halve klas': round(klasGrootte * 0.50),
      'Hele klas':  klasGrootte,
    };
    const biblioOpp = biblioSizes[biblioGrootte] || round(klasGrootte * 0.25);

    // ── Assemble clusters ────────────────────────────────────────────────────
    const clusterList = [];

    // Onderbouw (or single cluster)
    if (obLokalen > 0) {
      const cname = clusterType === '1 cluster' ? 'Cluster' : 'ClusterOnderbouw';
      clusterList.push({
        name: cname,
        verdiepingrestrictie: true,
        relations: [{ connection: 'Centrale ruimten' }],
        rooms: [
          room('Groepsruimte',           obLokalen,                   klasGrootte),
          room('Leerplein',              1,                           leerplein(obLokalen)),
          room('Bergruimte; algemeen',   1,                           bergruimteOpp),
          room('Toiletruimte; kinderen', toilettenKinderen(obLokalen), 2.5),
        ],
      });
    }

    // Middenbouw
    if (mbLokalen > 0) {
      clusterList.push({
        name: 'Middenbouw',
        verdiepingrestrictie: false,
        relations: [{ connection: 'Centrale ruimten' }],
        rooms: [
          room('Groepsruimte',           mbLokalen,                   klasGrootte),
          room('Leerplein',              1,                           leerplein(mbLokalen)),
          room('Bergruimte; algemeen',   1,                           bergruimteOpp),
          room('Toiletruimte; kinderen', toilettenKinderen(mbLokalen), 2.5),
        ],
      });
    }

    // Bovenbouw
    if (bbLokalen > 0) {
      clusterList.push({
        name: 'Bovenbouw',
        verdiepingrestrictie: false,
        relations: [{ connection: 'Centrale ruimten' }],
        rooms: [
          room('Groepsruimte',           bbLokalen,                   klasGrootte),
          room('Leerplein',              1,                           leerplein(bbLokalen)),
          room('Bergruimte; algemeen',   1,                           bergruimteOpp),
          room('Toiletruimte; kinderen', toilettenKinderen(bbLokalen), 2.5),
        ],
      });
    }

    // Centrale ruimten — always present
    const centraleRooms = [
      room('Techniekruimte',                       1, 2),
      room('Patchkast/netwerkruimte ICT',          1, 2),
      room('Meterkast',                            1, 2),
      room('Hoofdentree/tochtportaal',             1, 4),
      room('Toiletruimte; integraal toegankelijk', 1, 4),
      room('Werkkast',                             2, 3),
      room('Centrale ontmoetingsruimte',           1, corOpp),
    ];
    if (prikkelarmCount > 0) {
      centraleRooms.push(room('Prikkelarme plek(ken)', prikkelarmCount, prikkelarmOpp));
    }
    if (speellokaal === 'Ja') {
      centraleRooms.push(room('Speellokaal',            1, K.speellokaalSize));
      centraleRooms.push(room('Bergruimte; speellokaal', 1, 6));
    }
    if (bibliotheek === 'Ja') {
      centraleRooms.push(room('Bibliotheek/mediaruimte', 1, biblioOpp));
    }
    if (creatiefTech === 'Ja') {
      centraleRooms.push(room('Creatief/techniekruimte', 1, klasGrootte));
    }

    const centraleRelations = [];
    if (obLokalen > 0) centraleRelations.push({ connection: clusterType === '1 cluster' ? 'Cluster' : 'ClusterOnderbouw' });
    if (mbLokalen > 0) centraleRelations.push({ connection: 'Middenbouw' });
    if (bbLokalen > 0) centraleRelations.push({ connection: 'Bovenbouw' });
    centraleRelations.push({ connection: 'Personeel en ondersteuning' });

    clusterList.push({
      name: 'Centrale ruimten',
      verdiepingrestrictie: true,
      relations: centraleRelations,
      rooms: centraleRooms,
    });

    // Personeel en ondersteuning
    const personeelRooms = [
      room('Teamruimte',              1,                  round(teamruimteOpp)),
      room('Kantoorruimte',           kantoorCount,       kantoorOpp),
      room('IB en ondersteuning',     spreekruimteCount,  8),
      room('Onderwijsassistent',      1,                  10),
      room('Spreekruimte',            spreekruimteCount,  spreekruimteOpp),
      room('Bergruimte; algemeen',    1,                  bergruimteOpp),
      room('Toiletruimte; personeel', personeelToiletten, 2.5),
    ];
    if (printKopie  === 'Ja') personeelRooms.push(room('Reprovoorziening',       1, 8));
    if (ehboKolfRust === 'Ja') personeelRooms.push(room('EHBO-/kolf-/rustruimte', 1, 10));
    if (zorgBehandel === 'Ja') personeelRooms.push(room('Zorg- en behandelruimte', 1, 16));
    if (wasDroog    === 'Ja') personeelRooms.push(room('Was- en droogruimte',    1, 8));

    clusterList.push({
      name: 'Personeel en ondersteuning',
      verdiepingrestrictie: false,
      relations: [{ connection: 'Centrale ruimten' }],
      rooms: personeelRooms,
    });

    // ── Totals ───────────────────────────────────────────────────────────────
    let totaalGebruikt = 0;
    clusterList.forEach(cl =>
      cl.rooms.forEach(r => {
        totaalGebruikt += parseFloat(r.aantal) * parseFloat(r.oppervlakte);
      })
    );

    return {
      budget:         round(budget),
      netBudget:      round(netBudget),
      totaalGebruikt: round(totaalGebruikt),
      clusters:       clusterList,
    };
  }

  return { compute };

})();
