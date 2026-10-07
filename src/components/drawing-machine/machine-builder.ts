import * as THREE from "three";
import {
  MachineConfig,
  TUBE_TOP_Y
} from "./types";

export interface Machine3DComponents {
  rootGroup: THREE.Group;
  drumGroup: THREE.Group;
  paddleGroup: THREE.Group;
  tubesGroup: THREE.Group;
  gateMesh: THREE.Mesh;
  loadingGateMeshes: THREE.Mesh[];
  trayGroup: THREE.Group;
  chuteMesh: THREE.Mesh;
  traySlotPositions: THREE.Vector3[];
  chutePath: THREE.CatmullRomCurve3;
  lights: THREE.Light[];
  materialsToDispose: THREE.Material[];
  geometriesToDispose: THREE.BufferGeometry[];
  goldAccentMat: THREE.MeshStandardMaterial;
  rimLightMeshes: THREE.Mesh[];
  rimLightMaterials: THREE.MeshStandardMaterial[];
  logoMat: THREE.MeshStandardMaterial;
  nameplateMat: THREE.MeshStandardMaterial;
  tipAccentMat: THREE.MeshStandardMaterial;
  trayBadgeMaterials: THREE.MeshStandardMaterial[];
  chuteGlassMat: THREE.MeshPhysicalMaterial;
  stageNeonMaterials: THREE.MeshStandardMaterial[];
  stageMovingSpotlights: { light: THREE.SpotLight; target: THREE.Object3D; baseAngle: number; speed: number }[];
  stageParticleSystem: THREE.Points;
  stageParticlePositions: Float32Array;
  stageParticleBaseColors: Float32Array;
  backdropNeonMat: THREE.MeshStandardMaterial;
  stageFloorMat: THREE.MeshStandardMaterial;
  stagePodiumMat: THREE.MeshStandardMaterial;
}

export function drawVectorStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes = 5,
  outerRadius = 22,
  innerRadius = 10,
  rotation = 0
) {
  let rot = (Math.PI / 2) * 3 + rotation;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.closePath();
}

export function drawBiplotStarBall(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  accentHex = "#f59e0b"
) {
  ctx.save();
  // Soft atmospheric crimson glow
  ctx.shadowColor = "#ff2d46";
  ctx.shadowBlur = radius * 0.45;

  // 5 curved spherical petal facets that form a dynamic star cutout
  const numPetals = 5;
  const innerR = radius * 0.38;
  const outerR = radius;

  for (let i = 0; i < numPetals; i++) {
    const angleStart = (i * Math.PI * 2) / numPetals - Math.PI / 2;
    const angleEnd = ((i + 1) * Math.PI * 2) / numPetals - Math.PI / 2;
    const midAngle = (angleStart + angleEnd) / 2;

    const grad = ctx.createRadialGradient(
      cx + Math.cos(midAngle) * (radius * 0.4),
      cy + Math.sin(midAngle) * (radius * 0.4),
      radius * 0.08,
      cx,
      cy,
      radius
    );
    grad.addColorStop(0, "#ff4d62");
    grad.addColorStop(0.45, "#e60026");
    grad.addColorStop(1, "#800010");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, angleStart + 0.09, angleEnd - 0.09);
    const starValleyAngle = angleEnd;
    const starPointAngle = angleStart;
    ctx.lineTo(cx + Math.cos(starValleyAngle) * (innerR * 0.72), cy + Math.sin(starValleyAngle) * (innerR * 0.72));
    ctx.lineTo(cx + Math.cos(midAngle) * (innerR * 1.38), cy + Math.sin(midAngle) * (innerR * 1.38));
    ctx.lineTo(cx + Math.cos(starPointAngle) * (innerR * 0.72), cy + Math.sin(starPointAngle) * (innerR * 0.72));
    ctx.closePath();
    ctx.fill();

    // Metallic highlight rim on each facet
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = Math.max(1, radius * 0.03);
    ctx.stroke();
  }

  // Pure brilliant center star
  ctx.save();
  ctx.shadowColor = accentHex;
  ctx.shadowBlur = radius * 0.35;
  ctx.fillStyle = "#ffffff";
  drawVectorStar(ctx, cx, cy, 5, innerR * 0.95, innerR * 0.46, -Math.PI / 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

// --- 1. LEFT FLANK LOGO: "LỤMLOTT • LỤM LÚA ĐẦY TÚI" (Golden Fortune Bag & Lucky Coins) ---
export function draw3DLumLottGoldenVaultLogo(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  accentHex = "#f59e0b"
) {
  ctx.save();

  // 1. Sleek Cyber Glass Backing Disc (Radius 145px)
  const gradDisc = ctx.createRadialGradient(cx, cy, 20, cx, cy, 145);
  gradDisc.addColorStop(0, "rgba(255, 255, 255, 0.08)");
  gradDisc.addColorStop(0.55, "rgba(18, 14, 28, 0.75)");
  gradDisc.addColorStop(1, "rgba(6, 4, 12, 0.95)");
  ctx.fillStyle = gradDisc;
  ctx.beginPath();
  ctx.arc(cx, cy, 145, 0, Math.PI * 2);
  ctx.fill();

  // 2. 3D Brushed Gold Royal Laurel & Diamond Bezel Outer Rim (Radius 128px)
  const bezelR = 128;
  const rimGrad = ctx.createRadialGradient(cx - 25, cy - 25, 15, cx, cy, bezelR);
  rimGrad.addColorStop(0, "#fef08a");
  rimGrad.addColorStop(0.35, "#f59e0b");
  rimGrad.addColorStop(0.7, "#b45309");
  rimGrad.addColorStop(1, "#78350f");

  ctx.save();
  ctx.shadowColor = accentHex;
  ctx.shadowBlur = 18;
  ctx.fillStyle = rimGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, bezelR, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#fef08a";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();

  // Inner Dark Obsidian Disc (Radius 112px)
  const innerR = 112;
  const innerGrad = ctx.createRadialGradient(cx, cy, 15, cx, cy, innerR);
  innerGrad.addColorStop(0, "#18181b");
  innerGrad.addColorStop(0.75, "#0c0a09");
  innerGrad.addColorStop(1, "#050403");
  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fill();

  // 3. 3D Golden Fortune Bag (Túi Vàng May Mắn)
  const bagX = cx;
  const bagY = cy - 22;

  // Golden glowing aura behind bag
  ctx.save();
  ctx.shadowColor = "#f59e0b";
  ctx.shadowBlur = 24;
  const bagGrad = ctx.createRadialGradient(bagX - 12, bagY - 10, 8, bagX, bagY, 48);
  bagGrad.addColorStop(0, "#fef08a");
  bagGrad.addColorStop(0.4, "#f59e0b");
  bagGrad.addColorStop(0.8, "#b45309");
  bagGrad.addColorStop(1, "#78350f");
  ctx.fillStyle = bagGrad;

  // Fortune bag plump body
  ctx.beginPath();
  ctx.ellipse(bagX, bagY + 8, 38, 30, 0, 0, Math.PI * 2);
  ctx.fill();

  // Fortune bag ruffled top pouch
  ctx.beginPath();
  ctx.moveTo(bagX - 26, bagY - 14);
  ctx.quadraticCurveTo(bagX, bagY - 32, bagX + 26, bagY - 14);
  ctx.lineTo(bagX + 20, bagY - 6);
  ctx.lineTo(bagX - 20, bagY - 6);
  ctx.closePath();
  ctx.fill();

  // Silk Red Ribbon Knot
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.roundRect(bagX - 18, bagY - 10, 36, 8, 4);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bagX, bagY - 6, 6, 0, Math.PI * 2);
  ctx.fill();

  // Gold Star on Fortune Bag
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "#ffffff";
  ctx.shadowBlur = 10;
  drawVectorStar(ctx, bagX, bagY + 8, 5, 14, 6);
  ctx.fill();
  ctx.restore();

  // 4. Overflowing 3D Gold Coins Spilling Over
  const drawCoin = (x: number, y: number, r: number, rot = 0) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 10;
    const cGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r);
    cGrad.addColorStop(0, "#fef9c3");
    cGrad.addColorStop(0.5, "#f59e0b");
    cGrad.addColorStop(1, "#92400e");
    ctx.fillStyle = cGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fef08a";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  };

  drawCoin(bagX - 42, bagY + 18, 14, -0.3);
  drawCoin(bagX + 40, bagY + 16, 15, 0.25);
  drawCoin(bagX - 28, bagY + 28, 12, 0.15);
  drawCoin(bagX + 26, bagY + 28, 13, -0.2);

  // Diamond sparkles
  const drawSparkle = (sx: number, sy: number, sz: number) => {
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(sx, sy - sz);
    ctx.quadraticCurveTo(sx, sy, sx + sz, sy);
    ctx.quadraticCurveTo(sx, sy, sx, sy + sz);
    ctx.quadraticCurveTo(sx, sy, sx - sz, sy);
    ctx.quadraticCurveTo(sx, sy, sx, sy - sz);
    ctx.fill();
    ctx.restore();
  };

  drawSparkle(bagX - 36, bagY - 22, 9);
  drawSparkle(bagX + 38, bagY - 18, 11);
  drawSparkle(bagX + 48, bagY + 6, 7);

  // 5. Bold Stylized "Lụmlott" Typography
  ctx.save();
  ctx.font = "900 40px 'Montserrat', 'Segoe UI', 'Arial', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const brandY = cy + 18;

  ctx.strokeStyle = "#271206";
  ctx.lineWidth = 7;
  ctx.strokeText("Lụmlott", cx, brandY);

  const brandGrad = ctx.createLinearGradient(cx, brandY - 20, cx, brandY + 20);
  brandGrad.addColorStop(0, "#ffffff");
  brandGrad.addColorStop(0.3, "#fef08a");
  brandGrad.addColorStop(0.7, accentHex);
  brandGrad.addColorStop(1, "#c2410c");

  ctx.fillStyle = brandGrad;
  ctx.fillText("Lụmlott", cx, brandY);

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.2;
  ctx.strokeText("Lụmlott", cx, brandY);
  ctx.restore();

  // 6. Subtitle Pill: "★ LỤM LÚA ĐẦY TÚI ★"
  const pillW = 206;
  const pillH = 30;
  const pillX = cx - pillW / 2;
  const pillY = cy + 50;

  ctx.save();
  ctx.shadowColor = accentHex;
  ctx.shadowBlur = 10;

  const pillGrad = ctx.createLinearGradient(cx, pillY, cx, pillY + pillH);
  pillGrad.addColorStop(0, "#1e293b");
  pillGrad.addColorStop(1, "#090d16");
  ctx.fillStyle = pillGrad;
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, 15);
  ctx.fill();

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 13px 'Montserrat', 'Segoe UI', 'Arial', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("★ LỤM LÚA ĐẦY TÚI ★", cx, pillY + pillH / 2);
  ctx.restore();

  ctx.restore();
}

