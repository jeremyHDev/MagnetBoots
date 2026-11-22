"use strict";

const canvas = document.querySelector("#game");
let ctx = canvas.getContext("2d");
const backdrop = document.createElement("canvas");
backdrop.width = canvas.width;
backdrop.height = canvas.height;
const backdropContext = backdrop.getContext("2d");
let paintedStage, paintedBlink;
const heading = document.querySelector("#room-name");
const rivetControl = document.querySelector("#rivet-control");
const status = document.querySelector("#status");
const announcement = document.querySelector("#announcement");
const intro = document.querySelector("#intro");
const introArt = document.querySelector("#intro-art");
const introCaption = document.querySelector("#intro-caption");
const introPlay = document.querySelector("#intro-play");
const introSkip = document.querySelector("#intro-skip");
let introStarted = null;
const heroPicker = document.querySelector("#hero-picker");
const levelPicker = document.querySelector("#level-picker");
const levelOptions = levelPicker.querySelectorAll("button[data-stage]");
const {width: W, height: H} = canvas;
const floor = 465;
const ceiling = 105;
const pit = {x: 300, end: 510};
const block = {x: 394, y: 111, w: 50, h: 50};
const scatterBlaster = {name: "Scatter Blaster", icon: "✷", color: "#ffbc69", description: "J · Fires three bolts in a spread"};
const ricochetBlaster = {name: "Ricochet Blaster", icon: "↪", color: "#7be0ff", description: "J · Bolts bounce off a surface once"};
const plasmaBlade = {name: "Plasma Blade", icon: "✦", color: "#e3a8ff", description: "K · Reaches farther and breaks blocks"};
const pulseCannon = {name: "Pulse Cannon", icon: "◉", color: "#fc8e91", description: "J · Slow, heavy shots hit twice as hard"};
const rapidBlaster = {name: "Rapid Blaster", icon: "»", color: "#a6eda1", description: "J · Hold to fire a stream of bolts"};
const shockBlade = {name: "Shock Blade", icon: "ϟ", color: "#f7e77c", description: "K · A clean hit stuns guards and captains"};
const rewards = [scatterBlaster, ricochetBlaster, plasmaBlade, pulseCannon, rapidBlaster, shockBlade];
const heroes = {
  pyre: {armor: "#cb844d", trim: "#f5b867", helmet: "#e0a25d", crest: "#ffdf90", light: "#65dee7", bright: "#b5fafa"},
  volt: {armor: "#315f9c", trim: "#6496e6", helmet: "#485fc2", crest: "#91baf7", light: "#e5ff75", bright: "#f0ffa4"},
  nova: {armor: "#814aa0", trim: "#d18bdd", helmet: "#a266b9", crest: "#ffc2ed", light: "#ffa0e0", bright: "#ffd3f1"},
  frost: {armor: "#8aaabf", trim: "#d5eaf5", helmet: "#c5dfed", crest: "#f6ffff", light: "#54e1ff", bright: "#a9f7ff"},
  mantis: {armor: "#2d7766", trim: "#74bda1", helmet: "#328c74", crest: "#a4e4ae", light: "#d8ff91", bright: "#f1ffbe"},
  wraith: {armor: "#414456", trim: "#77798d", helmet: "#34354a", crest: "#9d90a7", light: "#ff707f", bright: "#ffadb4"}
};
let heroStyle = "pyre";
const menuOpen = () => intro.open || heroPicker.open || levelPicker.open;
const keys = new Set();
const pressed = new Set();
let hero, guard, shots, wheel, reward, remaining, used, mode, attempts;
let stage = 0;
let hostile, explosions, alienCallIn;
const hatchery = () => stage >= 1 && stage <= 4;
const commandDeck = () => stage === 5 || stage === 6;
const reactor = () => stage === 7;
const lab = () => stage === 8;
const stasisVault = () => stage === 9;
const cargoChase = () => stage === 10;
const trophyRevolt = () => stage === 11;
const finalStage = 12;
const rescueRoom = () => stage === finalStage;
const captainRoom = () => stage >= 6 && stage <= 8;
const hasRivet = () => stage >= 5;
const hasSwitch = () => stage === 5 || lab();
const labGap = {x: 372, end: 650};
const cargoGaps = [{x: 300, end: 460}, {x: 550, end: 690}];
const cargoAirlock = 884;
const beamZones = [{x: 285, end: 430}, {x: 526, end: 655}];
let reactorTime;
const ceilingSwitch = {x: 605, y: ceiling + 22};
let rivet, switchHeld, rescueStep;
const rescueGates = [370, 680];
const bulkheadSwitch = {x: 245, y: ceiling + 20};
const cageSwitch = {x: 470, y: floor - 20};
const airlockSwitch = {x: 835, y: ceiling + 20};
const rescueInstructions = [
  "Flip (E) to the ceiling bulkhead switch and press F",
  "Drop to the floor cage release and press F",
  "Rivet is opening the second gate",
  "Meet Rivet at the ceiling airlock panel and press F",
  "Head to the floor exit with Rivet"
];
const deckRoom = () => captainRoom() ? "Captain’s Bridge" : "Charging Bay";
const nests = [
  {name: "Incubation Row", eggs: [310, 515, 730], flyers: [385], guard: 0},
  {name: "Brood Bridge", eggs: [250, 760], flyers: [370, 625], guard: 0, gap: {x: 360, end: 640}},
  {name: "Feeding Chamber", eggs: [350, 560, 680], flyers: [560, 820], guard: 3},
  {name: "Nest Gate", eggs: [], flyers: [335, 555, 780], guard: 0, gap: {x: 410, end: 675}}
];
const nest = () => nests[stage - 1];
const nixRoom = () => stage === 4;
const trophyBoss = {name: "Dash", health: 4, color: "#7bcaff"};
const nestBoss = {name: "Nix", health: 6, color: "#82f3db"};
const vaultBoss = {name: "Goliath", health: 10, color: "#d6aaff"};
const cargoBoss = {name: "Cell Thief", health: 7, color: "#f8bf69"};
const revoltTrophies = [
  {name: "Iron Visage", health: 3, color: "#795771", style: 1, x: 560, gun: false},
  {name: "Orb Maw", health: 4, color: "#627779", style: 2, x: 725, gun: true},
  {name: "The Wink", health: 6, color: "#72795e", style: 0, x: 865, gun: true}
];
let revoltWave;
const vaultBlackoutDuration = 1.25;
const shockwaveDuration = .95;
const shockwaveSpeed = 1150;
const goliathSlamming = () => guard.phase === "slamWindup" || guard.phase === "slamWave";
const roomBoss = () => stage === 0 ? trophyBoss : nixRoom() ? nestBoss : stasisVault() ? vaultBoss
  : cargoChase() ? cargoBoss : trophyRevolt() ? revoltTrophies[revoltWave] : null;
const guardFlips = () => captainRoom() || (trophyRevolt() && revoltWave === revoltTrophies.length - 1);
const cargoRunning = () => cargoChase() && guard.phase === "escape";
let eggs, aliens, nestTime;
const aliensLeft = () => aliens.reduce((count, alien) => count + (alien.hp > 0), 0);
const exitLocked = () => Boolean(guard.hp || (stage === 4 && aliensLeft()) || (hasSwitch() && !switchHeld) || (rescueRoom() && rescueStep < 4));
const hasWeaponBlock = () => stage === 0 || stage === 3 || captainRoom() || stasisVault() || trophyRevolt();
let blink = 0;
let clock = 0;
let notice = "";

function spawnTrophy() {
  const trophy = revoltTrophies[revoltWave];
  guard = {x: trophy.x, home: trophy.x, y: floor - 24, hp: trophy.health, gun: trophy.gun,
    gravity: 1, face: -1, phase: "recover", time: .75, hit: 0};
}

function announce(message) {
  announcement.textContent = message;
}

function reset() {
  hero = {x: 88, y: floor - 20, vy: 0, gravity: 1, face: 1, grounded: true, fire: 0, muzzleUntil: 0, swing: 0, flash: 0, hp: 3};
  guard = {x: 781, y: floor - 24, face: -1, hp: 3, phase: "patrol", time: 0, hit: 0};
  guard.hp = hatchery() ? nest().guard : guard.hp;
  if (hasRivet()) {
    guard.hp = captainRoom() ? (lab() ? 10 : 8) : 0;
    guard.gravity = 1;
    guard.gun = captainRoom();
  }
  revoltWave = 0;
  const boss = roomBoss();
  if (boss) {
    guard.hp = boss.health;
    guard.gun = true;
  }
  if (stasisVault()) guard.phase = "sleeping";
  if (cargoChase()) Object.assign(guard, {x: 214, y: floor - 30, face: 1, phase: "escape"});
  if (trophyRevolt()) spawnTrophy();
  rivet = hasRivet() ? {x: hero.x - 36, y: hero.y + 4, gravity: 1, cooldown: 0, flash: 0} : null;
  reactorTime = 0;
  switchHeld = false;
  rescueStep = 0;
  if (rescueRoom()) Object.assign(rivet, {x: 532, y: floor - 27});
  rivetControl.hidden = !hasRivet();
  eggs = hatchery() ? nest().eggs.map(x => ({x, y: floor - 18, timer: null})) : [];
  aliens = hatchery() ? nest().flyers.map(x => ({x, home: x, y: ceiling + 31, hp: 2, flying: true})) : [];
  nestTime = 0;
  hostile = [];
  shots = [];
  explosions = [];
  alienCallIn = 1.2;
  wheel = reward = null;
  remaining = blink = 0;
  used = false;
  mode = "play";
  notice = "";
  attempts = (attempts || 0) + 1;
}

function press(code) {
  gameAudio.start();
  if (!keys.has(code)) pressed.add(code);
  keys.add(code);
}

