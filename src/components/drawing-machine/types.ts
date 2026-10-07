export type MachineState =
  | "Ready"
  | "Loading"
  | "Mixing"
  | "Capturing"
  | "Transporting"
  | "Returning"
  | "WaitingNext"
  | "Completed";

export type GameChoice = "MEGA_645" | "POWER_655" | "CUSTOM";

export interface DrawingBall {
  id: number; // 1..N
  number: number; // 1..N
  formatted: string; // "01".."60"
  color: string;
  textColor: string;
}

export interface SlotRangeLimit {
  slotIndex: number; // 0..K-1
  min: number; // 1..N
  max: number; // 1..N
}

export interface ExtractedBallResult {
  ball: DrawingBall;
  orderIndex: number; // 1..K
  extractedAt: number; // timestamp
  rangeLimit?: { min: number; max: number };
}

export interface RejectionInfo {
  ball: DrawingBall;
  slotIndex: number;
  reason: string;
  timestamp: number;
  attemptNumber: number;
}

export interface TubeLayout {
  tubeCount: number; // 1..6
  tubeSpacing: number; // 0.24m
  tubeXPositions: number[];
  tubeDividerPositions: number[];
  tubeBallRanges: number[][]; // [tubeIdx] => array of ball numbers
}

export interface CustomMachineConfig {
  preset: "35" | "45" | "55" | "custom";
  totalBalls: number; // 10..60, default 55
  pickCount: number; // 1..N, default 6
  enableRangeLimits: boolean; // default false
  rangeLimits: SlotRangeLimit[]; // length = pickCount
}

export interface MachineConfig {
  gameCode: GameChoice;
  gameName: string;
  totalBalls: number;
  pickCount: number;
  ballRadius: number;
  drumRadius: number;
  drumDepth: number;
  paddleCount: number;
  paddleSpeed: number; // rad/s
  accentColor: string;
  loadingTubeCount: number;
  tubeStaggerSeconds: number;
  enableRangeLimits: boolean;
  rangeLimits: SlotRangeLimit[];
  tubeLayout: TubeLayout;
}

export interface CameraViewPreset {
  id: "default" | "tubes" | "chamber" | "capture" | "tray";
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}

export const TUBE_BOTTOM_Y = 0.98;
export const TUBE_TOP_Y = 2.68;
export const TUBE_X_POSITIONS = [-0.60, -0.36, -0.12, 0.12, 0.36, 0.60];
export const TUBE_DIVIDER_X = [-0.72, -0.48, -0.24, 0.0, 0.24, 0.48, 0.72];
export const TUBE_BALL_RANGES = [
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  [11, 12, 13, 14, 15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24, 25, 26, 27, 28],
  [29, 30, 31, 32, 33, 34, 35, 36, 37],
  [38, 39, 40, 41, 42, 43, 44, 45, 46],
  [47, 48, 49, 50, 51, 52, 53, 54, 55]
];

/**
 * Compute dynamic tube distribution according to:
 * - Number of tubes T = ceil(N / 10)
 * - Remainder goes to leftmost tubes first
 * - Numbers ascending bottom-to-top within tube and left-to-right across tubes
 */
export function computeTubeDistribution(totalBalls: number): TubeLayout {
  const N = Math.min(60, Math.max(10, Math.round(totalBalls)));
  const tubeCount = Math.min(6, Math.max(1, Math.ceil(N / 10)));
  const tubeSpacing = 0.24;

  // Symmetrical X positions centered around 0
  const tubeXPositions: number[] = [];
  const startX = -((tubeCount - 1) * tubeSpacing) / 2;
  for (let i = 0; i < tubeCount; i++) {
    tubeXPositions.push(Number((startX + i * tubeSpacing).toFixed(4)));
  }

  // Divider positions (T + 1 dividers)
  const tubeDividerPositions: number[] = [];
  for (let i = 0; i <= tubeCount; i++) {
    const divX = startX - tubeSpacing / 2 + i * tubeSpacing;
    tubeDividerPositions.push(Number(divX.toFixed(4)));
  }

  // Distribute balls: base count per tube + 1 extra for first 'rem' leftmost tubes
  const baseCount = Math.floor(N / tubeCount);
  const rem = N % tubeCount;

  const tubeBallRanges: number[][] = [];
  let currentBallNum = 1;

  for (let t = 0; t < tubeCount; t++) {
    const countForThisTube = baseCount + (t < rem ? 1 : 0);
    const tubeNumbers: number[] = [];
    for (let b = 0; b < countForThisTube; b++) {
      tubeNumbers.push(currentBallNum++);
    }
    tubeBallRanges.push(tubeNumbers);
  }

  return {
    tubeCount,
    tubeSpacing,
    tubeXPositions,
    tubeDividerPositions,
    tubeBallRanges
  };
}

