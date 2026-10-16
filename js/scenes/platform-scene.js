'use strict';

// =====================================================================
//  SCHRITT 3: TREPPENHAUS (Jump & Run)
//  Vom 3. OG über drei Treppen ins EG und durch den Haupteingang.
//  Optik angelehnt an den Neubau der Fakultät Technik (DHBW Stuttgart, 3XN):
//  hell, weiße horizontale Bänder, farbige Glasscheiben, Galerien mit
//  Glasbrüstung und im EG das Atrium mit Glaskuppel, Wendeltreppe und Cafeteria.
// =====================================================================

class PlatformScene extends LevelScene {
  constructor() { super(SCENES.platform); }

  create() {
    this.managesCameraScroll = true; // Kamera folgt dem Spieler statt den Bereich zu zentrieren
    this.setupLevel(3);
    this.checkpoint = LEVEL3.checkpoints[0];
    this.hasJumped = false;
    this.hasDoubleJumped = false;
    // Countdowns in ms
    this.coyoteMs = 0;
    this.jumpBufferMs = 0;
    this.invulnMs = 0;
    this.coffeeMs = 0;

    this.physics.world.gravity.y = PLATFORM.gravity;
    this.physics.world.setBounds(0, 0, PLATFORM.worldWidth, PLATFORM.worldHeight);
    this.physics.world.setBoundsCollision(true, true, true, false); // unten offen: Absturz in den Lichthof
    // Kamera endet knapp unter dem EG, damit dort viel vom Atrium zu sehen ist
    const groundFloor = LEVEL3.floors[LEVEL3.floors.length - 1];
    this.cameraBounds = { width: PLATFORM.worldWidth, height: groundFloor.y + 80 };
    this.cameras.main.setBackgroundColor('#e6e9ed');

    this.drawBackground();
    this.buildPlatforms();
    this.buildStairs();
    this.buildSlipperyFloor();
    this.buildObstacles();
    this.createPlayer();
    this.createEnemies();
    this.createPickups();
    this.createUmbrella();
    this.createDoor();
    this.setupCollisions();

    this.followCamera(0);
    this.time.addEvent({ delay: PLATFORM.planeIntervalMs, loop: true, callback: () => this.spawnPlane() });
  }

  update(time, delta) {
    const dt = this.beginFrame(delta);
    if (dt === null || this.finished) return;

    this.coyoteMs -= dt;
    this.jumpBufferMs -= dt;
    this.invulnMs -= dt;
    this.coffeeMs -= dt;

    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updatePlanes();
    this.updateUmbrella(dt);
    this.followCamera(dt);

    const coffeeInfo = this.coffeeMs > 0 ? `   ☕ ${(this.coffeeMs / 1000).toFixed(1)}s` : '';
    this.hud.setExtra(`ECTS ${GameState.ects}${coffeeInfo}${this.umbrellaInfo()}`);
    this.endFrame();
  }

  // ---------- Kamera ----------
  // Folgt dem Spieler mit Totzone in der Bildmitte und weichem Nachziehen.
  // Eigene Umsetzung, weil die Kamera für die hohe Auflösung von oben links zoomt.
  // dt = 0: sofort hinspringen (Levelstart)
  followCamera(dt) {
    const camera = this.cameras.main;
    const { width: viewW, height: viewH } = Display.view; // sichtbare Fläche – breiter auf breiten Bildschirmen
    const deadzone = { x: (viewW - 140) / 2, y: (viewH - 90) / 2 };
    let targetX = camera.scrollX;
    let targetY = camera.scrollY;
    const px = this.player.x - targetX;
    const py = this.player.y - targetY;
    if (dt === 0 || px < deadzone.x) targetX = this.player.x - deadzone.x;
    else if (px > viewW - deadzone.x) targetX = this.player.x - (viewW - deadzone.x);
    if (dt === 0 || py < deadzone.y) targetY = this.player.y - deadzone.y;
    else if (py > viewH - deadzone.y) targetY = this.player.y - (viewH - deadzone.y);
    if (dt === 0) {
      targetX = this.player.x - viewW / 2;
      targetY = this.player.y - viewH / 2;
    }
    targetX = Phaser.Math.Clamp(targetX, 0, this.cameraBounds.width - viewW);
    targetY = Phaser.Math.Clamp(targetY, 0, Math.max(0, this.cameraBounds.height - viewH));
    const follow = dt === 0 ? 1 : 1 - Math.pow(1 - 0.12, dt / 16.67);
    camera.setScroll(
      Phaser.Math.Linear(camera.scrollX, targetX, follow),
      Phaser.Math.Linear(camera.scrollY, targetY, follow)
    );
  }