const controls = new Set(["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "Space", "KeyE", "KeyJ", "KeyK", "KeyF", "KeyR"]);
addEventListener("keydown", event => {
  if (!menuOpen() && controls.has(event.code) && !(event.code === "Space" && event.target.closest?.("button"))) {
    event.preventDefault();
    press(event.code);
  }
});
addEventListener("keyup", event => keys.delete(event.code));
addEventListener("blur", () => { keys.clear(); pressed.clear(); });
document.querySelectorAll("button[data-key]").forEach(button => {
  const code = button.dataset.key;
  button.addEventListener("pointerdown", event => {
    button.setPointerCapture(event.pointerId);
    press(code);
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
    button.addEventListener(type, () => keys.delete(code));
  }
  button.addEventListener("click", event => {
    if (event.detail === 0) {
      gameAudio.start();
      pressed.add(code);
    }
  });
});

document.querySelector("#skip-level").addEventListener("click", () => {
  keys.clear();
  pressed.clear();
  for (let i = 0; i < levelOptions.length; i++) {
    const current = stage >= Number(levelOptions[i].dataset.stage)
      && (i === levelOptions.length - 1 || stage < Number(levelOptions[i + 1].dataset.stage));
    if (current) levelOptions[i].setAttribute("aria-current", "true");
    else levelOptions[i].removeAttribute("aria-current");
  }
  levelPicker.showModal();
});

levelOptions.forEach(option => {
  option.addEventListener("click", () => {
    stage = Number(option.dataset.stage);
    reset();
    levelPicker.close();
    announce(option.textContent.trim());
  });
});

const clamp = (value, low, high) => Math.max(low, Math.min(value, high));
const near = (a, b, x, y) => Math.abs(a.x - b.x) < x && Math.abs(a.y - b.y) < y;
const blockCenter = {x: block.x + block.w / 2, y: block.y + block.h / 2};
function hasFloor(x) {
  if (lab()) return x < labGap.x || x > labGap.end;
  if (cargoChase()) return cargoGaps.every(gap => x < gap.x || x > gap.end);
  if (hasRivet()) return true;
  const opening = hatchery() ? nest().gap : pit;
  return !opening || x < opening.x || x > opening.end;
}

function advance() {
  stage++;
  gameAudio.play("door");
  reset();
  announce(rescueRoom() ? "Rivet’s Rescue. Open the first bulkhead from the ceiling."
    : cargoChase() ? "Cargo Chase. Follow the stolen power cell."
    : trophyRevolt() ? "Trophy Revolt. The trophies have broken loose."
    : stasisVault() ? "Stasis Vault. Goliath is asleep." : lab() ? "Gravity Lab" : reactor() ? "Reactor Core" : stage === 5 ? "Command Deck. Rivet is with you." : commandDeck() ? "Command Deck. " + deckRoom() : "Alien Hatchery. " + nest().name);
}

function activateWheel() {
  if (used) return;
  used = true;
  wheel = {time: 0, pick: Math.floor(Math.random() * rewards.length)};
  gameAudio.play("wheel");
  announce("Weapon wheel spinning");
}

const explosionDuration = .48;

function explode(target, color) {
  const sparks = Array.from({length: 18}, (_, index) => {
    const angle = (index + Math.random()) * Math.PI / 9;
    const speed = 65 + Math.random() * 155;
    return {vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: 2 + Math.random() * 4};
  });
  explosions.push({x: target.x, y: target.y, color, started: clock, sparks});
  gameAudio.play("explode");
  gameAudio.play("alienDeath");
}

function damageAlien(alien, amount) {
  alien.hp = Math.max(0, alien.hp - amount);
  if (!alien.hp) explode(alien, "#9ce879");
}

function damageGuard(amount) {
  const previousHealth = guard.hp;
  guard.hp = Math.max(0, guard.hp - amount);
  guard.hit = .15;
  if (guard.phase === "sleeping") {
    guard.phase = "recover";
    guard.time = vaultBlackoutDuration;
    guard.blackoutUntil = clock + vaultBlackoutDuration;
    guard.face = Math.sign(hero.x - guard.x) || guard.face;
    gameAudio.play("alien");
    announce("Goliath woke up!");
  }
  gameAudio.play(guard.hp ? "hit" : "door");
  if (stasisVault() && previousHealth > vaultBoss.health / 2 && guard.hp && guard.hp <= vaultBoss.health / 2) {
    guard.phase = "slamWindup";
    guard.time = 1;
    gameAudio.play("slamWarning");
    announce("Goliath is about to slam. Flip to the ceiling!");
  }
  if (!guard.hp) {
    const boss = roomBoss();
    explode(guard, boss?.color ?? "#ff9d56");
    if (trophyRevolt() && revoltWave < revoltTrophies.length - 1) {
      revoltWave++;
      spawnTrophy();
      hostile.length = 0;
      announce("Next trophy: " + roomBoss().name);
      return;
    }
    if (boss) {
      announce(boss.name + " defeated!");
      return;
    }
    announce(exitLocked() ? "Captain defeated. The ceiling switch still needs power." : "Guard defeated. Exit open.");
  }
}

function hurt() {
  if (hero.flash > 0) return;
  hero.hp--;
  gameAudio.play("hurt");
  hero.flash = .9;
  hero.vy = -hero.gravity * 310;
  hero.grounded = false;
  if (!hero.hp) retry(hatchery() ? "The aliens got you" : "Guard got you");
}

function retry(message) {
  gameAudio.play("retry");
  mode = "retry";
  notice = message;
  hero.retry = .85;
  announce(message);
}

function updateGuard(dt) {
  if (cargoRunning()) {
    if (hero.x <= 120 && guard.x === 214) return;
    guard.x = Math.min(cargoAirlock, guard.x + 196 * dt);
    if (guard.x === cargoAirlock) {
      guard.phase = "recover";
      guard.time = 1;
      guard.y = floor - 24;
      guard.face = -1;
      gameAudio.play("equip");
      announce("The Cell Thief powered up its suit at the airlock!");
    }
    return;
  }
  if (!guard.hp || guard.phase === "sleeping") return;
  guard.hit = Math.max(0, guard.hit - dt);
  guard.time -= dt;
  if (goliathSlamming()) {
    updateGoliathSlam(dt);
    return;
  }
  if (guard.phase === "flip") {
    const targetY = guard.gravity > 0 ? floor - 24 : ceiling + 24;
    guard.y += clamp(targetY - guard.y, -540 * dt, 540 * dt);
    if (guard.y === targetY) {
      guard.phase = "patrol";
      guard.gun = guard.gravity > 0;
    }
    return;
  }
  const close = near(hero, guard, guard.gun ? 470 : 92, guard.gun ? 190 : 58);
  if (guard.phase === "patrol") {
    if (close) {
      guard.face = Math.sign(hero.x - guard.x) || guard.face;
      guard.phase = "windup";
      gameAudio.play("alien");
      guard.time = guard.gun ? .72 : .55;
    } else {
      guard.x += guard.face * 76 * dt;
      const leftEdge = guard.home ? guard.home - 115 : cargoChase() ? 710 : 690;
      const rightEdge = guard.home ? Math.min(940, guard.home + 115) : cargoChase() ? 935 : 875;
      if (guard.x < leftEdge || guard.x > rightEdge) {
        guard.x = clamp(guard.x, leftEdge, rightEdge);
        guard.face *= -1;
      }
    }
  } else if (guard.phase === "windup" && guard.time <= 0) {
    guard.phase = "strike";
    gameAudio.play(guard.gun ? "enemy" : "sword");
    guard.time = .19;
    if (guard.gun) {
      const dx = hero.x - guard.x;
      const dy = hero.y - guard.y;
      for (const spread of lab() ? [-.23, -.11, 0, .11, .23] : (guardFlips() || stasisVault() || cargoChase()) ? [-.16, 0, .16] : [0]) {
        const angle = Math.atan2(dy, dx) + spread;
        hostile.push({x: guard.x, y: guard.y, vx: Math.cos(angle) * 445, vy: Math.sin(angle) * 445});
      }
    }
  } else if (guard.phase === "strike") {
    const tip = {x: guard.x + guard.face * 31, y: guard.y};
    if (!guard.gun && near(hero, tip, 51, 42)) hurt();
    if (guard.time <= 0) {
      guard.phase = "recover";
      guard.time = .62;
    }
  } else if (guard.phase === "recover" && guard.time <= 0) {
    if (guardFlips()) {
      guard.phase = "flip";
      guard.gravity *= -1;
    } else {
      guard.phase = "patrol";
    }
  }
}

function updateGoliathSlam(dt) {
  if (guard.phase === "slamWindup") {
    if (guard.time > 0) return;
    guard.phase = "slamWave";
    guard.time = shockwaveDuration;
    gameAudio.play("slam");
  }
  const distance = Math.abs(hero.x - guard.x);
  const radius = (shockwaveDuration - guard.time) * shockwaveSpeed;
  const innerEdge = Math.max(0, radius - dt * shockwaveSpeed);
  if (hero.y >= floor - 50 && distance >= innerEdge - 20 && distance <= radius + 20) hurt();
  if (guard.time <= 0) {
    guard.phase = "recover";
    guard.time = 1.35;
    announce("Goliath is recovering. Strike now!");
  }
}

function updateRescue(dt) {
  const usingSwitch = pressed.has("KeyF");
  if (rescueStep === 0 && usingSwitch && hero.gravity < 0 && near(hero, bulkheadSwitch, 55, 26)) {
    rescueStep = 1;
    gameAudio.play("door");
    announce("Bulkhead open. Use the floor switch to free Rivet.");
  } else if (rescueStep === 1 && usingSwitch && hero.gravity > 0 && near(hero, cageSwitch, 55, 26)) {
    rescueStep = 2;
    gameAudio.play("rivet");
    announce("Rivet is free and heading for the second gate.");
  }
  if (rescueStep === 2) {
    rivet.x = Math.min(641, rivet.x + 195 * dt);
    if (rivet.x === 641) {
      rescueStep = 3;
      gameAudio.play("door");
      announce("Rivet opened the second gate. Meet him at the airlock controls.");
    }
  }
  if (rescueStep === 3) {
    rivet.x = Math.min(airlockSwitch.x, rivet.x + 195 * dt);
    if (rivet.x === airlockSwitch.x && usingSwitch && hero.gravity < 0 && near(hero, airlockSwitch, 55, 26)) {
      rescueStep = 4;
      rivet.flash = .45;
      gameAudio.play("door");
      announce("Airlock open. Head to the floor exit with Rivet.");
    }
  }
}

function updateRivet(dt) {
  if (!rivet) return;
  if (rescueRoom() && rescueStep < 4) {
    updateRescue(dt);
    return;
  }
  rivet.cooldown = Math.max(0, rivet.cooldown - dt);
  rivet.flash = Math.max(0, rivet.flash - dt);
  rivet.gravity = hero.gravity;
  rivet.x += clamp(hero.x - hero.face * 43 - rivet.x, -350 * dt, 350 * dt);
  rivet.y += clamp(hero.y + hero.gravity * 4 - rivet.y, -660 * dt, 660 * dt);
  if (!pressed.has("KeyF")) return;
  if (hasSwitch() && !switchHeld && hero.gravity < 0 && near(hero, ceilingSwitch, 70, 47)) {
    switchHeld = true;
    rivet.flash = .3;
    gameAudio.play("door");
    announce("Rivet activated the switch. The floor door is powered.");
    return;
  }
  if (!guard.hp || guard.phase === "sleeping" || cargoRunning() || goliathSlamming() || guard.blackoutUntil > clock || rivet.cooldown || !near(rivet, guard, 225, 105)) return;
  rivet.flash = .45;
  gameAudio.play("rivet");
  rivet.cooldown = 4;
  guard.phase = "recover";
  guard.time = 1.25;
  announce("Rivet distracted " + (roomBoss()?.name ?? "the captain") + ".");
}

function updateAlienCalls(dt) {
  alienCallIn -= dt;
  if (alienCallIn > 0) return;
  alienCallIn = 2.8 + Math.random() * 1.8;

  let caller = guard.hp ? guard : null;
  let distance = caller ? Math.hypot(hero.x - caller.x, hero.y - caller.y) : Infinity;
  for (const alien of aliens) {
    if (!alien.hp) continue;
    const separation = Math.hypot(hero.x - alien.x, hero.y - alien.y);
    if (separation < distance) {
      caller = alien;
      distance = separation;
    }
  }
  if (caller) {
    gameAudio.play(caller.phase === "sleeping" ? "alienSnore" : caller.flying ? "alienChirp" : "alienChatter");
  }
}

function updateNest(dt) {
  nestTime += dt;
  if (eggs.length) eggs = eggs.filter(egg => {
    if (egg.timer === null && near(hero, egg, 111, 86)) egg.timer = .65;
    if (egg.timer === null) return true;
    egg.timer -= dt;
    if (egg.timer > 0) return true;
    gameAudio.play("hatch");
    alienCallIn = Math.min(alienCallIn, .35);
    aliens.push({x: egg.x, home: egg.x, y: floor - 14, hp: 1, flying: false});
    return false;
  });
  for (const alien of aliens) {
    if (!alien.hp) continue;
    const direction = Math.sign(hero.x - alien.x);
    if (alien.flying) {
      alien.x = alien.home + Math.sin(nestTime * 2 + alien.home) * 74;
      alien.y = ceiling + 35 + Math.sin(nestTime * 3 + alien.home) * 19;
    } else {
      const next = clamp(alien.x + direction * 108 * dt, 35, W - 35);
      if (hasFloor(next)) alien.x = next;
    }
    if (near(hero, alien, 26, 29)) hurt();
  }
}

function updateShots(dt) {
  if (!shots.length) return;
  shots = shots.filter(shot => {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
    if (shot.life <= 0 || shot.y > H) return false;
    const wall = shot.x < 32 || shot.x > W - 32;
    const surface = shot.y < ceiling || (shot.y > floor && hasFloor(shot.x));
    if (wall || surface) {
      if (!shot.bounces) return false;
      shot.bounces--;
      if (wall) {
        shot.x = clamp(shot.x, 32, W - 32);
        shot.vx *= -1;
      }
      if (surface) {
        shot.y = clamp(shot.y, ceiling, floor);
        shot.vy *= -1;
      }
    }
    if (hasWeaponBlock() && !used && near(shot, blockCenter, 28, 28)) {
      activateWheel();
      return false;
    }
    const size = shot.heavy ? 6 : 0;
    const damage = shot.heavy ? 2 : 1;
    const alien = aliens.find(target => target.hp && near(shot, target, 21 + size, 22 + size));
    if (alien) {
      damageAlien(alien, damage);
      if (alien.hp) gameAudio.play("hit");
      return false;
    }
    if (guard.hp && !cargoRunning() && near(shot, guard, 21 + size, 25 + size)) {
      const front = Math.sign(shot.vx) === -guard.face;
      if (!(front && guard.phase === "windup" && !guard.gun)) damageGuard(damage);
      return false;
    }
    return true;
  });
}

function update(dt) {
  if (menuOpen()) return;
  clock += dt;
  while (explosions.length && clock - explosions[0].started >= explosionDuration) explosions.shift();
  if (pressed.has("KeyR")) {
    if (mode === "won") stage = 0;
    reset();
    announce("Room restarted");
    return;
  }
  if (mode === "retry") {
    hero.retry -= dt;
    if (hero.retry <= 0) reset();
    return;
  }
  if (mode !== "play") return;
  if (wheel) {
    wheel.time += dt;
    if (wheel.time >= 2.3) {
      reward = rewards[wheel.pick];
      remaining = 20;
      gameAudio.play("equip");
      announce(reward.name + " equipped for 20 seconds");
      wheel = null;
    }
    return;
  }

  if (reward) {
    remaining -= dt;
    if (remaining <= 0) {
      reward = null;
      gameAudio.play("expire");
      announce("Standard weapons restored");
    }
  }
  blink = Math.max(0, blink - dt);
  const move = Number(keys.has("ArrowRight") || keys.has("KeyD") || pressed.has("ArrowRight"))
    - Number(keys.has("ArrowLeft") || keys.has("KeyA") || pressed.has("ArrowLeft"));
  if (move) hero.face = move;
  const oldY = hero.y;
  const wasGrounded = hero.grounded;
  hero.x = clamp(hero.x + move * 268 * dt, 48, W - 48);
  if (hasSwitch() && !switchHeld) hero.x = Math.min(hero.x, 936);
  if (rescueRoom()) {
    if (rescueStep === 0) hero.x = Math.min(hero.x, rescueGates[0] - 25);
    else if (rescueStep < 3) hero.x = Math.min(hero.x, rescueGates[1] - 25);
  }
  if (pressed.has("KeyE")) {
    hero.gravity *= -1;
    gameAudio.play("flip");
    hero.grounded = false;
    hero.vy = hero.gravity * 100;
    if (attempts === 1 && !hero.flipped) blink = .55;
    hero.flipped = true;
  }
  if (pressed.has("Space") && hero.grounded) {
    hero.vy = -hero.gravity * 540;
    gameAudio.play("jump");
    hero.grounded = false;
  }
  hero.vy = clamp(hero.vy + hero.gravity * 1390 * dt, -700, 700);
  hero.y += hero.vy * dt;
  hero.grounded = false;
  if (hero.y <= ceiling + 20) {
    hero.y = ceiling + 20;
    hero.vy = Math.max(0, hero.vy);
    hero.grounded = hero.gravity < 0;
  }
  if (hero.y >= floor - 20 && oldY <= floor - 20 && hasFloor(hero.x)) {
    hero.y = floor - 20;
    hero.vy = Math.min(0, hero.vy);
    hero.grounded = hero.gravity > 0;
  }
  if (hero.grounded && !wasGrounded) gameAudio.play("land");
  if (hero.y > H + 22) {
    retry("Watch the pit");
    return;
  }
  if (hasWeaponBlock() && !used && hero.vy < 0 && oldY - 20 >= block.y + block.h && hero.y - 20 <= block.y + block.h
      && Math.abs(hero.x - blockCenter.x) < 38) {
    activateWheel();
    return;
  }

  hero.flash = Math.max(0, hero.flash - dt);
  hero.fire = Math.max(0, hero.fire - dt);
  hero.swing = Math.max(0, hero.swing - dt);
  if ((keys.has("KeyJ") || pressed.has("KeyJ")) && !hero.fire) {
    const heavy = reward === pulseCannon;
    const rapid = reward === rapidBlaster;
    const ricochet = reward === ricochetBlaster;
    hero.fire = heavy ? .58 : rapid ? .095 : .25;
    hero.muzzleUntil = clock + .065;
    gameAudio.play(heavy ? "pulse" : rapid ? "rapid" : "fire");
    const spread = reward === scatterBlaster ? [-.23, 0, .23] : [0];
    const speed = heavy ? 470 : rapid ? 850 : 695;
    const color = heavy || rapid || ricochet ? reward.color : "#ffc369";
    for (const angle of spread) {
      shots.push({x: hero.x + hero.face * 19, y: hero.y, vx: hero.face * speed, vy: speed * angle,
        life: 2.1, bounces: Number(ricochet), color, heavy});
    }
  }
  if (pressed.has("KeyK") && !hero.swing) {
    hero.swing = .26;
    const plasma = reward === plasmaBlade;
    const shock = reward === shockBlade;
    gameAudio.play(shock ? "shock" : "sword");
    const reach = plasma ? 94 : 57;
    const tip = {x: hero.x + hero.face * reach / 2, y: hero.y};
    if (hasWeaponBlock() && !used && near(tip, blockCenter, reach / 2 + 24, 44)) {
      activateWheel();
      return;
    }
    for (const alien of aliens) {
      if (alien.hp && near(tip, alien, reach / 2 + 16, 48)) damageAlien(alien, plasma ? 2 : 1);
    }
    if (guard.hp && !cargoRunning() && near(tip, guard, reach / 2 + 16, 48)) {
      const blocking = guard.phase === "windup" && !guard.gun && guard.face === -hero.face;
      if (nixRoom()) {
        announce("Nix’s armor deflects swords. Use your blaster.");
      } else if (plasma || !blocking) {
        const target = guard;
        const waking = guard.phase === "sleeping";
        damageGuard(plasma ? 2 : 1);
        if (guard === target && !waking && !goliathSlamming() && !(guard.blackoutUntil > clock)) {
          guard.phase = "recover";
          guard.time = shock ? 1.3 : .34;
        }
      }
    }
  }
  updateShots(dt);
  if (wheel) return;
  updateRivet(dt);
  if (reactor()) {
    reactorTime += dt;
    const {surface, active} = reactorBeam();
    if (active && Math.abs(hero.y - surface) < 28
        && beamZones.some(zone => hero.x > zone.x && hero.x < zone.end)) hurt();
  }
  if (mode !== "play") return;
  updateGuard(dt);
  if (hatchery() && mode === "play") updateNest(dt);
  if (hostile.length) hostile = hostile.filter(shot => {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    if (near(shot, hero, 15, 20)) {
      hurt();
      return false;
    }
    return shot.x > 32 && shot.x < W - 32 && shot.y > ceiling && shot.y < floor;
  });
  if (mode === "play") updateAlienCalls(dt);
  if (mode !== "play" || exitLocked() || hero.x <= 990 || Math.abs(hero.y - (floor - 20)) >= 44) return;
  if (rescueRoom() && !near(hero, rivet, 88, 55)) return;
  if (stage < finalStage) {
    advance();
  } else {
    mode = "won";
    gameAudio.play("clear");
    announce("Rivet rescued. Game cleared!");
  }
}

function box(x, y, w, h, color, surface = ctx) {
  surface.fillStyle = color;
  surface.fillRect(x, y, w, h);
}

function shape(points, color, surface = ctx) {
  surface.fillStyle = color;
  surface.beginPath();
  points.forEach(([x, y], i) => i ? surface.lineTo(x, y) : surface.moveTo(x, y));
  surface.closePath();
  surface.fill();
}

function label(value, x, y, size = 18, color = "#f8e6ca", align = "left") {
  ctx.font = "800 " + size + "px system-ui";
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
}

function disc(x, y, radius, color, surface = ctx) {
  surface.fillStyle = color;
  surface.beginPath();
  surface.arc(x, y, radius, 0, Math.PI * 2);
  surface.fill();
}

function trophy(x, y, color, style) {
  ctx.save();
  ctx.translate(x, y);
  shape([[-63,-62],[63,-62],[73,-47],[65,49],[0,71],[-65,49],[-73,-47]], "#34242c");
  shape([[-57,-55],[57,-55],[66,-43],[58,43],[0,61],[-58,43],[-66,-43]], "#49323a");
  box(-21, 48, 42, 5, "#90684d");
  if (style === 0) {
    shape([[-41,-13],[-57,-25],[-59,-46],[-37,-30],[-21,-19],[21,-19],[37,-30],[59,-46],[57,-25],[41,-13],[32,26],[0,41],[-32,26]], color);
  } else if (style === 1) {
    shape([[-39,-25],[0,-44],[39,-25],[48,-4],[19,40],[-19,40],[-48,-4]], color);
  } else {
    disc(0, 2, 41, color);
    shape([[-25,-20],[-45,-43],[-50,-24],[-32,-6],[32,-6],[50,-24],[45,-43],[25,-20]], color);
  }
  shape([[-30,0],[0,12],[30,0],[17,29],[0,37],[-17,29]], "#3a303c");
  const closed = style === 0 && blink > 0;
  for (const eyeX of [-21, 21]) {
    box(eyeX - 8, -9, 16, closed ? 2 : 8, "#d7af73");
    if (style === 1) box(eyeX - 5, 3, 10, 5, "#d7af73");
  }
  ctx.restore();
}

function beam(x, y, w, height) {
  box(x, y, w, height, "#312830");
  box(x, y, w, 5, "#ab7150");
  box(x, y + 5, w, 3, "#674536");
  for (let i = x + 10; i < x + w - 5; i += 32) box(i, y + 16, 5, 4, "#815543");
}

function drawWeaponBlock(glowing = false) {
  if (used || !hasWeaponBlock()) return;
  if (glowing) {
    ctx.shadowBlur = 18 + Math.sin(clock * 5) * 5;
    ctx.shadowColor = "#ffb955";
  }
  box(block.x, block.y, block.w, block.h, "#efaa55");
  if (glowing) ctx.shadowBlur = 0;
  box(block.x + 4, block.y + 4, block.w - 8, block.h - 8, "#412f38");
  label("?", blockCenter.x, block.y + 37, 34, "#ffd584", "center");
}

function paintRoomBackdrop() {
  const wall = ctx.createLinearGradient(0, ceiling, 0, floor);
  wall.addColorStop(0, "#382730");
  wall.addColorStop(.45, "#2b202b");
  wall.addColorStop(1, "#171720");
  box(0, 0, W, H, wall);
  for (let x = 33; x < W; x += 106) box(x, 96, 2, 390, "#0f101b55");
  for (let y = 157; y < floor; y += 64) box(32, y, W - 64, 2, "#100f1955");
  for (const x of [175, 365, 555, 745, 935]) {
    const light = ctx.createRadialGradient(x, 164, 3, x, 194, 115);
    light.addColorStop(0, "#ffad6425");
    light.addColorStop(1, "#ffad6400");
    box(x - 115, 105, 230, 215, light);
    box(x - 22, 153, 44, 4, "#d08b5c");
  }
  trophy(175, 244, "#72795e", 0);
  trophy(365, 253, "#795771", 1);
  trophy(555, 239, "#627779", 2);
  trophy(745, 252, "#846a59", 0);
  trophy(935, 244, "#616973", 1);
  box(32, 348, W - 64, 3, "#533942");
  box(32, 353, W - 64, 2, "#17121d");
  box(0, 105, 32, H - 105, "#211d28");
  box(W - 32, 105, 32, H - 105, "#211d28");
  box(0, 0, W, 83, "#17151e");
  beam(0, 83, W, 22);
  box(32, 101, W - 64, 4, "#60939b");
  box(0, floor, W, H - floor, "#16141d");
  box(pit.x, floor, pit.end - pit.x, H - floor, "#090a12");
  beam(0, floor, pit.x, H - floor);
  beam(pit.end, floor, W - pit.end, H - floor);
  for (const edge of [pit.x - 28, pit.end]) {
    for (let i = 0; i < 3; i++) {
      shape([[edge + i * 8,465],[edge + i * 8 + 5,465],[edge + i * 8 + 9,474],[edge + i * 8 + 4,474]], "#f3af52");
    }
  }
}

function drawRoom() {
  const doorColor = guard.hp ? "#f18a76" : "#8eead9";
  box(970, 354, 74, 111, "#5d4447");
  box(977, 361, 60, 104, "#151821");
  box(984, 370, 46, 95, guard.hp ? "#382934" : "#224343");
  box(985, 377, 44, 4, doorColor);
  label("EXIT", 1007, 350, 15, doorColor, "center");
  drawWeaponBlock(true);
}

function paintNestBackdrop() {
  const cavern = ctx.createLinearGradient(0, 90, 0, H);
  cavern.addColorStop(0, "#2c2845");
  cavern.addColorStop(1, "#0d1b28");
  box(0, 0, W, H, cavern);
  for (let x = 55; x < W; x += 96) {
    shape([[x - 32, 95], [x + 34, 95], [x + 17, 185], [x - 13, 245]], "#3a3452");
    disc(x, 202 + 34 * Math.sin(x), 7, "#695179");
    shape([[x - 35, floor], [x + 48, floor], [x + 18, 358], [x - 18, 400]], "#27354a");
  }
  box(0, 0, W, 83, "#17151e");
  beam(0, 83, W, 22);
  box(32, 101, W - 64, 4, "#81b4ad");
  const gap = nest().gap;
  beam(0, floor, gap ? gap.x : W, H - floor);
  if (gap) {
    box(gap.x, floor, gap.end - gap.x, H - floor, "#0c101b");
    beam(gap.end, floor, W - gap.end, H - floor);
  }
}

function drawNest() {
  for (const egg of eggs) {
    const x = egg.x + (egg.timer === null ? 0 : Math.sin(clock * 56) * 3);
    shape([[x - 21, floor], [x - 19, floor - 21], [x - 9, floor - 39], [x + 8, floor - 43],
      [x + 20, floor - 22], [x + 23, floor]], egg.timer === null ? "#8174a4" : "#ea9c91");
    box(x - 6, floor - 20, 11, 4, "#dbb6ef");
  }
  for (const alien of aliens) {
    if (alien.hp) drawNestAlien(alien);
  }
  drawWeaponBlock();
  box(970, 354, 74, 111, "#524063");
  box(980, 365, 54, 100, "#171b2d");
  const color = exitLocked() ? "#ff897b" : "#8eead9";
  box(985, 377, 44, 4, color);
  label("NEXT", 1007, 350, 15, color, "center");
}

function drawNestAlien(alien) {
  ctx.save();
  ctx.translate(alien.x, alien.y);
  if (alien.flying) {
    const flap = Math.sin(clock * 19 + alien.x);
    shape([[-8,5],[2,4],[8,18],[4 + flap * 5,27],[-2,24],[1,18]], "#734d9e");
    shape([[1,15],[5,18],[4 + flap * 5,25],[2,22]], "#c9a3f3");
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side, 1);
      ctx.rotate(flap * .44);
      shape([[5, 1], [16, -8], [38, -12], [28, 2], [22, 0], [15, 11]], "#493056");
      shape([[13, 0], [18, -5], [32, -9], [25, -1], [20, -1], [15, 7]], "#bb7de1");
      shape([[18, -4], [30, -8], [20, 0]], "#f4abdc");
      shape([[18,-7],[28,-14],[38,-12],[30,-9]], "#70499d");
      shape([[27,-11],[35,-12],[30,-9]], "#dfc7ff");
      ctx.restore();
    }
    shape([[-14,-5],[-8,-14],[9,-14],[15,-3],[10,10],[0,16],[-10,10]], "#623c83");
    shape([[-11,-7],[-6,-13],[8,-13],[12,-7],[4,-2],[-7,-2]], "#c78ce7");
    shape([[-10,-3],[-3,1],[-5,6],[-10,3]], "#b8ffed");
    shape([[3,1],[10,-3],[10,3],[5,6]], "#b8ffed");
    box(-2, 8, 4, 3, "#81ecd2");
    disc(0, -8, 3 + flap * .6, "#ffb9e9");
    disc(0, -8, 1.4, "#fff0fb");
  } else {
    const stride = Math.sin(clock * 18 + alien.x);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side, 1);
      shape([[4,2],[12,-2],[22,6 + stride * side],[22,13],[17,9],[10,6]], "#b4638a");
      shape([[8,5],[15,5],[18,12 - stride * side],[13,12],[8,9]], "#e791a5");
      shape([[11,-1],[21,-5 + stride * side],[23,0],[19,4],[18,0],[14,4]], "#f4b391");
      ctx.restore();
    }
    shape([[-15,6],[-13,-5],[-6,-12],[8,-12],[15,-4],[16,8],[4,11],[-8,10]], "#503465");
    shape([[-13,-5],[-5,-12],[8,-12],[13,-6],[5,-3],[-5,-2]], "#e69b7e");
    shape([[-12,-1],[-3,2],[-5,6],[-11,4]], "#ffdf94");
    shape([[3,2],[12,-1],[11,4],[5,6]], "#ffdf94");
    box(-3, 8, 6, 2, "#ee7183");
    shape([[-9,-8],[-5,-13],[7,-13],[11,-8],[5,-6],[-3,-6]], "#f3ab91");
    box(-2, -11, 4, 3, "#ffe0a4");
  }
  ctx.restore();
}

