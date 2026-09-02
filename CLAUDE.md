# Liga 4

**Leia `MELHORIAS.md` antes de propor qualquer plano para este jogo.** É o
backlog acordado, com o porquê de cada item, onde mexer no código e as
armadilhas conhecidas. Não montar um plano novo sem consultá-lo.

`README.md` explica a arquitetura: tabuleiro em DOM (não canvas), encaixe por
unidades de container, os dois modos `[data-mode]`, a máquina de estados e a
cascata de scripts (`settings.js` → `audio.js` → `menu.js` → `index.js`).

## Regras deste projeto

- O tabuleiro é uma grade CSS, não um canvas. Cada casa é quadrada por
  construção e o vão vem de `inset` percentual, não de `gap`.
- O encaixe usa `100cqw` / `100cqh`. `aspect-ratio` com `max-width`/`max-height`
  sozinho deforma as casas: já quebrou uma vez.
- A Press Start 2P só vale para o título. Os rótulos usam fonte de sistema,
  porque a pixel font quebra `Ú`, `Í` e `Ã`.
- No escopo do script, `board` é o estado do jogo e `boardEl` é o elemento.
- Testar as mudanças de interface **nos dois modos** antes de dar por pronto. O
  Playwright está disponível na máquina (`p.devices["iPhone 13"]` cobre bem o
  modo touch) e já pegou dois bugs reais aqui: o tabuleiro estourando a largura
  da tela e os discos saindo elípticos.
- Servir por HTTP para testar (`python -m http.server`), não abrir por `file://`.