  // ---------- Hintergrund: Flure mit Räumen ----------
  drawBackground() {
    const g = this.add.graphics().setDepth(-10);
    this.drawAtrium(g);
    LEVEL3.floors.forEach((floor) => {
      const width = floor.x1 - floor.x0;
      g.fillStyle(0xd3d7dc, 1); // Sockelleiste
      g.fillRect(floor.x0, floor.y - 40, width, 40);
      this.drawWhiteBand(g, floor.x0, floor.x1, floor.y + 32, 30); // Geschossdecke als weißes Fassadenband
      this.add.text(floor.x0 + 40, floor.y - 250, floor.label, textStyle(36, CSS.darkGray)).setDepth(-9);
      floor.rooms.forEach((room) => this.drawRoom(g, room, floor.y));
    });
    this.drawStairwells(g);

    // Loch im Boden mit Blick ins Atrium
    const well = LEVEL3.lightwell;
    g.fillStyle(0x1a1a1a, 1);
    g.fillRect(well.x0, well.y, well.x1 - well.x0, PLATFORM.worldHeight - well.y);
    this.add.text((well.x0 + well.x1) / 2, well.y + 60, 'ATRIUM\n↓ ↓ ↓', { ...textStyle(16, CSS.white), align: 'center' })
      .setOrigin(0.5, 0).setDepth(-9);
  }

  drawWhiteBand(g, x0, x1, y, height) {
    g.fillStyle(0xf4f4f4, 1);
    g.fillRect(x0, y, x1 - x0, height);
    g.lineStyle(2, 0x9a9a9a, 1);
    g.lineBetween(x0, y, x1, y);
    g.lineBetween(x0, y + height, x1, y + height);
  }

  // EG: offenes Atrium mit Glaskuppel, umlaufenden Galerien und schräger Wendeltreppe
  drawAtrium(g) {
    const floor = LEVEL3.floors[LEVEL3.floors.length - 1];
    const width = floor.x1 - floor.x0;
    const top = floor.y - 450;
    const domeBase = top + 80;

    g.fillStyle(0xf3f5f8, 1);
    g.fillRect(floor.x0, top, width, floor.y - top);

    // Gewölbte Glaskuppel mit Rippen
    const arc = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      arc.push({ x: floor.x0 + t * width, y: domeBase - Math.sin(t * Math.PI) * 60 });
    }
    g.fillStyle(0xdbe9f6, 1);
    g.fillPoints([{ x: floor.x0, y: domeBase }, ...arc, { x: floor.x1, y: domeBase }], true);
    g.lineStyle(2, 0x9aa7b4, 1);
    g.strokePoints(arc, false);
    arc.filter((p, i) => i % 3 === 0).forEach((p) => g.lineBetween(p.x, p.y, p.x, domeBase));
    g.lineBetween(floor.x0, domeBase, floor.x1, domeBase);

    // Obere Galerie: Leute hinter der Glasbrüstung, darunter ein weißes Band
    [domeBase + 75].forEach((bandY) => {
      for (let x = floor.x0 + 40; x < floor.x1; x += 70 + Math.random() * 60) {
        g.fillStyle(pickRandom([0x3a3a3a, 0x666666, 0x8a8a8a]), 1);
        g.fillCircle(x, bandY - 44, 7);
        g.fillRoundedRect(x - 8, bandY - 37, 16, 26, 4);
      }
      g.fillStyle(0xbfd6ea, 0.5);
      g.fillRect(floor.x0, bandY - 30, width, 30);
      g.lineStyle(2, 0x7a8794, 1);
      g.lineBetween(floor.x0, bandY - 30, floor.x1, bandY - 30);
      this.drawWhiteBand(g, floor.x0, floor.x1, bandY, 14);
    });

    // Wendeltreppe mit geneigter Achse
    const stairX = floor.x0 + 560;
    g.lineStyle(3, 0x5a6672, 1);
    for (let i = 0; i < 8; i++) g.strokeEllipse(stairX + i * 8, floor.y - 20 - i * 45, 110, 22);
    g.lineStyle(6, 0x5a6672, 1);
    g.lineBetween(stairX, floor.y, stairX + 56, floor.y - 20 - 7 * 45);

