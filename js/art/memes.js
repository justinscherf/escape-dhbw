'use strict';

// =====================================================================
//  MEMES – lädt die Bilder aus assets/memes/ für den Handy-Feed (Schritt 1)
//  GIFs zeigt Phaser nur als Standbild. Deshalb werden sie hier Bild für Bild
//  in eine Canvas-Textur gemalt – sofern der Browser das kann (ImageDecoder,
//  Aufruf über einen Server). Sonst bleibt das erste Bild stehen.
// =====================================================================

class GifAnimation {
  constructor(canvasTexture, url) {
    this.texture = canvasTexture;
    this.url = url;
    this.decoder = null;
    this.frameCount = 0;
    this.frameIndex = 0;
    this.timer = null;
    this.running = false;
    this.unsupported = !('ImageDecoder' in window) || window.location.protocol === 'file:';
  }

  async start() {
    if (this.unsupported || this.running) return;
    this.running = true;
    try {
      if (!this.decoder) await this.openDecoder();
      this.showNextFrame();
    } catch (e) {
      this.giveUp(e);
    }
  }

  stop() {
    this.running = false;
    clearTimeout(this.timer);
  }

  async openDecoder() {
    const response = await fetch(this.url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    this.decoder = new ImageDecoder({ data: await response.arrayBuffer(), type: 'image/gif' });
    await Promise.all([this.decoder.tracks.ready, this.decoder.completed]);
    this.frameCount = this.decoder.tracks.selectedTrack.frameCount;
  }

  async showNextFrame() {
    if (!this.running) return;
    try {
      const { image } = await this.decoder.decode({ frameIndex: this.frameIndex });
      this.texture.context.drawImage(image, 0, 0, this.texture.width, this.texture.height);
      this.texture.refresh();
      const delayMs = Math.max(20, (image.duration || 100000) / 1000); // duration in Mikrosekunden
      image.close();
      this.frameIndex = (this.frameIndex + 1) % this.frameCount;
      this.timer = setTimeout(() => this.showNextFrame(), delayMs);
    } catch (e) {
      this.giveUp(e);
    }
  }

  giveUp(error) {
    console.warn(`GIF-Animation nicht möglich (${this.url}) – zeige Standbild.`, error);
    this.unsupported = true;
    this.stop();
  }
}

const MemeLibrary = {
  keys: [],       // Textur-Schlüssel aller erfolgreich geladenen Memes
  gifs: [],

  // In preload() der Boot-Szene aufrufen
  preload(scene) {
    MEME_FILES.forEach((file, i) => scene.load.image(this.textureKey(i), MEME_FOLDER + file));
    scene.load.on('loaderror', (file) => console.warn(`Meme konnte nicht geladen werden: ${file.src}`));
  },

  // In create() der Boot-Szene aufrufen – fehlende Dateien werden einfach übersprungen
  prepare(scene) {
    this.keys = [];
    MEME_FILES.forEach((file, i) => {
      const key = this.textureKey(i);
      if (!scene.textures.exists(key)) return;
      this.keys.push(/\.gif$/i.test(file) ? this.prepareGif(scene, key, MEME_FOLDER + file) : key);
    });
  },

  prepareGif(scene, key, url) {
    const source = scene.textures.get(key).getSourceImage();
    const canvasTexture = scene.textures.createCanvas(`${key}-anim`, source.width, source.height);
    canvasTexture.context.drawImage(source, 0, 0);
    canvasTexture.refresh();
    this.gifs.push(new GifAnimation(canvasTexture, url));
    return canvasTexture.key;
  },

  textureKey(index) {
    return `meme-${index}`;
  },

  hasMemes() {
    return this.keys.length > 0;
  },

  startAnimations() {
    this.gifs.forEach((gif) => gif.start());
  },

  stopAnimations() {
    this.gifs.forEach((gif) => gif.stop());
  }
};
