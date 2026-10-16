'use strict';

// =====================================================================
//  SCHRITT 2: RAUS AUS DEM HÖRSAAL (Vogelperspektive)
//  Alle ECTS einsammeln, dann durch die Tür. Der Dozent läuft Runden durch
//  die Gänge und kommt nachsehen, wenn er etwas hört; sein Blick ist ein
//  Sichtkegel. Kommilitonen verdecken immer, Tische nur geduckt.
// =====================================================================

const PatrolState = Object.freeze({
  BOARD: 'board',   // schreibt an die Tafel und schaut nach vorne – sicher
  SCAN: 'scan',     // steht und lässt den Blick schweifen
  WALK: 'walk',     // läuft eine Route durch die Gänge
  ALERT: 'alert',   // hat etwas gehört und horcht kurz
  CAUGHT: 'caught'  // hat dich gerade erwischt
});

const PATROL_MARKS = Object.freeze({ board: '✍', scan: '👀', walk: '', alert: '?!', caught: '!' });

class SneakScene extends LevelScene {
  constructor() { super(SCENES.sneak); }

  create() {
    this.setupLevel(2);
    const { room, aisleXs, lecturerY, midY, backY } = SNEAK_LAYOUT;
    this.room = new Phaser.Geom.Rectangle(room.x, room.y, room.w, room.h);
    this.walkRows = [lecturerY, ...midY, backY]; // waagrechte Laufwege des Dozenten
    this.walkAisles = aisleXs;                    // senkrechte Laufwege
    this.detection = 0;          // 0–100, bei 100 bist du erwischt
    this.noiseCooldownMs = 0;
    this.graceMs = 0;
    this.doorHintCooldownMs = 0;
    this.deskOccluders = [];     // verdecken nur, wenn man geduckt schleicht
    this.studentOccluders = [];  // verdecken immer
    this.solids = this.physics.add.staticGroup();

    this.drawFloor();
    this.buildWalls();
    this.buildDesksAndStudents();
    this.buildBackpacks();
    this.buildEcts();
    this.buildHearts();
    this.buildUmbrella();
    this.buildDoor();
    this.createLecturer();
    this.createPlayer();

    this.coneGfx = this.add.graphics().setDepth(4);
    this.detectGfx = this.add.graphics().setDepth(12);
    this.setPatrolState(PatrolState.BOARD);
    this.updateEctsDisplay();
  }

  update(time, delta) {
    const dt = this.beginFrame(delta);
    if (dt === null) return;
    if (this.finished) {
      this.coneGfx.clear();
      this.detectGfx.clear();
      return;
    }
    this.graceMs -= dt;
    this.noiseCooldownMs -= dt;
    this.doorHintCooldownMs -= dt;

    const { sneaking, moving } = this.updatePlayer();
    this.updateLecturer(dt);
    this.checkBump();
    if (this.finished) return;
    this.checkEctsPickup();
    this.checkHeartPickup();
    this.checkUmbrellaPickup();
    this.checkNoise(dt, sneaking, moving);
    const visible = this.isPlayerVisible(sneaking);
    this.drawCone(visible, sneaking);
    this.updateDetection(dt, visible, sneaking);
    this.checkDoor();
    this.endFrame();
  }

  // ---------- Aufbau ----------
  addSolid(x, y, w, h, color, depth = 2) {
    const rect = this.add.rectangle(x + w / 2, y + h / 2, w, h, color).setDepth(depth);
    this.solids.add(rect);
    return rect;
  }

  drawFloor() {
    const room = this.room;
    const board = SNEAK_LAYOUT.board;
    const g = this.add.graphics().setDepth(0);
    const ext = Display.extent();
    g.fillStyle(0x161616, 1);
    g.fillRect(ext.left, ext.top, ext.width, ext.height);
    g.fillStyle(COLORS.floor, 1);
    g.fillRect(room.x, room.y, room.width, room.height);
    g.lineStyle(1, COLORS.floorDark, 0.7);
    for (let x = room.x; x <= room.right; x += 40) g.lineBetween(x, room.y, x, room.bottom);
    for (let y = room.y; y <= room.bottom; y += 40) g.lineBetween(room.x, y, room.right, y);
    // Whiteboard an der Stirnseite
    g.fillStyle(COLORS.white, 1);
    g.fillRect(board.x, room.y, board.w, 10);
    g.fillStyle(COLORS.gray, 1);
    g.fillRect(board.x, room.y + 10, board.w, 3);
  }

