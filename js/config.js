'use strict';

// =====================================================================
//  ESCAPE DHBW – Konfiguration
//  Alle Zahlenwerte für Darstellung, Steuerung und Balancing an einer Stelle.
//  Positionen und Texte der einzelnen Level stehen in level-data.js.
// =====================================================================

// ---------- Allgemein ----------
const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;
const START_LIVES = 3;
const MAX_FRAME_MS = 50; // längere Frames (z. B. nach einem Tab-Wechsel) werden gekappt

// Auflösung: das Canvas wächst mit Fenster und Retina-Display (siehe core/display.js)
const DISPLAY = Object.freeze({
  maxRes: 3,          // höchstens 3-fache Auflösung (2880 × 1620)
  maxResTouch: 2,     // auf Handy/Tablet höchstens 2-fach – schont Akku und Grafikchip
  resStep: 0.25,      // Auflösung in Viertelschritten
  textureRes: 3       // erzeugte Texturen werden 3-fach gezeichnet und verkleinert angezeigt
});

const SCENES = Object.freeze({
  boot: 'BootScene',
  menu: 'MenuScene',
  intro: 'StageIntroScene',
  lecture: 'LectureScene',
  sneak: 'SneakScene',
  platform: 'PlatformScene',
  win: 'WinScene',
  gameOver: 'GameOverScene'
});

const TIMING = Object.freeze({
  fadeMs: 300,
  hintVisibleMs: 7000,
  introInputLockMs: 450,   // eine noch gehaltene Taste springt nicht sofort weiter
  resultInputLockMs: 800,
  stageExitDelayMs: 1700,
  gameOverDelayMs: 1100
});

const DEPTH = Object.freeze({
  hint: 800,
  hud: 900,
  effects: 950,
  banner: 980
});

// ---------- Darstellung ----------
const COLORS = Object.freeze({
  black: 0x111111,
  charcoal: 0x222222,
  darkGray: 0x3a3a3a,
  gray: 0x777777,
  midGray: 0x9a9a9a,
  lightGray: 0xcfcfcf,
  wall: 0xdedede,
  white: 0xf4f4f4,
  floor: 0x2d6cdf,
  floorDark: 0x1c4aa3,
  floorLight: 0x5b8ff0,
  skin: 0xe6bf98,
  suit: 0x4a4a4a,
  grayHair: 0x8f8f8f,
  accent: 0xffd23f,
  danger: 0xff3b3b,
  warning: 0xffa53b,
  dopamine: 0xff4fd8,
  success: 0x3ddc84,
  cone: 0xfff2a8,
  marker: 0x1d3f9e,
  wetFloor: 0xbfe3ff,
  glass: 0xbfe3ff
});

const CSS = Object.freeze({
  white: '#f4f4f4',
  gray: '#9a9a9a',
  darkGray: '#555555',
  black: '#111111',
  accent: '#ffd23f',
  danger: '#ff3b3b',
  dopamine: '#ff4fd8',
  success: '#3ddc84',
  marker: '#1d3f9e'
});

const FONT = '"Arial Black", "Trebuchet MS", Arial, sans-serif';
const FONT_BODY = '"Trebuchet MS", Arial, sans-serif';

const STORAGE_KEYS = Object.freeze({
  highscore: 'escapeDhbw.highscore',
  bestTime: 'escapeDhbw.bestTime'
});