function reactorBeam() {
  const elapsed = reactorTime % 2.6;
  const surface = Math.floor(reactorTime / 2.6) % 2 === 0 ? floor - 20 : ceiling + 20;
  return {surface, active: elapsed >= 1.25 && elapsed < 2.15, warning: elapsed >= .55 && elapsed < 1.25};
}

function paintDeckBackdrop() {
  box(0, 0, W, H, rescueRoom() ? "#192f39" : cargoChase() ? "#293239" : trophyRevolt() ? "#392635" : stasisVault() ? "#261d3b" : lab() ? "#202339" : reactor() ? "#352432" : "#151c2b");
  for (let x = 85; x < W; x += 198) {
    box(x, 170, 146, 146, "#384452");
    box(x + 6, 176, 134, 134, "#101426");
    for (let i = 0; i < 9; i++) {
      disc(x + 12 + (i * 37) % 121, 182 + (i * 53 + x) % 117, i % 3 === 0 ? 2 : 1, "#a3b7d3");
    }
  }
  box(0, 0, W, 83, "#151624");
  beam(0, 83, W, 22);
  box(32, 101, W - 64, 4, "#769ac1");
  if (cargoChase()) {
    box(0, floor, W, H - floor, "#090e17");
    beam(0, floor, cargoGaps[0].x, H - floor);
    beam(cargoGaps[0].end, floor, cargoGaps[1].x - cargoGaps[0].end, H - floor);
    beam(cargoGaps[1].end, floor, W - cargoGaps[1].end, H - floor);
    for (const x of [175, 488, 733]) {
      box(x, floor - 31, 54, 31, "#5a594a");
      box(x + 4, floor - 26, 46, 3, "#c1a164");
    }
  } else if (lab()) {
    beam(0, floor, labGap.x, H - floor);
    beam(labGap.end, floor, W - labGap.end, H - floor);
    box(labGap.x, floor, labGap.end - labGap.x, H - floor, "#090d17");
  } else {
    beam(0, floor, W, H - floor);
  }
}

