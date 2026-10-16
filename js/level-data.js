'use strict';

// =====================================================================
//  LEVEL-DATEN: Texte, Steuerungshinweise, Inhalte und Layouts der vier Schritte
// =====================================================================

const STAGES = Object.freeze({
  1: {
    sceneKey: SCENES.lecture,
    music: 'upbeat',
    title: 'Schritt 1/4 – Die Vorlesung',
    hudLabel: 'Schritt 1/4 · Vorlesung',
    text: 'Der Dozent schreibt an die Tafel. Sobald er dir den Rücken zudreht: Handy raus und scrollen, ' +
      'bis dein Dopamin-Meter voll ist. Dreht er sich um – Handy WEG! Werbung musst du erst abwarten, ' +
      'bevor du sie überspringen kannst. Ab der Hälfte wird er misstrauisch …',
    touchLayout: 'lecture',
    controls: [
      'Handy raus (halten):  ↓ / S   ·   Controller: Stick / Steuerkreuz nach unten',
      'Scrollen (spammen) / Werbung überspringen:  LEERTASTE   ·   Controller: A / B / X / Y'
    ],
    touchControls: [
      'Handy raus: 📱-Button links gedrückt halten',
      'Scrollen / Werbung überspringen: 👆-Button rechts antippen'
    ],
    hint: '↓ / S halten = Handy raus  ·  LEERTASTE spammen = scrollen',
    touchHint: '📱 halten = Handy raus  ·  👆 antippen = scrollen'
  },
  2: {
    sceneKey: SCENES.sneak,
    music: 'sneaky',
    title: 'Schritt 2/4 – Raus aus dem Hörsaal',
    hudLabel: 'Schritt 2/4 · Raus aus dem Hörsaal',
    text: 'Sammle alle ECTS – erst dann geht die Tür unten links auf. Der Dozent läuft durch die Gänge und ' +
      'kommt sofort nachsehen, wenn es raschelt! Herzen füllen verlorene Leben auf, mit dem DHBW-Schirm ' +
      'schlägst du später Papierflieger weg. Kommilitonen verdecken dich immer, Tische nur geduckt.',
    touchLayout: 'sneak',
    controls: [
      'Bewegen:  Pfeiltasten / WASD   ·   Controller: Stick / Steuerkreuz',
      'Ducken & schleichen (halten):  LEERTASTE   ·   Controller: A / B / X / Y'
    ],
    touchControls: [
      'Bewegen: Finger aufs Spielfeld legen – du läufst dorthin',
      'Ducken & schleichen: 🤫-Button rechts gedrückt halten'
    ],
    hint: 'LEERTASTE halten = ducken & schleichen  ·  Erst alle ECTS, dann zur Tür unten links',
    touchHint: '👆 Finger halten = dorthin laufen  ·  🤫 halten = schleichen  ·  Erst alle ECTS, dann zur Tür unten links'
  },
  3: {
    sceneKey: SCENES.platform,
    music: 'upbeat',
    title: 'Schritt 3/4 – Das Treppenhaus',
    hudLabel: 'Schritt 3/4 · Treppenhaus',
    text: 'Vom 3. OG runter bis zum Ausgang im EG. Weich Dozenten, Putzwagen und Papierfliegern aus, ' +
      'sammle ECTS und Herzen. Kaffee gibt dir kurz einen Doppelsprung!',
    touchLayout: 'platform',
    controls: [
      'Laufen:  ← → / A D   ·   Controller: Stick / Steuerkreuz',
      'Springen:  ↑ / W   ·   Controller: A / B'
    ],
    touchControls: [
      'Laufen: ◀ ▶ links',
      'Springen: ⤒-Button rechts'
    ],
    hint: null,
    touchHint: null
  },
  4: {
    sceneKey: SCENES.kart,
    music: 'upbeat',
    title: 'Schritt 4/4 – Ab nach Hause!',
    hudLabel: 'Schritt 4/4 · Heimfahrt',
    text: 'Die DHBW liegt hinter dir – jetzt mit dem Kart nach Hause! Nimm die Kurven, weich Autos und ' +
      'Pylonen aus und bleib auf der Straße. Kaffee gibt Turbo, Herzen retten Leben. ' +
      'Erst hinter der Ziellinie vor deinem Zuhause hast du es geschafft!',
    touchLayout: 'kart',
    controls: [
      'Lenken: ← → / A D · Gas: ↑ / W / LEERTASTE · Bremsen: ↓ / S',
      'Controller: Stick / Steuerkreuz lenken · A / B / X / Y = Gas · unten = Bremse'
    ],
    touchControls: [
      'Lenken: ◀ ▶ links · GAS rechts gedrückt halten',
      'BREMSEN rechts · Kaffee einsammeln = Turbo'
    ],
    hint: '↑ / W / LEERTASTE halten = Gas · ← → lenken · ↓ bremsen · Kaffee = Turbo',
    touchHint: 'GAS halten · ◀ ▶ lenken · BREMSEN zum Abbremsen · Kaffee = Turbo'
  }
});

