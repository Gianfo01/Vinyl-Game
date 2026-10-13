// Medição da fase 3 da R28 (docs/f3-r28.md): a história do jogador em primeiro plano. Só mede — não muda a simulação.
// Roda igual na base (antes) e depois das mudanças: o que é novo é lido por import dinâmico e fica 0/— na base.
// Uso: npx tsx scripts/measure28f3.ts run [--seed f3-a] [--start 1962] [--years 10]
//      npx tsx scripts/measure28f3.ts vocab        (eventos com vocabulário moderno liberados em 1889 e 1920)
// run: bot equilibrado (playbot16). Conta: Diário (total, do jogador, perdidos pelo corte, nº 1 alheio em "só
// marcantes"), repetição de eventos (por evento e por evento × ator), ecos (disparados, padrão, textos padrão
// distintos, perdidos registrados), cenas que interromperiam (classe interrupt23 com a preferência padrão) por 12 meses.
import { defaultConfig } from '../src/sim/bot';
import { playMonth } from '../src/sim/playbot16';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { onFact } from '../src/sim/facts17';
import { EVENTS, eventById } from '../src/sim/events';
import { ownConseq18 } from '../src/sim/decide18';
import { registerSimHook } from '../src/sim/ext4';
import { interruptOf23, shouldInterrupt23 } from '../src/sim/interrupt23';
import type { GameState, MemoryEntry } from '../src/sim/types';
import { dec18 } from '../src/sim/sys/decide18';

const args = process.argv.slice(2);
const arg = (k: string, d: string): string => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };

const mineAct = (s: GameState, id?: string): boolean => !!id && (s.acts[id]?.owner === 'player' || !!s.acts[id]?.playerBand);

async function run(): Promise<void> {
  const seed = arg('seed', 'f3-a'), start = Number(arg('start', '1962')), years = Number(arg('years', '10'));
  const s = createGame(defaultConfig(seed, { startYear: start, bandGenre: 'rnr', bandName: 'Banda Teste' }));
  const story = await import('../src/sim/sys/story28').catch(() => null);
  // --- Diário: cada entrada do jogador criada (id) e se sobreviveu ao corte
  const playerIds = new Set<string>();
  let firstPlayer: string | undefined;
  const seenMem = new Set<string>();
  const scanMem = (): void => {
    for (const m of s.memory) {
      if (seenMem.has(m.id)) continue;
      seenMem.add(m.id);
      if (mineAct(s, m.actId) || m.kind.startsWith('decision:')) { playerIds.add(m.id); firstPlayer ??= m.id; }
      if (m.kind.startsWith('event:')) count(m.kind.slice(6), m.actId ?? '');
    }
  };
  // --- repetição de eventos (cartões novos e eventos de uma opção)
  const evN: Record<string, number> = {}, pairN: Record<string, number> = {};
  const seenDec = new Set<string>();
  const anach: string[] = [];
  const actorOf = (c: Record<string, unknown>): string => String(c.person ?? c.act ?? c.rival ?? c.label ?? '');
  const count = (id: string, actor: string): void => { evN[id] = (evN[id] ?? 0) + 1; if (actor) pairN[`${id}|${actor}`] = (pairN[`${id}|${actor}`] ?? 0) + 1; };
  const scanDec = (): void => {
    for (const d of s.decisions) if (!seenDec.has(d.id)) {
      seenDec.add(d.id); count(d.eventId, actorOf(d.ctx));
      const bad = modernIn(eventText28(d.eventId), s.year);
      if (bad.length) anach.push(`${s.year}:${d.eventId}[${bad.join(',')}]`);
    }
  };
  registerSimHook('week', 'm28f3', (g) => { if (g === s) scanDec(); });
  // --- ecos
  let echoes = 0, defEchoes = 0;
  const defTexts = new Set<string>();
  onFact('echo', (g, f) => {
    if (g !== s) return;
    echoes++;
    const k = f.tags.find((x) => x.startsWith('ev:') || x.startsWith('ib:') || x.startsWith('pa:')) ?? '';
    if (k && !ownConseq18(k)) { defEchoes++; defTexts.add(f.text.pt); }
  }, 'm28f3');
  // --- cenas por 12 meses (as que interromperiam com a preferência padrão "marcos")
  const scenesByYear: number[] = [];
  const seenCs = new Set<string>();
  let echoScenes = 0;
  const csScan = (yi: number): void => {
    for (const c of s.cutscenes ?? []) {
      if (seenCs.has(c.id)) continue;
      seenCs.add(c.id);
      const t = (c.data.title as { pt?: string } | undefined)?.pt ?? '';
      if (/^Eco:|^Você escolheu/.test(t)) echoScenes++;
      if (shouldInterrupt23(interruptOf23(c), 'milestones')) scenesByYear[yi] = (scenesByYear[yi] ?? 0) + 1;
    }
  };
  let endedAt: string | undefined;
  let shown = 0; // depois: o que o orçamento de atenção deixaria abrir (simulado por avanço = mês)
  const months = years * 12;
  const t0 = Date.now();
  for (let i = 0; i < months; i++) {
    if (!s.ended) playMonth(s, 'balanced');
    else if (!endedAt) { endedAt = `${s.ended.ending}@${s.year}-${s.month}`; s.flags.sandbox = 1; } // quebrou: segue em sandbox (só o mundo)
    advanceMonth(s);
    if (s.ended && !endedAt) { endedAt = `${s.ended.ending}@${s.year}-${s.month}`; s.flags.sandbox = 1; }
    scanDec();
    scanMem();
    const before = seenCs.size;
    csScan(Math.floor(i / 12));
    if (story?.attnScenes28) {
      const fresh = (s.cutscenes ?? []).filter((c) => !c.seen && shouldInterrupt23(interruptOf23(c), 'milestones'));
      shown += story.attnScenes28(s, fresh).length;
    }
    for (const c of s.cutscenes ?? []) c.seen = true; // a "interface" viu tudo; o próximo mês só traz cenas novas
    void before;
  }
  const memIds = new Set(s.memory.map((m) => m.id));
  const diary = story?.diary28 ? story.diary28(s) : null;
  const ringIds = new Set<string>(diary ? diary.map((m: MemoryEntry) => m.id) : []);
  const lostPlayer = [...playerIds].filter((id) => !memIds.has(id) && !ringIds.has(id)).length;
  const marc = s.memory.filter((m) => m.important || m.kind === 'number1');
  const marcAlien = marc.filter((m) => m.kind === 'number1' && !mineAct(s, m.actId)).length;
  const marcNew = story?.landmarks28 ? story.landmarks28(s) as MemoryEntry[] : null;
  const top = (o: Record<string, number>, n = 5) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);
  const lost = story?.lost28 ? story.lost28(s) : null;
  console.log(JSON.stringify({
    seed, start, years, ano: s.year, min: +((Date.now() - t0) / 60000).toFixed(1), quebrou: endedAt ?? null,
    diario: { memoria: s.memory.length, doJogadorCriadas: playerIds.size, doJogadorPerdidas: lostPlayer, origemPresente: !!firstPlayer && (memIds.has(firstPlayer) || ringIds.has(firstPlayer)), anel: diary?.length ?? null },
    marcantes: { antes: marc.length, no1Alheio: marcAlien, depois: marcNew?.length ?? null, no1AlheioDepois: marcNew ? marcNew.filter((m) => m.kind === 'number1' && !mineAct(s, m.actId)).length : null },
    foraDeEpoca: { n: anach.length, ex: anach.slice(0, 12) },
    repeticao: { topEvento: top(evN), topPar: top(pairN), eventosDistintos: Object.keys(evN).length, total: Object.values(evN).reduce((a, b) => a + b, 0) },
    ecos: { disparados: echoes, padrao: defEchoes, padraoTextosDistintos: defTexts.size, pendentes: dec18(s).q.length, perdidosRegistrados: lost },
    cenas: { interromperiamPorAno: scenesByYear, cenasDeEco: echoScenes, abertasComOrcamento: story?.attnScenes28 ? shown : null },
  }));
}

