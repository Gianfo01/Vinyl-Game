// Cena musical em pixel art (320x180), desenhada por código, para a tela inicial e a prévia da nova run.
// opts: { era: 1905|1962|1985|2025, city: 'londres'|'rio'|'ny', career: 'gravadora'|'artista'|'festival' }
(function () {
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function drawScene(cv, o) {
    o = Object.assign({ era: 1962, city: 'londres', career: 'artista', seed: 7 }, o || {});
    const W = 320, H = 180; cv.width = W; cv.height = H;
    const g = cv.getContext('2d'); const r = rng(o.seed);
    const P = (x, y, c) => { g.fillStyle = c; g.fillRect(x | 0, y | 0, 1, 1); };
    const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x | 0, y | 0, w | 0, h | 0); };
    const era = o.era;
    // céu em faixas com pontilhado
    const sky = era < 1930 ? ['#1a1430', '#2a1e44', '#3e2a52', '#5a3a5a'] : era < 1975 ? ['#0e1430', '#1a1e4a', '#2c2a62', '#4a3070'] : era < 2005 ? ['#120a2a', '#2a0f44', '#4a1458', '#7a2060'] : ['#06101e', '#0a1e3a', '#123458', '#1e5070'];
    for (let y = 0; y < 120; y++) { const b = Math.min(3, (y / 30) | 0); for (let x = 0; x < W; x++) { const c = (y % 30 > 24 && (x + y) % 2) ? sky[Math.min(3, b + 1)] : sky[b]; P(x, y, c); } }
    // estrelas
    for (let i = 0; i < 70; i++) P(r() * W, r() * 70, r() > .8 ? '#ffffff' : '#9aa8d8');
    // lua = disco de vinil
    const cx = 248, cy = 38, rr = 26;
    for (let y = -rr; y <= rr; y++) for (let x = -rr; x <= rr; x++) { const d = Math.hypot(x, y); if (d <= rr) { let c = '#14121a'; if (d > rr - 1.2) c = '#3a3648'; else if (d < 9) c = era < 1975 ? '#c0392b' : era < 2005 ? '#f0c040' : '#2ec8c0'; else if ((d | 0) % 3 === 0) c = '#24222e'; if (d < 1.6) c = '#0a0a10'; if (x < -6 && y < -6 && d > 12 && d < 20 && (x + y) % 3 === 0) c = '#5a566a'; P(cx + x, cy + y, c); } }
    // notas musicais no céu
    const note = (x, y, c) => { R(x, y, 1, 7, c); R(x - 3, y + 6, 4, 3, c); R(x + 1, y, 3, 1, c); R(x + 3, y + 1, 1, 2, c); };
    note(60, 22, '#f0c060'); note(120, 12, '#e05a8a'); note(176, 30, '#7fd0ff'); note(30, 52, '#9ad07a');
    // skyline
    const sk = o.city === 'rio' ? 'rio' : o.city === 'ny' ? 'ny' : 'londres';
    let x0 = 0;
    while (x0 < W) {
      const w = 10 + (r() * 18 | 0); let h = 26 + (r() * (sk === 'ny' ? 50 : 30) | 0);
      if (era < 1930) h = 18 + (r() * 22 | 0);
      const col = era < 1975 ? '#1e1a34' : '#1a1430';
      R(x0, 120 - h, w, h, col); R(x0, 120 - h, w, 1, '#2e2a4a');
      for (let yy = 120 - h + 3; yy < 116; yy += 4) for (let xx = x0 + 2; xx < x0 + w - 2; xx += 3) if (r() > .55) R(xx, yy, 1, 2, era < 2005 ? '#f0c060' : '#9ad8ff');
      x0 += w + 1;
    }
    if (sk === 'londres') { R(40, 58, 8, 62, '#241e3a'); R(38, 52, 12, 8, '#241e3a'); R(42, 46, 4, 6, '#241e3a'); R(41, 62, 6, 6, '#f0e0a0'); }
    if (sk === 'rio') { for (let i = 0; i < 40; i++) R(10 + i, 120 - Math.max(0, 40 - Math.abs(i - 20) * 2), 1, 40, '#22324a'); R(29, 68, 3, 10, '#d8d8e8'); R(25, 70, 11, 2, '#d8d8e8'); }
    // letreiro neon / LED
    const sign = era < 1930 ? '#e8d8a0' : era < 2005 ? '#ff4fa0' : '#4ff0ff';
    R(96, 64, 64, 14, '#0a0a14'); R(96, 64, 64, 1, sign); R(96, 77, 64, 1, sign); R(96, 64, 1, 14, sign); R(159, 64, 1, 14, sign);
    g.font = 'bold 9px monospace'; g.textBaseline = 'top'; g.fillStyle = sign; g.textAlign = 'center'; g.fillText(era < 1930 ? 'RÁDIO' : era < 2005 ? 'AO VIVO' : 'STREAM', 128, 66);
    // palco
    R(0, 120, W, 60, '#1c1424');
    R(40, 118, 240, 8, '#5a3a24'); R(40, 118, 240, 1, '#8a5a34'); R(40, 126, 240, 4, '#2e1e14');
    // fachos de luz
    g.globalAlpha = .18; g.fillStyle = era < 2005 ? '#fff0b0' : '#9ad8ff';
    for (const lx of [90, 160, 230]) { g.beginPath(); g.moveTo(lx, 0); g.lineTo(lx - 26, 118); g.lineTo(lx + 26, 118); g.closePath(); g.fill(); }
    g.globalAlpha = 1;
    // equipamento por época
    if (era < 1930) {
      // gramofone com corneta + piano
      R(60, 100, 16, 18, '#5a3a24'); R(64, 96, 8, 4, '#2a2018'); for (let i = 0; i < 12; i++) R(70 + i, 84 - i, 2 + i, 2, '#d4a017');
      R(200, 98, 40, 20, '#1a1214'); R(200, 98, 40, 2, '#3a3040'); for (let i = 0; i < 18; i++) R(202 + i * 2, 108, 1, 6, i % 3 ? '#f4f0e0' : '#1a1214');
    } else if (era < 2005) {
      // pilhas de amplificador + bateria
      for (const ax of [50, 250]) { R(ax, 86, 20, 32, '#141218'); R(ax + 2, 88, 16, 13, '#2a2832'); R(ax + 2, 103, 16, 13, '#2a2832'); for (let yy = 89; yy < 116; yy += 2) R(ax + 3, yy, 14, 1, '#1e1c24'); R(ax, 86, 20, 2, era < 1975 ? '#c8a060' : '#888'); }
      R(146, 104, 22, 14, '#c0392b'); R(150, 108, 14, 6, '#f4f0e0'); R(138, 100, 8, 6, '#c0392b'); R(170, 100, 8, 6, '#c0392b'); R(134, 94, 10, 1, '#f0c040'); R(172, 92, 10, 1, '#f0c040');
    } else {
      // telão de LED + mesa de DJ
      R(110, 80, 100, 34, '#0a1a2a'); for (let yy = 82; yy < 112; yy += 2) for (let xx = 112; xx < 208; xx += 2) if ((xx + yy) % 7 < 3) P(xx, yy, ['#2ec8c0', '#e05a8a', '#f0c040'][(xx + yy) % 3]);
      R(140, 108, 40, 10, '#2a2832'); R(142, 109, 10, 6, '#111'); R(168, 109, 10, 6, '#111'); P(147, 112, '#2ec8c0'); P(173, 112, '#2ec8c0');
    }
    // músicos (silhuetas com cor)
    const person = (x, y, body, hair, inst) => {
      R(x + 2, y, 5, 5, '#f0c8a0'); R(x + 1, y - 1, 7, 2, hair); R(x + 1, y + 5, 7, 9, body); R(x + 2, y + 14, 2, 6, '#1a1a2a'); R(x + 5, y + 14, 2, 6, '#1a1a2a');
      if (inst === 'guit') { R(x + 4, y + 9, 9, 2, '#8a5030'); R(x + 1, y + 8, 5, 5, '#c0392b'); }
      if (inst === 'mic') { R(x + 10, y + 2, 1, 16, '#888'); R(x + 9, y + 1, 3, 2, '#ccc'); }
    };
    if (era < 1930) { person(92, 98, '#2c2a3a', '#2a1a10', 'mic'); person(212, 90, '#5a2a2a', '#3a2a1a'); }
    else if (era < 2005) { person(100, 98, '#2a5ad0', '#2a1a10', 'guit'); person(180, 98, '#8e44ad', '#d4a017', 'mic'); person(214, 98, '#2c7a3c', '#1a1214', 'guit'); }
    else { person(156, 90, '#1e1e2a', '#e05a8a'); person(96, 98, '#e0e0e8', '#1a1214', 'mic'); }
    // plateia com mãos para cima
    for (let i = 0; i < 46; i++) {
      const px = i * 7 + (r() * 3 | 0), py = 140 + (r() * 6 | 0), c = ['#3a2a4e', '#4a345a', '#5a3e66'][i % 3];
      R(px, py, 6, 5, c); R(px - 1, py + 5, 8, 40, c);
      if (r() > .55) { R(px + (r() > .5 ? -2 : 6), py - 8, 2, 9, c); }
      if (era >= 2005 && r() > .8) R(px + 6, py - 10, 2, 3, '#9ad8ff');
    }
    for (let i = 0; i < 52; i++) { const px = i * 6 + 3, py = 156 + (r() * 5 | 0); R(px, py, 6, 6, '#241830'); R(px - 1, py + 6, 8, 30, '#241830'); }
    // isqueiro / celular acesos
    for (let i = 0; i < 9; i++) { const px = 10 + r() * 300, py = 128 + r() * 10; R(px, py, 1, 2, era < 2005 ? '#ffd76a' : '#9ad8ff'); }
  }
  window.drawScene = drawScene;
})();