// --- 2. RIGHT FLANK LOGO: "LỤMLOTT • QUẢ CẦU JACKPOT" (Jackpot Starburst & Fortune Sphere) ---
export function draw3DLumLottJackpotBurstLogo(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  accentHex = "#f59e0b"
) {
  ctx.save();

  // 1. Sleek Cyber Glass Backing Disc (Radius 145px)
  const gradDisc = ctx.createRadialGradient(cx, cy, 20, cx, cy, 145);
  gradDisc.addColorStop(0, "rgba(255, 255, 255, 0.08)");
  gradDisc.addColorStop(0.55, "rgba(32, 12, 18, 0.75)");
  gradDisc.addColorStop(1, "rgba(10, 3, 5, 0.95)");
  ctx.fillStyle = gradDisc;
  ctx.beginPath();
  ctx.arc(cx, cy, 145, 0, Math.PI * 2);
  ctx.fill();

  // 2. 3D Brushed Gold Sunburst Medallion Outer Bezel Rim (Radius 128px)
  const bezelR = 128;
  const rimGrad = ctx.createRadialGradient(cx - 25, cy - 25, 15, cx, cy, bezelR);
  rimGrad.addColorStop(0, "#fef08a");
  rimGrad.addColorStop(0.35, "#f59e0b");
  rimGrad.addColorStop(0.7, "#b45309");
  rimGrad.addColorStop(1, "#78350f");

  ctx.save();
  ctx.shadowColor = accentHex;
  ctx.shadowBlur = 18;
  ctx.fillStyle = rimGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, bezelR, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#fef08a";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();

  // Inner Dark Ruby/Obsidian Disc (Radius 112px)
  const dialR = 112;
  const dialGrad = ctx.createRadialGradient(cx, cy, 15, cx, cy, dialR);
  dialGrad.addColorStop(0, "#2a0a10");
  dialGrad.addColorStop(0.75, "#140407");
  dialGrad.addColorStop(1, "#080203");
  ctx.fillStyle = dialGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, dialR, 0, Math.PI * 2);
  ctx.fill();

  // 3. Radiant 8-Point Diamond Starburst Rays in Background
  ctx.save();
  ctx.strokeStyle = "rgba(254, 240, 138, 0.35)";
  ctx.lineWidth = 2;
  for (let a = 0; a < 8; a++) {
    const angle = (a * Math.PI * 2) / 8;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 22);
    ctx.lineTo(cx + Math.cos(angle) * 75, cy - 22 + Math.sin(angle) * 75);
    ctx.stroke();
  }
  ctx.restore();

  // 4. Glowing 3D Golden-Crimson Jackpot Sphere
  const ballX = cx;
  const ballY = cy - 22;
  const ballR = 44;

  ctx.save();
  ctx.shadowColor = "#ff2d46";
  ctx.shadowBlur = 24;

  const sphereGrad = ctx.createRadialGradient(
    ballX - ballR * 0.35,
    ballY - ballR * 0.35,
    ballR * 0.08,
    ballX,
    ballY,
    ballR
  );
  sphereGrad.addColorStop(0, "#ff6b81");
  sphereGrad.addColorStop(0.45, "#e11d48");
  sphereGrad.addColorStop(0.85, "#881337");
  sphereGrad.addColorStop(1, "#4c0519");
  ctx.fillStyle = sphereGrad;
  ctx.beginPath();
  ctx.arc(ballX, ballY, ballR, 0, Math.PI * 2);
  ctx.fill();

  // Specular shine
  const shineGrad = ctx.createRadialGradient(
    ballX - ballR * 0.35,
    ballY - ballR * 0.35,
    1,
    ballX - ballR * 0.35,
    ballY - ballR * 0.35,
    ballR * 0.5
  );
  shineGrad.addColorStop(0, "rgba(255, 255, 255, 0.9)");
  shineGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.3)");
  shineGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = shineGrad;
  ctx.beginPath();
  ctx.arc(ballX - ballR * 0.35, ballY - ballR * 0.35, ballR * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Center Jackpot Star Watermark
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "#ffffff";
  ctx.shadowBlur = 12;
  drawVectorStar(ctx, ballX, ballY, 5, 20, 9);
  ctx.fill();

  // Golden orbit ring around Jackpot sphere
  ctx.strokeStyle = "#fde047";
  ctx.lineWidth = 2.5;
  ctx.shadowColor = "#fde047";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.ellipse(ballX, ballY, ballR * 1.35, ballR * 0.45, -0.35, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Dynamic Diamond Sparkles
  const drawDiamondSparkle = (sx: number, sy: number, sz: number) => {
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(sx, sy - sz);
    ctx.quadraticCurveTo(sx, sy, sx + sz, sy);
    ctx.quadraticCurveTo(sx, sy, sx, sy + sz);
    ctx.quadraticCurveTo(sx, sy, sx - sz, sy);
    ctx.quadraticCurveTo(sx, sy, sx, sy - sz);
    ctx.fill();
    ctx.restore();
  };

  drawDiamondSparkle(ballX - 45, ballY - 20, 10);
  drawDiamondSparkle(ballX + 46, ballY - 16, 12);
  drawDiamondSparkle(ballX - 25, ballY - 45, 8);

  // 5. Bold Stylized "Lụmlott" Typography
  ctx.save();
  ctx.font = "900 40px 'Montserrat', 'Segoe UI', 'Arial', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const brandY = cy + 18;

  ctx.strokeStyle = "#450a0a";
  ctx.lineWidth = 7;
  ctx.strokeText("Lụmlott", cx, brandY);

  const brandGrad = ctx.createLinearGradient(cx, brandY - 20, cx, brandY + 20);
  brandGrad.addColorStop(0, "#ffffff");
  brandGrad.addColorStop(0.3, "#fde047");
  brandGrad.addColorStop(0.65, "#ea580c");
  brandGrad.addColorStop(1, "#991b1b");

  ctx.fillStyle = brandGrad;
  ctx.fillText("Lụmlott", cx, brandY);

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.2;
  ctx.strokeText("Lụmlott", cx, brandY);
  ctx.restore();

  // 6. Subtitle Pill: "★ LỤM TRÚNG TIỀN TỶ ★"
  const pillW = 206;
  const pillH = 30;
  const pillX = cx - pillW / 2;
  const pillY = cy + 50;

  ctx.save();
  ctx.shadowColor = "#ef4444";
  ctx.shadowBlur = 10;

  const pillGrad = ctx.createLinearGradient(cx, pillY, cx, pillY + pillH);
  pillGrad.addColorStop(0, "#451a03");
  pillGrad.addColorStop(1, "#180602");
  ctx.fillStyle = pillGrad;
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, 15);
  ctx.fill();

  ctx.strokeStyle = "#ea580c";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 13px 'Montserrat', 'Segoe UI', 'Arial', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("★ LỤM TRÚNG TIỀN TỶ ★", cx, pillY + pillH / 2);
  ctx.restore();

  ctx.restore();
}