// ---------- Schritt 1: Inhalte für den Handy-Feed ----------
// Eigene Memes in assets/memes/ ablegen und hier eintragen (JPG, PNG oder GIF)
const MEME_FOLDER = 'assets/memes/';
const MEME_FILES = Object.freeze([
  'IMG_0010.JPG',
  'IMG_0011.JPG',
  'IMG_0012.JPG',
  'IMG_0016.JPG',
  'IMG_0018.JPG',
  'IMG_0025.GIF'
]);

const ADS = Object.freeze([
  { emoji: '🎓', title: 'Master an der DHBW', text: 'Noch mehr Vorlesungen! Jetzt bewerben.', color: 0x2d6cdf },
  { emoji: '☕', title: 'Mensa-Kaffee', text: 'Schmeckt wie immer. Kostet jetzt mehr.', color: 0x6b3e1e },
  { emoji: '💻', title: 'Eclipse Pro', text: 'Jetzt mit noch mehr Plugins!', color: 0x7b5cff },
  { emoji: '⚡', title: 'Energy Drink', text: 'Klausur-Edition: 0 % Schlaf, 100 % Panik.', color: 0x23c4a7 },
  { emoji: '📚', title: 'Nachhilfe TI III', text: 'Automaten verstehen in nur 3 Semestern!', color: 0xd97706 },
  { emoji: '🏠', title: 'WG-Zimmer Stuttgart', text: '9 m², 890 € warm. Nur heute!', color: 0xe11d48 }
]);

// Klausurthemen, die der Dozent an die Tafel schreibt (Titel + bis zu 4 Zeilen)
const BOARD_TOPICS = Object.freeze([
  {
    title: 'Pumping-Lemma (reguläre Sprachen)',
    lines: ['Zu jeder regulären Sprache L gibt es ein n, sodass', 'jedes w ∈ L mit |w| ≥ n zerfällt in w = xyz mit', '|xy| ≤ n, |y| ≥ 1 und xyⁱz ∈ L für alle i ≥ 0.', '⇒ L = { aⁿbⁿ | n ≥ 0 } ist NICHT regulär!']
  },
  {
    title: 'Chomsky-Hierarchie',
    lines: ['Typ 3: regulär → DEA / NEA / reg. Ausdruck', 'Typ 2: kontextfrei → Kellerautomat', 'Typ 1: kontextsensitiv → linear beschr. Automat', 'Typ 0: rekursiv aufzählbar → Turingmaschine']
  },
  {
    title: 'DEA vs. NEA',
    lines: ['DEA: genau ein Folgezustand pro Zeichen', 'NEA: beliebig viele Folgezustände, auch ε', 'Potenzmengenkonstruktion: NEA → DEA', 'Worst Case: 2ⁿ Zustände!!']
  },
  {
    title: 'Das Halteproblem',
    lines: ['H = { ⟨M, w⟩ | M hält bei Eingabe w }', 'H ist semi-entscheidbar,', 'aber NICHT entscheidbar (Diagonalisierung)', '→ kommt zu 100 % in der Klausur dran']
  },
  {
    title: 'P vs. NP',
    lines: ['P: in Polynomialzeit lösbar', 'NP: Lösung in Polynomialzeit überprüfbar', 'SAT ist NP-vollständig (Satz von Cook)', 'P = NP? → 1 Mio. Dollar Preisgeld']
  },
  {
    title: 'CYK-Algorithmus',
    lines: ['löst das Wortproblem für kontextfreie Sprachen', 'Grammatik zuerst in Chomsky-Normalform bringen', 'Tabelle von unten nach oben füllen', 'Laufzeit: O(n³ · |G|)']
  },
  {
    title: 'Kellerautomat (PDA)',
    lines: ['K = (Q, Σ, Γ, δ, q₀, #, F)', 'Übergang hängt vom obersten Kellerzeichen ab', 'erkennt genau die kontextfreien Sprachen', 'z. B. korrekt geklammerte Ausdrücke']
  }
]);

// ---------- Schritt 1: Ego-Ansicht des Hörsaals ----------
const LECTURE_LAYOUT = Object.freeze({
  board: { x: 240, y: 70, w: 480, h: 180 },
  lecturer: { startX: 480, feetY: 335, minX: 260, maxX: 700 },
  clock: { x: 790, y: 110, radius: 26 },
  phone: { x: 760, hiddenY: 730, shownY: 320, screenWidth: 180, screenHeight: 290 },
  meter: { x: 50, top: 110, height: 300 },
  bubbleY: 95
});