    this.add.text(floor.x0 + 140, domeBase + 110, 'DHBW Stuttgart · Fakultät Technik', textStyle(24, CSS.darkGray)).setDepth(-9);
  }

  drawStairwells(g) {
    LEVEL3.stairs.forEach((stair) => {
      g.fillStyle(0xd9dde2, 1);
      g.fillRect(stair.x0, stair.y0 - 340, stair.x1 - stair.x0, stair.y1 - stair.y0 + 380);
      // Glasgeländer mit Handlauf
      g.fillStyle(0xbfd6ea, 0.45);
      g.fillPoints([{ x: stair.x0, y: stair.y0 - 40 }, { x: stair.x1, y: stair.y1 - 40 }, { x: stair.x1, y: stair.y1 }, { x: stair.x0, y: stair.y0 }], true);
      g.lineStyle(5, 0x5a6672, 1);
      g.lineBetween(stair.x0, stair.y0 - 40, stair.x1, stair.y1 - 40);
      g.lineStyle(3, 0x5a6672, 1);
      for (let i = 0; i <= stair.steps; i += 2) {
        const x = stair.x0 + (stair.x1 - stair.x0) * i / stair.steps;
        const y = stair.y0 + (stair.y1 - stair.y0) * i / stair.steps;
        g.lineBetween(x, y - 40, x, y);
      }
    });
  }

  // Alles an der Flurwand steht auf dem Boden oder hängt in Augenhöhe
  drawRoom(g, room, floorY) {
    switch (room.kind) {
      case 'door': this.drawDoor(g, room, floorY); break;
      case 'glass': this.drawGlassRoom(g, room, floorY); break;
      case 'board': this.drawNoticeBoard(g, room.x, floorY); break;
      case 'window': this.drawWindow(g, room.x, floorY); break;
      case 'sign': this.drawWallSign(room, floorY); break;
      default: break;
    }
  }

  drawDoor(g, room, floorY) {
    const top = floorY - 122;
    g.fillStyle(0x2a2a2a, 1);
    g.fillRect(room.x - 4, top - 4, 72, 126);
    g.fillStyle(0x8c8c8c, 1);
    g.fillRect(room.x, top, 64, 122);
    g.fillStyle(COLORS.glass, 1);
    g.fillRect(room.x + 18, top + 14, 28, 40);
    g.fillStyle(COLORS.black, 1);
    g.fillRect(room.x + 50, top + 66, 9, 4);
    this.drawPlaque(g, room.x + 76, floorY - 96, room.number, room.name);
  }

  // Raumschild neben der Tür
  drawPlaque(g, x, y, number, name) {
    g.fillStyle(COLORS.white, 1);
    g.fillRect(x, y, 96, 44);
    g.lineStyle(2, COLORS.darkGray, 1);
    g.strokeRect(x, y, 96, 44);
    g.fillStyle(COLORS.floor, 1);
    g.fillRect(x, y, 6, 44);
    this.add.text(x + 12, y + 4, number, { fontFamily: FONT, fontSize: '14px', color: CSS.black }).setDepth(-8);
    this.add.text(x + 12, y + 22, name, {
      fontFamily: FONT_BODY, fontSize: '9px', color: '#333333', wordWrap: { width: 80 }
    }).setDepth(-8);
  }

  // Glaswand mit Blick in einen Raum voller Kommilitonen
  drawGlassRoom(g, room, floorY) {
    const top = floorY - 160;
    const height = 140;
    g.fillStyle(0xe9eef5, 1);
    g.fillRect(room.x, top, room.width, height);
    g.fillStyle(COLORS.white, 1);
    g.fillRect(room.x + room.width - 70, top + 20, 50, 30); // Whiteboard im Raum
    for (let row = 0; row < 2; row++) {
      const y = top + 70 + row * 34;
      for (let x = room.x + 22; x < room.x + room.width - 30; x += 38) {
        g.fillStyle(pickRandom([0x2b2b2b, 0x555555, 0x7a7a7a]), 1);
        g.fillCircle(x, y - 10, 8);
        g.fillRoundedRect(x - 10, y - 2, 20, 14, 4);
      }
      g.fillStyle(COLORS.midGray, 1);
      g.fillRect(room.x + 10, y + 10, room.width - 50, 6);
    }
    // Einzelne farbige Glasscheiben wie an der Fassade des Neubaus
    const tints = [0x3bb7ff, 0xffd23f, 0x9be15d, 0xff7b9c];
    for (let pane = 0, x = room.x; x < room.x + room.width; pane++, x += 80) {
      if (pane % 3 !== 1) continue;
      g.fillStyle(tints[pane % tints.length], 0.25);
      g.fillRect(x, top, Math.min(80, room.x + room.width - x), height);
    }
    // Rahmen und Spiegelung
    g.lineStyle(5, COLORS.black, 1);
    g.strokeRect(room.x, top, room.width, height);
    for (let x = room.x + 80; x < room.x + room.width; x += 80) g.lineBetween(x, top, x, top + height);
    g.lineStyle(6, 0xffffff, 0.35);
    g.lineBetween(room.x + 20, top + height - 10, room.x + 60, top + 10);
    g.lineBetween(room.x + 45, top + height - 10, room.x + 85, top + 10);
    this.add.text(room.x + 8, top + 6, `${room.number} · ${room.name}`, {
      fontFamily: FONT_BODY, fontSize: '12px', color: '#ffffff', backgroundColor: '#1f3f8a', padding: { x: 6, y: 3 }
    }).setDepth(-8);
  }

  drawNoticeBoard(g, x, floorY) {
    const top = floorY - 150;
    g.fillStyle(0x6b5a45, 1);
    g.fillRect(x, top, 100, 70);
    g.lineStyle(3, COLORS.charcoal, 1);
    g.strokeRect(x, top, 100, 70);
    [[8, 8, COLORS.white], [40, 12, COLORS.accent], [70, 6, COLORS.white], [16, 38, COLORS.accent], [52, 40, COLORS.white]]
      .forEach(([dx, dy, color]) => {
        g.fillStyle(color, 1);
        g.fillRect(x + dx, top + dy, 24, 22);
      });
    this.add.text(x + 50, top - 14, 'Schwarzes Brett', { fontFamily: FONT_BODY, fontSize: '10px', color: '#333333' })
      .setOrigin(0.5, 0).setDepth(-8);
  }

  drawWindow(g, x, floorY) {
    const top = floorY - 190;
    const size = 120;
    g.fillStyle(0xf7f7f7, 1);
    g.fillRect(x, top, size, size);
    g.fillStyle(0xd5e4f2, 1);
    g.fillRect(x, top + size * 0.55, size, size * 0.45); // Himmel unten heller
    g.lineStyle(5, COLORS.black, 1);
    g.strokeRect(x, top, size, size);
    g.lineStyle(3, COLORS.black, 1);
    g.lineBetween(x + size / 2, top, x + size / 2, top + size);
    g.lineBetween(x, top + size / 2, x + size, top + size / 2);
  }

  // Wegweiser an der Wand (mit Schrauben, damit er nicht in der Luft schwebt)
  drawWallSign(room, floorY) {
    const label = this.add.text(room.x, floorY - 150, room.text, {
      fontFamily: FONT, fontSize: '16px', color: '#ffffff', backgroundColor: '#1f9d55', padding: { x: 12, y: 8 }
    }).setDepth(-8);
    const g = this.add.graphics().setDepth(-7);
    g.fillStyle(COLORS.lightGray, 1);
    g.fillCircle(room.x + 5, floorY - 145, 2);
    g.fillCircle(room.x + label.width - 5, floorY - 145, 2);
  }

  // ---------- Aufbau ----------
  addPlatform(x, y, width, height = 32) {
    const tile = this.add.tileSprite(x + width / 2, y + height / 2, width, height, TEX.floorTile).setDepth(1);
    tile.setTileScale(hiResScale(1));
    this.platforms.add(tile);
  }

  buildPlatforms() {
    this.platforms = this.physics.add.staticGroup();
    LEVEL3.platforms.forEach((p) => this.addPlatform(p.x, p.y, p.w));
  }

  // Jede Stufe ist eine dünne Plattform; darunter nur Deko
  buildStairs() {
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(COLORS.midGray, 1);
    LEVEL3.stairs.forEach((stair) => {
      const stepWidth = Math.ceil((stair.x1 - stair.x0) / stair.steps) + 1;
      const stepDrop = (stair.y1 - stair.y0) / stair.steps;
      for (let i = 0; i < stair.steps; i++) {
        const x = stair.x0 + i * (stair.x1 - stair.x0) / stair.steps;
        const y = stair.y0 + (i + 1) * stepDrop;
        this.addPlatform(x, y, stepWidth, 16);
        g.fillRect(x, y + 16, stepWidth, stair.y1 + 16 - y);
      }
    });
  }

  buildSlipperyFloor() {
    const wet = LEVEL3.slippery;
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(COLORS.wetFloor, 0.7);
    g.fillRect(wet.x0, wet.y - 3, wet.x1 - wet.x0, 6);
    hiRes(this.add.image(wet.x0 + 20, wet.y - 20, TEX.wetSign)).setDepth(2);
    this.add.text(wet.x0 + 50, wet.y - 40, 'VORSICHT NASS', textStyle(12, CSS.accent)).setDepth(2);
  }

  // Stuhlstapel (drüberspringen) und Tische (draufspringen)
  buildObstacles() {
    this.obstacles = this.physics.add.staticGroup();
    // erst verkleinern, dann zur Gruppe – statische Körper übernehmen die Größe beim Hinzufügen
    LEVEL3.chairs.forEach(({ x, y }) => this.obstacles.add(hiRes(this.add.image(x, y - 32, TEX.chairs)).setDepth(2)));
    LEVEL3.tables.forEach(({ x, y }) => this.obstacles.add(hiRes(this.add.image(x, y - 18, TEX.table)).setDepth(2)));
  }

  createPlayer() {
    const { x, y } = this.checkpoint;
    this.player = hiRes(this.physics.add.sprite(x, y, TEX.playerIdle)).setDepth(10);
    this.player.body.setSize(texturePixels(18), texturePixels(42)).setOffset(texturePixels(5), texturePixels(4));
    this.player.body.setMaxVelocityY(PLATFORM.maxFallSpeed);
    this.player.setCollideWorldBounds(true);
  }

  createEnemies() {
    this.enemies = this.physics.add.group({ allowGravity: false, immovable: true });
    const addPatroller = (data, texture, offsetY, quote) => {
      const enemy = hiRes(this.enemies.create(data.x, data.y - offsetY, texture)).setDepth(9);
      enemy.setData({ minX: data.minX, maxX: data.maxX, speed: data.speed, quote, stunnable: false, stunMs: 0 });
      enemy.setVelocityX(data.speed);
      return enemy;
    };
    LEVEL3.lecturers.forEach((data) => {
      const lecturer = addPatroller(data, TEX.lecturerWalk[0], 27, 'Wohin so eilig?!');
      lecturer.anims.play(ANIM.lecturerWalk);
      lecturer.setData('stunnable', true); // nur Dozenten lassen sich mit dem Schirm betäuben
    });
    LEVEL3.carts.forEach((data) => addPatroller(data, TEX.cart, 22, 'Hier wird geputzt!'));

    this.planes = this.physics.add.group({ allowGravity: false });
  }

  createPickups() {
    const bob = (target, distance) => {
      this.tweens.add({ targets: target, y: target.y - distance, duration: 600 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    };
    this.coins = this.physics.add.group({ allowGravity: false, immovable: true });
    LEVEL3.coins.forEach(([x, y]) => bob(hiRes(this.coins.create(x, y, TEX.ects)).setDepth(5), 6));

    this.hearts = this.physics.add.group({ allowGravity: false, immovable: true });
    LEVEL3.hearts.forEach(({ x, y }) => bob(hiRes(this.hearts.create(x, y, TEX.heart), 1.3).setDepth(5), 8));

    this.coffees = this.physics.add.group({ allowGravity: false, immovable: true });
    LEVEL3.coffees.forEach(({ x, y }) => {
      const coffee = hiRes(this.coffees.create(x, y, TEX.coffee)).setDepth(5);
      this.tweens.add({ targets: coffee, angle: 10, duration: 400, yoyo: true, repeat: -1 });
    });
  }

  createDoor() {
    const { x, y } = LEVEL3.door;
    hiRes(this.add.image(x, y, TEX.entrance)).setOrigin(0.5, 1).setDepth(3);
    this.add.text(x, y - 160, 'Haupteingang · Lerchenstraße', textStyle(12, CSS.darkGray, FONT_BODY)).setOrigin(0.5).setDepth(3);
    const sign = addBlinkingText(this, x, y - 132, 'EXIT', {
      fontFamily: FONT, fontSize: '16px', color: '#ffffff', backgroundColor: '#1f9d55', padding: { x: 8, y: 2 }
    }, 0.5);
    sign.setDepth(3);
    this.doorZone = this.add.zone(x, y - 50, 50, 100);
    this.physics.add.existing(this.doorZone, true);
  }

  setupCollisions() {
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.player, this.obstacles);
    this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
      if (enemy.getData('stunMs') > 0) return; // betäubte Dozenten sind harmlos
      this.hurtPlayer(enemy.getData('quote'));
    });
    this.physics.add.overlap(this.player, this.planes, (player, plane) => {
      plane.destroy();
      this.hurtPlayer('Papierflieger im Gesicht!');
    });
    this.physics.add.overlap(this.player, this.coins, (player, coin) => this.collectCoin(coin));
    this.physics.add.overlap(this.player, this.hearts, (player, heart) => this.pickUpHeart(heart));
    this.physics.add.overlap(this.player, this.coffees, (player, coffee) => this.collectCoffee(coffee));
    this.physics.add.overlap(this.player, this.doorZone, () => this.reachDoor());
  }

  // ---------- Spieler ----------
  updatePlayer(dt) {
    const body = this.player.body;
    const onGround = body.blocked.down || body.touching.down;
    if (onGround) {
      this.coyoteMs = PLATFORM.coyoteMs;
      if (body.velocity.y >= 0) {
        this.hasJumped = false;
        this.hasDoubleJumped = false;
      }
    }
    this.run(dt, onGround);
    this.jump(dt, onGround);
    this.updateAnimation(onGround);
    this.updateCheckpoint(onGround);
    if (this.player.y > PLATFORM.worldHeight + PLATFORM.fallMargin) this.hurtPlayer('Ab in den Lichthof …');
  }

  // Beschleunigen statt sofortiger Geschwindigkeit – auf nassem Boden mit wenig Grip
  run(dt, onGround) {
    const body = this.player.body;
    const direction = this.inputs.direction().x;
    const maxSpeed = PLATFORM.runSpeed * (this.coffeeMs > 0 ? PLATFORM.coffeeSpeedFactor : 1);
    const accel = onGround && this.isOnSlipperyFloor() ? PLATFORM.slipperyAccel : PLATFORM.accel;
    const targetVx = direction * maxSpeed;
    const diff = targetVx - body.velocity.x;
    const step = accel * dt / 1000;
    body.setVelocityX(Math.abs(diff) <= step ? targetVx : body.velocity.x + Math.sign(diff) * step);
    if (direction !== 0) this.player.setFlipX(direction < 0);
  }

  // Springen mit Coyote-Time (kurz nach der Kante) und Jump-Buffer (kurz vor der Landung)
  jump(dt, onGround) {
    const body = this.player.body;
    if (this.inputs.wasPressed('jump')) this.jumpBufferMs = PLATFORM.jumpBufferMs;
    const wantsJump = this.jumpBufferMs > 0;

    if (wantsJump && this.coyoteMs > 0 && !this.hasJumped) {
      body.setVelocityY(PLATFORM.jumpVelocity);
      this.hasJumped = true;
      this.jumpBufferMs = 0;
      SFX.jump();
    } else if (wantsJump && this.coffeeMs > 0 && !onGround && !this.hasDoubleJumped) {
      body.setVelocityY(PLATFORM.doubleJumpVelocity);
      this.hasDoubleJumped = true;
      this.jumpBufferMs = 0;
      SFX.jump();
      this.dust(this.player.x, this.player.y + 20, 0xffffff);
    }

    // Früh loslassen = kleiner Sprung
    if (!this.inputs.isHeld('jump') && body.velocity.y < 0) {
      body.velocity.y += PLATFORM.jumpCutGravity * dt / 1000;
    }
  }

  // Laufanimation am Boden (schneller = schnellere Schritte), Sprung- und Fallbild in der Luft
  updateAnimation(onGround) {
    const { velocity } = this.player.body;
    if (!onGround) {
      this.player.anims.stop();
      this.player.setTexture(velocity.y < 0 ? TEX.playerJump : TEX.playerFall);
    } else if (Math.abs(velocity.x) > 30) {
      this.player.anims.play(ANIM.playerRun, true);
      this.player.anims.timeScale = Phaser.Math.Clamp(Math.abs(velocity.x) / PLATFORM.runSpeed, 0.5, 1.5);
    } else {
      this.player.anims.stop();
      this.player.setTexture(TEX.playerIdle);
    }
  }

  isOnSlipperyFloor() {
    const wet = LEVEL3.slippery;
    return this.player.x > wet.x0 && this.player.x < wet.x1 && Math.abs(this.player.body.bottom - wet.y) < 4;
  }

  updateCheckpoint(onGround) {
    if (!onGround) return;
    const reached = LEVEL3.checkpoints.find((cp) => this.player.x > cp.fromX && cp.fromX > this.checkpoint.fromX);
    if (!reached) return;
    this.checkpoint = reached;
    floatText(this, this.player.x, this.player.y - 50, 'Checkpoint ✔', CSS.success, 18);
  }

  hurtPlayer(quote) {
    if (this.invulnMs > 0 || this.finished) return;
    floatText(this, this.player.x, this.player.y - 70, quote, CSS.danger, 18);
    const gameOver = this.punishPlayer(this.player.x, this.player.y - 30, quote);
    if (gameOver) {
      this.freezePlayer();
      return;
    }
    this.invulnMs = PLATFORM.invulnMs;
    this.player.setPosition(this.checkpoint.x, this.checkpoint.y).setVelocity(0, 0);
    this.tweens.add({ targets: this.player, alpha: 0.2, duration: 100, yoyo: true, repeat: 6, onComplete: () => this.player.setAlpha(1) });
  }

  freezePlayer() {
    this.player.setVelocity(0, 0);
    this.player.body.setAllowGravity(false);
    this.player.anims.stop();
  }

  reachDoor() {
    if (this.finished) return;
    this.freezePlayer();
    this.completeStage('DRAUSSEN! 🏃💨', CSS.success);
  }

  // ---------- Gegner & Hindernisse ----------
  updateEnemies(dt) {
    this.enemies.getChildren().forEach((enemy) => {
      if (enemy.getData('stunMs') > 0) {
        this.updateStun(enemy, dt);
        return;
      }
      const { minX, maxX, speed } = enemy.data.values;
      if (enemy.x <= minX) enemy.setVelocityX(speed);
      else if (enemy.x >= maxX) enemy.setVelocityX(-speed);
      enemy.setFlipX(enemy.body.velocity.x < 0);
    });
  }

  // Papierflieger kommen ab dem 2. Flur von rechts ins Bild
  spawnPlane() {
    if (this.finished || this.player.x < LEVEL3.floors[1].x0) return;
    const baseY = this.player.y - 10 - Math.random() * 40;
    const plane = hiRes(this.planes.create(this.cameras.main.scrollX + Display.view.width + 40, baseY, TEX.plane)).setDepth(9);
    plane.setVelocityX(-PLATFORM.planeSpeed);
    plane.setData({ baseY, phase: Math.random() * Math.PI * 2 });
  }

  updatePlanes() {
    const leftEdge = this.cameras.main.scrollX - 60;
    this.planes.getChildren().slice().forEach((plane) => {
      plane.y = plane.getData('baseY') + Math.sin(this.time.now * 0.005 + plane.getData('phase')) * 18;
      if (plane.x < leftEdge) plane.destroy();
    });
  }

  // ---------- DHBW-Schirm ----------
  // Hängt zugeklappt wie ein Schwert an der Seite; mit X / Y wird er vor dem Körper
  // geschwungen. Nur während des Schwungs prallen Papierflieger ab, danach kurze Pause.
  createUmbrella() {
    this.umbrella = null;
    this.swingMs = 0;          // > 0 = Schwung läuft
    this.swingCooldownMs = 0;
    if (!GameState.hasUmbrella) return;
    this.umbrella = hiRes(this.add.image(this.player.x, this.player.y, TEX.umbrellaClosed), 1.25)
      .setOrigin(0.5, 0.88).setDepth(11); // Drehpunkt am Griff
    this.swoosh = this.add.graphics().setDepth(11);
  }

  facing() {
    return this.player.flipX ? -1 : 1;
  }

  // Griff in der Hand des Spielers
  umbrellaGrip() {
    return { x: this.player.x + this.facing() * 7, y: this.player.y + 2 };
  }

  startSwing() {
    this.swingMs = UMBRELLA.swingMs;
    this.swingCooldownMs = UMBRELLA.swingMs + UMBRELLA.cooldownMs;
    SFX.swing();
  }

  updateUmbrella(dt) {
    if (!this.umbrella) return;
    this.swingMs -= dt;
    this.swingCooldownMs -= dt;
    if (this.inputs.wasPressed('swing') && this.swingCooldownMs <= 0) this.startSwing();

    const dir = this.facing();
    const grip = this.umbrellaGrip();
    const swinging = this.swingMs > 0;
    const progress = swinging ? Phaser.Math.Easing.Cubic.Out(1 - this.swingMs / UMBRELLA.swingMs) : 1;
    const angle = swinging ? Phaser.Math.Linear(UMBRELLA.swingFrom, UMBRELLA.swingTo, progress) : UMBRELLA.restAngle;
    // In Ruhe gespiegelt getragen (Spitze nach hinten), beim Schwung nach vorne
    this.umbrella.setPosition(grip.x, grip.y).setAngle(angle * dir).setFlipX(swinging ? dir < 0 : dir > 0);
    this.umbrella.setAlpha(!swinging && this.swingCooldownMs > 0 ? 0.6 : 1);

    this.swoosh.clear();
    if (!swinging) return;
    this.drawSwoosh(grip, dir, progress);
    this.deflectPlanesInReach(grip, dir);
    this.stunLecturersInReach(grip, dir);
  }

  // Weißer Schweif hinter der Schirmspitze
  drawSwoosh(grip, dir, progress) {
    const toRadians = (deg) => Phaser.Math.DegToRad(deg - 90); // 0° = Spitze nach oben
    const from = toRadians(UMBRELLA.swingFrom);
    const to = toRadians(Phaser.Math.Linear(UMBRELLA.swingFrom, UMBRELLA.swingTo, progress));
    const startAngle = dir > 0 ? from : Math.PI - from;
    const endAngle = dir > 0 ? to : Math.PI - to;
    this.swoosh.lineStyle(10, 0xffffff, 0.45 * (1 - progress * 0.5));
    this.swoosh.beginPath();
    this.swoosh.arc(grip.x, grip.y, 30, startAngle, endAngle, dir < 0);
    this.swoosh.strokePath();
  }

  deflectPlanesInReach(grip, dir) {
    const hitX = grip.x + dir * UMBRELLA.reach * 0.6;
    this.planes.getChildren().slice().forEach((plane) => {
      if (!plane.body || !plane.body.enable) return;
      if (Phaser.Math.Distance.Between(hitX, grip.y - 8, plane.x, plane.y) < UMBRELLA.reach) this.deflectPlane(plane);
    });
  }

  deflectPlane(plane) {
    plane.body.enable = false; // darf nicht nochmal treffen
    const dir = this.facing();
    this.tweens.add({
      targets: plane,
      x: plane.x + dir * 160,
      y: plane.y - 170,
      angle: 540 * dir,
      alpha: 0,
      duration: 650,
      ease: 'Cubic.easeOut',
      onComplete: () => plane.destroy()
    });
    GameState.planesDeflected++;
    GameState.addScore(UMBRELLA.deflectScore);
    SFX.umbrellaBlock();
    floatText(this, plane.x, plane.y - 30, `Abgewehrt! +${UMBRELLA.deflectScore}`, CSS.accent, 16);
  }

  // ---------- Dozenten betäuben ----------
  stunLecturersInReach(grip, dir) {
    const hitX = grip.x + dir * UMBRELLA.reach * 0.6;
    this.enemies.getChildren().forEach((enemy) => {
      if (!enemy.getData('stunnable') || enemy.getData('stunMs') > 0) return;
      if (Phaser.Math.Distance.Between(hitX, grip.y - 8, enemy.x, enemy.y) < UMBRELLA.reach) this.stunLecturer(enemy);
    });
  }

  stunLecturer(enemy) {
    enemy.setData('stunMs', UMBRELLA.stunMs);
    enemy.setData('resumeSpeed', enemy.body.velocity.x || enemy.getData('speed'));
    enemy.setVelocityX(0);
    enemy.anims.pause();
    enemy.setTint(0xbfbfbf);
    // Drei Sterne kreisen über dem Kopf
    enemy.setData('stars', [0, 1, 2].map(() =>
      this.add.text(enemy.x, enemy.y - 34, '★', textStyle(14, CSS.accent)).setOrigin(0.5).setDepth(12)));
    GameState.addScore(UMBRELLA.stunScore);
    SFX.bonk();
    this.cameras.main.shake(80, 0.004);
    floatText(this, enemy.x, enemy.y - 60, `Bonk! +${UMBRELLA.stunScore}`, CSS.accent, 16);
  }

  updateStun(enemy, dt) {
    const stunMs = enemy.getData('stunMs') - dt;
    enemy.setData('stunMs', stunMs);
    const stars = enemy.getData('stars');
    const spin = this.time.now * 0.008;
    stars.forEach((star, i) => {
      const angle = spin + (i * Math.PI * 2) / stars.length;
      star.setPosition(enemy.x + Math.cos(angle) * 14, enemy.y - 34 + Math.sin(angle) * 4);
      star.setAlpha(stunMs < 500 ? 0.4 + 0.6 * Math.abs(Math.sin(spin * 3)) : 1); // kurz vor Schluss blinken
    });
    if (stunMs > 0) return;
    stars.forEach((star) => star.destroy());
    enemy.clearTint();
    enemy.anims.resume();
    enemy.setVelocityX(enemy.getData('resumeSpeed'));
  }

  umbrellaInfo() {
    if (!this.umbrella) return '';
    return this.swingCooldownMs > 0 ? '   ☂ …' : '   ☂ bereit';
  }

  // ---------- Pickups ----------
  collectCoin(coin) {
    this.tweens.killTweensOf(coin);
    coin.destroy();
    GameState.ects++;
    GameState.addScore(SCORING.ects);
    SFX.coin();
    floatText(this, coin.x, coin.y - 10, '+1 ECTS', CSS.accent, 16);
  }

  pickUpHeart(heart) {
    this.tweens.killTweensOf(heart);
    heart.destroy();
    this.collectHeart(heart.x, heart.y);
  }

  collectCoffee(coffee) {
    this.tweens.killTweensOf(coffee);
    coffee.destroy();
    this.coffeeMs = PLATFORM.coffeeMs;
    GameState.addScore(PLATFORM.coffeeScore);
    SFX.powerup();
    floatText(this, coffee.x, coffee.y - 20, 'KOFFEIN! Doppelsprung ☕', CSS.accent, 20);
    this.dust(coffee.x, coffee.y, 0x6b3e1e);
  }

  dust(x, y, tint) {
    const emitter = this.add.particles(0, 0, TEX.pixel, {
      speed: { min: 40, max: 140 },
      angle: { min: 200, max: 340 },
      lifespan: 400,
      scale: { start: hiResScale(1), end: 0 },
      tint,
      gravityY: 300,
      emitting: false
    }).setDepth(11);
    emitter.explode(12, x, y);
    this.time.delayedCall(600, () => emitter.destroy());
  }
}