  buildWalls() {
    const { wall, door } = SNEAK_LAYOUT;
    const room = this.room;
    this.addSolid(room.x - wall, room.y - wall, room.width + 2 * wall, wall, COLORS.darkGray);
    this.addSolid(room.x - wall, room.y, wall, room.height, COLORS.darkGray);
    this.addSolid(room.right, room.y, wall, room.height, COLORS.darkGray);
    // Unterwand mit Türöffnung
    this.addSolid(room.x - wall, room.bottom, door.x - (room.x - wall), wall, COLORS.darkGray);
    const doorRight = door.x + door.w;
    this.addSolid(doorRight, room.bottom, room.right + wall - doorRight, wall, COLORS.darkGray);
  }

  buildDesksAndStudents() {
    const layout = SNEAK_LAYOUT;
    const shirtColors = [0x2b2b2b, 0x555555, 0x7a7a7a, 0x9a9a9a, 0xbdbdbd];
    const g = this.add.graphics().setDepth(3);

    layout.deskRows.forEach((rowY) => {
      layout.deskCols.forEach((col) => {
        this.addSolid(col.x, rowY, col.w, layout.deskHeight, COLORS.lightGray);
        this.deskOccluders.push(new Phaser.Geom.Rectangle(col.x, rowY, col.w, layout.deskHeight));
        g.fillStyle(COLORS.midGray, 1);
        g.fillRect(col.x, rowY + layout.deskHeight - 4, col.w, 4);

        const studentY = rowY + layout.deskHeight + 15;
        for (let x = col.x + 22; x <= col.x + col.w - 22; x += layout.studentSpacing) {
          const isPlayerSeat = Math.abs(x - layout.seat.x) < 34 && Math.abs(studentY - layout.seat.y) < 10;
          if (isPlayerSeat || Math.random() < layout.emptySeatChance) continue;
          if (Math.random() < 0.5) {
            g.fillStyle(COLORS.charcoal, 1); // Laptop auf dem Tisch
            g.fillRect(x - 9, rowY + 4, 18, 12);
          }
          this.addSolid(x - 13, studentY - 13, 26, 26, 0x000000, 1).setAlpha(0);
          this.studentOccluders.push(new Phaser.Geom.Rectangle(x - 13, studentY - 13, 26, 26));
          drawStudentTopDown(g, x, studentY, pickRandom(shirtColors));
        }
      });
    });
  }

  buildBackpacks() {
    this.backpacks = SNEAK_LAYOUT.backpacks.map(({ x, y }) => ({
      x,
      y,
      image: hiRes(this.add.image(x, y, TEX.backpack)).setDepth(3).setAngle(randRange(-30, 30)),
      cooldownMs: 0
    }));
  }

  buildEcts() {
    this.ectsCoins = SNEAK_LAYOUT.ects.map(({ x, y }) => {
      const image = hiRes(this.add.image(x, y, TEX.ects)).setDepth(6);
      this.tweens.add({ targets: image, scale: hiResScale(1.2), duration: 500 + Math.random() * 200, yoyo: true, repeat: -1 });
      return { x, y, image, collected: false };
    });
    this.ectsCollected = 0;
    this.ectsRequired = Math.min(SNEAK.ectsRequired, this.ectsCoins.length);
  }

  buildHearts() {
    this.heartPickups = SNEAK_LAYOUT.hearts.map(({ x, y }) => {
      const image = hiRes(this.add.image(x, y, TEX.heart)).setDepth(6);
      this.tweens.add({ targets: image, scale: hiResScale(1.25), duration: 450, yoyo: true, repeat: -1 });
      return { x, y, image, collected: false };
    });
  }