export const DEFAULT_CUSTOM_CONFIG: CustomMachineConfig = {
  preset: "55",
  totalBalls: 55,
  pickCount: 6,
  enableRangeLimits: false,
  rangeLimits: Array.from({ length: 6 }, (_, i) => ({
    slotIndex: i,
    min: 1,
    max: 55
  }))
};

export function getPresetConfig(preset: "35" | "45" | "55" | "custom"): CustomMachineConfig {
  if (preset === "35") {
    return {
      preset: "35",
      totalBalls: 35,
      pickCount: 6,
      enableRangeLimits: true,
      rangeLimits: [
        { slotIndex: 0, min: 1, max: 35 },
        { slotIndex: 1, min: 1, max: 35 },
        { slotIndex: 2, min: 1, max: 35 },
        { slotIndex: 3, min: 1, max: 35 },
        { slotIndex: 4, min: 1, max: 35 },
        { slotIndex: 5, min: 1, max: 12 }
      ]
    };
  }
  if (preset === "45") {
    return {
      preset: "45",
      totalBalls: 45,
      pickCount: 6,
      enableRangeLimits: false,
      rangeLimits: Array.from({ length: 6 }, (_, i) => ({
        slotIndex: i,
        min: 1,
        max: 45
      }))
    };
  }
  if (preset === "55") {
    return {
      preset: "55",
      totalBalls: 55,
      pickCount: 6,
      enableRangeLimits: false,
      rangeLimits: Array.from({ length: 6 }, (_, i) => ({
        slotIndex: i,
        min: 1,
        max: 55
      }))
    };
  }
  return { ...DEFAULT_CUSTOM_CONFIG };
}

/**
 * Bipartite maximum matching algorithm (Hopcroft-Karp / DFS Augmenting Paths)
 * Verifies if there is an assignment of K distinct balls satisfying all slot limits.
 */
export function validateBipartiteMatching(
  config: CustomMachineConfig
): { valid: boolean; error?: string } {
  const { totalBalls: N, pickCount: K, enableRangeLimits, rangeLimits } = config;

  if (typeof N !== "number" || N < 10 || N > 60) {
    return { valid: false, error: "Tổng số bóng N phải từ 10 đến 60." };
  }
  if (typeof K !== "number" || K < 1 || K > N) {
    return { valid: false, error: `Số kết quả K phải từ 1 đến ${N}.` };
  }

  if (!enableRangeLimits) {
    return { valid: true };
  }

  // Validate range bounds
  for (let i = 0; i < K; i++) {
    const limit = rangeLimits[i];
    if (!limit) {
      return { valid: false, error: `Thiếu cấu hình khoảng cho vị trí #${i + 1}.` };
    }
    const { min, max } = limit;
    if (typeof min !== "number" || typeof max !== "number" || min < 1 || max > N || min > max) {
      return {
        valid: false,
        error: `Khoảng cho vị trí #${i + 1} không hợp lệ (cần 1 ≤ Min (${min}) ≤ Max (${max}) ≤ ${N}).`
      };
    }
  }

  // Build bipartite graph
  // Left nodes: Slots 0..K-1
  // Right nodes: Balls 1..N
  const adj: number[][] = [];
  for (let i = 0; i < K; i++) {
    const { min, max } = rangeLimits[i];
    const neighbors: number[] = [];
    for (let num = min; num <= max; num++) {
      neighbors.push(num);
    }
    if (neighbors.length === 0) {
      return {
        valid: false,
        error: `Vị trí #${i + 1} không có số nào khả dụng trong khoảng [${min} - ${max}].`
      };
    }
    adj.push(neighbors);
  }

  // Standard DFS augmenting path
  const matchR = new Map<number, number>(); // ballNum -> slotIndex

  const bpm = (u: number, seen: Set<number>): boolean => {
    for (const v of adj[u]) {
      if (!seen.has(v)) {
        seen.add(v);
        const prevSlot = matchR.get(v);
        if (prevSlot === undefined || bpm(prevSlot, seen)) {
          matchR.set(v, u);
          return true;
        }
      }
    }
    return false;
  };

  let maxMatching = 0;
  for (let u = 0; u < K; u++) {
    const seen = new Set<number>();
    if (bpm(u, seen)) {
      maxMatching++;
    }
  }

  if (maxMatching < K) {
    return {
      valid: false,
      error: `Không thể chọn ${K} số khác nhau thỏa mãn đồng thời tất cả các khoảng! (Chỉ ghép được tối đa ${maxMatching}/${K} vị trí).`
    };
  }

  return { valid: true };
}

