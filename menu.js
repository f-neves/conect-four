/* ============================================================
   Navegação dos painéis: menu, opções, estatísticas e resultado.
   Só cuida de interface. Quem manda no jogo é o index.js, que
   registra os callbacks em UI.init().
   Depende de settings.js e audio.js.
   ============================================================ */

const UI = {
  panel: document.querySelector("#panel"),
  optionList: document.querySelector("#optionList"),
  statsTable: document.querySelector("#statsTable"),
  statsScope: document.querySelector("#statsScope"),
  menuSummary: document.querySelector("#menuSummary"),
  resultTitle: document.querySelector("#resultTitle"),
  resultLine: document.querySelector("#resultLine"),

  view: "menu",
  optionsReturn: "menu",
  actions: {},
  isTouch: false,

  init(actions) {
    this.actions = actions;
    this.buildOptions();
    this.panel.addEventListener("click", (event) => this.onClick(event));
    window.addEventListener("keydown", (event) => this.onKeyDown(event), true);
    Settings.onChange((key) => this.onSettingChange(key));
    return this;
  },

  setTouch(isTouch) {
    if (this.isTouch === isTouch && this.optionList.children.length) return;
    this.isTouch = isTouch;
    this.buildOptions();
  },

  /* ---------- construção ---------- */

  buildOptions() {
    this.optionList.textContent = "";
    for (const option of Settings.visibleOptions(this.isTouch)) {
      const row = document.createElement("button");
      row.className = "option";
      row.type = "button";
      row.dataset.nav = "";
      row.dataset.option = option.key;

      const label = document.createElement("span");
      label.className = "option-label";
      label.textContent = option.label;

      const value = document.createElement("span");
      value.className = "option-value";
      value.dataset.value = option.key;

      row.append(label, value);
      this.optionList.append(row);
    }
    this.refreshOptionValues();
  },

  refreshOptionValues() {
    for (const option of Settings.visibleOptions(this.isTouch)) {
      const cell = this.optionList.querySelector(`[data-value="${option.key}"]`);
      if (!cell) continue;
      cell.textContent = option.format(Settings.get(option.key));

      // linhas que não valem para a configuração atual ficam inertes em vez
      // de sumir: a lista não dança quando o oponente muda
      const on = option.enabled ? option.enabled() : true;
      cell.parentElement.classList.toggle("is-off", !on);
      cell.parentElement.disabled = !on;
    }
  },

  buildStats() {
    const vsComputer = Settings.vsComputer();
    this.statsScope.textContent = vsComputer
      ? "Contra o computador"
      : "Dois jogadores";

    const rows = vsComputer
      ? Object.entries(AI_LEVELS).map(([key, level]) => ({
          name: level.label,
          current: key === Settings.get("aiLevel"),
          cells: [
            ["Vitórias", Settings.stats[key].vitoria],
            ["Derrotas", Settings.stats[key].derrota],
            ["Empates", Settings.stats[key].empate],
          ],
        }))
      : [
          {
            name: "Placar",
            current: true,
            cells: [
              ["Jogador 1", Settings.stats.humano.p1],
              ["Jogador 2", Settings.stats.humano.p2],
              ["Empates", Settings.stats.humano.empate],
            ],
          },
        ];

    this.statsTable.textContent = "";
    for (const row of rows) {
      const item = document.createElement("li");
      item.className = "stats-row";
      if (row.current) item.classList.add("is-current");

      const name = document.createElement("span");
      name.className = "stats-name";
      name.textContent = row.name;
      item.append(name);

      const group = document.createElement("span");
      group.className = "stats-values";
      for (const [label, value] of row.cells) {
        const cell = document.createElement("span");
        cell.className = "stats-cell";
        cell.innerHTML = `<b>${value}</b>${label}`;
        group.append(cell);
      }
      item.append(group);
      this.statsTable.append(item);
    }
  },

  refreshMenu() {
    const parts = [
      Settings.vsComputer()
        ? `Contra o computador · ${Settings.ai().label}`
        : "Dois jogadores",
      Settings.board().label,
    ];
    this.menuSummary.textContent = parts.join("  ·  ");
  },

  /* ---------- troca de tela ---------- */

  show(view) {
    this.view = view;
    this.panel.dataset.view = view;
    this.panel.classList.add("is-open");
    document.body.classList.add("is-paneled");

    if (view === "menu") this.refreshMenu();
    if (view === "options") this.refreshOptionValues();
    if (view === "stats") this.buildStats();

    this.focusFirst();
  },

  hide() {
    this.panel.classList.remove("is-open");
    document.body.classList.remove("is-paneled");
    const focused = document.activeElement;
    if (focused && this.panel.contains(focused)) focused.blur();
  },

  showResult({ winner, vsComputer, playerName }) {
    if (!winner) {
      this.resultTitle.textContent = "Empate";
      this.resultTitle.dataset.tone = "tie";
      this.resultLine.textContent = "O tabuleiro encheu sem ninguém fechar quatro";
    } else if (vsComputer) {
      const won = winner === 1;
      this.resultTitle.textContent = won ? "Você venceu" : "O computador venceu";
      this.resultTitle.dataset.tone = won ? "win" : "lose";
      this.resultLine.textContent = won
        ? `No nível ${Settings.ai().label.toLowerCase()}`
        : "Tente de novo, ou baixe o nível nas opções";
    } else {
      this.resultTitle.textContent = `${playerName(winner)} venceu`;
      this.resultTitle.dataset.tone = "win";
      this.resultLine.textContent = "Quatro em linha";
    }
    this.show("result");
  },

  /* ---------- navegação ---------- */

  items() {
    const screen = this.panel.querySelector(`[data-screen="${this.view}"]`);
    if (!screen) return [];
    return Array.from(screen.querySelectorAll("[data-nav]")).filter(
      (item) => !item.disabled
    );
  },

  focusFirst() {
    const items = this.items();
    if (items.length) items[0].focus();
  },

  moveFocus(step) {
    const items = this.items();
    if (!items.length) return;
    const current = items.indexOf(document.activeElement);
    const next = (current + step + items.length) % items.length;
    items[next].focus();
    Sound.select();
  },

  onClick(event) {
    const row = event.target.closest("[data-option]");
    if (row) {
      this.changeOption(row.dataset.option, 1);
      return;
    }
    const button = event.target.closest("[data-action]");
    if (button) this.run(button.dataset.action);
  },

  changeOption(key, direction) {
    Settings.cycle(key, direction);
    this.refreshOptionValues();
    Sound.select();
  },

  run(action) {
    Sound.select();

    switch (action) {
      case "play":
        this.actions.onPlay();
        break;
      case "options":
        this.optionsReturn = this.view;
        this.show("options");
        break;
      case "stats":
        this.show("stats");
        break;
      case "reset":
        Settings.resetStats();
        this.buildStats();
        break;
      case "quit":
        this.actions.onQuit();
        this.show("menu");
        break;
      case "back":
        this.show(this.view === "options" ? this.optionsReturn : "menu");
        break;
    }
  },

  onKeyDown(event) {
    if (!this.panel.classList.contains("is-open")) return;

    const focused = document.activeElement;
    const onOption = focused && focused.dataset && focused.dataset.option;

    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        this.moveFocus(-1);
        break;
      case "ArrowDown":
        event.preventDefault();
        this.moveFocus(1);
        break;
      case "ArrowLeft":
        if (!onOption) return;
        event.preventDefault();
        this.changeOption(focused.dataset.option, -1);
        break;
      case "ArrowRight":
        if (!onOption) return;
        event.preventDefault();
        this.changeOption(focused.dataset.option, 1);
        break;
      case "Escape":
        event.preventDefault();
        if (this.view !== "menu") this.run("back");
        break;
      default:
        return;
    }
    // impede que o jogo veja a mesma tecla
    event.stopPropagation();
  },

  onSettingChange(key) {
    if (this.view === "options") this.refreshOptionValues();
    if (this.view === "menu") this.refreshMenu();
    if (this.actions.onSettingChange) this.actions.onSettingChange(key);
  },
};
