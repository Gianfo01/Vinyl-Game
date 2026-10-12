// Rodada 25 — Pixel Studio: faixas de abas internas (vis.ts tabs()).
// r27: sem teto de 5 abas e sem "Mais ▾" — toda aba fica visível na faixa (quebrando linha), e o menu em árvore
// (ps/tree27.ts) e a busca (Ctrl+K) também listam todas. Aqui sobra só fechar menus "Mais" antigos ao clicar fora.

export function installTabs25(): void {
  if (typeof document === 'undefined') return;
  document.addEventListener('click', (e) => {
    for (const d of document.querySelectorAll<HTMLDetailsElement>('details.more25[open]')) if (!d.contains(e.target as Node)) d.open = false;
  });
}
