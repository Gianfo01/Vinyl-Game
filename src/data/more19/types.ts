// Rodada 19 (Frente 10, WP0) — formato dos pacotes de dados da onda 2 (docs/db19.md "## Formato more19").
// REGRA DE IMPORT: arquivos de pacote só importam `l` de '../world' em tempo de execução; tudo o mais é `import type`
// (estes arrays entram em módulos de dados/simulação durante o carregamento; import de valor cria ciclo e TDZ).

import type { Festival, StudioDef } from '../catalog';
import type { AwardDef, ChartDef } from '../content';
import type { ExtraLabel, RealExec } from '../labels10';
import type { RealMgr } from '../managers14';
import type { RealProd } from '../producers15';
import type { RealArtist } from '../realtypes';
import type { Soc18 } from '../rights18';
import type { FamilyId, L } from '../world';
import type { VDef } from '../../sim/sys/venues17';
import type { Milestone } from '../../sim/sys/world4/milestones';

/** Estúdio real nomeado (STUDIOS19 → catalog.STUDIOS; consumidor: session19/studio12). */
export interface Studio19 extends StudioDef {
  id: string;
  from: number;
  to?: number;
  /** 0..100 */
  prestige: number;
  /** som da casa, em uma frase */
  note?: L;
  /** false = só no modo de nomes reais conferidos (item †) */
  exact?: boolean;
}

/** Equipamento real (marca/modelo) — base do gear19 (ainda sem consumidor; WP-F preenche). */
export interface Gear19 {
  id: string;
  name: string;
  /** nome genérico para o modo sem nomes reais */
  alt: L;
  kind: 'guitar' | 'bass' | 'keys' | 'synth' | 'drum_machine' | 'sampler' | 'mic' | 'console' | 'tape' | 'amp' | 'effect' | 'daw' | 'other';
  maker: string;
  from: number;
  to?: number;
  fam: FamilyId[];
  /** bônus de som em [produção, performance, originalidade] (escala dos produtores: −3..+3) */
  fx?: [number, number, number];
  note?: L;
  exact?: boolean;
}

/** Um pacote da onda 2. Todos os campos são opcionais; o índice só concatena (append-only). */
export interface Pack19 {
  id: string;
  artists?: RealArtist[];
  producers?: RealProd[];
  managers?: RealMgr[];
  labels?: ExtraLabel[];
  execs?: RealExec[];
  venues?: VDef[];
  studios?: Studio19[];
  gear?: Gear19[];
  festivals?: Festival[];
  awards?: AwardDef[];
  charts?: ChartDef[];
  societies?: Soc18[];
  /** só dados (sem appeal/onFire que importem a simulação); use `event` para ligar a um EventDef */
  milestones?: Milestone[];
  /** nomes (normalizados ou não) de artistas cuja estreia vem antes do gênero nascer (precursores documentados) */
  forerunners?: string[];
}