// ---------- Schritt 2: Hörsaal von oben ----------
const SNEAK_LAYOUT = Object.freeze({
  room: { x: 80, y: 70, w: 800, h: 440 },
  wall: 20,
  door: { x: 100, w: 90 },
  board: { x: 260, w: 440 },
  deskRows: [150, 235, 320, 405],
  deskCols: [{ x: 150, w: 190 }, { x: 380, w: 200 }, { x: 620, w: 190 }],
  deskHeight: 22,
  studentSpacing: 42,
  emptySeatChance: 0.35,
  seat: { x: 480, y: 272 },
  backpacks: [
    { x: 360, y: 300 }, { x: 600, y: 215 }, { x: 115, y: 380 }, { x: 115, y: 250 },
    { x: 260, y: 470 }, { x: 470, y: 470 }, { x: 600, y: 385 }, { x: 845, y: 290 }, { x: 845, y: 430 }
  ],
  ects: [
    { x: 115, y: 130 },   // vorne links – nah an der Tafel
    { x: 845, y: 160 },   // rechter Gang oben
    { x: 250, y: 217 },   // Quergang hinter der ersten Reihe
    { x: 600, y: 330 },   // mittlerer Gang
    { x: 760, y: 482 }    // hinten rechts
  ],
  hearts: [
    { x: 480, y: 128 },   // direkt vor der Tafel – nur wenn er wegschaut
    { x: 845, y: 482 }    // hinten rechts in der Ecke
  ],
  umbrella: { x: 720, y: 122 },   // DHBW-Schirm: vorne rechts, direkt am Laufweg des Dozenten
  lecturerY: 105,
  lecturerMinX: 200,
  lecturerMaxX: 760,
  // Laufwege des Dozenten: senkrechte Gänge und waagrechte Quergänge
  aisleXs: [115, 360, 600, 845],
  midY: [217, 302, 387],
  backY: 482
});

// ---------- Schritt 3: Treppenhaus von der Seite ----------
// Jeder Flur: Räume an der Rückwand (Tür, Glaswand, Schwarzes Brett, Fenster, Wandschild)
const LEVEL3 = Object.freeze({
  floors: [
    {
      label: '3. OG', y: 380, x0: 0, x1: 1600,
      rooms: [
        { kind: 'door', x: 150, number: '3.12', name: 'Seminarraum' },
        { kind: 'glass', x: 330, width: 240, number: '3.14', name: 'Theoretische Informatik III' },
        { kind: 'board', x: 700 },
        { kind: 'door', x: 900, number: 'WC', name: 'Toiletten' },
        { kind: 'door', x: 1300, number: '3.20', name: 'Dozentenbüro' }
      ]
    },
    {
      label: '2. OG', y: 740, x0: 2050, x1: 3700,
      rooms: [
        { kind: 'door', x: 2200, number: '2.01', name: 'Prüfungsamt – Sprechzeiten: nie' },
        { kind: 'glass', x: 2450, width: 260, number: '2.05', name: 'PC-Pool' },
        { kind: 'door', x: 2760, number: '2.14', name: 'Datenbanken' },
        { kind: 'board', x: 3200 },
        { kind: 'window', x: 3420 }
      ]
    },
    {
      label: '1. OG', y: 1100, x0: 4150, x1: 5800,
      rooms: [
        { kind: 'door', x: 4300, number: '1.02', name: 'Sekretariat' },
        { kind: 'window', x: 4480 },
        { kind: 'glass', x: 4950, width: 260, number: '1.10', name: 'Bibliothek – Bitte leise!' },
        { kind: 'door', x: 5400, number: '1.18', name: 'Studierendenvertretung' },
        { kind: 'sign', x: 5640, text: 'MENSA ↓' }
      ]
    },
    {
      label: 'EG', y: 1460, x0: 6250, x1: 7700,
      rooms: [
        { kind: 'glass', x: 6380, width: 240, number: 'EG', name: 'Cafeteria im Atrium' },
        { kind: 'board', x: 6960 },
        { kind: 'door', x: 7110, number: '0.07', name: 'Hausmeister' },
        { kind: 'sign', x: 7350, text: 'AUSGANG →' }
      ]
    }
  ],
  platforms: [
    { x: 0, y: 380, w: 1600 },
    { x: 2050, y: 740, w: 1650 },
    { x: 4150, y: 1100, w: 550 },
    { x: 4850, y: 1100, w: 950 },
    { x: 6250, y: 1460, w: 1450 }
  ],
  stairs: [
    { x0: 1600, y0: 380, x1: 2050, y1: 740, steps: 9 },
    { x0: 3700, y0: 740, x1: 4150, y1: 1100, steps: 9 },
    { x0: 5800, y0: 1100, x1: 6250, y1: 1460, steps: 9 }
  ],
  lightwell: { x0: 4700, x1: 4850, y: 1100 },
  checkpoints: [
    { x: 60, y: 330, fromX: 0 },
    { x: 2090, y: 690, fromX: 2070 },
    { x: 4190, y: 1050, fromX: 4170 },
    { x: 4890, y: 1050, fromX: 4870 },
    { x: 6290, y: 1410, fromX: 6270 }
  ],
  lecturers: [
    { x: 600, y: 380, minX: 500, maxX: 950, speed: 70 },
    { x: 2500, y: 740, minX: 2400, maxX: 2850, speed: 90 },
    { x: 3300, y: 740, minX: 3200, maxX: 3600, speed: 100 },
    { x: 5400, y: 1100, minX: 5300, maxX: 5750, speed: 110 },
    { x: 7100, y: 1460, minX: 7000, maxX: 7450, speed: 120 }
  ],
  carts: [
    { x: 6500, y: 1460, minX: 6400, maxX: 6900, speed: 130 }
  ],
  chairs: [{ x: 1200, y: 380 }, { x: 2300, y: 740 }],
  tables: [{ x: 1020, y: 380 }, { x: 3000, y: 740 }],
  slippery: { x0: 5050, x1: 5250, y: 1100 },
  coffees: [{ x: 2150, y: 690 }, { x: 6340, y: 1410 }],
  hearts: [{ x: 3000, y: 668 }, { x: 4950, y: 1060 }, { x: 6750, y: 1340 }],
  coins: [
    // 3. OG
    [200, 345], [240, 345], [280, 345], [560, 300], [600, 280], [640, 300], [1020, 300],
    [880, 345], [1150, 300], [1200, 270], [1250, 300], [1450, 345], [1500, 345],
    [1700, 440], [1850, 520], [1980, 665],
    // 2. OG
    [2300, 610], [2550, 690], [2625, 660], [2700, 690], [3080, 700],
    [3300, 700], [3400, 680], [3500, 700], [3800, 820], [3950, 940], [4080, 1050],
    // 1. OG
    [4300, 1065], [4400, 1065], [4680, 1000], [4730, 960], [4775, 950], [4820, 960], [4870, 1000],
    [5100, 1065], [5200, 1065], [5450, 1040], [5550, 1020], [5650, 1040],
    [5900, 1180], [6050, 1300], [6180, 1410],
    // EG
    [6550, 1400], [6650, 1380], [7150, 1400], [7250, 1380], [7350, 1400]
  ],
  door: { x: 7600, y: 1460 }
});

