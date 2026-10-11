// Rodada 21 (I-10): laço de animação que só roda com o canvas visível (IntersectionObserver) e a aba em primeiro
// plano (document.hidden) — o mesmo esquema de campus18/scenes14 para palco, festival, locais e cine18.
// `step(now)` é chamado a cada quadro enquanto o elemento está ligado ao DOM; devolve false para encerrar de vez.

export function visLoop21(el: HTMLElement, step: (now: number) => boolean | void): () => void {
  if (typeof requestAnimationFrame !== 'function') return () => {};
  let visible = typeof IntersectionObserver !== 'function';
  let running = false, started = false, stopped = false, raf = 0;
  const loop = (now: number) => {
    if (stopped) return;
    if (started && !el.isConnected) { running = false; stop(); return; }
    started = true;
    if (!visible || document.hidden) { running = false; return; }
    if (step(now) === false) { running = false; stop(); return; }
    raf = requestAnimationFrame(loop);
  };
  const kick = () => { if (!running && !stopped && visible && !document.hidden) { running = true; raf = requestAnimationFrame(loop); } };
  const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver((es) => { visible = es.some((x) => x.isIntersecting); kick(); }) : null;
  const onVis = () => kick();
  document.addEventListener('visibilitychange', onVis);
  function stop(): void {
    stopped = true;
    cancelAnimationFrame(raf);
    io?.disconnect();
    document.removeEventListener('visibilitychange', onVis);
  }
  if (io) io.observe(el); else kick();
  return stop;
}
