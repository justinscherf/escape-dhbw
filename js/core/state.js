'use strict';

// =====================================================================
//  SPIELZUSTAND – gilt über alle Szenen eines Durchlaufs hinweg
// =====================================================================

const GameState = {
  lives: START_LIVES,
  score: 0,
  elapsedMs: 0,
  catches: 0,
  ects: 0,
  stageTimes: [], // kumulierte Zeit am Ende jedes geschafften Schritts
  hasUmbrella: false,    // DHBW-Schirm aus Schritt 2 eingesammelt
  planesDeflected: 0,

  reset() {
    this.lives = START_LIVES;
    this.score = 0;
    this.elapsedMs = 0;
    this.catches = 0;
    this.ects = 0;
    this.stageTimes = [];
    this.hasUmbrella = false;
    this.planesDeflected = 0;
  },

  addScore(points) {
    this.score = Math.max(0, Math.round(this.score + points));
  },

  tick(deltaMs) {
    this.elapsedMs += deltaMs;
  },

  // Gibt true zurück, wenn damit das letzte Leben verloren ist
  loseLife() {
    this.lives = Math.max(0, this.lives - 1);
    this.catches++;
    return this.lives === 0;
  },

  // Gibt false zurück, wenn die Leben schon voll sind
  gainLife() {
    if (this.lives >= START_LIVES) return false;
    this.lives++;
    return true;
  },

  finishStage() {
    this.stageTimes.push(this.elapsedMs);
    this.addScore(SCORING.stageClear);
  },

  // Zeit pro Schritt aus den kumulierten Zwischenzeiten
  stageSplits() {
    return this.stageTimes.map((time, i) => time - (this.stageTimes[i - 1] || 0));
  },

  // Endabrechnung: Punkte im Spiel + Zeitbonus + Lebensbonus
  calculateResult() {
    const seconds = this.elapsedMs / 1000;
    const timeBonus = Math.max(0, Math.round(SCORING.timeBonusBase - seconds * SCORING.timeBonusPerSec));
    const lifeBonus = this.lives * SCORING.lifeBonus;
    return { timeBonus, lifeBonus, total: this.score + timeBonus + lifeBonus };
  }
};

// Highscore und Bestzeit im localStorage
const Records = {
  load() {
    return {
      highscore: Storage.load(STORAGE_KEYS.highscore, 0),
      bestTime: Storage.load(STORAGE_KEYS.bestTime, null)
    };
  },

  // Speichert neue Rekorde und meldet, welche geknackt wurden
  submit(score, timeMs) {
    const previous = this.load();
    const isNewHighscore = score > previous.highscore;
    const isNewBestTime = previous.bestTime === null || timeMs < previous.bestTime;
    if (isNewHighscore) Storage.save(STORAGE_KEYS.highscore, score);
    if (isNewBestTime) Storage.save(STORAGE_KEYS.bestTime, Math.round(timeMs));
    return { isNewHighscore, isNewBestTime };
  }
};