export function createBackdropNeonTexture(accentHex = "#f59e0b"): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    // Correct horizontal inversion for THREE.BackSide cylinder mapping
    ctx.translate(2048, 0);
    ctx.scale(-1, 1);

    // 1. Deep Midnight Studio Cyclorama Background Gradient with theme undertones
    const bgGrad = ctx.createRadialGradient(1024, 450, 150, 1024, 512, 1100);
    bgGrad.addColorStop(0, "#101d33");
    bgGrad.addColorStop(0.45, "#091120");
    bgGrad.addColorStop(1, "#03060c");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 2048, 1024);

    // Soft architectural acoustic vertical battens / louvers across studio
    ctx.fillStyle = "rgba(255, 255, 255, 0.035)";
    for (let x = 40; x < 2048; x += 36) {
      ctx.fillRect(x, 60, 18, 900);
    }

    // Helper for multi-layer glowing broadcast neon lines
    const drawNeonPath = (drawFn: () => void, outerWidth = 14, coreWidth = 3.5, glowBlur = 24) => {
      ctx.save();
      ctx.shadowColor = accentHex;
      ctx.shadowBlur = glowBlur;
      ctx.strokeStyle = accentHex;
      ctx.lineWidth = outerWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawFn();
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = accentHex;
      ctx.lineWidth = outerWidth * 0.55;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawFn();
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = coreWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      drawFn();
      ctx.stroke();
      ctx.restore();
    };

    // 2. Continuous Top Crown & Bottom Horizon Stage Light Battens
    drawNeonPath(() => {
      ctx.beginPath();
      ctx.moveTo(0, 45);
      ctx.lineTo(2048, 45);
      ctx.moveTo(0, 975);
      ctx.lineTo(2048, 975);
    }, 10, 3, 20);

    // 3. CENTERSTAGE BROADCAST HEADER: "Lụmlott" + CUSTOM GAMESHOW EMBLEM (Center X = 1024)
    // Stylized Biplot Star-Ball Emblem
    drawBiplotStarBall(ctx, 1024, 275, 54, accentHex);

    // Glowing Stylized "Lụmlott" Brandmark Title
    ctx.save();
    ctx.font = "900 84px 'Montserrat', 'Segoe UI', 'Arial', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.shadowColor = accentHex;
    ctx.shadowBlur = 24;
    ctx.strokeStyle = "#271206";
    ctx.lineWidth = 12;
    ctx.strokeText("Lụmlott", 1024, 375);

    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 4;
    ctx.strokeText("Lụmlott", 1024, 375);

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.strokeText("Lụmlott", 1024, 375);

    ctx.fillStyle = "#ffffff";
    ctx.fillText("Lụmlott", 1024, 375);
    ctx.restore();

    // Subtitle Capsule Pill ("★ LỤM BỘ SỐ, NHẶT ƯỚC MƠ ★", Y = 447)
    drawNeonPath(() => {
      ctx.beginPath();
      ctx.roundRect(704, 425, 640, 44, 22);
    }, 7, 2.0, 16);

    ctx.save();
    ctx.shadowColor = accentHex;
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 21px 'Montserrat', 'Segoe UI', 'Arial', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("★ LỤM BỘ SỐ, NHẶT ƯỚC MƠ ★", 1024, 447);
    ctx.restore();

    // Six Golden Vector Stars below subtitle for complete harmony (Y = 505)
    ctx.save();
    ctx.shadowColor = accentHex;
    ctx.shadowBlur = 16;
    ctx.fillStyle = accentHex;
    ctx.font = "bold 26px 'Montserrat', 'Segoe UI', 'Arial', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("★ ★ ★ ★ ★ ★", 1024, 505);
    ctx.restore();

    // 4. LEFT FLANK IN 3D CAMERA VIEW: "LỤMLOTT • TURBO LỤM TIỀN" BADGE (Canvas X = 380)
    // Outer Circular Cyber Ring Frame (Scaled down to sleek, refined radius 160)
    drawNeonPath(() => {
      ctx.beginPath();
      ctx.arc(380, 520, 160, 0, Math.PI * 2);
    }, 7, 2.0, 16);

    // Inner Concentric Accent Ring
    drawNeonPath(() => {
      ctx.beginPath();
      ctx.arc(380, 520, 148, 0, Math.PI * 2);
    }, 3, 1.2, 10);

    // Cyber HUD Crosshair Tick Notches
    ctx.save();
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 2.5;
    [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].forEach((ang) => {
      const x1 = 380 + Math.cos(ang) * 142;
      const y1 = 520 + Math.sin(ang) * 142;
      const x2 = 380 + Math.cos(ang) * 166;
      const y2 = 520 + Math.sin(ang) * 166;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
    ctx.restore();

    // Custom 3D Vector Art: Lụmlott Golden Fortune Vault
    draw3DLumLottGoldenVaultLogo(ctx, 380, 520, accentHex);

    // 5. RIGHT FLANK IN 3D CAMERA VIEW: "LỤMLOTT • QUẢ CẦU JACKPOT" BADGE (Canvas X = 1668)
    // Outer Circular Cyber Ring Frame (Scaled down to sleek, refined radius 160)
    drawNeonPath(() => {
      ctx.beginPath();
      ctx.arc(1668, 520, 160, 0, Math.PI * 2);
    }, 7, 2.0, 16);

    // Inner Concentric Accent Ring
    drawNeonPath(() => {
      ctx.beginPath();
      ctx.arc(1668, 520, 148, 0, Math.PI * 2);
    }, 3, 1.2, 10);

    // Cyber HUD Crosshair Tick Notches
    ctx.save();
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 2.5;
    [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].forEach((ang) => {
      const x1 = 1668 + Math.cos(ang) * 142;
      const y1 = 520 + Math.sin(ang) * 142;
      const x2 = 1668 + Math.cos(ang) * 166;
      const y2 = 520 + Math.sin(ang) * 166;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
    ctx.restore();

    // Custom 3D Vector Art: Lụmlott Jackpot Fortune Sphere
    draw3DLumLottJackpotBurstLogo(ctx, 1668, 520, accentHex);
  }
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

function createParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    grad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
    grad.addColorStop(0.3, "rgba(255, 255, 255, 0.85)");
    grad.addColorStop(0.7, "rgba(255, 255, 255, 0.25)");
    grad.addColorStop(1, "rgba(255, 255, 255, 0.0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = false;
  return tex;
}

export function createXitLopLogoTexture(accentHex = "#f59e0b"): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    // 1. Dark obsidian disc background with sleek radial gradient
    const grad = ctx.createRadialGradient(512, 512, 40, 512, 512, 480);
    grad.addColorStop(0, "#2a1408");
    grad.addColorStop(0.65, "#140c06");
    grad.addColorStop(1, "#09090b");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(512, 512, 480, 0, Math.PI * 2);
    ctx.fill();

    // Outer gold accent border
    ctx.lineWidth = 36;
    ctx.strokeStyle = accentHex;
    ctx.stroke();

    // Inner bright white/gold pinstripe
    ctx.lineWidth = 10;
    ctx.strokeStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(512, 512, 436, 0, Math.PI * 2);
    ctx.stroke();

    // Authentic Bịp Lót 5-Facet Star-Ball Emblem at upper center (Radius 96, Y = 300)
    drawBiplotStarBall(ctx, 512, 300, 96, accentHex);

    // Ultra-Crisp, Bold, High-Contrast "Lụmlott" Title (Y = 510)
    ctx.save();
    ctx.font = "900 120px 'Montserrat', 'Segoe UI', 'Arial', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Dark solid border around text for razor-sharp legibility (prevents blur)
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 18;
    ctx.lineJoin = "round";
    ctx.strokeText("Lụmlott", 512, 510);

    // Glowing accent rim
    ctx.shadowColor = accentHex;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 6;
    ctx.strokeText("Lụmlott", 512, 510);

    // Rich bright golden-white gradient fill
    const textGrad = ctx.createLinearGradient(512, 440, 512, 580);
    textGrad.addColorStop(0, "#ffffff");
    textGrad.addColorStop(0.35, "#fffbeb");
    textGrad.addColorStop(0.7, "#fef08a");
    textGrad.addColorStop(1, "#f59e0b");
    ctx.fillStyle = textGrad;
    ctx.fillText("Lụmlott", 512, 510);

    // Crisp white inner hairline
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.8;
    ctx.strokeText("Lụmlott", 512, 510);
    ctx.restore();

    // 6 Crisp Glowing Vector Stars along bottom arc
    const starAnglesDeg = [-38, -23, -7.5, 7.5, 23, 38];
    const arcCenterX = 512;
    const arcCenterY = 360;
    const arcRadius = 390;

    starAnglesDeg.forEach((deg) => {
      const rad = (deg * Math.PI) / 180;
      const starX = arcCenterX + Math.sin(rad) * arcRadius;
      const starY = arcCenterY + Math.cos(rad) * arcRadius;

      ctx.save();
      ctx.shadowColor = accentHex;
      ctx.shadowBlur = 14;
      ctx.fillStyle = accentHex;
      drawVectorStar(ctx, starX, starY, 5, 36, 16, -rad);
      ctx.fill();

      // Sharp white outline
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3.0;
      ctx.stroke();
      ctx.restore();
    });
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

export function createBaseNameplateTexture(accentHex = "#f59e0b"): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, 1024, 256);

    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 12;
    ctx.strokeRect(12, 12, 1000, 232);

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 24, 976, 208);

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 100px 'Montserrat', 'Segoe UI', 'Arial', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Lụmlott", 512, 104);

    ctx.fillStyle = accentHex;
    ctx.font = "bold 34px 'Montserrat', 'Segoe UI', 'Arial', sans-serif";
    ctx.fillText("LỤM BỘ SỐ, NHẶT ƯỚC MƠ", 512, 188);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

export function createSlotBadgeTexture(slotNumber: number, accentHex = "#f59e0b"): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, "#2c1708");
    grad.addColorStop(0.5, "#140c06");
    grad.addColorStop(1, "#0a0604");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 128);

    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 246, 118);

    ctx.strokeStyle = "rgba(255, 230, 160, 0.75)";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(14, 14, 228, 100);

    ctx.save();
    ctx.shadowColor = accentHex;
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 68px 'Montserrat', 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(slotNumber.toString().padStart(2, "0"), 128, 64);
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  tex.generateMipmaps = true;
  return tex;
}