// ---------- Steuerung ----------
// Tastatur:   Pfeiltasten / WASD bewegen, ↑ / W springen, LEERTASTE = Aktion (Scrollen, Ducken, Schirm)
// Controller: Stick / Steuerkreuz bewegen, A / B springen, X / Y = Schirm, A / B / X / Y = Aktion in Menüs
// Touch:      Bildschirm-Buttons (siehe core/touch.js)
// Mehrere Tasten pro Aktion sind möglich (Listen).
const CONTROLS = Object.freeze({
  keyboard: {
    left: ['LEFT', 'A'],
    right: ['RIGHT', 'D'],
    up: ['UP', 'W'],
    down: ['DOWN', 'S'],
    jump: ['UP', 'W'],
    action: ['SPACE'],
    swing: ['SPACE'],
    menu: ['ESC']
  },
  // Controller im "standard"-Mapping: 0 = unten, 1 = rechts, 2 = links, 3 = oben
  // (Switch Pro: B, A, Y, X) · 12–15 = Steuerkreuz · 8/9 = − / +
  gamepad: {
    left: [14],
    right: [15],
    up: [12],
    down: [13],
    jump: [0, 1, 12],
    action: [0, 1, 2, 3],
    swing: [2, 3],
    menu: [8, 9]
  },
  dpad: { up: 12, down: 13, left: 14, right: 15 },
  stickDeadzone: 0.25,
  downThreshold: 0.5       // ab diesem Ausschlag gilt "nach unten" (Handy in Schritt 1)
});

// ---------- Schritt 1: Vorlesung ----------
const LECTURE = Object.freeze({
  dopamineGoal: 100,
  scrollGainMin: 0.6,
  scrollGainMax: 1.0,
  viralChance: 0.1,
  viralGain: 4,
  decayPerSec: 1.0,          // nur solange das Handy unten ist
  decayDelayMs: 1200,        // so lange nach dem letzten Scroll sinkt das Dopamin nicht
  scrollCooldownMs: 110,     // max. ~9 Scrolls pro Sekunde, egal wie schnell gedrückt wird
  suspiciousAt: 0.5,         // ab 50 % Dopamin wird der Dozent misstrauisch
  phases: {
    calm: {
      writingMs: [2800, 4800],
      warningMs: [900, 1200],
      watchingMs: [1000, 1800],
      fakeChance: 0.1,
      quickTurnChance: 0
    },
    suspicious: {
      writingMs: [1600, 3000],
      warningMs: [600, 850],
      watchingMs: [1000, 1800],
      fakeChance: 0.25,
      quickTurnChance: 0.15  // dreht sich direkt nach dem Wegdrehen gleich nochmal um
    }
  },
  suspicionRamp: { writing: 0.15, warning: 0.1 }, // bis 100 % wird er noch etwas schneller
  quickTurnMs: [700, 1000],
  returningMs: 260,
  phoneRaiseMs: 180,
  phoneLowerMs: 110,
  phoneUsableAt: 0.9,        // ab hier kann gescrollt werden
  catchThreshold: 0.12,      // ab hier sieht der Dozent das Handy
  caughtLockMs: 1600,        // Schonfrist nach dem Erwischtwerden
  phoneLockedMs: 1000,       // so lange bleibt das Handy danach unten
  keepWatchingMs: 1400,      // so lange schaut er danach noch in die Klasse
  caughtPenalty: 15,         // Dopamin-Abzug beim Erwischtwerden
  scrollScore: 10,
  viralScore: 50,
  postHeight: 230,
  memeChance: 0.75,          // Anteil echter Memes im Feed (Rest: generierte Posts)
  feedSmoothing: 0.018,
  // Werbung: blockiert das Scrollen, bis sie übersprungen werden kann
  firstAdAfterScrolls: [16, 22],
  adEveryScrolls: [24, 34],
  adWaitMs: [2000, 3000],    // läuft nur, solange das Handy oben ist
  streakWindowMs: 700,       // Scrolls in kurzem Abstand ergeben eine Combo
  streakBonusPerScroll: 0.02, // +2 % Dopamin pro Combo-Stufe …
  streakBonusMax: 20,        // … höchstens bis zur 20er-Combo
  streakMinToShow: 5,
  writeCharsPerSec: 9,       // so schnell schreibt der Dozent an die Tafel
  boardFullPauseMs: 2500,    // so lange bleibt eine volle Tafel stehen
});

