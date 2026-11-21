"use strict";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const heading = document.querySelector("#room-name");
const status = document.querySelector("#status");
const announcement = document.querySelector("#announcement");
const {width: W, height: H} = canvas;
const floor = 465;
const ceiling = 105;
const pit = {x: 300, end: 510};
const block = {x: 394, y: 111, w: 50, h: 50};
const rewards = [
  {name: "Scatter Blaster", icon: "✷", color: "#ffbc69"},
  {name: "Ricochet Blaster", icon: "↪", color: "#7be0ff"},
  {name: "Plasma Blade", icon: "✦", color: "#e3a8ff"}
];
const keys = new Set();
const pressed = new Set();
let hero, guard, shots, wheel, reward, remaining, used, mode, attempts;
let stage = 0;
const cargoNames = ["Lift Shaft", "Furnace Walk", "Loading Dock"];
const catwalk = {x: 435, end: 740, y: 171, h: 20};
let liftTime, lift, hostile;
const cargo = () => stage > 0;
const shaft = () => stage === 1;
const furnaceGap = {x: 330, end: 478};
const dockGap = {x: 490, end: 635};
const fireGap = () => stage === 2 ? furnaceGap : dockGap;
const hasWeaponBlock = () => stage === 0 || stage === 2;
let blink = 0;
let clock = 0;
let notice = "";

function announce(message) {
  announcement.textContent = message;
}

function reset() {
  hero = {x: 88, y: floor - 20, vy: 0, gravity: 1, face: 1, grounded: true, fire: 0, swing: 0, flash: 0, hp: 3};
  guard = {x: 781, y: floor - 24, face: -1, hp: 3, phase: "patrol", time: 0, hit: 0};
  if (cargo()) {
    hero.hp = 2;
    guard.hp = stage === 1 ? 0 : 4;
    guard.gun = stage === 2;
  }
  liftTime = 0;
  lift = {x: 244, end: 410, y: 460, h: 18};
  hostile = [];
  shots = [];
  wheel = reward = null;
  remaining = blink = 0;
  used = false;
  mode = "play";
  notice = "";
  attempts = (attempts || 0) + 1;
}

function press(code) {
  if (!keys.has(code)) pressed.add(code);
  keys.add(code);
}

