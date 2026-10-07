"use client";

import React, { useEffect, useRef } from "react";

interface FireworksProps {
  active: boolean;
  durationSeconds?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  gravity: number;
  flicker: boolean;
  shape: "circle" | "star" | "confetti";
  rotation: number;
  rotSpeed: number;
  w?: number;
  h?: number;
}

interface Rocket {
  x: number;
  y: number;
  targetY: number;
  vx: number;
  vy: number;
  color: string;
  trail: { x: number; y: number; alpha: number }[];
}

const FIREWORK_COLORS = [
  "#ff1a40", // Ruby
  "#ff8800", // Gold-Orange
  "#ffd700", // Yellow-Gold
  "#00ff88", // Emerald
  "#00d4ff", // Cyan
  "#7a00ff", // Purple
  "#ff00b7", // Hot Pink
  "#ffffff"  // White Sparkle
];

export default function FireworksCelebration({ active, durationSeconds = 6 }: FireworksProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let isRunning = true;
    const startTime = performance.now();

    const resize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: Particle[] = [];
    const rockets: Rocket[] = [];

    const createExplosion = (x: number, y: number, baseColor?: string) => {
      const color = baseColor || FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
      const particleCount = 70 + Math.floor(Math.random() * 50);

      // 1. Core explosion sparks
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2.5 + Math.random() * 7.5;
        const particleColor = Math.random() < 0.25 ? "#ffffff" : Math.random() < 0.35 ? "#ffd700" : color;

        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: particleColor,
          size: 2.2 + Math.random() * 2.8,
          alpha: 1,
          decay: 0.012 + Math.random() * 0.016,
          gravity: 0.08,
          flicker: Math.random() > 0.4,
          shape: Math.random() > 0.3 ? "circle" : "star",
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.2
        });
      }

      // 2. Confetti ribbons
      for (let i = 0; i < 25; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 4.5;
        const confettiColor = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];

        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: confettiColor,
          size: 4,
          w: 6 + Math.random() * 6,
          h: 4 + Math.random() * 4,
          alpha: 1,
          decay: 0.007 + Math.random() * 0.01,
          gravity: 0.05,
          flicker: false,
          shape: "confetti",
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.3
        });
      }
    };

    const launchRocket = () => {
      const w = canvas.width;
      const h = canvas.height;
      const x = w * 0.15 + Math.random() * (w * 0.7);
      const targetY = h * 0.12 + Math.random() * (h * 0.38);
      const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];

      rockets.push({
        x,
        y: h,
        targetY,
        vx: (Math.random() - 0.5) * 2.5,
        vy: -(9 + Math.random() * 4.5),
        color,
        trail: []
      });
    };

    // Launch initial burst
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        if (isRunning) launchRocket();
      }, i * 250);
    }

    let lastRocketTime = performance.now();

    const drawStar = (context: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
      let rot = (Math.PI / 2) * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;

      context.beginPath();
      context.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        context.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        context.lineTo(x, y);
        rot += step;
      }
      context.lineTo(cx, cy - outerRadius);
      context.closePath();
      context.fill();
    };

    const loop = (now: number) => {
      if (!isRunning) return;

      const elapsed = (now - startTime) / 1000;
      if (elapsed > durationSeconds && particles.length === 0 && rockets.length === 0) {
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Periodically spawn new rockets while within duration
      if (elapsed < durationSeconds && now - lastRocketTime > 400 + Math.random() * 350) {
        launchRocket();
        if (Math.random() > 0.4) launchRocket();
        lastRocketTime = now;
      }

      // Update & Render Rockets
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.x += r.vx;
        r.y += r.vy;
        r.vy += 0.05; // slight rocket deceleration

        r.trail.push({ x: r.x, y: r.y, alpha: 1.0 });
        if (r.trail.length > 8) r.trail.shift();

        // Draw trail
        for (let t = 0; t < r.trail.length; t++) {
          const pt = r.trail[t];
          pt.alpha *= 0.85;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 230, 150, ${pt.alpha})`;
          ctx.fill();
        }

        // Draw rocket head
        ctx.beginPath();
        ctx.arc(r.x, r.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = r.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;

        if (r.y <= r.targetY || r.vy >= -1) {
          createExplosion(r.x, r.y, r.color);
          rockets.splice(i, 1);
        }
      }

      // Update & Render Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.985;
        p.alpha -= p.decay;
        p.rotation += p.rotSpeed;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        const renderAlpha = p.flicker && Math.random() > 0.3 ? p.alpha * 0.4 : p.alpha;
        ctx.save();
        ctx.globalAlpha = renderAlpha;
        ctx.fillStyle = p.color;

        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === "star") {
          drawStar(ctx, p.x, p.y, 4, p.size * 1.5, p.size * 0.6);
        } else if (p.shape === "confetti" && p.w && p.h) {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.restore();
      }

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, [active, durationSeconds]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[100] w-full h-full"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
