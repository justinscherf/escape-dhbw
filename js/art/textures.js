'use strict';

// =====================================================================
//  TEXTUREN – alles per Code gezeichnet, keine externen Bilddateien
// =====================================================================

const TEX = Object.freeze({
  pixel: 'px',
  heart: 'heart',
  floorTile: 'tile_floor',
  playerIdle: 'player_idle',
  playerRun: ['player_run_0', 'player_run_1', 'player_run_2', 'player_run_3'],
  playerJump: 'player_jump',
  playerFall: 'player_fall',
  playerTop: 'player_top',
  lecturerWalk: ['dozent_walk_0', 'dozent_walk_1'],
  table: 'table',
  ects: 'ects',
  coffee: 'coffee',
  plane: 'plane',
  cart: 'cart',
  chairs: 'chairs',
  door: 'door',
  entrance: 'entrance',
  backpack: 'backpack_top',
  wetSign: 'wetsign',
  umbrella: 'umbrella',
  umbrellaClosed: 'umbrella_closed'
});

const ANIM = Object.freeze({
  playerRun: 'player-run',
  lecturerWalk: 'lecturer-walk'
});

// Posen des Spielers von der Seite – Winkel in Grad: 0 = senkrecht nach unten, + = nach vorne
const PLAYER_POSES = Object.freeze({
  idle: { frontLeg: 4, backLeg: -4, frontArm: 8, backArm: -8, bob: 0 },
  run: [
    { frontLeg: 32, backLeg: -28, frontArm: -35, backArm: 35, bob: 0 },
    { frontLeg: 8, backLeg: -6, frontArm: -5, backArm: 5, bob: -1 },
    { frontLeg: -28, backLeg: 32, frontArm: 35, backArm: -35, bob: 0 },
    { frontLeg: -6, backLeg: 8, frontArm: 5, backArm: -5, bob: -1 }
  ],
  jump: { frontLeg: 40, backLeg: -20, frontArm: 150, backArm: 130, bob: -1 },
  fall: { frontLeg: 15, backLeg: -25, frontArm: 120, backArm: -120, bob: 0 }
});

// Zeichnet in ein unsichtbares Graphics-Objekt und speichert das Ergebnis als Textur.
// Gezeichnet wird in Spielpunkten, gespeichert DISPLAY.textureRes-fach – angezeigt
// werden die Texturen mit hiRes() wieder in Normalgröße, aber gestochen scharf.
function bakeTexture(scene, key, width, height, draw) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.setScale(DISPLAY.textureRes);
  draw(g);
  g.generateTexture(key, width * DISPLAY.textureRes, height * DISPLAY.textureRes);
  g.destroy();
}

