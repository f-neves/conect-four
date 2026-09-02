# Liga 4

Liga 4 em DOM puro, sem dependências e sem build. É só servir a pasta por HTTP.

```bash
python -m http.server 8000
# http://localhost:8000
```

## Arquivos

Os scripts carregam nesta ordem, cada um dependendo só dos anteriores:

| arquivo       | papel                                                         |
| ------------- | ------------------------------------------------------------- |
| `settings.js` | preferências, presets de tabuleiro e nível, estatísticas       |
| `audio.js`    | efeitos sintetizados com Web Audio, vibração                   |
| `menu.js`     | painéis de menu, opções, estatísticas e resultado              |
| `index.js`    | regra, busca do computador, render e máquina de estados        |
| `index.html`  | HUD, tabuleiro e barra de ferramentas                          |
| `style.css`   | apresentação, com os dois modos `[data-mode]`                  |

`settings.js` e `audio.js` não conhecem o jogo. `menu.js` só mexe em interface e
recebe os callbacks em `UI.init()`. `index.js` é quem amarra tudo.

## O tabuleiro é DOM, não canvas

Um Liga 4 é uma grade de casas discretas, então uma grade CSS descreve o jogo
melhor que um canvas: as peças animam com a Web Animations API, o foco de
teclado funciona de graça e não existe matemática de escala.

Cada casa é um quadrado por construção (`grid-template` de `cols` x `rows` em
frações iguais), e o vão entre elas vem de um `inset` percentual, não de `gap`.
Assim os discos ficam redondos em qualquer tamanho de tela sem nenhum cálculo.

O encaixe do tabuleiro no espaço disponível usa unidades de container:

```css
#stage { container-type: size; }
#boardWrap {
  aspect-ratio: var(--cols) / var(--rows);
  width: min(100cqw, calc(100cqh * var(--cols) / var(--rows)), var(--board-max));
}
```

Só `aspect-ratio` com `max-width`/`max-height` **não** resolve: o navegador corta
um dos lados sem encolher o outro, as casas deixam de ser quadradas e os discos
saem elípticos. Foi assim que quebrou na primeira tentativa.

## Os dois modos

O modo é decidido por `matchMedia('(hover: none) and (pointer: coarse)')` e
gravado em `document.body.dataset.mode`, reavaliado quando o navegador muda de
ideia (tablet que ganha teclado).

**`desktop`** · tabuleiro limitado a 660px e centralizado, HUD e barra alinhados
à mesma largura, prévia da coluna seguindo o mouse, e as teclas indicadas
embaixo.

**`touch`** · o tabuleiro ocupa a largura da tela e a barra de ferramentas fica
na base, respeitando `safe-area-inset-bottom`. **Não existe doca de controle**:
num Liga 4 o alvo de toque é a própria coluna, que é uma faixa de altura inteira,
grande e naturalmente confortável para o polegar.

## Estados

`menu` → `playing` ⇄ `thinking` → `over` → `menu`. O estado atual vai para
`body[data-state]`, que o CSS usa para esconder a barra no menu e desativar o
cursor das colunas fora da partida. `thinking` é o turno do computador: os
toques do jogador são ignorados enquanto ele calcula.

## O computador

Negamax com poda alfa-beta. Três detalhes que fazem diferença:

- **Ordenação de colunas do centro para as bordas.** Os lances bons costumam
  estar no meio, então testá-los primeiro corta os ramos ruins cedo. Sem isso, o
  nível brutal fica lento.
- **Desconto por profundidade** no valor da vitória, senão o computador adia o
  golpe final por achar que dá na mesma.
- **`blunder`, a chance de jogar uma coluna qualquer.** É o que separa o fácil
  de um nível que só busca menos fundo: sem isso, o fácil ainda ganha do jogador
  casual toda vez. Mas fechar o jogo e bloquear uma vitória adversária nunca
  passam pelo sorteio, em nenhum nível.

No tabuleiro grande, o nível brutal responde em cerca de 30 ms.

## Opções

Cada linha do painel vem da lista `OPTIONS` em `settings.js`, com um `scope` que
decide em qual plataforma ela aparece. Clicar avança o valor; com a linha em
foco, as setas mudam para os dois lados.

| opção               | onde     | efeito                                       |
| ------------------- | -------- | -------------------------------------------- |
| Oponente            | ambos    | dois jogadores ou computador                 |
| Nível do computador | ambos    | fácil, normal ou brutal                      |
| Tabuleiro           | ambos    | 6x5, 7x6 ou 8x7                              |
| Quem começa         | ambos    | sempre o 1, alterna, ou quem perdeu          |
| Prévia da coluna    | ambos    | disco fantasma no topo da coluna apontada    |
| Efeitos             | ambos    | sons de queda, vitória e menu                |
| Volume              | ambos    | volume mestre                                |
| Vibrar              | celular  | retorno tátil ao jogar                       |

Linhas que não valem para a configuração atual ficam inertes em vez de sumir,
para a lista não dançar quando o oponente muda.

As estatísticas são guardadas **por contexto**: vitórias, derrotas e empates
separados para cada nível do computador, e um placar próprio para o modo de dois
jogadores.

## Controles

- Teclado: `←` `→` escolhem a coluna, `Enter` joga, `1`–`8` jogam direto na
  coluna, `Z` desfaz, `Esc` volta ao menu. Nos menus: setas navegam, `Enter`
  confirma, `Esc` volta.
- Toque: a coluna inteira é o botão.
- Desfazer remove um lance contra outra pessoa, e o par de lances contra o
  computador.

## Estado atual

O que vem depois está em **[`MELHORIAS.md`](MELHORIAS.md)**.