// Effekte, die mit dem Dopamin-Pegel mitwachsen
const DOPAMINE_FX = Object.freeze({
  minSaturation: -0.85,      // bei 0 % fast schwarz-weiß
  maxSaturation: 1.0,        // bei 100 % knallbunt
  trippyAt: 0.75,            // ab hier flimmern die Farben
  maxHueShift: 45,           // Grad Farbverschiebung bei 100 %
  maxVignette: 0.3,          // dunkler Rand bei 0 %
  maxGlow: 0.12,
  maxZoomPunch: 0.03,
  maxMusicSpeedup: 0.3       // Musik bis zu 30 % schneller
});

// ---------- Schritt 2: Hörsaal ----------
const SNEAK = Object.freeze({
  // Spieler
  speed: 165,
  sneakSpeed: 80,
  respawnGraceMs: 1500,
  // Sichtkegel & Entdeckung
  coneRange: 430,
  coneHalfAngle: Phaser.Math.DegToRad(27),
  rays: 48,
  fillRate: 120,
  sneakFillFactor: 0.5,
  alertFillFactor: 1.5,
  decayRate: 45,
  bumpDistance: 30,
  // Geräusche
  noiseRadius: 120,
  noiseCooldownMs: 1500,
  backpackRadius: 26,
  // Dozent
  walkSpeed: 80,
  investigateSpeed: 105,     // so schnell läuft er zu einem Geräusch
  investigateMs: 2200,       // so lange sucht er dort
  investigateAmplitudeDeg: 35,
  boardWalkSpeed: 40,
  swayDeg: 25,
  scanAmplitudeDeg: 60,
  pauseAmplitudeDeg: 55,
  boardMs: [1800, 3200],
  scanMs: [2500, 4000],
  rowPauseMs: [1200, 2000],
  backPauseMs: [1200, 2200],
  alertMs: 600,              // kurzes Hinhören, bevor er losläuft
  caughtMs: 1400,
  frontScanChance: 0.35,     // schaut sich vor der Runde erst von vorne um
  shortRouteChance: 0.35,    // nur einen Gang halb runter und zurück
  ectsRequired: 5            // so viele ECTS braucht man, bevor die Tür aufgeht (0 = Tür immer offen)
});

// ---------- Schritt 3: Treppenhaus ----------
const PLATFORM = Object.freeze({
  worldWidth: 7700,
  worldHeight: 1700,
  gravity: 1150,
  maxFallSpeed: 900,
  runSpeed: 230,
  accel: 1800,
  slipperyAccel: 380,
  jumpVelocity: -560,
  doubleJumpVelocity: -480,
  jumpCutGravity: 1600,      // zusätzliche Schwerkraft, wenn Springen früh losgelassen wird
  coyoteMs: 110,
  jumpBufferMs: 130,
  invulnMs: 1500,
  coffeeMs: 7000,
  coffeeSpeedFactor: 1.25,
  coffeeScore: 100,
  planeIntervalMs: 2300,
  planeSpeed: 220,
  fallMargin: 40
});

// ---------- Punkte ----------
// DHBW-Regenschirm: aus Schritt 2 mitgenommen, wehrt in Schritt 3 Papierflieger ab
// Schwingen mit X (Tastatur) bzw. Y (Controller); nur der Schwung wehrt Flieger ab
const UMBRELLA = Object.freeze({
  swingMs: 220,              // Dauer des Schwungs (in dieser Zeit wehrt er ab)
  cooldownMs: 550,           // Pause nach jedem Schwung – kein Dauer-Spammen
  reach: 46,                 // Reichweite vor dem Spieler in Spielpunkten
  restAngle: -160,           // zugeklappt an der Seite, Spitze schräg nach hinten unten (wie ein Schwert)
  swingFrom: -40,            // Ausholen nach oben/hinten …
  swingTo: 125,              // … und nach vorne unten durchziehen
  deflectScore: 25,
  stunMs: 2500,              // so lange ist ein getroffener Dozent betäubt (und harmlos)
  stunScore: 50
});

const SCORING = Object.freeze({
  stageClear: 500,
  timeBonusBase: 6000,
  timeBonusPerSec: 30,
  lifeBonus: 750,
  caughtPenalty: 100,
  ects: 50,
  fullHeartBonus: 200        // Herz eingesammelt, obwohl alle Leben voll sind
});