function drawRescueArea() {
  label("RIVET’S RESCUE", W / 2, 160, 26, "#b6f0ea", "center");
  for (let i = 0; i < rescueGates.length; i++) {
    const x = rescueGates[i];
    const open = rescueStep >= (i === 0 ? 1 : 3);
    box(x - 15, ceiling, 30, 7, "#5b7c83");
    box(x - 15, floor - 7, 30, 7, "#5b7c83");
    if (!open) {
      box(x - 11, ceiling + 7, 22, floor - ceiling - 14, "#405662");
      for (let y = ceiling + 20; y < floor - 20; y += 24) {
        box(x - 6, y, 12, 4, "#e7a560");
      }
    }
  }
  if (rescueStep < 2) {
    box(503, floor - 58, 63, 5, "#708998");
    for (let x = 503; x < 566; x += 15) box(x, floor - 53, 3, 53, "#708998");
    label("RIVET", 533, floor - 80, 13, "#b6f0ea", "center");
  }
  const stations = [
    [bulkheadSwitch.x, ceiling, rescueStep >= 1, "BULKHEAD"],
    [cageSwitch.x, floor - 8, rescueStep >= 2, "CAGE RELEASE"],
    [641, floor - 8, rescueStep >= 3, "RIVET’S GATE"],
    [airlockSwitch.x, floor - 8, (rescueStep >= 4 || (rescueStep === 3 && rivet.x >= airlockSwitch.x)), "RIVET’S PANEL"],
    [airlockSwitch.x, ceiling, rescueStep >= 4, "AIRLOCK PANEL"]
  ];
  for (const [x, y, active, name] of stations) {
    const color = active ? "#a9f5c8" : "#ffc377";
    box(x - 19, y, 38, 8, color);
    label(name, x, y === ceiling ? 132 : floor - 65, 13, color, "center");
  }
}