  // Optionaler DHBW-Schirm – schützt in Schritt 3 vor Papierfliegern
  buildUmbrella() {
    this.umbrellaPickup = null;
    if (GameState.hasUmbrella) return;
    const { x, y } = SNEAK_LAYOUT.umbrella;
    const image = hiRes(this.add.image(x, y, TEX.umbrella), 0.8).setDepth(6);
    this.tweens.add({ targets: image, angle: { from: -12, to: 12 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.umbrellaPickup = { x, y, image };
  }

  buildDoor() {
    const { door, wall } = SNEAK_LAYOUT;
    const g = this.add.graphics().setDepth(1);
    g.fillStyle(COLORS.success, 0.35);
    g.fillRect(door.x, this.room.bottom, door.w, wall);
    this.doorLabel = addBlinkingText(this, door.x + door.w / 2, this.room.bottom + 2, '', textStyle(13, CSS.success), 0.4);
    this.doorLabel.setOrigin(0.5, 0).setDepth(6);
    // Bis alle ECTS gesammelt sind, versperrt eine rote Schranke die Tür
    this.doorBlock = this.ectsRequired > 0
      ? this.addSolid(door.x, this.room.bottom, door.w, wall, COLORS.danger, 5)
      : null;
  }

  isDoorOpen() {
    return this.doorBlock === null;
  }

  updateEctsDisplay() {
    const missing = this.ectsRequired - this.ectsCollected;
    this.doorLabel.setText(this.isDoorOpen() ? 'AUSGANG ↓' : `🔒 noch ${missing} ECTS`);
    this.doorLabel.setColor(this.isDoorOpen() ? CSS.success : CSS.danger);
    this.hud.setExtra(`ECTS ${this.ectsCollected}/${this.ectsRequired}${GameState.hasUmbrella ? '   ☂' : ''}`);
  }

  createLecturer() {
    const g = this.add.graphics();
    drawLecturerTopDown(g);
    this.lecturer = this.add.container(GAME_WIDTH / 2, SNEAK_LAYOUT.lecturerY, [g]).setDepth(8);
    this.lecturerMark = this.add.text(0, 0, '', textStyle(24, CSS.danger)).setOrigin(0.5).setDepth(13);
    this.lookAngle = -Math.PI / 2;
    this.walkHeading = 0;
    this.walkSpeed = SNEAK.walkSpeed;
    this.route = [];
    this.routeIndex = 0;
    this.noisePoint = null;
    this.investigating = false;
  }

  createPlayer() {
    const { seat } = SNEAK_LAYOUT;
    this.player = hiRes(this.physics.add.image(seat.x, seat.y, TEX.playerTop)).setDepth(9);
    this.player.body.setCircle(texturePixels(11), texturePixels(4), texturePixels(4));
    this.physics.add.collider(this.player, this.solids);
    // Zielpunkt der Finger-Steuerung
    this.fingerMarker = this.add.circle(0, 0, 14).setStrokeStyle(3, COLORS.white, 0.7)
      .setDepth(11).setVisible(false);
    this.buildNavGrid();
  }

  // ---------- Spieler ----------
  updatePlayer() {
    const sneaking = this.inputs.isHeld('action');
    let { x, y } = this.inputs.direction();
    if (x === 0 && y === 0) ({ x, y } = this.fingerDirection());
    const speed = sneaking ? SNEAK.sneakSpeed : SNEAK.speed;
    const moving = x !== 0 || y !== 0;
    this.player.setVelocity(x * speed, y * speed);
    if (moving) this.player.rotation = Math.atan2(y, x);
    if (this.graceMs <= 0) this.player.setAlpha(sneaking ? 0.75 : 1);
    return { sneaking, moving };
  }

  // ---------- Finger-Steuerung (Touch) ----------
  // Finger irgendwo aufs Spielfeld legen und halten: Die Figur läuft auf dem kürzesten
  // freien Weg dorthin (um Tische herum) und bremst kurz vor dem Ziel ab.
  fingerDirection() {
    const pointer = this.input.activePointer;
    const active = TouchControls.enabled && pointer && pointer.isDown;
    this.fingerMarker.setVisible(active);
    if (!active) {
      this.fingerPath = null;
      return { x: 0, y: 0 };
    }
    const target = pointer.positionToCamera(this.cameras.main);
    this.fingerMarker.setPosition(target.x, target.y);
    const targetCell = this.navCellAt(target.x, target.y);
    const playerCell = this.navCellAt(this.player.x, this.player.y);
    if (!this.fingerPath || targetCell !== this.fingerTargetCell || playerCell !== this.fingerPlayerCell) {
      this.fingerTargetCell = targetCell;
      this.fingerPlayerCell = playerCell;
      this.fingerPath = this.findNavPath(this.player, target);
    }
    // Erster Wegpunkt, der noch nicht erreicht ist
    while (this.fingerPath.length > 1
      && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.fingerPath[0].x, this.fingerPath[0].y) < SNEAK.fingerStopDistance * 2) {
      this.fingerPath.shift();
    }
    const next = this.fingerPath[0];
    if (!next) return { x: 0, y: 0 };
    const dx = next.x - this.player.x;
    const dy = next.y - this.player.y;
    const distance = Math.hypot(dx, dy);
    if (distance < SNEAK.fingerStopDistance) return { x: 0, y: 0 };
    const isLast = this.fingerPath.length === 1;
    const strength = isLast ? Math.min(1, distance / SNEAK.fingerSlowRadius) : 1;
    return { x: (dx / distance) * strength, y: (dy / distance) * strength };
  }

  // Laufraster über Raum und Türöffnung: Zellen, in die die Figur (mit Abstand) passt
  buildNavGrid() {
    const { wall } = SNEAK_LAYOUT;
    const cell = SNEAK.navCell;
    const clearance = SNEAK.navClearance;
    const area = { x: this.room.x, y: this.room.y, right: this.room.right, bottom: this.room.bottom + wall + 2 * cell };
    const cols = Math.ceil((area.right - area.x) / cell);
    const rows = Math.ceil((area.bottom - area.y) / cell);
    const blockers = this.solids.getChildren().map((solid) => solid.getBounds());
    const free = new Uint8Array(cols * rows);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx = area.x + (col + 0.5) * cell;
        const cy = area.y + (row + 0.5) * cell;
        const blocked = blockers.some((b) => cx > b.x - clearance && cx < b.right + clearance
          && cy > b.y - clearance && cy < b.bottom + clearance);
        free[row * cols + col] = blocked ? 0 : 1;
      }
    }
    this.nav = { area, cell, cols, rows, free };
  }

