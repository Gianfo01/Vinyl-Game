# R29 — "Seu personagem" na Nova run rápida

Pedido: "Na Nova run rápida o usuário deve escolher nome, idade e essas coisas do seu personagem, e se escolher artista deve
escolher se é vocalista e/ou guitarrista etc." e "permita tanto no completo quanto no resumido ele selecionar tocar até 3
instrumentos".

## O que a tela rápida ganhou

Bloco **Seu personagem** logo abaixo de "Sua atividade principal":

- **Nome** sorteado da cidade e da época (🎲 sorteia outro). As listas de nomes do jogo alternam masculino/feminino e vão dos
  mais antigos aos mais novos; o ano puxa a janela e o sexo, a paridade. Enquanto o jogador não digitar, o nome acompanha
  sexo, cidade e ano.
- **Idade** (18–70, a mesma faixa que o motor aplica ao dono). Sugerida pela atividade e pela situação inicial (artista do zero
  ≈ 21; selo líder ≈ 47); depois de editada, fica.
- **Personagem ▾** (recolhível; aberto no desktop, fechado no celular — nome e idade ficam sempre à vista):
  - **Sexo** (Feminino / Masculino / Outro; ajusta pronome e aparência, como na ficha completa);
  - **Aparência** 🎲: retrato em pixel art do próprio jogo (avatar.ts), coerente com o sexo e com a moda do ano;
  - só para **Artista / banda**: função principal, **"Também toca ou canta"** (chips), gênero da banda, **solo ou banda**
    (sorteada 1–4, solo, dupla… banda de 6) e nome da banda com 🎲 (some no solo).
- A linha de status começa pelo personagem: "Ana Souza, 22 · Vocal · Guitarra · Artista iniciante · …".

## Até 3 instrumentos (rápida e completa)

- A principal + no máximo **2 extras**. Ao chegar em 3, os chips livres ficam desligados e a dica diz "Limite de 3
  instrumentos atingido: desmarque um para trocar".
- A ficha completa (Personagem → Música e estilo) ganhou os **mesmos chips** abaixo de "Instrumento principal".
- **Época:** DJ só a partir de 1975 (toca-discos), Produção (integrante produtor) a partir da primeira eletrônica (1968),
  MC a partir do hip hop (1977). Fora da época o chip some e a principal cai em Vocal; o gênero da banda só lista gêneros já
  nascidos. A lista de instrumento principal da ficha completa também filtra pela época (a atual fica, se vier de antes).

## Mesma RunConfig

Os dois lados usam os mesmos setters:

- `src/sim/char29data.ts`: `setCharName29`, `setCharAge29`, `setMainRole29`, `setExtraRoles29` (ordem canônica, sem repetir,
  sem a principal, só da época, no máximo 2; lista vazia apaga o campo), `ROLES29_MAX = 3`, `roleOpen29`, `defaultAge29`,
  `charName29`.
- `src/ui/ps/char29model.ts`: `setCharSex29` (o handler do campo Sexo da ficha), `setBand29` (gênero só da época,
  `custom.members` = o campo "Seu artista: formação", nome da banda), `toggleExtra29`, `applyChar29` (chamado por
  `applyQuick27`).
- Novo campo opcional `CharacterSpec.roles27?: string[]` (as extras). `QuickRun27` ganhou `char29?` e `art29?`; sem eles
  (`quickDefaults27`) a configuração é a de sempre — `tests/r27-home` continua igual.

## No motor (começo do jogo)

`src/sim/sys/char29.ts` `applyRoles29`, chamado por `life.ts applyCharacter` logo antes do r10 `ensureBandVocalist`:

1. As extras vão para `Person.roles27` (exibição "Guitarra · Vocal" de roles27.ts) e viram instrumentos: Vocal/MC dão a
   **voz** como instrumento (nível ≥ 45), então `sings()`/`hasSinger()` contam o personagem e a banda **não ganha outro
   cantor**; as outras dão o instrumento da função.
2. A banda gerada completa o personagem: integrante com a mesma função do personagem (ou vocalista, se o personagem canta)
   passa para uma função que falta no conjunto do gênero (o mesmo de `people.ts`; hip hop e eletrônica só dentro do próprio
   conjunto, MCs repetidos continuam). Se o personagem não canta, o vocalista gerado fica (a regra r10 continua valendo).

Não sorteia nada: o resto do mundo não muda.

## O que muda na geração do mundo

- Nova run rápida pela tela: o rascunho passa a levar nome, idade sugerida, sexo (m/f pela semente) e aparência — o dono
  nasce com esse nome/idade e o retrato é o mostrado. Quem chama `quickRunConfig27(quickDefaults27(...))` direto (código de
  run, testes) continua igual.
- Bandas do jogador (rápida ou completa) com integrante repetido do personagem trocam a função desse integrante. Os testes
  de ouro (r27-p2a, r27-p2b, r27-m2) usam `defaultConfig` do bot, sem ficha: não mudam e não foram remedidos.

## Testes e capturas

- `tests/r29-quick-char.test.ts`: rápida == completa (nome, idade, sexo, aparência, funções, banda; não artista ignora a
  banda), idempotência, limite de 3 (rápida == completa), principal + extras na Person, quem canta dispensa cantor extra e a
  banda completa as funções, época de funções e gêneros, padrões válidos para todas as atividades (cria o jogo de cada uma).
- Capturas: `docs/shots29personagem/` (desktop 1440 e celular 390: selo, artista vocal + guitarra, limite de 3 e a ficha
  completa com os mesmos chips). Script: `node scripts/r29/personagem.mjs docs/shots29personagem 5191` com `npx vite --port 5191`.