function drawDeck() {
  if (rescueRoom()) drawRescueArea();
  if (stasisVault()) label("STASIS VAULT", W / 2, 146, 26, "#d6aaff", "center");
  if (cargoChase()) label("CARGO CHASE", W / 2, 146, 26, "#f8bf69", "center");
  if (trophyRevolt()) {
    label("TROPHY REVOLT", W / 2, 146, 26, "#f1b1cb", "center");
    for (let i = 0; i < revoltTrophies.length; i++) {
      const item = revoltTrophies[i];
      box(item.x - 52, 201, 104, 88, "#291d2c");
      box(item.x - 48, 205, 96, 80, "#705363");
      if (i > revoltWave) {
        ctx.save();
        ctx.translate(item.x, 244);
        ctx.scale(.48, .48);
        trophy(0, 0, item.color, item.style);
        ctx.restore();
      }
    }
  }
  if (hasSwitch()) {
    box(ceilingSwitch.x - 22, ceiling, 44, 9, switchHeld ? "#9affe2" : "#edca7e");
    label("SWITCH", ceilingSwitch.x, 162, 14, "#f8dfab", "center");
  }
  drawWeaponBlock();
  if (reactor()) {
    const {surface, active, warning} = reactorBeam();
    for (const zone of beamZones) {
      box(zone.x, surface - 19, zone.end - zone.x, 7, active ? "#ff6575" : warning ? "#f6c56b" : "#476375");
      if (active) box(zone.x, surface - 16, zone.end - zone.x, 2, "#fff2af");
    }
  }
  box(961, 352, 82, 113, "#354555");
  box(970, 361, 64, 104, exitLocked() ? "#47303d" : "#203b4b");
  const color = exitLocked() ? "#ff897b" : "#8eead9";
  box(977, 373, 50, 4, color);
  label(rescueRoom() ? "EXIT" : cargoChase() ? "AIRLOCK" : stage >= 6 ? "NEXT" : "BRIDGE", 1002, 345, 15, color, "center");
}

function drawRivet() {
  const light = rivet.cooldown > 0 ? "#ffc781" : "#82f7ee";
  const hover = Math.sin(clock * 12) * 1.5;
  ctx.save();
  ctx.translate(rivet.x, rivet.y);
  ctx.scale(1, rivet.gravity);
  if (rivet.flash > 0) {
    const radius = 16 + 47 * (1 - rivet.flash / .45);
    ctx.save();
    ctx.globalAlpha = rivet.flash / .45;
    ctx.strokeStyle = "#fff1a6";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -3, radius, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      disc(Math.cos(angle) * (radius + 4), Math.sin(angle) * (radius + 4) - 3, 2, "#fff1a6");
    }
    ctx.restore();
  }
  ctx.translate(0, hover);
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    shape([[8,4],[15,4],[18,9],[15,14],[9,14],[8,11]], "#31374f");
    shape([[10,5],[15,6],[16,9],[10,9]], "#9596ce");
    box(10, 11, 6, 2, "#72d8db");
    shape([[10,14],[15,14],[12,18 + hover]], "#4e99aa");
    ctx.restore();
  }
  shape([[-17,-5],[-10,-13],[10,-13],[17,-5],[14,7],[8,11],[-8,11],[-14,7]], "#2e3553");
  shape([[-14,-5],[-9,-11],[9,-11],[14,-5],[11,5],[7,8],[-7,8],[-11,5]], "#a0b3db");
  shape([[-11,-5],[-7,-8],[7,-8],[11,-5],[9,3],[-9,3]], "#1c2a43");
  const scan = Math.sin(clock * 4) * 4;
  box(-7, -4, 14, 4, "#42677b");
  box(scan - 2, -5, 5, 5, light);
  box(scan - 1, -5, 3, 1, "#f0fffb");
  box(-3, 6, 6, 2, "#576894");
  shape([[-7,-12],[-8,-17],[-6,-20],[-4,-18],[-4,-13]], "#adb6df");
  disc(-6, -19, 2.3, light);
  ctx.restore();
}

function blade(length, color) {
  box(12, -3, 11, 6, "#a67b66");
  box(22, -8, 4, 16, "#fff0d1");
  shape([[26,-5],[length - 9,-5],[length,0],[length - 9,5],[26,5]], color);
}

function paintHeroBody(surface, style, gravity, stride, time) {
  const palette = heroes[style];
  const polygon = (points, color) => shape(points, color, surface);
  const tile = (x, y, w, h, color) => box(x, y, w, h, color, surface);
  const dot = (x, y, radius, color) => disc(x, y, radius, color, surface);
  const bootGlow = gravity < 0 ? palette.bright : palette.light;
  for (const [x, step] of [[-12, stride], [5, -stride]]) {
    surface.save();
    surface.translate(x, step);
    polygon([[-4,8],[5,8],[7,15],[11,17],[11,20],[-5,20]], "#26374d");
    polygon([[-3,10],[4,10],[6,15],[-4,15]], palette.armor);
    tile(-5, 17, 16, 3, bootGlow);
    tile(-1, 17, 8, 1, "#e2fffc");
    surface.restore();
  }

  polygon([[-15,-9],[-21,-5],[-22,7],[-17,11],[-12,8],[-10,-5]], "#27374a");
  tile(-20, -3, 3, 9, "#6ea1b0");
  polygon([[-14,-5],[-7,-9],[12,-7],[17,1],[11,12],[-12,12]], "#2c3447");
  polygon([[-12,-5],[-5,-8],[12,-6],[15,-1],[9,8],[-10,8]], palette.armor);
  polygon([[-10,-4],[-4,-6],[10,-4],[6,2],[-7,2]], palette.trim);
  polygon([[-7,3],[0,1],[7,3],[3,7],[-4,7]], "#33586b");
  tile(-3, 3, 6, 2, bootGlow);

  polygon([[-19,-13],[-15,-21],[-3,-24],[10,-22],[19,-16],[17,-5],[10,-2],[-12,-3]], "#322a37");
  polygon([[-17,-14],[-13,-20],[-2,-23],[10,-21],[17,-16],[14,-6],[8,-4],[-11,-5]], palette.helmet);
  polygon([[-12,-19],[-2,-23],[10,-21],[14,-18],[2,-18],[-7,-16]], palette.crest);
  polygon([[-8,-16],[4,-17],[17,-16],[16,-9],[8,-6],[-6,-8]], "#23374b");
  polygon([[-3,-14],[5,-15],[15,-14],[14,-11],[7,-9],[-2,-10]], bootGlow);
  tile(8, -14, 5, 1, "#e2fffc");
  dot(-12, -11, 3, "#874c42");
  dot(-12, -11, 1.4, palette.light);

  const flicker = Math.sin(time * 25);
  if (style === "volt") {
    polygon([[-18,-13],[-23,-24],[-10,-19],[-9,-13]], palette.crest);
    polygon([[10,-20],[22,-28],[19,-16],[13,-10]], palette.helmet);
    polygon([[-5,-27],[0,-36],[4,-35],[1,-46 + flicker * 3],[10,-38],[6,-29],[2,-31]], "#f2ff83");
    dot(-9, -34, 1.6, palette.light);
  } else if (style === "nova") {
    polygon([[-20,-11],[-21,-22],[-14,-29],[-9,-22],[-13,-10]], palette.helmet);
    polygon([[10,-23],[18,-27],[18,-18],[15,-13]], palette.crest);
    surface.strokeStyle = "#db8ff8";
    surface.lineWidth = 2;
    surface.beginPath();
    surface.ellipse(1, -32 + flicker, 13, 4, -.13, 0, Math.PI * 2);
    surface.stroke();
    dot(Math.sin(time * 7) * 9, -42, 2, palette.light);
  } else if (style === "frost") {
    polygon([[-16,-19],[-18,-34],[-12,-31],[-8,-24],[-4,-42],[2,-35],[7,-24],[14,-32],[18,-21]], "#89c9f4");
    polygon([[-8,-24],[-4,-42],[2,-35],[1,-24]], "#efffff");
    polygon([[9,-24],[14,-32],[16,-26],[13,-22]], "#c9f4ff");
    const drift = Math.sin(time * 7) * 2;
    polygon([[11,-42 + drift],[13,-45 + drift],[15,-42 + drift],[13,-39 + drift]], "#b8f7ff");
    dot(-14, -40 - drift, 1.5, "#d6f8ff");
  } else if (style === "mantis") {
    polygon([[-18,-16],[-19,-29],[-13,-39],[-10,-38],[-15,-28],[-13,-18]], "#419785");
    polygon([[7,-21],[10,-31],[17,-42],[20,-40],[14,-28],[13,-19]], "#419785");
    dot(-12, -38, 2.1, palette.light);
    dot(18, -41, 2.3, palette.light);
    surface.strokeStyle = "#bef4a380";
    surface.lineWidth = 1;
    surface.beginPath();
    surface.arc(18, -41, 4 + 3 * (flicker + 1), Math.PI * 1.1, Math.PI * 1.9);
    surface.stroke();
    polygon([[-21,-8],[-15,-12],[-14,-5],[-20,0]], "#9fe0af");
  } else if (style === "wraith") {
    polygon([[-17,-14],[-23,-25],[-21,-42],[-15,-31],[-9,-23],[-12,-15]], "#872f54");
    polygon([[10,-21],[19,-29],[22,-39],[25,-29],[18,-17]], "#872f54");
    polygon([[-22,-26],[-21,-42],[-18,-31],[-13,-23],[-17,-23]], "#ff7482");
    polygon([[19,-29],[22,-39],[23,-31],[19,-23]], "#ff7482");
    polygon([[-12,-6],[-2,-10],[10,-7],[6,0],[-7,0]], "#292437");
    dot(2, -32 - flicker * 2, 1.4, "#ff7083");
  } else {
    const lean = stride ? -4 : 0;
    polygon([[-11,-26],[-14,-33],[-10,-41],[-7,-36],[-3 + lean,-49 - flicker * 4],
      [3,-39],[8,-43 + flicker * 3],[11,-31],[7,-26]], "#ff593a");
    polygon([[-7,-27],[-9,-33],[-5,-37],[-2,-34],[lean + 1,-43 - flicker * 3],
      [5,-36],[7,-30],[4,-27]], "#ffab42");
    polygon([[-4,-28],[-3,-32],[0,-36],[3,-32],[3,-28]], "#fff2a5");
    const ember = (time * 1.8) % 1;
    surface.globalAlpha = 1 - ember;
    dot(-4 + lean - ember * 5, -46 - ember * 12, 1.4, "#ffc260");
    surface.globalAlpha = 1;

  }
}