  navCellAt(x, y) {
    const { area, cell, cols, rows } = this.nav;
    const col = Phaser.Math.Clamp(Math.floor((x - area.x) / cell), 0, cols - 1);
    const row = Phaser.Math.Clamp(Math.floor((y - area.y) / cell), 0, rows - 1);
    return row * cols + col;
  }

  navCellCenter(index) {
    const { area, cell, cols } = this.nav;
    return { x: area.x + ((index % cols) + 0.5) * cell, y: area.y + (Math.floor(index / cols) + 0.5) * cell };
  }

  // Nächste freie Zelle (falls der Finger auf einem Tisch liegt)
  nearestFreeCell(index) {
    const { free } = this.nav;
    if (free[index]) return index;
    const origin = this.navCellCenter(index);
    let best = -1;
    let bestDistance = Infinity;
    free.forEach((isFree, i) => {
      if (!isFree) return;
      const c = this.navCellCenter(i);
      const d = (c.x - origin.x) ** 2 + (c.y - origin.y) ** 2;
      if (d < bestDistance) {
        bestDistance = d;
        best = i;
      }
    });
    return best === -1 ? index : best;
  }

  // Breitensuche (8 Richtungen) vom Spieler zum Ziel, danach Abkürzungen auf freier Sichtlinie
  findNavPath(from, to) {
    const { cols, rows, free } = this.nav;
    const start = this.navCellAt(from.x, from.y);
    const goal = this.nearestFreeCell(this.navCellAt(to.x, to.y));
    const goalPoint = free[this.navCellAt(to.x, to.y)] ? { x: to.x, y: to.y } : this.navCellCenter(goal);
    const previous = new Int32Array(cols * rows).fill(-1);
    previous[start] = start;
    const queue = [start];
    for (let head = 0; head < queue.length && previous[goal] === -1; head++) {
      const current = queue[head];
      const col = current % cols;
      const row = Math.floor(current / cols);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const c = col + dx;
          const r = row + dy;
          if ((dx === 0 && dy === 0) || c < 0 || r < 0 || c >= cols || r >= rows) continue;
          const next = r * cols + c;
          // Diagonal nur, wenn beide Nachbarn frei sind (nicht über Tischecken schneiden)
          if (!free[next] || previous[next] !== -1) continue;
          if (dx !== 0 && dy !== 0 && (!free[row * cols + c] || !free[r * cols + col])) continue;
          previous[next] = current;
          queue.push(next);
        }
      }
    }
    if (previous[goal] === -1) return [goalPoint]; // kein Weg – direkt versuchen
    const cells = [];
    for (let i = goal; i !== start; i = previous[i]) cells.unshift(i);
    const points = cells.map((i) => this.navCellCenter(i));
    points[points.length - 1] = goalPoint;
    // Wegpunkte überspringen, solange die direkte Linie frei ist
    const path = [];
    let anchor = { x: from.x, y: from.y };
    for (let i = 0; i < points.length; i++) {
      const isLast = i === points.length - 1;
      if (isLast || !this.navLineFree(anchor, points[i + 1])) {
        path.push(points[i]);
        anchor = points[i];
      }
    }
    return path;
  }

  navLineFree(a, b) {
    const steps = Math.ceil(Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) / (this.nav.cell / 2));
    for (let i = 1; i <= steps; i++) {
      const x = a.x + ((b.x - a.x) * i) / steps;
      const y = a.y + ((b.y - a.y) * i) / steps;
      if (!this.nav.free[this.navCellAt(x, y)]) return false;
    }
    return true;
  }


  returnPlayerToSeat() {
    const { seat } = SNEAK_LAYOUT;
    this.player.setPosition(seat.x, seat.y).setVelocity(0, 0);
    // Kurze Schonfrist, damit man am Platz nicht gleich wieder erwischt wird
    this.graceMs = SNEAK.respawnGraceMs;
    this.tweens.add({ targets: this.player, alpha: 0.2, duration: 120, yoyo: true, repeat: 5, onComplete: () => this.player.setAlpha(1) });
  }

  checkEctsPickup() {
    this.ectsCoins.forEach((coin) => {
      if (coin.collected) return;
      if (Phaser.Math.Distance.Between(coin.x, coin.y, this.player.x, this.player.y) > 22) return;
      coin.collected = true;
      this.tweens.killTweensOf(coin.image);
      coin.image.destroy();
      this.ectsCollected++;
      GameState.ects++;
      GameState.addScore(SCORING.ects);
      SFX.coin();
      floatText(this, coin.x, coin.y - 16, '+1 ECTS', CSS.accent, 16);
      if (!this.isDoorOpen() && this.ectsCollected >= this.ectsRequired) this.openDoor();
      this.updateEctsDisplay();
    });
  }

  checkHeartPickup() {
    this.heartPickups.forEach((heart) => {
      if (heart.collected) return;
      if (Phaser.Math.Distance.Between(heart.x, heart.y, this.player.x, this.player.y) > 22) return;
      heart.collected = true;
      this.tweens.killTweensOf(heart.image);
      heart.image.destroy();
      this.collectHeart(heart.x, heart.y);
    });
  }

  checkUmbrellaPickup() {
    const pickup = this.umbrellaPickup;
    if (!pickup || Phaser.Math.Distance.Between(pickup.x, pickup.y, this.player.x, this.player.y) > 24) return;
    this.umbrellaPickup = null;
    this.tweens.killTweensOf(pickup.image);
    pickup.image.destroy();
    GameState.hasUmbrella = true;
    SFX.powerup();
    floatText(this, pickup.x, pickup.y - 20, 'DHBW-Schirm! Schützt vor Papierfliegern ☂', CSS.accent, 16);
    this.updateEctsDisplay();
  }

  openDoor() {
    this.doorBlock.destroy();
    this.doorBlock = null;
    this.buildNavGrid(); // Türöffnung ist jetzt begehbar
    this.fingerPath = null;
    SFX.powerup();
    showBanner(this, 'Alle ECTS! Die Tür ist offen 🚪', CSS.success, 1100, 30);
  }

  // ---------- Dozent: Zustände ----------
  setPatrolState(state, options = {}) {
    this.patrolState = state;
    this.lecturerMark.setText(this.investigating && state === PatrolState.WALK ? '❗' : PATROL_MARKS[state]);
    switch (state) {
      case PatrolState.BOARD:
        this.stateTimerMs = randRange(...SNEAK.boardMs);
        this.boardTargetX = randRange(SNEAK_LAYOUT.lecturerMinX, SNEAK_LAYOUT.lecturerMaxX);
        break;
      case PatrolState.SCAN:
        this.stateTimerMs = options.durationMs ?? randRange(...SNEAK.scanMs);
        this.scanCenter = options.center ?? Math.PI / 2; // Standard: nach unten in den Raum
        this.scanAmplitude = Phaser.Math.DegToRad(options.amplitudeDeg ?? SNEAK.scanAmplitudeDeg);
        this.scanPhase = 0;
        this.scanSpeed = randRange(1.1, 1.6);
        break;
      case PatrolState.WALK:
        this.stateTimerMs = Infinity; // endet, sobald die Route abgelaufen ist
        break;
      case PatrolState.ALERT:
        this.stateTimerMs = SNEAK.alertMs;
        this.alertAngle = Phaser.Math.Angle.Between(this.lecturer.x, this.lecturer.y, options.point.x, options.point.y);
        SFX.warn();
        break;
      case PatrolState.CAUGHT:
        this.stateTimerMs = SNEAK.caughtMs;
        break;
      default:
        break;
    }
  }

  updateLecturer(dt) {
    const seconds = dt / 1000;
    this.stateTimerMs -= dt;

    const { angle, turnSpeed } = this.lookTarget(seconds);
    this.lookAngle = Phaser.Math.Angle.RotateTo(this.lookAngle, angle, turnSpeed * seconds);
    this.lecturer.rotation = this.lookAngle;
    this.lecturer.setScale(this.patrolState === PatrolState.WALK ? 1 + Math.sin(this.time.now * 0.02) * 0.05 : 1);
    this.lecturerMark.setPosition(this.lecturer.x, this.lecturer.y - 34);

    if (this.stateTimerMs > 0) return;
    switch (this.patrolState) {
      case PatrolState.BOARD: this.startPatrolRound(); break;
      case PatrolState.ALERT: this.startInvestigation(); break;
      default: this.resumePatrol(); break;
    }
  }

  // Wohin der Dozent gerade schauen will und wie schnell er sich dreht
  lookTarget(seconds) {
    switch (this.patrolState) {
      case PatrolState.BOARD: {
        const dx = this.boardTargetX - this.lecturer.x;
        if (Math.abs(dx) > 2) this.lecturer.x += Math.sign(dx) * Math.min(Math.abs(dx), SNEAK.boardWalkSpeed * seconds);
        return { angle: -Math.PI / 2, turnSpeed: 5 };
      }
      case PatrolState.SCAN:
        this.scanPhase += seconds * this.scanSpeed;
        return { angle: this.scanCenter + Math.sin(this.scanPhase) * this.scanAmplitude, turnSpeed: 4 };
      case PatrolState.WALK: {
        this.walkRoute(seconds);
        // Schaut beim Laufen nach vorne und lässt den Blick leicht schweifen
        const sway = Math.sin(this.time.now * 0.0022) * Phaser.Math.DegToRad(SNEAK.swayDeg);
        return { angle: this.walkHeading + sway, turnSpeed: 5 };
      }
      case PatrolState.ALERT:
        return { angle: this.alertAngle, turnSpeed: 8 };
      default:
        return { angle: this.lookAngle, turnSpeed: 4 };
    }
  }

  // ---------- Dozent: Runden und Nachsehen ----------
  // Zufällige Runde: einen Gang runter, hinten rüber, einen anderen Gang wieder hoch –
  // oder kurz: einen Gang halb runter, in eine Reihe schauen und zurück
  buildPatrolKeypoints() {
    const layout = SNEAK_LAYOUT;
    const [downAisle, upAisle] = Phaser.Utils.Array.Shuffle([...this.walkAisles]);
    if (Math.random() < SNEAK.shortRouteChance) {
      const rowY = pickRandom(layout.midY);
      const lookIntoRow = downAisle < GAME_WIDTH / 2 ? 0 : Math.PI;
      return [
        { x: downAisle, y: layout.lecturerY },
        { x: downAisle, y: rowY, pauseMs: randRange(...SNEAK.rowPauseMs), look: lookIntoRow },
        { x: downAisle, y: layout.lecturerY }
      ];
    }
    return [
      { x: downAisle, y: layout.lecturerY },
      { x: downAisle, y: layout.backY, pauseMs: randRange(...SNEAK.backPauseMs), look: -Math.PI / 2 },
      { x: upAisle, y: layout.backY },
      { x: upAisle, y: layout.lecturerY }
    ];
  }

  startPatrolRound() {
    this.investigating = false;
    this.planRoute(this.buildPatrolKeypoints(), SNEAK.walkSpeed);
    // Manchmal schaut er sich erst von vorne um, bevor er losläuft
    if (Math.random() < SNEAK.frontScanChance) this.setPatrolState(PatrolState.SCAN);
    else this.setPatrolState(PatrolState.WALK);
  }

  // Geräusch gehört: kurz horchen (ALERT), dann auf kürzestem Weg hinlaufen
  hearNoise(point) {
    if (this.patrolState === PatrolState.CAUGHT) return;
    this.noisePoint = point;
    this.setPatrolState(PatrolState.ALERT, { point });
  }

  startInvestigation() {
    const point = this.noisePoint;
    this.noisePoint = null;
    if (!point) {
      this.resumePatrol();
      return;
    }
    const spot = this.nearestWalkPoint(point);
    const look = Phaser.Math.Angle.Between(spot.x, spot.y, point.x, point.y);
    this.investigating = true;
    this.planRoute([{ ...spot, pauseMs: SNEAK.investigateMs, look, amplitudeDeg: SNEAK.investigateAmplitudeDeg }],
      SNEAK.investigateSpeed);
    this.setPatrolState(PatrolState.WALK);
  }

  // Nach einer Unterbrechung weiterlaufen – oder zurück zur Tafel, wenn die Route fertig ist
  resumePatrol() {
    if (this.routeIndex < this.route.length) {
      this.setPatrolState(PatrolState.WALK);
      return;
    }
    this.investigating = false;
    if (Math.abs(this.lecturer.y - SNEAK_LAYOUT.lecturerY) < 1) {
      this.setPatrolState(PatrolState.BOARD);
      return;
    }
    const boardX = randRange(SNEAK_LAYOUT.lecturerMinX, SNEAK_LAYOUT.lecturerMaxX);
    this.planRoute([{ x: boardX, y: SNEAK_LAYOUT.lecturerY }], SNEAK.walkSpeed);
    this.setPatrolState(PatrolState.WALK);
  }

  walkRoute(seconds) {
    const target = this.route[this.routeIndex];
    if (!target) return;
    const dx = target.x - this.lecturer.x;
    const dy = target.y - this.lecturer.y;
    const distance = Math.hypot(dx, dy);
    const step = this.walkSpeed * seconds;

    if (distance > step) {
      this.lecturer.x += (dx / distance) * step;
      this.lecturer.y += (dy / distance) * step;
      this.walkHeading = Math.atan2(dy, dx);
      return;
    }
    this.lecturer.setPosition(target.x, target.y);
    this.routeIndex++;
    if (target.pauseMs) {
      this.setPatrolState(PatrolState.SCAN, {
        durationMs: target.pauseMs,
        center: target.look,
        amplitudeDeg: target.amplitudeDeg ?? SNEAK.pauseAmplitudeDeg
      });
    } else if (this.routeIndex >= this.route.length) {
      this.resumePatrol();
    }
  }

  // Wandelt Zielpunkte in eine Route um, die nur über Gänge und Quergänge führt
  planRoute(keypoints, speed) {
    const route = [];
    let from = { x: this.lecturer.x, y: this.lecturer.y };
    keypoints.forEach((point) => {
      const path = this.gridPath(from, point);
      path[path.length - 1] = { ...path[path.length - 1], ...point }; // Pause/Blickrichtung am Ziel behalten
      route.push(...path);
      from = point;
    });
    this.route = route;
    this.routeIndex = 0;
    this.walkSpeed = speed;
  }

  // Weg zwischen zwei Punkten auf dem Laufraster – nie quer durch Tische
  gridPath(from, to) {
    const near = (a, b) => Math.abs(a - b) < 1;
    const onRow = (p) => this.walkRows.some((y) => near(p.y, y));
    const onAisle = (p) => this.walkAisles.some((x) => near(p.x, x));
    const closest = (list, value) => list.reduce((best, v) => (Math.abs(v - value) < Math.abs(best - value) ? v : best));
    const target = { x: to.x, y: to.y };

    if (near(from.x, to.x) && onAisle(from)) return [target];
    if (near(from.y, to.y) && onRow(from)) return [target];
    if (onRow(from) && onAisle(to)) return [{ x: to.x, y: from.y }, target];
    if (onAisle(from) && onRow(to)) return [{ x: from.x, y: to.y }, target];
    if (onAisle(from)) {
      const y = closest(this.walkRows, (from.y + to.y) / 2);
      return [{ x: from.x, y }, { x: to.x, y }, target];
    }
    const x = closest(this.walkAisles, (from.x + to.x) / 2);
    return [{ x, y: from.y }, { x, y: to.y }, target];
  }

  // Nächster Kreuzungspunkt von Gang und Quergang
  nearestWalkPoint(point) {
    const closest = (list, value) => list.reduce((best, v) => (Math.abs(v - value) < Math.abs(best - value) ? v : best));
    return { x: closest(this.walkAisles, point.x), y: closest(this.walkRows, point.y) };
  }

  // ---------- Sichtkegel ----------
  // Abstand bis zum ersten Hindernis entlang eines Strahls (höchstens maxDistance)
  castRay(ox, oy, dx, dy, maxDistance, desksBlock) {
    let distance = maxDistance;
    const occluders = desksBlock ? [...this.studentOccluders, ...this.deskOccluders] : this.studentOccluders;
    for (const rect of occluders) {
      const hit = rayRectDistance(ox, oy, dx, dy, rect);
      if (hit !== null && hit < distance) distance = hit;
    }
    const room = this.room;
    if (dx > 0) distance = Math.min(distance, (room.right - ox) / dx);
    if (dx < 0) distance = Math.min(distance, (room.x - ox) / dx);
    if (dy > 0) distance = Math.min(distance, (room.bottom - oy) / dy);
    if (dy < 0) distance = Math.min(distance, (room.y - oy) / dy);
    return distance;
  }

  isPlayerVisible(sneaking) {
    const { x: ox, y: oy } = this.lecturer;
    const { x: px, y: py } = this.player;
    const distance = Phaser.Math.Distance.Between(ox, oy, px, py);
    if (distance > SNEAK.coneRange) return false;
    const angleToPlayer = Phaser.Math.Angle.Between(ox, oy, px, py);
    if (Math.abs(Phaser.Math.Angle.Wrap(angleToPlayer - this.lookAngle)) > SNEAK.coneHalfAngle) return false;
    const dx = (px - ox) / distance;
    const dy = (py - oy) / distance;
    return this.castRay(ox, oy, dx, dy, distance, sneaking) >= distance - 1;
  }

  drawCone(playerVisible, sneaking) {
    const { x: ox, y: oy } = this.lecturer;
    const points = [{ x: ox, y: oy }];
    for (let i = 0; i <= SNEAK.rays; i++) {
      const angle = this.lookAngle - SNEAK.coneHalfAngle + (2 * SNEAK.coneHalfAngle * i) / SNEAK.rays;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      const distance = this.castRay(ox, oy, dx, dy, SNEAK.coneRange, sneaking);
      points.push({ x: ox + dx * distance, y: oy + dy * distance });
    }
    let color = this.investigating ? COLORS.warning : COLORS.cone;
    let alpha = this.patrolState === PatrolState.BOARD ? 0.12 : 0.3;
    if (playerVisible) {
      color = this.detection > 60 ? COLORS.danger : COLORS.warning;
      alpha = 0.4;
    }
    this.coneGfx.clear();
    this.coneGfx.fillStyle(color, alpha);
    this.coneGfx.fillPoints(points, true);
  }

  // ---------- Entdeckung ----------
  updateDetection(dt, visible, sneaking) {
    if (visible && this.patrolState !== PatrolState.CAUGHT && this.graceMs <= 0) {
      const distance = Phaser.Math.Distance.Between(this.lecturer.x, this.lecturer.y, this.player.x, this.player.y);
      let rate = SNEAK.fillRate * (1.25 - distance / SNEAK.coneRange); // je näher, desto schneller
      if (sneaking) rate *= SNEAK.sneakFillFactor;
      if (this.patrolState === PatrolState.ALERT || this.investigating) rate *= SNEAK.alertFillFactor;
      this.detection += rate * dt / 1000;
    } else {
      this.detection -= SNEAK.decayRate * dt / 1000;
    }
    this.detection = Phaser.Math.Clamp(this.detection, 0, 100);
    this.drawDetectionRing();
    if (this.detection >= 100) this.onCaught();
  }

  drawDetectionRing() {
    this.detectGfx.clear();
    if (this.detection <= 0) return;
    const ratio = this.detection / 100;
    const { x, y } = this.player;
    this.detectGfx.lineStyle(4, COLORS.black, 0.6);
    this.detectGfx.strokeCircle(x, y, 20);
    this.detectGfx.lineStyle(4, ratio > 0.6 ? COLORS.danger : COLORS.accent, 1);
    this.detectGfx.beginPath();
    this.detectGfx.arc(x, y, 20, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2, false);
    this.detectGfx.strokePath();
  }

  // Läuft der Dozent direkt in dich hinein, bist du sofort erwischt
  checkBump() {
    if (this.graceMs > 0 || this.patrolState === PatrolState.CAUGHT) return;
    const distance = Phaser.Math.Distance.Between(this.lecturer.x, this.lecturer.y, this.player.x, this.player.y);
    if (distance < SNEAK.bumpDistance) {
      floatText(this, this.lecturer.x, this.lecturer.y - 50, 'Na, wohin denn?', CSS.danger, 18);
      this.onCaught();
    }
  }

  // Rucksäcke rascheln und Schritte in seiner Nähe hört er – außer du schleichst
  checkNoise(dt, sneaking, moving) {
    this.backpacks.forEach((pack) => { pack.cooldownMs -= dt; });
    if (!moving || sneaking || this.patrolState === PatrolState.CAUGHT || this.graceMs > 0) return;

    const player = this.player;
    const pack = this.backpacks.find((p) =>
      p.cooldownMs <= 0 && Phaser.Math.Distance.Between(p.x, p.y, player.x, player.y) < SNEAK.backpackRadius);
    if (pack) {
      pack.cooldownMs = SNEAK.noiseCooldownMs;
      SFX.rustle();
      floatText(this, pack.x, pack.y - 20, '*RASCHEL*', CSS.accent, 16);
      this.tweens.add({ targets: pack.image, angle: pack.image.angle + 40, duration: 120 });
      this.hearNoise({ x: player.x, y: player.y });
      return;
    }

    const nearLecturer = Phaser.Math.Distance.Between(this.lecturer.x, this.lecturer.y, player.x, player.y) < SNEAK.noiseRadius;
    if (nearLecturer && this.noiseCooldownMs <= 0 && this.patrolState !== PatrolState.ALERT) {
      this.noiseCooldownMs = SNEAK.noiseCooldownMs;
      floatText(this, player.x, player.y - 24, '*tapp tapp*', CSS.white, 14);
      this.hearNoise({ x: player.x, y: player.y });
    }
  }

  onCaught() {
    this.detection = 0;
    this.setPatrolState(PatrolState.CAUGHT);
    const gameOver = this.punishPlayer(this.player.x, this.player.y - 30, '„Sie bleiben schön sitzen bis 17:30!“');
    if (gameOver) {
      this.player.setVelocity(0, 0);
      return;
    }
    showBanner(this, 'ERWISCHT! Zurück auf deinen Platz.', CSS.danger, 1000, 32);
    this.returnPlayerToSeat();
  }

  // ---------- Tür ----------
  checkDoor() {
    const { door } = SNEAK_LAYOUT;
    const inDoorway = this.player.x > door.x && this.player.x < door.x + door.w;
    if (!inDoorway) return;

    if (!this.isDoorOpen()) {
      const atDoor = this.player.y > this.room.bottom - 20;
      if (atDoor && this.doorHintCooldownMs <= 0) {
        this.doorHintCooldownMs = 1500;
        SFX.denied();
        floatText(this, this.player.x, this.player.y - 30, `Erst alle ECTS sammeln! (${this.ectsCollected}/${this.ectsRequired})`, CSS.danger, 15);
      }
      return;
    }
    if (this.player.y > this.room.bottom + 6) {
      this.player.setVelocity(0, 0);
      this.completeStage('Raus aus dem Hörsaal! 🚪', CSS.success);
    }
  }
}
