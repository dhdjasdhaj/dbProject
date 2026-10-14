import { useEffect, useRef } from "react";

/** Decorative, local canvas; respects reduced motion and pauses in hidden tabs. */
export default function StudioAtmosphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0,
      height = 0,
      frame = 0,
      previous = 0;
    let particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
    }[] = [];
    const pointer = { x: -1000, y: -1000 };
    const draw = (time: number) => {
      if (time - previous >= 33 || preference.matches) {
        previous = time;
        ctx.clearRect(0, 0, width, height);
        for (const p of particles) {
          if (!preference.matches) {
            p.x = (p.x + p.vx + width) % width;
            p.y = (p.y + p.vy + height) % height;
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(235,249,255,0.55)";
          ctx.fill();
        }
        for (let i = 0; i < particles.length; i++) {
          const a = particles[i];
          for (let j = i + 1; j < particles.length; j++) {
            const b = particles[j],
              distance = Math.hypot(a.x - b.x, a.y - b.y);
            if (distance > 135) continue;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(210,242,255,${(1 - distance / 135) * 0.17})`;
            ctx.stroke();
          }
          if (
            !preference.matches &&
            Math.hypot(a.x - pointer.x, a.y - pointer.y) < 180
          ) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.strokeStyle = "rgba(220,250,255,0.18)";
            ctx.stroke();
          }
        }
      }
      if (!preference.matches && !document.hidden)
        frame = requestAnimationFrame(draw);
    };
    const resize = () => {
      cancelAnimationFrame(frame);
      width = innerWidth;
      height = innerHeight;
      const density = Math.min(devicePixelRatio, 1.5);
      canvas.width = width * density;
      canvas.height = height * density;
      ctx.setTransform(density, 0, 0, density, 0, 0);
      particles = Array.from({ length: width < 700 ? 22 : 65 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: -0.12 - Math.random() * 0.2,
        radius: 0.7 + Math.random() * 1.2,
      }));
      previous = 0;
      draw(performance.now());
    };
    const move = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    };
    const resume = () => {
      cancelAnimationFrame(frame);
      previous = 0;
      if (!document.hidden) draw(performance.now());
    };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("visibilitychange", resume);
    preference.addEventListener("change", resume);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("visibilitychange", resume);
      preference.removeEventListener("change", resume);
    };
  }, []);
  return (
    <div className="studio-atmosphere" aria-hidden="true">
      <div className="studio-aurora" />
      <canvas ref={canvasRef} />
    </div>
  );
}
