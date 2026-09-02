/* ============================================================
   Liga 4
   Regra, busca do computador, render e máquina de estados.
   Depende de settings.js, audio.js e menu.js.
   ============================================================ */

const P1 = 1;
const P2 = 2;
const CONNECT = 4;

/* ---------- estados ---------- */

const MENU = "menu";
const PLAYING = "playing";
const THINKING = "thinking";
const OVER = "over";

const appEl = document.querySelector("#app");
const boardEl = document.querySelector("#board");
const columnsEl = document.querySelector("#columns");
const turnEl = document.querySelector("#turn");
const seatEls = {
  1: document.querySelector('[data-seat="1"]'),
  2: document.querySelector('[data-seat="2"]'),
};
const nameEls = {
  1: document.querySelector('[data-seat="1"] .seat-name'),
  2: document.querySelector('[data-seat="2"] .seat-name'),
};
const btnUndo = document.querySelector("#btnUndo");
const btnRestart = document.querySelector("#btnRestart");
const btnMenu = document.querySelector("#btnMenu");
const hintLastCol = document.querySelector("#hintLastCol");

/* ============================================================
   1. Modo de entrada
   ============================================================ */

const coarsePointer = window.matchMedia("(hover: none) and (pointer: coarse)");
let isTouch = coarsePointer.matches;

function applyMode() {
  document.body.dataset.mode = isTouch ? "touch" : "desktop";
  UI.setTouch(isTouch);
}

coarsePointer.addEventListener("change", (event) => {
  isTouch = event.matches;
  applyMode();
});

/* ============================================================
   2. Tabuleiro

   Representação plana: `cells[row * cols + col]`, com a linha 0 no
   topo. `heights[col]` conta quantas peças a coluna já tem, então
   descobrir onde a peça cai é O(1) em vez de varrer a coluna.
   ============================================================ */

function createBoard(cols, rows) {
  return {
    cols,
    rows,
    cells: new Int8Array(cols * rows),
    heights: new Int8Array(cols),
    moves: [],
  };
}

const at = (board, row, col) => board.cells[row * board.cols + col];

function canDrop(board, col) {
  return col >= 0 && col < board.cols && board.heights[col] < board.rows;
}

function drop(board, col, player) {
  if (!canDrop(board, col)) return -1;
  const row = board.rows - 1 - board.heights[col];
  board.cells[row * board.cols + col] = player;
  board.heights[col]++;
  board.moves.push(col);
  return row;
}

function undrop(board) {
  const col = board.moves.pop();
  if (col === undefined) return -1;
  board.heights[col]--;
  const row = board.rows - 1 - board.heights[col];
  board.cells[row * board.cols + col] = 0;
  return col;
}

const isFull = (board) => board.moves.length === board.cols * board.rows;

/* As quatro direções que formam uma linha. Só metade delas: a contagem
   varre para os dois lados a partir da peça recém-colocada. */
const DIRECTIONS = [
  [0, 1], // horizontal
  [1, 0], // vertical
  [1, 1], // diagonal descendo para a direita
  [1, -1], // diagonal descendo para a esquerda
];

/* Devolve as células da linha vencedora que passa por (row, col), ou null.
   Checar só a partir da última peça é bem mais barato que varrer o
   tabuleiro inteiro, e já entrega as células para destacar na tela. */
function findWin(board, row, col) {
  const player = at(board, row, col);
  if (!player) return null;

  for (const [dr, dc] of DIRECTIONS) {
    const line = [[row, col]];

    for (const sign of [1, -1]) {
      let r = row + dr * sign;
      let cc = col + dc * sign;
      while (
        r >= 0 &&
        r < board.rows &&
        cc >= 0 &&
        cc < board.cols &&
        at(board, r, cc) === player
      ) {
        line.push([r, cc]);
        r += dr * sign;
        cc += dc * sign;
      }
    }

    if (line.length >= CONNECT) return line;
  }
  return null;
}

/* ============================================================
   3. Computador · negamax com poda alfa-beta
   ============================================================ */

const WIN_SCORE = 1e6;

/* Pontua uma janela de quatro casas do ponto de vista de `me`.
   Bloquear vale um pouco mais que atacar, senão o computador ignora
   ameaças óbvias para perseguir a própria sequência. */
function scoreWindow(counts, me, foe) {
  const mine = counts[me];
  const theirs = counts[foe];
  const empty = counts[0];

  if (mine && theirs) return 0;
  if (mine === 3 && empty === 1) return 60;
  if (mine === 2 && empty === 2) return 8;
  if (theirs === 3 && empty === 1) return -75;
  if (theirs === 2 && empty === 2) return -10;
  return 0;
}

