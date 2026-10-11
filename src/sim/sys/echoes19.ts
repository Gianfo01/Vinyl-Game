// Rodada 19 (11.2, echoes19) — COBERTURA DE ECOS. Antes: 82 de 1315 opções tinham consequência atrasada.
//  1. Eco PADRÃO pelo tom da opção (arriscada, generosa, enganosa, cautelosa, agressiva): o tom sai do id/rótulo da
//     opção; o tamanho do efeito escala com a fama do ato e a reputação do selo (e o dinheiro com a época, via money()).
//     Só entra quando a opção não tem eco escrito à mão (decide18.DEF_CONSEQ19).
//  2. Ecos ESCRITOS À MÃO para os eventos mais sorteados (TOP19, medido com o playbot) e para as famílias que não
//     tinham nenhum: r11, w4, org12 e era8.
//  3. Fatos 'risk_paid' / 'risk_lost' (aposta que pagou / que deu errado) com ouvinte: três apostas perdidas em um ano
//     viram dica do Conselheiro e moral baixa no elenco ("o chefe joga com o nosso dinheiro").
// Piso testado em tests/r19-echoes.test.ts: ≥35% das opções dos 120 eventos mais sorteados com eco escrito à mão.

import { clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { DEF_CONSEQ19, ownConseq18, registerConseq18, type Conseq18, type EchoSpec18, type Fx18, type Tone18 } from '../decide18';
import { EVENTS, eventById, type EventDef } from '../events';
import { onEventsReady } from '../ext4';
import { registerExplain } from '../explain18';
import { emitFact, onFact, recentFacts } from '../facts17';
import { grantHold, type HoldKind } from '../holds17';
import { registerAdvisorTip } from '../inbox18';
import { scandal } from '../scandal17';
import type { GameState } from '../types';
import { fmtL, playerActs } from '../util';

/** Os 120 eventos mais sorteados (playbot balanced, 12 partidas × 4 anos: 1889, 1900, 1925, 1950, 1960, 1968, 1975, 1985,
 *  1990, 2000, 2005, 2015; selo e artista). Ordem = frequência. Remedir quando o diretor mudar. */
export const TOP19 = ['controversial_remark', 'sync_offer', 'stock_out', 'tv_invite', 'arc_rivalry_media', 'scene_explosion', 'credit_dispute', 'voice_strain', 'fan15_vault', 'leak',
  'festival_invite', 'boycott', 'arc_scene', 'people_journalist', 'wedding', 'sit17:crime17_pizzo', 'd18_demo', 'd18_van', 'legendary_producer', 'sit17:loan_offer',
  'creative_block', 'd18_truce', 'r8_buyout', 'residency_offer', 'arc12_loyal', 'child_born', 'genre_shift', 'grief', 'people_quit_stage', 'r8_cult_offer',
  'censor_lyrics', 'distress_sale', 'parent_manager', 'd18_charity', 'd18_flash_gig', 'fan15_tickets', 'fan_letter', 'gear_endorsement', 'p13_sex', 'poach_attempt',
  'sit17:hometown_show', 'sit17:secret_sale', 'fan15_war', 'misquote', 'r11_intern_demo', 'reunion', 'sit17:burnout', 'd18_mentor', 'movement_born', 'tv_song_contest',
  'arc_pressure', 'benefit_concert', 'brand_sponsorship', 'critic_champion', 'd18_investor_dinner', 'extra_date', 'family_debt', 'fan_theory', 'insider_offer', 'jingle_commission',
  'r11_merch_bootleg', 'r11_superstar_feat', 'sheet_music_boom', 'sit17:comeout17', 'sit17:creative_control', 'sit17:fire_member', 'sit17:radio_ban', 'stage_fall', 'artist_exile', 'band_name_dispute',
  'burnout', 'd18_promise_solo', 'fan_club_founded', 'gear_stolen', 'id_noncompete', 'ind_divestiture', 'jukebox_route', 'leader_fires_member', 'live_mega_benefit', 'meme_mockery',
  'morality_clause', 'obsessive_fan', 'p13_grudge', 'promoter_vanishes', 'r11_band_romance_split', 'r11_stage_politics', 'r8_formula', 'reverse_plagiarism', 'rival_copycat', 'sampling_claim',
  'sit17:dm18_envy_press', 'spouse_touring', 'trailer_sync', 'arc_feud', 'censorship', 'coded_anthem', 'cowriter_claim', 'crowd_surge', 'd18_press_lie', 'diplomacy_tour',
  'documentary_offer', 'embargo_customs', 'era8_download', 'era8_piracy', 'era8_streaming', 'era8_video', 'fan_mail_radio', 'headliner_dropout', 'home_taping', 'interview_walkout',
  'iron_curtain_bootleg', 'l16_depart', 'leader_solo', 'live_money_split', 'm14_demand', 'magazine_cover', 'memory_return', 'opener_steals_show', 'p13_race', 'paparazzi'];

// ---------------------------------------------------------------- 1. tom da opção

export type OptTone19 = 'risky' | 'generous' | 'deceitful' | 'cautious' | 'aggressive';
const RX: [OptTone19, RegExp, RegExp][] = [
  ['deceitful', /^(lie|deny|cover|bury|ghost|hide|lav|closet|stall|fake|noco|smear|spin)/, /\b(negar|abafar|esconder|enterrar|fachada|sem crédito|mentir|disfar)/i],
  ['aggressive', /^(fight|sue|court|attack|provoke|retaliate|hit|double_down|defy|mock|fire|demand|takedown|insist|push|fuel|legend|haggle|cashin|crush|threat)/, /\b(processar|brigar|atacar|provocar|retaliar|contra-atacar|desafiar|zoar|exigir|insistir|demitir)/i],
  ['generous', /^(support|gift|give|donate|bonus|fair|share|equal|free|charity|reply|fund|bless|protect|rest|pause|grant|lend|therapy|treatment|apologi|own|family_tour|shorten|severance|safety|stop|talk|mediate|collab|classy|peace|calm|admire|tip_off|back|join|play|correction|refund_fans|raise)/, /\b(apoiar|doar|presente|bônus|dividir|folga|terapia|desculpas|mediar|mediação|de graça|ajudar)/i],
  ['risky', /^(invest|sign|buy|gamble|risk|embrace|go|enter|chase|open|adopt|drop|surgery|exclusive|full|launch|release|tour|rush|repress|accept|hire|license|publicize|scout|evolve|out|laugh|add|allow|overhaul|acquire|sell|match|write|dress|showcase|album|cheaper|stylist|replace|lp|single45|both|tracks|bundle|digitize|image|frequency|community|retention|jukebox|youth|payola|dance|backlash|remix|fresh|catalog|reach|chase|tailored|presence|provenance|hybrid|campaign|yes)/, /\b(apostar|assinar|investir|comprar|arriscar|aceitar|lançar|abraçar)/i],
  ['cautious', /^(pass|decline|wait|ignore|watch|observe|hold|keep|skip|no$|let|later|quiet|private|basic|nothing|rent|course|stay|comply|settle|polite|ok$|note|silence|edit|withdraw|advisor|refuse|abstain|used|after|shelve|curated|control|partial|niche|lowprofile|absorb|borrow|chair|cap$|frame|original|special|rename|gradual|vault|selective|mixed|protect)/, /\b(recusar|esperar|observar|ignorar|manter|passar|adiar|guardar)/i],
];
/** Tom de uma opção (null = neutro demais para um eco padrão). */
export function optTone19(eventId: string, opt: string): OptTone19 | null {
  const lb = eventById[eventId]?.options.find((o) => o.id === opt)?.label.pt ?? '';
  for (const [t, id] of RX) if (id.test(opt)) return t;
  for (const [t, , tx] of RX) if (tx.test(lb)) return t;
  return null;
}

// ---------------------------------------------------------------- 2. eco padrão (parametrizado)

const WHERE: Record<string, L> = {
  people: l('no elenco', 'in the roster'), band: l('na banda', 'in the band'), health: l('no elenco', 'in the roster'), scandal: l('na imprensa', 'in the press'),
  market: l('no mercado', 'in the market'), business: l('no mercado', 'in the market'), contract: l('nos contratos', 'in the contracts'), stage: l('na estrada', 'on the road'),
  culture: l('na cena', 'in the scene'), world: l('no mundo lá fora', 'out in the world'), career: l('na carreira', 'in the career'), tech: l('no estúdio', 'in the studio'),
  manufacturing: l('na fábrica', 'at the plant'), scouting: l('no garimpo', 'in scouting'), neural: l('na rede', 'on the network'),
};
const nm = (f: Fx18): L => (f.act ? l(f.act.name, f.act.name) : l('o selo', 'the label'));
const T = (f: Fx18, pt: string, en: string, w?: L): L => fmtL(l(pt, en), { a: nm(f), p: f.person?.name ?? nm(f), w: w ?? l('', '') });
/** escala: ato famoso → mais em jogo (dinheiro em US$ reais; money() converte para a época) */
const stake = (f: Fx18, base: number): number => Math.round(base * (0.7 + (f.act?.fame ?? 25) / 80));
const R = (s: GameState) => s.player.reputation;
const tag = (f: Fx18, kind: 'risk_paid' | 'risk_lost', text: L) =>
  emitFact(f.s, { kind, actors: [f.act?.id ?? 'player'], severity: kind === 'risk_lost' ? 25 : 15, visibility: 'public', tags: ['echo19', kind], src: 'echoes19', text });

const HINT: Record<OptTone19, L> = {
  risky: l('Apostas voltam — pagando ou cobrando.', 'Gambles come back — paying or collecting.'),
  generous: l('Gente lembra de quem ajudou.', 'People remember who helped.'),
  deceitful: l('A versão oficial pode não colar.', 'The official story may not hold.'),
  cautious: l('A cautela poupa, mas também deixa passar.', 'Caution saves, but also lets things slip.'),
  aggressive: l('Briga comprada tem troco.', 'A picked fight gets an answer.'),
};
/** volume: o eco padrão volta em ~60% das escolhas (os escritos à mão têm prioridade e voltam mais) */
const VOL = 0.6;
/** com p = VOL·w, a perda sai com chance VOL·(1−w) no total (o resto fica em silêncio): a aposta mantém a razão ganho/perda */
const lose = (f: Fx18, w: number): boolean => { const q = clamp(w, 0.3, 0.7); return f.r.chance((VOL * (1 - q)) / Math.max(0.01, 1 - VOL * q)); };
function defSpec(ev: EventDef, t: OptTone19): EchoSpec18 {
  const w = WHERE[ev.cat] ?? l('', '');
  const big = ev.tone === 'bad' ? 1.25 : 1;
  switch (t) {
    case 'risky': return { in: [3, 9], p: (s) => VOL * clamp(0.48 + (R(s).commercial - 50) / 250, 0.3, 0.68), tone: 'mixed', hint: HINT.risky,
      fx: (f) => { f.cash(stake(f, 650 * big), 'Aposta que pagou', 'other_income').momentum(5).fame(1); const x = T(f, 'A aposta pagou {w}: {a} colheu o que você arriscou.', 'The gamble paid off {w}: {a} reaped what you risked.', w); tag(f, 'risk_paid', x); return x; },
      miss: (f) => { if (!lose(f, 0.48 + (R(f.s).commercial - 50) / 250)) return; f.cash(-stake(f, 500 * big), 'Aposta que deu errado', 'misc').momentum(-4); const x = T(f, 'A aposta deu errado {w}: a conta chegou para {a}.', 'The gamble went wrong {w}: the bill came for {a}.', w); tag(f, 'risk_lost', x); return x; } };
    case 'generous': return { in: [3, 10], p: 0.4 * VOL, tone: 'good', hint: HINT.generous,
      fx: (f) => {
        if (f.act) { f.trust(4).mood('morale', 5); const m = f.act.members[0]; if (m && f.act.owner === 'player') grantHold(f.s, { holder: m, target: 'player', kind: 'favor', strength: 20, text: l('Lembra do gesto do selo', 'Remembers the label\'s gesture'), months: 18, src: 'echoes19', quiet: true }); }
        else f.rep('artists', 2);
        return T(f, 'O gesto não foi esquecido {w}: {a} fala bem de você por aí.', 'The gesture was not forgotten {w}: {a} speaks well of you.', w);
      } };
    case 'deceitful': return { in: [4, 12], p: (s) => (R(s).institutional < 40 ? 0.4 : 0.3) * VOL, tone: 'bad', hint: HINT.deceitful,
      fx: (f) => {
        f.rep('institutional', -2).trust(-5);
        const x = T(f, 'A versão oficial não colou {w}: alguém contou a outra.', 'The official story did not hold {w}: someone told the other one.', w);
        if (f.act) scandal(f.s, f.act.id, 'conduct', 15, x, { text: x });
        return x;
      } };
    case 'cautious': return { in: [4, 10], p: 0.5 * VOL, tone: 'mixed', hint: HINT.cautious,
      fx: (f) => { f.rep('commercial', 1); return T(f, 'A cautela poupou dor de cabeça {w}.', 'Caution spared you a headache {w}.', w); },
      miss: (f) => (f.r.chance(0.5) ? (f.momentum(-3), T(f, 'Um rival fez o que você não quis {w} — e saiu na frente.', 'A rival did what you would not {w} — and got ahead.', w)) : undefined) };
    case 'aggressive': return { in: [2, 8], p: (s) => VOL * clamp(0.38 + R(s).institutional / 250, 0.3, 0.7), tone: 'mixed', hint: HINT.aggressive,
      fx: (f) => { f.rep('commercial', 2).fame(1); return T(f, 'A briga {w} virou manchete a seu favor.', 'The fight {w} made headlines in your favour.', w); },
      miss: (f) => { if (!lose(f, 0.38 + R(f.s).institutional / 250)) return; f.cash(-stake(f, 450 * big), 'Briga que custou caro', 'legal').rep('artists', -2); return T(f, 'A briga {w} custou caro: advogados e inimizades.', 'The fight {w} cost dearly: lawyers and enemies.', w); } };
  }
}
const DEF: Record<string, Conseq18 | null> = {}; // derivado só dos EventDefs (estático, não é estado de partida)
export function defaultConseq19(key: string): Conseq18 | undefined {
  if (!key.startsWith('ev:')) return undefined;
  if (key in DEF) return DEF[key] ?? undefined;
  const i = key.lastIndexOf(':');
  const id = key.slice(3, i), opt = key.slice(i + 1);
  const ev = eventById[id];
  const t = ev && ev.options.some((o) => o.id === opt) ? optTone19(id, opt) : null;
  DEF[key] = t && ev ? { later: [defSpec(ev, t)] } : null;
  return DEF[key] ?? undefined;
}
DEF_CONSEQ19.f = defaultConseq19;

/** Cobertura (para o teste e a ajuda): opções com eco escrito à mão / com qualquer eco. */
export function coverage19(ids: string[] = EVENTS.map((e) => e.id)): { opts: number; own: number; any: number } {
  let opts = 0, own = 0, any = 0;
  for (const id of ids) for (const o of eventById[id]?.options ?? []) {
    opts++;
    const k = `ev:${id}:${o.id}`;
    if (ownConseq18(k)?.later?.length) own++;
    if (ownConseq18(k)?.later?.length || defaultConseq19(k)?.later?.length) any++;
  }
  return { opts, own, any };
}

// ---------------------------------------------------------------- 3. ecos escritos à mão

type Fx = (f: Fx18) => L;
interface H19 { w: [number, number]; p: number | ((s: GameState) => number); t: Tone18; h: [string, string]; fx: Fx; miss?: (f: Fx18) => L | void }
const ECHO = (key: string, ...later: H19[]): void => {
  const k = `ev:${key}`;
  if (ownConseq18(k)?.later?.length) return; // nunca sobrescreve um eco da R18
  registerConseq18(k, { ...(ownConseq18(k) ?? {}), later: later.map((x) => ({ in: x.w, p: x.p, tone: x.t, hint: l(x.h[0], x.h[1]), fx: x.fx, ...(x.miss ? { miss: x.miss } : {}) })) });
};
const scan = (f: Fx18, kind: Parameters<typeof scandal>[2], sev: number, text: L): void => { if (f.act) scandal(f.s, f.act.id, kind, sev, text, { person: f.person?.id, text }); };
const fav = (f: Fx18, kind: HoldKind, text: L, strength = 30): void => {
  const m = f.person?.id ?? f.act?.members[0];
  if (m) grantHold(f.s, { holder: m, target: 'player', kind, strength, text, months: 24, src: 'echoes19' });
};

// --- o topo do sorteio
ECHO('controversial_remark:support', { w: [3, 8], p: 0.6, t: 'mixed', h: ['Ficar do lado do artista tem preço e prêmio.', 'Siding with the artist has a price and a prize.'],
  fx: (f) => { f.trust(6).rep('artists', 2); fav(f, 'favor', l('O selo o defendeu na polêmica', 'The label defended them in the row')); return T(f, '{a} não esquece: na polêmica, o selo ficou do lado certo.', '{a} won\'t forget: in the row, the label stood on the right side.'); },
  miss: (f) => { f.rep('institutional', -2); return T(f, 'Patrocinadores lembraram que o selo apoiou a declaração de {a}.', 'Sponsors remembered the label backed {a}\'s remark.'); } });
ECHO('sync_offer:refuse', { w: [4, 10], p: 0.4, t: 'good', h: ['O artista nota quando você protege a canção.', 'The artist notices when you protect the song.'],
  fx: (f) => { f.trust(4).rep('artistic', 2); return T(f, '{a} agradece: a canção não virou jingle de margarina.', '{a} is grateful: the song did not become a margarine jingle.'); } });
ECHO('stock_out:repress', { w: [2, 5], p: 0.55, t: 'mixed', h: ['Reprensar é apostar que a febre continua.', 'Repressing bets the craze will last.'],
  fx: (f) => { f.cash(stake(f, 1800), 'Reprensagem esgotada', 'sales').momentum(3); return T(f, 'A reprensagem de {a} esgotou de novo.', '{a}\'s repress sold out again.'); },
  miss: (f) => { f.cash(-stake(f, 1100), 'Encalhe da reprensagem', 'misc'); return T(f, 'Sobraram caixas de discos de {a} no depósito: a febre passou.', 'Boxes of {a} records sat in the warehouse: the craze passed.'); } });
ECHO('stock_out:no', { w: [2, 6], p: 0.45, t: 'bad', h: ['Prateleira vazia ensina o fã a comprar outra coisa.', 'An empty shelf teaches fans to buy something else.'],
  fx: (f) => { f.momentum(-4).rep('commercial', -1); return T(f, 'Sem disco na loja, os fãs de {a} compraram o do rival.', 'With no record in stores, {a}\'s fans bought the rival\'s.'); } });
ECHO('arc_rivalry_media:provoke', { w: [2, 6], p: 0.5, t: 'mixed', h: ['Farpa vende jornal — e às vezes queima.', 'Jabs sell papers — and sometimes burn.'],
  fx: (f) => { f.fame(3).momentum(6); return T(f, 'A troca de farpas de {a} encheu as rádios e os shows.', '{a}\'s war of words filled radio and venues.'); },
  miss: (f) => { const x = T(f, 'A provocação de {a} passou do ponto e virou escândalo.', '{a}\'s jab went too far and became a scandal.'); scan(f, 'offense', 18, x); return x; } });
ECHO('arc_rivalry_media:classy', { w: [3, 8], p: 0.45, t: 'good', h: ['Elegância rende perfil, não manchete.', 'Class earns profiles, not headlines.'],
  fx: (f) => { f.rep('artistic', 2).fame(1); return T(f, 'A resposta elegante de {a} rendeu um perfil elogioso.', '{a}\'s classy reply earned a glowing profile.'); } });
ECHO('arc_rivalry_media:collab', { w: [3, 9], p: 0.45, t: 'mixed', h: ['Feat com rival: sucesso ou egos no estúdio.', 'A feat with a rival: a hit or egos in the studio.'],
  fx: (f) => { f.cash(stake(f, 2200), 'Feat com o rival', 'sales').fame(2); return T(f, 'O feat surpresa de {a} com o rival tocou em todo lugar.', '{a}\'s surprise feat with the rival played everywhere.'); },
  miss: (f) => { f.mood('stress', 6); return T(f, 'O feat de {a} ficou na gaveta: os egos não couberam no estúdio.', '{a}\'s feat stayed shelved: the egos did not fit in the studio.'); } });
ECHO('scene_explosion:watch', { w: [4, 10], p: 0.35, t: 'bad', h: ['Cena que explode sem você vira de outro.', 'A scene that explodes without you becomes someone else\'s.'],
  fx: (f) => { f.rep('artistic', -1); return l('A cena explodiu sem você: na imprensa, o selo é "aquele que chegou tarde".', 'The scene exploded without you: the press calls the label "the one that came late".'); } });
ECHO('credit_dispute:mediate', { w: [3, 8], p: 0.55, t: 'mixed', h: ['Mediação é lenta e às vezes fecha a ferida.', 'Mediation is slow and sometimes heals the wound.'],
  fx: (f) => { f.trust(4).mood('resentment', -8).cash(-500, 'Honorários da mediação', 'legal'); return T(f, 'A mediação em {a} fechou um acordo que todos assinaram.', 'Mediation in {a} closed a deal everyone signed.'); },
  miss: (f) => { f.mood('resentment', 6); return T(f, 'A mediação em {a} empacou; o ressentimento ficou.', 'Mediation in {a} stalled; the resentment stayed.'); } });
ECHO('voice_strain:rest', { w: [2, 6], p: 0.65, t: 'mixed', h: ['Repouso costuma funcionar — costuma.', 'Rest usually works — usually.'],
  fx: (f) => { f.mood('stress', -8).mood('morale', 4); return T(f, 'A voz de {p} voltou inteira depois do repouso.', '{p}\'s voice came back whole after the rest.'); },
  miss: (f) => { f.fame(-1); return T(f, 'A voz de {p} ainda falha nos agudos.', '{p}\'s voice still cracks on the high notes.'); } });
ECHO('fan15_vault:give', { w: [2, 6], p: 0.55, t: 'good', h: ['Presente aos fãs vira lenda.', 'A gift to fans becomes legend.'],
  fx: (f) => { f.fans(3).trust(2); return T(f, 'A faixa do cofre de {a} virou lenda entre os fãs.', '{a}\'s vault track became fan legend.'); } });
ECHO('fan15_vault:later', { w: [6, 12], p: 0.5, t: 'bad', h: ['Promessa a fã tem memória longa.', 'Promises to fans have a long memory.'],
  fx: (f) => { f.fans(-2).trust(-3); return T(f, 'Os fãs de {a} cobram a faixa prometida do cofre.', '{a}\'s fans demand the promised vault track.'); } });
ECHO('fan15_vault:no', { w: [3, 8], p: 0.45, t: 'mixed', h: ['Fãs reclamam; a crítica pode aplaudir.', 'Fans grumble; critics may applaud.'],
  fx: (f) => { f.rep('artistic', 2).fans(-1); return T(f, 'Os fãs reclamaram, mas a crítica elogiou o respeito à obra de {a}.', 'Fans grumbled, but critics praised the respect for {a}\'s work.'); } });
ECHO('arc_scene:invest', { w: [4, 10], p: 0.5, t: 'mixed', h: ['Cena bancada pode virar selo de origem.', 'A funded scene can become a badge of origin.'],
  fx: (f) => { f.rep('artistic', 3).cash(1800, 'Coletânea da cena', 'sales'); return l('A coletânea da cena que você bancou virou referência.', 'The scene compilation you funded became a reference.'); },
  miss: (f) => { f.cash(-900, 'Noites vazias da cena', 'misc'); return l('As noites da cena esvaziaram: o dinheiro foi embora junto.', 'The scene nights emptied out: the money went with them.'); } });
ECHO('arc_scene:watch', { w: [4, 10], p: 0.3, t: 'bad', h: ['Quem só observa não é lembrado.', 'Those who only watch are not remembered.'],
  fx: (f) => { f.momentum(-3); return l('A cena achou outro selo para chamar de casa.', 'The scene found another label to call home.'); } });
ECHO('people_journalist:bury', { w: [4, 12], p: 0.45, t: 'bad', h: ['Dinheiro para calar jornalista vira a matéria.', 'Money to silence a journalist becomes the story.'],
  fx: (f) => { f.rep('institutional', -3); const x = T(f, 'O jornalista contou que tentaram comprar o silêncio sobre {a}.', 'The journalist revealed someone tried to buy silence about {a}.'); scan(f, 'money', 20, x); return x; } });
ECHO('people_journalist:interview', { w: [2, 6], p: 0.55, t: 'good', h: ['Contar antes muda a narrativa.', 'Telling first changes the narrative.'],
  fx: (f) => { f.rep('commercial', 2).trust(3); return T(f, 'A entrevista exclusiva virou a história a favor de {a}.', 'The exclusive interview turned the story in {a}\'s favour.'); } });
ECHO('people_journalist:ignore', { w: [2, 8], p: 0.45, t: 'bad', h: ['Matéria sem resposta vira verdade.', 'An unanswered story becomes the truth.'],
  fx: (f) => { f.fame(-2); return T(f, 'A matéria sobre {a} saiu sem resposta e pegou.', 'The story about {a} ran unanswered and stuck.'); } });
ECHO('wedding:private', { w: [4, 10], p: 0.35, t: 'good', h: ['Discrição fortalece laços.', 'Discretion strengthens bonds.'],
  fx: (f) => { f.trust(4).mood('morale', 6); return T(f, '{p} agradece a discrição do selo: o casamento fez bem à banda.', '{p} thanks the label for its discretion: the marriage did the band good.'); } });
ECHO('sit17:crime17_pizzo:report', { w: [2, 8], p: 0.55, t: 'mixed', h: ['Denunciar pode prender — ou provocar.', 'Reporting may jail them — or provoke them.'],
  fx: (f) => { f.rep('institutional', 4); return l('Os achacadores foram presos; outros comerciantes seguiram seu exemplo.', 'The racketeers were arrested; other businesses followed your lead.'); },
  miss: (f) => { f.cash(-1600, 'Represália dos achacadores', 'misc'); return l('Represália: a sala de ensaio amanheceu depredada.', 'Retaliation: the rehearsal room was trashed overnight.'); } });
ECHO('sit17:crime17_pizzo:refuse', { w: [2, 6], p: 0.45, t: 'bad', h: ['Quem recusa sem proteção paga de outro jeito.', 'Refusing without protection costs another way.'],
  fx: (f) => { f.cash(-1200, 'Equipamento quebrado', 'misc'); return l('A recusa custou caro: equipamento quebrado no carregamento.', 'The refusal cost dearly: gear smashed at load-in.'); } });
ECHO('sit17:crime17_pizzo:pay', { w: [4, 10], p: 0.55, t: 'bad', h: ['Quem paga uma vez vira cliente.', 'Pay once and you become a client.'],
  fx: (f) => { f.cash(-1000, 'Taxa de "proteção"', 'misc').rep('institutional', -1); return l('Pagou uma vez; agora cobram todo trimestre.', 'You paid once; now they collect every quarter.'); } });
ECHO('d18_van:new', { w: [6, 14], p: 0.5, t: 'good', h: ['Van nova não deixa na estrada.', 'A new van won\'t strand you.'],
  fx: (f) => { f.cash(900, 'Shows salvos pela van', 'live').mood('fatigue', -5); return T(f, 'A van nova não quebrou: {a} fez todos os shows da perna.', 'The new van held up: {a} played every date of the leg.'); } });
ECHO('d18_van:rent', { w: [3, 8], p: 0.4, t: 'bad', h: ['Locadora cobra cada arranhão.', 'Rental companies bill every scratch.'],
  fx: (f) => { f.cash(-500, 'Avarias da van alugada', 'misc'); return l('A locadora cobrou cada arranhão da van.', 'The rental company billed every scratch on the van.'); } });
ECHO('legendary_producer:hire', { w: [4, 10], p: 0.55, t: 'mixed', h: ['Lenda no estúdio: som novo ou briga.', 'A legend in the studio: a new sound or a fight.'],
  fx: (f) => { f.fame(2).rep('artistic', 2); return T(f, 'O produtor lendário deu a {a} um som que a crítica notou.', 'The legendary producer gave {a} a sound critics noticed.'); },
  miss: (f) => { f.trust(-4).mood('stress', 6); return T(f, 'O produtor lendário e {a} brigaram no estúdio.', 'The legendary producer and {a} fought in the studio.'); } });
ECHO('legendary_producer:pass', { w: [4, 10], p: 0.35, t: 'good', h: ['O artista gosta de ser ouvido.', 'Artists like being heard.'],
  fx: (f) => { f.trust(3); return T(f, '{a} gostou de manter a própria mixagem.', '{a} liked keeping their own mix.'); } });
ECHO('sit17:loan_offer:accept', { w: [6, 12], p: 0.45, t: 'bad', h: ['Juros mordem devagar.', 'Interest bites slowly.'],
  fx: (f) => { f.cash(-1600, 'Juros do empréstimo', 'interest'); return l('Os juros do empréstimo morderam o caixa.', 'The loan interest bit into cash.'); } });
ECHO('sit17:loan_offer:decline', { w: [4, 10], p: 0.3, t: 'good', h: ['Sem dívida, o banco te olha diferente.', 'Without debt, the bank looks at you differently.'],
  fx: (f) => { f.rep('commercial', 1); return l('Sem dívida nova, o banco subiu seu conceito.', 'With no new debt, the bank raised your rating.'); } });
ECHO('creative_block:residency', { w: [3, 8], p: 0.6, t: 'mixed', h: ['O campo cura — ou só descansa.', 'The countryside heals — or just rests.'],
  fx: (f) => { f.mood('inspiration', 12); return T(f, '{a} voltou do campo com um disco quase pronto.', '{a} came back from the countryside with a record nearly done.'); },
  miss: (f) => { f.mood('morale', -3); return T(f, 'A residência de {a} foi bonita, mas nada saiu.', '{a}\'s residency was lovely, but nothing came out.'); } });
ECHO('r8_buyout:sell', { w: [4, 10], p: 0.45, t: 'mixed', h: ['O vendido pode estourar no comprador.', 'The one you sold may explode for the buyer.'],
  fx: (f) => { f.rep('artists', -2); return l('O ato que você vendeu estourou no rival — e citou você na entrevista.', 'The act you sold blew up at the rival — and named you in the interview.'); } });
ECHO('r8_buyout:keep', { w: [4, 10], p: 0.55, t: 'good', h: ['Royalty a mais compra lealdade.', 'Extra royalty buys loyalty.'],
  fx: (f) => { f.trust(6); fav(f, 'loyalty', l('Recusou vender o contrato', 'Refused to sell the contract')); return T(f, '{a} não esqueceu os pontos de royalty a mais.', '{a} didn\'t forget the extra royalty points.'); } });
ECHO('r8_buyout:refuse', { w: [3, 8], p: 0.4, t: 'bad', h: ['Recusar sem conversa vaza.', 'Refusing without talking leaks.'],
  fx: (f) => { f.trust(-4); return T(f, '{a} soube da proposta recusada sem conversa.', '{a} heard about the offer refused without a word.'); } });
ECHO('residency_offer:decline', { w: [4, 10], p: 0.3, t: 'mixed', h: ['Data recusada vai para outro.', 'A declined date goes to someone else.'],
  fx: (f) => { f.fame(-1); return l('A residência recusada foi para um rival e lotou.', 'The declined residency went to a rival and sold out.'); } });
ECHO('arc12_loyal:fair', { w: [4, 10], p: 0.55, t: 'good', h: ['Renovar com justiça vira lealdade.', 'A fair renewal becomes loyalty.'],
  fx: (f) => { f.trust(6).mood('morale', 5); return T(f, '{a} renovou e fala do selo como família.', '{a} renewed and calls the label family.'); } });
ECHO('arc12_loyal:renew', { w: [4, 10], p: 0.4, t: 'bad', h: ['Quem cresceu quer ser visto.', 'Those who grew want to be seen.'],
  fx: (f) => { f.mood('resentment', 6); return T(f, '{a} sente que vale mais do que os termos antigos.', '{a} feels worth more than the old terms.'); } });
ECHO('arc12_loyal:let', { w: [3, 8], p: 0.5, t: 'mixed', h: ['Liberar com elegância deixa portas abertas.', 'Letting go gracefully leaves doors open.'],
  fx: (f) => { f.rep('artists', 2); return T(f, '{a} saiu, mas fala bem do selo em toda entrevista.', '{a} left, but speaks well of the label in every interview.'); } });
ECHO('people_quit_stage:bonus', { w: [3, 8], p: 0.5, t: 'mixed', h: ['Bônus segura — ou só adia.', 'A bonus holds — or just delays.'],
  fx: (f) => { f.mood('morale', 6); return T(f, 'O bônus segurou {p}: os shows voltaram a ter alma.', 'The bonus kept {p}: the shows got their soul back.'); },
  miss: (f) => { f.cash(-600, 'Bônus perdido', 'misc'); return T(f, 'O bônus não segurou {p} por muito tempo.', 'The bonus didn\'t keep {p} for long.'); } });
ECHO('people_quit_stage:let_go', { w: [3, 8], p: 0.4, t: 'bad', h: ['Saída no palco deixa buraco.', 'An exit on stage leaves a hole.'],
  fx: (f) => { f.momentum(-3); return T(f, 'Sem {p}, os shows de {a} perderam a química.', 'Without {p}, {a}\'s shows lost their chemistry.'); } });
ECHO('people_quit_stage:mediate', { w: [3, 8], p: 0.5, t: 'good', h: ['Uma conversa às vezes resolve.', 'A talk sometimes settles it.'],
  fx: (f) => { f.trust(4).mood('stress', -5); return T(f, 'A conversa mediada destravou {a}.', 'The mediated talk unlocked {a}.'); } });
ECHO('r8_cult_offer:renegotiate', { w: [4, 10], p: 0.5, t: 'good', h: ['Renegociar mantém a banda.', 'Renegotiating keeps the band.'],
  fx: (f) => { f.trust(5); return T(f, '{a} aceitou os novos termos e voltou ao estúdio.', '{a} took the new terms and went back into the studio.'); } });
ECHO('r8_cult_offer:other', { w: [4, 10], p: 0.45, t: 'bad', h: ['Escolher um integrante fere os outros.', 'Picking one member hurts the rest.'],
  fx: (f) => { f.mood('resentment', 8); fav(f, 'grievance', l('O selo escolheu outro integrante', 'The label picked another member')); return T(f, 'Os outros integrantes de {a} não perdoaram a escolha.', 'The other members of {a} did not forgive the choice.'); } });
ECHO('r8_cult_offer:split', { w: [6, 12], p: 0.5, t: 'mixed', h: ['Fim de banda cult vira mito.', 'A cult band\'s end becomes myth.'],
  fx: (f) => { f.rep('artistic', 2).cash(1200, 'Catálogo da banda separada', 'sales'); return l('A separação virou mito: o catálogo voltou a vender.', 'The split became myth: the catalog sells again.'); } });
ECHO('censor_lyrics:edit', { w: [3, 8], p: 0.4, t: 'bad', h: ['Cortar a letra corta a confiança.', 'Cutting the lyric cuts trust.'],
  fx: (f) => { f.rep('artistic', -2).trust(-3); return T(f, '{a} ainda fala dos cortes impostos pelo selo.', '{a} still talks about the cuts the label imposed.'); } });
ECHO('censor_lyrics:metaphor', { w: [3, 8], p: 0.55, t: 'good', h: ['Metáfora fura censura.', 'Metaphor slips past censors.'],
  fx: (f) => { f.rep('artistic', 3).fame(1); return T(f, 'A versão com metáforas de {a} virou hino cifrado.', '{a}\'s metaphor version became a coded anthem.'); } });
ECHO('censor_lyrics:withdraw', { w: [4, 10], p: 0.45, t: 'mixed', h: ['Tirar do mercado vira lenda — e prejuízo.', 'Pulling it becomes legend — and loss.'],
  fx: (f) => { f.fans(2).cash(-800, 'Mercado perdido', 'misc'); return T(f, 'O disco proibido de {a} circula em cópias piratas e vira lenda.', '{a}\'s banned record circulates on bootlegs and becomes legend.'); } });
ECHO('distress_sale:sell_act', { w: [4, 10], p: 0.4, t: 'bad', h: ['Artista vendido conta como foi.', 'A sold artist tells how it went.'],
  fx: (f) => { f.rep('artists', -3); return l('O artista transferido contou como foi vendido "como um móvel".', 'The transferred act told how they were sold "like furniture".'); } });
ECHO('distress_sale:hold', { w: [4, 12], p: 0.45, t: 'mixed', h: ['Resistir é apostar que o mercado volta.', 'Holding on bets the market returns.'],
  fx: (f) => { f.rep('commercial', 2).cash(1600, 'O mercado voltou', 'other_income'); return l('Resistir valeu: o mercado voltou e o catálogo ficou inteiro.', 'Holding paid: the market came back and the catalog stayed whole.'); },
  miss: (f) => { f.cash(-1600, 'Aperto prolongado', 'misc'); return l('O aperto durou mais do que o caixa.', 'The squeeze lasted longer than the cash.'); } });
ECHO('parent_manager:accept', { w: [4, 12], p: 0.5, t: 'mixed', h: ['Pai empresário: lealdade ou briga em família.', 'A parent manager: loyalty or a family fight.'],
  fx: (f) => { f.trust(6); return T(f, 'O pai-empresário de {p} provou que entende do riscado.', '{p}\'s parent-manager proved they know the business.'); },
  miss: (f) => { f.mood('resentment', 8); return T(f, 'O pai-empresário de {p} brigou com o selo de novo.', '{p}\'s parent-manager fought with the label again.'); } });
ECHO('parent_manager:advisor', { w: [4, 10], p: 0.4, t: 'good', h: ['Meio-termo acalma a família.', 'A middle ground calms the family.'],
  fx: (f) => { f.trust(3); return T(f, 'Como conselheiro, o pai de {p} ajudou sem atrapalhar.', 'As an adviser, {p}\'s parent helped without meddling.'); } });
ECHO('parent_manager:refuse', { w: [3, 8], p: 0.4, t: 'bad', h: ['Recusar a família pesa no jantar de domingo.', 'Refusing the family weighs on Sunday dinner.'],
  fx: (f) => { f.trust(-4); return T(f, '{p} ouviu em casa que o selo desprezou a família.', '{p} heard at home that the label snubbed the family.'); } });
ECHO('d18_charity:donate', { w: [4, 10], p: 0.35, t: 'good', h: ['Doar quieto também é visto.', 'Quiet giving is noticed too.'],
  fx: (f) => { f.rep('institutional', 2); return l('A instituição citou o selo na prestação de contas anual.', 'The charity named the label in its annual report.'); } });
ECHO('d18_charity:skip', { w: [3, 8], p: 0.3, t: 'bad', h: ['"Agenda cheia" pode virar manchete.', '"Too busy" can become a headline.'],
  fx: (f) => { f.rep('institutional', -1); return l('Uma coluna lembrou quem não apareceu no beneficente.', 'A column listed who skipped the benefit.'); } });
ECHO('d18_flash_gig:haggle', { w: [2, 5], p: 0.45, t: 'mixed', h: ['Pedir o dobro: respeito ou fama de difícil.', 'Asking double: respect or a reputation.'],
  fx: (f) => { f.cash(700, 'Promotor pagou o dobro', 'live'); return l('O promotor ligou de novo — e pagou o dobro.', 'The promoter called again — and paid double.'); },
  miss: (f) => { f.rep('commercial', -1); return l('O promotor espalhou que vocês são difíceis.', 'The promoter spread word that you\'re difficult.'); } });
ECHO('d18_flash_gig:pass', { w: [3, 6], p: 0.3, t: 'mixed', h: ['Show recusado vai para outro.', 'A refused gig goes to someone else.'],
  fx: (f) => { f.mood('fatigue', -4); return T(f, '{a} descansou; o show foi para uma banda nova que roubou a noite.', '{a} rested; the gig went to a new band that stole the night.'); } });
ECHO('fan15_tickets:cap', { w: [4, 8], p: 0.5, t: 'good', h: ['Ingresso justo vira boca a boca.', 'Fair tickets turn into word of mouth.'],
  fx: (f) => { f.fans(3).cash(-500, 'Teto de ingresso', 'live'); return T(f, 'O teto de ingresso de {a} virou boca a boca: fila na porta.', '{a}\'s ticket cap spread by word of mouth: lines at the door.'); } });
ECHO('fan15_tickets:blame', { w: [3, 8], p: 0.4, t: 'bad', h: ['Culpar a casa queima pontes.', 'Blaming the venue burns bridges.'],
  fx: (f) => { f.rep('institutional', -2); return l('A casa de shows respondeu com os e-mails do selo — e eles não ajudam.', 'The venue replied with the label\'s emails — and they don\'t help.'); } });
ECHO('fan15_tickets:ignore', { w: [3, 8], p: 0.4, t: 'bad', h: ['Fã lesado não esquece.', 'Cheated fans don\'t forget.'],
  fx: (f) => { f.fans(-2); return T(f, 'Os fãs de {a} organizaram um boicote aos preços.', '{a}\'s fans organised a price boycott.'); } });
ECHO('fan_letter:reply', { w: [3, 8], p: 0.5, t: 'good', h: ['Uma carta respondida volta com amigos.', 'An answered letter comes back with friends.'],
  fx: (f) => { f.fans(2); return T(f, 'O fã da carta trouxe trinta amigos ao show de {a}.', 'The letter-writing fan brought thirty friends to {a}\'s show.'); } });
ECHO('fan_letter:frame', { w: [6, 12], p: 0.3, t: 'good', h: ['O quadro no estúdio inspira.', 'The frame in the studio inspires.'],
  fx: (f) => { f.mood('inspiration', 6); return T(f, 'A carta emoldurada virou letra no disco novo de {a}.', 'The framed letter became a lyric on {a}\'s new record.'); } });
ECHO('gear_endorsement:accept', { w: [4, 10], p: 0.5, t: 'mixed', h: ['Logotipo no palco: grana ou chiadeira.', 'A logo on stage: money or grumbling.'],
  fx: (f) => { f.cash(1000, 'Endosso renovado', 'brands'); return T(f, 'O fabricante renovou o endosso de {a} com bônus.', 'The maker renewed {a}\'s endorsement with a bonus.'); },
  miss: (f) => { f.rep('artistic', -1); return T(f, 'Puristas chiaram com o logotipo no palco de {a}.', 'Purists grumbled about the logo on {a}\'s stage.'); } });
ECHO('gear_endorsement:decline', { w: [4, 10], p: 0.3, t: 'good', h: ['Recusar marca vira crédito com a crítica.', 'Refusing a brand earns critic credit.'],
  fx: (f) => { f.rep('artistic', 1); return T(f, 'A crítica elogiou {a} por "não estar à venda".', 'Critics praised {a} for "not being for sale".'); } });
ECHO('p13_sex:fight', { w: [4, 12], p: 0.5, t: 'mixed', h: ['Bancar a artista: virada ou parede.', 'Backing the artist: breakthrough or a wall.'],
  fx: (f) => { f.fame(3).rep('artistic', 3); return T(f, 'A campanha de {a} furou a barreira: rádios novas tocam.', '{a}\'s campaign broke through: new stations play her.'); },
  miss: (f) => { f.fans(-2); return T(f, 'A campanha de {a} bateu na parede das rádios grandes.', '{a}\'s campaign hit the wall of the big stations.'); } });
ECHO('p13_sex:niche', { w: [4, 10], p: 0.5, t: 'good', h: ['Quem procura acha.', 'Those who seek, find.'],
  fx: (f) => { f.fans(3); return T(f, 'O público que já procurava {a} lotou os clubes.', 'The audience already seeking {a} packed the clubs.'); } });
ECHO('p13_sex:comply', { w: [4, 10], p: 0.5, t: 'bad', h: ['Ceder a imagem cobra da artista.', 'Giving up the image costs the artist.'],
  fx: (f) => { f.mood('resentment', 10).trust(-5); fav(f, 'grievance', l('Imagem imposta pelo selo', 'Image imposed by the label')); return T(f, '{a} não se reconhece mais nas capas.', '{a} no longer recognises herself on the covers.'); } });
ECHO('poach_attempt:match', { w: [4, 10], p: 0.5, t: 'good', h: ['Cobrir a oferta mostra valor.', 'Matching the offer shows worth.'],
  fx: (f) => { f.trust(4); return T(f, '{a} conta a todos que o selo bancou a permanência.', '{a} tells everyone the label paid to keep them.'); } });
ECHO('poach_attempt:sell', { w: [4, 10], p: 0.4, t: 'mixed', h: ['Venda vira comparação pública.', 'A sale becomes a public comparison.'],
  fx: (f) => { f.rep('commercial', 1); return l('O ato vendido estreou bem no rival; o mercado elogiou o seu preço.', 'The sold act debuted well at the rival; the market praised your price.'); } });
ECHO('poach_attempt:hold', { w: [3, 8], p: 0.45, t: 'bad', h: ['Segurar pelo papel gera mágoa.', 'Holding by paper breeds resentment.'],
  fx: (f) => { f.mood('resentment', 8); return T(f, '{a} cumpre o contrato contando os dias.', '{a} serves the contract counting the days.'); } });
ECHO('sit17:hometown_show:free', { w: [3, 8], p: 0.5, t: 'good', h: ['A cidade natal retribui.', 'The hometown pays back.'],
  fx: (f) => { f.fans(4); return T(f, 'A cidade natal adotou {a} de vez.', 'The hometown adopted {a} for good.'); } });
ECHO('sit17:hometown_show:paid', { w: [3, 8], p: 0.45, t: 'good', h: ['Renda doada vira placa na prefeitura.', 'Donated takings become a plaque at city hall.'],
  fx: (f) => { f.rep('institutional', 2); return T(f, 'A prefeitura homenageou {a} pela renda doada.', 'City hall honoured {a} for the donated takings.'); } });
ECHO('sit17:hometown_show:skip', { w: [3, 8], p: 0.4, t: 'bad', h: ['Cidade natal guarda mágoa.', 'Hometowns hold grudges.'],
  fx: (f) => { f.fans(-2); return T(f, 'A cidade natal não perdoou a ausência de {a}.', 'The hometown did not forgive {a}\'s absence.'); } });
ECHO('sit17:secret_sale:buy', { w: [4, 10], p: 0.45, t: 'mixed', h: ['Compra secreta pode vazar.', 'A secret purchase may leak.'],
  fx: (f) => { f.cash(1500, 'Compra secreta rendeu', 'other_income'); return l('A compra secreta rendeu antes que alguém percebesse.', 'The secret purchase paid off before anyone noticed.'); },
  miss: (f) => { f.rep('artists', -2); return l('Vazou: você comprou por baixo do pano.', 'It leaked: you bought under the table.'); } });
ECHO('sit17:secret_sale:tip_off', { w: [3, 8], p: 0.55, t: 'good', h: ['Avisar o artista cria dívida de gratidão.', 'Tipping off the artist creates a debt of gratitude.'],
  fx: (f) => { f.rep('artists', 2).trust(4); fav(f, 'favor', l('O selo o avisou da venda secreta', 'The label warned them of the secret sale'), 35); return T(f, '{a} deve uma a você: o aviso salvou o catálogo.', '{a} owes you one: the warning saved the catalog.'); } });
ECHO('sit17:secret_sale:pass', { w: [4, 10], p: 0.3, t: 'mixed', h: ['Quem passa não se suja — nem ganha.', 'Passing keeps you clean — and empty-handed.'],
  fx: (f) => { f.rep('institutional', 1); return l('Quem comprou se enrolou; você ficou de fora, limpo.', 'Whoever bought got tangled; you stayed out, clean.'); } });
ECHO('fan15_war:fuel', { w: [2, 6], p: 0.5, t: 'mixed', h: ['Rivalidade de fã vende — até sangrar.', 'Fan rivalry sells — until it bleeds.'],
  fx: (f) => { f.fame(2).momentum(4); return T(f, 'A guerra de fãs pôs {a} nos trending.', 'The fan war put {a} in the trends.'); },
  miss: (f) => { const x = T(f, 'A guerra de fãs de {a} passou do ponto: ameaças e briga na porta do show.', '{a}\'s fan war went too far: threats and a brawl at the venue door.'); scan(f, 'conduct', 18, x); return x; } });
ECHO('fan15_war:calm', { w: [3, 8], p: 0.5, t: 'good', h: ['Pedir paz rende respeito.', 'Calling for peace earns respect.'],
  fx: (f) => { f.rep('artistic', 1).fans(1); return T(f, 'O pedido de paz de {a} foi elogiado até pelos rivais.', '{a}\'s call for peace was praised even by rivals.'); } });
ECHO('fan15_war:quiet', { w: [3, 8], p: 0.3, t: 'bad', h: ['Silêncio deixa a briga crescer.', 'Silence lets the fight grow.'],
  fx: (f) => { f.fans(-1); return T(f, 'Sem resposta, os fãs de {a} se dividiram.', 'With no answer, {a}\'s fans split.'); } });
ECHO('misquote:correction', { w: [2, 6], p: 0.5, t: 'good', h: ['Com a fita na mão, a verdade volta.', 'With the tape in hand, the truth returns.'],
  fx: (f) => { f.rep('institutional', 1).trust(2); return T(f, 'O jornal publicou a correção: {a} saiu maior.', 'The paper ran the correction: {a} came out bigger.'); } });
ECHO('misquote:joke', { w: [2, 6], p: 0.5, t: 'good', h: ['Humor desarma.', 'Humour disarms.'],
  fx: (f) => { f.fans(2); return T(f, 'A resposta bem-humorada de {a} virou meme simpático.', '{a}\'s witty reply became a friendly meme.'); } });
ECHO('misquote:let', { w: [2, 8], p: 0.4, t: 'bad', h: ['Frase errada pega.', 'A wrong quote sticks.'],
  fx: (f) => { f.fame(-1); return T(f, 'A frase que {a} nunca disse ainda aparece nas perguntas.', 'The line {a} never said still shows up in interviews.'); } });
ECHO('reunion:pass', { w: [6, 12], p: 0.35, t: 'bad', h: ['Reunião recusada acontece em outro lugar.', 'A refused reunion happens elsewhere.'],
  fx: (f) => { f.rep('commercial', -1); return l('A reunião aconteceu em outro selo e lotou estádios.', 'The reunion happened at another label and filled stadiums.'); } });
ECHO('sit17:burnout:rest', { w: [2, 6], p: 0.6, t: 'good', h: ['Folga recarrega.', 'Time off recharges.'],
  fx: (f) => { f.mood('fatigue', -10).mood('morale', 5); return T(f, '{p} voltou da folga com outra cara.', '{p} came back from time off a new person.'); } });
ECHO('sit17:burnout:therapy', { w: [4, 10], p: 0.55, t: 'good', h: ['Terapia leva tempo.', 'Therapy takes time.'],
  fx: (f) => { f.mood('stress', -10).trust(4); return T(f, 'A terapia de {p} rendeu: menos crises, mais foco.', '{p}\'s therapy paid off: fewer crises, more focus.'); } });
ECHO('sit17:burnout:push', { w: [2, 6], p: 0.5, t: 'bad', h: ['O corpo cobra.', 'The body collects.'],
  fx: (f) => { f.mood('stress', 12).fame(-1); return T(f, '{p} desabou no meio da turnê.', '{p} collapsed mid-tour.'); } });
ECHO('movement_born:showcase', { w: [4, 10], p: 0.5, t: 'mixed', h: ['Noite-vitrine: berço ou fiasco.', 'A showcase night: a cradle or a flop.'],
  fx: (f) => { f.rep('artistic', 3); return l('A noite-vitrine que você patrocinou é citada como o berço do movimento.', 'The showcase you sponsored is cited as the movement\'s cradle.'); },
  miss: (f) => { f.cash(-700, 'Vitrine vazia', 'misc'); return l('A noite-vitrine teve mais garçons que público.', 'The showcase had more waiters than audience.'); } });
ECHO('movement_born:dress', { w: [3, 8], p: 0.45, t: 'mixed', h: ['Vestir a estética: autêntico ou fantasia.', 'Wearing the look: authentic or costume.'],
  fx: (f) => { f.fame(2); return T(f, 'A estética nova colou em {a}: capa de revista.', 'The new look suited {a}: a magazine cover.'); },
  miss: (f) => { f.rep('artistic', -1); return T(f, 'A cena chamou {a} de "turista de figurino".', 'The scene called {a} "costume tourists".'); } });
ECHO('movement_born:observe', { w: [4, 10], p: 0.3, t: 'bad', h: ['Movimento não espera.', 'Movements don\'t wait.'],
  fx: (f) => { f.momentum(-2); return l('O movimento cresceu sem um único artista seu.', 'The movement grew without a single act of yours.'); } });
ECHO('tv_song_contest:enter', { w: [2, 6], p: 0.45, t: 'mixed', h: ['Festival de TV: vitrine ou vexame.', 'A TV contest: a showcase or a fiasco.'],
  fx: (f) => { f.fame(3).fans(3); return T(f, 'A apresentação de {a} no festival de TV virou assunto nacional.', '{a}\'s TV contest performance became national talk.'); },
  miss: (f) => { f.mood('morale', -5); return T(f, '{a} foi vaiado(a) no festival; a música vendeu mesmo assim.', '{a} was booed at the contest; the song sold anyway.'); } });
ECHO('tv_song_contest:decline', { w: [4, 10], p: 0.25, t: 'mixed', h: ['Fora do festival, fora da conversa.', 'Out of the contest, out of the conversation.'],
  fx: (f) => { f.momentum(-2); return l('O festival lançou um nome novo — de outro selo.', 'The contest launched a new name — from another label.'); } });
// família r11 (87 eventos, nenhum eco antes)
ECHO('r11_intern_demo:scout', { w: [3, 9], p: 0.45, t: 'mixed', h: ['O estagiário pode ter ouvido.', 'The intern may have ears.'],
  fx: (f) => { f.rep('commercial', 2).cash(1200, 'Achado do estagiário', 'sales'); return l('A demo que o estagiário trouxe virou single regional.', 'The intern\'s demo became a regional single.'); },
  miss: () => l('A demo do estagiário era só a banda do primo dele.', 'The intern\'s demo was just his cousin\'s band.') });
ECHO('r11_intern_demo:note', { w: [4, 10], p: 0.3, t: 'mixed', h: ['Nome anotado pode voltar.', 'A noted name may return.'],
  fx: (f) => { f.rep('commercial', 1); return l('O nome anotado na agenda reapareceu numa lista de promessas.', 'The noted name showed up on a list of up-and-comers.'); } });
ECHO('r11_intern_demo:ignore', { w: [4, 10], p: 0.3, t: 'bad', h: ['Quem você esqueceu, outro lembra.', 'Who you forget, someone else remembers.'],
  fx: (f) => { f.rep('commercial', -1).rep('artists', -1); return l('A demo esquecida estourou num rival; o estagiário pediu demissão.', 'The forgotten demo blew up at a rival; the intern quit.'); } });
ECHO('r11_merch_bootleg:security', { w: [3, 8], p: 0.5, t: 'good', h: ['Fiscalização protege a renda.', 'Enforcement protects revenue.'],
  fx: (f) => { f.cash(stake(f, 900), 'Merch oficial recuperado', 'merch'); return T(f, 'Sem pirata na porta, o merch oficial de {a} vendeu o dobro.', 'With no bootleggers at the door, {a}\'s official merch sold double.'); } });
ECHO('r11_merch_bootleg:cheaper', { w: [3, 8], p: 0.5, t: 'mixed', h: ['Preço baixo ganha volume — e perde margem.', 'Lower prices gain volume — and lose margin.'],
  fx: (f) => { f.fans(2); return T(f, 'A camiseta barata de {a} está em todo lugar.', '{a}\'s cheap T-shirt is everywhere.'); },
  miss: (f) => { f.cash(-500, 'Margem do merch', 'misc'); return l('O preço baixo não cobriu a fabricação.', 'The low price didn\'t cover manufacturing.'); } });
ECHO('r11_merch_bootleg:ignore', { w: [3, 8], p: 0.4, t: 'bad', h: ['Pirata ignorado se instala.', 'Ignored bootleggers settle in.'],
  fx: (f) => { f.cash(-stake(f, 500), 'Merch pirata', 'misc'); return T(f, 'Os piratas agora vendem {a} até na internet.', 'Bootleggers now sell {a} online too.'); } });
ECHO('r11_superstar_feat:pay', { w: [3, 9], p: 0.5, t: 'mixed', h: ['Feat pago: hit ou nome caro na capa.', 'A paid feat: a hit or an expensive name on the cover.'],
  fx: (f) => { f.fame(3).cash(stake(f, 1500), 'Feat com estrela', 'sales'); return T(f, 'O feat com a estrela levou {a} para outro público.', 'The star feat took {a} to a new audience.'); },
  miss: (f) => { f.mood('morale', -4); return T(f, 'A estrela gravou no automático; o feat de {a} passou batido.', 'The star phoned it in; {a}\'s feat went unnoticed.'); } });
ECHO('r11_superstar_feat:swap', { w: [3, 9], p: 0.5, t: 'good', h: ['Troca de favores cria aliados.', 'Trading favours creates allies.'],
  fx: (f) => { f.fame(2); fav(f, 'favor', l('Participou do disco da estrela', 'Featured on the star\'s record'), 20); return T(f, 'A troca deu certo: {a} aparece no disco da estrela.', 'The swap worked: {a} is on the star\'s record.'); } });
ECHO('r11_superstar_feat:pass', { w: [4, 10], p: 0.3, t: 'bad', h: ['Recusar estrela tem custo.', 'Refusing a star has a cost.'],
  fx: (f) => { f.momentum(-2); return l('A estrela gravou com um rival e citou a recusa.', 'The star recorded with a rival and mentioned the refusal.'); } });
ECHO('r11_band_romance_split:album', { w: [4, 10], p: 0.55, t: 'mixed', h: ['Dor vira disco — às vezes.', 'Pain becomes a record — sometimes.'],
  fx: (f) => { f.mood('inspiration', 12).rep('artistic', 2); return T(f, 'O disco da separação de {a} é o mais elogiado da carreira.', '{a}\'s breakup record is their most acclaimed.'); },
  miss: (f) => { f.mood('stress', 8); return T(f, 'O estúdio virou campo de batalha para {a}.', 'The studio became a battlefield for {a}.'); } });
ECHO('r11_band_romance_split:pause', { w: [3, 8], p: 0.5, t: 'good', h: ['Tempo cura.', 'Time heals.'],
  fx: (f) => { f.mood('resentment', -8).mood('morale', 4); return T(f, '{a} voltou da pausa conversando de novo.', '{a} came back from the break talking again.'); } });
ECHO('r11_band_romance_split:carry', { w: [2, 6], p: 0.5, t: 'bad', h: ['Agenda não cura coração.', 'A schedule doesn\'t mend hearts.'],
  fx: (f) => { f.mood('stress', 10).momentum(-3); return T(f, '{a} brigou no palco; o show acabou mais cedo.', '{a} fought on stage; the show ended early.'); } });
ECHO('r11_stage_politics:back', { w: [3, 8], p: 0.5, t: 'mixed', h: ['Apoio público divide o público.', 'Public support splits the audience.'],
  fx: (f) => { f.trust(5).fans(2); return T(f, '{a} virou símbolo; o selo, aliado.', '{a} became a symbol; the label, an ally.'); },
  miss: (f) => { f.rep('institutional', -2); return l('Patrocinadores e rádios conservadoras cortaram o selo.', 'Sponsors and conservative stations dropped the label.'); } });
ECHO('r11_stage_politics:neutral', { w: [3, 8], p: 0.45, t: 'bad', h: ['Nota neutra soa como abandono.', 'A neutral note reads as abandonment.'],
  fx: (f) => { f.trust(-4); return T(f, '{a} leu a nota do selo como abandono.', '{a} read the label\'s note as abandonment.'); } });
ECHO('r11_stage_politics:nothing', { w: [3, 8], p: 0.3, t: 'mixed', h: ['Silêncio: ninguém lembra — ou todos lembram.', 'Silence: nobody remembers — or everyone does.'],
  fx: (f) => { f.trust(-2); return T(f, '{a} reparou no silêncio.', '{a} noticed the silence.'); } });

// família w4 (marcos da indústria)
ECHO('w4_napster:sue', { w: [4, 10], p: 0.6, t: 'bad', h: ['Processar fã vira manchete contra você.', 'Suing fans makes headlines against you.'],
  fx: (f) => { f.rep('artists', -3).rep('commercial', -1); return l('Uma avó processada pelo selo virou capa de jornal.', 'A grandmother sued by the label made the front page.'); } });
ECHO('w4_napster:license', { w: [8, 18], p: 0.55, t: 'good', h: ['Licenciar cedo dá lugar à mesa.', 'Licensing early buys a seat at the table.'],
  fx: (f) => { f.cash(2500, 'Licenças digitais', 'licensing').rep('commercial', 2); return l('Os serviços legais pagam o primeiro cheque de verdade.', 'The legal services pay their first real cheque.'); } });
ECHO('w4_napster:drm', { w: [6, 14], p: 0.5, t: 'bad', h: ['Trava anticópia irrita quem pagou.', 'Copy locks annoy paying customers.'],
  fx: (f) => { f.rep('commercial', -2); return l('Discos com trava não tocam no carro: devoluções em massa.', 'Locked discs won\'t play in cars: mass returns.'); } });
ECHO('w4_napster:cheap', { w: [6, 14], p: 0.5, t: 'mixed', h: ['Preço baixo compete com o grátis?', 'Can low prices compete with free?'],
  fx: (f) => { f.rep('commercial', 2); return l('O preço baixo trouxe de volta quem tinha parado de comprar.', 'The low price brought back people who had stopped buying.'); },
  miss: (f) => { f.cash(-1500, 'Margem perdida', 'misc'); return l('O grátis venceu: a margem sumiu.', 'Free won: the margin vanished.'); } });
ECHO('w4_360:adopt', { w: [12, 24], p: 0.55, t: 'mixed', h: ['360: mais receita, menos amor do artista.', '360: more revenue, less artist love.'],
  fx: (f) => { f.cash(3000, 'Fatia 360', 'live'); return l('A fatia 360 dos shows salvou o ano fiscal.', 'The 360 slice of live income saved the fiscal year.'); },
  miss: (f) => { f.rep('artists', -3); return l('Agentes passaram a evitar o selo por causa do 360.', 'Agents started avoiding the label because of the 360.'); } });
ECHO('w4_360:skip', { w: [12, 24], p: 0.4, t: 'good', h: ['Contrato tradicional atrai quem foge do 360.', 'Traditional deals attract those fleeing the 360.'],
  fx: (f) => { f.rep('artists', 3); return l('Artistas fugindo do 360 batem à sua porta.', 'Artists fleeing the 360 knock on your door.'); } });
ECHO('w4_liveaid:play', { w: [3, 12], p: 0.6, t: 'good', h: ['Quem tocou vende catálogo por um ano.', 'Those who played sell catalog for a year.'],
  fx: (f) => { f.fans(4).rep('institutional', 2); return T(f, 'Depois do megaevento, o catálogo de {a} voltou às paradas.', 'After the mega-event, {a}\'s catalog returned to the charts.'); } });
ECHO('w4_liveaid:decline', { w: [3, 9], p: 0.4, t: 'bad', h: ['"Agenda cheia" vira piada.', '"Too busy" becomes a joke.'],
  fx: (f) => { f.rep('institutional', -2); return l('A ausência no megaevento virou piada de talk show.', 'Skipping the mega-event became a talk-show joke.'); } });
ECHO('w4_speedwar:lp', { w: [10, 20], p: 0.5, t: 'mixed', h: ['O LP é o futuro dos adultos.', 'The LP is the grown-ups\' future.'],
  fx: (f) => { f.rep('artistic', 2).cash(2000, 'LPs de catálogo', 'sales'); return l('As lojas de discos montam prateleiras só de LP: aposta certa.', 'Record stores build LP-only shelves: the right bet.'); } });
ECHO('w4_speedwar:single45', { w: [10, 20], p: 0.5, t: 'mixed', h: ['O 45 é o futuro dos jovens.', 'The 45 is the kids\' future.'],
  fx: (f) => { f.rep('commercial', 2).cash(2000, 'Compactos nas jukeboxes', 'sales'); return l('Os jovens enchem as jukeboxes de 45: aposta certa.', 'Teenagers fill jukeboxes with 45s: the right bet.'); } });
ECHO('w4_strike:sign', { w: [6, 14], p: 0.5, t: 'good', h: ['Acordo com o sindicato vale anos.', 'A union deal lasts years.'],
  fx: (f) => { f.rep('institutional', 2); return l('O sindicato indica o selo como "casa justa" aos músicos.', 'The union recommends the label as a "fair house" to musicians.'); } });
ECHO('w4_strike:vault', { w: [4, 12], p: 0.5, t: 'mixed', h: ['Viver do cofre: astúcia ou fura-greve.', 'Living off the vault: shrewd or strikebreaking.'],
  fx: (f) => { f.cash(1500, 'Cofre na greve', 'sales'); return l('As gravações do cofre seguraram o caixa durante a greve.', 'Vault recordings carried cash through the strike.'); },
  miss: (f) => { f.rep('artists', -2); return l('Músicos chamaram as gravações a capella de fura-greve.', 'Musicians called the a cappella sessions strikebreaking.'); } });
ECHO('w4_hometaping:campaign', { w: [4, 12], p: 0.45, t: 'bad', h: ['Caveira na fita vira chacota.', 'A skull on a tape becomes a joke.'],
  fx: (f) => { f.rep('artists', -1); return l('A campanha anti-fita virou estampa irônica nas camisetas punk.', 'The anti-tape campaign became an ironic punk T-shirt print.'); } });
ECHO('w4_hometaping:embrace', { w: [4, 12], p: 0.5, t: 'mixed', h: ['Cassete: alcance ou pirataria facilitada.', 'Cassettes: reach or easier piracy.'],
  fx: (f) => { f.cash(1800, 'Cassetes', 'sales').fans(1); return l('Os cassetes do selo tocam em todo walkman da cidade.', 'The label\'s cassettes play in every walkman in town.'); } });

// família org12 (reorganizações por era): mesmas opções em 15 eras
for (const e of ['radio', 'jukebox', 'albums', 'rocknroll', 'fm', 'disco', 'video', 'cd', 'piracy', 'download', 'streaming', 'viral', 'synthetic', 'neural', 'postai']) {
  ECHO(`org12_${e}:overhaul`, { w: [6, 14], p: 0.5, t: 'mixed', h: ['Reestruturar tudo: salto ou caos.', 'Overhauling everything: a leap or chaos.'],
    fx: (f) => { f.rep('commercial', 3).cash(2000, 'Reestruturação deu certo', 'other_income'); return l('A reestruturação radical encaixou: o selo opera como os novos tempos pedem.', 'The radical overhaul clicked: the label runs the way the new times demand.'); },
    miss: (f) => { f.cash(-2000, 'Caos da reestruturação', 'misc').rep('artists', -1); return l('A reestruturação virou caos: demissões, projetos parados, artistas perdidos.', 'The overhaul turned into chaos: layoffs, stalled projects, lost artists.'); } });
  ECHO(`org12_${e}:gradual`, { w: [6, 14], p: 0.4, t: 'good', h: ['Devagar se vai longe.', 'Slow and steady.'],
    fx: (f) => { f.rep('commercial', 1); return l('A transição gradual não fez barulho — e não quebrou nada.', 'The gradual transition made no noise — and broke nothing.'); } });
  ECHO(`org12_${e}:acquire`, { w: [4, 12], p: 0.5, t: 'mixed', h: ['Especialista comprado precisa caber na casa.', 'A bought specialist has to fit in.'],
    fx: (f) => { f.rep('commercial', 2).rep('artistic', 1); return l('O especialista comprado trouxe contatos e método.', 'The acquired specialist brought contacts and method.'); },
    miss: (f) => { f.cash(-1500, 'Especialista que não se adaptou', 'misc'); return l('O especialista comprado não se adaptou e saiu com a equipe dele.', 'The acquired specialist didn\'t fit and left with their team.'); } });
  ECHO(`org12_${e}:hold`, { w: [8, 16], p: 0.4, t: 'bad', h: ['Estrutura antiga em era nova range.', 'An old structure in a new era creaks.'],
    fx: (f) => { f.rep('commercial', -2); return l('A estrutura antiga ficou para trás: rivais mais ágeis passaram na frente.', 'The old structure fell behind: nimbler rivals overtook you.'); } });
}
// família era8 (estratégias de época): o resultado lê a sua reputação comercial (quem executa bem colhe a aposta)
onEventsReady(() => { // r21: EVENTS só existe depois de events.ts fechar (ciclo de imports)
for (const ev of EVENTS.filter((e) => e.id.startsWith('era8_'))) for (const o of ev.options) {
  ECHO(`${ev.id}:${o.id}`, { w: [8, 18], p: (s) => clamp(0.4 + (R(s).commercial - 50) / 200, 0.25, 0.7), t: 'mixed', h: ['Estratégia de era: o mercado julga em um ano.', 'An era strategy: the market judges within a year.'],
    fx: (f) => { f.rep('commercial', 2).cash(2000, 'Estratégia de era', 'other_income'); return fmtL(l('Nova era ({t}): a aposta "{o}" se pagou — a imprensa cita o selo como exemplo.', 'New era ({t}): the "{o}" bet paid off — the press cites the label as an example.'), { t: ev.title, o: o.label }); },
    miss: (f) => { f.rep('commercial', -1); return fmtL(l('Nova era ({t}): a aposta "{o}" ficou atrás dos rivais.', 'New era ({t}): the "{o}" bet fell behind rivals.'), { t: ev.title, o: o.label }); } });
}
});

// ---------------------------------------------------------------- 4. fatos de aposta → Conselheiro e elenco

const lostRecent = (s: GameState): number => recentFacts(s, { kind: 'risk_lost', months: 12 }).length;
onFact('risk_lost', (s) => {
  if (lostRecent(s) !== 3) return;
  for (const id of playerActs(s)) for (const pid of s.acts[id]?.members ?? []) { const p = s.persons[pid]; if (p?.alive) p.morale = clamp(p.morale - 4, 0, 100); }
}, 'echoes19:lost3');
// três apostas que pagaram em 12 meses: o mercado passa a falar do "faro" do selo
onFact('risk_paid', (s) => { if (recentFacts(s, { kind: 'risk_paid', months: 12 }).length === 3) s.player.reputation.commercial = clamp(s.player.reputation.commercial + 1, 0, 100); }, 'echoes19:paid3');
registerAdvisorTip('echoes19', (s) => {
  const n = lostRecent(s);
  if (n < 3) return [];
  return [{ id: 'echoes19_risk', level: 'warn', cat: 'cash', text: fmtL(l('{n} apostas deram errado em 12 meses: o elenco acha que você joga com o dinheiro deles.', '{n} gambles went wrong in 12 months: the roster thinks you gamble with their money.'), { n }),
    why: [l('Opções arriscadas voltam como eco (pagando ou cobrando); a chance sobe com a reputação comercial.', 'Risky options come back as echoes (paying or collecting); the odds rise with commercial reputation.')], effect: l('Moral do elenco −4 na 3ª aposta perdida', 'Roster morale −4 on the 3rd lost gamble') }];
});
registerExplain('dec19.cover', (s) => {
  const c = coverage19(TOP19);
  return { title: l('Cobertura de ecos (120 eventos mais comuns)', 'Echo coverage (120 most common events)'), value: Math.round((c.own / Math.max(1, c.opts)) * 100), fmt: 'pct',
    parts: [{ label: l('Escritos à mão', 'Hand-written'), value: c.own, fmt: 'num' }, { label: l('Com eco padrão pelo tom', 'With a default tone echo'), value: c.any - c.own, fmt: 'num' }, { label: l('Opções', 'Options'), value: c.opts, fmt: 'num' }],
    note: l('Sem eco escrito, a opção volta pelo tom: arriscada (paga ou cobra), generosa (gratidão), enganosa (vaza), cautelosa (poupa ou perde a vez), agressiva (troco).', 'With no written echo, the option returns by tone: risky (pays or collects), generous (gratitude), deceitful (leaks), cautious (spares or misses out), aggressive (payback).') };
});
