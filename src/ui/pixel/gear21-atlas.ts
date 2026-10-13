// Gerado por tools/gear-pack.py a partir de art/pack-equipamentos-v1 — não editar à mão.
// Retângulos [x, y, w, h] de cada sprite em src/assets/gear21.png (já com contorno de 1 px).

export const GEAR_ATLAS = {
  fonografo: [59, 82, 30, 31],
  gramofone: [124, 0, 30, 36],
  microfone: [155, 0, 16, 36],
  gravador: [113, 45, 32, 32],
  mesa: [146, 45, 38, 32],
  multifaixas: [90, 82, 32, 30],
  daw: [0, 45, 44, 36],
  servidor: [85, 0, 22, 40],
  piano: [45, 45, 38, 36],
  violao: [173, 82, 13, 28],
  guitarra: [0, 115, 12, 28],
  baixo: [123, 82, 12, 30],
  bateria: [136, 82, 36, 30],
  sintetizador: [0, 82, 34, 32],
  sintetizador_p: [13, 115, 27, 26],
  sampler: [68, 115, 30, 23],
  dj: [0, 144, 46, 17],
  amplificador: [99, 115, 22, 21],
  caixa_pa: [108, 0, 15, 38],
  prensa_1930: [42, 0, 42, 43],
  prensa_1970: [0, 0, 41, 44],
  duplicador_cd: [84, 45, 28, 36],
  caixa_discos: [41, 115, 26, 24],
  carrinho: [35, 82, 23, 32],
  cilindros: [122, 115, 30, 19],
} as const satisfies Record<string, readonly [number, number, number, number]>;

export type GearId = keyof typeof GEAR_ATLAS;
