# Melhorias · Liga 4

> **Leia este arquivo antes de propor qualquer plano novo para este jogo.**
> É o backlog acordado. O `README.md` explica a arquitetura; aqui fica o que vem
> pela frente, por quê, e onde mexer.

**Como usar:** pegar o próximo item não marcado, confirmar com o usuário e
implementar. Marcar `[x]` ao concluir e commitar a marcação junto com a mudança.

---

## Estado atual

O jogo foi reescrito em 2026-09-02. O original tinha 168 linhas com o núcleo
quebrado: não checava diagonais, o contador de vitória vazava da linha para a
coluna gerando vitória fantasma, dava para roubar a peça do adversário clicando
de novo na casa, vencer não encerrava nada, e um `prompt()` no carregamento
perguntava o tamanho do tabuleiro.

Feito: regra correta (quatro direções, empate, fim de partida), jogada por
coluna com queda animada, adaptação mobile/web com HUD por plataforma, menu
inicial com opções e estatísticas, computador em três níveis, desfazer, som
sintetizado e navegação por teclado.

---

## Backlog

### 1. Placar de série entre partidas

- [ ] Mostrar "3 a 1" no HUD durante uma sequência de partidas.

Hoje as estatísticas são acumuladas para sempre, mas não existe a noção de "essa
sessão está 3 a 1". Num jogo de dois jogadores lado a lado, é o número que
importa.

**Onde:** `Settings.stats` guarda o total; falta um contador de sessão em
`index.js`, zerado ao trocar de oponente ou de tabuleiro.

### 2. Realce da ameaça

- [ ] Marcar as colunas onde o adversário fecha quatro no próximo lance.

Como opção desligável, para não estragar o jogo de quem não quer ajuda. A função
já existe: é o mesmo laço que o `chooseColumn` usa para bloquear.

**Onde:** `index.js`, reaproveitando a varredura de vitória imediata.

### 3. Animação de queda mais física

- [ ] Quique menor no fim e leve tremor da pilha ao assentar.

Hoje a peça cai com um `scaleY` de esmagamento. Falta o quique e a reação das
peças de baixo.

**Onde:** `placePiece()` em `index.js`.

### 4. Nível "impossível"

- [ ] Busca com tabela de transposição e aprofundamento iterativo.

O brutal busca 6 de profundidade em 30 ms, então há folga de sobra para um nível
acima. Com tabela de transposição dá para chegar a 10 ou 12 sem travar.

**Onde:** `negamax()` em `index.js`.

### 5. PWA instalável e offline

- [ ] `manifest.webmanifest` mais service worker.

O jogo inteiro tem uns 40 KB sem contar a fonte. É o candidato mais fácil da
coleção para virar ícone na tela inicial.

### 6. Revanche direta

- [ ] Botão de revanche no resultado que já inverte quem começa.

Hoje o resultado tem "Jogar de novo", que respeita a preferência "quem começa".
Um atalho explícito de revanche fecha melhor o ciclo.

### 7. Acessibilidade

- [ ] Anunciar o lance para leitores de tela (`aria-live` no `#turn`).
- [ ] Conferir o contraste entre o vermelho e o amarelo nos três tipos de
      daltonismo. Hoje a distinção é só de matiz; talvez valha um padrão dentro
      do disco.

### 8. Modo online

- [ ] Partida entre dois aparelhos.

Grande, e provavelmente não vale a pena para este jogo antes dos outros da
coleção estarem prontos. Fica registrado como possibilidade, não como plano.

---

## Armadilhas conhecidas

**`aspect-ratio` sozinho não encaixa uma caixa.** Com `max-width` e `max-height`
o navegador corta um lado sem encolher o outro, as casas param de ser quadradas
e os discos saem elípticos. O encaixe correto usa unidades de container
(`100cqw` / `100cqh`), com `container-type: size` no `#stage`.

**Track automático de grid estoura.** Com `grid-template-columns: auto` a coluna
cresce até o `max-content` do tabuleiro, e aí o `max-width: 100%` dele passa a
resolver contra a própria largura estourada em vez da tela. Por isso o `#stage`
usa `minmax(0, 1fr)`.

**`board` no escopo do script é o estado do jogo, não o elemento.** O elemento é
`boardEl`. Ao testar pelo console ou pelo Playwright, usar `boardEl` para o DOM.

**A Press Start 2P só é usada no título.** Os rótulos usam fonte de sistema
justamente porque a pixel font quebra `Ú`, `Í` e `Ã`. Não estender a pixel font
para o corpo do texto.

**O painel cobre a tela inteira, não a caixa do tabuleiro.** A lista de opções
não caberia dentro de um tabuleiro pequeno num celular.