function drawHero() {
  if (mode === "retry" || (hero.flash > 0 && Math.floor(clock * 24) % 2)) return;
  ctx.save();
  ctx.translate(hero.x, hero.y);
  ctx.scale(hero.face, hero.gravity);
  const stride = hero.grounded && (keys.has("ArrowLeft") || keys.has("ArrowRight") || keys.has("KeyA") || keys.has("KeyD"))
    ? Math.sin(clock * 22) * 3 : 0;
  paintHeroBody(ctx, heroStyle, hero.gravity, stride, clock);

  if (hero.swing > 0) {
    ctx.rotate((hero.swing / .26 - .5) * -1.4);
    const specialBlade = reward === plasmaBlade || reward === shockBlade;
    const bladeColor = specialBlade ? reward.color : "#94f4ed";
    const reach = reward === plasmaBlade ? 94 : 57;
    ctx.globalAlpha = .23 * hero.swing / .26;
    shape([[22,-4],[reach * .65,-19],[reach,-9],[reach,1],[reach * .6,-7]], bladeColor);
    ctx.globalAlpha = 1;
    blade(reach, bladeColor);
  } else {
    const firing = clock < hero.muzzleUntil;
    if (firing) ctx.translate(-3, 0);
    shape([[9,-1],[15,-3],[27,-3],[29,1],[27,5],[17,5],[14,9],[10,8]], "#3e506a");
    box(16, -2, 10, 2, "#a8c8d1");
    box(24, 1, 5, 3, "#65dee7");
    if (firing) {
      shape([[28,-1],[35,-4],[34,-1],[43,1],[34,3],[36,6],[28,4]], "#fff3bc");
    }
  }
  ctx.restore();
  const indicatorX = hero.x - hero.face * 24;
  shape([[indicatorX - 4, hero.y - hero.gravity * 31], [indicatorX + 4, hero.y - hero.gravity * 31],
    [indicatorX, hero.y - hero.gravity * 25]], "#81e4ec");
}

function drawRoomBoss(boss) {
  const isDash = boss === trophyBoss;
  const stride = guard.phase === "patrol" ? Math.round(Math.sin(clock * 15) * 3) : 0;
  const jacket = guard.hit > 0 ? "#7e9eaf" : "#253241";
  const face = guard.hit > 0 ? "#d7ffcd" : isDash ? "#85b6d7" : "#82bca5";
  ctx.save();
  ctx.translate(guard.x, guard.y);
  ctx.scale(guard.face * (isDash ? 1.15 : 1), 1);
  if (isDash) {
    shape([[-20,-12],[-28,-5],[-38,19],[-23,15],[-13,22],[-6,6]], "#242950");
    shape([[-24,-5],[-31,12],[-23,8]], "#565d9d");
  }
  box(-22, 13 - stride, 18, 8, "#212930");
  box(4, 13 + stride, 20, 8, "#212930");
  box(-20, 19 - stride, 17, 5, "#627481");
  box(5, 19 + stride, 19, 5, "#627481");
  shape([[-25,0],[-20,-10],[-11,-12],[12,-12],[21,-8],[25,4],[19,18],[-20,18]], jacket);
  shape([[-17,-8],[-9,-12],[-2,1],[-11,9]], "#4c5b6b");
  shape([[16,-8],[9,-12],[1,1],[11,9]], "#4c5b6b");
  if (isDash) {
    shape([[-27,-8],[-20,-14],[-11,-10],[-14,0],[-26,2]], "#465b86");
    shape([[14,-10],[22,-13],[30,-6],[26,3],[17,0]], "#465b86");
    box(-24, -8, 9, 2, "#f5cc78");
    box(20, -8, 7, 2, "#f5cc78");
    shape([[-5,2],[0,-3],[5,2],[0,7]], boss.color);
  }
  if (!isDash) box(-1, 5, 2, 13, "#73838c");
  box(-17, 8, 4, 3, "#80f3db");

  shape([[-20,-31],[-17,-43],[-9,-48],[7,-48],[17,-42],[21,-32],[18,-19],[10,-11],[-8,-11],[-17,-17]], face);
  shape([[-20,-31],[-24,-40],[-13,-35],[-15,-26]], isDash ? "#7096ba" : "#69a18c");
  shape([[18,-32],[25,-37],[22,-27],[17,-24]], isDash ? "#7096ba" : "#69a18c");
  if (isDash) {
    shape([[-20,-35],[-20,-43],[-15,-49],[-7,-54],[5,-54],[16,-50],[21,-43],[20,-34],[15,-40],[12,-34],[7,-41],[3,-35],[-2,-41],[-7,-36],[-11,-40],[-15,-36]], "#c9a262");
    shape([[-16,-46],[-7,-51],[6,-52],[14,-47],[1,-49],[-9,-45]], "#f7d994");
  } else {
    shape([[-19,-34],[-20,-44],[-12,-49],[-7,-48],[-2,-51],[9,-51],[17,-47],[21,-40],[19,-34],[14,-42],[7,-44],[-7,-42],[-14,-39]], "#46352e");
    shape([[-16,-44],[-8,-48],[7,-49],[14,-46],[3,-46],[-8,-43]], "#766050");
    box(-18, -41, 3, 6, "#8c8275");
    box(16, -42, 3, 6, "#8c8275");
  }
  box(-12, -33, 10, 2, "#514943");
  box(5, -33, 11, 2, "#514943");
  box(-11, -29, 8, 3, "#c9dfb7");
  box(6, -29, 8, 3, "#c9dfb7");
  box(-6, -29, 2, 3, "#377f85");
  box(11, -29, 2, 3, "#377f85");
  shape([[1,-29],[5,-23],[4,-21],[-2,-21]], "#659c86");
  if (isDash) {
    shape([[-8,-19],[-2,-17],[7,-17],[13,-20],[8,-14],[-2,-14]], "#38586b");
    box(-1, -17, 8, 1, "#e8f2e2");
  } else {
    box(-4, -17, 12, 2, "#4c625c");
  }
  box(-15, -23, 2, 4, "#9affdd");
  box(15, -23, 2, 4, "#9affdd");
  box(11, -4, 25, 9, "#37294f");
  box(17, -4, 17, 3, "#f6bf73");
  if (guard.phase === "strike") box(36, -4, 9, 8, "#fff3ac");
  ctx.restore();
  const name = boss.name.toUpperCase();
  if (isDash) box(guard.x - 38, guard.y - 81, 76, 28, "#161b32");
  label(guard.phase === "windup" ? name + " !" : name, guard.x, guard.y - 66, 16, "#ffd28c", "center");
  for (let i = 0; i < boss.health; i++) {
    box(guard.x - boss.health * 5.5 + i * 11, guard.y - 57, 8, 3, i < guard.hp ? boss.color : "#614751");
  }
}

function drawGoliathEyes() {
  shape([[-23,-25],[-5,-18],[-6,-12],[-19,-15]], "#ff537f");
  shape([[23,-25],[5,-18],[6,-12],[19,-15]], "#ff537f");
  shape([[-20,-22],[-9,-18],[-17,-17]], "#ffd0dc");
  shape([[20,-22],[9,-18],[17,-17]], "#ffd0dc");
  disc(0, -23, 2, "#ff8fae");
}

function drawGoliath() {
  const sleeping = guard.phase === "sleeping";
  const bob = sleeping ? Math.sin(clock * 3) * 2
    : guard.phase === "slamWindup" ? -Math.min(22, (1 - guard.time) * 22) : 0;
  const scale = 1.25;
  ctx.save();
  ctx.translate(guard.x, floor - (sleeping ? 15 : 24) * scale + bob);
  ctx.scale(guard.face * scale, scale);
  const armor = guard.hit ? "#f8dcff" : "#695483";
  const shellEdge = "#9f83bf";
  box(-36, 12, 27, sleeping ? 3 : 12, "#332848");
  box(9, 12, 28, sleeping ? 3 : 12, "#332848");
  const hornTip = sleeping ? -37 : -51;
  shape([[-41,-2],[-42,hornTip],[-25,-29],[-18,-16]], shellEdge);
  shape([[41,-2],[43,hornTip],[26,-29],[18,-16]], shellEdge);
  shape([[-43,4],[-35,-23],[-21,-38],[21,-38],[35,-23],[44,4],[25,18],[-25,18]], armor);
  shape([[-32,-22],[-21,-35],[21,-35],[32,-22],[22,-28],[-22,-28]], shellEdge);
  shape([[-29,-19],[-18,-30],[18,-30],[29,-19],[21,5],[-21,5]], "#251b37");
  if (sleeping) {
    box(-18, -18, 9, 2, "#9d91b9");
    box(9, -18, 9, 2, "#9d91b9");
  } else {
    drawGoliathEyes();
  }
  shape([[-18,-3],[-9,1],[9,1],[18,-3],[11,8],[-11,8]], "#160e23");
  for (const x of [-10, 0, 10]) shape([[x-3,0],[x+3,0],[x,5]], "#b69bc9");
  box(28, -4, 21, 11, "#332848");
  box(38, -2, 10, 2, sleeping ? "#9d91b9" : "#ff537f");
  if (guard.phase === "strike") disc(51, 1, 5, "#ffbfe9");
  ctx.restore();

  label(sleeping ? "GOLIATH · Zzz" : "GOLIATH", guard.x, guard.y - 88, 17, vaultBoss.color, "center");
  for (let i = 0; i < vaultBoss.health; i++) {
    box(guard.x - 54 + i * 11, guard.y - 78, 8, 4, i < guard.hp ? vaultBoss.color : "#4c3b61");
  }
}

