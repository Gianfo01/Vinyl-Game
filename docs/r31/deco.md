# R31 · DECO — personalizar casa, sede e estabelecimentos (aprovado pelo dono em 2026-10-16)

Decisões do dono:
- Decoração: **dependendo do item, dá efeito pequeno** (ex.: casa confortável recupera um pouco mais de energia; sede bonita dá um pouco de prestígio em reuniões; jukebox no bar atrai um pouco mais de público). Itens só visuais também existem.
- Upgrades dos itens obrigatórios: **dependendo do item, dão bônus pequeno** usando efeitos que já existem (capacidade, qualidade de gravação, vantagens das salas). Itens obrigatórios nunca somem; só trocam de modelo/acabamento ou sobem de nível.
- Pode ter mais de um agente.

## Modelo
- **Lugares (slots)** por cômodo: parede, chão, sobre a mesa, teto/luz, papel de parede/pintura, piso/tapete, cortina/moldura da janela (a vista continua a cidade real), letreiro/logo da fachada (sede e negócios).
- **Lugares decoráveis:** casa (todas as moradias e cômodos, frente CASA), sede (todas as salas e degraus garagem→prédio), seus estabelecimentos (estúdio, casa de shows, bar/loja do selo, festival, imóveis do LOTE em outras cidades).
- **Item = objeto único** do registro `src/sim/r31/object.ts` (dono, ano, estado, história; comprar/vender/presentear/roubo como hoje). Novo tipo de modelo `deco` (e `upgrade` para os obrigatórios).
- **Catálogo** com ano em que aparece/sai de linha; fora de linha só usado/antiquário/leilão, com preço "vintage". Estilos por época: art nouveau, art déco, anos 50, anos 70, anos 80, anos 90, minimalista, casa inteligente. Conjunto completo de uma época = conquista.
- **Efeitos:** tabela por item, pequenos, com teto por lugar, só por funções que já existem (opinião via opinion.ts, energia/descanso, prestígio, público, capacidade de sala, qualidade de gravação). Robôs não compram → goldens não mudam.
- **Modo Arrumar** (tecla própria, a definir com keys5): na cena, clicar num lugar abre a gaveta (o que você tem + "comprar mais"); arrastar troca; levar item de um lugar para outro move a mesma instância.
- **Lojas:** móveis/departamento, antiquário/brechó, eletrônicos/hi-fi, galeria; catálogo pelo correio (1900+, entrega em semanas) e internet (2000+, entrega rápida); peças raras nos leilões existentes. Estoque troca na virada do mês pelo motor da vitrine (vitrine31).
- **Lugar público:** item exposto em negócio aparece para clientes e pode ser roubado (submundo existente).
- Tudo atrás do interruptor `deco31` (ligado por padrão quando pronto), editor: dar/tirar item, mudar estoque.

## Frentes e donos de arquivo
- **DECO-M (motor):** `src/sim/r31/deco31.ts`, `src/data/deco31.ts` (catálogo, slots, efeitos, upgrades), modo Arrumar (UI) nas cenas da casa/sede da onda 5, testes. Publica o catálogo (ids, cat, era, slot, tamanho) CEDO para as outras.
- **DECO-A (arte):** `src/ui/pixel/deco31px.ts` — todos os itens do catálogo por época (e estados de upgrade), papéis de parede, pisos, luzes, letreiros; galeria para o dono aprovar.
- **DECO-L (lojas e lugares):** lojas e compra a distância, época/vintage, decoração dos outros estabelecimentos, transporte de itens entre lugares, roubo em lugar público.