function createAllTextures(scene) {
  bakeTexture(scene, TEX.pixel, 6, 6, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 6, 6);
  });

  bakeTexture(scene, TEX.heart, 24, 23, (g) => {
    g.fillStyle(COLORS.danger, 1);
    g.fillCircle(7, 7, 7);
    g.fillCircle(17, 7, 7);
    g.fillTriangle(0.5, 9, 23.5, 9, 12, 22);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(6, 5, 2);
  });

  bakeTexture(scene, TEX.floorTile, 32, 32, (g) => {
    g.fillStyle(COLORS.floor, 1);
    g.fillRect(0, 0, 32, 32);
    g.fillStyle(COLORS.floorLight, 1);
    g.fillRect(0, 0, 32, 5);
    g.fillStyle(COLORS.floorDark, 1);
    g.fillRect(0, 28, 32, 4);
    g.fillRect(31, 5, 1, 23);
  });

  // Spieler von der Seite (Jump & Run): Stand, vier Laufbilder, Sprung und Fall
  bakeTexture(scene, TEX.playerIdle, 28, 46, (g) => drawPlayerSide(g, PLAYER_POSES.idle));
  TEX.playerRun.forEach((key, i) => bakeTexture(scene, key, 28, 46, (g) => drawPlayerSide(g, PLAYER_POSES.run[i])));
  bakeTexture(scene, TEX.playerJump, 28, 46, (g) => drawPlayerSide(g, PLAYER_POSES.jump));
  bakeTexture(scene, TEX.playerFall, 28, 46, (g) => drawPlayerSide(g, PLAYER_POSES.fall));

  // Spieler von oben (Schleich-Level) – schaut nach rechts
  bakeTexture(scene, TEX.playerTop, 30, 30, (g) => {
    g.fillStyle(COLORS.accent, 1);
    g.fillRoundedRect(1, 8, 9, 14, 3);
    g.fillStyle(COLORS.white, 1);
    g.lineStyle(2, COLORS.black, 1);
    g.fillEllipse(15, 15, 16, 24);
    g.strokeEllipse(15, 15, 16, 24);
    g.fillStyle(COLORS.black, 1);
    g.fillCircle(16, 15, 7);
    g.fillStyle(COLORS.skin, 1);
    g.fillCircle(22, 15, 2.5);
  });

  // Dozent von der Seite (Jump & Run): zwei Laufbilder
  bakeTexture(scene, TEX.lecturerWalk[0], 30, 54, (g) => drawLecturerSideWalking(g, 18));
  bakeTexture(scene, TEX.lecturerWalk[1], 30, 54, (g) => drawLecturerSideWalking(g, 3));

  // Tisch zum Draufspringen
  bakeTexture(scene, TEX.table, 96, 36, (g) => {
    g.fillStyle(0x6a6a6a, 1);
    g.fillRect(6, 8, 6, 28);
    g.fillRect(84, 8, 6, 28);
    g.fillStyle(0x4a4a4a, 1);
    g.fillRect(0, 0, 96, 8);
    g.fillStyle(0x8a8a8a, 1);
    g.fillRect(0, 0, 96, 2);
  });

  bakeTexture(scene, TEX.ects, 22, 22, (g) => {
    g.fillStyle(COLORS.accent, 1);
    g.fillCircle(11, 11, 11);
    g.lineStyle(2, 0xc79a00, 1);
    g.strokeCircle(11, 11, 9);
    g.fillStyle(0xffffff, 1);
    g.fillRect(8, 6, 2, 10);
    g.fillRect(8, 6, 7, 2);
    g.fillRect(8, 10, 5, 2);
    g.fillRect(8, 14, 7, 2);
  });

  bakeTexture(scene, TEX.coffee, 22, 26, (g) => {
    g.lineStyle(2, COLORS.midGray, 1);
    g.lineBetween(7, 6, 9, 1);
    g.lineBetween(12, 6, 14, 1);
    g.fillStyle(COLORS.white, 1);
    g.fillRoundedRect(3, 8, 13, 16, 3);
    g.fillStyle(0x6b3e1e, 1);
    g.fillRect(4, 8, 11, 3);
    g.lineStyle(2, COLORS.white, 1);
    g.strokeCircle(17, 15, 3);
  });

  // Papierflieger – fliegt nach links
  bakeTexture(scene, TEX.plane, 26, 14, (g) => {
    g.fillStyle(COLORS.white, 1);
    g.fillTriangle(0, 7, 26, 0, 18, 7);
    g.fillStyle(COLORS.lightGray, 1);
    g.fillTriangle(0, 7, 18, 7, 26, 14);
  });

  // Putzwagen des Hausmeisters
  bakeTexture(scene, TEX.cart, 64, 44, (g) => {
    g.fillStyle(COLORS.gray, 1);
    g.fillRect(4, 12, 54, 22);
    g.fillStyle(COLORS.floor, 1);
    g.fillRect(36, 2, 20, 12);
    g.lineStyle(3, COLORS.black, 1);
    g.lineBetween(10, 12, 4, 0);
    g.fillStyle(COLORS.black, 1);
    g.fillCircle(14, 38, 6);
    g.fillCircle(48, 38, 6);
  });

  bakeTexture(scene, TEX.chairs, 36, 64, (g) => {
    g.fillStyle(COLORS.darkGray, 1);
    for (let i = 0; i < 5; i++) {
      g.fillRect(2, 4 + i * 11, 32, 4);
      g.fillRect(4, 8 + i * 11, 3, 7);
      g.fillRect(29, 8 + i * 11, 3, 7);
    }
    g.fillRect(2, 0, 4, 64);
  });

  bakeTexture(scene, TEX.door, 70, 116, (g) => {
    g.fillStyle(COLORS.black, 1);
    g.fillRect(0, 0, 70, 116);
    g.fillStyle(COLORS.midGray, 1);
    g.fillRect(6, 6, 58, 110);
    g.fillStyle(COLORS.glass, 1);
    g.fillRect(16, 16, 38, 40);
    g.fillStyle(COLORS.black, 1);
    g.fillRect(52, 64, 8, 4);
  });

  // Haupteingang: gläserne Doppeltür unter einem weißen Vordach
  bakeTexture(scene, TEX.entrance, 130, 128, (g) => {
    g.fillStyle(0xf4f4f4, 1);
    g.fillRect(0, 0, 130, 12);
    g.lineStyle(2, 0x9a9a9a, 1);
    g.strokeRect(1, 1, 128, 11);
    g.fillStyle(0x3a3a3a, 1);
    g.fillRect(10, 12, 110, 116);
    g.fillStyle(COLORS.glass, 1);
    g.fillRect(16, 18, 47, 110);
    g.fillRect(67, 18, 47, 110);
    g.fillStyle(0xffffff, 0.5);
    g.fillTriangle(20, 120, 40, 22, 48, 22);
    g.fillTriangle(71, 120, 91, 22, 99, 22);
    g.fillStyle(0x5a6672, 1);
    g.fillRect(57, 60, 4, 26);
    g.fillRect(69, 60, 4, 26);
  });

  // Rucksack von oben
  bakeTexture(scene, TEX.backpack, 20, 18, (g) => {
    g.fillStyle(0x444444, 1);
    g.fillRoundedRect(0, 0, 20, 18, 5);
    g.fillStyle(COLORS.accent, 1);
    g.fillRect(4, 3, 12, 3);
  });

  // "Vorsicht nass"-Schild
  // DHBW-Regenschirm aufgespannt: rot-weiße Segmente, Griff nach unten
  bakeTexture(scene, TEX.umbrella, 44, 40, (g) => {
    const segments = 6;
    for (let i = 0; i < segments; i++) {
      const a0 = Math.PI + (i / segments) * Math.PI;
      const a1 = Math.PI + ((i + 1) / segments) * Math.PI;
      g.fillStyle(i % 2 === 0 ? COLORS.danger : COLORS.white, 1);
      g.fillTriangle(22, 18, 22 + Math.cos(a0) * 21, 18 + Math.sin(a0) * 16, 22 + Math.cos(a1) * 21, 18 + Math.sin(a1) * 16);
    }
    g.lineStyle(2, 0x7a1010, 1);
    g.lineBetween(1, 18, 43, 18);
    g.fillStyle(COLORS.charcoal, 1);
    g.fillRect(21, 0, 2, 4);           // Spitze
    g.fillRect(21, 18, 2, 17);         // Stock
    g.lineStyle(2, COLORS.charcoal, 1);
    g.beginPath();
    g.arc(18, 35, 4, 0, Math.PI, false); // Griff
    g.strokePath();
  });

  // zugeklappter Schirm (während der Abklingzeit)
  bakeTexture(scene, TEX.umbrellaClosed, 44, 40, (g) => {
    g.fillStyle(COLORS.danger, 1);
    g.fillTriangle(22, 2, 17, 26, 27, 26);
    g.fillStyle(COLORS.white, 1);
    g.fillTriangle(22, 6, 20, 24, 24, 24);
    g.fillStyle(COLORS.charcoal, 1);
    g.fillRect(21, 0, 2, 4);
    g.fillRect(21, 26, 2, 9);
    g.lineStyle(2, COLORS.charcoal, 1);
    g.beginPath();
    g.arc(18, 35, 4, 0, Math.PI, false);
    g.strokePath();
  });

  bakeTexture(scene, TEX.wetSign, 30, 40, (g) => {
    g.fillStyle(COLORS.accent, 1);
    g.fillTriangle(15, 0, 30, 40, 0, 40);
    g.fillStyle(COLORS.black, 1);
    g.fillRect(13, 12, 4, 16);
    g.fillRect(13, 31, 4, 4);
  });
}

