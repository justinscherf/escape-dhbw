'use strict';

// =====================================================================
//  ANZEIGE – dynamische Auflösung
//  Die Spiellogik rechnet immer in 960 × 540 "Spielpunkten". Das Canvas wird
//  aber in Bildschirm-Auflösung gerendert (Fenstergröße × Retina-Faktor,
//  höchstens DISPLAY.maxRes-fach). Jede Kamera zoomt um diesen Faktor, Texte
//  werden in derselben Auflösung erzeugt und Texturen sind vorab hochaufgelöst.
//  Ändert sich die Fenstergröße, passt sich die Auflösung im laufenden Spiel an.
// =====================================================================

const Display = {
  res: 1,

  computeRes() {
    if (window.innerWidth === 0 || window.innerHeight === 0) return this.res; // Fenster (noch) unsichtbar
    const fit = Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT);
    const wanted = fit * (window.devicePixelRatio || 1);
    return Phaser.Math.Clamp(Math.ceil(wanted / DISPLAY.resStep) * DISPLAY.resStep, 1, DISPLAY.maxRes);
  },

  textResolution() {
    return Math.ceil(this.res);
  },

  // Kamera so einstellen, dass die 960 × 540 Spielwelt das hochaufgelöste Canvas füllt.
  // Ursprung oben links: Bildschirm = Zoom × (Welt − Scroll), auch für fixierte HUD-Elemente
  setupCamera(camera) {
    camera.setOrigin(0, 0).setZoom(this.res);
  },

  // Fenstergröße geändert: Canvas, Kameras und Texte auf die neue Auflösung bringen
  handleResize(game) {
    const res = this.computeRes();
    if (res === this.res) return;
    this.res = res;
    game.scale.resize(GAME_WIDTH * res, GAME_HEIGHT * res);
    game.scene.getScenes(true).forEach((scene) => {
      scene.cameras.cameras.forEach((camera) => camera.setZoom(res));
      this.updateTextResolution(scene.children.list);
    });
  },

  updateTextResolution(objects) {
    objects.forEach((object) => {
      if (object.type === 'Text') object.setResolution(this.textResolution());
      if (object.list) this.updateTextResolution(object.list); // Container
    });
  }
};

Display.res = Display.computeRes();

// Alle Texte automatisch in der aktuellen Auflösung erzeugen (statt verschwommen 1×)
const originalTextFactory = Phaser.GameObjects.GameObjectFactory.prototype.text;
Phaser.GameObjects.GameObjectFactory.prototype.text = function (x, y, text, style) {
  return originalTextFactory.call(this, x, y, text, { resolution: Display.textResolution(), ...(style || {}) });
};

// Texturen sind DISPLAY.textureRes-fach gezeichnet – diese Helfer bringen sie auf Normalgröße
function hiResScale(scale = 1) {
  return scale / DISPLAY.textureRes;
}

function hiRes(gameObject, scale = 1) {
  return gameObject.setScale(hiResScale(scale));
}

// Werte in Texturpixeln (z. B. für Physik-Körper), passend zur hochaufgelösten Textur
function texturePixels(value) {
  return value * DISPLAY.textureRes;
}