const controls = new Set(["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "Space", "KeyE", "KeyJ", "KeyK", "KeyR"]);
addEventListener("keydown", event => {
  if (controls.has(event.code) && !(event.code === "Space" && event.target.closest?.("button"))) {
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
    if (event.detail === 0) pressed.add(code);
  });
});

const clamp = (value, low, high) => Math.max(low, Math.min(value, high));
const near = (a, b, x, y) => Math.abs(a.x - b.x) < x && Math.abs(a.y - b.y) < y;
const blockCenter = {x: block.x + block.w / 2, y: block.y + block.h / 2};
function hasFloor(x) {
  if (shaft()) return x < 245;
  const gap = cargo() ? fireGap() : pit;
  return x < gap.x || x > gap.end;
}

function advance() {
  stage++;
  reset();
  announce("Cargo Lift. " + cargoNames[stage - 1]);
}

function activateWheel() {
  if (used) return;
  used = true;
  wheel = {time: 0, pick: Math.floor(Math.random() * rewards.length)};
  announce("Weapon wheel spinning");
}

function damageGuard(amount) {
  guard.hp = Math.max(0, guard.hp - amount);
  guard.hit = .15;
  if (!guard.hp) announce("Guard defeated. Exit open.");
}

function hurt() {
  if (hero.flash > 0) return;
  hero.hp--;
  hero.flash = .9;
  hero.vy = -hero.gravity * 310;
  hero.grounded = false;
  if (!hero.hp) retry("Guard got you");
}

function retry(message) {
  mode = "retry";
  notice = message;
  hero.retry = .85;
  announce(message);
}

function updateGuard(dt) {
  if (!guard.hp) return;
  guard.hit = Math.max(0, guard.hit - dt);
  guard.time -= dt;
  const close = near(hero, guard, guard.gun ? 470 : 92, guard.gun ? 190 : 58);
  if (guard.phase === "patrol") {
    if (close) {
      guard.face = Math.sign(hero.x - guard.x) || guard.face;
      guard.phase = "windup";
      guard.time = .55;
    } else {
      guard.x += guard.face * 76 * dt;
      if (guard.x < 690 || guard.x > 875) {
        guard.x = clamp(guard.x, 690, 875);
        guard.face *= -1;
      }
    }
  } else if (guard.phase === "windup" && guard.time <= 0) {
    guard.phase = "strike";
    guard.time = .19;
    if (guard.gun) {
      const dx = hero.x - guard.x;
      const dy = hero.y - guard.y;
      const distance = Math.hypot(dx, dy) || 1;
      hostile.push({x: guard.x, y: guard.y, vx: dx / distance * 445, vy: dy / distance * 445});
    }
  } else if (guard.phase === "strike") {
    const tip = {x: guard.x + guard.face * 31, y: guard.y};
    if (!guard.gun && near(hero, tip, 51, 42)) hurt();
    if (guard.time <= 0) {
      guard.phase = "recover";
      guard.time = .62;
    }
  } else if (guard.phase === "recover" && guard.time <= 0) {
    guard.phase = "patrol";
  }
}

function updateShots(dt) {
  shots = shots.filter(shot => {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
    if (shot.life <= 0 || shot.y > H) return false;
    const wall = shot.x < 32 || shot.x > W - 32;
    const surface = (!shaft() && shot.y < ceiling) || (shot.y > floor && hasFloor(shot.x));
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
    if (guard.hp && near(shot, guard, 21, 25)) {
      const front = Math.sign(shot.vx) === -guard.face;
      if (!(front && guard.phase === "windup" && !guard.gun)) damageGuard(1);
      return false;
    }
    return true;
  });
}

function update(dt) {
  clock += dt;
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
      announce(reward.name + " equipped for 20 seconds");
      wheel = null;
    }
    return;
  }

  if (reward) {
    remaining -= dt;
    if (remaining <= 0) {
      reward = null;
      announce("Standard weapons restored");
    }
  }
  blink = Math.max(0, blink - dt);
  const move = Number(keys.has("ArrowRight") || keys.has("KeyD") || pressed.has("ArrowRight"))
    - Number(keys.has("ArrowLeft") || keys.has("KeyA") || pressed.has("ArrowLeft"));
  if (move) hero.face = move;
  const previousLiftY = lift.y;
  if (shaft()) {
    liftTime += dt;
    lift.y = 460 - 215 * (.5 - .5 * Math.cos(liftTime * Math.PI / 3));
    if (hero.grounded && hero.gravity > 0 && hero.x >= lift.x && hero.x <= lift.end
        && Math.abs(hero.y + 20 - previousLiftY) < 1) {
      hero.y += lift.y - previousLiftY;
    }
  }
  const oldY = hero.y;
  hero.x = clamp(hero.x + move * 268 * dt, 48, W - 48);
  if (pressed.has("KeyE")) {
    hero.gravity *= -1;
    hero.grounded = false;
    hero.vy = hero.gravity * 100;
    if (attempts === 1 && !hero.flipped) blink = .55;
    hero.flipped = true;
  }
  if (pressed.has("Space") && hero.grounded) {
    hero.vy = -hero.gravity * 540;
    hero.grounded = false;
  }
  hero.vy = clamp(hero.vy + hero.gravity * 1390 * dt, -700, 700);
  hero.y += hero.vy * dt;
  hero.grounded = false;
  if (!shaft() && hero.y <= ceiling + 20) {
    hero.y = ceiling + 20;
    hero.vy = Math.max(0, hero.vy);
    hero.grounded = hero.gravity < 0;
  }
  if (hero.y >= floor - 20 && oldY <= floor - 20 && hasFloor(hero.x)) {
    hero.y = floor - 20;
    hero.vy = Math.min(0, hero.vy);
    hero.grounded = hero.gravity > 0;
  }
  if (shaft()) {
    const surfaces = [lift, catwalk, {x: 780, end: W, y: 322, h: 24}];
    for (const surface of surfaces) {
      if (hero.x < surface.x || hero.x > surface.end) continue;
      const top = surface.y - 20;
      const underside = surface.y + surface.h + 20;
      if (hero.vy >= 0 && oldY <= top + .01 && hero.y >= top) {
        hero.y = top;
        hero.vy = 0;
        hero.grounded = hero.gravity > 0;
      } else if (hero.vy <= 0 && oldY >= underside - .01 && hero.y <= underside) {
        hero.y = underside;
        hero.vy = 0;
        hero.grounded = hero.gravity < 0;
      }
    }
  }
  if (cargo() && !hasFloor(hero.x) && hero.y + 20 > floor - 12) {
    retry("Watch the fire");
    return;
  }
  if (shaft() && hero.y < 76) {
    retry("Catch the underside of the catwalk");
    return;
  }
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
    hero.fire = .25;
    const ricochet = reward === rewards[1];
    const spread = reward === rewards[0] ? [-.23, 0, .23] : [0];
    for (const angle of spread) {
      shots.push({x: hero.x + hero.face * 19, y: hero.y, vx: hero.face * 695, vy: 695 * angle, life: cargo() && !ricochet ? .65 : 2.1, bounces: Number(ricochet), color: ricochet ? "#7be0ff" : "#ffc369"});
    }
  }
  if (pressed.has("KeyK") && !hero.swing) {
    hero.swing = .26;
    const plasma = reward === rewards[2];
    const reach = plasma ? 94 : 57;
    const tip = {x: hero.x + hero.face * reach / 2, y: hero.y};
    if (hasWeaponBlock() && !used && near(tip, blockCenter, reach / 2 + 24, 44)) {
      activateWheel();
      return;
    }
    if (guard.hp && near(tip, guard, reach / 2 + 16, 48)) {
      const blocking = guard.phase === "windup" && !guard.gun && guard.face === -hero.face;
      if (plasma || !blocking) {
        damageGuard(plasma ? 2 : 1);
        guard.phase = "recover";
        guard.time = .34;
      }
    }
  }
  updateShots(dt);
  if (wheel) return;
  updateGuard(dt);
  hostile = hostile.filter(shot => {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    if (near(shot, hero, 15, 20)) {
      hurt();
      return false;
    }
    return shot.x > 32 && shot.x < W - 32 && shot.y > ceiling && shot.y < floor;
  });
  const exitY = shaft() ? 302 : 445;
  if (mode !== "play" || guard.hp || hero.x <= 990 || Math.abs(hero.y - exitY) >= 44) return;
  if (stage < 3) {
    advance();
  } else {
    mode = "won";
    announce("Cargo Lift cleared");
  }
}

