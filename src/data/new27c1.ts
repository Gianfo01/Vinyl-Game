// Rodada 27 (C1): atos novos que vieram da auditoria de família (arquivo 2, "conteúdo verificado"). Entram no FIM de
// REAL_ALL (depois do acervo, no sorteio próprio dele); nomes já presentes são descartados.
import type { RealArtist } from './realtypes';

export const NEW27_C1: RealArtist[] = [
  // 3T: os três filhos de Tito Jackson. Ano de formação INCERTO (exact:false); estreia em disco 1995 ("Brotherhood").
  { n: '3T', g: 'pop_rnb', c: 'los_angeles', d: 1995, t: 3, z: 2, cn: 'USA', exact: false,
    m: [['Taj Jackson', 'vocal', 1973], ['Taryll Jackson', 'vocal', 1975], ['TJ Jackson', 'vocal', 1978]],
    al: [['Brotherhood', 1995]] },
];
