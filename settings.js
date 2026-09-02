/* ============================================================
   Preferências e estatísticas, persistidas em localStorage.
   Sem dependências: é o primeiro script a carregar.
   ============================================================ */

const BOARDS = {
  pequeno: { label: "Pequeno · 6x5", cols: 6, rows: 5 },
  classico: { label: "Clássico · 7x6", cols: 7, rows: 6 },
  grande: { label: "Grande · 8x7", cols: 8, rows: 7 },
};

/* `blunder` é a chance de o computador jogar uma coluna qualquer em vez da
   melhor. É o que separa um nível fácil de um nível que só busca menos fundo:
   sem isso, o fácil ainda ganha do jogador casual toda vez. */
const AI_LEVELS = {
  facil: { label: "Fácil", depth: 2, blunder: 0.4 },
  normal: { label: "Normal", depth: 4, blunder: 0.08 },
  brutal: { label: "Brutal", depth: 6, blunder: 0 },
};

const OPTIONS = [
  {
    key: "opponent",
    label: "Oponente",
    scope: "all",
    values: ["humano", "computador"],
    format: (v) => (v === "humano" ? "2 jogadores" : "Computador"),
  },
  {
    key: "aiLevel",
    label: "Nível do computador",
    scope: "all",
    values: ["facil", "normal", "brutal"],
    format: (v) => AI_LEVELS[v].label,
    // só faz sentido quando existe um computador do outro lado
    enabled: () => Settings.get("opponent") === "computador",
  },
  {
    key: "board",
    label: "Tabuleiro",
    scope: "all",
    values: ["pequeno", "classico", "grande"],
    format: (v) => BOARDS[v].label,
  },
  {
    key: "starts",
    label: "Quem começa",
    scope: "all",
    values: ["p1", "alterna", "perdedor"],
    format: (v) =>
      v === "p1" ? "Sempre o 1" : v === "alterna" ? "Alterna" : "Quem perdeu",
  },
  {
    key: "hints",
    label: "Prévia da coluna",
    scope: "all",
    values: [true, false],
    format: (v) => (v ? "Ligada" : "Desligada"),
  },
  {
    key: "sfx",
    label: "Efeitos",
    scope: "all",
    values: [true, false],
    format: (v) => (v ? "Ligados" : "Desligados"),
  },
  {
    key: "volume",
    label: "Volume",
    scope: "all",
    values: [0, 20, 40, 60, 80, 100],
    format: (v) => `${v}%`,
  },
  {
    key: "haptics",
    label: "Vibrar",
    scope: "touch",
    values: [true, false],
    format: (v) => (v ? "Ligado" : "Desligado"),
  },
];

const EMPTY_STATS = () => ({
  humano: { p1: 0, p2: 0, empate: 0 },
  facil: { vitoria: 0, derrota: 0, empate: 0 },
  normal: { vitoria: 0, derrota: 0, empate: 0 },
  brutal: { vitoria: 0, derrota: 0, empate: 0 },
});

const Settings = {
  STORAGE_KEY: "c4.settings",
  STATS_KEY: "c4.stats",

  values: {
    opponent: "computador",
    aiLevel: "normal",
    board: "classico",
    starts: "alterna",
    hints: true,
    sfx: true,
    volume: 60,
    haptics: true,
  },

  stats: EMPTY_STATS(),
  listeners: [],

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || "{}");
      for (const key of Object.keys(this.values)) {
        if (saved[key] !== undefined) this.values[key] = saved[key];
      }
      const stats = JSON.parse(localStorage.getItem(this.STATS_KEY) || "null");
      if (stats && typeof stats === "object") {
        for (const bucket of Object.keys(this.stats)) {
          if (stats[bucket]) Object.assign(this.stats[bucket], stats[bucket]);
        }
      }
    } catch (error) {
      // localStorage bloqueado (modo privado, iframe): segue nos padrões
    }
    return this;
  },

  save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.values));
      localStorage.setItem(this.STATS_KEY, JSON.stringify(this.stats));
    } catch (error) {
      /* sem persistência, mas a sessão continua válida */
    }
  },

  get(key) {
    return this.values[key];
  },

  set(key, value) {
    if (this.values[key] === value) return value;
    this.values[key] = value;
    this.save();
    this.listeners.forEach((fn) => fn(key, value));
    return value;
  },

  cycle(key, direction) {
    const option = OPTIONS.find((item) => item.key === key);
    if (!option) return;
    const current = option.values.indexOf(this.values[key]);
    const next =
      (current + direction + option.values.length) % option.values.length;
    return this.set(key, option.values[next]);
  },

  onChange(fn) {
    this.listeners.push(fn);
  },

  board() {
    return BOARDS[this.values.board] || BOARDS.classico;
  },

  ai() {
    return AI_LEVELS[this.values.aiLevel] || AI_LEVELS.normal;
  },

  vsComputer() {
    return this.values.opponent === "computador";
  },

  /* onde o resultado desta partida deve ser contabilizado */
  statsBucket() {
    return this.vsComputer() ? this.values.aiLevel : "humano";
  },

  record(result) {
    const bucket = this.stats[this.statsBucket()];
    if (!bucket || bucket[result] === undefined) return;
    bucket[result]++;
    this.save();
  },

  resetStats() {
    this.stats = EMPTY_STATS();
    this.save();
  },

  visibleOptions(isTouch) {
    return OPTIONS.filter(
      (option) =>
        option.scope === "all" ||
        (option.scope === "touch") === Boolean(isTouch)
    );
  },
};

Settings.load();
