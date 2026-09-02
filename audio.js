/* ============================================================
   Som sintetizado com Web Audio. O repositório não tem nenhum
   arquivo de áudio, e para blips curtos um oscilador com envelope
   sai mais leve que qualquer mp3.
   Depende de settings.js.
   ============================================================ */

const Sound = {
  ctx: null,
  master: null,

  /* O navegador só libera áudio depois de um gesto do usuário, então o
     contexto nasce na primeira interação, não no carregamento. */
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return this.ctx;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;

    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.applyVolume();
    return this.ctx;
  },

  applyVolume() {
    if (!this.master) return;
    const level = Settings.get("sfx") ? Settings.get("volume") / 100 : 0;
    this.master.gain.value = level * 0.5;
  },

  /* Uma nota: oscilador com envelope de ataque curto e queda exponencial. */
  note({ freq, dur = 0.16, type = "sine", delay = 0, gain = 0.5, slideTo }) {
    const ctx = this.ensure();
    if (!ctx || !Settings.get("sfx") || Settings.get("volume") === 0) return;

    const at = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, at + dur);

    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(gain, at + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, at + dur);

    osc.connect(env);
    env.connect(this.master);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  },

  drop() {
    // um baque curto que desce: a peça batendo na pilha
    this.note({ freq: 320, slideTo: 90, dur: 0.14, type: "triangle", gain: 0.6 });
    this.note({ freq: 120, dur: 0.09, type: "sine", gain: 0.35, delay: 0.02 });
  },

  invalid() {
    this.note({ freq: 150, slideTo: 90, dur: 0.16, type: "square", gain: 0.2 });
  },

  select() {
    this.note({ freq: 720, dur: 0.06, type: "square", gain: 0.14 });
  },

  win() {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
      this.note({ freq, dur: 0.3, type: "triangle", gain: 0.4, delay: i * 0.09 })
    );
  },

  lose() {
    [392, 349.23, 293.66].forEach((freq, i) =>
      this.note({ freq, dur: 0.34, type: "sine", gain: 0.4, delay: i * 0.13 })
    );
  },

  tie() {
    [440, 440].forEach((freq, i) =>
      this.note({ freq, dur: 0.22, type: "sine", gain: 0.32, delay: i * 0.18 })
    );
  },

  vibrate(pattern) {
    if (!Settings.get("haptics")) return;
    if (navigator.vibrate) navigator.vibrate(pattern);
  },
};

Settings.onChange((key) => {
  if (key === "sfx" || key === "volume") Sound.applyVolume();
});

// destrava o áudio no primeiro toque ou tecla
["pointerdown", "keydown"].forEach((type) =>
  window.addEventListener(type, () => Sound.ensure(), { once: true })
);
