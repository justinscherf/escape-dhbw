'use strict';

// =====================================================================
//  SCHRITT 1: VORLESUNG (Ego-Perspektive)
//  Handy hochhalten, solange der Dozent zur Tafel schaut, und scrollen,
//  bis der Dopamin-Meter voll ist. Werbung blockiert das Scrollen, bis man
//  sie überspringen darf. Ab der Hälfte wird der Dozent misstrauisch.
// =====================================================================

const LecturerPose = Object.freeze({
  WRITING: 'writing',     // Rücken zur Klasse – sicher
  WARNING: 'warning',     // dreht sich gerade um – Handy weg!
  WATCHING: 'watching',   // schaut in die Klasse – sichtbares Handy = erwischt
  RETURNING: 'returning'  // dreht sich zurück zur Tafel
});

class LectureScene extends LevelScene {
  constructor() { super(SCENES.lecture); }

  create() {
    this.setupLevel(1);
    this.dopamine = 0;
    this.suspicious = false;
    this.phoneRaise = 0;         // 0 = versteckt, 1 = ganz oben
    this.phoneY = LECTURE_LAYOUT.phone.hiddenY;
    this.feedScroll = 0;
    this.feedScrollTarget = 0;
    this.posts = new Map();
    this.memeBag = [];
    this.adActive = false;
    this.adWaitMs = 0;
    this.scrollsUntilAd = Phaser.Math.Between(...LECTURE.firstAdAfterScrolls);
    // Countdowns in ms
    this.scrollCooldownMs = 0;
    this.decayDelayMs = 0;
    this.caughtLockMs = 0;
    this.phoneLockedMs = 0;

    this.drawRoom();
    this.createBoard();
    this.createLecturer();
    this.createStudents();
    this.drawDesk();
    this.createPhone();
    this.createAdOverlay();
    this.createMeter();
    this.createSpeechBubble();
    this.dopamineFx = new DopamineFx(this);
    this.streak = 0;
    this.streakWindowMs = 0;

    this.pose = null;
    this.setPose(LecturerPose.WRITING);

    MemeLibrary.startAnimations();
    this.events.once('shutdown', () => MemeLibrary.stopAnimations());
  }

  update(time, delta) {
    const dt = this.beginFrame(delta);
    if (dt === null) return;

    this.scrollCooldownMs -= dt;
    this.streakWindowMs -= dt;
    this.decayDelayMs -= dt;
    this.caughtLockMs -= dt;
    this.phoneLockedMs -= dt;

    if (!this.finished) this.updateLecturer(dt);
    this.updatePhone(dt);
    this.updateDopamine(dt);
    this.checkCaught();
    this.updateClock();
    this.endFrame();
  }

  // ---------- Raum ----------
  drawRoom() {
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(COLORS.wall, 1);
    g.fillRect(0, 0, GAME_WIDTH, 335);
    g.fillStyle(0xc4c4c4, 1);
    g.fillRect(0, 290, GAME_WIDTH, 45);
    // Deckenlichter
    g.fillStyle(0xffffff, 1);
    [180, 420, 660].forEach((x) => g.fillRect(x, 44, 120, 8));
    // Seitenwände
    g.fillStyle(0xb0b0b0, 1);
    g.fillPoints([{ x: 0, y: 0 }, { x: 110, y: 30 }, { x: 110, y: 335 }, { x: 0, y: 420 }], true);
    g.fillPoints([{ x: GAME_WIDTH, y: 0 }, { x: 850, y: 30 }, { x: 850, y: 335 }, { x: GAME_WIDTH, y: 420 }], true);
    // Tür auf der linken Wand – das Ziel von Schritt 2
    g.fillStyle(COLORS.darkGray, 1);
    g.fillPoints([{ x: 30, y: 160 }, { x: 80, y: 168 }, { x: 80, y: 345 }, { x: 30, y: 372 }], true);
    g.fillStyle(COLORS.success, 1);
    g.fillRect(36, 135, 38, 14);
    this.add.text(55, 137, 'EXIT', textStyle(9, CSS.white, FONT_BODY)).setOrigin(0.5, 0).setDepth(1);
    // Boden
    g.fillStyle(COLORS.floor, 1);
    g.fillPoints([{ x: 110, y: 335 }, { x: 850, y: 335 }, { x: GAME_WIDTH, y: 420 },
      { x: GAME_WIDTH, y: GAME_HEIGHT }, { x: 0, y: GAME_HEIGHT }, { x: 0, y: 420 }], true);
    g.lineStyle(2, COLORS.floorDark, 0.6);
    for (let i = 0; i < 8; i++) g.lineBetween(110 + i * 105, 335, -200 + i * 200, GAME_HEIGHT);
    // Wanduhr (Zeiger zeigen die echte Uhrzeit, siehe updateClock)
    const clock = LECTURE_LAYOUT.clock;
    g.fillStyle(COLORS.white, 1);
    g.fillCircle(clock.x, clock.y, clock.radius);
    g.lineStyle(3, COLORS.black, 1);
    g.strokeCircle(clock.x, clock.y, clock.radius);
    this.clockHands = this.add.graphics().setDepth(1);
  }