export function buildDrawingMachine(
  config: MachineConfig,
  isLowQuality = false,
  customAccentColor?: string
): Machine3DComponents {
  const rootGroup = new THREE.Group();
  const drumGroup = new THREE.Group();
  const paddleGroup = new THREE.Group();
  const trayGroup = new THREE.Group();
  const lights: THREE.Light[] = [];
  const materialsToDispose: THREE.Material[] = [];
  const geometriesToDispose: THREE.BufferGeometry[] = [];
  const rimLightMeshes: THREE.Mesh[] = [];
  const rimLightMaterials: THREE.MeshStandardMaterial[] = [];
  const trayBadgeMaterials: THREE.MeshStandardMaterial[] = [];

  const { drumRadius, drumDepth, paddleCount } = config;

  // --- Materials ---
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.94,
    roughness: 0.12
  });
  materialsToDispose.push(chromeMat);

  const parsedAccent = customAccentColor || "#f59e0b";
  const accentThreeCol = new THREE.Color(parsedAccent);
  const goldAccentMat = new THREE.MeshStandardMaterial({
    color: accentThreeCol,
    metalness: 0.90,
    roughness: 0.18,
    emissive: accentThreeCol.clone().multiplyScalar(0.35),
    emissiveIntensity: 0.16
  });
  materialsToDispose.push(goldAccentMat);

  // Tip accent material (harmonized with theme)
  const tipAccentMat = new THREE.MeshStandardMaterial({
    color: accentThreeCol,
    metalness: 0.75,
    roughness: 0.20,
    emissive: accentThreeCol.clone().multiplyScalar(0.5),
    emissiveIntensity: 0.30
  });
  materialsToDispose.push(tipAccentMat);

  const darkBoltMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.85,
    roughness: 0.35
  });
  materialsToDispose.push(darkBoltMat);

  const darkBaseMat = new THREE.MeshStandardMaterial({
    color: 0x111317,
    metalness: 0.45,
    roughness: 0.50
  });
  materialsToDispose.push(darkBaseMat);

  // Crystal-clear transparent acrylic drum material (slightly refined opacity)
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.22,
    transmission: 0.88,
    ior: 1.49,
    roughness: 0.02,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.015,
    reflectivity: 0.90,
    depthWrite: false,
    side: THREE.FrontSide
  });
  materialsToDispose.push(glassMat);

  // Accent-themed rich semi-transparent transport tube material
  const chuteGlassColor = accentThreeCol.clone().lerp(new THREE.Color("#ffffff"), 0.35);
  const chuteGlassMat = new THREE.MeshPhysicalMaterial({
    color: chuteGlassColor,
    transparent: true,
    opacity: 0.44,
    transmission: 0.65,
    ior: 1.50,
    roughness: 0.03,
    metalness: 0.02,
    clearcoat: 1.0,
    clearcoatRoughness: 0.015,
    emissive: accentThreeCol.clone().multiplyScalar(0.10),
    emissiveIntensity: 0.20,
    depthWrite: false,
    side: THREE.FrontSide
  });
  materialsToDispose.push(chuteGlassMat);

  // --- 1. Base Pedestal & Cantilever Rear Stand (100% Clear Front View) ---
  const baseGeom = new THREE.CylinderGeometry(1.25, 1.40, 0.16, 64);
  geometriesToDispose.push(baseGeom);
  const baseMesh = new THREE.Mesh(baseGeom, darkBaseMat);
  baseMesh.position.set(0, -1.45, -0.15);
  baseMesh.receiveShadow = true;
  rootGroup.add(baseMesh);

  // Concentric polished gold accent rings on base (Double gold rings for sharpness)
  const baseRingGeom = new THREE.TorusGeometry(1.34, 0.014, 16, 64);
  geometriesToDispose.push(baseRingGeom);
  const baseRingMesh = new THREE.Mesh(baseRingGeom, goldAccentMat);
  baseRingMesh.rotation.x = Math.PI / 2;
  baseRingMesh.position.set(0, -1.37, -0.15);
  rootGroup.add(baseRingMesh);

  const baseInnerRingGeom = new THREE.TorusGeometry(1.18, 0.008, 16, 64);
  geometriesToDispose.push(baseInnerRingGeom);
  const baseInnerRingMesh = new THREE.Mesh(baseInnerRingGeom, goldAccentMat);
  baseInnerRingMesh.rotation.x = Math.PI / 2;
  baseInnerRingMesh.position.set(0, -1.365, -0.15);
  rootGroup.add(baseInnerRingMesh);

  // Front Pedestal Illuminated Nameplate "BỊP LÓT"
  const nameplateTex = createBaseNameplateTexture(parsedAccent);
  const nameplateMat = new THREE.MeshStandardMaterial({
    map: nameplateTex,
    roughness: 0.25,
    metalness: 0.85,
    emissive: accentThreeCol.clone().multiplyScalar(0.25),
    emissiveIntensity: 0.25
  });
  materialsToDispose.push(nameplateMat);

  const nameplateGeom = new THREE.PlaneGeometry(0.70, 0.175);
  geometriesToDispose.push(nameplateGeom);
  const nameplateMesh = new THREE.Mesh(nameplateGeom, nameplateMat);
  nameplateMesh.position.set(0, -1.41, 1.22);
  nameplateMesh.rotation.x = -0.28; // Tilted slightly upwards to face camera
  rootGroup.add(nameplateMesh);

  // Gold Bezel Frame around Base Nameplate
  const nameplateFrameGeom = new THREE.BoxGeometry(0.72, 0.19, 0.012);
  geometriesToDispose.push(nameplateFrameGeom);
  const nameplateFrameMesh = new THREE.Mesh(nameplateFrameGeom, goldAccentMat);
  nameplateFrameMesh.position.set(0, -1.41, 1.214);
  nameplateFrameMesh.rotation.x = -0.28;
  rootGroup.add(nameplateFrameMesh);

  // Rear Stand Column (Set strictly behind the drum at -Z so front view is 100% clear)
  const rearColumnGeom = new THREE.CylinderGeometry(0.18, 0.24, 1.1, 32);
  geometriesToDispose.push(rearColumnGeom);
  const rearColumnMesh = new THREE.Mesh(rearColumnGeom, darkBaseMat);
  rearColumnMesh.position.set(0, -0.85, -drumDepth / 2 - 0.18);
  rootGroup.add(rearColumnMesh);

  // Rear Heavy-Duty Cantilever Arm (Behind the drum at -Z)
  const rearArmGeom = new THREE.BoxGeometry(0.14, 1.1, 0.14);
  geometriesToDispose.push(rearArmGeom);
  const rearArmMesh = new THREE.Mesh(rearArmGeom, chromeMat);
  rearArmMesh.position.set(0, -0.1, -drumDepth / 2 - 0.14);
  rootGroup.add(rearArmMesh);

  // Rear Side Cantilever Reinforcement Rib Struts (Left & Right, purely behind the drum)
  [-1, 1].forEach((side) => {
    const flankGeom = new THREE.BoxGeometry(0.04, 0.65, 0.22);
    geometriesToDispose.push(flankGeom);
    const flankMesh = new THREE.Mesh(flankGeom, darkBaseMat);
    flankMesh.position.set(side * (drumRadius * 0.92), -0.38, -drumDepth / 2 - 0.08);
    flankMesh.rotation.z = side * 0.35;
    rootGroup.add(flankMesh);

    const flankGoldTrimGeom = new THREE.BoxGeometry(0.045, 0.012, 0.24);
    geometriesToDispose.push(flankGoldTrimGeom);
    const flankGoldTrim = new THREE.Mesh(flankGoldTrimGeom, goldAccentMat);
    flankGoldTrim.position.set(side * (drumRadius * 0.92), -0.06, -drumDepth / 2 - 0.08);
    rootGroup.add(flankGoldTrim);
  });

  // Rear Motor Housing & Bearing Hub
  const rearHubGeom = new THREE.CylinderGeometry(0.20, 0.20, 0.16, 32);
  geometriesToDispose.push(rearHubGeom);
  rearHubGeom.rotateX(Math.PI / 2);
  const rearHubMesh = new THREE.Mesh(rearHubGeom, goldAccentMat);
  rearHubMesh.position.set(0, 0, -drumDepth / 2 - 0.1);
  rootGroup.add(rearHubMesh);

  // Front Polished Gold Bearing Hub with "BỊP LÓT" Logo Center Badge (Enlarged VIP Gameshow Emblem)
  const frontHubGeom = new THREE.CylinderGeometry(0.20, 0.20, 0.024, 48);
  geometriesToDispose.push(frontHubGeom);
  frontHubGeom.rotateX(Math.PI / 2);
  const frontHubMesh = new THREE.Mesh(frontHubGeom, goldAccentMat);
  frontHubMesh.position.set(0, 0, drumDepth / 2 + 0.01);
  rootGroup.add(frontHubMesh);

  // Front Hub Outer Gold & Chrome Bezel Frame
  const frontHubRingGeom = new THREE.TorusGeometry(0.204, 0.011, 16, 48);
  geometriesToDispose.push(frontHubRingGeom);
  const frontHubRingMesh = new THREE.Mesh(frontHubRingGeom, chromeMat);
  frontHubRingMesh.position.set(0, 0, drumDepth / 2 + 0.023);
  rootGroup.add(frontHubRingMesh);

  // Logo Badge Disc ("Xịt lốp")
  const logoTex = createXitLopLogoTexture(parsedAccent);
  const logoMat = new THREE.MeshStandardMaterial({
    map: logoTex,
    roughness: 0.2,
    metalness: 0.8,
    emissive: accentThreeCol.clone().multiplyScalar(0.25),
    emissiveIntensity: 0.25
  });
  materialsToDispose.push(logoMat);

  const logoDiscGeom = new THREE.CircleGeometry(0.196, 48);
  geometriesToDispose.push(logoDiscGeom);
  const logoDiscMesh = new THREE.Mesh(logoDiscGeom, logoMat);
  logoDiscMesh.position.set(0, 0, drumDepth / 2 + 0.025);
  rootGroup.add(logoDiscMesh);

  // --- 2. Transparent Mixing Drum ---
  const drumCylinderGeom = new THREE.CylinderGeometry(
    drumRadius,
    drumRadius,
    drumDepth,
    64,
    1,
    true
  );
  geometriesToDispose.push(drumCylinderGeom);
  drumCylinderGeom.rotateX(Math.PI / 2);
  const drumBodyMesh = new THREE.Mesh(drumCylinderGeom, glassMat);
  drumGroup.add(drumBodyMesh);

  // Front & Back Glass Endcaps
  const endcapGeom = new THREE.CircleGeometry(drumRadius, 64);
  geometriesToDispose.push(endcapGeom);

  const frontCap = new THREE.Mesh(endcapGeom, glassMat);
  frontCap.position.set(0, 0, drumDepth / 2);
  drumGroup.add(frontCap);

  const backCap = new THREE.Mesh(endcapGeom, glassMat);
  backCap.rotation.y = Math.PI;
  backCap.position.set(0, 0, -drumDepth / 2);
  drumGroup.add(backCap);

  // Two-tone Drum Outer Rings: Outer Gold Torus + Inner Chrome Torus
  const drumGoldRingGeom = new THREE.TorusGeometry(drumRadius + 0.008, 0.010, 16, 72);
  geometriesToDispose.push(drumGoldRingGeom);

  const frontGoldRing = new THREE.Mesh(drumGoldRingGeom, goldAccentMat);
  frontGoldRing.position.set(0, 0, drumDepth / 2);
  drumGroup.add(frontGoldRing);

  const backGoldRing = new THREE.Mesh(drumGoldRingGeom, goldAccentMat);
  backGoldRing.position.set(0, 0, -drumDepth / 2);
  drumGroup.add(backGoldRing);

  const drumChromeRingGeom = new THREE.TorusGeometry(drumRadius - 0.004, 0.006, 16, 72);
  geometriesToDispose.push(drumChromeRingGeom);

  const frontChromeRing = new THREE.Mesh(drumChromeRingGeom, chromeMat);
  frontChromeRing.position.set(0, 0, drumDepth / 2 + 0.002);
  drumGroup.add(frontChromeRing);

  // 16-Segmented Gameshow Orange-Gold LED Perimeter Rim Lights with Dark Spacers & Metal Rivets
  const rimSegmentCount = 16;
  const segmentArc = (Math.PI * 2) / rimSegmentCount;
  const lightBarLength = segmentArc * 0.72; // Leaves dark gaps between segments

  for (let r = 0; r < rimSegmentCount; r++) {
    const startAngle = r * segmentArc;

    // Curved LED Segment
    const segGeom = new THREE.TorusGeometry(drumRadius + 0.018, 0.006, 8, 12, lightBarLength);
    geometriesToDispose.push(segGeom);

    const segMat = new THREE.MeshStandardMaterial({
      color: accentThreeCol,
      emissive: accentThreeCol,
      emissiveIntensity: 0.75,
      metalness: 0.3,
      roughness: 0.2
    });
    materialsToDispose.push(segMat);
    rimLightMaterials.push(segMat);

    const segMesh = new THREE.Mesh(segGeom, segMat);
    segMesh.position.set(0, 0, drumDepth / 2 + 0.006);
    segMesh.rotation.z = startAngle + (segmentArc - lightBarLength) / 2;
    drumGroup.add(segMesh);
    rimLightMeshes.push(segMesh);

    // Mechanical joint spacer block between segments
    const jointX = Math.cos(startAngle) * (drumRadius + 0.018);
    const jointY = Math.sin(startAngle) * (drumRadius + 0.018);

    const jointGeom = new THREE.BoxGeometry(0.016, 0.016, 0.014);
    geometriesToDispose.push(jointGeom);
    const jointMesh = new THREE.Mesh(jointGeom, darkBoltMat);
    jointMesh.position.set(jointX, jointY, drumDepth / 2 + 0.006);
    jointMesh.rotation.z = startAngle;
    drumGroup.add(jointMesh);

    // Chrome Bolt on joint
    const boltGeom = new THREE.CylinderGeometry(0.0035, 0.0035, 0.006, 8);
    geometriesToDispose.push(boltGeom);
    boltGeom.rotateX(Math.PI / 2);
    const boltMesh = new THREE.Mesh(boltGeom, chromeMat);
    boltMesh.position.set(jointX, jointY, drumDepth / 2 + 0.014);
    drumGroup.add(boltMesh);
  }

  rootGroup.add(drumGroup);

  // --- 3. Central Shaft & Rotating Mixing Paddles ---
  const shaftGeom = new THREE.CylinderGeometry(0.032, 0.032, drumDepth + 0.04, 24);
  geometriesToDispose.push(shaftGeom);
  shaftGeom.rotateX(Math.PI / 2);
  const shaftMesh = new THREE.Mesh(shaftGeom, goldAccentMat);
  paddleGroup.add(shaftMesh);

  // Curved paddle blades matching Rapier colliders with decorative slots & orange tips
  const paddleLength = drumRadius * 0.78;
  const paddleWidth = drumDepth * 0.75;
  const paddleThick = 0.018;

  for (let i = 0; i < paddleCount; i++) {
    const angle = (i * Math.PI * 2) / paddleCount;
    const paddleArmGroup = new THREE.Group();
    paddleArmGroup.rotation.z = angle;

    // Rich gold paddle blade body
    const bladeGeom = new THREE.BoxGeometry(paddleLength, paddleThick, paddleWidth);
    geometriesToDispose.push(bladeGeom);
    const bladeMesh = new THREE.Mesh(bladeGeom, goldAccentMat);
    bladeMesh.position.set(paddleLength / 2 + 0.035, 0, 0);
    bladeMesh.castShadow = !isLowQuality;
    paddleArmGroup.add(bladeMesh);

    // Decorative longitudinal channel grooves on paddle blade
    [-1, 1].forEach((gOffset) => {
      const grooveGeom = new THREE.BoxGeometry(paddleLength * 0.65, 0.004, 0.024);
      geometriesToDispose.push(grooveGeom);
      const grooveMesh = new THREE.Mesh(grooveGeom, darkBoltMat);
      grooveMesh.position.set(paddleLength / 2 + 0.035, paddleThick / 2 + 0.002, gOffset * (paddleWidth * 0.25));
      paddleArmGroup.add(grooveMesh);
    });

    // Slim chrome reinforcement spine trim along paddle center
    const ribGeom = new THREE.BoxGeometry(paddleLength, 0.005, 0.016);
    geometriesToDispose.push(ribGeom);
    const ribMesh = new THREE.Mesh(ribGeom, chromeMat);
    ribMesh.position.set(paddleLength / 2 + 0.035, paddleThick / 2 + 0.003, 0);
    paddleArmGroup.add(ribMesh);

    // Fiery Orange/Red Scoop Lip on blade tip (matches physics collider)
    const lipGeom = new THREE.BoxGeometry(0.08, paddleThick + 0.004, paddleWidth);
    geometriesToDispose.push(lipGeom);
    const lipMesh = new THREE.Mesh(lipGeom, tipAccentMat);
    lipMesh.position.set(paddleLength + 0.045, 0.024, 0);
    lipMesh.rotation.z = 0.55;
    paddleArmGroup.add(lipMesh);

    // Chrome edge guard on lip tip
    const lipEdgeGeom = new THREE.BoxGeometry(0.012, paddleThick + 0.006, paddleWidth);
    geometriesToDispose.push(lipEdgeGeom);
    const lipEdgeMesh = new THREE.Mesh(lipEdgeGeom, chromeMat);
    lipEdgeMesh.position.set(paddleLength + 0.082, 0.045, 0);
    lipEdgeMesh.rotation.z = 0.55;
    paddleArmGroup.add(lipEdgeMesh);

    paddleGroup.add(paddleArmGroup);
  }

  rootGroup.add(paddleGroup);

  // --- 4. Precision Mechanical Extraction Port & Transport Chute ---
  const captureGateAngle = -Math.PI * 0.27; // ~ -48.6 degrees (~5:00 position: direct lower-right scoop path)
  const captureX = Math.cos(captureGateAngle) * drumRadius;
  const captureY = Math.sin(captureGateAngle) * drumRadius;
  const exitDir = new THREE.Vector3(Math.cos(captureGateAngle), Math.sin(captureGateAngle), 0);

  // Smooth, continuous 3D transport chute curve starting exactly at the drum extraction collar
  const chuteStart = new THREE.Vector3(captureX, captureY, 0);
  // Point 1 extends straight outward through the mounting collar
  const chutePoint1 = new THREE.Vector3(
    captureX + exitDir.x * 0.08,
    captureY + exitDir.y * 0.08,
    0.01
  );
  // Point 2 gracefully bends forward and down towards tray
  const chutePoint2 = new THREE.Vector3(
    captureX + exitDir.x * 0.22 + 0.04,
    (captureY - 0.96) * 0.48,
    drumDepth / 2 + 0.24
  );
  // Point 3 ends right above the tray entry runway
  const chuteEnd = new THREE.Vector3(0.76, -0.96, drumDepth / 2 + 0.48);

  const chutePath = new THREE.CatmullRomCurve3(
    [chuteStart, chutePoint1, chutePoint2, chuteEnd],
    false,
    "centripetal"
  );

  const chuteRadialSegments = 32;
  const chuteTubularSegments = 80;
  const chuteGeom = new THREE.TubeGeometry(
    chutePath,
    chuteTubularSegments,
    0.092,
    chuteRadialSegments,
    false
  );
  geometriesToDispose.push(chuteGeom);
  const chuteMesh = new THREE.Mesh(chuteGeom, chuteGlassMat);
  rootGroup.add(chuteMesh);

  // 1. Intake Mounting Collar Sleeve & Bezel (Solid precision socket enclosing chute entry)
  const intakeCollarPos = new THREE.Vector3(captureX, captureY, 0);
  const intakeTangent = chutePath.getTangentAt(0.05).normalize();

  // Solid cylindrical gold mounting collar sleeve
  const sleeveGeom = new THREE.CylinderGeometry(0.097, 0.097, 0.035, 32);
  geometriesToDispose.push(sleeveGeom);
  const sleeveMesh = new THREE.Mesh(sleeveGeom, goldAccentMat);
  sleeveMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), intakeTangent);
  sleeveMesh.position.copy(intakeCollarPos);
  rootGroup.add(sleeveMesh);

  // Single polished gold torus bezel ring on collar mouth
  const collarRadius = 0.097;
  const collarGeom = new THREE.TorusGeometry(collarRadius, 0.008, 16, 32);
  geometriesToDispose.push(collarGeom);
  const collarMesh = new THREE.Mesh(collarGeom, goldAccentMat);
  collarMesh.position.copy(intakeCollarPos);
  collarMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), intakeTangent);
  rootGroup.add(collarMesh);

  // Sliding gate blade mesh - sleek disc shutter that opens/closes cleanly
  const gateGeom = new THREE.CylinderGeometry(0.096, 0.096, 0.010, 24);
  geometriesToDispose.push(gateGeom);
  const gateMesh = new THREE.Mesh(gateGeom, goldAccentMat);
  gateMesh.position.copy(intakeCollarPos);
  gateMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), intakeTangent);
  rootGroup.add(gateMesh);

  // Sleek champagne gold bezel collar framing the chute exit mouth (Cleanly hovering above tray)
  const exitRingGeom = new THREE.TorusGeometry(0.093, 0.008, 16, 32);
  geometriesToDispose.push(exitRingGeom);
  const exitRingMesh = new THREE.Mesh(exitRingGeom, goldAccentMat);
  exitRingMesh.position.copy(chuteEnd);
  const exitTangent = chutePath.getTangentAt(1.0).normalize();
  exitRingMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), exitTangent);
  rootGroup.add(exitRingMesh);

  // --- 4B. Dynamic Transparent Vertical Ball-Loading Tubes Directly Connected to Drum ---
  const tubesGroup = new THREE.Group();
  const loadingGateMeshes: THREE.Mesh[] = [];
  const tubePositionsX =
    config.tubeLayout?.tubeXPositions && config.tubeLayout.tubeXPositions.length > 0
      ? config.tubeLayout.tubeXPositions
      : [-0.60, -0.36, -0.12, 0.12, 0.36, 0.60];
  const tubeCount = tubePositionsX.length;
  const tubeSpacing = config.tubeLayout?.tubeSpacing || 0.24;
  const totalBarWidth = Math.max(0.48, tubeCount * tubeSpacing + 0.14);

  // Top chrome horizontal mounting manifold with gold endcaps
  const topBarGeom = new THREE.BoxGeometry(totalBarWidth, 0.024, 0.20);
  geometriesToDispose.push(topBarGeom);
  const topBarMesh = new THREE.Mesh(topBarGeom, chromeMat);
  topBarMesh.position.set(0, TUBE_TOP_Y + 0.012, 0);
  tubesGroup.add(topBarMesh);

  // Acrylic cylinders, collar rings, and gate blades for each tube extending directly into the drum
  tubePositionsX.forEach((tx) => {
    const yDrum = Math.sqrt(Math.max(0.04, drumRadius * drumRadius - tx * tx));
    const thetaDrum = Math.atan2(yDrum, tx);
    const tubeHeight = TUBE_TOP_Y - yDrum;
    const tubeCenterY = yDrum + tubeHeight / 2;

    // 1. Transparent acrylic tube body extending from TUBE_TOP_Y down to drum wall
    const tubeCylGeom = new THREE.CylinderGeometry(0.092, 0.092, tubeHeight, 24, 1, true);
    geometriesToDispose.push(tubeCylGeom);
    const tubeCylMesh = new THREE.Mesh(tubeCylGeom, glassMat);
    tubeCylMesh.position.set(tx, tubeCenterY, 0);
    tubesGroup.add(tubeCylMesh);

    // 2. Top slim gold collar ring
    const topRingGeom = new THREE.TorusGeometry(0.094, 0.006, 16, 32);
    geometriesToDispose.push(topRingGeom);
    const topRingMesh = new THREE.Mesh(topRingGeom, goldAccentMat);
    topRingMesh.rotation.x = Math.PI / 2;
    topRingMesh.position.set(tx, TUBE_TOP_Y - 0.005, 0);
    tubesGroup.add(topRingMesh);

    // 3. Bottom slim gold collar ring sitting flush on the drum perimeter
    const botRingGeom = new THREE.TorusGeometry(0.094, 0.006, 16, 32);
    geometriesToDispose.push(botRingGeom);
    botRingGeom.rotateY(Math.PI / 2);
    botRingGeom.rotateZ(thetaDrum);
    const botRingMesh = new THREE.Mesh(botRingGeom, goldAccentMat);
    botRingMesh.position.set(tx, yDrum, 0);
    tubesGroup.add(botRingMesh);

    // 4. Knurled Side Pin
    const sidePinGeom = new THREE.CylinderGeometry(0.006, 0.006, 0.016, 12);
    geometriesToDispose.push(sidePinGeom);
    sidePinGeom.rotateX(Math.PI / 2);
    const sidePinMesh = new THREE.Mesh(sidePinGeom, chromeMat);
    sidePinMesh.position.set(tx, yDrum + 0.015, 0.10);
    tubesGroup.add(sidePinMesh);

    // 5. Sliding gate blade mesh
    const bladeGeom = new THREE.BoxGeometry(0.18, 0.014, 0.20);
    geometriesToDispose.push(bladeGeom);
    bladeGeom.rotateZ(thetaDrum - Math.PI / 2);
    const bladeMesh = new THREE.Mesh(bladeGeom, goldAccentMat);
    bladeMesh.position.set(tx, yDrum + 0.01, 0);
    tubesGroup.add(bladeMesh);
    loadingGateMeshes.push(bladeMesh);
  });

  rootGroup.add(tubesGroup);

  // --- 6. Sleek Gameshow Result Tray Box with Gold Outlines & Slot Dividers ---
  const K = Math.max(1, config.pickCount);
  const isMultiRow = K > 6;
  const row1Count = isMultiRow ? Math.ceil(K / 2) : K;
  const row2Count = isMultiRow ? K - row1Count : 0;

  const slotSpacing = isMultiRow ? Math.min(0.24, 1.60 / Math.max(1, row1Count)) : Math.min(0.25, 1.60 / Math.max(1, K));
  const activeCount = isMultiRow ? row1Count : K;
  const trayWidth = Math.max(1.44, activeCount * slotSpacing + 0.12);
  const trayDepthSize = isMultiRow ? 0.60 : 0.36;
  const trayCenterZ = drumDepth / 2 + (isMultiRow ? 0.58 : 0.55);
  const trayHeight = 0.13;
  const trayY = -1.225; // center of tray box -> top surface is at -1.16, bottom at -1.29

  // 1. Solid Dark Black Rectangular Tray Body
  const trayBoxGeom = new THREE.BoxGeometry(trayWidth, trayHeight, trayDepthSize);
  geometriesToDispose.push(trayBoxGeom);
  const trayBoxMesh = new THREE.Mesh(trayBoxGeom, darkBaseMat);
  trayBoxMesh.position.set(0, trayY, trayCenterZ);
  trayGroup.add(trayBoxMesh);

  // 2. Complete Gold Edge Framing around all Outer Edges (Matching reference image)
  const edgeThick = 0.007;

  // Front Horizontal Bezel Strips (Top & Bottom)
  const frontHorizGeom = new THREE.BoxGeometry(trayWidth, edgeThick, edgeThick);
  geometriesToDispose.push(frontHorizGeom);
  const frontTopEdge = new THREE.Mesh(frontHorizGeom, goldAccentMat);
  frontTopEdge.position.set(0, trayY + trayHeight / 2, trayCenterZ + trayDepthSize / 2);
  trayGroup.add(frontTopEdge);

  const frontBotEdge = new THREE.Mesh(frontHorizGeom, goldAccentMat);
  frontBotEdge.position.set(0, trayY - trayHeight / 2, trayCenterZ + trayDepthSize / 2);
  trayGroup.add(frontBotEdge);

  // Back Horizontal Bezel Strips (Top & Bottom)
  const backTopEdge = new THREE.Mesh(frontHorizGeom, goldAccentMat);
  backTopEdge.position.set(0, trayY + trayHeight / 2, trayCenterZ - trayDepthSize / 2);
  trayGroup.add(backTopEdge);

  const backBotEdge = new THREE.Mesh(frontHorizGeom, goldAccentMat);
  backBotEdge.position.set(0, trayY - trayHeight / 2, trayCenterZ - trayDepthSize / 2);
  trayGroup.add(backBotEdge);

  // Vertical Corner Edge Posts (4 corners)
  const cornerVertGeom = new THREE.BoxGeometry(edgeThick, trayHeight, edgeThick);
  geometriesToDispose.push(cornerVertGeom);
  [
    [-trayWidth / 2, trayCenterZ + trayDepthSize / 2],
    [trayWidth / 2, trayCenterZ + trayDepthSize / 2],
    [-trayWidth / 2, trayCenterZ - trayDepthSize / 2],
    [trayWidth / 2, trayCenterZ - trayDepthSize / 2]
  ].forEach(([cx, cz]) => {
    const postMesh = new THREE.Mesh(cornerVertGeom, goldAccentMat);
    postMesh.position.set(cx, trayY, cz);
    trayGroup.add(postMesh);
  });

  // Side Horizontal Edges (Left & Right, Top & Bottom)
  const sideHorizGeom = new THREE.BoxGeometry(edgeThick, edgeThick, trayDepthSize);
  geometriesToDispose.push(sideHorizGeom);
  [
    [-trayWidth / 2, trayY + trayHeight / 2],
    [-trayWidth / 2, trayY - trayHeight / 2],
    [trayWidth / 2, trayY + trayHeight / 2],
    [trayWidth / 2, trayY - trayHeight / 2]
  ].forEach(([sx, sy]) => {
    const sideMesh = new THREE.Mesh(sideHorizGeom, goldAccentMat);
    sideMesh.position.set(sx, sy, trayCenterZ);
    trayGroup.add(sideMesh);
  });

  // 3. Slot Cradles (Black Cylindrical Pad + Bold Gold Torus Ring) & Front Number Plaques
  const traySlotPositions: THREE.Vector3[] = [];
  const startX = -((activeCount - 1) * slotSpacing) / 2;

  for (let i = 0; i < K; i++) {
    let slotX: number;
    let slotY: number;
    let slotZ: number;

    if (!isMultiRow) {
      slotX = startX + i * slotSpacing;
      slotY = -1.16;
      slotZ = drumDepth / 2 + 0.55;
    } else {
      if (i < row1Count) {
        const startX1 = -((row1Count - 1) * slotSpacing) / 2;
        slotX = startX1 + i * slotSpacing;
        slotY = -1.14;
        slotZ = drumDepth / 2 + 0.46;
      } else {
        const idxInRow2 = i - row1Count;
        const startX2 = -((row2Count - 1) * slotSpacing) / 2;
        slotX = startX2 + idxInRow2 * slotSpacing;
        slotY = -1.20;
        slotZ = drumDepth / 2 + 0.70;
      }
    }

    // A. Raised Circular Black Base Pad
    const padGeom = new THREE.CylinderGeometry(0.094, 0.096, 0.024, 32);
    geometriesToDispose.push(padGeom);
    const padMesh = new THREE.Mesh(padGeom, darkBaseMat);
    padMesh.position.set(slotX, slotY + 0.012, slotZ);
    trayGroup.add(padMesh);

    // B. Prominent Gold Torus Bezel Ring on Top (Matching image)
    const goldRingGeom = new THREE.TorusGeometry(0.091, 0.009, 16, 32);
    geometriesToDispose.push(goldRingGeom);
    const goldRingMesh = new THREE.Mesh(goldRingGeom, goldAccentMat);
    goldRingMesh.position.set(slotX, slotY + 0.024, slotZ);
    goldRingMesh.rotation.x = Math.PI / 2;
    trayGroup.add(goldRingMesh);

    // C. Inset Dark Mirror Cup
    const cupGeom = new THREE.CylinderGeometry(0.082, 0.072, 0.018, 32);
    geometriesToDispose.push(cupGeom);
    const cupMesh = new THREE.Mesh(cupGeom, darkBaseMat);
    cupMesh.position.set(slotX, slotY + 0.015, slotZ);
    trayGroup.add(cupMesh);

    // D. Front Face Rectangular Number Plaque (01..K)
    const badgeTex = createSlotBadgeTexture(i + 1, parsedAccent);
    const badgeMat = new THREE.MeshStandardMaterial({
      map: badgeTex,
      roughness: 0.2,
      metalness: 0.8,
      emissive: accentThreeCol.clone().multiplyScalar(0.25),
      emissiveIntensity: 0.45,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });
    materialsToDispose.push(badgeMat);
    trayBadgeMaterials.push(badgeMat);

    // Plaque Frame sitting flush on the vertical front face
    const plaqueFrontZ = trayCenterZ + trayDepthSize / 2 + 0.003;
    const plaqueFrontY = trayY;

    const plaqueFrameGeom = new THREE.BoxGeometry(0.114, 0.056, 0.005);
    geometriesToDispose.push(plaqueFrameGeom);
    const plaqueFrameMesh = new THREE.Mesh(plaqueFrameGeom, goldAccentMat);
    plaqueFrameMesh.position.set(slotX, plaqueFrontY, plaqueFrontZ);
    trayGroup.add(plaqueFrameMesh);

    const badgeGeom = new THREE.PlaneGeometry(0.104, 0.048);
    geometriesToDispose.push(badgeGeom);
    const badgeMesh = new THREE.Mesh(badgeGeom, badgeMat);
    badgeMesh.position.set(slotX, plaqueFrontY, plaqueFrontZ + 0.004);
    trayGroup.add(badgeMesh);

    traySlotPositions.push(new THREE.Vector3(slotX, slotY + 0.065, slotZ));
  }

  rootGroup.add(trayGroup);

  // --- 7. Studio Lights (Balanced, Vibrant, Focused Tray Light) ---
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
  lights.push(ambientLight);
  rootGroup.add(ambientLight);

  // Warm Key Light (Top-Right-Front)
  const mainLight = new THREE.DirectionalLight(0xfffaed, 1.4);
  mainLight.position.set(3.0, 5.0, 4.0);
  mainLight.castShadow = !isLowQuality;
  if (mainLight.shadow) {
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    mainLight.shadow.bias = -0.0005;
  }
  lights.push(mainLight);
  rootGroup.add(mainLight);

  // Cool Electric Rim Light (Rear-Left)
  const rimLight = new THREE.DirectionalLight(0xcbe4ff, 0.95);
  rimLight.position.set(-3.5, 3.5, -2.5);
  lights.push(rimLight);
  rootGroup.add(rimLight);

  // Soft Front Fill Light
  const fillLight = new THREE.DirectionalLight(0xf8fafc, 0.60);
  fillLight.position.set(0, 1.0, 4.0);
  lights.push(fillLight);
  rootGroup.add(fillLight);

  // Focused Result Tray Spotlight (Brightens 3D tray, slot numbers & extracted balls)
  const traySpotlight = new THREE.SpotLight(0xfffbeb, 2.2, 5.0, Math.PI / 4, 0.35);
  traySpotlight.position.set(0, 0.5, drumDepth / 2 + 1.2);
  traySpotlight.target.position.set(0, -1.0, drumDepth / 2 + 0.55);
  lights.push(traySpotlight);
  rootGroup.add(traySpotlight);
  rootGroup.add(traySpotlight.target);

  // Internal Chamber Spotlights
  const drumSpotlight1 = new THREE.PointLight(0xfff8ee, 1.8, 5.0);
  drumSpotlight1.position.set(0, 0.25, 0.15);
  lights.push(drumSpotlight1);
  rootGroup.add(drumSpotlight1);

  const drumSpotlight2 = new THREE.PointLight(0xfef3c7, 1.4, 5.0);
  drumSpotlight2.position.set(0, -0.25, -0.15);
  lights.push(drumSpotlight2);
  // --- 8. Gameshow Studio 3D Stage Environment (Platform, Neon Rings, Backdrop Pillars, Particle Field) ---
  const stageGroup = new THREE.Group();
  const stageNeonMaterials: THREE.MeshStandardMaterial[] = [];

  // Primary Theme-Reactive Stage Neon Glow Material
  const stageNeonMat = new THREE.MeshStandardMaterial({
    color: accentThreeCol,
    emissive: accentThreeCol,
    emissiveIntensity: 0.95,
    roughness: 0.15,
    metalness: 0.4
  });
  materialsToDispose.push(stageNeonMat);
  stageNeonMaterials.push(stageNeonMat);

  // Full Glossy Charcoal-Black Mirror Floor (Glossy dark graphite lacquer, reflective, NOT pitch black void)
  const fullFloorGeom = new THREE.PlaneGeometry(40, 40);
  geometriesToDispose.push(fullFloorGeom);
  fullFloorGeom.rotateX(-Math.PI / 2);
  const floorMatColor = new THREE.Color(0x181b22);
  const stageFloorMat = new THREE.MeshStandardMaterial({
    color: floorMatColor,
    roughness: 0.08, // High-gloss specular reflection
    metalness: 0.88,
    emissive: accentThreeCol.clone().multiplyScalar(0.03).add(new THREE.Color(0x06080d)),
    emissiveIntensity: 0.45
  });
  materialsToDispose.push(stageFloorMat);
  const fullFloorMesh = new THREE.Mesh(fullFloorGeom, stageFloorMat);
  fullFloorMesh.position.set(0, -1.26, 0);
  fullFloorMesh.receiveShadow = !isLowQuality;
  stageGroup.add(fullFloorMesh);

  // Single Wide Sleek Luxury Gameshow Podium (Glossy polished dark obsidian lacquer, visible sleek reflections)
  const podiumGeom = new THREE.CylinderGeometry(4.5, 4.6, 0.05, 64);
  geometriesToDispose.push(podiumGeom);
  const podiumMatColor = new THREE.Color(0x222733);
  const stagePodiumMat = new THREE.MeshStandardMaterial({
    color: podiumMatColor,
    roughness: 0.06, // Highly polished glossy dark mirror lacquer
    metalness: 0.86,
    emissive: accentThreeCol.clone().multiplyScalar(0.05).add(new THREE.Color(0x0a0e16)),
    emissiveIntensity: 0.50
  });
  materialsToDispose.push(stagePodiumMat);
  const stagePodiumMesh = new THREE.Mesh(podiumGeom, stagePodiumMat);
  stagePodiumMesh.position.set(0, -1.23, 0);
  stagePodiumMesh.receiveShadow = !isLowQuality;
  stageGroup.add(stagePodiumMesh);

  // Single Polished Gold Bevel Chamfer Trim on Podium Perimeter
  const podiumGoldRingGeom = new THREE.TorusGeometry(4.52, 0.012, 16, 64);
  geometriesToDispose.push(podiumGoldRingGeom);
  podiumGoldRingGeom.rotateX(Math.PI / 2);
  const podiumGoldRingMesh = new THREE.Mesh(podiumGoldRingGeom, goldAccentMat);
  podiumGoldRingMesh.position.set(0, -1.205, 0);
  stageGroup.add(podiumGoldRingMesh);

  // Single Sleek Glowing LED Halo Ring at Outer Perimeter (Clean, minimal, high-end)
  const haloRingGeom = new THREE.TorusGeometry(4.42, 0.010, 16, 64);
  geometriesToDispose.push(haloRingGeom);
  haloRingGeom.rotateX(Math.PI / 2);
  const haloRingMesh = new THREE.Mesh(haloRingGeom, stageNeonMat);
  haloRingMesh.position.set(0, -1.20, 0);
  stageGroup.add(haloRingMesh);

  // Full 360-Degree Seamless Panoramic Studio Cyclorama LED Video Wall (3x Repeat -> 100% Full 360 Coverage & 1:1 Aspect Ratio)
  const neonTex = createBackdropNeonTexture(parsedAccent);
  neonTex.wrapS = THREE.RepeatWrapping;
  neonTex.wrapT = THREE.ClampToEdgeWrapping;
  neonTex.repeat.set(3, 1);
  neonTex.offset.x = 0; // 0 offset -> center of camera view (U=0.50) maps directly to X=1024 (BỊP LÓT)

  const backdropNeonMat = new THREE.MeshStandardMaterial({
    map: neonTex,
    roughness: 0.35,
    metalness: 0.65,
    emissive: accentThreeCol.clone().multiplyScalar(0.28),
    emissiveIntensity: 0.90,
    side: THREE.BackSide
  });
  materialsToDispose.push(backdropNeonMat);

  // Full 360-Degree Continuous Cylinder (Radius 6.2m, Height 6.5m, 96 segments for smooth 360 panoramic view)
  const backdropGeom = new THREE.CylinderGeometry(6.2, 6.2, 6.5, 96, 1, true);
  geometriesToDispose.push(backdropGeom);
  const backdropMesh = new THREE.Mesh(backdropGeom, backdropNeonMat);
  backdropMesh.position.set(0, 1.4, 0);
  stageGroup.add(backdropMesh);

  // Dedicated Stage Cyclorama Spotlight
  const signSpotlight = new THREE.SpotLight(accentThreeCol, 2.5, 12.0, Math.PI / 2.5, 0.4);
  signSpotlight.position.set(0, 3.2, 0.5);
  signSpotlight.target = backdropMesh;
  lights.push(signSpotlight);
  stageGroup.add(signSpotlight);

  // Dynamic Floating Celebratory Sparkle Particle System
  const particleCount = 320;
  const stageParticlePositions = new Float32Array(particleCount * 3);
  const stageParticleBaseColors = new Float32Array(particleCount * 3);
  const colAccent = accentThreeCol;
  const colGold = new THREE.Color("#fbbf24");
  const colCyan = new THREE.Color("#38bdf8");

  for (let p = 0; p < particleCount; p++) {
    stageParticlePositions[p * 3] = (Math.random() - 0.5) * 6.5;
    stageParticlePositions[p * 3 + 1] = -1.1 + Math.random() * 4.2;
    stageParticlePositions[p * 3 + 2] = -2.2 + Math.random() * 4.6;

    // Palette distribution: 60% theme accent, 25% gold, 15% electric cyan
    const roll = Math.random();
    const particleColor = roll < 0.6 ? colAccent : roll < 0.85 ? colGold : colCyan;
    stageParticleBaseColors[p * 3] = particleColor.r;
    stageParticleBaseColors[p * 3 + 1] = particleColor.g;
    stageParticleBaseColors[p * 3 + 2] = particleColor.b;
  }

  const particleGeom = new THREE.BufferGeometry();
  geometriesToDispose.push(particleGeom);
  particleGeom.setAttribute(
    "position",
    new THREE.BufferAttribute(stageParticlePositions, 3)
  );
  particleGeom.setAttribute(
    "color",
    new THREE.BufferAttribute(stageParticleBaseColors.slice(), 3)
  );

  const particleTex = createParticleTexture();
  const particleMat = new THREE.PointsMaterial({
    size: 0.07,
    map: particleTex,
    vertexColors: true,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  materialsToDispose.push(particleMat);

  const stageParticleSystem = new THREE.Points(particleGeom, particleMat);
  stageGroup.add(stageParticleSystem);

  // 2 Dynamic Sweeping Moving-Head Gameshow Spotlights
  const stageMovingSpotlights: {
    light: THREE.SpotLight;
    target: THREE.Object3D;
    baseAngle: number;
    speed: number;
  }[] = [];

  const spot1Target = new THREE.Object3D();
  spot1Target.position.set(-0.5, -0.2, 0);
  stageGroup.add(spot1Target);
  const spot1 = new THREE.SpotLight(accentThreeCol, 2.4, 9.0, Math.PI / 5, 0.45);
  spot1.position.set(-3.2, 3.4, 1.2);
  spot1.target = spot1Target;
  lights.push(spot1);
  stageGroup.add(spot1);
  stageMovingSpotlights.push({ light: spot1, target: spot1Target, baseAngle: 0, speed: 0.8 });

  const spot2Target = new THREE.Object3D();
  spot2Target.position.set(0.5, -0.2, 0);
  stageGroup.add(spot2Target);
  const spot2 = new THREE.SpotLight(0xfff8ee, 2.0, 9.0, Math.PI / 5, 0.45);
  spot2.position.set(3.2, 3.4, 1.2);
  spot2.target = spot2Target;
  lights.push(spot2);
  stageGroup.add(spot2);
  stageMovingSpotlights.push({ light: spot2, target: spot2Target, baseAngle: Math.PI, speed: 0.7 });

  rootGroup.add(stageGroup);

  return {
    rootGroup,
    drumGroup,
    paddleGroup,
    tubesGroup,
    gateMesh,
    loadingGateMeshes,
    trayGroup,
    chuteMesh,
    traySlotPositions,
    chutePath,
    lights,
    materialsToDispose,
    geometriesToDispose,
    goldAccentMat,
    rimLightMeshes,
    rimLightMaterials,
    logoMat,
    nameplateMat,
    tipAccentMat,
    trayBadgeMaterials,
    chuteGlassMat,
    stageNeonMaterials,
    stageMovingSpotlights,
    stageParticleSystem,
    stageParticlePositions,
    stageParticleBaseColors,
    backdropNeonMat,
    stageFloorMat,
    stagePodiumMat
  };
}

