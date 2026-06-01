import { useEffect, useRef } from 'react';

const BASES = ['A', 'T', 'C', 'G'];
const MAX_DIST = 160;

type Node = { x: number; y: number; vx: number; vy: number; big: boolean };
type Base = { x: number; y: number; vy: number; char: string; alpha: number };

export function EvoBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let nodes: Node[] = [];
    let bases: Base[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    const init = () => {
      resize();
      const count = Math.min(Math.floor((canvas.width * canvas.height) / 16000), 60);
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        big: Math.random() < 0.18,
      }));

      const baseCount = Math.floor(canvas.width / 55);
      bases = Array.from({ length: baseCount }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vy: 0.18 + Math.random() * 0.28,
        char: BASES[Math.floor(Math.random() * 4)],
        alpha: 0.04 + Math.random() * 0.05,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Floating ATCG bases
      ctx.font = '13px "Sora", monospace';
      bases.forEach((b) => {
        b.y += b.vy;
        if (b.y > canvas.height + 20) {
          b.y = -20;
          b.x = Math.random() * canvas.width;
          b.char = BASES[Math.floor(Math.random() * 4)];
        }
        ctx.fillStyle = `rgba(155, 123, 255, ${b.alpha})`;
        ctx.fillText(b.char, b.x, b.y);
      });

      // Move nodes
      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      });

      // Connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.11;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(180, 160, 255, ${alpha})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }

      // Nodes
      nodes.forEach((n) => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.big ? 3 : 1.6, 0, Math.PI * 2);
        ctx.fillStyle = n.big
          ? 'rgba(155, 123, 255, 0.45)'
          : 'rgba(220, 210, 255, 0.22)';
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    };

    init();
    draw();

    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