  updateClock() {
    const { x, y } = LECTURE_LAYOUT.clock;
    const now = new Date();
    const hands = [
      { angle: ((now.getHours() % 12) + now.getMinutes() / 60) * Math.PI / 6, length: 12, width: 4, color: COLORS.black },
      { angle: now.getMinutes() * Math.PI / 30, length: 19, width: 3, color: COLORS.black },
      { angle: now.getSeconds() * Math.PI / 30, length: 21, width: 1.5, color: COLORS.danger }
    ];
    this.clockHands.clear();
    hands.forEach((hand) => {
      const angle = hand.angle - Math.PI / 2; // 12 Uhr zeigt nach oben
      this.clockHands.lineStyle(hand.width, hand.color, 1);
      this.clockHands.lineBetween(x, y, x + Math.cos(angle) * hand.length, y + Math.sin(angle) * hand.length);
    });
  }

  createBoard() {
    const board = LECTURE_LAYOUT.board;
    const g = this.add.graphics().setDepth(1);
    g.fillStyle(0x8a8a8a, 1);
    g.fillRect(board.x - 8, board.y - 8, board.w + 16, board.h + 16);
    g.fillStyle(0xffffff, 1);
    g.fillRect(board.x, board.y, board.w, board.h);
    g.fillStyle(0x6a6a6a, 1);
    g.fillRect(board.x - 4, board.y + board.h + 8, board.w + 8, 8);
    this.boardTopics = [];
    this.boardLines = [];
    this.startNextTopic();
  }

  // Neues Klausurthema: Tafel wischen und Zeilen vorbereiten
  startNextTopic() {
    const board = LECTURE_LAYOUT.board;
    if (this.boardTopics.length === 0) this.boardTopics = Phaser.Utils.Array.Shuffle([...BOARD_TOPICS]);
    const topic = this.boardTopics.pop();
    this.boardLines.forEach((line) => line.text.destroy());
    this.boardLines = [topic.title, ...topic.lines].map((content, i) => ({
      content,
      text: this.add.text(board.x + 16, board.y + 10 + i * 32, '', {
        fontFamily: 'Comic Sans MS, "Chalkboard SE", cursive',
        fontSize: i === 0 ? '17px' : '14px',
        fontStyle: i === 0 ? 'bold' : 'normal',
        color: i === 0 ? '#c0262d' : CSS.marker
      }).setDepth(2)
    }));
    this.writingLine = 0;
    this.writtenChars = 0;
    this.boardPauseMs = 0;
    this.penX = board.x + 16;
  }

  // Schreibt das aktuelle Thema Zeichen für Zeichen an die Tafel
  writeOnBoard(dt) {
    if (this.boardPauseMs > 0) {
      this.boardPauseMs -= dt;
      if (this.boardPauseMs <= 0) this.startNextTopic();
      return;
    }
    const line = this.boardLines[this.writingLine];
    this.writtenChars = Math.min(line.content.length, this.writtenChars + LECTURE.writeCharsPerSec * dt / 1000);
    line.text.setText(line.content.slice(0, Math.floor(this.writtenChars)));
    this.penX = line.text.x + line.text.width;

    if (this.writtenChars < line.content.length) return;
    this.writingLine++;
    this.writtenChars = 0;
    if (this.writingLine >= this.boardLines.length) this.boardPauseMs = LECTURE.boardFullPauseMs; // kurz stehen lassen, dann wischen
  }

