import * as THREE from "three";
import { DrawingBall } from "./types";

export interface BallColorInfo {
  bg: string;
  light: string;
  dark: string;
  glow: string;
  text: string;
  badgeBg: string;
  gradient: string;
}

export function getBallColor(num: number): BallColorInfo {
  if (num <= 9) {
    return {
      bg: "#e11d48", // Crimson Ruby Red
      light: "#fb7185",
      dark: "#881337",
      glow: "rgba(225, 29, 72, 0.45)",
      text: "#0f172a",
      badgeBg: "#ffffff",
      gradient: "radial-gradient(circle at 35% 28%, #fb7185 0%, #e11d48 55%, #881337 100%)"
    };
  }
  if (num <= 19) {
    return {
      bg: "#2563eb", // Royal Sapphire Blue
      light: "#60a5fa",
      dark: "#1e3a8a",
      glow: "rgba(37, 99, 235, 0.45)",
      text: "#0f172a",
      badgeBg: "#ffffff",
      gradient: "radial-gradient(circle at 35% 28%, #60a5fa 0%, #2563eb 55%, #1e3a8a 100%)"
    };
  }
  if (num <= 29) {
    return {
      bg: "#059669", // Emerald Jade Green
      light: "#34d399",
      dark: "#064e3b",
      glow: "rgba(5, 150, 105, 0.45)",
      text: "#0f172a",
      badgeBg: "#ffffff",
      gradient: "radial-gradient(circle at 35% 28%, #34d399 0%, #059669 55%, #064e3b 100%)"
    };
  }
  if (num <= 39) {
    return {
      bg: "#ea580c", // Vibrant Sunset Orange
      light: "#fb923c",
      dark: "#7c2d12",
      glow: "rgba(234, 88, 12, 0.45)",
      text: "#0f172a",
      badgeBg: "#ffffff",
      gradient: "radial-gradient(circle at 35% 28%, #fb923c 0%, #ea580c 55%, #7c2d12 100%)"
    };
  }
  if (num <= 49) {
    return {
      bg: "#9333ea", // Royal Amethyst Purple
      light: "#c084fc",
      dark: "#581c87",
      glow: "rgba(147, 51, 234, 0.45)",
      text: "#0f172a",
      badgeBg: "#ffffff",
      gradient: "radial-gradient(circle at 35% 28%, #c084fc 0%, #9333ea 55%, #581c87 100%)"
    };
  }
  if (num <= 59) {
    return {
      bg: "#d97706", // Imperial Golden Amber
      light: "#fbbf24",
      dark: "#78350f",
      glow: "rgba(217, 119, 6, 0.45)",
      text: "#0f172a",
      badgeBg: "#ffffff",
      gradient: "radial-gradient(circle at 35% 28%, #fbbf24 0%, #d97706 55%, #78350f 100%)"
    };
  }
  return {
    bg: "#0891b2", // Electric Cyan
    light: "#22d3ee",
    dark: "#164e63",
    glow: "rgba(8, 145, 178, 0.45)",
    text: "#0f172a",
    badgeBg: "#ffffff",
    gradient: "radial-gradient(circle at 35% 28%, #22d3ee 0%, #0891b2 55%, #164e63 100%)"
  };
}

export function createBallData(totalBalls: number): DrawingBall[] {
  const balls: DrawingBall[] = [];
  for (let i = 1; i <= totalBalls; i++) {
    const colorInfo = getBallColor(i);
    balls.push({
      id: i,
      number: i,
      formatted: i.toString().padStart(2, "0"),
      color: colorInfo.bg,
      textColor: colorInfo.text
    });
  }
  return balls;
}

const textureCache = new Map<number, THREE.CanvasTexture>();

export function createBallTexture(ballNumber: number): THREE.CanvasTexture {
  if (textureCache.has(ballNumber)) {
    return textureCache.get(ballNumber)!;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas);
    return fallback;
  }

  const { bg, text, badgeBg } = getBallColor(ballNumber);
  const numStr = ballNumber.toString().padStart(2, "0");

  // Background base color
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Rich 3D spherical gloss gradient across the texture
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, "rgba(255, 255, 255, 0.32)");
  grad.addColorStop(0.3, "rgba(255, 255, 255, 0.08)");
  grad.addColorStop(0.7, "rgba(0, 0, 0, 0.05)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0.35)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw 2 circular number badges (front and back of sphere)
  const badgePositions = [
    { x: 128, y: 128 },
    { x: 384, y: 128 }
  ];

  badgePositions.forEach(({ x, y }) => {
    // Outer subtle drop shadow ring
    ctx.beginPath();
    ctx.arc(x, y, 82, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fill();

    // Metallic gold / chrome outer rim
    const rimGrad = ctx.createLinearGradient(x - 80, y - 80, x + 80, y + 80);
    rimGrad.addColorStop(0, "rgba(255, 255, 255, 0.9)");
    rimGrad.addColorStop(0.5, "rgba(200, 200, 200, 0.5)");
    rimGrad.addColorStop(1, "rgba(100, 100, 100, 0.8)");
    ctx.beginPath();
    ctx.arc(x, y, 80, 0, Math.PI * 2);
    ctx.fillStyle = rimGrad;
    ctx.fill();

    // Outer white badge
    ctx.beginPath();
    ctx.arc(x, y, 76, 0, Math.PI * 2);
    ctx.fillStyle = badgeBg;
    ctx.fill();

    // Inner thin ring with ball color
    ctx.beginPath();
    ctx.arc(x, y, 70, 0, Math.PI * 2);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = bg;
    ctx.stroke();

    // Draw bold number text centered
    ctx.fillStyle = text;
    ctx.font = "900 68px 'Inter', system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(numStr, x, y);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  textureCache.set(ballNumber, texture);
  return texture;
}

export function clearTextureCache() {
  textureCache.forEach((tex) => tex.dispose());
  textureCache.clear();
}