/**
 * Check if picking candidateBallNum for slot currentSlot still allows all remaining future slots
 * (currentSlot + 1 .. K - 1) to be satisfied by remaining distinct available balls.
 */
export function canCompleteRemainingSlots(
  candidateBallNum: number,
  currentSlot: number,
  pickCount: number,
  alreadyExtractedIds: Set<number>,
  limits: SlotRangeLimit[],
  totalBalls: number,
  enableRangeLimits: boolean
): boolean {
  if (!enableRangeLimits) return true;

  const remainingSlotsCount = pickCount - (currentSlot + 1);
  if (remainingSlotsCount <= 0) return true;

  const usedBalls = new Set<number>(alreadyExtractedIds);
  usedBalls.add(candidateBallNum);

  // Build adjacency for future slots
  const futureAdj: number[][] = [];
  for (let s = currentSlot + 1; s < pickCount; s++) {
    const limit = limits[s] || { min: 1, max: totalBalls };
    const candidates: number[] = [];
    for (let num = limit.min; num <= limit.max; num++) {
      if (!usedBalls.has(num)) {
        candidates.push(num);
      }
    }
    if (candidates.length === 0) return false;
    futureAdj.push(candidates);
  }

  const matchR = new Map<number, number>();

  const bpm = (u: number, seen: Set<number>): boolean => {
    for (const v of futureAdj[u]) {
      if (!seen.has(v)) {
        seen.add(v);
        const prevSlot = matchR.get(v);
        if (prevSlot === undefined || bpm(prevSlot, seen)) {
          matchR.set(v, u);
          return true;
        }
      }
    }
    return false;
  };

  let matching = 0;
  for (let u = 0; u < remainingSlotsCount; u++) {
    const seen = new Set<number>();
    if (bpm(u, seen)) {
      matching++;
    }
  }

  return matching === remainingSlotsCount;
}

export function buildMachineConfigFromCustom(
  customConfig: CustomMachineConfig,
  baseAccent = "#f59e0b"
): MachineConfig {
  const { totalBalls, pickCount, enableRangeLimits, rangeLimits } = customConfig;
  const tubeLayout = computeTubeDistribution(totalBalls);

  // Ball radius & drum radius slightly adapted for ball counts
  const ballRadius = totalBalls <= 35 ? 0.082 : totalBalls <= 45 ? 0.080 : 0.076;
  const drumRadius = totalBalls <= 35 ? 0.98 : totalBalls <= 45 ? 1.02 : 1.10;
  const drumDepth = totalBalls <= 35 ? 0.80 : totalBalls <= 45 ? 0.85 : 0.90;

  return {
    gameCode:
      customConfig.preset === "35"
        ? "CUSTOM"
        : customConfig.preset === "45"
        ? "MEGA_645"
        : customConfig.preset === "55"
        ? "POWER_655"
        : "CUSTOM",
    gameName:
      customConfig.preset === "35"
        ? "Lotto 5/35"
        : customConfig.preset === "45"
        ? "Mega 6/45"
        : customConfig.preset === "55"
        ? "Power 6/55"
        : `Tùy chỉnh (${pickCount}/${totalBalls})`,
    totalBalls,
    pickCount,
    ballRadius,
    drumRadius,
    drumDepth,
    paddleCount: 3,
    paddleSpeed: 3.8,
    accentColor: baseAccent,
    loadingTubeCount: tubeLayout.tubeCount,
    tubeStaggerSeconds: 0.3,
    enableRangeLimits,
    rangeLimits,
    tubeLayout
  };
}