function box(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function shape(points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  ctx.fill();
}

function label(value, x, y, size = 18, color = "#f8e6ca", align = "left") {
  ctx.font = "800 " + size + "px system-ui";
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
}

function disc(x, y, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
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

function drawRoom() {
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
  const doorColor = guard.hp ? "#f18a76" : "#8eead9";
  box(970, 354, 74, 111, "#5d4447");
  box(977, 361, 60, 104, "#151821");
  box(984, 370, 46, 95, guard.hp ? "#382934" : "#224343");
  box(985, 377, 44, 4, doorColor);
  label("EXIT", 1007, 350, 15, doorColor, "center");
  if (!used) {
    ctx.shadowBlur = 18 + Math.sin(clock * 5) * 5;
    ctx.shadowColor = "#ffb955";
    box(block.x, block.y, block.w, block.h, "#efaa55");
    ctx.shadowBlur = 0;
    box(block.x + 4, block.y + 4, block.w - 8, block.h - 8, "#412f38");
    label("?", blockCenter.x, block.y + 37, 34, "#ffd584", "center");
  }
}

function drawCargo() {
  const steel = ctx.createLinearGradient(0, 83, 0, H);
  steel.addColorStop(0, "#253c48");
  steel.addColorStop(1, "#101621");
  box(0, 0, W, H, steel);
  for (let x = 45; x < W; x += 124) {
    box(x, 87, 9, 390, "#13242f");
    box(x + 9, 87, 2, 390, "#405662");
    for (let y = 137; y < 440; y += 84) box(x + 3, y, 4, 4, "#73818a");
  }
  box(0, 0, W, 83, "#17151e");
  if (shaft()) {
    box(244, 110, 5, 350, "#59717b");
    box(405, 110, 5, 350, "#59717b");
    beam(0, floor, 245, H - floor);
    beam(lift.x, lift.y, lift.end - lift.x, lift.h);
    box(lift.x, lift.y, lift.end - lift.x, 4, "#ffca66");
    beam(catwalk.x, catwalk.y, catwalk.end - catwalk.x, catwalk.h);
    box(catwalk.x, catwalk.y + catwalk.h - 4, catwalk.end - catwalk.x, 4, "#78dce4");
    beam(780, 322, W - 780, 25);
    label("LIFT", 327, lift.y + 34, 14, "#ffca66", "center");
  } else {
    const gap = fireGap();
    beam(0, 83, W, 22);
    box(32, 101, W - 64, 4, "#60939b");
    beam(0, floor, gap.x, H - floor);
    beam(gap.end, floor, W - gap.end, H - floor);
    for (let x = gap.x; x < gap.end; x += 12) {
      const height = 17 + 10 * Math.sin(clock * 9 + x);
      shape([[x, H],[x, floor + 15],[x + 6, floor - height],[Math.min(x + 13, gap.end), H]], "#ec733e");
      shape([[x + 2, H],[x + 7, floor - height / 2],[Math.min(x + 11, gap.end), H]], "#ffbf69");
    }
    if (hasWeaponBlock() && !used) {
      box(block.x, block.y, block.w, block.h, "#efaa55");
      box(block.x + 4, block.y + 4, block.w - 8, block.h - 8, "#412f38");
      label("?", blockCenter.x, block.y + 37, 34, "#ffd584", "center");
    }
  }
  const doorFloor = shaft() ? 322 : floor;
  box(970, doorFloor - 111, 74, 111, "#354950");
  box(980, doorFloor - 100, 54, 100, "#19262e");
  box(985, doorFloor - 88, 44, 4, guard.hp ? "#ff897b" : "#8eead9");
  label(stage === 3 ? "EXIT" : "NEXT", 1007, doorFloor - 115, 15, guard.hp ? "#ff897b" : "#8eead9", "center");
}

function blade(length, color) {
  box(12, -3, 11, 6, "#a67b66");
  box(22, -8, 4, 16, "#fff0d1");
  shape([[26,-5],[length - 9,-5],[length,0],[length - 9,5],[26,5]], color);
}

function drawHero() {
  if (mode === "retry" || (hero.flash > 0 && Math.floor(clock * 24) % 2)) return;
  ctx.save();
  ctx.translate(hero.x, hero.y);
  ctx.scale(hero.face, hero.gravity);
  const stride = hero.grounded && (keys.has("ArrowLeft") || keys.has("ArrowRight") || keys.has("KeyA") || keys.has("KeyD"))
    ? Math.sin(clock * 22) * 3 : 0;
  box(-13, 11 + stride, 10, 9, "#78dce4");
  box(4, 11 - stride, 10, 9, "#78dce4");
  box(-14, -5, 28, 19, "#e4a05c");
  box(-16, -20, 30, 20, "#ffe39b");
  box(-9, -16, 24, 11, "#263143");
  box(4, -14, 8, 7, "#a6f9f4");
  box(-19, 0, 6, 11, "#9d625b");
  box(8, 2, 13, 7, "#8ba6b5");
  if (hero.swing > 0) {
    ctx.rotate((hero.swing / .26 - .5) * -1.4);
    blade(reward === rewards[2] ? 94 : 57, reward === rewards[2] ? "#e3a8ff" : "#94f4ed");
  }
  ctx.restore();
  shape([[hero.x - 5, hero.y - hero.gravity * 32], [hero.x + 5, hero.y - hero.gravity * 32], [hero.x, hero.y - hero.gravity * 25]], "#81e4ec");
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
  ctx.save();
  ctx.translate(guard.x, guard.y);
  ctx.scale(guard.face, 1);
  box(-17, 13, 13, 11, "#68533e");
  box(4, 13, 14, 11, "#68533e");
  shape([[-23,-6],[20,-6],[16,16],[-17,16]], guard.hit > 0 ? "#ffe5a5" : "#ad585e");
  shape([[-18,-20],[-29,-29],[-6,-26],[14,-26],[25,-31],[20,-12],[12,0],[-11,0]], "#9dac6e");
  box(1, -18, 15, 4, "#211e25");
  box(9, -18, 5, 4, "#ffd36e");
  if (guard.phase === "windup" && !guard.gun) ctx.rotate(-1.25);
  if (guard.phase === "recover") ctx.rotate(.6);
  if (guard.gun) {
    box(13, -3, 27, 12, "#75939c");
    box(35, 0, 12, 5, "#ffa577");
  } else {
    blade(guard.phase === "strike" ? 76 : 48, "#ff897b");
  }
  ctx.restore();
  if (guard.phase === "windup") label("!", guard.x, guard.y - 41, 25, "#ffc369", "center");
  for (let i = 0; i < (cargo() ? 4 : 3); i++) box(guard.x - 20 + i * 14, guard.y - 35, 11, 3, i < guard.hp ? "#ff897b" : "#614751");
}

function drawWheel() {
  box(0, 0, W, H, "#11101be6");
  const size = 124;
  const centerY = 279;
  const section = Math.PI * 2 / 3;
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
  label(progress === 1 ? rewards[wheel.pick].name : "Spinning…", W / 2, 451, 26, "#fff2d6", "center");
}

function draw() {
  if (cargo()) drawCargo();
  else drawRoom();
  drawGuard();
  for (const shot of shots) {
    ctx.shadowBlur = 10;
    ctx.shadowColor = shot.color;
    box(shot.x - 7, shot.y - 2, 14, 4, shot.color);
  }
  ctx.shadowBlur = 0;
  for (const shot of hostile) {
    disc(shot.x, shot.y, 6, "#ff6278");
    disc(shot.x, shot.y, 2, "#fff1be");
  }
  drawHero();
  label("INTEGRITY", 35, 38, 15, "#d0ad95");
  for (let i = 0; i < 3; i++) box(35 + i * 27, 48, 23, 9, i < hero.hp ? "#84e1e2" : "#493743");
  if (reward) {
    label(reward.icon + "  " + reward.name + "   " + Math.ceil(remaining) + "s", W - 35, 41, 23, reward.color, "right");
    box(W - 235, 51, 200, 5, "#40303c");
    box(W - 235, 51, 10 * remaining, 5, reward.color);
  } else if (!shaft() && stage !== 3) {
    label(used ? "STANDARD WEAPONS" : "WEAPON BLOCK READY", W - 35, 46, 16, "#ffc474", "right");
  }
  if (wheel) drawWheel();
  if (mode !== "play") {
    box(0, 0, W, H, "#110f18d9");
    label(mode === "won" ? "CARGO LIFT CLEARED" : notice, W / 2, 253, 43, "#ffe2ae", "center");
    label(mode === "won" ? "Press R or tap Restart to play again" : "Retrying this section…", W / 2, 296, 22, "#aadfe1", "center");
  }
  const message = mode === "won" ? "Game cleared"
    : shaft() ? "Ride the lift, then flip onto the catwalk"
    : guard.hp ? "Defeat the guard to open the exit" : "Exit open";
  const roomName = cargo() ? "Level 2 · Cargo Lift / " + cargoNames[stage - 1] : "The Trophy Hall";
  if (heading.textContent !== roomName) heading.textContent = roomName;
  if (status.textContent !== message) status.textContent = message;
}

reset();
let last = performance.now();
let accumulated = 0;
const step = 1 / 120;

function frame(now) {
  accumulated += Math.min(.05, (now - last) / 1000);
  last = now;
  while (accumulated >= step) {
    update(step);
    pressed.clear();
    accumulated -= step;
  }
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