  createLecturer() {
    const layout = LECTURE_LAYOUT.lecturer;
    const makePose = (draw) => {
      const g = this.add.graphics();
      draw(g);
      return g;
    };
    this.lecturerBack = makePose(drawLecturerBack);
    this.lecturerSide = makePose(drawLecturerSide);
    this.lecturerFront = makePose(drawLecturerFront);
    this.alertMark = this.add.text(0, -285, '!', textStyle(40, CSS.danger)).setOrigin(0.5);
    this.lecturer = this.add.container(layout.startX, layout.feetY,
      [this.lecturerBack, this.lecturerSide, this.lecturerFront, this.alertMark]).setDepth(3);
  }

  createStudents() {
    const hairColors = [0x1a1a1a, 0x3b3b3b, 0x6b6b6b, 0x2a2a2a, 0x8a8a8a, 0x111111];
    const shirtColors = [0x2b2b2b, 0x555555, 0x7a7a7a, 0x9a9a9a, 0x3d3d3d, 0xbdbdbd];

    // Hintere Reihe (kleiner, mit Lücken)
    const farRow = this.add.graphics().setDepth(4);
    farRow.fillStyle(0x8c8c8c, 1);
    farRow.fillRect(120, 336, 720, 12);
    for (let x = 170; x <= 800; x += 78) {
      if (Math.random() < 0.15) continue;
      drawStudentBack(farRow, x + randRange(-8, 8), 318, 0.75, pickRandom(hairColors), pickRandom(shirtColors));
    }

    // Vordere Reihe direkt vor dir
    const nearRow = this.add.graphics().setDepth(5);
    nearRow.fillStyle(0x7a7a7a, 1);
    nearRow.fillRect(60, 418, 840, 16);
    [120, 240, 360, 600, 720, 840].forEach((x) => {
      drawStudentBack(nearRow, x, 398, 1.1, pickRandom(hairColors), pickRandom(shirtColors));
    });

    // Ein Kommilitone schläft – Kopf nickt langsam
    const sleeper = this.add.graphics().setDepth(5).setPosition(480, 398);
    drawStudentBack(sleeper, 0, 0, 1.1, 0x2a2a2a, 0x555555);
    this.tweens.add({ targets: sleeper, y: 410, angle: 6, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.time.addEvent({
      delay: 2600,
      loop: true,
      callback: () => floatText(this, 500 + randRange(-10, 10), 360, 'z', CSS.gray, 18)
    });
  }

  drawDesk() {
    const g = this.add.graphics().setDepth(6);
    g.fillStyle(0x5a5a5a, 1);
    g.fillRect(0, 470, GAME_WIDTH, 70);
    g.fillStyle(0x808080, 1);
    g.fillRect(0, 470, GAME_WIDTH, 6);
    // Collegeblock und Stift
    g.fillStyle(COLORS.white, 1);
    g.fillRect(250, 482, 190, 58);
    g.lineStyle(1, 0x9ab4e8, 1);
    for (let i = 0; i < 5; i++) g.lineBetween(256, 494 + i * 10, 434, 494 + i * 10);
    g.lineStyle(5, COLORS.marker, 1);
    g.lineBetween(460, 520, 540, 490);
  }

  // ---------- Sprechblase ----------
  createSpeechBubble() {
    this.bubbleBg = this.add.graphics();
    this.bubbleText = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '20px', color: CSS.black }).setOrigin(0.5);
    this.bubble = this.add.container(0, 0, [this.bubbleBg, this.bubbleText]).setDepth(40).setVisible(false);
  }

  say(text, duration = 1200) {
    this.bubbleText.setText(text);
    const width = this.bubbleText.width + 30;
    const height = 44;
    this.bubbleBg.clear();
    this.bubbleBg.fillStyle(0xffffff, 1);
    this.bubbleBg.lineStyle(3, COLORS.black, 1);
    this.bubbleBg.fillRoundedRect(-width / 2, -height / 2, width, height, 12);
    this.bubbleBg.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);
    this.bubbleBg.fillTriangle(-width / 2 + 14, height / 2 - 2, -width / 2 + 34, height / 2 - 2, -width / 2 + 6, height / 2 + 16);

