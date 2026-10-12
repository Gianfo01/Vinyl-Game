# Rodada 21

## 1. Funções múltiplas por pessoa (`src/sim/sys/roles21.ts`, aba "Funções" na página da pessoa)
- Linha do tempo única por pessoa: integrante de ato, carreira nova (npc17), segunda carreira (world18) e as funções novas desta rodada.
- Quem ainda está na ativa pode **somar** funções sem largar o palco: dono(a) de selo (o selo entra no mercado e disputa artistas), empresário(a), criador(a) de festival, produtor(a), financiador(a) de discos. A escolha segue a ambição da pessoa e a fama do ato.
- Funções reais documentadas no acervo (`ROLES21`) entram no ano certo quando os nomes reais estão ligados.
- Cada inclusão gera decisões na Caixa:
  - festival novo convida um artista seu (aceitar o cachê, pedir horário nobre, recusar);
  - empresário(a) novo quer representar um artista seu (15%, contraproposta de 10%, recusar);
  - produtor(a)/financiador(a) banca o próximo disco (adiantamento agora, 7%/mês por 24 meses);
  - selo aberto por artista corteja um talento seu (cobrir com bônus ou deixar a confiança cair);
  - patrocínio para o seu festival ou casa de shows (com ou sem exclusividade);
  - com a carreira de empresário: artistas pedem representação (15% ou pedir 20%).
- Pagamentos recorrentes viram fluxos mensais com prazo, lançados no razão.

## 2. Nova Run em 5 etapas
MUNDO, MODO (como começa, funções, empresa, ambição, Carta), PERSONAGEM (passado, ficha, aparência, vida pessoal), REGRAS E RITMOS, REVISÃO. A barra de etapas fica fixa e mostra um resumo de cada etapa. Modos de mundo em grade 3×2. Entrada e atalhos viram botões compactos. Clicar no título de uma seção recolhe ou abre.

## 3. Gravadoras padrão
Além das 22 clássicas, o padrão inclui Odeon (Brasil), RCA Victor, Decca, Capitol, Atlantic, Philips, Warner Bros., Island, Som Livre, Virgin, Sub Pop, XL e Big Hit, cada uma só a partir do ano real de fundação. Começos de 1925 a 1960 deixam de ter um mercado quase vazio.

## 5. Acervo e perfis pesquisados (`src/data/acervo21.ts`, gerado por script)
- 163 atos do acervo pesquisado (fontes por entidade) + os perfis de Músicas Curtidas pesquisados nesta rodada.
- `z` indica em que tamanho de base o ato entra: 1 conferido (base média), 2 confiança média (base grande), 3 só identidade e estreia (base enorme). Entradas não conferidas ficam fora da Fidelidade histórica (`exact: false`).
- Perfis que não são atos musicais (selos, canais de edição acelerada, atores, bandas fictícias) foram descartados. Perfis ainda sem ano de estreia confirmado não entram no mundo até a próxima passada de pesquisa.

## 6–8 e extras
- Textos: "mais de 150 anos (1889–2040, e depois o que você quiser)" no título; descrição da página corrigida.
- Menu lateral: clicar de novo no grupo aberto recolhe/abre (lembrado entre sessões).
- Fichas de artista e lançamento não mostram mais "Real × partida", "Documentado/Simulado" nem o selo "real" na família.
