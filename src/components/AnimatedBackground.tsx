import { useEffect, useRef } from 'react';

const WAVES = [
  { amp: 45,  freq: 0.0055, speed: 0.5,  phase: 0,           alpha: 0.22, lw: 2.2 },
  { amp: 28,  freq: 0.0090, speed: 0.7,  phase: Math.PI,     alpha: 0.16, lw: 1.6 },
  { amp: 65,  freq: 0.0035, speed: 0.3,  phase: 1.3,         alpha: 0.10, lw: 1.2 },
  { amp: 18,  freq: 0.0150, speed: 1.1,  phase: 2.6,         alpha: 0.18, lw: 1.4 },
  { amp: 35,  freq: 0.0065, speed: 0.4,  phase: 4.2,         alpha: 0.12, lw: 1.8 },
];

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let raf = 0;
    let tick = 0;

    // Set canvas buffer = CSS size (keeps it simple & reliable)
    const sync = () => {
      canvas.width  = canvas.clientWidth  || window.innerWidth;
      canvas.height = canvas.clientHeight || window.innerHeight;
    };
    sync();

    const ro = new ResizeObserver(sync);
    ro.observe(canvas);

    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) { raf = requestAnimationFrame(draw); return; }

      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const baseY = H * 0.5;

      WAVES.forEach((w, i) => {
        // Stagger each wave vertically so they fan out
        const offsetY = (i % 2 === 0 ? -1 : 1) * H * 0.07 * i;

        ctx.beginPath();
        for (let x = 0; x <= W + 2; x += 2) {
          const y =
            baseY + offsetY +
            Math.sin(x * w.freq + tick * w.speed * 0.04 + w.phase) * w.amp +
            Math.sin(x * w.freq * 0.41 + tick * w.speed * 0.025) * w.amp * 0.4;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        // Gradient that fades to transparent at both edges
        const g = ctx.createLinearGradient(0, 0, W, 0);
        g.addColorStop(0,    'rgba(225,29,72,0)');
        g.addColorStop(0.08, `rgba(225,29,72,${w.alpha})`);
        g.addColorStop(0.5,  `rgba(225,29,72,${w.alpha})`);
        g.addColorStop(0.92, `rgba(225,29,72,${w.alpha})`);
        g.addColorStop(1,    'rgba(225,29,72,0)');

        ctx.strokeStyle = g;
        ctx.lineWidth   = w.lw;
        ctx.lineJoin    = 'round';
        ctx.stroke();
      });

      // ── Travelling dot on primary wave ─────────────────────────────
      const dotProgress = (tick * 1.2) % (W + 80) - 40;
      const dotY =
        baseY +
        Math.sin(dotProgress * WAVES[0].freq + tick * WAVES[0].speed * 0.04 + WAVES[0].phase) * WAVES[0].amp;

      // Outer glow
      const glow = ctx.createRadialGradient(dotProgress, dotY, 0, dotProgress, dotY, 14);
      glow.addColorStop(0,   'rgba(225,29,72,0.28)');
      glow.addColorStop(0.5, 'rgba(225,29,72,0.10)');
      glow.addColorStop(1,   'rgba(225,29,72,0)');
      ctx.beginPath();
      ctx.arc(dotProgress, dotY, 14, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      // Core dot
      ctx.beginPath();
      ctx.arc(dotProgress, dotY, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(225,29,72,0.7)';
      ctx.fill();

      tick++;
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <>
      {/* CSS graph-paper grid */}
      <div className="landing-grid-bg" aria-hidden="true" />
      {/* Canvas wave overlay */}
      <canvas ref={canvasRef} className="landing-wave-canvas" aria-hidden="true" />
    </>
  );
}
