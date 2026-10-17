// R31 · onda 5 · QA5 — robô de navegação com exp5.nav ligado (scripts/r31/qa5.mjs, versão --quick: 1962, gravadora,
// 1280×720). Falha se aparecer achado fora de scripts/r31/qa5-known.json: erro de página, tela sem caminho de volta,
// página antiga inteira sem "ver tudo"/pausa, moldura antiga num lugar, rolagem horizontal na casca, botão sem efeito.
// Precisa do Chromium do contêiner (Playwright); sem ele o teste é pulado.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const chromium = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', process.env.CHROMIUM_PATH ?? ''].some((x) => x && existsSync(x));

describe('QA5 · robô de navegação (exp5.nav ligado)', () => {
  it.skipIf(!chromium)('percorre sede, casa, cidade, lugares, mundo, pausa, ajuda, busca e bolso sem achado novo', () => {
    const out = join(mkdtempSync(join(tmpdir(), 'qa5-')), 'robo.json');
    const r = spawnSync(process.execPath, ['scripts/r31/qa5.mjs', '--quick', '--out', out], { encoding: 'utf8', timeout: 900_000 });
    const rep = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) as { rows: { key: string; detail: string; known: string | null }[] } : { rows: [] };
    const fresh = rep.rows.filter((x) => !x.known).map((x) => `${x.key} · ${x.detail}`);
    expect(fresh, r.stdout + r.stderr).toEqual([]);
    expect(r.status, r.stdout + r.stderr).toBe(0);
  }, 900_000);
});