/** Palavras que denunciam a época (cópia de VOCAB28 em src/sim/sys/story28.ts, para medir também a base). */
const MODERN28: [RegExp, number, string?][] = [
  [/\br[áa]dios?\b|\bradio\b/i, 1920, 'radio'], [/\bTV\b|\btelevis/i, 1950, 'tv_music'], [/\bLPs?\b/, 1948, 'lp'], [/\bcassetes?\b|\bcassettes?\b|\bfitas? k7\b/i, 1964, 'cassette'],
  [/\bFM\b/, 1966, 'fm'], [/\bsintetizador|\bsynths?\b|\bsynthesizer/i, 1970, 'synth'], [/\bMTV\b|\bvideoclipe|\bclipes?\b|\bmusic videos?\b/i, 1981, 'clipnet'], [/\bCDs?\b/, 1983, 'cd'],
  [/\binternet\b|\bon-?line\b|\bwebsites?\b|\be-?mails?\b/i, 1995, 'internet'], [/\bdownloads?\b/i, 2003, 'download'], [/\bP2P\b|\btorrents?\b|\bNapster\b/i, 1999, 'p2p'],
  [/\bstreaming\b|\bplaylists?\b/i, 2008, 'streaming'], [/\bTikTok\b|\bReels\b/i, 2018, 'short_video'], [/\bmemes?\b|\bvira(l|lizou|lizar)\b|\bwent viral\b|\bhashtags?\b/i, 2005],
  [/\bDMs?\b/, 2008], [/\bcelular(es)?\b|\bsmartphones?\b|\bcell ?phones?\b/i, 1990], [/\bjukebox/i, 1927], [/\bvans?\b/i, 1950], [/\bBillboard 200\b/i, 1992], [/\bHot 100\b/i, 1958],
  [/\bdrones?\b/i, 2012], [/\bapps?\b|\baplicativos?\b/i, 2008], [/\bpodcasts?\b/i, 2005], [/\bsamplers?\b|\bsampling\b|\bsamples?\b/i, 1980], [/\bredes sociais\b|\bsocial media\b/i, 2004],
];
const modernIn = (tx: string, y: number): string[] => MODERN28.filter(([rx, y0]) => y < y0 && rx.test(tx)).map(([rx]) => rx.source.slice(0, 16));
export function eventText28(id: string): string {
  const d = eventById[id];
  if (!d) return '';
  return [d.title.pt, d.title.en, d.text.pt, d.text.en, ...d.options.flatMap((o) => [o.label.pt, o.label.en, o.hint?.pt ?? '', o.hint?.en ?? ''])].join(' \n ');
}
async function vocab(): Promise<void> {
  const raw = args.includes('--raw'); // --raw: ignora os portões (= a base)
  const story = await import('../src/sim/sys/story28').catch(() => null);
  for (const y of [1889, 1920]) {
    const hits: string[] = [];
    for (const d of EVENTS) {
      if (!raw && story?.eraOk28 && !story.eraOk28(d, y, null)) continue;
      const tx = eventText28(d.id);
      const bad = modernIn(tx, y);
      if (bad.length) hits.push(`${d.id}[${bad.join(',')}]`);
    }
    console.log(JSON.stringify({ ano: y, eventos: EVENTS.length, comVocabularioModerno: hits.length, exemplos: hits.slice(0, 40) }));
  }
}

const cmd = args[0] ?? 'run';
void (cmd === 'vocab' ? vocab() : run());