function evaluate(board, me) {
  const foe = me === P1 ? P2 : P1;
  let score = 0;

  // preferência pelo centro: colunas centrais participam de mais linhas
  const middle = (board.cols - 1) / 2;
  for (let col = 0; col < board.cols; col++) {
    const weight = board.cols / 2 - Math.abs(col - middle);
    for (let row = 0; row < board.rows; row++) {
      const cell = at(board, row, col);
      if (cell === me) score += weight;
      else if (cell === foe) score -= weight;
    }
  }

  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      for (const [dr, dc] of DIRECTIONS) {
        const endRow = row + dr * (CONNECT - 1);
        const endCol = col + dc * (CONNECT - 1);
        if (endRow < 0 || endRow >= board.rows) continue;
        if (endCol < 0 || endCol >= board.cols) continue;

        const counts = [0, 0, 0];
        for (let k = 0; k < CONNECT; k++) {
          counts[at(board, row + dr * k, col + dc * k)]++;
        }
        score += scoreWindow(counts, me, foe);
      }
    }
  }
  return score;
}

/* Colunas do centro para as bordas: melhora muito a poda, porque os
   lances bons costumam estar no meio e cortam os ramos ruins cedo. */
function columnOrder(cols) {
  const middle = (cols - 1) / 2;
  return Array.from({ length: cols }, (_, i) => i).sort(
    (a, b) => Math.abs(a - middle) - Math.abs(b - middle)
  );
}

function negamax(board, depth, alpha, beta, me, order) {
  if (isFull(board)) return 0;

  for (const col of order) {
    if (!canDrop(board, col)) continue;
    const row = drop(board, col, me);
    const win = findWin(board, row, col);
    undrop(board);
    // vencer agora vale mais do que vencer depois: o desconto por
    // profundidade faz o computador não adiar o golpe final
    if (win) return WIN_SCORE + depth;
  }

  if (depth === 0) return evaluate(board, me);

  const foe = me === P1 ? P2 : P1;
  let best = -Infinity;

  for (const col of order) {
    if (!canDrop(board, col)) continue;
    drop(board, col, me);
    const value = -negamax(board, depth - 1, -beta, -alpha, foe, order);
    undrop(board);

    if (value > best) best = value;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }

  return best === -Infinity ? 0 : best;
}

function chooseColumn(board, me, level) {
  const order = columnOrder(board.cols);
  const playable = order.filter((col) => canDrop(board, col));
  if (!playable.length) return -1;

  // um lance ganha agora, ou o bloqueio de uma vitória do adversário,
  // nunca passa pelo sorteio de erro: mesmo o fácil não pode ignorar isso
  const foe = me === P1 ? P2 : P1;
  for (const player of [me, foe]) {
    for (const col of playable) {
      const row = drop(board, col, player);
      const win = findWin(board, row, col);
      undrop(board);
      if (win) return col;
    }
  }

  if (level.blunder && Math.random() < level.blunder) {
    return playable[Math.floor(Math.random() * playable.length)];
  }

  let bestCol = playable[0];
  let bestValue = -Infinity;
  let alpha = -Infinity;

  for (const col of playable) {
    drop(board, col, me);
    const value = -negamax(board, level.depth - 1, -Infinity, -alpha, foe, order);
    undrop(board);

    if (value > bestValue) {
      bestValue = value;
      bestCol = col;
      if (value > alpha) alpha = value;
    }
  }
  return bestCol;
}

/* ============================================================
   4. Estado da partida
   ============================================================ */

let state = MENU;
let board = createBoard(7, 6);
let turn = P1;
let firstPlayer = P1;
let winner = 0;
let winningLine = null;
let aiTimer = null;

const aiPlayer = () => (Settings.vsComputer() ? P2 : 0);
const isAiTurn = () => Settings.vsComputer() && turn === P2;

function playerName(player) {
  if (Settings.vsComputer()) {
    return player === P1 ? "Você" : "Computador";
  }
  return player === P1 ? "Jogador 1" : "Jogador 2";
}

function setState(next) {
  state = next;
  document.body.dataset.state = next;
}

/* ============================================================
   5. Render
   ============================================================ */

