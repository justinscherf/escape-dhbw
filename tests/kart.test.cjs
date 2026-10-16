'use strict';

// Ohne Installation ausführbar: node --test tests/kart.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createGame() {
  const context = vm.createContext({
    Phaser: { Scene: class {}, Math: {
      Clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
      DegToRad: (value) => value * Math.PI / 180
    } },
    SFX: new Proxy({}, { get: () => () => {} }),
    Display: { view: { width: 960, height: 540, offsetX: 0, offsetY: 0 } }
  });
  for (const file of ['js/config.js', 'js/level-data.js', 'js/core/utils.js', 'js/core/state.js',
    'js/scenes/base-scenes.js', 'js/scenes/kart-scene.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context, { filename: file });
  }
  const api = vm.runInContext('({ GameState, KartScene, LevelScene, SCENES, STAGES, KART, LEVEL4, SCORING })', context);
  const scene = new api.KartScene();
  const held = new Set();
  const direction = { x: 0, y: 0 };
  const timers = [];
  const transitions = [];
  const label = () => {
    const object = {};
    for (const method of ['setOrigin', 'setDepth', 'setScrollFactor', 'setScale']) object[method] = () => object;
    return object;
  };
  Object.assign(scene, {
    stageNumber: 4, finished: false, distance: 0, speed: 0, playerX: 0, steering: 0,
    boostMs: 0, invulnMs: 0,
    objects: api.LEVEL4.objects.map((object) => ({ ...object, taken: false })),
    inputs: { direction: () => direction, isHeld: (key) => held.has(key) },
    add: { text: label }, tweens: { add() {} }, hud: { update() {} },
    cameras: { main: { shake() {}, flash() {} } },
    time: { delayedCall: (delay, callback) => timers.push({ delay, callback }) },
    scene: { start: (key, data) => transitions.push({ key, data }) }
  });
  return { ...api, scene, held, direction, timers, transitions };
}

test('Treppenhaus führt zur Einführung von Level 4; erst die Heimfahrt führt zum Sieg', () => {
  const { scene, transitions, SCENES, STAGES } = createGame();
  scene.stageNumber = 3;
  scene.goToNextStage();
  assert.equal(transitions[0].key, SCENES.intro);
  assert.equal(transitions[0].data.stage, 4);
  assert.equal(STAGES[4].sceneKey, SCENES.kart);
  scene.stageNumber = 4;
  scene.goToNextStage();
  assert.equal(transitions[1].key, SCENES.win);
});

test('ohne Gas bleibt das Kart stehen; mit Gas fährt es, Bremsen hat Vorrang', () => {
  const { scene, held } = createGame();
  scene.drive(1000);
  assert.equal(scene.distance, 0);
  held.add('action');
  scene.drive(1000);
  assert.ok(scene.distance > 0);
  const speed = scene.speed;
  held.add('down');
  scene.drive(250);
  assert.ok(scene.speed < speed);
});

test('analoger Controller lenkt, Stick oben gibt Gas, Stick unten bremst', () => {
  const { scene, direction } = createGame();
  direction.x = 0.5;
  direction.y = -0.8;
  scene.drive(500);
  assert.ok(scene.speed > 0);
  assert.ok(scene.playerX > 0);
  direction.y = 0.8;
  scene.drive(500);
  assert.equal(scene.speed, 0);
});

test('Gras bremst das Kart, ohne ein Leben abzuziehen', () => {
  const { scene, held, KART, GameState } = createGame();
  held.add('action');
  scene.speed = KART.maxSpeed;
  scene.playerX = 1.2;
  for (let i = 0; i < 100; i++) scene.drive(50);
  assert.ok(scene.speed <= KART.offroadSpeed);
  assert.equal(GameState.lives, 3);
});

