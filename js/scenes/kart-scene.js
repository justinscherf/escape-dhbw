'use strict';

// =====================================================================
//  SCHRITT 4: HEIMFAHRT – eine kleine Mode-7-inspirierte Kartstrecke
//  Straße und eigene Pixel-Sprites entstehen auf einem niedrig aufgelösten
//  Canvas. Phaser übernimmt Eingaben, HUD und den bestehenden Levelablauf.
// =====================================================================

class KartScene extends LevelScene {
  constructor() { super(SCENES.kart); }

  create() {
    this.setupLevel(4);
    this.distance = 0;
    this.speed = 0;
    this.playerX = 0;
    this.steering = 0;
    this.boostMs = 0;
    this.invulnMs = 0;
    this.countdownMs = KART.countdownMs;
    this.lastCountdown = Math.ceil(this.countdownMs / 1000);
    this.objects = LEVEL4.objects.map((object) => ({ ...object, taken: false }));
    this.scenery = [];
    for (let z = 20; z < LEVEL4.length; z += 42) {
      const inTown = z < 480 || z > 2200;
      this.scenery.push({ z, x: -1.6, kind: inTown ? 'building' : 'tree' });
      this.scenery.push({ z: z + 21, x: 1.65, kind: inTown ? 'house' : 'tree' });
    }
    this.sprites = this.createPixelArt();

    const textureKey = 'kart-road-raster';
    this.roadTexture = this.textures.createCanvas(textureKey, 320, KART.rasterHeight);
    this.roadTexture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.roadImage = this.add.image(0, 0, textureKey).setOrigin(0).setScrollFactor(0).setDepth(-1);
    const previousRendering = this.game.canvas.style.imageRendering;
    this.game.canvas.style.imageRendering = 'pixelated';
    this.events.once('shutdown', () => {
      this.textures.remove(textureKey);
      this.game.canvas.style.imageRendering = previousRendering;
    });

    this.routeHud = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.hud);
    this.distanceText = this.add.text(16, 91, '', textStyle(13, CSS.white, FONT_BODY))
      .setScrollFactor(0).setDepth(DEPTH.hud);
    this.routeText = this.add.text(0, 80, '', textStyle(18, CSS.accent))
      .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.hud);
    this.countdownText = this.add.text(0, 0, String(this.lastCountdown), textStyle(68, CSS.accent))
      .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.effects);
    this.onViewResize();
    this.updateDashboard();
    this.renderRoad();
  }

  onViewResize() {
    const { width, height } = Display.view;
    // Gleich große Pixel auch auf Tablets und sehr breiten Bildschirmen.
    this.roadTexture.setSize(Math.round(KART.rasterHeight * width / height), KART.rasterHeight);
    this.roadTexture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.roadImage.setTexture('kart-road-raster').setDisplaySize(width, height);
    this.routeText.setX(width / 2);
    this.countdownText.setPosition(width / 2, height * 0.43);
    this.renderRoad();
  }

  update(time, delta) {
    const dt = this.beginFrame(delta);
    if (dt === null || this.finished) return;

    if (this.countdownMs > 0) {
      this.countdownMs = Math.max(0, this.countdownMs - dt);
      const number = Math.ceil(this.countdownMs / 1000);
      if (number !== this.lastCountdown) {
        this.lastCountdown = number;
        this.countdownText.setText(number > 0 ? String(number) : 'LOS!');
        if (number > 0) SFX.click();
        else {
          SFX.powerup();
          this.time.delayedCall(650, () => this.countdownText.setVisible(false));
        }
      }
    } else {
      this.drive(dt);
    }

    this.updateDashboard();
    this.renderRoad();
    this.endFrame();
  }

  sectionAt(z) {
    return LEVEL4.sections.find((section) => z < section.end) || LEVEL4.sections[LEVEL4.sections.length - 1];
  }

  curveAt(z) {
    let start = 0;
    for (const section of LEVEL4.sections) {
      if (z < section.end) {
        const progress = Phaser.Math.Clamp((z - start) / (section.end - start), 0, 1);
        return section.curve * Math.sin(progress * Math.PI);
      }
      start = section.end;
    }
    return 0;
  }

  drive(dt) {
    const seconds = dt / 1000;
    this.invulnMs = Math.max(0, this.invulnMs - dt);
    this.boostMs = Math.max(0, this.boostMs - dt);
    const direction = this.inputs.direction();
    const braking = this.inputs.isHeld('down') || direction.y > CONTROLS.downThreshold;
    const gas = this.inputs.isHeld('up') || this.inputs.isHeld('action') || direction.y < -CONTROLS.downThreshold;
    const maxSpeed = this.boostMs > 0 ? KART.boostSpeed : KART.maxSpeed;

    if (braking) this.speed = Math.max(0, this.speed - KART.brakeDeceleration * seconds);
    else if (gas) this.speed = Math.min(maxSpeed, this.speed + KART.acceleration * seconds);
    else this.speed = Math.max(0, this.speed - KART.coastDeceleration * seconds);

    const speedRatio = this.speed / KART.maxSpeed;
    this.steering = direction.x;
    // Etwas Lenken im Stand erlaubt, damit man am Ziel wieder auf die Straße kommt.
    this.playerX += direction.x * KART.steerSpeed * (0.2 + 0.8 * Math.min(speedRatio, 1.3)) * seconds;
    this.playerX -= this.curveAt(this.distance) * KART.centrifugal * speedRatio * speedRatio * seconds;
    this.playerX = Phaser.Math.Clamp(this.playerX, -KART.playerLimit, KART.playerLimit);

    if (Math.abs(this.playerX) > KART.roadLimit && this.speed > KART.offroadSpeed) {
      this.speed = Math.max(KART.offroadSpeed, this.speed - KART.offroadDeceleration * seconds);
    }

    const previousDistance = this.distance;
    this.distance = Math.min(LEVEL4.length, this.distance + this.speed * seconds);
    this.checkObjects(previousDistance);
    if (this.finished) return;

    if (this.distance >= LEVEL4.length && Math.abs(this.playerX) <= KART.roadLimit && this.speed > 0) {
      this.speed = 0;
      this.completeStage('ZUHAUSE ANGEKOMMEN!', CSS.success);
    }
  }

  checkObjects(previousDistance) {
    for (const object of this.objects) {
      if (object.taken || object.z < previousDistance || object.z > this.distance) continue;
      object.taken = true;
      const radius = object.kind === 'car' ? 0.3 : KART.collisionRadius;
      if (Math.abs(this.playerX - object.x) > radius) continue;

      switch (object.kind) {
        case 'ects':
          GameState.ects++;
          GameState.addScore(SCORING.ects);
          SFX.coin();
          this.feedback('+1 ECTS', CSS.accent);
          break;
        case 'coffee':
          this.boostMs = KART.boostMs;
          GameState.addScore(PLATFORM.coffeeScore);
          SFX.powerup();
          this.feedback('KAFFEE-TURBO!', CSS.dopamine);
          break;
        case 'heart':
          this.collectHeart(Display.view.width / 2 - Display.view.offsetX, 210 - Display.view.offsetY);
          break;
        default:
          if (this.invulnMs > 0) break;
          this.invulnMs = KART.invulnMs;
          this.boostMs = 0;
          this.speed *= 0.25;
          if (this.punishPlayer(Display.view.width / 2 - Display.view.offsetX, 210 - Display.view.offsetY,
            'Die Heimfahrt endete leider mit einem Kart-Unfall.')) return;
      }
    }
  }

  feedback(text, color) {
    floatText(this, GAME_WIDTH / 2, 210 - Display.view.offsetY, text, color, 24);
  }

  updateDashboard() {
    const turbo = this.boostMs > 0 ? ' · TURBO!' : '';
    this.hud.setExtra(`${Math.round(this.speed * 3.6)} KM/H${turbo}`);
    const remaining = Math.max(0, Math.ceil((LEVEL4.length - this.distance) / 10) * 10);
    this.distanceText.setText(remaining > 0 ? `NOCH ${remaining} M BIS ZUHAUSE` : 'ZIEL: AUF DER STRASSE BLEIBEN');
    this.routeText.setText(Math.abs(this.playerX) > KART.roadLimit ? 'AB AUF DIE STRASSE!' : this.sectionAt(this.distance).label);
    const g = this.routeHud;
    g.clear();
    g.fillStyle(0x10182c, 0.9).fillRect(16, 76, 184, 9);
    g.fillStyle(COLORS.success, 1).fillRect(18, 78, 180 * this.distance / LEVEL4.length, 5);
    g.lineStyle(1, COLORS.white, 0.8).strokeRect(16, 76, 184, 9);
  }

  // ---------- Perspektive: jede Rasterzeile ist ein Stück Straße ----------
  roadPoint(z) {
    const width = this.roadTexture.width;
    const height = KART.rasterHeight;
    const horizon = 64;
    const depth = Math.max(1, z - this.distance + KART.cameraOffset);
    const scale = KART.cameraDepth / depth;
    const y = horizon + (height - horizon) * scale;
    const halfWidth = width * 0.43 * scale;
    const bend = this.curveAt(this.distance + Math.max(0, z - this.distance) * 0.45) *
      Math.pow(1 - Math.min(1, scale), 2) * width * 0.65;
    return { x: width / 2 + bend - this.playerX * halfWidth, y, halfWidth, scale };
  }

  renderRoad() {
    const ctx = this.roadTexture.context;
    const width = this.roadTexture.width;
    const height = KART.rasterHeight;
    ctx.imageSmoothingEnabled = false;
    this.drawSky(ctx, width);

    for (let y = 65; y < height; y++) {
      const z = this.distance + KART.cameraDepth * (height - 64) / (y - 64) - KART.cameraOffset;
      const point = this.roadPoint(z);
      const stripe = Math.floor(z / 12) % 2 === 0;
      ctx.fillStyle = stripe ? '#59b85a' : '#4ca653';
      ctx.fillRect(0, y, width, 1);
      const edge = Math.max(1, point.halfWidth * 0.1);
      ctx.fillStyle = stripe ? '#fff1d2' : '#df5766';
      ctx.fillRect(Math.round(point.x - point.halfWidth - edge), y, Math.ceil((point.halfWidth + edge) * 2), 1);
      ctx.fillStyle = stripe ? '#595c78' : '#535670';
      ctx.fillRect(Math.round(point.x - point.halfWidth), y, Math.ceil(point.halfWidth * 2), 1);
      if (Math.floor(z / 10) % 3 !== 0) {
        ctx.fillStyle = '#fceac7';
        for (const lane of [-1 / 3, 1 / 3]) {
          ctx.fillRect(Math.round(point.x + point.halfWidth * lane), y, Math.max(1, Math.round(point.halfWidth * 0.018)), 1);
        }
      }
      if (Math.abs(z - LEVEL4.length) < 4) {
        const cell = Math.max(2, Math.round(point.halfWidth / 9));
        for (let x = Math.round(point.x - point.halfWidth); x < point.x + point.halfWidth; x += cell) {
          ctx.fillStyle = (Math.floor(x / cell) + Math.floor(z)) % 2 === 0 ? '#fff9e6' : '#24243b';
          ctx.fillRect(x, y, cell, 1);
        }
      }
    }

    const visible = [...this.scenery, ...this.objects.filter((object) => !object.taken),
      { z: LEVEL4.length + 32, x: 0, kind: 'home' }]
      .filter((object) => object.z > this.distance - 5 && object.z < this.distance + KART.viewDistance)
      .sort((a, b) => b.z - a.z);
    for (const object of visible) {
      const point = this.roadPoint(object.z);
      if (point.y > height + 25) continue;
      const sprite = this.sprites[object.kind];
      const scale = Math.min(3.5, point.scale * (object.kind === 'home' ? 2.4 : 1.8));
      const w = Math.max(1, Math.round(sprite.width * scale));
      const h = Math.max(1, Math.round(sprite.height * scale));
      ctx.drawImage(sprite, Math.round(point.x + object.x * point.halfWidth - w / 2), Math.round(point.y - h), w, h);
    }

    this.drawKart(ctx, width, height);
    this.drawMap(ctx, width);
    this.roadTexture.refresh();
  }

  drawSky(ctx, width) {
    ctx.fillStyle = '#8edce5';
    ctx.fillRect(0, 0, width, 65);
    ctx.fillStyle = '#c6f0e6';
    ctx.fillRect(0, 43, width, 22);
    ctx.fillStyle = '#fff0ad';
    ctx.fillRect(width - 75, 20, 16, 16);
    ctx.fillStyle = '#fffbe6';
    ctx.fillRect(width - 79, 24, 24, 8);
    const parallax = this.curveAt(this.distance) * 18 + this.playerX * 3;
    for (let i = -1; i < 5; i++) {
      const x = Math.round(i * 95 - parallax);
      ctx.fillStyle = '#f3fff0';
      ctx.fillRect(x + 15, 27 + (i % 2) * 8, 30, 5);
      ctx.fillRect(x + 23, 23 + (i % 2) * 8, 14, 5);
      ctx.fillStyle = '#67aaa1';
      for (let step = 0; step < 7; step++) ctx.fillRect(x + step * 5, 63 - step * 3, 70 - step * 10, 3 + step * 3);
      ctx.fillStyle = '#388d7e';
      ctx.fillRect(x + 61, 56, 18, 9);
      ctx.fillRect(x + 66, 50, 8, 6);
    }
  }

  drawKart(ctx, width, height) {
    const moving = this.speed > 1;
    const bob = moving ? Math.round(Math.sin(this.distance * 1.4)) : 0;
    const x = Math.round(width / 2 - 21);
    const y = height - 51 + bob;
    ctx.fillStyle = '#30334b';
    ctx.fillRect(x - 2, y + 30, 46, 8);
    if (this.boostMs > 0 && moving) {
      ctx.fillStyle = '#ff9849';
      ctx.fillRect(x + 7, y + 32, 8, 10 + (Math.floor(this.distance) % 5));
      ctx.fillRect(x + 27, y + 32, 8, 10 + (Math.floor(this.distance + 2) % 5));
      ctx.fillStyle = '#fff3a1';
      ctx.fillRect(x + 9, y + 32, 4, 7);
      ctx.fillRect(x + 29, y + 32, 4, 7);
    }
    if (this.invulnMs <= 0 || Math.floor(this.invulnMs / 100) % 2 === 0) {
      const sprite = this.steering < -0.2 ? this.sprites.kartLeft : this.steering > 0.2 ? this.sprites.kartRight : this.sprites.kart;
      ctx.drawImage(sprite, x, y);
    }
    if (Math.abs(this.playerX) > KART.roadLimit && moving) {
      ctx.fillStyle = '#dce8aa';
      ctx.fillRect(x - 7, y + 33 - bob, 5, 3);
      ctx.fillRect(x + 45, y + 30 + bob, 6, 4);
    }
  }

  drawMap(ctx, width) {
    const x = width - 62;
    ctx.fillStyle = '#18263b';
    ctx.globalAlpha = 0.8;
    ctx.fillRect(x, 29, 55, 49);
    ctx.globalAlpha = 1;
    const points = [[8, 42], [18, 37], [38, 37], [43, 28], [16, 27], [12, 18], [35, 16], [42, 7], [27, 7]];
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#f2e4c3';
    ctx.beginPath();
    points.forEach(([px, py], i) => i === 0 ? ctx.moveTo(x + px, 29 + py) : ctx.lineTo(x + px, 29 + py));
    ctx.stroke();
    let start = 0;
    let index = LEVEL4.sections.length - 1;
    let fraction = 1;
    for (let i = 0; i < LEVEL4.sections.length; i++) {
      const end = LEVEL4.sections[i].end;
      if (this.distance <= end) {
        index = i;
        fraction = (this.distance - start) / (end - start);
        break;
      }
      start = end;
    }
    const a = points[index];
    const b = points[index + 1];
    ctx.fillStyle = '#ffdb62';
    ctx.fillRect(Math.round(x + a[0] + (b[0] - a[0]) * fraction) - 2, Math.round(29 + a[1] + (b[1] - a[1]) * fraction) - 2, 5, 5);
    ctx.fillStyle = '#ff8190';
    ctx.fillRect(x + 24, 33, 6, 6);
  }

  // ---------- Eigene Pixelgrafik, ohne zusätzliche Bilddateien ----------
  createPixelArt() {
    const make = (width, height, paint) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      const rect = (color, x, y, w, h) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
      paint(rect);
      return canvas;
    };
    const house = (home) => make(home ? 64 : 30, home ? 76 : 35, (r) => {
      const s = home ? 2 : 1;
      r('#31344b', 2 * s, 15 * s, 27 * s, 18 * s);
      r(home ? '#ffe7b0' : '#f6cc9e', 3 * s, 15 * s, 25 * s, 17 * s);
      for (let i = 0; i < 7; i++) r('#ce5a68', (1 + i * 2) * s, (15 - i * 2) * s, (29 - i * 4) * s, 2 * s);
      r('#713d58', 13 * s, 22 * s, 6 * s, 10 * s);
      r('#ffe887', 6 * s, 20 * s, 5 * s, 6 * s);
      r('#ffe887', 21 * s, 20 * s, 5 * s, 6 * s);
      if (home) {
        r('#25334d', 2, 65, 60, 11);
        // Beschriftung bleibt Teil der Pixelgrafik.
      }
    });
    const sprites = {
      tree: make(28, 43, (r) => {
        r('#775448', 12, 29, 5, 14);
        r('#246b5c', 1, 22, 26, 13); r('#32885e', 4, 12, 20, 16);
        r('#4da969', 8, 4, 12, 13); r('#75bf71', 11, 0, 6, 10);
      }),
      building: make(36, 46, (r) => {
        r('#586c8d', 0, 3, 36, 43); r('#adbbc6', 2, 5, 32, 41);
        for (let y = 9; y < 39; y += 9) for (let x = 5; x < 30; x += 9) r('#4b7699', x, y, 5, 6);
        r('#59708e', 15, 37, 8, 9); r('#e9debd', 0, 0, 36, 4);
      }),
      house: house(false),
      home: house(true),
      cone: make(14, 20, (r) => {
        r('#34314b', 0, 17, 14, 3); r('#ff9849', 2, 12, 10, 5);
        r('#fff4d5', 3, 9, 8, 4); r('#f97b44', 4, 4, 6, 5); r('#ffd084', 5, 0, 4, 4);
      }),
      car: make(30, 32, (r) => {
        r('#292d46', 0, 14, 5, 17); r('#292d46', 25, 14, 5, 17);
        r('#607bb7', 5, 2, 20, 25); r('#8cd6df', 7, 5, 16, 9);
        r('#3b588c', 3, 17, 24, 12); r('#f5c66e', 5, 20, 5, 4); r('#f5c66e', 20, 20, 5, 4);
        r('#e5e3cc', 11, 25, 9, 3); r('#232e4b', 4, 29, 22, 3);
      }),
      coffee: make(18, 22, (r) => {
        r('#f3dba3', 13, 7, 5, 10); r('#775048', 15, 9, 2, 6);
        r('#fff4d6', 2, 5, 12, 15); r('#bf7651', 4, 10, 8, 6);
        r('#fff9e6', 0, 20, 17, 2); r('#e4faea', 5, 0, 2, 3); r('#e4faea', 10, 1, 2, 3);
      }),
      ects: make(15, 18, (r) => {
        r('#c78b39', 3, 0, 9, 18); r('#ffce59', 1, 3, 13, 12);
        r('#fff2a5', 4, 3, 3, 11); r('#dd9b36', 10, 4, 2, 10);
      }),
      heart: make(17, 16, (r) => {
        r('#b93e68', 2, 1, 5, 11); r('#b93e68', 10, 1, 5, 11);
        r('#ff7594', 0, 3, 17, 6); r('#ff7594', 2, 9, 13, 3);
        r('#ff7594', 5, 12, 7, 2); r('#ff7594', 7, 14, 3, 2); r('#ffcfce', 3, 3, 3, 3);
      })
    };
    for (const [key, lean] of [['kart', 0], ['kartLeft', -2], ['kartRight', 2]]) {
      sprites[key] = make(42, 38, (r) => {
        r('#22283d', 1, 21, 9, 15); r('#22283d', 32, 21, 9, 15);
        r('#63708b', 2, 24, 3, 8); r('#63708b', 37, 24, 3, 8);
        r('#722f53', 10, 17, 22, 14); r('#f15d77', 7, 24, 28, 9);
        r('#ff97a0', 8, 23, 26, 4); r('#ffd76c', 12, 29, 18, 4);
        r('#f3ead2', 17, 30, 8, 2); r('#b33a5e', 4, 17, 34, 5);
        r('#ffd377', 4, 17, 34, 2); r('#313952', 13 + lean, 12, 16, 10);
        r('#526de0', 14 + lean, 12, 14, 10); r('#92a2ff', 16 + lean, 13, 10, 3);
        r('#d69570', 16 + lean, 4, 10, 9); r('#ffd2a0', 15 + lean, 5, 12, 6);
        r('#493b48', 14 + lean, 1, 14, 7); r('#6c4c50', 16 + lean, 0, 10, 3);
        r('#ffe3ac', 9 + lean, 17, 5, 4); r('#ffe3ac', 28 + lean, 17, 5, 4);
        r('#252d44', 7, 34, 28, 4); r('#8e9caa', 12, 34, 18, 2);
      });
    }
    const ctx = sprites.home.getContext('2d');
    ctx.fillStyle = '#ffe7a6';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ZUHAUSE', 32, 74);
    return sprites;
  }
}