function buildBoard() {
  const { cols, rows } = board;
  appEl.style.setProperty("--cols", cols);
  appEl.style.setProperty("--rows", rows);

  boardEl.textContent = "";
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const hole = document.createElement("div");
      hole.className = "hole";
      hole.dataset.row = row;
      hole.dataset.col = col;
      boardEl.append(hole);
    }
  }

  // a dica de teclado tem que refletir o tabuleiro escolhido
  hintLastCol.textContent = cols;

  columnsEl.textContent = "";
  for (let col = 0; col < cols; col++) {
    const button = document.createElement("button");
    button.className = "column";
    button.type = "button";
    button.dataset.col = col;
    button.setAttribute("aria-label", `Coluna ${col + 1}`);

    const ghost = document.createElement("span");
    ghost.className = "ghost";
    button.append(ghost);
    columnsEl.append(button);
  }
}

const holeAt = (row, col) =>
  boardEl.children[row * board.cols + col];

function placePiece(row, col, player, animated) {
  const hole = holeAt(row, col);
  const piece = document.createElement("span");
  piece.className = `piece piece--${player}`;
  hole.append(piece);

  if (!animated) return;

  // a peça cai de cima do tabuleiro até a casa onde parou
  const distance = hole.getBoundingClientRect().top -
    boardEl.getBoundingClientRect().top + hole.offsetHeight;

  piece.animate(
    [
      { transform: `translateY(${-distance}px)`, offset: 0 },
      { transform: "translateY(0)", offset: 0.72 },
      { transform: "translateY(0) scaleY(0.86)", offset: 0.85 },
      { transform: "translateY(0) scaleY(1)", offset: 1 },
    ],
    { duration: 340, easing: "cubic-bezier(.45,.05,.55,1)" }
  );
}

function renderTurn() {
  const overText = {
    [P1]: `${playerName(P1)} venceu`,
    [P2]: `${playerName(P2)} venceu`,
  };

  if (state === OVER) {
    turnEl.textContent = winner ? overText[winner] : "Empate";
  } else if (state === THINKING) {
    turnEl.textContent = "O computador está pensando";
  } else if (state === PLAYING) {
    // "Vez de Você" nao existe: contra o computador a frase muda de forma
    turnEl.textContent =
      Settings.vsComputer() && turn === P1
        ? "Sua vez"
        : `Vez de ${playerName(turn)}`;
  } else {
    turnEl.textContent = "";
  }

  for (const player of [P1, P2]) {
    nameEls[player].textContent = playerName(player);
    seatEls[player].classList.toggle(
      "is-active",
      state !== OVER && state !== MENU && turn === Number(player)
    );
    seatEls[player].classList.toggle("is-winner", winner === Number(player));
  }

  appEl.dataset.turn = turn;
  btnUndo.disabled = !canUndo();
}

function highlightWin() {
  if (!winningLine) return;
  for (const [row, col] of winningLine) {
    holeAt(row, col).classList.add("is-win");
  }
}

function clearHighlights() {
  boardEl.querySelectorAll(".is-win").forEach((el) =>
    el.classList.remove("is-win")
  );
}

/* ============================================================
   6. Turnos
   ============================================================ */

function canUndo() {
  if (state !== PLAYING) return false;
  // contra o computador desfaz o par de lances, então precisa de dois
  return board.moves.length >= (Settings.vsComputer() ? 2 : 1);
}

function finish(result) {
  clearTimeout(aiTimer);
  setState(OVER);
  highlightWin();
  renderTurn();

  if (result === "empate") {
    Sound.tie();
    Settings.record("empate");
  } else if (Settings.vsComputer()) {
    const won = winner === P1;
    won ? Sound.win() : Sound.lose();
    Sound.vibrate(won ? [30, 50, 60] : [70]);
    Settings.record(won ? "vitoria" : "derrota");
  } else {
    Sound.win();
    Sound.vibrate([30, 50, 60]);
    Settings.record(winner === P1 ? "p1" : "p2");
  }

  // quem começa a próxima depende da preferência
  if (Settings.get("starts") === "alterna") {
    firstPlayer = firstPlayer === P1 ? P2 : P1;
  } else if (Settings.get("starts") === "perdedor" && winner) {
    firstPlayer = winner === P1 ? P2 : P1;
  }

  setTimeout(() => {
    if (state !== OVER) return;
    UI.showResult({ winner, vsComputer: Settings.vsComputer(), playerName });
  }, 900);
}

