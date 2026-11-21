"use strict";

const gameAudio = (() => {
  const button = document.querySelector("#sound");
  let context, output, nextBeat, introEnd, beat = 0, musicLevel = -1;
  let enabled = true;
  const opening = [
    [0, 72, .19], [.23, 65, .13], [.4, 69, .14], [.6, 77, .28],
    [.98, 74, .15], [1.16, 71, .15], [1.36, 68, .18], [1.58, 75, .12],
    [1.75, 79, .34], [2.24, 76, .13], [2.43, 81, .15], [2.64, 84, .43]
  ];
  const loops = [
    [48, 55, 60, 58, 46, 53, 57, 55],
    [43, 50, 53, 56, 44, 51, 55, 50],
    [47, 54, 59, 57, 50, 57, 62, 61],
    [41, 48, 53, 50, 44, 51, 56, 51],
    [46, 53, 58, 61, 49, 54, 58, 53]
  ];
  const effects = {
    jump: [[0, 210, 510, .13, "triangle"]],
    flip: [[0, 190, 600, .18, "sine"], [.06, 460, 260, .16, "triangle"]],
    land: [[0, 135, 62, .07, "triangle", .05]],
    fire: [[0, 800, 180, .115, "square", .04]],
    pulse: [[0, 165, 58, .25, "triangle"], [.02, 540, 120, .17, "square", .034]],
    rapid: [[0, 610, 280, .065, "square", .024]],
    shock: [[0, 560, 220, .10, "sawtooth", .045], [.07, 790, 185, .15, "square", .03]],
    sword: [[0, 330, 85, .15, "sawtooth", .045]],
    alien: [
      [0, 196, 123, .38, "triangle", .075],
      [0, 320, 590, .10, "sawtooth", .026],
      [.08, 580, 245, .13, "sawtooth", .026],
      [.19, 270, 470, .08, "triangle", .05],
      [.25, 465, 140, .21, "triangle", .065]
    ],
    enemy: [[0, 360, 100, .19, "square", .05]],
    hit: [[0, 175, 82, .12, "triangle"]],
    hurt: [[0, 280, 78, .24, "sawtooth", .055]],
    retry: [[0, 214, 214, .14, "triangle"], [.13, 157, 112, .25, "triangle"]],
    wheel: [[0, 390, 530, .09, "triangle"], [.10, 510, 640, .09, "triangle"], [.20, 660, 800, .14, "triangle"]],
    equip: [[0, 440, 440, .13, "triangle"], [.12, 554, 554, .15, "triangle"], [.24, 659, 780, .24, "triangle"]],
    expire: [[0, 380, 240, .18, "sine"]],
    hatch: [[0, 235, 385, .13, "sawtooth", .035], [.07, 490, 192, .16, "triangle"]],
    rivet: [[0, 600, 780, .11, "triangle"], [.12, 850, 1100, .14, "sine"]],
    door: [[0, 130, 185, .25, "triangle"], [.14, 360, 510, .22, "sine"]],
    clear: [[0, 392, 392, .19, "triangle"], [.18, 494, 494, .20, "triangle"], [.37, 587, 587, .19, "triangle"], [.55, 784, 784, .43, "triangle"]]
  };
  const pitch = note => 440 * 2 ** ((note - 69) / 12);

  function tone(at, from, to, length, type, volume) {
    const voice = context.createOscillator();
    const gain = context.createGain();
    voice.type = type;
    voice.frequency.setValueAtTime(from, at);
    voice.frequency.exponentialRampToValueAtTime(to, at + length);
    gain.gain.setValueAtTime(.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, at + length);
    voice.connect(gain).connect(output);
    voice.start(at);
    voice.stop(at + length + .025);
  }

  function start() {
    if (!enabled) return;
    if (!context) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) {
        button.textContent = "Audio unavailable";
        button.disabled = true;
        return;
      }
      context = new Audio();
      output = context.createGain();
      output.gain.value = .62;
      output.connect(context.destination);
      const startAt = context.currentTime + .055;
      for (const [offset, note, length] of opening) {
        const at = startAt + offset;
        tone(at, pitch(note), pitch(note), length, "triangle", .105);
        tone(at, pitch(note), pitch(note), length * .76, "sawtooth", .027);
      }
      for (const [offset, note] of [[0, 48], [.6, 53], [1.36, 46], [1.75, 55], [2.64, 48]]) {
        tone(startAt + offset, pitch(note), pitch(note), .23, "triangle", .09);
      }
      introEnd = startAt + 3.16;
      nextBeat = introEnd;
      button.textContent = "Mute sound";
    }
    if (context.state === "suspended") context.resume().catch(() => {});
  }

  function play(name) {
    if (!context || !enabled || context.state !== "running") return;
    for (const [offset, from, to, length, type, volume = .085] of effects[name]) {
      tone(context.currentTime + .012 + offset, from, to, length, type, volume);
    }
  }

  function music(level, playing) {
    if (!context || !enabled || context.state !== "running") return;
    const now = context.currentTime;
    if (!playing || document.hidden || now < introEnd) return;
    if (level !== musicLevel || nextBeat < now - .12) {
      nextBeat = now + .03;
      if (level !== musicLevel) beat = 0;
      musicLevel = level;
    }
    if (nextBeat > now + .08) return;
    const note = loops[level][beat % 8];
    tone(nextBeat, pitch(note), pitch(note), .20, "triangle", .045);
    if (beat % 2 === 0) {
      tone(nextBeat + .16, pitch(note + 19), pitch(note + 19), .13, "sine", .032);
    }
    beat++;
    nextBeat += .30;
  }

  button.addEventListener("click", () => {
    if (!context) {
      start();
      return;
    }
    enabled = !enabled;
    output.gain.setTargetAtTime(enabled ? .62 : 0, context.currentTime, .015);
    button.textContent = enabled ? "Mute sound" : "Unmute sound";
    if (enabled) start();
  });
  return {start, play, music};
})();
