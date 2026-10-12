// Sistema "rights8" (rodada 8, §3.3): consequências da ficha de direitos com o passar dos anos —
// masters que voltam ao artista (com aviso e chance de recomprar), artistas que cresceram e pedem
// renegociação com mais poder, e projetos paralelos de quem assinou sem exclusividade.

import { Rng, clamp } from '../../core/rng';
import { l } from '../../data/world';
import { expectedAdvance } from '../contracts';
import { mainAmbition } from '../people';
import { registerExt4, registerSimHook } from '../ext4';
import { artistPower, recoupTail20, releasesOfDeal, revertWeek, rightsOf, rst, writeOffRecoup20 } from '../rights';
import { fmtL, money, nextId, notify, remember } from '../util';

registerExt4('rights8', () => ({ demands: [], perms: [], reversions: [] }));

registerSimHook('month', 'rights8', (s, r) => {
  if (s.config.role === 'artist') return;
  const st = rst(s);
  for (const c of Object.values(s.contracts)) {
    if (c.party !== 'player' || c.reverted) continue;
    const act = s.acts[c.actId];
    if (!act || act.playerBand) continue;
    // --- reversão dos masters
    const rw = revertWeek(c);
    if (rw !== Infinity && c.endWeek <= s.week) {
      const t = rightsOf(c);
      if (!c.revertWarned && s.week >= rw - 26 && s.week < rw) {
        c.revertWarned = true;
        notify(s, fmtL(l('Os masters de {a} voltam ao artista em ~{m} meses. Dá para negociar a extensão na ficha de Direitos.', '{a}\'s masters revert to the artist in ~{m} months. You can negotiate an extension in the Rights sheet.'), { a: act.name, m: Math.max(1, Math.round((rw - s.week) / 4.35)) }), 'event');
      }
      // r20 (B29): teto negociável da trava de recoupment; sem teto, avisa uma vez o cenário de cauda
      const capped = t.reversionNeedsRecoup && c.recoupBalance > 0 && (t.recoupCapYears ?? 0) > 0 && s.week >= rw + Math.round((t.recoupCapYears ?? 0) * 52);
      if (s.week >= rw && t.reversionNeedsRecoup && c.recoupBalance > 0 && !capped && !c.recoupWarn20) {
        c.recoupWarn20 = true;
        const tl = recoupTail20(s, c);
        notify(s, fmtL(l('Masters de {a} travados pela cláusula de recoupment: faltam {b}; no ritmo atual, {y}.', '{a}\'s masters held by the recoupment clause: {b} left; at the current pace, {y}.'), { a: act.name, b: `$${Math.round(tl.balance / 100).toLocaleString('en-US')}`,
          y: tl.capWeek !== Infinity ? fmtL(l('o teto de {n} anos libera antes', 'the {n}-year cap releases them first'), { n: t.recoupCapYears ?? 0 }) : tl.years === Infinity ? l('nunca se recupera (ficam com o selo)', 'it never recoups (the label keeps them)') : fmtL(l('~{n} anos', '~{n} years'), { n: Math.ceil(tl.years) }) }), 'event');
      }
      if (s.week >= rw && (!t.reversionNeedsRecoup || c.recoupBalance <= 0 || capped)) {
        // r20c (N2): liberado pelo teto → o saldo não recuperado é perdoado (como a ficha promete)
        const off = capped ? writeOffRecoup20(s, c) : 0;
        if (off > 0) notify(s, fmtL(l('Teto da trava atingido: {a} recebe os masters e o saldo não recuperado ({v}) foi perdoado.', 'Lock cap reached: {a} gets the masters and the unrecouped balance ({v}) was written off.'), { a: act.name, v: `$${Math.round(off / 100).toLocaleString('en-US')}` }), 'info');
        const rels = releasesOfDeal(s, c);
        for (const rel of rels) rel.owner = 'indie';
        c.reverted = true;
        act.trust = clamp(act.trust + 8, 0, 100);
        st.reversions.push({ week: s.week, actId: act.id, contractId: c.id, n: rels.length });
        if (st.reversions.length > 30) st.reversions.splice(0, st.reversions.length - 30);
        if (rels.length) {
          notify(s, fmtL(l('Cláusula de reversão: {n} master(s) de {a} voltaram ao artista.', 'Reversion clause: {n} of {a}\'s master(s) went back to the artist.'), { n: rels.length, a: act.name }), 'info');
          remember(s, 'masters_reverted', fmtL(l('Os masters de {a} voltam às mãos do artista, anos depois do contrato com {c}.', '{a}\'s masters return to the artist, years after the deal with {c}.'), { a: act.name, c: s.config.companyName }), { actId: act.id, important: true });
        }
      }
    }
    // --- artista que cresceu pede renegociação (só contratos ativos com folga)
    if (act.owner !== 'player' || act.contractId !== c.id || c.endWeek < s.week + 26) continue;
    if (c.fameAtSign === undefined) {
      c.fameAtSign = Math.round(act.fame * 10) / 10;
      continue;
    }
    // r27 (M2): antes só pedia com +18 de fama E contrato com mais de 2 anos E ainda 26 semanas pela frente — numa
    // ficha padrão de 36 meses a janela era quase nula (0 pedidos em 24 meses de bot). Agora a alavanca é crescer
    // (fama/nº 1), ter um disco que estourou desde a assinatura ou estar claramente mal pago para a fama atual;
    // pede a partir de 9 meses de contrato (1 ano depois de uma renegociação). Sorte em fluxo próprio (não s.rng).
    const power = artistPower(s, c);
    const since = c.lastRenegWeek ?? c.startWeek;
    const minAge = c.lastRenegWeek !== undefined ? 52 : 39;
    if (s.week - since < minAge || st.demands.some((d) => d.actId === act.id)) continue;
    let hit = false;
    for (const id in s.releases) { const x = s.releases[id]; if (x.actId === act.id && x.week >= since && ((x.peak > 0 && x.peak <= 10) || !!x.certified)) { hit = true; break; } }
    const under = 0.14 + act.fame / 600 - c.royalty >= 0.04 && act.fame - (c.fameAtSign ?? act.fame) >= 6;
    const lev = Math.max(power, hit ? 0.35 : 0, under ? 0.3 : 0);
    const tries = ((st as unknown as { try27?: Record<string, number> }).try27 ??= {});
    if (lev >= 0.3) tries[c.id] = (tries[c.id] ?? 0) + 1;
    if (lev >= 0.3 && Rng.fromSeed(`${s.config.seed}|reneg27|${c.id}|${s.week}|${tries[c.id]}`).chance(0.35)) {
      const amb = mainAmbition(s, act);
      const t = rightsOf(c);
      st.demands.push({
        id: nextId(s, 'rn'), actId: act.id, contractId: c.id, week: s.week,
        royalty: Math.round(Math.min(0.45, c.royalty + 0.03 + lev * 0.04) * 100) / 100,
        bonus: Math.round(money(s, expectedAdvance(s, act) * (0.15 + lev * 0.15)) / 100) * 100,
        reversionYears: t.master === 'label' && t.reversionYears === 0 && (amb === 'freedom' || amb === 'art' || amb === 'legacy') ? 20 : 0,
      });
      notify(s, fmtL(l('{a} cresceu desde que assinou e quer renegociar o contrato.', '{a} has grown since signing and wants to renegotiate.'), { a: act.name }), 'event');
    }
  }
  // pedidos ignorados por 2 meses viram recusa
  for (const d of [...st.demands]) {
    if (s.week - d.week < 9) continue;
    const act = s.acts[d.actId];
    if (act) {
      act.trust = clamp(act.trust - 10, 0, 100);
      if (act.trust < 30) s.flags[`leaving:${act.id}`] = 1;
      notify(s, fmtL(l('{a} se sentiu ignorado no pedido de renegociação.', '{a} felt ignored about the renegotiation request.'), { a: act.name }), 'bad');
    }
    const c = s.contracts[d.contractId];
    if (c) c.lastRenegWeek = s.week;
    st.demands = st.demands.filter((x) => x !== d);
  }
  // sem exclusividade: projetos paralelos dividem a atenção, mas o artista fica grato
  for (const c of Object.values(s.contracts)) {
    if (c.party !== 'player' || c.endWeek < s.week || !c.rights || c.rights.exclusive) continue;
    const act = s.acts[c.actId];
    if (!act || act.owner !== 'player' || act.contractId !== c.id || act.playerBand || !r.chance(0.04)) continue;
    act.cash += money(s, 500 + act.fame * 40);
    act.trust = clamp(act.trust + 2, 0, 100);
    act.momentum = clamp(act.momentum - 5, 0, 100);
    notify(s, fmtL(l('{a} lançou um projeto paralelo por fora (o contrato não é exclusivo).', '{a} put out a side project elsewhere (the deal is non-exclusive).'), { a: act.name }), 'info');
  }
});
