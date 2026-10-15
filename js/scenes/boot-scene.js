'use strict';

// =====================================================================
//  BOOT – lädt die Memes, erzeugt Texturen und Animationen, startet das Menü
//  Debug-Einstieg: index.html?stage=2 springt direkt in Schritt 2
// =====================================================================

class BootScene extends Phaser.Scene {
  constructor() { super(SCENES.boot); }

  preload() {
    MemeLibrary.preload(this);
  }

  create() {
    createAllTextures(this);
    createAnimations(this);
    MemeLibrary.prepare(this);

    const debugStage = Number(new URLSearchParams(window.location.search).get('stage'));
    if (STAGES[debugStage]) {
      GameState.reset();
      this.scene.start(STAGES[debugStage].sceneKey);
      return;
    }
    this.scene.start(SCENES.menu);
  }
}