function createAnimations(scene) {
  scene.anims.create({
    key: ANIM.playerRun,
    frames: TEX.playerRun.map((key) => ({ key })),
    frameRate: 12,
    repeat: -1
  });
  scene.anims.create({
    key: ANIM.lecturerWalk,
    frames: TEX.lecturerWalk.map((key) => ({ key })),
    frameRate: 5,
    repeat: -1
  });
}

// Spieler von der Seite: weißer Hoodie, gelber Rucksack, Arme und Beine nach Pose
function drawPlayerSide(g, pose) {
  const bob = pose.bob;
  const hip = { x: 14, y: 33 + bob };
  const shoulder = { x: 15, y: 19 + bob };
  const limb = (from, angleDeg, length, width, color) => {
    const angle = Phaser.Math.DegToRad(angleDeg);
    const end = { x: from.x + Math.sin(angle) * length, y: from.y + Math.cos(angle) * length };
    g.lineStyle(width, color, 1);
    g.lineBetween(from.x, from.y, end.x, end.y);
    return end;
  };

  // hinteres Bein und hinterer Arm (etwas dunkler, hinter dem Körper)
  limb(hip, pose.backLeg, 12, 5, 0x2a2a2a);
  limb(shoulder, pose.backArm, 10, 4, 0xbdbdbd);
  g.fillStyle(COLORS.accent, 1);
  g.fillRoundedRect(1, 14 + bob, 9, 17, 3);
  limb(hip, pose.frontLeg, 12, 5, COLORS.black);

  // Körper
  g.fillStyle(COLORS.white, 1);
  g.lineStyle(2, COLORS.black, 1);
  g.fillRoundedRect(6, 14 + bob, 17, 22, 4);
  g.strokeRoundedRect(6, 14 + bob, 17, 22, 4);

  // vorderer Arm mit Hand
  const hand = limb(shoulder, pose.frontArm, 10, 4, 0xe8e8e8);
  g.fillStyle(COLORS.skin, 1);
  g.fillCircle(hand.x, hand.y, 2);

  // Kopf
  g.fillCircle(16, 8 + bob, 7);
  g.fillStyle(COLORS.black, 1);
  g.fillRect(9, 1 + bob, 13, 4);
  g.fillCircle(11, 5 + bob, 4);
  g.fillCircle(20, 8 + bob, 1.4);
}

