// R31/R33 — a cor do holograma (tela inicial, intro): a luz de cada pixel do boneco decide o tom.

/** Cor do holograma para um pixel do boneco (a luz do pixel decide: escuro = azul fundo, claro = ciano quase branco;
 *  a metade de cima puxa para o violeta). Usada pela tela inicial e pela intro (R33) para o holograma ser o mesmo. */
export function holoRgb5(r: number, g: number, b: number, top: boolean): [number, number, number] {
  const v = Math.min(1, (0.3 * r + 0.59 * g + 0.11 * b) / 255 * 1.25 + 0.08);
  return [Math.round(10 + v * (top ? 190 : 170)), Math.round(40 + v * (top ? 180 : 215)), Math.round(90 + v * 165)];
}