export interface PhysicsDebugInfo {
  activeBallsCount: number;
  extractedCount: number;
  gateOpen: boolean;
  motorSpeed: number;
  fps: number;
  physicsStepTimeMs: number;
  outOfBoundsCount?: number;
  currentAttempt?: number;
}

export type MotorSpeedMode = "slow" | "standard" | "fast";
export type GraphicsQuality = "low" | "medium" | "high";

export interface MachineCustomSettings {
  initialMixDuration: number; // 3..15 seconds, default 5
  trayIntervalDuration: number; // 2..10 seconds, default 5
  motorSpeedMode: MotorSpeedMode; // "slow" | "standard" | "fast"
  autoFocusChamber: boolean; // default true
  accentColor: string; // default "#f59e0b"
  graphicsQuality: GraphicsQuality; // "low" | "medium" | "high"
  showCountdown: boolean; // default true
  bgmEnabled: boolean; // default true
  bgmVolume: number; // 0..1, default 0.6
}

export const DEFAULT_MACHINE_SETTINGS: MachineCustomSettings = {
  initialMixDuration: 5,
  trayIntervalDuration: 5,
  motorSpeedMode: "standard",
  autoFocusChamber: true,
  accentColor: "#f59e0b",
  graphicsQuality: "high",
  showCountdown: true,
  bgmEnabled: false,
  bgmVolume: 0.6
};

export const SETTINGS_STORAGE_KEY = "drawing_machine_custom_settings_v2";
export const CONFIG_STORAGE_KEY = "biplott_machine_config_v2";

export function loadStoredMachineConfig(): CustomMachineConfig {
  if (typeof window === "undefined") return { ...DEFAULT_CUSTOM_CONFIG };
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CUSTOM_CONFIG };
    const parsed = JSON.parse(raw);

    const totalBalls =
      typeof parsed.totalBalls === "number"
        ? Math.min(60, Math.max(10, Math.round(parsed.totalBalls)))
        : DEFAULT_CUSTOM_CONFIG.totalBalls;

    const pickCount =
      typeof parsed.pickCount === "number"
        ? Math.min(totalBalls, Math.max(1, Math.round(parsed.pickCount)))
        : Math.min(6, totalBalls);

    const enableRangeLimits =
      typeof parsed.enableRangeLimits === "boolean"
        ? parsed.enableRangeLimits
        : DEFAULT_CUSTOM_CONFIG.enableRangeLimits;

    const preset = ["35", "45", "55", "custom"].includes(parsed.preset)
      ? parsed.preset
      : "custom";

    let rangeLimits: SlotRangeLimit[] = [];
    if (Array.isArray(parsed.rangeLimits) && parsed.rangeLimits.length === pickCount) {
      rangeLimits = (parsed.rangeLimits as Array<{ min?: number; max?: number }>).map((lim, idx: number) => ({
        slotIndex: idx,
        min: typeof lim?.min === "number" ? Math.min(totalBalls, Math.max(1, Math.round(lim.min))) : 1,
        max: typeof lim?.max === "number" ? Math.min(totalBalls, Math.max(1, Math.round(lim.max))) : totalBalls
      }));
    } else {
      rangeLimits = Array.from({ length: pickCount }, (_, i) => ({
        slotIndex: i,
        min: 1,
        max: totalBalls
      }));
    }

    const config: CustomMachineConfig = {
      preset,
      totalBalls,
      pickCount,
      enableRangeLimits,
      rangeLimits
    };

    const validation = validateBipartiteMatching(config);
    if (!validation.valid) {
      return { ...DEFAULT_CUSTOM_CONFIG };
    }

    return config;
  } catch {
    return { ...DEFAULT_CUSTOM_CONFIG };
  }
}

