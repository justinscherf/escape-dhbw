'use strict';

// =====================================================================
//  BOOT – lädt die Memes, erzeugt Texturen und Animationen, startet das Menü
//  Debug-Einstieg: index.html?stage=2 springt direkt in Schritt 2
//  (&umbrella=1 startet mit DHBW-Schirm, z. B. ?stage=3&umbrella=1)
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
      GameState.hasUmbrella = new URLSearchParams(window.location.search).get('umbrella') === '1';
      this.scene.start(STAGES[debugStage].sceneKey);
      return;
    }
    this.scene.start(SCENES.menu);
  }
}
