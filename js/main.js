'use strict';

// =====================================================================
//  START – Phaser-Konfiguration und Spielstart
// =====================================================================

// Verbindungs-Meldungen in der Konsole helfen bei Controller-Problemen
window.addEventListener('gamepadconnected', (event) => {
  console.info(`Controller verbunden: #${event.gamepad.index} ${event.gamepad.id} (Mapping: ${event.gamepad.mapping || 'nicht-standard'})`);
});
window.addEventListener('gamepaddisconnected', (event) => {
  console.info(`Controller getrennt: #${event.gamepad.index} ${event.gamepad.id}`);
});

// Fehler mitschreiben, damit die Ton-Diagnose im Menü sie anzeigen kann
window.addEventListener('error', (event) => { SFX.lastError = event.message; });

// Ton nur nach einer echten Nutzereingabe (Klick, Taste, Touch) – Controller zählen nicht
['pointerdown', 'pointerup', 'click', 'keydown', 'keyup', 'touchend'].forEach((type) => {
  window.addEventListener(type, () => SFX.unlock(), { capture: true });
});

// Per Doppelklick geöffnet (file://) blockiert der Browser im WebGL-Modus externe Bilder.
// Dann zeichnen wir mit Canvas und laden Bilder direkt als <img> – so erscheinen die Memes trotzdem.
const isOpenedAsFile = window.location.protocol === 'file:';

const gameConfig = {
  type: isOpenedAsFile ? Phaser.CANVAS : Phaser.AUTO,
  loader: isOpenedAsFile ? { imageLoadType: 'HTMLImageElement' } : {},
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#111111',
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  audio: { noAudio: true }, // eigene WebAudio-Töne (SFX/Music) statt Phaser-Sound
  scene: [BootScene, MenuScene, StageIntroScene, LectureScene, SneakScene, PlatformScene, WinScene, GameOverScene]
};

// Global erreichbar zum Nachsehen im Browser-Debugger (z. B. escapeGame.scene.getScenes(true))
window.escapeGame = new Phaser.Game(gameConfig);
