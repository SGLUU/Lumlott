"use client";

import React from "react";
import {
  MachineConfig,
  MachineState,
  CustomMachineConfig,
  SlotRangeLimit,
  ExtractedBallResult,
  RejectionInfo,
  PhysicsDebugInfo,
  MachineCustomSettings,
  MotorSpeedMode,
  DrawHistoryRecord,
  getPresetConfig,
  validateBipartiteMatching
} from "./types";
import LotteryBallBadge from "./LotteryBallBadge";
import { CAMERA_PRESETS } from "./DrawingMachineCanvas";
import {
  Play,
  RotateCcw,
  Sparkles,
  Activity,
  Flame,
  ArrowRight,
  XCircle,
  Clock,
  SlidersHorizontal,
  Lock,
  Palette,
  Gauge,
  Timer,
  Eye,
  Check,
  CheckCheck,
  Copy,
  Trash2,
  History,
  Monitor,
  ShieldCheck,
  AlertTriangle,
  RotateCw,
  Sliders,
  Volume2,
  VolumeX,
  Volume1,
  Music
} from "lucide-react";

// --- 1. GAMESHOW TOP BAR & STAGE PROGRESS ---
interface ToolbarProps {
  customConfig: CustomMachineConfig;
  onSelectPreset: (preset: "35" | "45" | "55" | "custom") => void;
  machineState: MachineState;
  cameraPreset: "default" | "tubes" | "chamber" | "capture" | "tray";
  onSelectCameraPreset: (preset: "default" | "tubes" | "chamber" | "capture" | "tray") => void;
  isAutoSequence: boolean;
  initialCountdown: number;
  mixingSeconds: number;
  captureSeconds: number;
  intervalRemaining: number;
  retryCountdown: number;
  currentAttempt: number;
  showCountdown?: boolean;
  onToggleSettingsModal: () => void;
  isSettingsOpen: boolean;
  bgmEnabled?: boolean;
  bgmVolume?: number;
  onToggleBgm?: () => void;
  onChangeBgmVolume?: (vol: number) => void;
}