test('Hindernisse werden auch beim Überspringen ihrer Position erkannt; Schonfrist schützt vor Folgetreffern', () => {
  const { scene, GameState } = createGame();
  scene.objects = [{ z: 10, x: 0, kind: 'cone' }, { z: 11, x: 0, kind: 'car' }];
  scene.distance = 15;
  scene.checkObjects(5);
  assert.equal(GameState.lives, 2);
  assert.ok(scene.invulnMs > 0);
  scene.checkObjects(5);
  assert.equal(GameState.lives, 2);
});

test('seitlich an Hindernissen vorbeifahren kostet kein Leben', () => {
  const { scene, GameState } = createGame();
  scene.objects = [{ z: 10, x: 0.5, kind: 'car' }];
  scene.distance = 15;
  scene.checkObjects(5);
  assert.equal(GameState.lives, 3);
});

test('Kaffee beschleunigt über die normale Höchstgeschwindigkeit; ECTS zählen nur einmal', () => {
  const { scene, held, GameState, KART } = createGame();
  scene.objects = [{ z: 10, x: 0, kind: 'coffee' }, { z: 11, x: 0, kind: 'ects' }];
  scene.distance = 15;
  scene.checkObjects(5);
  scene.checkObjects(5);
  assert.equal(GameState.ects, 1);
  assert.equal(scene.boostMs, KART.boostMs);
  held.add('action');
  scene.speed = KART.maxSpeed;
  scene.drive(100);
  assert.ok(scene.speed > KART.maxSpeed);
});

test('Herzen heilen und geben bei vollen Leben den bestehenden Bonus', () => {
  const { scene, GameState, SCORING } = createGame();
  GameState.lives = 2;
  scene.objects = [{ z: 10, x: 0, kind: 'heart' }, { z: 20, x: 0, kind: 'heart' }];
  scene.distance = 15;
  scene.checkObjects(5);
  assert.equal(GameState.lives, 3);
  scene.distance = 25;
  scene.checkObjects(15);
  assert.equal(GameState.lives, 3);
  assert.equal(GameState.score, SCORING.fullHeartBonus);
});

test('letztes Leben bei einem Unfall führt zum Game Over', () => {
  const { scene, GameState, timers, transitions, SCENES } = createGame();
  GameState.lives = 1;
  scene.objects = [{ z: 10, x: 0, kind: 'car' }];
  scene.distance = 15;
  scene.checkObjects(5);
  assert.equal(scene.finished, true);
  assert.equal(GameState.stageTimes.length, 0);
  timers[0].callback();
  assert.equal(transitions[0].key, SCENES.gameOver);
  assert.match(transitions[0].data.reason, /Kart-Unfall/);
});

test('neben der Ziellinie gibt es keinen Sieg; Zurücklenken auf die Straße erlaubt den Abschluss', () => {
  const { scene, held, LEVEL4, GameState } = createGame();
  scene.distance = LEVEL4.length - 1;
  scene.playerX = 1.5;
  scene.speed = 20;
  held.add('action');
  scene.drive(100);
  assert.equal(scene.distance, LEVEL4.length);
  assert.equal(scene.finished, false);
  scene.playerX = 0;
  scene.drive(50);
  assert.equal(scene.finished, true);
  assert.equal(GameState.stageTimes.length, 1);
});

test('komplette Strecke ist mit Gas und Lenken ohne Unfälle schaffbar und verbucht die vierte Zwischenzeit', () => {
  const { scene, held, direction, LEVEL4, GameState } = createGame();
  GameState.stageTimes = [1000, 2000, 3000];
  GameState.elapsedMs = 3000;
  held.add('action');
  let elapsed = 0;
  while (!scene.finished && elapsed < 90000) {
    direction.x = Math.max(-1, Math.min(1, -scene.playerX * 8));
    GameState.tick(1000 / 60);
    scene.drive(1000 / 60);
    elapsed += 1000 / 60;
  }
  assert.equal(scene.distance, LEVEL4.length);
  assert.equal(scene.finished, true);
  assert.equal(GameState.lives, 3);
  assert.equal(GameState.stageTimes.length, 4);
  assert.ok(GameState.stageSplits()[3] > 50000);
});