export function saveStoredMachineConfig(config: CustomMachineConfig): void {
  if (typeof window === "undefined") return;
  try {
    const validation = validateBipartiteMatching(config);
    if (validation.valid) {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    }
  } catch (err) {
    console.warn("Lỗi lưu cấu hình máy quay vào localStorage:", err);
  }
}

export function loadStoredSettings(): MachineCustomSettings {
  if (typeof window === "undefined") return { ...DEFAULT_MACHINE_SETTINGS };
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_MACHINE_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      initialMixDuration:
        typeof parsed.initialMixDuration === "number"
          ? Math.min(15, Math.max(3, Math.round(parsed.initialMixDuration)))
          : DEFAULT_MACHINE_SETTINGS.initialMixDuration,
      trayIntervalDuration:
        typeof parsed.trayIntervalDuration === "number"
          ? Math.min(10, Math.max(2, Math.round(parsed.trayIntervalDuration)))
          : DEFAULT_MACHINE_SETTINGS.trayIntervalDuration,
      motorSpeedMode: ["slow", "standard", "fast"].includes(parsed.motorSpeedMode)
        ? parsed.motorSpeedMode
        : DEFAULT_MACHINE_SETTINGS.motorSpeedMode,
      autoFocusChamber:
        typeof parsed.autoFocusChamber === "boolean"
          ? parsed.autoFocusChamber
          : DEFAULT_MACHINE_SETTINGS.autoFocusChamber,
      accentColor:
        typeof parsed.accentColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(parsed.accentColor)
          ? parsed.accentColor
          : DEFAULT_MACHINE_SETTINGS.accentColor,
      graphicsQuality: ["low", "medium", "high"].includes(parsed.graphicsQuality)
        ? parsed.graphicsQuality
        : DEFAULT_MACHINE_SETTINGS.graphicsQuality,
      showCountdown:
        typeof parsed.showCountdown === "boolean"
          ? parsed.showCountdown
          : DEFAULT_MACHINE_SETTINGS.showCountdown,
      bgmEnabled:
        typeof parsed.bgmEnabled === "boolean"
          ? parsed.bgmEnabled
          : DEFAULT_MACHINE_SETTINGS.bgmEnabled,
      bgmVolume:
        typeof parsed.bgmVolume === "number"
          ? Math.min(1, Math.max(0, parsed.bgmVolume))
          : DEFAULT_MACHINE_SETTINGS.bgmVolume
    };
  } catch {
    return { ...DEFAULT_MACHINE_SETTINGS };
  }
}

export function saveStoredSettings(settings: MachineCustomSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn("Lỗi lưu tùy chọn lồng quay vào localStorage:", err);
  }
}

export interface DrawHistoryRecord {
  id: string;
  drawIndex: number;
  timestamp: number;
  preset: "35" | "45" | "55" | "custom";
  gameName: string;
  totalBalls: number;
  pickCount: number;
  enableRangeLimits?: boolean;
  balls: Array<{
    number: number;
    formatted: string;
    color: string;
    textColor?: string;
  }>;
  sortedNumbers: number[];
}

export const DRAW_HISTORY_STORAGE_KEY = "lumlott_draw_history_v1";

export function loadStoredDrawHistory(): DrawHistoryRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DRAW_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, 100);
    }
    return [];
  } catch {
    return [];
  }
}

export function saveStoredDrawHistory(history: DrawHistoryRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DRAW_HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 100)));
  } catch (err) {
    console.warn("Lỗi lưu lịch sử quay số vào localStorage:", err);
  }
}