function drawCellThief() {
  const fleeing = cargoRunning();
  if (!fleeing) drawRoomBoss(cargoBoss);
  ctx.save();
  ctx.translate(guard.x, guard.y);
  ctx.scale(guard.face, 1);
  if (fleeing) {
    const stride = Math.sin(clock * 24) * 5;
    shape([[-19,3],[-16,-18],[-5,-25],[14,-22],[20,-9],[12,12],[-12,12]], "#447f75");
    box(1, -15, 11, 4, "#d2ffb4");
    box(-16, 10 + stride, 10, 10, "#283b4e");
    box(4, 10 - stride, 10, 10, "#283b4e");
  }
  box(fleeing ? 14 : -9, fleeing ? -6 : 0, 17, 10, "#ffcf72");
  box(fleeing ? 17 : -6, fleeing ? -4 : 2, 11, 6, "#fff2a3");
  ctx.restore();
  if (fleeing) label("STOLEN CELL", guard.x, guard.y - 39, 15, cargoBoss.color, "center");
}

function drawRevoltTrophy() {
  const item = roomBoss();
  ctx.save();
  ctx.translate(guard.x, guard.y);
  ctx.scale(.52, (guard.gravity || 1) * .52);
  trophy(0, 0, guard.hit ? "#f8d6a4" : item.color, item.style);
  ctx.restore();
  if (!guard.gun && guard.phase === "strike") {
    const x = guard.x + guard.face * 31;
    shape([[x, guard.y - 17], [x + guard.face * 38, guard.y - 7],
      [x + guard.face * 49, guard.y + 10], [x + guard.face * 23, guard.y + 4]], "#ffc198");
  }
  const side = guard.gravity || 1;
  label(item.name.toUpperCase(), guard.x, guard.y - side * 54, 15, "#ffd8de", "center");
  for (let i = 0; i < item.health; i++) {
    box(guard.x - item.health * 5.5 + i * 11, guard.y - side * 44, 8, 4, "#ffd8de" + (i < guard.hp ? "" : "44"));
  }
}

function drawGuard() {
  if (!guard.hp) return;
  if (guard.gun && guard.phase === "windup") {
    ctx.save();
    ctx.strokeStyle = "#ffa577aa";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(hero.x, hero.y);
    ctx.stroke();
    ctx.restore();
  }
  if (stasisVault()) {
    drawGoliath();
    return;
  }
  if (cargoChase()) {
    drawCellThief();
    return;
  }
  if (trophyRevolt()) {
    drawRevoltTrophy();
    return;
  }
  const boss = roomBoss();
  if (boss) {
    drawRoomBoss(boss);
    return;
  }
  const captain = captainRoom();
  const accent = lab() ? "#aeedfb" : reactor() ? "#ffd184" : captain ? "#eab3ff" : "#ff937e";
  const armor = guard.hit > 0 ? "#ffe5a5" : captain ? "#62677f" : "#a55759";
  const stride = guard.phase === "patrol" ? Math.sin(clock * 13) * 3 : 0;
  ctx.save();
  ctx.translate(guard.x, guard.y);
  ctx.scale(guard.face, guard.gravity || 1);
  if (captain) {
    shape([[-13,-16],[-25,-8],[-31,16 + stride],[-18,23],[-9,16]], "#483257");
    shape([[-18,-13],[-22,-8],[-26,17 + stride],[-22,18]], accent);
  }
  shape([[-17,10],[-6,10],[-5,24 - stride],[-22,24 - stride],[-20,18 - stride]], "#272734");
  shape([[4,10],[16,10],[17,18 + stride],[21,24 + stride],[3,24 + stride]], "#353749");
  box(-18, 20 - stride, 10, 2, armor);
  box(7, 20 + stride, 11, 2, armor);
  shape([[-26,-11],[19,-11],[24,-1],[16,16],[-17,16],[-23,6]], "#252735");
  shape([[-23,-9],[-12,-13],[-3,-6],[-11,0],[-22,-1]], armor);
  shape([[7,-6],[21,-10],[22,-2],[14,3],[4,1]], armor);
  shape([[-12,1],[-2,-3],[13,2],[11,13],[-9,13]], armor);
  shape([[-8,2],[-1,0],[8,3],[6,6],[-2,5]], accent);
  box(-10, 10, 20, 2, "#302536");

  if (captain) {
    if (lab()) {
      shape([[-20,-19],[-27,-29],[-26,-40],[-15,-32],[-8,-34],[7,-34],[16,-28],[24,-39],[26,-28],[19,-15],[10,-4],[-10,-5]], "#303348");
      shape([[-23,-35],[-15,-29],[-11,-28],[-17,-24],[-22,-27]], accent);
      shape([[16,-28],[23,-36],[23,-29],[18,-23]], accent);
    } else if (reactor()) {
      shape([[-21,-20],[-24,-31],[-13,-28],[-11,-40],[-3,-28],[4,-38],[11,-28],[19,-33],[20,-16],[11,-4],[-9,-5]], "#493547");
      shape([[-20,-28],[-13,-25],[-10,-37],[-5,-26],[4,-35],[11,-24],[17,-29],[15,-21],[-14,-21]], accent);
    } else {
      shape([[-20,-21],[-24,-33],[-14,-29],[-7,-35],[1,-29],[9,-35],[20,-34],[18,-16],[11,-4],[-9,-5]], "#303348");
      shape([[-20,-24],[-22,-31],[-13,-27],[-7,-32],[1,-26],[17,-30],[17,-23],[4,-19]], accent);
    }
    disc(-3, 4, 4, "#28263c");
    disc(-3, 4, 2 + .5 * Math.sin(clock * 9), accent);
  } else {
    shape([[-20,-19],[-29,-30],[-15,-27],[-5,-29],[11,-28],[27,-30],[20,-18],[12,-6],[-10,-5]], "#523c41");
    shape([[-23,-25],[-28,-30],[-15,-27],[-12,-22]], "#e2a871");
    shape([[15,-24],[26,-30],[22,-22],[16,-20]], "#e2a871");
    shape([[-24,-10],[-31,-5],[-24,1],[-17,-5]], "#473341");
    shape([[-28,-6],[-23,-8],[-20,-6],[-24,-2]], accent);
  }
  shape([[-17,-20],[-6,-24],[15,-20],[16,-12],[9,-7],[-8,-9]], captain ? "#343c50" : "#858b63");
  shape([[-12,-18],[-1,-17],[14,-19],[12,-13],[1,-11],[-10,-13]], "#1c2330");
  shape([[-7,-16],[-2,-15],[-1,-12],[-6,-13]], accent);
  shape([[2,-15],[12,-17],[10,-13],[3,-12]], accent);

  if (guard.phase === "windup" && !guard.gun) ctx.rotate(-1.25);
  if (guard.phase === "recover") ctx.rotate(.6);
  if (guard.gun) {
    if (guard.phase === "strike") ctx.translate(-5, 0);
    shape([[14,-4],[22,-9],[42,-9],[49,-3],[46,5],[29,5],[24,12],[17,12]], "#414e69");
    box(24, -7, 21, 3, accent);
    box(34, -1, 16, 4, "#b8c4dd");
    if (guard.phase === "strike") {
      shape([[48,-6],[58,-9],[55,-3],[69,0],[54,3],[57,8],[47,5]], "#ffedbd");
    }
  } else {
    blade(guard.phase === "strike" ? 76 : 48, accent);
    if (guard.phase === "strike") {
      shape([[26,-7],[46,-23],[69,-18],[82,-5],[66,-11],[47,-11]], "#ffb9a755");
    }
  }
  ctx.restore();
  const direction = guard.gravity || 1;
  if (guard.phase === "windup") label("!", guard.x, guard.y - direction * 52, 25, "#ffc369", "center");
  const health = lab() ? 10 : captainRoom() ? 8 : 3;
  for (let i = 0; i < health; i++) {
    box(guard.x - health * 7 + i * 14, guard.y - direction * 41, 11, 3, i < guard.hp ? "#ff897b" : "#614751");
  }
}

function drawWheel() {
  box(0, 0, W, H, "#11101be6");
  const size = 124;
  const centerY = 279;
  const section = Math.PI * 2 / rewards.length;
  const progress = Math.min(1, wheel.time / 2.05);
  const rest = -Math.PI / 2 - (wheel.pick + .5) * section;
  const angle = rest - 5 * Math.PI * 2 * Math.pow(1 - progress, 3);
  label("WEAPON WHEEL", W / 2, 104, 34, "#ffe3af", "center");
  disc(W / 2, centerY, size + 7, "#fae5c1");
  rewards.forEach((item, i) => {
    const start = angle + i * section;
    const middle = start + section / 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, centerY);
    ctx.arc(W / 2, centerY, size, start, start + section);
    ctx.closePath();
    ctx.fillStyle = item.color;
    ctx.fill();
    ctx.strokeStyle = "#372a3c";
    ctx.lineWidth = 4;
    ctx.stroke();
    label(item.icon, W / 2 + Math.cos(middle) * 77, centerY + Math.sin(middle) * 77 + 13, 42, "#34263a", "center");
  });
  disc(W / 2, centerY, 14, "#33283b");
  shape([[W/2-12, centerY-size-13],[W/2+12, centerY-size-13],[W/2, centerY-size+13]], "#fff6dd");
  const chosen = rewards[wheel.pick];
  label(progress === 1 ? chosen.name : "Spinning…", W / 2, 451, 26, "#fff2d6", "center");
  if (progress === 1) label(chosen.description, W / 2, 483, 17, chosen.color, "center");
}