    const x = Phaser.Math.Clamp(this.lecturer.x + width / 2 + 30, width / 2 + 10, GAME_WIDTH - width / 2 - 10);
    this.bubble.setPosition(x, LECTURE_LAYOUT.bubbleY).setVisible(true).setScale(0.6);
    this.tweens.add({ targets: this.bubble, scale: 1, duration: 150, ease: 'Back.easeOut' });
    if (this.bubbleTimer) this.bubbleTimer.remove();
    this.bubbleTimer = this.time.delayedCall(duration, () => this.bubble.setVisible(false));
  }

  // ---------- Dozent: Zustandsautomat ----------
  currentPhase() {
    return this.suspicious ? LECTURE.phases.suspicious : LECTURE.phases.calm;
  }

  // 0 bei 50 % Dopamin bis 1 bei 100 % – in der misstrauischen Phase wird er noch etwas schneller
  suspicionRamp() {
    if (!this.suspicious) return 0;
    const ratio = this.dopamine / LECTURE.dopamineGoal;
    return Phaser.Math.Clamp((ratio - LECTURE.suspiciousAt) / (1 - LECTURE.suspiciousAt), 0, 1);
  }

  setPose(pose) {
    const previousPose = this.pose;
    const phase = this.currentPhase();
    const ramp = this.suspicionRamp();
    this.pose = pose;

    switch (pose) {
      case LecturerPose.WRITING: {
        const quickTurn = previousPose === LecturerPose.RETURNING && Math.random() < phase.quickTurnChance;
        this.poseTimerMs = quickTurn
          ? randRange(...LECTURE.quickTurnMs)
          : randRange(...phase.writingMs) * (1 - LECTURE.suspicionRamp.writing * ramp);
        break;
      }
      case LecturerPose.WARNING:
        this.poseTimerMs = randRange(...phase.warningMs) * (1 - LECTURE.suspicionRamp.warning * ramp);
        this.isFakeTurn = Math.random() < phase.fakeChance;
        this.alertMark.setText('!');
        SFX.warn();
        if (Math.random() < 0.5) this.say(pickRandom(['Ähm…', 'So…', 'Also…', 'Hmm…']), 700);
        break;
      case LecturerPose.WATCHING:
        this.poseTimerMs = randRange(...phase.watchingMs);
        if (Math.random() < 0.4) this.say(pickRandom(['Fragen?', 'Alles klar soweit?', 'Das kommt dran!', 'Hallo?']), 1100);
        break;
      case LecturerPose.RETURNING:
        this.poseTimerMs = LECTURE.returningMs;
        if (this.isFakeTurn) this.alertMark.setText('?'); // hat sich nur angetäuscht umgedreht
        break;
      default:
        break;
    }

    // Musik verstummt, sobald sich der Dozent umdreht, und bleibt aus, solange er schaut
    if (pose === LecturerPose.WARNING || pose === LecturerPose.WATCHING) Music.pause();
    else Music.resume();

    this.lecturerBack.setVisible(pose === LecturerPose.WRITING);
    this.lecturerSide.setVisible(pose === LecturerPose.WARNING || pose === LecturerPose.RETURNING);
    this.lecturerFront.setVisible(pose === LecturerPose.WATCHING);
    this.alertMark.setVisible(pose === LecturerPose.WARNING || (pose === LecturerPose.RETURNING && this.isFakeTurn));
  }

  nextPose() {
    switch (this.pose) {
      case LecturerPose.WRITING: return LecturerPose.WARNING;
      case LecturerPose.WARNING: return this.isFakeTurn ? LecturerPose.RETURNING : LecturerPose.WATCHING;
      case LecturerPose.WATCHING:
        this.isFakeTurn = false;
        return LecturerPose.RETURNING;
      default: return LecturerPose.WRITING;
    }
  }

  updateLecturer(dt) {
    this.poseTimerMs -= dt;

    if (this.pose === LecturerPose.WRITING) {
      const layout = LECTURE_LAYOUT.lecturer;
      this.writeOnBoard(dt);
      // Steht links neben der Stelle, an der er gerade schreibt
      const targetX = Phaser.Math.Clamp(this.penX - 60, layout.minX, layout.maxX);
      this.lecturer.x = Phaser.Math.Linear(this.lecturer.x, targetX, Math.min(1, dt * 0.004));
      this.lecturer.y = layout.feetY + Math.sin(this.time.now * 0.012) * 1.5;
    }

    if (this.poseTimerMs <= 0) this.setPose(this.nextPose());
  }

  // ---------- Handy ----------
  createPhone() {
    const phone = LECTURE_LAYOUT.phone;
    const halfW = phone.screenWidth / 2;
    const halfH = phone.screenHeight / 2;

    this.phoneBody = this.add.graphics().setDepth(20);
    this.phoneBody.fillStyle(COLORS.black, 1);
    this.phoneBody.fillRoundedRect(-halfW - 10, -halfH - 25, phone.screenWidth + 20, phone.screenHeight + 50, 24);
    this.phoneBody.lineStyle(3, 0x444444, 1);
    this.phoneBody.strokeRoundedRect(-halfW - 10, -halfH - 25, phone.screenWidth + 20, phone.screenHeight + 50, 24);
    this.phoneBody.fillStyle(0x0b0b0b, 1);
    this.phoneBody.fillRect(-halfW, -halfH, phone.screenWidth, phone.screenHeight);

    // Der Feed ist ein eigener Container; die Maske schneidet ihn auf den Bildschirm zu
    this.feed = this.add.container(0, 0).setDepth(21);
    this.feedMaskShape = this.make.graphics({ x: 0, y: 0 }, false);
    this.feedMaskShape.fillStyle(0xffffff, 1);
    this.feedMaskShape.fillRect(phone.x - halfW, -halfH, phone.screenWidth, phone.screenHeight);
    this.feed.setMask(this.feedMaskShape.createGeometryMask());

    // Kamera-Notch und Home-Balken über dem Feed
    this.phoneOverlay = this.add.graphics().setDepth(22);
    this.phoneOverlay.fillStyle(COLORS.black, 1);
    this.phoneOverlay.fillRoundedRect(-28, -halfH - 19, 56, 12, 6);
    this.phoneOverlay.fillStyle(0x666666, 1);
    this.phoneOverlay.fillRoundedRect(-30, halfH + 9, 60, 5, 2);

    this.ensurePosts();
  }

  // Ein Post im Feed: echtes Meme aus assets/memes/ oder generierter Emoji-Post
  createPost(index) {
    const palette = [0xff5f7e, 0x7b5cff, 0x23c4a7, 0xffa53b, 0x3bb7ff, 0xff4fd8, 0x9be15d];
    const emojis = ['🐱', '🍕', '😂', '🔥', '🎮', '🏖️', '🐶', '🍔', '💅', '🚀', '😱', '🧋', '🤡', '💀'];
    const names = ['@mensa_memes', '@dhbw_confessions', '@katzencontent', '@gym_bro_96', '@kommilitone42', '@reisefieber', '@foodporn_ka'];
    const width = LECTURE_LAYOUT.phone.screenWidth;
    const height = LECTURE.postHeight;
    const media = { x: 4, y: 24, width: width - 8, height: height - 50 };
    const accent = pickRandom(palette);
    const small = { fontFamily: FONT_BODY, fontSize: '11px' };

    const g = this.add.graphics();
    g.fillStyle(0x1b1b1b, 1);
    g.fillRect(0, 0, width, height);
    g.fillStyle(accent, 1);
    g.fillCircle(14, 12, 7);
    const parts = [g, this.add.text(26, 5, pickRandom(names), { ...small, color: '#ffffff' })];

    const memeKey = this.nextMemeKey();
    if (memeKey) {
      g.fillStyle(0x000000, 1);
      g.fillRect(media.x, media.y, media.width, media.height);
      const image = this.add.image(media.x + media.width / 2, media.y + media.height / 2, memeKey);
      image.setScale(Math.min(media.width / image.width, media.height / image.height));
      parts.push(image);
    } else {
      g.fillStyle(accent, 1);
      g.fillRect(media.x, media.y, media.width, media.height);
      g.fillStyle(0xffffff, 0.25);
      g.fillCircle(media.x + media.width - 30, media.y + 30, 18);
      parts.push(this.add.text(width / 2, media.y + media.height / 2, pickRandom(emojis), { fontSize: '56px' }).setOrigin(0.5));
    }

    parts.push(this.add.text(6, height - 20, `♥ ${(Math.random() * 20).toFixed(1)}k   💬 ${Math.floor(Math.random() * 900)}`,
      { ...small, color: '#ff7b9c' }));
    const post = this.add.container(0, index * height, parts);
    this.feed.add(post);
    return post;
  }

  // Memes wie aus einem gemischten Stapel ziehen, damit sich nichts direkt wiederholt
  nextMemeKey() {
    if (!MemeLibrary.hasMemes() || Math.random() > LECTURE.memeChance) return null;
    if (this.memeBag.length === 0) this.memeBag = Phaser.Utils.Array.Shuffle([...MemeLibrary.keys]);
    return this.memeBag.pop();
  }

  // Hält nur die Posts rund um die aktuelle Scrollposition vor
  ensurePosts() {
    const first = Math.max(0, Math.floor(this.feedScroll / LECTURE.postHeight) - 1);
    const last = first + 4;
    for (let i = first; i <= last; i++) {
      if (!this.posts.has(i)) this.posts.set(i, this.createPost(i));
    }
    for (const [index, post] of this.posts) {
      if (index < first) {
        post.destroy();
        this.posts.delete(index);
      }
    }
  }

  layoutPhone() {
    const phone = LECTURE_LAYOUT.phone;
    this.phoneBody.setPosition(phone.x, this.phoneY);
    this.phoneOverlay.setPosition(phone.x, this.phoneY);
    this.feed.setPosition(phone.x - phone.screenWidth / 2, this.phoneY - phone.screenHeight / 2 - this.feedScroll);
    this.feedMaskShape.y = this.phoneY;
    this.adOverlay.setPosition(phone.x, this.phoneY);
  }

  updatePhone(dt) {
    const phone = LECTURE_LAYOUT.phone;
    const wantsPhone = this.inputs.downHeld() && this.phoneLockedMs <= 0 && !this.finished;
    if (wantsPhone && this.phoneRaise === 0) SFX.phoneUp();
    this.phoneRaise = wantsPhone
      ? Math.min(1, this.phoneRaise + dt / LECTURE.phoneRaiseMs)
      : Math.max(0, this.phoneRaise - dt / LECTURE.phoneLowerMs);
    this.phoneY = Phaser.Math.Linear(phone.hiddenY, phone.shownY, Phaser.Math.Easing.Cubic.Out(this.phoneRaise));

    const canTouch = this.phoneRaise >= LECTURE.phoneUsableAt && this.scrollCooldownMs <= 0 && !this.finished;
    if (canTouch && this.inputs.wasPressed('action')) {
      if (!this.adActive) this.scrollFeed();
      else if (this.adWaitMs <= 0) this.skipAd();
      else SFX.denied();
    }
    this.updateAd(dt);

    this.feedScroll += (this.feedScrollTarget - this.feedScroll) * Math.min(1, dt * LECTURE.feedSmoothing);
    this.ensurePosts();
    this.layoutPhone();
  }

  scrollFeed() {
    const phoneX = LECTURE_LAYOUT.phone.x;
    const labelX = phoneX - LECTURE_LAYOUT.phone.screenWidth / 2 - 40;
    this.feedScrollTarget += LECTURE.postHeight;
    this.scrollCooldownMs = LECTURE.scrollCooldownMs;
    this.decayDelayMs = LECTURE.decayDelayMs;

    // Schnell hintereinander scrollen = Combo mit etwas mehr Dopamin
    this.streak = this.streakWindowMs > 0 ? this.streak + 1 : 1;
    this.streakWindowMs = LECTURE.streakWindowMs;
    const comboFactor = 1 + Math.min(this.streak, LECTURE.streakBonusMax) * LECTURE.streakBonusPerScroll;

    const isViral = Math.random() < LECTURE.viralChance;
    const gain = (isViral ? LECTURE.viralGain : randRange(LECTURE.scrollGainMin, LECTURE.scrollGainMax)) * comboFactor;
    this.dopamine = Math.min(LECTURE.dopamineGoal, this.dopamine + gain);
    const ratio = this.dopamine / LECTURE.dopamineGoal;
    GameState.addScore(isViral ? LECTURE.viralScore : LECTURE.scrollScore);
    if (isViral) {
      SFX.viral();
      floatText(this, phoneX, this.phoneY - 190, 'VIRAL! 🔥', CSS.accent, 24);
    } else {
      SFX.scroll(ratio);
    }
    this.dopamineFx.burst(ratio, phoneX, this.phoneY - LECTURE_LAYOUT.phone.screenHeight / 2, isViral);
    this.dopamineFx.showStreak(this.streak);
    floatText(this, labelX + randRange(-10, 10), this.phoneY - 40, `+${gain.toFixed(1)}`, CSS.dopamine, 20);

    this.scrollsUntilAd--;
    if (this.scrollsUntilAd <= 0) this.showAd();
  }

  // ---------- Werbung ----------
  // Liegt über dem Feed; der Countdown läuft nur, solange das Handy oben ist
  createAdOverlay() {
    const { screenWidth, screenHeight } = LECTURE_LAYOUT.phone;
    const halfW = screenWidth / 2;
    const halfH = screenHeight / 2;
    const wrap = { wordWrap: { width: screenWidth - 24 }, align: 'center' };

    this.adBackground = this.add.graphics();
    this.adTag = this.add.text(-halfW + 8, -halfH + 8, 'ANZEIGE', {
      fontFamily: FONT_BODY, fontSize: '10px', color: '#111111', backgroundColor: '#ffd23f', padding: { x: 4, y: 2 }
    });
    this.adEmoji = this.add.text(0, -50, '', { fontSize: '58px' }).setOrigin(0.5);
    this.adTitle = this.add.text(0, 18, '', { ...textStyle(19, CSS.white), ...wrap }).setOrigin(0.5);
    this.adBody = this.add.text(0, 62, '', { fontFamily: FONT_BODY, fontSize: '13px', color: '#ffffff', ...wrap }).setOrigin(0.5);
    this.adSkipBox = this.add.rectangle(halfW - 62, halfH - 30, 112, 30, 0x000000, 0.75).setStrokeStyle(1, 0xffffff, 0.6);
    this.adSkipText = this.add.text(halfW - 62, halfH - 30, '', { fontFamily: FONT_BODY, fontSize: '12px', color: '#ffffff' }).setOrigin(0.5);
    this.adProgress = this.add.rectangle(-halfW, halfH - 3, screenWidth, 4, COLORS.accent).setOrigin(0, 0.5);

    this.adOverlay = this.add.container(0, 0, [
      this.adBackground, this.adTag, this.adEmoji, this.adTitle, this.adBody, this.adSkipBox, this.adSkipText, this.adProgress
    ]).setDepth(21.5).setVisible(false);    this.layoutPhone();
  }

  showAd() {
    const { screenWidth, screenHeight } = LECTURE_LAYOUT.phone;
    const ad = pickRandom(ADS);
    this.adActive = true;
    this.adTotalMs = randRange(...LECTURE.adWaitMs);
    this.adWaitMs = this.adTotalMs;

    this.adBackground.clear();
    this.adBackground.fillStyle(ad.color, 1);
    this.adBackground.fillRect(-screenWidth / 2, -screenHeight / 2, screenWidth, screenHeight);
    this.adBackground.fillStyle(0xffffff, 0.12);
    this.adBackground.fillCircle(0, -50, 52);
    this.adEmoji.setText(ad.emoji);
    this.adTitle.setText(ad.title);
    this.adBody.setText(ad.text);
    this.adOverlay.setVisible(true);
    SFX.ad();
  }

  updateAd(dt) {
    if (!this.adActive) return;
    const isWatching = this.phoneRaise >= LECTURE.phoneUsableAt;
    if (isWatching) this.adWaitMs = Math.max(0, this.adWaitMs - dt);

    const canSkip = this.adWaitMs <= 0;
    this.adSkipText.setText(canSkip ? 'Werbung überspringen ▶' : `Überspringen in ${Math.ceil(this.adWaitMs / 1000)}`);
    this.adSkipBox.setFillStyle(canSkip ? 0xffffff : 0x000000, canSkip ? 0.95 : 0.75);
    this.adSkipText.setColor(canSkip ? '#111111' : '#ffffff');
    this.adSkipBox.setScale(canSkip ? 1 + Math.sin(this.time.now * 0.012) * 0.04 : 1);
    this.adProgress.setScale(1 - this.adWaitMs / this.adTotalMs, 1);
  }

  skipAd() {
    this.adActive = false;
    this.adOverlay.setVisible(false);
    this.feedScrollTarget += LECTURE.postHeight;
    this.scrollCooldownMs = LECTURE.scrollCooldownMs;
    this.scrollsUntilAd = Phaser.Math.Between(...LECTURE.adEveryScrolls);
    SFX.click();
  }

  // ---------- Dopamin-Meter ----------
  createMeter() {
    const { x, top, height } = LECTURE_LAYOUT.meter;
    this.add.rectangle(x, top + height / 2, 34, height + 6, COLORS.black).setStrokeStyle(3, COLORS.white).setDepth(30);
    this.meterFill = this.add.rectangle(x, top + height, 26, height, COLORS.dopamine)
      .setOrigin(0.5, 1).setDepth(31).setScale(1, 0);
    this.brainIcon = this.add.text(x, top - 26, '🧠', { fontSize: '26px' }).setOrigin(0.5).setDepth(31);
    this.add.text(x, top + height + 18, 'DOPAMIN', textStyle(12, CSS.dopamine)).setOrigin(0.5).setDepth(31);
    this.meterText = this.add.text(x, top + height + 36, '0%', textStyle(16)).setOrigin(0.5).setDepth(31);

    // Markierung: ab hier wird der Dozent misstrauisch
    const suspicionY = top + height * (1 - LECTURE.suspiciousAt);
    this.add.rectangle(x, suspicionY, 44, 3, COLORS.danger).setDepth(32);
    this.add.text(x + 26, suspicionY, '👀', { fontSize: '16px' }).setOrigin(0, 0.5).setDepth(32);

    // Rötlicher Bildschirmrand in der misstrauischen Phase
    this.suspicionGlow = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH - 8, GAME_HEIGHT - 8)
      .setStrokeStyle(8, COLORS.danger, 0.5).setDepth(850).setVisible(false);
    this.tweens.add({ targets: this.suspicionGlow, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
  }

  updateDopamine(dt) {
    // Dopamin sinkt nur, wenn das Handy unten ist – oben bleibt es stehen, steigt aber nur durchs Scrollen
    const phoneIsUp = this.phoneRaise >= LECTURE.phoneUsableAt;
    if (!phoneIsUp && this.decayDelayMs <= 0 && !this.finished) {
      this.dopamine = Math.max(0, this.dopamine - LECTURE.decayPerSec * dt / 1000);
    }
    const ratio = this.dopamine / LECTURE.dopamineGoal;
    const blinkWhite = ratio > 0.8 && Math.floor(this.time.now / 150) % 2 === 0;
    this.meterFill.setScale(1, ratio);
    this.meterFill.setFillStyle(blinkWhite ? 0xffffff : COLORS.dopamine);
    this.meterText.setText(`${Math.floor(ratio * 100)}%`);

    // Das Dopamin soll man spüren: Farben, Herzschlag des Gehirns, schnellere Musik
    this.dopamineFx.update(ratio);
    const beat = Math.max(0, Math.sin(this.time.now * (0.004 + 0.01 * ratio)));
    this.brainIcon.setScale(1 + 0.25 * ratio * beat);
    Music.setTempo(1 + DOPAMINE_FX.maxMusicSpeedup * ratio);

    if (this.finished) return;
    if (!this.suspicious && ratio >= LECTURE.suspiciousAt) this.becomeSuspicious();
    if (ratio >= 1) {
      this.say('…wo wollen Sie denn hin?!', 1600);
      this.completeStage('DOPAMIN VOLL! 🧠✨', CSS.dopamine);
    }
  }

  // Ab der Hälfte dreht er sich schneller und öfter um – und bleibt dabei
  becomeSuspicious() {
    this.suspicious = true;
    SFX.warn();
    showBanner(this, 'Der Dozent wird misstrauisch 👀', CSS.danger, 1400, 34);
    this.say('Ich seh euch!', 1300);
    this.suspicionGlow.setVisible(true);
  }

  // ---------- Erwischt ----------
  checkCaught() {
    if (this.finished || this.caughtLockMs > 0) return;
    if (this.pose !== LecturerPose.WATCHING) return;
    if (this.phoneRaise <= LECTURE.catchThreshold) return;

    this.caughtLockMs = LECTURE.caughtLockMs;
    this.phoneLockedMs = LECTURE.phoneLockedMs;
    this.poseTimerMs = Math.max(this.poseTimerMs, LECTURE.keepWatchingMs);
    this.dopamine = Math.max(0, this.dopamine - LECTURE.caughtPenalty);
    this.say('HANDY WEG!', 1300);
    this.punishPlayer(GAME_WIDTH / 2, 300, 'Der Dozent hat dein Handy einkassiert.');
  }
}
