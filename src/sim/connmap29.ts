// GERADO por scripts/probe29all.ts --write (não editar à mão). Mapa das conexões MEDIDO: sementes r29all, r29all-b, r29all-c, 1985.
// Cada aresta = maior efeito de um empurrão no sistema A sobre uma saída do sistema B (mesma semente, A × B); força
// forte ≥ 10%, média ≥ 3%, fraca ≥ 0,5% (0,2% nas leituras puras); com várias sementes vale a mediana. "via" diz qual
// empurrão e qual saída (src/sim/probe29all.ts). A wiki lê daqui.
export type Str29 = 'forte' | 'media' | 'fraca';
export interface Edge29 { a: string; b: string; str: Str29; d: number; via: string }
export const SYSTEMS29: { id: string; name: string }[] = [
 {
  "id": "dinheiro",
  "name": "Dinheiro e livro-caixa"
 },
 {
  "id": "reputacao",
  "name": "Reputação"
 },
 {
  "id": "imprensa",
  "name": "Imprensa, críticos e escândalos"
 },
 {
  "id": "projetos",
  "name": "Projetos, composição, estúdio, lançamento"
 },
 {
  "id": "aovivo",
  "name": "Ao vivo, turnês e festivais"
 },
 {
  "id": "sede",
  "name": "Sede, equipe e departamentos"
 },
 {
  "id": "fama",
  "name": "Fama, fãs e facções"
 },
 {
  "id": "mundo",
  "name": "Mundo, eras, tecnologia"
 },
 {
  "id": "vida",
  "name": "Vida pessoal e saúde"
 },
 {
  "id": "contratos",
  "name": "Contratos, promessas, rivais"
 },
 {
  "id": "premios",
  "name": "Prêmios e legado"
 },
 {
  "id": "submundo",
  "name": "Submundo"
 }
];
export const CONNMAP29: Edge29[] = [
  { a: 'dinheiro', b: 'reputacao', str: 'fraca', d: -0.01, via: 'pobre→rep' },
  { a: 'dinheiro', b: 'imprensa', str: 'fraca', d: 0.024, via: 'pobre→critica2' },
  { a: 'dinheiro', b: 'projetos', str: 'forte', d: -0.937, via: 'pobre→cabe_gravar' },
  { a: 'dinheiro', b: 'aovivo', str: 'forte', d: -0.996, via: 'pobre→cabe_shows' },
  { a: 'dinheiro', b: 'sede', str: 'forte', d: -0.943, via: 'pobre→cabe_depto' },
  { a: 'dinheiro', b: 'vida', str: 'forte', d: 0.138, via: 'pobre→estresse' },
  { a: 'dinheiro', b: 'contratos', str: 'forte', d: -0.976, via: 'pobre→cabe_adiant' },
  { a: 'dinheiro', b: 'premios', str: 'forte', d: -0.75, via: 'pobre→cabe_campanha' },
  { a: 'dinheiro', b: 'submundo', str: 'forte', d: -0.917, via: 'pobre→cabe_crime' },
  { a: 'reputacao', b: 'dinheiro', str: 'forte', d: -0.134, via: 'rep→receita' },
  { a: 'reputacao', b: 'imprensa', str: 'media', d: -0.078, via: 'rep→reacao' },
  { a: 'reputacao', b: 'projetos', str: 'fraca', d: 0.003, via: 'rep→gravacao' },
  { a: 'reputacao', b: 'aovivo', str: 'media', d: 0.065, via: 'rep→show' },
  { a: 'reputacao', b: 'sede', str: 'media', d: 0.067, via: 'rep→equipe' },
  { a: 'reputacao', b: 'fama', str: 'fraca', d: 0.006, via: 'rep→fama' },
  { a: 'reputacao', b: 'vida', str: 'media', d: -0.092, via: 'rep→estresse' },
  { a: 'reputacao', b: 'contratos', str: 'forte', d: 0.202, via: 'rep→oferta' },
  { a: 'reputacao', b: 'premios', str: 'media', d: 0.047, via: 'rep→gramofone' },
  { a: 'reputacao', b: 'submundo', str: 'fraca', d: -0.024, via: 'rep→crime_q' },
  { a: 'imprensa', b: 'dinheiro', str: 'forte', d: 0.138, via: 'escandalo→despesas' },
  { a: 'imprensa', b: 'reputacao', str: 'media', d: -0.031, via: 'escandalo→rep' },
  { a: 'imprensa', b: 'projetos', str: 'forte', d: 0.12, via: 'resenha→vendas' },
  { a: 'imprensa', b: 'aovivo', str: 'media', d: -0.094, via: 'escandalo→show' },
  { a: 'imprensa', b: 'sede', str: 'fraca', d: -0.003, via: 'escandalo→equipe' },
  { a: 'imprensa', b: 'fama', str: 'fraca', d: 0.008, via: 'escandalo→embalo' },
  { a: 'imprensa', b: 'vida', str: 'forte', d: 1.015, via: 'escandalo→estresse' },
  { a: 'imprensa', b: 'contratos', str: 'media', d: -0.076, via: 'escandalo→renova' },
  { a: 'imprensa', b: 'premios', str: 'media', d: -0.055, via: 'escandalo→gramofone' },
  { a: 'imprensa', b: 'submundo', str: 'forte', d: 1, via: 'escandalo→calor' },
  { a: 'projetos', b: 'dinheiro', str: 'forte', d: 0.2, via: 'qualidade→receita' },
  { a: 'projetos', b: 'reputacao', str: 'fraca', d: 0.007, via: 'qualidade→rep' },
  { a: 'projetos', b: 'imprensa', str: 'forte', d: 0.366, via: 'qualidade→critica2' },
  { a: 'projetos', b: 'aovivo', str: 'media', d: 0.05, via: 'qualidade→show' },
  { a: 'projetos', b: 'fama', str: 'fraca', d: 0.014, via: 'qualidade→fama' },
  { a: 'projetos', b: 'vida', str: 'forte', d: -0.12, via: 'qualidade→estresse_mes' },
  { a: 'projetos', b: 'contratos', str: 'media', d: 0.051, via: 'qualidade→renova' },
  { a: 'projetos', b: 'premios', str: 'forte', d: 0.261, via: 'qualidade→gramofone' },
  { a: 'projetos', b: 'submundo', str: 'media', d: 0.078, via: 'qualidade→crime_pirata' },
  { a: 'aovivo', b: 'dinheiro', str: 'forte', d: -0.355, via: 'shows→receita' },
  { a: 'aovivo', b: 'imprensa', str: 'forte', d: 1, via: 'shows→atencao' },
  { a: 'aovivo', b: 'projetos', str: 'fraca', d: 0.019, via: 'shows→apelo' },
  { a: 'aovivo', b: 'fama', str: 'fraca', d: 0.009, via: 'shows→embalo' },
  { a: 'aovivo', b: 'vida', str: 'forte', d: 0.662, via: 'shows→estresse' },
  { a: 'aovivo', b: 'contratos', str: 'media', d: -0.065, via: 'shows→renova' },
  { a: 'aovivo', b: 'premios', str: 'media', d: -0.051, via: 'shows→gramofone' },
  { a: 'aovivo', b: 'submundo', str: 'media', d: 0.093, via: 'shows→crime_q' },
  { a: 'sede', b: 'dinheiro', str: 'forte', d: 1.847, via: 'sede→custos' },
  { a: 'sede', b: 'imprensa', str: 'media', d: -0.078, via: 'sede→reacao' },
  { a: 'sede', b: 'projetos', str: 'media', d: 0.08, via: 'sede→vendas' },
  { a: 'sede', b: 'aovivo', str: 'media', d: 0.1, via: 'sede→show' },
  { a: 'sede', b: 'fama', str: 'fraca', d: 0.007, via: 'sede→fama' },
  { a: 'sede', b: 'mundo', str: 'fraca', d: 0.008, via: 'sede→gosto' },
  { a: 'sede', b: 'vida', str: 'media', d: -0.08, via: 'sede→estresse_mes' },
  { a: 'sede', b: 'contratos', str: 'forte', d: 0.109, via: 'sede→oferta' },
  { a: 'sede', b: 'premios', str: 'fraca', d: 0.022, via: 'sede→gramofone' },
  { a: 'sede', b: 'submundo', str: 'forte', d: -0.122, via: 'sede→crime_q' },
  { a: 'fama', b: 'dinheiro', str: 'forte', d: 2.177, via: 'fama→receita' },
  { a: 'fama', b: 'reputacao', str: 'fraca', d: 0.007, via: 'fama→rep' },
  { a: 'fama', b: 'imprensa', str: 'forte', d: 0.27, via: 'fama→fatos' },
  { a: 'fama', b: 'projetos', str: 'forte', d: 1.082, via: 'fama→apelo' },
  { a: 'fama', b: 'aovivo', str: 'forte', d: 3.03, via: 'fama→show' },
  { a: 'fama', b: 'vida', str: 'media', d: -0.051, via: 'fama→estresse_mes' },
  { a: 'fama', b: 'contratos', str: 'forte', d: -0.165, via: 'fama→renova' },
  { a: 'fama', b: 'premios', str: 'forte', d: 0.395, via: 'fama→hall' },
  { a: 'fama', b: 'submundo', str: 'forte', d: 0.146, via: 'fama→crime_q' },
  { a: 'mundo', b: 'dinheiro', str: 'media', d: 0.093, via: 'decada→despesas' },
  { a: 'mundo', b: 'reputacao', str: 'fraca', d: -0.008, via: 'decada→rep' },
  { a: 'mundo', b: 'imprensa', str: 'forte', d: -0.196, via: 'decada→reacao' },
  { a: 'mundo', b: 'projetos', str: 'forte', d: 0.6, via: 'moda→apelo' },
  { a: 'mundo', b: 'aovivo', str: 'forte', d: 0.424, via: 'decada→gig' },
  { a: 'mundo', b: 'sede', str: 'fraca', d: 0.026, via: 'decada→equipe' },
  { a: 'mundo', b: 'fama', str: 'media', d: -0.033, via: 'decada→embalo' },
  { a: 'mundo', b: 'vida', str: 'media', d: 0.03, via: 'decada→estresse_mes' },
  { a: 'mundo', b: 'contratos', str: 'media', d: 0.057, via: 'decada→oferta' },
  { a: 'mundo', b: 'submundo', str: 'forte', d: 0.114, via: 'decada→crime_q' },
  { a: 'vida', b: 'dinheiro', str: 'fraca', d: 0.01, via: 'estresse→despesas' },
  { a: 'vida', b: 'imprensa', str: 'forte', d: 0.158, via: 'estresse→fatos' },
  { a: 'vida', b: 'projetos', str: 'media', d: -0.06, via: 'estresse→gravacao' },
  { a: 'vida', b: 'aovivo', str: 'media', d: -0.059, via: 'estresse→show' },
  { a: 'vida', b: 'fama', str: 'fraca', d: -0.011, via: 'estresse→embalo' },
  { a: 'vida', b: 'contratos', str: 'media', d: -0.076, via: 'estresse→renova' },
  { a: 'vida', b: 'premios', str: 'media', d: -0.052, via: 'estresse→gramofone' },
  { a: 'vida', b: 'submundo', str: 'media', d: 0.091, via: 'estresse→crime_q' },
  { a: 'contratos', b: 'dinheiro', str: 'media', d: -0.095, via: 'desconfianca→receita' },
  { a: 'contratos', b: 'reputacao', str: 'fraca', d: -0.009, via: 'desconfianca→rep' },
  { a: 'contratos', b: 'imprensa', str: 'media', d: 0.037, via: 'rival→critica2' },
  { a: 'contratos', b: 'projetos', str: 'media', d: -0.04, via: 'desconfianca→gravacao' },
  { a: 'contratos', b: 'aovivo', str: 'media', d: -0.04, via: 'desconfianca→show' },
  { a: 'contratos', b: 'vida', str: 'forte', d: 0.231, via: 'desconfianca→estresse' },
  { a: 'contratos', b: 'premios', str: 'fraca', d: -0.012, via: 'desconfianca→gramofone' },
  { a: 'contratos', b: 'submundo', str: 'media', d: 0.036, via: 'desconfianca→crime_q' },
  { a: 'premios', b: 'dinheiro', str: 'media', d: 0.048, via: 'premios→despesas' },
  { a: 'premios', b: 'reputacao', str: 'fraca', d: 0.007, via: 'premios→rep' },
  { a: 'premios', b: 'imprensa', str: 'fraca', d: 0.005, via: 'premios→fatos' },
  { a: 'premios', b: 'projetos', str: 'forte', d: 0.15, via: 'premios→vendas' },
  { a: 'premios', b: 'aovivo', str: 'forte', d: 0.12, via: 'premios→show' },
  { a: 'premios', b: 'fama', str: 'media', d: 0.072, via: 'premios→fama' },
  { a: 'premios', b: 'contratos', str: 'media', d: 0.08, via: 'premios→oferta' },
  { a: 'submundo', b: 'dinheiro', str: 'forte', d: 0.255, via: 'jaba→despesas' },
  { a: 'submundo', b: 'reputacao', str: 'fraca', d: -0.007, via: 'calor→rep' },
  { a: 'submundo', b: 'imprensa', str: 'forte', d: 0.118, via: 'calor→reacao' },
  { a: 'submundo', b: 'projetos', str: 'forte', d: 0.14, via: 'jaba→vendas' },
  { a: 'submundo', b: 'aovivo', str: 'fraca', d: -0.016, via: 'jaba→cabe_shows' },
  { a: 'submundo', b: 'vida', str: 'forte', d: 0.231, via: 'calor→estresse' },
  { a: 'submundo', b: 'contratos', str: 'forte', d: -0.133, via: 'calor→oferta' },
  { a: 'submundo', b: 'premios', str: 'fraca', d: -0.012, via: 'calor→gramofone' },
];