// Dozent von der Seite, Beine um ±legSpreadDeg gespreizt
function drawLecturerSideWalking(g, legSpreadDeg) {
  const hip = { x: 15, y: 41 };
  g.lineStyle(5, COLORS.charcoal, 1);
  [legSpreadDeg, -legSpreadDeg].forEach((deg) => {
    const angle = Phaser.Math.DegToRad(deg);
    g.lineBetween(hip.x, hip.y, hip.x + Math.sin(angle) * 12, hip.y + Math.cos(angle) * 12);
  });
  g.fillStyle(0x555555, 1);
  g.fillRoundedRect(6, 16, 19, 27, 4);
  g.fillStyle(COLORS.white, 1);
  g.fillTriangle(17, 16, 24, 16, 22, 26);
  g.fillStyle(COLORS.black, 1);
  g.fillRect(21, 18, 2, 9);
  g.fillStyle(COLORS.skin, 1);
  g.fillCircle(16, 9, 8);
  g.fillTriangle(23, 8, 27, 11, 23, 12);
  g.fillStyle(0xbbbbbb, 1);
  g.fillRect(8, 1, 14, 4);
  g.fillCircle(10, 6, 4);
  g.lineStyle(1.5, COLORS.black, 1);
  g.strokeCircle(20, 8, 3);
}
