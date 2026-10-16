'use strict';

// =====================================================================
//  ANZEIGE – dynamische Auflösung und dynamisches Seitenverhältnis
//  Die Level sind für 960 × 540 "Spielpunkte" (16:9) gebaut. Die sichtbare
//  Fläche (Display.view) passt sich aber dem Bildschirm an: Auf breiteren
//  Bildschirmen wächst die Breite, auf schmaleren die Höhe – der 960 × 540
//  Bereich bleibt mittig. Hintergründe sind bis zur größtmöglichen Fläche
//  (Display.extent) gezeichnet, deshalb gibt es keine schwarzen Ränder.
//  Gerendert wird in Bildschirm-Auflösung (Fenster × Retina-Faktor, höchstens
//  DISPLAY.maxRes-fach); jede Kamera zoomt um diesen Faktor.
//  Ändert sich das Fenster (z. B. Handy drehen), passt sich alles live an.
// =====================================================================

const Display = {
  res: 1,
  view: { width: GAME_WIDTH, height: GAME_HEIGHT, offsetX: 0, offsetY: 0 },

  // Sichtbare Fläche in Spielpunkten für das aktuelle Fenster
  computeView() {
    if (window.innerWidth === 0 || window.innerHeight === 0) return this.view; // Fenster (noch) unsichtbar
    const aspect = Phaser.Math.Clamp(window.innerWidth / window.innerHeight, DISPLAY.minAspect, DISPLAY.maxAspect);
    const isWider = aspect >= GAME_WIDTH / GAME_HEIGHT;
    const width = isWider ? Math.round(GAME_HEIGHT * aspect) : GAME_WIDTH;
    const height = isWider ? GAME_HEIGHT : Math.round(GAME_WIDTH / aspect);
    return { width, height, offsetX: (width - GAME_WIDTH) / 2, offsetY: (height - GAME_HEIGHT) / 2 };
  },

  computeRes(view) {
    if (window.innerWidth === 0 || window.innerHeight === 0) return this.res;
    const fit = Math.min(window.innerWidth / view.width, window.innerHeight / view.height);
    const wanted = fit * (window.devicePixelRatio || 1);
    const isTouchDevice = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const maxRes = isTouchDevice ? DISPLAY.maxResTouch : DISPLAY.maxRes;
    return Phaser.Math.Clamp(Math.ceil(wanted / DISPLAY.resStep) * DISPLAY.resStep, 1, maxRes);
  },

  // Welt-Bereich, den Hintergründe in festen Szenen mindestens abdecken müssen
  // (größtmögliche Fläche, damit auch nach dem Drehen nichts fehlt)
  extent() {
    const width = Math.round(GAME_HEIGHT * DISPLAY.maxAspect);
    const height = Math.round(GAME_WIDTH / DISPLAY.minAspect);
    const left = -(width - GAME_WIDTH) / 2;
    const top = -(height - GAME_HEIGHT) / 2;
    return { left, top, right: left + width, bottom: top + height, width, height };
  },

  textResolution() {
    return Math.ceil(this.res);
  },

  // Kamera mit Ursprung oben links: Bildschirm = Zoom × (Welt − Scroll).
  // Fixierte Elemente (scrollFactor 0) liegen damit in Bildschirm-Spielpunkten (0 … view.width).
  setupCamera(camera) {
    this.fitCamera(camera);
    this.centerDesign(camera);
  },

  // Kamera auf das ganze Canvas ziehen (Phaser passt das bei Größenänderungen nicht immer selbst an)
  fitCamera(camera) {
    const { width, height } = this.canvasSize();
    camera.setOrigin(0, 0).setSize(width, height).setZoom(this.res);
  },

  // Canvas-Größe in ganzen Pixeln – krumme Werte verzerren die Farbeffekte (WebGL-Puffer)
  canvasSize() {
    return { width: Math.round(this.view.width * this.res), height: Math.round(this.view.height * this.res) };
  },

  // 960 × 540 Bereich mittig in der sichtbaren Fläche
  centerDesign(camera) {
    camera.setScroll(-this.view.offsetX, -this.view.offsetY);
  },

  // Fenster geändert: Canvas, Kameras, Texte und HUD auf neue Größe bringen
  handleResize(game) {
    const view = this.computeView();
    const res = this.computeRes(view);
    if (res === this.res && view.width === this.view.width && view.height === this.view.height) return;
    this.view = view;
    this.res = res;
    const canvas = this.canvasSize();
    // setGameSize statt resize: Nur so übernimmt Phaser auch das neue Seitenverhältnis fürs Canvas
    game.scale.setGameSize(canvas.width, canvas.height);
    game.scene.getScenes(true).forEach((scene) => {
      scene.cameras.cameras.forEach((camera) => this.fitCamera(camera));
      if (!scene.managesCameraScroll) this.centerDesign(scene.cameras.main);
      this.updateTextResolution(scene.children.list);
      if (scene.hud) scene.hud.layout();
      if (scene.layoutHint) scene.layoutHint();
      if (scene.onViewResize) scene.onViewResize();
    });
  },

  updateTextResolution(objects) {
    objects.forEach((object) => {
      if (object.type === 'Text') object.setResolution(this.textResolution());
      if (object.list) this.updateTextResolution(object.list); // Container
    });
  }
};

Display.view = Display.computeView();
Display.res = Display.computeRes(Display.view);

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