function drawExplosions() {
  ctx.save();
  for (const blast of explosions) {
    const age = clock - blast.started;
    const progress = age / explosionDuration;
    ctx.globalAlpha = (1 - progress) ** 2;
    ctx.strokeStyle = blast.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(blast.x, blast.y, 9 + progress * 66, 0, Math.PI * 2);
    ctx.stroke();
    disc(blast.x, blast.y, 6 + progress * 18, "#fff2bf");
    for (const spark of blast.sparks) {
      disc(blast.x + spark.vx * age, blast.y + spark.vy * age, spark.size * (1 - progress), blast.color);
    }
  }
  ctx.restore();
}

function drawVaultEffects() {
  if (guard.phase === "slamWindup") {
    box(32, floor - 4, W - 64, 4, "#ffb15c");
  } else if (guard.phase === "slamWave") {
    const radius = (shockwaveDuration - guard.time) * shockwaveSpeed;
    for (const x of [guard.x - radius, guard.x + radius]) {
      shape([[x - 26, floor], [x - 12, floor - 14], [x, floor - 46],
        [x + 12, floor - 14], [x + 26, floor]], "#ff6b72");
      disc(x, floor - 10, 7, "#ffe5a3");
    }
  }

  const remaining = guard.blackoutUntil - clock;
  if (!(remaining > 0)) return;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const flicker = !reducedMotion && remaining < .55 && remaining > .37 ? .38 : 0;
  ctx.save();
  ctx.globalAlpha = clamp(remaining * 3, 0, .93) - flicker;
  box(0, 0, W, H, "#090510");
  ctx.restore();
  if (guard.hp && remaining > .12 && remaining < 1.07) {
    ctx.save();
    ctx.translate(guard.x, floor - 30);
    ctx.scale(guard.face * 1.25, 1.25);
    drawGoliathEyes();
    ctx.restore();
  }
}

function drawBackdrop() {
  const paint = hasRivet() ? paintDeckBackdrop : hatchery() ? paintNestBackdrop : paintRoomBackdrop;
  if (!backdropContext) {
    paint();
    return;
  }
  const eyesClosed = stage === 0 && blink > 0;
  if (paintedStage !== stage || paintedBlink !== eyesClosed) {
    // The same drawing helpers paint the cached layer and the visible canvas.
    const screenContext = ctx;
    ctx = backdropContext;
    try {
      paint();
    } finally {
      ctx = screenContext;
    }
    paintedStage = stage;
    paintedBlink = eyesClosed;
  }
  ctx.drawImage(backdrop, 0, 0);
}

function draw() {
  drawBackdrop();
  if (hasRivet()) drawDeck();
  else if (hatchery()) drawNest();
  else drawRoom();
  drawGuard();
  drawExplosions();
  for (const shot of shots) {
    ctx.shadowBlur = 10;
    ctx.shadowColor = shot.color;
    if (shot.heavy) {
      disc(shot.x, shot.y, 7, shot.color);
      disc(shot.x, shot.y, 3, "#fff2d6");
    } else {
      box(shot.x - 7, shot.y - 2, 14, 4, shot.color);
    }
  }
  ctx.shadowBlur = 0;
  for (const shot of hostile) {
    disc(shot.x, shot.y, 6, "#ff6278");
    disc(shot.x, shot.y, 2, "#fff1be");
  }
  drawHero();
  if (rivet) drawRivet();
  if (stasisVault()) drawVaultEffects();
  label("INTEGRITY", 35, 38, 15, "#d0ad95");
  for (let i = 0; i < 3; i++) box(35 + i * 27, 48, 23, 9, i < hero.hp ? "#84e1e2" : "#493743");
  if (reward) {
    label(reward.icon + "  " + reward.name + "   " + Math.ceil(remaining) + "s", W - 35, 41, 23, reward.color, "right");
    box(W - 235, 51, 200, 5, "#40303c");
    box(W - 235, 51, 10 * remaining, 5, reward.color);
  } else if (hasWeaponBlock()) {
    label(used ? "STANDARD WEAPONS" : "WEAPON BLOCK READY", W - 35, 46, 16, "#ffc474", "right");
  }
  if (wheel) drawWheel();
  if (mode !== "play") {
    box(0, 0, W, H, "#110f18d9");
    label(mode === "won" ? "RIVET RESCUED" : notice, W / 2, 253, 43, "#ffe2ae", "center");
    label(mode === "won" ? "Press R or tap Restart to play again" : "Retrying this section…", W / 2, 296, 22, "#aadfe1", "center");
  }
  const message = mode === "won" ? "Game cleared"
    : rescueRoom() ? rescueInstructions[rescueStep]
    : hasSwitch() && !switchHeld ? "Flip to the ceiling switch and press F"
    : stage === 5 ? "Floor door open"
    : cargoRunning() ? "Follow the thief · Flip over the cargo gaps (E)"
    : cargoChase() && guard.hp ? "Defeat the Cell Thief to reclaim the power cell"
    : trophyRevolt() && guard.hp ? "Trophy " + (revoltWave + 1) + " of " + revoltTrophies.length + " · " + roomBoss().name
    : stasisVault() && goliathSlamming() && guard.hp ? "Shockwave · Flip to the ceiling (E)"
    : stasisVault() && guard.hp ? (guard.phase === "sleeping" ? "Hit Goliath to wake it" : "Defeat Goliath to open the exit")
    : captainRoom() && guard.hp ? (rivet.cooldown ? "Rivet recharging · " + Math.ceil(rivet.cooldown) + "s" : "Press F near the captain to distract it")
    : stage === 0 && guard.hp ? "Defeat Dash to open the exit"
    : nixRoom() && guard.hp ? "Defeat Nix with your blaster (J)"
    : nixRoom() && exitLocked() ? "Aliens left at the gate: " + aliensLeft()
    : guard.hp ? "Defeat the guard to open the exit" : "Exit open";
  const roomName = rescueRoom() ? "Level 9 · Rivet’s Rescue"
    : trophyRevolt() ? "Level 8 · Trophy Revolt"
    : cargoChase() ? "Level 7 · Cargo Chase"
    : stasisVault() ? "Level 6 · Stasis Vault"
    : lab() ? "Level 5 · Gravity Lab"
    : reactor() ? "Level 4 · Reactor Core"
    : commandDeck() ? "Level 3 · Command Deck / " + deckRoom()
    : hatchery() ? "Level 2 · Alien Hatchery / " + nest().name
    : "The Trophy Hall";
  if (heading.textContent !== roomName) heading.textContent = roomName;
  if (status.textContent !== message) status.textContent = message;
}

function drawIntro(time) {
  const surface = introArt.getContext("2d");
  const {width, height} = introArt;
  const sky = surface.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#14152c");
  sky.addColorStop(1, "#5b344b");
  box(0, 0, width, height, sky, surface);
  for (let i = 0; i < 46; i++) {
    const x = (i * 131 + 33) % width;
    const y = (i * 47 + 13) % 174;
    disc(x, y, .8 + .6 * Math.sin(i + time * 3), "#d4c2e6", surface);
  }
  disc(575, 71, 42, "#92586c", surface);
  disc(575, 71, 38, "#b3717c", surface);
  for (let x = 0; x < width; x += 36) {
    const y = 178 + 28 * Math.sin(x * .06) + 14 * Math.cos(x * .13);
    box(x, y, 30, height - y, "#211d31", surface);
    box(x + 4, y + 8, 21, 3, "#75516b", surface);
  }

  const motion = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : time;
  const shipX = 545 - Math.min(motion / 3.7, 1) * 253;
  const shipY = 79 + Math.sin(motion * 2.5) * 6;
  surface.save();
  surface.translate(shipX, shipY);
  if (time >= 1.8) {
    shape([[-16,10],[18,10],[69,158],[-65,158]], "#b78df034", surface);
    shape([[-8,12],[8,12],[29,158],[-28,158]], "#eebcff28", surface);
  }
  shape([[-72,0],[-39,-15],[-18,-15],[-7,-28],[16,-28],[32,-15],[49,-12],[72,2],[50,13],[-44,13]], "#2b2039", surface);
  shape([[-62,0],[-23,-14],[26,-14],[63,2],[37,8],[-35,8]], "#8c568d", surface);
  shape([[-18,-16],[-4,-25],[13,-25],[24,-16]], "#c5a5e4", surface);
  for (const x of [-36, -18, 0, 18, 36]) box(x - 3, 4, 6, 3, "#ffbc8b", surface);
  surface.restore();

  box(0, 233, width, 27, "#1a1726", surface);
  box(0, 232, width, 3, "#ad725d", surface);
  surface.save();
  surface.translate(140 + Math.min(motion, 4) * 7, 204);
  surface.scale(1.4, 1.4);
  paintHeroBody(surface, "pyre", 1, 0, motion);
  surface.restore();
}

function finishIntro() {
  if (!intro.open) return;
  intro.close();
  showHeroPicker();
}

introPlay.addEventListener("click", () => {
  if (introStarted !== null) return;
  gameAudio.start();
  introStarted = performance.now();
  introSkip.focus();
  introPlay.hidden = true;
});
introSkip.addEventListener("click", finishIntro);
intro.addEventListener("cancel", event => {
  event.preventDefault();
  finishIntro();
});

function updateIntro(now) {
  if (!intro.open || introStarted === null) return;
  const time = (now - introStarted) / 1000;
  if (time >= 5.4) {
    finishIntro();
    return;
  }
  const caption = time < 1.8 ? "An alien ship is closing in on the scrapyard."
    : time < 3.6 ? "The aliens have taken the yard."
    : "Boots charged. Time to take it back.";
  if (introCaption.textContent !== caption) introCaption.textContent = caption;
  drawIntro(time);
}

function showHeroPicker() {
  heroPicker.querySelectorAll("[data-hero]").forEach(option => {
    const preview = option.querySelector("canvas");
    const surface = preview.getContext("2d");
    surface.save();
    surface.translate(preview.width / 2, preview.height * .65);
    surface.scale(1.65, 1.65);
    paintHeroBody(surface, option.dataset.hero, 1, 0, .2);
    surface.restore();
    option.addEventListener("click", () => {
      heroStyle = option.dataset.hero;
      gameAudio.start();
      heroPicker.close();
      announce(option.querySelector("span").textContent + " selected");
    });
  });
  heroPicker.showModal();
}

reset();
drawIntro(0);
intro.showModal();
let last = performance.now();
let accumulated = 0;
const step = 1 / 120;
let menuWasOpen = false;

function frame(now) {
  updateIntro(now);
  accumulated += Math.min(.05, (now - last) / 1000);
  last = now;
  while (accumulated >= step) {
    update(step);
    pressed.clear();
    accumulated -= step;
  }
  const menuIsOpen = menuOpen();
  if (!menuIsOpen || !menuWasOpen) draw();
  menuWasOpen = menuIsOpen;
  gameAudio.music(lab() || stage >= 9 ? 4 : reactor() ? 3 : commandDeck() ? 2 : hatchery() ? 1 : 0, mode === "play" && !wheel && !menuIsOpen);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