// ---------- Schritt 4: Eine Strecke von der DHBW bis zur Haustür ----------
// x ist relativ zur Straßenmitte: -1 = linker Rand, +1 = rechter Rand.
// Kurven laufen weich ein und aus. Die letzte Gerade führt durch die Ziellinie.
const LEVEL4 = Object.freeze({
  length: 2600,
  sections: [
    { end: 320, curve: 0, label: 'DHBW CAMPUS' },
    { end: 660, curve: 0.85, label: 'STADTRAND' },
    { end: 1010, curve: -1, label: 'DURCH DEN WALD' },
    { end: 1320, curve: 0.65, label: 'SOFA IN SICHT?' },
    { end: 1650, curve: -0.85, label: 'FAST FEIERABEND' },
    { end: 1990, curve: 0.9, label: 'RICHTUNG ZUHAUSE' },
    { end: 2290, curve: -0.5, label: 'DEIN VIERTEL' },
    { end: 2600, curve: 0, label: 'ZUHAUSE!' }
  ],
  objects: [
    { z: 150, x: -0.5, kind: 'ects' }, { z: 190, x: -0.5, kind: 'ects' },
    { z: 280, x: 0.5, kind: 'cone' }, { z: 400, x: -0.45, kind: 'coffee' },
    { z: 510, x: -0.55, kind: 'car' }, { z: 630, x: 0.45, kind: 'ects' },
    { z: 670, x: 0.45, kind: 'ects' }, { z: 790, x: 0.55, kind: 'cone' },
    { z: 900, x: -0.5, kind: 'heart' }, { z: 1030, x: -0.45, kind: 'car' },
    { z: 1160, x: 0.5, kind: 'coffee' }, { z: 1300, x: 0.55, kind: 'cone' },
    { z: 1390, x: -0.5, kind: 'ects' }, { z: 1430, x: -0.5, kind: 'ects' },
    { z: 1550, x: -0.55, kind: 'cone' }, { z: 1680, x: 0.45, kind: 'car' },
    { z: 1820, x: -0.5, kind: 'coffee' }, { z: 1960, x: 0.5, kind: 'heart' },
    { z: 2100, x: -0.5, kind: 'car' }, { z: 2210, x: 0.5, kind: 'cone' },
    { z: 2330, x: 0, kind: 'ects' }, { z: 2370, x: 0, kind: 'ects' },
    { z: 2410, x: 0, kind: 'coffee' }
  ]
});