function play(col) {
  if (state !== PLAYING) return false;
  if (!canDrop(board, col)) {
    Sound.invalid();
    return false;
  }

  const row = drop(board, col, turn);
  placePiece(row, col, turn, true);
  Sound.drop();
  Sound.vibrate(10);

  const line = findWin(board, row, col);
  if (line) {
    winner = turn;
    winningLine = line;
    finish("vitoria");
    return true;
  }

  if (isFull(board)) {
    winner = 0;
    winningLine = null;
    finish("empate");
    return true;
  }

  turn = turn === P1 ? P2 : P1;
  renderTurn();
  maybeThink();
  return true;
}

function maybeThink() {
  if (!isAiTurn() || state !== PLAYING) return;

  setState(THINKING);
  renderTurn();

  // a pausa é proposital: um lance instantâneo parece um bug, e dá tempo
  // de a animação de queda anterior terminar
  aiTimer = setTimeout(() => {
    if (state !== THINKING) return;
    const col = chooseColumn(board, P2, Settings.ai());
    setState(PLAYING);
    if (col >= 0) play(col);
    else renderTurn();
  }, 420);
}

function undo() {
  if (!canUndo()) return;
  const steps = Settings.vsComputer() ? 2 : 1;

  for (let i = 0; i < steps; i++) {
    const col = undrop(board);
    if (col < 0) break;
    const row = board.rows - 1 - board.heights[col];
    holeAt(row, col).textContent = "";
    if (!Settings.vsComputer()) turn = turn === P1 ? P2 : P1;
  }

  Sound.select();
  renderTurn();
}

function newGame() {
  clearTimeout(aiTimer);
  const size = Settings.board();
  board = createBoard(size.cols, size.rows);
  winner = 0;
  winningLine = null;
  clearHighlights();
  buildBoard();

  if (Settings.get("starts") === "p1") firstPlayer = P1;
  turn = firstPlayer;

  UI.hide();
  setState(PLAYING);
  renderTurn();
  maybeThink();
}

function quitToMenu() {
  clearTimeout(aiTimer);
  setState(MENU);
  renderTurn();
}

/* ============================================================
   7. Entrada
   ============================================================ */

let hoverCol = -1;

function setHover(col) {
  hoverCol = col;
  const show = Settings.get("hints") && state === PLAYING && col >= 0;
  for (const button of columnsEl.children) {
    const active = show && Number(button.dataset.col) === col;
    button.classList.toggle("is-hover", active);
    button.classList.toggle(
      "is-blocked",
      active && !canDrop(board, col)
    );
  }
  appEl.dataset.turn = turn;
}

columnsEl.addEventListener("click", (event) => {
  const button = event.target.closest(".column");
  if (!button) return;
  play(Number(button.dataset.col));
});

columnsEl.addEventListener("pointermove", (event) => {
  if (isTouch) return;
  const button = event.target.closest(".column");
  setHover(button ? Number(button.dataset.col) : -1);
});

columnsEl.addEventListener("pointerleave", () => setHover(-1));

btnUndo.addEventListener("click", undo);
btnRestart.addEventListener("click", newGame);
btnMenu.addEventListener("click", () => {
  Sound.select();
  quitToMenu();
  UI.show("menu");
});

window.addEventListener("keydown", (event) => {
  if (state !== PLAYING) return;

  // teclas numéricas jogam direto na coluna
  const digit = Number(event.key);
  if (digit >= 1 && digit <= board.cols) {
    event.preventDefault();
    play(digit - 1);
    return;
  }

  switch (event.key) {
    case "ArrowLeft":
      event.preventDefault();
      setHover(Math.max(0, (hoverCol < 0 ? 1 : hoverCol) - 1));
      break;
    case "ArrowRight":
      event.preventDefault();
      setHover(Math.min(board.cols - 1, (hoverCol < 0 ? -1 : hoverCol) + 1));
      break;
    case "Enter":
    case " ":
      if (hoverCol < 0) return;
      event.preventDefault();
      play(hoverCol);
      break;
    case "z":
    case "Z":
      event.preventDefault();
      undo();
      break;
    case "Escape":
      event.preventDefault();
      Sound.select();
      quitToMenu();
      UI.show("menu");
      break;
  }
});

/* ============================================================
   8. Início
   ============================================================ */

UI.init({
  onPlay: newGame,
  onQuit: () => {
    quitToMenu();
  },
  onSettingChange: (key) => {
    if (key === "opponent" || key === "board") {
      // trocar de oponente ou de tamanho invalida a partida em curso
      if (state !== MENU) {
        clearTimeout(aiTimer);
        setState(MENU);
      }
    }
    if (key === "hints") setHover(hoverCol);
    renderTurn();
  },
});

applyMode();
buildBoard();
setState(MENU);
renderTurn();
UI.show("menu");