export function DrawingMachineToolbar({
  customConfig,
  onSelectPreset,
  machineState,
  cameraPreset,
  onSelectCameraPreset,
  isAutoSequence,
  initialCountdown,
  mixingSeconds,
  captureSeconds,
  intervalRemaining,
  retryCountdown,
  currentAttempt,
  showCountdown = true,
  onToggleSettingsModal,
  isSettingsOpen,
  bgmEnabled = false,
  bgmVolume = 0.6,
  onToggleBgm,
  onChangeBgmVolume
}: ToolbarProps) {
  const getStatusDisplay = () => {
    switch (machineState) {
      case "Ready":
        return {
          step: 0,
          label: "Sẵn sàng nạp bóng & quay",
          color: "bg-zinc-800/90 text-zinc-300 border-zinc-700/80",
          dot: "bg-zinc-400"
        };
      case "Loading":
        const tubeCount = Math.ceil(customConfig.totalBalls / 10);
        return {
          step: 1,
          label: `Đang mở ${tubeCount} ống nạp bóng...`,
          color: "bg-purple-950/90 text-purple-300 border-purple-700/80 shadow-md shadow-purple-900/30",
          dot: "bg-purple-400 animate-pulse"
        };
      case "Mixing":
        if (retryCountdown > 0) {
          return {
            step: 2,
            label: `Trộn lại 5s trước khi đón tiếp… (${retryCountdown}s)`,
            color: "bg-amber-950/90 text-amber-300 border-amber-600/80 shadow-md shadow-amber-900/30",
            dot: "bg-amber-400 animate-pulse"
          };
        }
        return {
          step: 2,
          label: isAutoSequence
            ? showCountdown
              ? `Đang đảo trộn bóng… (${initialCountdown}s)`
              : "Đang đảo trộn bóng..."
            : showCountdown
            ? `Đang trộn bóng (${mixingSeconds}s)`
            : "Đang trộn bóng...",
          color: "bg-amber-950/90 text-amber-300 border-amber-600/80 shadow-md shadow-amber-900/30",
          dot: "bg-amber-400 animate-pulse"
        };
      case "Capturing":
        return {
          step: 3,
          label: showCountdown
            ? `Mở cửa đón bóng (${captureSeconds}s)...`
            : "Đang đón bóng trúng giải...",
          color: "bg-rose-950/90 text-rose-300 border-rose-600/80 shadow-md shadow-rose-900/30",
          dot: "bg-rose-500 animate-ping"
        };
      case "Returning":
        return {
          step: 3,
          label: "Bóng ngoài điều kiện — Đang hồi về lồng...",
          color: "bg-amber-950/90 text-amber-200 border-amber-500 shadow-md shadow-amber-500/20",
          dot: "bg-amber-400 animate-spin"
        };
      case "Transporting":
        return {
          step: 4,
          label: "Bóng hợp lệ đang lăn vào khay...",
          color: "bg-emerald-950/90 text-emerald-300 border-emerald-600/80 shadow-md shadow-emerald-900/30",
          dot: "bg-emerald-400 animate-bounce"
        };
      case "WaitingNext":
        return {
          step: 2,
          label: showCountdown
            ? `Đảo trộn... Bóng tiếp theo sau ${intervalRemaining}s`
            : "Đang trộn... Chuẩn bị đón bóng tiếp theo",
          color: "bg-blue-950/90 text-blue-300 border-blue-600/80 shadow-md shadow-blue-900/30",
          dot: "bg-blue-400 animate-pulse"
        };
      case "Completed":
        return {
          step: 5,
          label: `Đã hoàn thành lượt quay ${customConfig.pickCount} bóng!`,
          color: "bg-amber-950/90 text-amber-200 border-amber-500 shadow-xl shadow-amber-500/20",
          dot: "bg-amber-400"
        };
    }
  };

  const status = getStatusDisplay();
  const isLocked = machineState !== "Ready" && machineState !== "Completed";

  const STAGES = [
    { id: 1, label: "1. Nạp bóng" },
    { id: 2, label: "2. Đảo trộn" },
    { id: 3, label: "3. Đón bóng" },
    { id: 4, label: "4. Vào khay" },
    { id: 5, label: "5. Hoàn tất" }
  ];

  return (
    <div className="flex flex-col gap-2.5 p-3 sm:p-4 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-2xl backdrop-blur-md w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 w-full">
        {/* Left: Preset Selection Pills */}
        <div className="flex items-center p-1 rounded-2xl bg-zinc-950 border border-zinc-800/80 shadow-inner">
          <button
            onClick={() => onSelectPreset("35")}
            disabled={isLocked}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
              customConfig.preset === "35"
                ? "bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-600/30 font-black"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 disabled:opacity-40"
            }`}
          >
            Lotto 5/35
          </button>
          <button
            onClick={() => onSelectPreset("45")}
            disabled={isLocked}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
              customConfig.preset === "45"
                ? "bg-gradient-to-r from-rose-600 to-red-500 text-white shadow-lg shadow-rose-600/30 font-black"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 disabled:opacity-40"
            }`}
          >
            Mega 6/45
          </button>
          <button
            onClick={() => onSelectPreset("55")}
            disabled={isLocked}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
              customConfig.preset === "55"
                ? "bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-lg shadow-orange-600/30 font-black"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 disabled:opacity-40"
            }`}
          >
            Power 6/55
          </button>
          <button
            onClick={() => onSelectPreset("custom")}
            disabled={isLocked}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
              customConfig.preset === "custom"
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 shadow-lg shadow-amber-500/30 font-black"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 disabled:opacity-40"
            }`}
          >
            Tùy chỉnh ({customConfig.pickCount}/{customConfig.totalBalls})
          </button>
        </div>

        {/* Center: Quick Camera Preset Buttons */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 shadow-inner overflow-x-auto">
          <div className="flex items-center gap-1 px-2 text-zinc-500 text-xs font-semibold hidden md:flex">
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>Góc máy:</span>
          </div>
          {(["default", "tubes", "chamber", "capture", "tray"] as const).map((key) => {
            const isSelected = cameraPreset === key;
            return (
              <button
                key={key}
                onClick={() => onSelectCameraPreset(key)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isSelected
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 shadow-md shadow-amber-500/20"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                }`}
              >
                {CAMERA_PRESETS[key].label}
              </button>
            );
          })}
        </div>

        {/* Right: Conditional Badge, Attempt Tracker & Settings Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {customConfig.enableRangeLimits && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-sm animate-pulse">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Quay có điều kiện</span>
            </div>
          )}

          {currentAttempt > 1 && machineState !== "Ready" && machineState !== "Completed" && (
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-2xl bg-rose-950/80 border border-rose-700/70 text-rose-300 text-xs font-mono font-bold">
              <RotateCw className="w-3 h-3 animate-spin" />
              <span>Thử: {currentAttempt}/30</span>
            </div>
          )}

          <div
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-2xl border text-xs sm:text-sm font-bold shadow-lg transition-all ${status.color}`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${status.dot}`} />
            <span>{status.label}</span>
          </div>

          <button
            onClick={onToggleSettingsModal}
            title="Tùy chỉnh số bóng, điều kiện nhận kết quả, thời gian & máy"
            className={`px-3 py-2 rounded-2xl text-xs sm:text-sm font-bold border transition-all flex items-center gap-1.5 ${
              isSettingsOpen
                ? "bg-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/20 font-black"
                : "bg-zinc-950/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-800"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Cấu hình & Tùy chỉnh</span>
          </button>

          {/* Audio Background Music Controller Widget (Placed on the far right) */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-950/90 border border-zinc-800 shadow-inner">
            <button
              onClick={onToggleBgm}
              title={bgmEnabled ? "Tắt nhạc nền" : "Bật nhạc nền"}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                bgmEnabled
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 shadow-md shadow-amber-500/20 font-black"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              {bgmEnabled ? (
                <>
                  {bgmVolume === 0 ? (
                    <VolumeX className="w-3.5 h-3.5" />
                  ) : bgmVolume < 0.5 ? (
                    <Volume1 className="w-3.5 h-3.5" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                  {/* Equalizer animation */}
                  <span className="flex items-end gap-0.5 h-3">
                    <span className="w-0.5 bg-zinc-950 rounded-full h-full animate-pulse" />
                    <span className="w-0.5 bg-zinc-950 rounded-full h-2 animate-bounce" />
                    <span className="w-0.5 bg-zinc-950 rounded-full h-2.5 animate-pulse" />
                  </span>
                  <span className="hidden md:inline text-[11px] font-black">Nhạc nền</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="hidden md:inline text-[11px]">Bật nhạc</span>
                </>
              )}
            </button>

            {/* Volume slider */}
            <div className="flex items-center gap-1.5 px-1.5">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={bgmVolume}
                onChange={(e) => onChangeBgmVolume?.(Number(e.target.value))}
                className="w-12 sm:w-16 h-1.5 accent-amber-500 cursor-pointer bg-zinc-800 rounded-lg"
                title={`Âm lượng: ${Math.round(bgmVolume * 100)}%`}
              />
              <span className="text-[10px] font-mono text-zinc-400 w-6 text-right hidden sm:inline">
                {Math.round(bgmVolume * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stage Progress Bar Breadcrumbs */}
      <div className="hidden sm:flex items-center justify-between gap-1.5 pt-2 border-t border-zinc-800/80 text-[11px] font-semibold text-zinc-400">
        {STAGES.map((st) => {
          const isActive = status.step === st.id;
          const isDone = status.step > st.id || status.step === 5;
          return (
            <div
              key={st.id}
              className={`flex-1 py-1 px-2 rounded-xl text-center transition-all border ${
                isActive
                  ? "bg-amber-500/15 border-amber-500/60 text-amber-300 font-bold shadow-sm"
                  : isDone
                  ? "bg-zinc-950/50 border-zinc-800 text-zinc-400"
                  : "bg-zinc-950/30 border-transparent text-zinc-600"
              }`}
            >
              {st.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- 2. DEBUG TELEMETRY PANEL ---
interface DebugPanelProps {
  config: MachineConfig;
  debugInfo: PhysicsDebugInfo;
  machineState: MachineState;
  onAgitate: () => void;
}

export function DrawingMachineDebugPanel({
  config,
  debugInfo,
  machineState,
  onAgitate
}: DebugPanelProps) {
  return (
    <div className="p-3.5 rounded-2xl bg-zinc-950/90 border border-rose-900/60 text-xs font-mono text-zinc-300 shadow-xl space-y-2 w-full">
      <div className="font-bold text-rose-400 flex items-center justify-between pb-1.5 border-b border-zinc-800">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5" />
          <span>Rapier3D Physics Telemetry (Dev Diagnostic)</span>
        </div>
        {machineState === "Capturing" && (
          <button
            onClick={onAgitate}
            title="Áp dụng xung lực cơ học ngẫu nhiên"
            className="px-2.5 py-0.5 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-300 text-[11px] font-bold flex items-center gap-1"
          >
            <Flame className="w-3 h-3" />
            <span>Kích xung lực (Dev)</span>
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 text-[11px]">
        <div>
          <span className="text-zinc-500">Bóng trong lồng: </span>
          <span className="font-bold text-amber-400">
            {debugInfo.activeBallsCount} / {config.totalBalls}
          </span>
        </div>
        <div>
          <span className="text-zinc-500">Đã gắp: </span>
          <span className="font-bold text-emerald-400">
            {debugInfo.extractedCount} / {config.pickCount}
          </span>
        </div>
        <div>
          <span className="text-zinc-500">Cửa gắp: </span>
          <span className={debugInfo.gateOpen ? "text-rose-400 font-bold" : "text-zinc-400"}>
            {debugInfo.gateOpen ? "MỞ (Đón bóng)" : "ĐÓNG"}
          </span>
        </div>
        <div>
          <span className="text-zinc-500">Mô-tơ: </span>
          <span className="font-bold text-blue-400">{debugInfo.motorSpeed} rad/s</span>
        </div>
        <div>
          <span className="text-zinc-500">FPS / Bước: </span>
          <span className="font-bold text-green-400">
            {debugInfo.fps} FPS ({debugInfo.physicsStepTimeMs}ms)
          </span>
        </div>
        <div>
          <span className="text-zinc-500">Văng ngoài (OOB): </span>
          <span
            className={`font-bold ${
              (debugInfo.outOfBoundsCount ?? 0) > 0
                ? "text-rose-500 animate-pulse"
                : "text-emerald-400"
            }`}
          >
            {debugInfo.outOfBoundsCount ?? 0}
          </span>
        </div>
      </div>
    </div>
  );
}

// --- 3. PRIMARY CONTROLS BAR ---
interface ControlsProps {
  customConfig: CustomMachineConfig;
  machineState: MachineState;
  onStartMixing: () => void;
  onStartAutoSequence: () => void;
  onCancelCapture: () => void;
  onResetSession: () => void;
  isAutoSequence: boolean;
  initialCountdown: number;
  extractedCount: number;
  captureSeconds: number;
  intervalRemaining: number;
  retryCountdown: number;
  rejectionInfo: RejectionInfo | null;
  isMaxAttemptsExceeded: boolean;
  hasJamWarning?: boolean;
  onRetryCapture?: () => void;
  showCountdown?: boolean;
}

export function DrawingMachineControls({
  customConfig,
  machineState,
  onStartMixing,
  onStartAutoSequence,
  onCancelCapture,
  onResetSession,
  isAutoSequence,
  initialCountdown,
  extractedCount,
  captureSeconds,
  intervalRemaining,
  retryCountdown,
  rejectionInfo,
  isMaxAttemptsExceeded,
  hasJamWarning = false,
  onRetryCapture,
  showCountdown = true
}: ControlsProps) {
  return (
    <div className="flex flex-col items-center gap-2.5 justify-center w-full">
      {/* 1. Rejection Toast Banner */}
      {rejectionInfo && (machineState === "Returning" || (machineState === "Mixing" && retryCountdown > 0)) && (
        <div className="w-full p-3.5 rounded-2xl bg-amber-950/90 border border-amber-500/80 text-amber-200 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-xl backdrop-blur-md animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <div
              style={{ backgroundColor: rejectionInfo.ball.color }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-950 font-black text-sm shadow-md border-2 border-white/80 shrink-0"
            >
              {rejectionInfo.ball.formatted}
            </div>
            <div>
              <p className="font-bold text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{rejectionInfo.reason}</span>
              </p>
              <p className="text-[11px] text-amber-400/80">
                Đang đưa bóng về lồng • Lần thử {rejectionInfo.attemptNumber}/30 cho vị trí #{rejectionInfo.slotIndex + 1}
                {retryCountdown > 0 && ` • Trộn lại trong ${retryCountdown}s`}
              </p>
            </div>
          </div>
          <span className="text-[10px] uppercase tracking-wider font-extrabold bg-amber-500 text-zinc-950 px-2 py-1 rounded-lg shrink-0">
            Lấy lại
          </span>
        </div>
      )}

      {/* 2. Max Attempts Exceeded Banner */}
      {isMaxAttemptsExceeded && (
        <div className="w-full p-4 rounded-2xl bg-rose-950/95 border-2 border-rose-600 text-rose-200 text-xs sm:text-sm font-semibold flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl backdrop-blur-md animate-in zoom-in-95 duration-300">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-7 h-7 text-rose-400 shrink-0 animate-bounce" />
            <div>
              <p className="font-black text-rose-300 text-sm sm:text-base">
                Đã vượt quá giới hạn 30 lần thử cho vị trí này!
              </p>
              <p className="text-xs text-rose-400/90">
                Cửa đón bóng đã đóng và phiên quay dừng lại. Hệ thống tuân thủ vật lý thực tế, không tự sinh số. Vui lòng đặt lại hoặc điều chỉnh khoảng nhận số.
              </p>
            </div>
          </div>
          <button
            onClick={onResetSession}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-rose-600/40 transition-all flex items-center gap-2 shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Đặt lại phiên quay</span>
          </button>
        </div>
      )}

      {/* 3. Timeout Warning */}
      {hasJamWarning && (
        <div className="w-full px-4 py-2.5 rounded-2xl bg-amber-950/90 border border-amber-600/70 text-amber-200 text-xs sm:text-sm font-semibold flex items-center justify-between gap-2 shadow-xl">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Chưa đón được bóng sau thời gian chờ. Đang tiếp tục đảo trộn.</span>
          </div>
          {onRetryCapture && (
            <button
              onClick={onRetryCapture}
              className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-colors shadow"
            >
              Thử đón lại
            </button>
          )}
        </div>
      )}

      {/* 4. Controls Main Action Buttons */}
      {!isMaxAttemptsExceeded && (
        <div className="flex items-center gap-3 justify-center w-full">
          {machineState === "Ready" && (
            <>
              <button
                onClick={onStartAutoSequence}
                className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:via-orange-400 hover:to-rose-400 text-zinc-950 font-black text-base sm:text-lg shadow-2xl shadow-orange-500/30 flex items-center justify-center gap-2.5 transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="w-5 h-5 fill-current" />
                <span>Quay tự động {customConfig.pickCount} bóng</span>
              </button>

              <button
                onClick={onStartMixing}
                title="Chỉ nạp bóng và trộn mà chưa mở cửa đón"
                className="px-5 py-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-sm border border-zinc-800 shadow-lg transition-all flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                <span className="hidden sm:inline">Trộn bóng</span>
              </button>
            </>
          )}

          {machineState === "Loading" && (
            <>
              <div className="flex-1 py-4 px-6 rounded-2xl bg-purple-950/80 border border-purple-800/80 text-purple-200 font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl">
                <Clock className="w-5 h-5 animate-spin text-purple-400" />
                <span>Đang mở ống nạp bóng vào lồng quay...</span>
              </div>

              <button
                onClick={onResetSession}
                title="Hủy nạp và quay lại từ đầu"
                className="p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 shadow-md transition-all"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </>
          )}

          {machineState === "Mixing" && isAutoSequence && retryCountdown <= 0 && (
            <>
              <div className="flex-1 py-4 px-6 rounded-2xl bg-amber-950/80 border border-amber-800/80 text-amber-200 font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl">
                <Clock className="w-5 h-5 animate-pulse text-amber-400" />
                <span>{showCountdown ? `Đang trộn bóng… ${initialCountdown}s` : "Đang trộn bóng..."}</span>
              </div>

              <button
                onClick={onResetSession}
                title="Quay lại từ đầu"
                className="p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 shadow-md transition-all"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </>
          )}

          {machineState === "Mixing" && isAutoSequence && retryCountdown > 0 && (
            <>
              <div className="flex-1 py-4 px-6 rounded-2xl bg-amber-950/80 border border-amber-800/80 text-amber-200 font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl">
                <Clock className="w-5 h-5 animate-spin text-amber-400" />
                <span>Đang trộn lại 5s sau khi hồi bóng… ({retryCountdown}s)</span>
              </div>

              <button
                onClick={onResetSession}
                title="Quay lại từ đầu"
                className="p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 shadow-md transition-all"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </>
          )}

          {machineState === "Mixing" && !isAutoSequence && (
            <>
              <button
                onClick={onStartAutoSequence}
                className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:via-orange-400 hover:to-rose-400 text-zinc-950 font-black text-base shadow-2xl shadow-orange-500/25 flex items-center justify-center gap-2.5 transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="w-5 h-5 fill-current" />
                <span>Quay tự động {customConfig.pickCount} bóng</span>
              </button>

              <button
                onClick={onResetSession}
                title="Quay lại từ đầu"
                className="p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 shadow-md transition-all"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </>
          )}

          {machineState === "Capturing" && (
            <>
              <div className="flex-1 py-4 px-6 rounded-2xl bg-rose-950/80 border border-rose-800/80 text-rose-200 font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl">
                <Clock className="w-5 h-5 animate-spin text-rose-400" />
                <span>
                  {showCountdown
                    ? `Đang đón bóng #${extractedCount + 1} (${captureSeconds}s)...`
                    : `Đang đón bóng #${extractedCount + 1}...`}
                </span>
              </div>

              <button
                onClick={onCancelCapture}
                title="Hủy lượt lấy này và tiếp tục trộn bóng"
                className="px-4 py-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs sm:text-sm border border-zinc-700 flex items-center gap-1.5 transition-all"
              >
                <XCircle className="w-4 h-4 text-rose-400" />
                <span>Hủy / Thử lại</span>
              </button>
            </>
          )}

          {machineState === "Returning" && (
            <div className="flex-1 py-4 px-6 rounded-2xl bg-amber-950/80 border border-amber-800/80 text-amber-200 font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl">
              <RotateCw className="w-5 h-5 text-amber-400 animate-spin" />
              <span>Bóng đang lăn theo đường hồi về lồng quay...</span>
            </div>
          )}

          {machineState === "Transporting" && (
            <div className="flex-1 py-4 px-6 rounded-2xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-200 font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl">
              <Sparkles className="w-5 h-5 text-emerald-400 animate-bounce" />
              <span>Bóng #{extractedCount + 1} đang lăn qua ống trượt ra khay...</span>
            </div>
          )}

          {machineState === "WaitingNext" && (
            <>
              <div className="flex-1 py-4 px-6 rounded-2xl bg-blue-950/80 border border-blue-800/80 text-blue-200 font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl">
                <Clock className="w-5 h-5 animate-pulse text-blue-400" />
                <span>
                  {showCountdown
                    ? `Bóng #${extractedCount + 1} sẽ mở cửa đón sau ${intervalRemaining}s...`
                    : `Chuẩn bị đón bóng #${extractedCount + 1}...`}
                </span>
              </div>

              <button
                onClick={onResetSession}
                title="Dừng chuỗi tự động và đặt lại"
                className="p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 shadow-md transition-all"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </>
          )}

          {machineState === "Completed" && (
            <div className="flex-1 flex items-center gap-2.5 sm:gap-3 flex-wrap">
              <button
                onClick={onStartAutoSequence}
                className="flex-1 min-w-[200px] py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:from-amber-300 hover:to-rose-400 text-zinc-950 font-black text-base sm:text-lg shadow-2xl shadow-amber-500/30 flex items-center justify-center gap-2.5 transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Quay tiếp tự động</span>
              </button>

              <button
                onClick={onResetSession}
                className="py-4 px-5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-sm sm:text-base border border-zinc-700 flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Chuẩn bị lượt mới</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- 4. GAMESHOW RESULT TRAY & SUMMARY PANEL ---
interface ResultsProps {
  config: MachineConfig;
  extractedResults: ExtractedBallResult[];
}

export function DrawingMachineResults({ config, extractedResults }: ResultsProps) {
  const [copiedCurrent, setCopiedCurrent] = React.useState<boolean>(false);

  const is535 = config.gameName === "Lotto 5/35" || config.totalBalls === 35;

  // For Lotto 5/35: sort the first 5 numbers ascending, keep the 6th number in its position
  let sortedNumbers: number[];
  if (is535 && extractedResults.length >= 6) {
    const first5 = extractedResults.slice(0, 5).map((r) => r.ball.number).sort((a, b) => a - b);
    const sixth = extractedResults.slice(5).map((r) => r.ball.number);
    sortedNumbers = [...first5, ...sixth];
  } else if (is535 && extractedResults.length > 0) {
    const first5 = extractedResults.slice(0, 5).map((r) => r.ball.number).sort((a, b) => a - b);
    sortedNumbers = [...first5];
  } else {
    sortedNumbers = [...extractedResults]
      .map((r) => r.ball.number)
      .sort((a, b) => a - b);
  }

  const handleCopyCurrent = () => {
    if (extractedResults.length === 0) return;
    const sortedStr =
      is535 && sortedNumbers.length === 6
        ? `${sortedNumbers.slice(0, 5).map((n) => n.toString().padStart(2, "0")).join(" - ")} | ${sortedNumbers[5].toString().padStart(2, "0")}`
        : sortedNumbers.map((n) => n.toString().padStart(2, "0")).join(" - ");

    const text = `Bộ số Lụmlott (${config.gameName}): ${extractedResults.map((r) => r.ball.formatted).join(" - ")} (Sắp xếp: ${sortedStr})`;
    navigator.clipboard.writeText(text);
    setCopiedCurrent(true);
    setTimeout(() => setCopiedCurrent(false), 2000);
  };

  // Dynamic grid column layout according to pickCount
  const gridColsClass =
    config.pickCount <= 6
      ? "grid-cols-6"
      : config.pickCount <= 10
      ? "grid-cols-5 sm:grid-cols-10"
      : "grid-cols-6 sm:grid-cols-12";

  return (
    <div className="p-4 sm:p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-2xl space-y-4 w-full backdrop-blur-md">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
        <div className="flex items-center gap-2 font-extrabold text-sm sm:text-base text-zinc-100">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Khay Số Lượt Quay Hiện Tại ({config.pickCount} bóng)</span>
          {config.enableRangeLimits && (
            <span className="text-[11px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800/60">
              Kèm điều kiện khoảng
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {extractedResults.length > 0 && (
            <button
              onClick={handleCopyCurrent}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold border border-zinc-700 transition-colors"
              title="Sao chép bộ số lượt này"
            >
              {copiedCurrent ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
              <span>{copiedCurrent ? "Đã chép!" : "Sao chép"}</span>
            </button>
          )}
          <span className="text-xs font-bold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-800/60">
            {extractedResults.length} / {config.pickCount} bóng
          </span>
        </div>
      </div>

      {/* Visual Slots with 01..K Bezel Numbers & Range Badges */}
      <div className={`grid ${gridColsClass} gap-2.5 sm:gap-3.5`}>
        {Array.from({ length: config.pickCount }).map((_, idx) => {
          const res = extractedResults[idx];
          const isLatest = res && idx === extractedResults.length - 1;
          const limit = config.enableRangeLimits && config.rangeLimits ? config.rangeLimits[idx] : null;
          const isBonus = config.gameName === "Lotto 5/35" && idx === 5;

          return (
            <div
              key={idx}
              className={`relative aspect-square rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center border transition-all duration-300 ${
                res
                  ? isLatest
                    ? "bg-gradient-to-b from-amber-950/70 via-zinc-900 to-zinc-950 border-amber-400 shadow-2xl shadow-amber-500/40 scale-[1.03]"
                    : "bg-gradient-to-b from-zinc-800/90 via-zinc-900 to-zinc-950 border-amber-500/60 shadow-lg shadow-amber-500/15"
                  : "bg-zinc-950/70 border-zinc-800/70 border-dashed"
              }`}
            >
              {/* Slot Number Indicator */}
              <span className="absolute top-1.5 text-[10px] sm:text-xs font-black text-zinc-500/80">
                {(idx + 1).toString().padStart(2, "0")}
              </span>

              {res ? (
                <div className="flex items-center justify-center">
                  <LotteryBallBadge
                    number={res.ball.number}
                    formatted={res.ball.formatted}
                    size="tray"
                    isBonus={isBonus}
                    animate={isLatest}
                  />
                </div>
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-zinc-800/80 bg-zinc-900/40 flex items-center justify-center shadow-inner">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-800/60" />
                </div>
              )}

              {/* Range badge if active */}
              {limit && (
                <span className={`absolute bottom-1.5 text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shadow ${
                  isBonus
                    ? "text-amber-300 bg-amber-950/90 border border-amber-500/60"
                    : "text-amber-400/90 bg-zinc-950/90 border border-zinc-800"
                }`}>
                  [{limit.min}-{limit.max}]
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Display: Physical Order & Ascending Sorted Order */}
      {extractedResults.length > 0 && (
        <div className="pt-3 border-t border-zinc-800/80 space-y-3 text-xs sm:text-sm">
          {/* 1. Physical Extraction Order (Official) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 shadow-inner">
            <span className="text-zinc-400 font-semibold flex items-center gap-1.5 shrink-0">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span>Thứ tự rút trực tiếp:</span>
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {extractedResults.map((r, i) => (
                <React.Fragment key={r.ball.id}>
                  <div className="flex items-center gap-1.5 bg-zinc-900/90 px-2 py-1 rounded-xl border border-zinc-800 shadow-sm">
                    <LotteryBallBadge
                      number={r.ball.number}
                      formatted={r.ball.formatted}
                      size="sm"
                      isBonus={config.gameName === "Lotto 5/35" && i === 5}
                    />
                    {r.rangeLimit && (
                      <span className="text-[10px] font-mono text-amber-400 font-bold">
                        [{r.rangeLimit.min}-{r.rangeLimit.max}]
                      </span>
                    )}
                  </div>
                  {i < extractedResults.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-600" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* 2. Sorted Ascending Sequence */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-gradient-to-r from-amber-950/30 via-zinc-950 to-zinc-950 border border-amber-500/40 shadow-inner">
            <span className="text-amber-300 font-bold flex items-center gap-1.5 shrink-0">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>
                {is535
                  ? "Dãy số sắp xếp (5 số đầu tăng dần + số thứ 6):"
                  : "Dãy số sắp xếp tăng dần:"}
              </span>
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {sortedNumbers.map((num, idx) => {
                const isBonus = is535 && idx === 5;
                return (
                  <React.Fragment key={`${num}-${idx}`}>
                    {is535 && idx === 5 && (
                      <span className="text-amber-400 font-black text-sm px-1">+</span>
                    )}
                    <LotteryBallBadge
                      number={num}
                      size="md"
                      isBonus={isBonus}
                    />
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- 4B. DRAW HISTORY PANEL (Lịch sử các bộ số đã quay) ---
interface HistoryProps {
  history: DrawHistoryRecord[];
  onClearHistory: () => void;
  onStartAutoSequence?: () => void;
}

export function DrawingMachineHistory({
  history,
  onClearHistory,
  onStartAutoSequence
}: HistoryProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [copiedAll, setCopiedAll] = React.useState<boolean>(false);
  const [showConfirmClear, setShowConfirmClear] = React.useState<boolean>(false);

  const formatSortedNumbers = (record: DrawHistoryRecord) => {
    const is535 = record.preset === "35" || record.gameName.includes("5/35");
    if (is535 && record.sortedNumbers.length === 6) {
      const first5 = record.sortedNumbers.slice(0, 5).map((n) => n.toString().padStart(2, "0")).join(" - ");
      const sixth = record.sortedNumbers[5].toString().padStart(2, "0");
      return `${first5} | ${sixth}`;
    }
    return record.sortedNumbers.map((n) => n.toString().padStart(2, "0")).join(" - ");
  };

  const handleCopySingle = (record: DrawHistoryRecord) => {
    const text = `Lượt #${record.drawIndex} (${record.gameName}): ${record.balls.map((b) => b.formatted).join(" - ")} (Sắp xếp: ${formatSortedNumbers(record)})`;
    navigator.clipboard.writeText(text);
    setCopiedId(record.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAll = () => {
    if (history.length === 0) return;
    const text = history
      .map(
        (r) =>
          `Lượt #${r.drawIndex} [${new Date(r.timestamp).toLocaleTimeString("vi-VN")}] (${r.gameName}): ${r.balls.map((b) => b.formatted).join(" - ")} (Sắp xếp: ${formatSortedNumbers(r)})`
      )
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    const timeStr = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const dateStr = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    return `${timeStr} • ${dateStr}`;
  };

  return (
    <div className="p-4 sm:p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-2xl space-y-4 w-full backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm sm:text-base text-zinc-100">
                Lịch Sử Các Bộ Số Đã Quay
              </h3>
              <span className="text-xs font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800/60">
                {history.length} kỳ
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Tất cả các lượt quay được tự động lưu lại trong bộ nhớ trình duyệt
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopyAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-colors shadow-sm"
              title="Sao chép toàn bộ danh sách bộ số"
            >
              {copiedAll ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
              <span>{copiedAll ? "Đã sao chép tất cả!" : "Sao chép tất cả"}</span>
            </button>

            {showConfirmClear ? (
              <div className="flex items-center gap-1 bg-rose-950/80 p-1 rounded-xl border border-rose-800">
                <span className="text-[11px] font-bold text-rose-300 px-1.5">Xóa hết?</span>
                <button
                  onClick={() => {
                    onClearHistory();
                    setShowConfirmClear(false);
                  }}
                  className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-black"
                >
                  Xác nhận
                </button>
                <button
                  onClick={() => setShowConfirmClear(false)}
                  className="px-1.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white text-[11px]"
                >
                  Hủy
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirmClear(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-rose-950 hover:text-rose-300 text-zinc-400 text-xs font-semibold border border-zinc-700/80 transition-colors"
                title="Xóa toàn bộ lịch sử quay"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Xóa lịch sử</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* History Items List */}
      {history.length === 0 ? (
        <div className="py-8 flex flex-col items-center justify-center text-center text-zinc-500 space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-center text-zinc-600">
            <History className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-zinc-400">
            Chưa có lượt quay nào được lưu
          </p>
          <p className="text-xs text-zinc-500 max-w-sm">
            Bấm nút <span className="text-amber-400 font-bold">"Quay số tự động"</span> để bắt đầu quay, các bộ số may mắn sẽ tự động được ghi lại tại đây!
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
          {history.map((record) => {
            const isCopied = copiedId === record.id;
            return (
              <div
                key={record.id}
                className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                {/* Meta info & draw balls */}
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="font-black text-amber-400">
                      Lượt #{record.drawIndex}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-zinc-800/80 border border-zinc-700 text-[10px] font-bold text-zinc-300">
                      {record.gameName}
                    </span>
                    <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimestamp(record.timestamp)}
                    </span>
                  </div>

                  {/* Balls Row */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap py-0.5">
                    {record.balls.map((b, bIdx) => (
                      <LotteryBallBadge
                        key={bIdx}
                        number={b.number}
                        formatted={b.formatted}
                        size="sm"
                        isBonus={record.preset === "35" && bIdx === 5}
                      />
                    ))}
                  </div>

                  {/* Sorted sequence string */}
                  <p className="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5 flex-wrap">
                    <span className="text-zinc-500">Sắp xếp:</span>
                    <span className="text-amber-300 font-bold bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/50">
                      {formatSortedNumbers(record)}
                    </span>
                  </p>
                </div>

                {/* Quick copy single draw */}
                <div className="shrink-0 flex sm:flex-col items-end justify-between sm:justify-center">
                  <button
                    onClick={() => handleCopySingle(record)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold border border-zinc-800 transition-all group-hover:border-zinc-700 shadow-sm"
                    title="Sao chép bộ số này"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                    <span>{isCopied ? "Đã sao chép!" : "Sao chép"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- 5. SECONDARY DRAWER / MODAL: CONFIGURATION & CUSTOMIZATION ---
const ACCENT_COLOR_PRESETS = [
  { name: "Vàng hoàng gia", hex: "#f59e0b" },
  { name: "Cam lửa", hex: "#ea580c" },
  { name: "Đỏ ruby", hex: "#ef4444" },
  { name: "Xanh lục bảo", hex: "#10b981" },
  { name: "Xanh sapphire", hex: "#3b82f6" },
  { name: "Tím thạch anh", hex: "#8b5cf6" },
  { name: "Hoàng yến", hex: "#eab308" },
  { name: "Bạch kim", hex: "#94a3b8" }
];

export interface DrawingMachineSettingsProps {
  customConfig: CustomMachineConfig;
  onUpdateCustomConfig: (config: CustomMachineConfig) => void;
  settings: MachineCustomSettings;
  onUpdateSettings: (partial: Partial<MachineCustomSettings>) => void;
  onResetDefaults: () => void;
  isLocked: boolean;
  cameraPreset: "default" | "tubes" | "chamber" | "capture" | "tray";
  onSelectCameraPreset: (preset: "default" | "tubes" | "chamber" | "capture" | "tray") => void;
  showDebug: boolean;
  onToggleDebug: () => void;
  onClose?: () => void;
}

// Helper component for smooth number input editing without premature clamping
function NumberInput({
  value,
  min,
  max,
  disabled = false,
  onChange,
  className = ""
}: {
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (val: number) => void;
  className?: string;
}) {
  const [text, setText] = React.useState<string>(String(value));

  React.useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const parsed = parseInt(raw, 10);
    const clamped = isNaN(parsed) ? value : Math.min(max, Math.max(min, parsed));
    setText(String(clamped));
    onChange(clamped);
  };

  return (
    <input
      type="number"
      min={min}
      max={max}
      value={text}
      disabled={disabled}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        const parsed = parseInt(raw, 10);
        if (!isNaN(parsed) && parsed >= min && parsed <= max) {
          onChange(parsed);
        }
      }}
      onBlur={() => commit(text)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          commit(text);
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={className}
    />
  );
}

export function DrawingMachineSettings({
  customConfig,
  onUpdateCustomConfig,
  settings,
  onUpdateSettings,
  onResetDefaults,
  isLocked,
  cameraPreset,
  onSelectCameraPreset,
  showDebug,
  onToggleDebug,
  onClose
}: DrawingMachineSettingsProps) {
  // Validate current configuration on each render
  const validation = validateBipartiteMatching(customConfig);

  // Custom Hex state for color input
  const [customHex, setCustomHex] = React.useState<string>(settings.accentColor || "#f59e0b");

  React.useEffect(() => {
    if (settings.accentColor) {
      setCustomHex(settings.accentColor);
    }
  }, [settings.accentColor]);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomHex(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      onUpdateSettings({ accentColor: val });
    }
  };

  // Update total balls N
  const handleTotalBallsChange = (val: number) => {
    const N = Math.min(60, Math.max(10, Math.round(val)));
    const K = Math.min(customConfig.pickCount, N);
    const newLimits: SlotRangeLimit[] = Array.from({ length: K }, (_, i) => {
      const existing = customConfig.rangeLimits[i];
      if (existing) {
        return {
          slotIndex: i,
          min: Math.min(existing.min, N),
          max: Math.min(Math.max(existing.max, existing.min), N)
        };
      }
      return { slotIndex: i, min: 1, max: N };
    });

    onUpdateCustomConfig({
      ...customConfig,
      preset: "custom",
      totalBalls: N,
      pickCount: K,
      rangeLimits: newLimits
    });
  };

  // Update results count K
  const handlePickCountChange = (val: number) => {
    const K = Math.min(customConfig.totalBalls, Math.max(1, Math.round(val)));
    const newLimits: SlotRangeLimit[] = Array.from({ length: K }, (_, i) => {
      const existing = customConfig.rangeLimits[i];
      if (existing) {
        return {
          slotIndex: i,
          min: existing.min,
          max: existing.max
        };
      }
      return { slotIndex: i, min: 1, max: customConfig.totalBalls };
    });

    onUpdateCustomConfig({
      ...customConfig,
      preset: "custom",
      pickCount: K,
      rangeLimits: newLimits
    });
  };

  // Update slot range limit
  const handleRangeLimitChange = (slotIdx: number, field: "min" | "max", val: number) => {
    const num = Math.min(customConfig.totalBalls, Math.max(1, Math.round(val)));
    const updated = customConfig.rangeLimits.map((lim, idx) => {
      if (idx !== slotIdx) return lim;
      return {
        ...lim,
        [field]: num
      };
    });

    onUpdateCustomConfig({
      ...customConfig,
      preset: "custom",
      rangeLimits: updated
    });
  };

  // Preset quick buttons
  const applyPreset = (preset: "35" | "45" | "55" | "custom") => {
    if (preset === "custom") {
      onUpdateCustomConfig({
        ...customConfig,
        preset: "custom"
      });
      return;
    }

    onUpdateCustomConfig(getPresetConfig(preset));
  };

  // Reset all limits to 1..N
  const handleResetLimitsToFullRange = () => {
    const N = customConfig.totalBalls;
    onUpdateCustomConfig({
      ...customConfig,
      rangeLimits: Array.from({ length: customConfig.pickCount }, (_, i) => ({
        slotIndex: i,
        min: 1,
        max: N
      }))
    });
  };

  const isCustomMode = customConfig.preset === "custom";
  const tubeCount = Math.ceil(customConfig.totalBalls / 10);

  return (
    <div className="w-full p-5 sm:p-6 rounded-3xl bg-zinc-900/95 border border-zinc-800 shadow-2xl space-y-6 backdrop-blur-xl">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-base sm:text-lg text-zinc-100">
              Cấu Hình Máy & Điều Kiện Rút Thưởng
            </h3>
            <p className="text-xs text-zinc-400">
              Tùy chỉnh số lượng bóng (10–60), số kết quả (1–N) và giới hạn khoảng Min–Max cho từng vị trí
            </p>
          </div>
        </div>

        {/* Action button & Lock Indicator */}
        <div className="flex items-center gap-2">
          {isLocked && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-950/60 border border-amber-800/60 text-amber-300 text-xs font-semibold">
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Khóa khi đang quay</span>
            </div>
          )}

          <button
            onClick={onResetDefaults}
            disabled={isLocked}
            title="Khôi phục cấu hình mặc định (55 bóng, 6 kết quả, không giới hạn khoảng)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-semibold text-xs transition-colors border border-zinc-700 disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Khôi phục mặc định</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Camera & Diagnostics Bar */}
      <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-3">
        <div className="flex items-center justify-between font-bold text-xs sm:text-sm text-zinc-200">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-400" />
            <span>Góc máy Camera & Chẩn đoán</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(["default", "tubes", "chamber", "capture", "tray"] as const).map((key) => (
            <button
              key={key}
              onClick={() => onSelectCameraPreset(key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                cameraPreset === key
                  ? "bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              {CAMERA_PRESETS[key].label}
            </button>
          ))}

          <div className="w-[1px] h-5 bg-zinc-800 mx-1 hidden sm:block" />

          {/* Debug Button */}
          <button
            onClick={onToggleDebug}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              showDebug
                ? "bg-rose-950 text-rose-400 border border-rose-800 shadow-sm"
                : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Thông số Rapier3D</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: MACHINE BALLS & RESULTS CONFIGURATION */}
      <div className={`p-4 sm:p-5 rounded-2xl bg-zinc-950/70 border transition-all space-y-4 ${
        isLocked ? "border-zinc-800/60 opacity-80" : "border-zinc-800"
      }`}>
        <div className="flex items-center justify-between font-bold text-zinc-200">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>1. Cấu hình số bóng & kết quả</span>
          </div>
          {isLocked && <Lock className="w-3.5 h-3.5 text-zinc-500" />}
        </div>

        {/* Preset Selector Buttons (35, 45, 55, Custom) */}
        <div className="space-y-1.5">
          <span className="text-zinc-400 text-xs font-semibold">Cấu hình mẫu hoặc Tùy chỉnh:</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(["35", "45", "55", "custom"] as const).map((p) => {
              const isSelected = customConfig.preset === p;
              const pNames = {
                "35": "Lotto 5/35",
                "45": "Mega 6/45",
                "55": "Power 6/55",
                "custom": "Tùy chỉnh (Custom)"
              };
              return (
                <button
                  key={p}
                  disabled={isLocked}
                  onClick={() => applyPreset(p)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    isSelected
                      ? "bg-amber-500 text-zinc-950 border-amber-400 shadow-md font-black scale-[1.02]"
                      : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
                  }`}
                >
                  {pNames[p]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Inputs: N (Total Balls) and K (Pick Count) - Editable only in Custom mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-800/60">
          {/* Total Balls N */}
          <div className={`space-y-2 p-3 rounded-xl border transition-all ${
            isCustomMode ? "bg-zinc-900/60 border-amber-500/40" : "bg-zinc-950/40 border-zinc-800/60 opacity-75"
          }`}>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                <span>Tổng số bóng N (10–60):</span>
                {!isCustomMode && (
                  <span className="text-[10px] text-amber-400/80 font-normal">(Cố định theo preset)</span>
                )}
              </span>
              <span className="font-bold text-amber-400">{customConfig.totalBalls} bóng</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={10}
                max={60}
                step={1}
                value={customConfig.totalBalls}
                disabled={isLocked || !isCustomMode}
                onChange={(e) => handleTotalBallsChange(Number(e.target.value))}
                className="flex-1 accent-amber-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              />
              <NumberInput
                min={10}
                max={60}
                value={customConfig.totalBalls}
                disabled={isLocked || !isCustomMode}
                onChange={handleTotalBallsChange}
                className="w-16 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-amber-400 font-bold text-center text-xs disabled:opacity-40"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>Số ống nạp tương ứng:</span>
              <span className="font-bold text-zinc-200">
                ceil({customConfig.totalBalls}/10) = <strong className="text-amber-400">{tubeCount} ống</strong>
              </span>
            </div>
          </div>

          {/* Pick Count K */}
          <div className={`space-y-2 p-3 rounded-xl border transition-all ${
            isCustomMode ? "bg-zinc-900/60 border-amber-500/40" : "bg-zinc-950/40 border-zinc-800/60 opacity-75"
          }`}>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                <span>Số kết quả cần rút K (1–{customConfig.totalBalls}):</span>
                {!isCustomMode && (
                  <span className="text-[10px] text-amber-400/80 font-normal">(Cố định theo preset)</span>
                )}
              </span>
              <span className="font-bold text-amber-400">{customConfig.pickCount} bóng</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={customConfig.totalBalls}
                step={1}
                value={customConfig.pickCount}
                disabled={isLocked || !isCustomMode}
                onChange={(e) => handlePickCountChange(Number(e.target.value))}
                className="flex-1 accent-amber-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              />
              <NumberInput
                min={1}
                max={customConfig.totalBalls}
                value={customConfig.pickCount}
                disabled={isLocked || !isCustomMode}
                onChange={handlePickCountChange}
                className="w-16 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-amber-400 font-bold text-center text-xs disabled:opacity-40"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>{isCustomMode ? "Chế độ tùy chỉnh:" : "Cấu hình chuẩn:"}</span>
              <span className="font-bold text-zinc-300">
                {isCustomMode ? "Đang cho phép nhập tự do" : "Chọn Tùy chỉnh để mở khóa"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: PER-SLOT RANGE LIMITS (QUAY CÓ ĐIỀU KIỆN) */}
      <div className={`p-4 sm:p-5 rounded-2xl bg-zinc-950/70 border transition-all space-y-4 ${
        isLocked ? "border-zinc-800/60 opacity-80" : "border-zinc-800"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-zinc-200">2. Giới hạn khoảng số từng kết quả (Min – Max)</span>
          </div>

          {/* Range Limit Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">
              {customConfig.enableRangeLimits ? "Đang BẬT" : "TẮT"}
            </span>
            <button
              disabled={isLocked}
              onClick={() =>
                onUpdateCustomConfig({
                  ...customConfig,
                  preset: "custom",
                  enableRangeLimits: !customConfig.enableRangeLimits
                })
              }
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-1 disabled:opacity-40 ${
                customConfig.enableRangeLimits ? "bg-amber-500" : "bg-zinc-800"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-zinc-950 transition-transform ${
                  customConfig.enableRangeLimits ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {customConfig.enableRangeLimits && (
          <div className="space-y-3 pt-2 border-t border-zinc-800/60 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>
                Cấu hình Min / Max cho từng vị trí rút từ 1 đến {customConfig.pickCount}:
              </span>
              <button
                disabled={isLocked}
                onClick={handleResetLimitsToFullRange}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold underline disabled:opacity-40"
              >
                Đặt tất cả về 1..{customConfig.totalBalls}
              </button>
            </div>

            {/* Validation Banner Indicator */}
            {validation.valid ? (
              <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-600/60 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Cấu hình hợp lệ: Tồn tại tập {customConfig.pickCount} số khác nhau thỏa mãn toàn bộ các khoảng.</span>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-600 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{validation.error}</span>
              </div>
            )}

            {/* Slots Min-Max Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
              {Array.from({ length: customConfig.pickCount }).map((_, idx) => {
                const limit = customConfig.rangeLimits[idx] || { min: 1, max: customConfig.totalBalls };
                const isInvalidRow = limit.min > limit.max || limit.min < 1 || limit.max > customConfig.totalBalls;

                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl bg-zinc-900/90 border flex items-center justify-between gap-2 ${
                      isInvalidRow ? "border-rose-600/80 bg-rose-950/20" : "border-zinc-800"
                    }`}
                  >
                    <span className="text-xs font-black text-amber-400 w-8">
                      #{(idx + 1).toString().padStart(2, "0")}
                    </span>

                    <div className="flex items-center gap-1.5 flex-1 justify-end">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-zinc-500 font-bold">Min</span>
                        <NumberInput
                          min={1}
                          max={customConfig.totalBalls}
                          value={limit.min}
                          disabled={isLocked}
                          onChange={(val) => handleRangeLimitChange(idx, "min", val)}
                          className="w-12 px-1.5 py-1 rounded bg-zinc-950 border border-zinc-700 text-zinc-200 font-mono text-center text-xs disabled:opacity-40"
                        />
                      </div>

                      <span className="text-zinc-600 font-bold">-</span>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-zinc-500 font-bold">Max</span>
                        <NumberInput
                          min={1}
                          max={customConfig.totalBalls}
                          value={limit.max}
                          disabled={isLocked}
                          onChange={(val) => handleRangeLimitChange(idx, "max", val)}
                          className="w-12 px-1.5 py-1 rounded bg-zinc-950 border border-zinc-700 text-zinc-200 font-mono text-center text-xs disabled:opacity-40"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: TIMINGS, MOTOR SPEED, GRAPHICS & ACCENT */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs sm:text-sm">
        {/* Card 1: Timings */}
        <div className={`p-4 rounded-2xl bg-zinc-950/60 border transition-all space-y-4 ${
          isLocked ? "border-zinc-800/60 opacity-80" : "border-zinc-800"
        }`}>
          <div className="flex items-center justify-between font-bold text-zinc-200">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-amber-400" />
              <span>Thời gian chu kỳ</span>
            </div>
            {isLocked && <Lock className="w-3.5 h-3.5 text-zinc-500" />}
          </div>

          {/* Initial Mix Time Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Thời gian trộn ban đầu:</span>
              <span className="font-bold text-amber-400">{settings.initialMixDuration} giây</span>
            </div>
            <input
              type="range"
              min={3}
              max={15}
              step={1}
              value={settings.initialMixDuration}
              disabled={isLocked}
              onChange={(e) => onUpdateSettings({ initialMixDuration: Number(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            />
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>3s</span>
              <span>Mặc định: 5s</span>
              <span>15s</span>
            </div>
          </div>

          {/* Interval After Tray Slider */}
          <div className="space-y-1.5 pt-2 border-t border-zinc-800/60">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Khoảng nghỉ sau khi vào khay:</span>
              <span className="font-bold text-amber-400">{settings.trayIntervalDuration} giây</span>
            </div>
            <input
              type="range"
              min={2}
              max={10}
              step={1}
              value={settings.trayIntervalDuration}
              disabled={isLocked}
              onChange={(e) => onUpdateSettings({ trayIntervalDuration: Number(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            />
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>2s</span>
              <span>Mặc định: 5s</span>
              <span>10s</span>
            </div>
          </div>
        </div>

        {/* Card 2: Motor Speed */}
        <div className={`p-4 rounded-2xl bg-zinc-950/60 border transition-all space-y-4 ${
          isLocked ? "border-zinc-800/60 opacity-80" : "border-zinc-800"
        }`}>
          <div className="flex items-center justify-between font-bold text-zinc-200">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-blue-400" />
              <span>Tốc độ quay cánh quạt</span>
            </div>
            {isLocked && <Lock className="w-3.5 h-3.5 text-zinc-500" />}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(["slow", "standard", "fast"] as const).map((mode) => {
              const isSelected = settings.motorSpeedMode === mode;
              const labels: Record<MotorSpeedMode, { title: string; desc: string }> = {
                slow: { title: "Chậm", desc: "0.75x" },
                standard: { title: "Chuẩn", desc: "1.0x" },
                fast: { title: "Nhanh", desc: "1.25x" }
              };
              return (
                <button
                  key={mode}
                  disabled={isLocked}
                  onClick={() => onUpdateSettings({ motorSpeedMode: mode })}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all ${
                    isSelected
                      ? "bg-blue-950/90 border-blue-500 text-blue-200 shadow-md shadow-blue-500/20 font-bold"
                      : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 disabled:opacity-40"
                  }`}
                >
                  <span className="text-xs font-bold">{labels[mode].title}</span>
                  <span className="text-[10px] text-zinc-400">{labels[mode].desc}</span>
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-zinc-500">
            * Mức Chuẩn giữ nguyên tỷ lệ vật lý ({`3.8 rad/s`}).
          </p>
        </div>

        {/* Card 3: Display & Graphics Quality */}
        <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between font-bold text-zinc-200">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-emerald-400" />
              <span>Hiển thị & Đồ họa</span>
            </div>
            <span className="text-[10px] font-medium text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60">
              Đổi ngay
            </span>
          </div>

          {/* Graphics Quality Selector */}
          <div className="space-y-1.5">
            <span className="font-semibold text-zinc-300 text-xs block">Chất lượng đồ họa 3D:</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(["low", "medium", "high"] as const).map((q) => {
                const isSelected = settings.graphicsQuality === q;
                const qLabels = { low: "Thấp", medium: "Vừa", high: "Cao" };
                return (
                  <button
                    key={q}
                    onClick={() => onUpdateSettings({ graphicsQuality: q })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${
                      isSelected
                        ? "bg-amber-500 text-zinc-950 border-amber-400 shadow-sm font-black"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                    }`}
                  >
                    {qLabels[q]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Auto Focus Chamber Toggle */}
          <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-800/60">
            <div>
              <span className="font-semibold text-zinc-300 block">Tự động focus lồng sau khi nạp</span>
              <span className="text-[10px] text-zinc-500">Chuyển sang cận cảnh lồng khi bắt đầu trộn</span>
            </div>
            <button
              onClick={() => onUpdateSettings({ autoFocusChamber: !settings.autoFocusChamber })}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-1 ${
                settings.autoFocusChamber ? "bg-amber-500" : "bg-zinc-800"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-zinc-950 transition-transform ${
                  settings.autoFocusChamber ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Show Countdown Toggle */}
          <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-800/60">
            <div>
              <span className="font-semibold text-zinc-300 block">Hiển thị đếm ngược</span>
              <span className="text-[10px] text-zinc-500">Hiện số giây đếm ngược trên thanh trạng thái</span>
            </div>
            <button
              onClick={() => onUpdateSettings({ showCountdown: !settings.showCountdown })}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-1 ${
                settings.showCountdown ? "bg-amber-500" : "bg-zinc-800"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-zinc-950 transition-transform ${
                  settings.showCountdown ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Card: BGM Audio & Sound Settings */}
        <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between font-bold text-zinc-200">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-amber-400" />
              <span>Âm thanh & Nhạc nền</span>
            </div>
            <span className="text-[10px] font-medium text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800/60">
              {settings.bgmEnabled ? "Đang bật" : "Đang tắt"}
            </span>
          </div>

          {/* Toggle Music */}
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-zinc-300 block">Nhạc nền Gameshow</span>
              <span className="text-[10px] text-zinc-500">Phát nhạc nền sôi động khi quay thưởng</span>
            </div>
            <button
              onClick={() => onUpdateSettings({ bgmEnabled: !settings.bgmEnabled })}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-1 ${
                settings.bgmEnabled ? "bg-amber-500" : "bg-zinc-800"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-zinc-950 transition-transform ${
                  settings.bgmEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Volume Slider */}
          <div className="space-y-1.5 pt-2 border-t border-zinc-800/60">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400 flex items-center gap-1.5">
                {settings.bgmVolume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
                ) : settings.bgmVolume < 0.5 ? (
                  <Volume1 className="w-3.5 h-3.5 text-zinc-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>Âm lượng nhạc nền:</span>
              </span>
              <span className="font-bold text-amber-400">
                {Math.round((settings.bgmVolume ?? 0.6) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.bgmVolume ?? 0.6}
              onChange={(e) => onUpdateSettings({ bgmVolume: Number(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>0% (Tắt)</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* Card 4: Main Stage & Machine Accent Color with Custom Spectrum Picker */}
        <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800 space-y-4 md:col-span-2 lg:col-span-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-800/80">
            <div>
              <div className="flex items-center gap-2 font-bold text-zinc-200">
                <Palette className="w-4 h-4 text-purple-400" />
                <span>Tông màu chủ đạo sân khấu & lồng quay</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Tùy biến ánh sáng & màu sắc máy theo ý muốn (Màu bóng & số kết quả luôn được bảo toàn chuẩn mực)
              </p>
            </div>

            {/* Current Active Color Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700/80 self-start sm:self-center shadow-inner">
              <span className="text-zinc-400 text-xs font-semibold">Đang chọn:</span>
              <div
                style={{ backgroundColor: settings.accentColor }}
                className="w-4 h-4 rounded-full border border-white/60 shadow-sm"
              />
              <span className="font-mono text-zinc-200 font-black text-xs">
                {settings.accentColor.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Two Columns: Custom Spectrum Color Picker & Palette Presets */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            {/* Left: Custom Color Spectrum Picker & Hex Input (5 cols) */}
            <div className="lg:col-span-4 p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-2.5">
              <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <span>Chọn dải màu tùy ý:</span>
              </span>

              <div className="flex items-center gap-3">
                {/* HTML5 Native Color Picker Swatch */}
                <div className="relative w-11 h-11 rounded-2xl overflow-hidden border-2 border-white/30 shadow-lg cursor-pointer hover:scale-105 transition-transform shrink-0">
                  <input
                    type="color"
                    value={settings.accentColor}
                    onChange={(e) => {
                      setCustomHex(e.target.value);
                      onUpdateSettings({ accentColor: e.target.value });
                    }}
                    className="absolute -inset-4 w-20 h-20 cursor-pointer border-0 p-0 opacity-0 z-10"
                    title="Bấm để mở bảng màu chi tiết"
                  />
                  <div
                    style={{ backgroundColor: settings.accentColor }}
                    className="w-full h-full flex items-center justify-center"
                  >
                    <Palette className="w-5 h-5 text-white/90 drop-shadow" />
                  </div>
                </div>

                {/* Hex Text Editor */}
                <div className="flex-1 space-y-1">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={customHex}
                      onChange={handleHexChange}
                      placeholder="#f59e0b"
                      maxLength={7}
                      className="w-full px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 font-mono text-xs font-bold uppercase focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-zinc-500 block">
                    Nhập mã Hex hoặc click ô màu
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Quick Color Presets (8 cols) */}
            <div className="lg:col-span-8 space-y-2">
              <span className="text-xs font-bold text-zinc-400">Hoặc chọn bảng màu gợi ý:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
                {ACCENT_COLOR_PRESETS.map((preset) => {
                  const isSelected = settings.accentColor.toLowerCase() === preset.hex.toLowerCase();
                  return (
                    <button
                      key={preset.hex}
                      onClick={() => onUpdateSettings({ accentColor: preset.hex })}
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                        isSelected
                          ? "bg-zinc-800 border-amber-400 shadow-md scale-105"
                          : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/40"
                      }`}
                    >
                      <div
                        style={{ backgroundColor: preset.hex }}
                        className="w-6 h-6 rounded-full flex items-center justify-center border border-white/30 shadow"
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-zinc-950 stroke-[3]" />}
                      </div>
                      <span className="text-[10px] font-semibold text-zinc-300 truncate w-full text-center">
                        {preset.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

