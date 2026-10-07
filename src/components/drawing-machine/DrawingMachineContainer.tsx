"use client";

import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  MachineState,
  CustomMachineConfig,
  ExtractedBallResult,
  RejectionInfo,
  PhysicsDebugInfo,
  MachineCustomSettings,
  DEFAULT_MACHINE_SETTINGS,
  DEFAULT_CUSTOM_CONFIG,
  loadStoredSettings,
  saveStoredSettings,
  loadStoredMachineConfig,
  saveStoredMachineConfig,
  buildMachineConfigFromCustom,
  validateBipartiteMatching,
  getPresetConfig,
  DrawHistoryRecord,
  loadStoredDrawHistory,
  saveStoredDrawHistory
} from "./types";
import { createBallData } from "./ball-textures";
import {
  DrawingMachineToolbar,
  DrawingMachineDebugPanel,
  DrawingMachineControls,
  DrawingMachineResults,
  DrawingMachineHistory,
  DrawingMachineSettings
} from "./DrawingMachineOverlay";
import FireworksCelebration from "./FireworksCelebration";
import { Loader2 } from "lucide-react";

// Lazy-load WebGL Canvas to prevent SSR issues and optimize bundle
const DrawingMachineCanvas = dynamic(
  () => import("./DrawingMachineCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[480px] flex flex-col items-center justify-center bg-zinc-950 text-white rounded-3xl">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
        <p className="text-sm font-semibold text-zinc-400">
          Đang nạp mô phỏng vật lý 3D...
        </p>
      </div>
    )
  }
);

export default function DrawingMachineContainer() {
  const [customConfig, setCustomConfig] = useState<CustomMachineConfig>(() => loadStoredMachineConfig());
  const [sessionKey, setSessionKey] = useState<number>(1);
  const [machineState, setMachineState] = useState<MachineState>("Ready");
  const [extractedResults, setExtractedResults] = useState<ExtractedBallResult[]>([]);
  const [cameraPreset, setCameraPreset] = useState<"default" | "tubes" | "chamber" | "capture" | "tray">("default");
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const [debugInfo, setDebugInfo] = useState<PhysicsDebugInfo | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Settings for timings, display, motor speed
  const [settings, setSettings] = useState<MachineCustomSettings>(() => loadStoredSettings());

  // Draw History (persisted in localStorage, client-side only)
  const [drawHistory, setDrawHistory] = useState<DrawHistoryRecord[]>(() => loadStoredDrawHistory());
  const hasRecordedCurrentDrawRef = useRef<boolean>(false);

  // Background Music (BGM) Audio Controller
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);

  const [isAutoSequence, setIsAutoSequence] = useState<boolean>(false);
  const [initialCountdown, setInitialCountdown] = useState<number>(() => settings.initialMixDuration);
  const [mixingSeconds, setMixingSeconds] = useState<number>(0);
  const [captureSeconds, setCaptureSeconds] = useState<number>(0);
  const [intervalRemaining, setIntervalRemaining] = useState<number>(() => settings.trayIntervalDuration);
  const [hasJamWarning, setHasJamWarning] = useState<boolean>(false);

  // Attempt tracking and rejection state per slot (Max 30 attempts per slot)
  const [currentSlotAttempts, setCurrentSlotAttempts] = useState<number>(1);
  const [rejectionInfo, setRejectionInfo] = useState<RejectionInfo | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number>(0);
  const [isMaxAttemptsExceeded, setIsMaxAttemptsExceeded] = useState<boolean>(false);

  const requestAgitateRef = useRef<(() => void) | null>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Active compiled machine config
  const activeConfig = useMemo(() => {
    const baseConfig = buildMachineConfigFromCustom(customConfig, settings.accentColor);
    const speedMult =
      settings.motorSpeedMode === "slow"
        ? 0.75
        : settings.motorSpeedMode === "fast"
        ? 1.25
        : 1.0;
    return {
      ...baseConfig,
      paddleSpeed: baseConfig.paddleSpeed * speedMult
    };
  }, [customConfig, settings.accentColor, settings.motorSpeedMode]);

  // Persistent ball dataset for current session
  const ballsData = useMemo(() => {
    return createBallData(activeConfig.totalBalls);
  }, [activeConfig.totalBalls]);

  // Handle custom config update (with localStorage persistence & matching validation)
  const handleUpdateCustomConfig = useCallback((newConfig: CustomMachineConfig) => {
    setCustomConfig(newConfig);
    const validation = validateBipartiteMatching(newConfig);
    if (validation.valid) {
      saveStoredMachineConfig(newConfig);
    }
  }, []);

  // Handle settings update
  const handleUpdateSettings = useCallback((partial: Partial<MachineCustomSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveStoredSettings(next);
      return next;
    });
  }, []);

  // Handle reset to default settings & preset 55 balls
  const handleResetDefaults = useCallback(() => {
    const defaultCfg = getPresetConfig("55");
    setCustomConfig(defaultCfg);
    saveStoredMachineConfig(defaultCfg);

    const defaultSet = { ...DEFAULT_MACHINE_SETTINGS };
    setSettings(defaultSet);
    saveStoredSettings(defaultSet);

    hasRecordedCurrentDrawRef.current = false;
    setInitialCountdown(defaultSet.initialMixDuration);
    setIntervalRemaining(defaultSet.trayIntervalDuration);
    setRejectionInfo(null);
    setCurrentSlotAttempts(1);
    setIsMaxAttemptsExceeded(false);
    setExtractedResults([]);
    setMachineState("Ready");
    setSessionKey((prev) => prev + 1);
  }, []);

  // Clear retry timer on unmount or reset
  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      clearInterval(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    setRetryCountdown(0);
  }, []);

  // Handle preset selection
  const handleSelectPreset = useCallback((preset: "35" | "45" | "55" | "custom") => {
    clearRetryTimer();
    if (preset === "custom") {
      const newCfg: CustomMachineConfig = {
        ...customConfig,
        preset: "custom"
      };
      setCustomConfig(newCfg);
      saveStoredMachineConfig(newCfg);
      setIsSettingsOpen(true);
      return;
    }

    const newCfg = getPresetConfig(preset);
    setCustomConfig(newCfg);
    saveStoredMachineConfig(newCfg);

    setIsAutoSequence(false);
    hasRecordedCurrentDrawRef.current = false;
    setInitialCountdown(settings.initialMixDuration);
    setIntervalRemaining(settings.trayIntervalDuration);
    setHasJamWarning(false);
    setRejectionInfo(null);
    setCurrentSlotAttempts(1);
    setIsMaxAttemptsExceeded(false);
    setExtractedResults([]);
    setCameraPreset("default");
    setMachineState("Ready");
    setSessionKey((prev) => prev + 1);
  }, [clearRetryTimer, customConfig, settings.initialMixDuration, settings.trayIntervalDuration]);

  // Handle machine state change from canvas with automatic camera framing
  const handleMachineStateChange = useCallback(
    (newState: MachineState) => {
      setMachineState(newState);
      if (newState === "Mixing" && settings.autoFocusChamber) {
        setCameraPreset((prev) => (prev === "default" || prev === "tubes" ? "chamber" : prev));
      }
    },
    [settings.autoFocusChamber]
  );

  // Handle ball rejection callback from physical canvas
  const handleBallRejected = useCallback((rejection: RejectionInfo) => {
    setRejectionInfo(rejection);

    // Check if slot attempts exceeded 30
    setCurrentSlotAttempts((prev) => {
      const nextAttempt = prev + 1;
      if (nextAttempt > 30) {
        setIsMaxAttemptsExceeded(true);
        setIsAutoSequence(false);
        setMachineState("Completed");
      }
      return nextAttempt;
    });
  }, []);

  // Handle completion of ball return animation
  const handleBallReturnComplete = useCallback(() => {
    if (isMaxAttemptsExceeded) return;

    // After return to drum, mix for 5s then retry capturing same slot
    setMachineState("Mixing");
    setRetryCountdown(5);

    if (retryTimerRef.current) clearInterval(retryTimerRef.current);

    retryTimerRef.current = setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev <= 1) {
          if (retryTimerRef.current) clearInterval(retryTimerRef.current);
          retryTimerRef.current = null;
          // Resume capturing for the current slot
          setMachineState("Capturing");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [isMaxAttemptsExceeded]);

  // Track total mixing duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (machineState === "Mixing" || machineState === "WaitingNext" || machineState === "Loading" || machineState === "Returning") {
      interval = setInterval(() => {
        setMixingSeconds((prev) => prev + 1);
      }, 1000);
    } else if (machineState === "Ready") {
      setMixingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [machineState]);

  // Initial mixing countdown BEFORE opening gate for the FIRST ball
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (machineState === "Mixing" && isAutoSequence && retryCountdown <= 0 && extractedResults.length === 0) {
      setInitialCountdown(settings.initialMixDuration);
      timer = setInterval(() => {
        setInitialCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setMachineState("Capturing");
            return settings.initialMixDuration;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [machineState, isAutoSequence, retryCountdown, extractedResults.length, settings.initialMixDuration]);

  // Track capture waiting duration & timeout protection (25s) with recoverable error
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (machineState === "Capturing") {
      setCaptureSeconds(0);
      interval = setInterval(() => {
        setCaptureSeconds((prev) => {
          if (prev + 1 >= 25) {
            setMachineState("Mixing");
            setIsAutoSequence(false);
            setHasJamWarning(true);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      setCaptureSeconds(0);
    }
    return () => clearInterval(interval);
  }, [machineState]);

  // Handle interval countdown after a ball arrives in tray (for balls #2..#K)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (machineState === "WaitingNext") {
      setIntervalRemaining(settings.trayIntervalDuration);
      timer = setInterval(() => {
        setIntervalRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // Reset slot attempts for the new position
            setCurrentSlotAttempts(1);
            setRejectionInfo(null);
            // Open gate for next ball
            setMachineState("Capturing");
            return settings.trayIntervalDuration;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [machineState, settings.trayIntervalDuration]);

  // Auto-record completed draw to history
  useEffect(() => {
    if (
      extractedResults.length === customConfig.pickCount &&
      extractedResults.length > 0 &&
      !hasRecordedCurrentDrawRef.current
    ) {
      hasRecordedCurrentDrawRef.current = true;
      const is535 = customConfig.preset === "35" || activeConfig.gameName === "Lotto 5/35";

      let sortedNums: number[];
      if (is535 && extractedResults.length >= 6) {
        const first5 = extractedResults.slice(0, 5).map((r) => r.ball.number).sort((a, b) => a - b);
        const sixth = extractedResults.slice(5).map((r) => r.ball.number);
        sortedNums = [...first5, ...sixth];
      } else {
        sortedNums = [...extractedResults.map((r) => r.ball.number)].sort((a, b) => a - b);
      }

      const record: DrawHistoryRecord = {
        id: `draw_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        drawIndex: drawHistory.length + 1,
        timestamp: Date.now(),
        preset: customConfig.preset,
        gameName: activeConfig.gameName,
        totalBalls: customConfig.totalBalls,
        pickCount: customConfig.pickCount,
        enableRangeLimits: customConfig.enableRangeLimits,
        balls: extractedResults.map((r) => ({
          number: r.ball.number,
          formatted: r.ball.formatted,
          color: r.ball.color,
          textColor: r.ball.textColor
        })),
        sortedNumbers: sortedNums
      };

      setDrawHistory((prev) => {
        const next = [record, ...prev].slice(0, 100);
        saveStoredDrawHistory(next);
        return next;
      });
    }
  }, [
    extractedResults,
    customConfig.pickCount,
    customConfig.preset,
    customConfig.totalBalls,
    customConfig.enableRangeLimits,
    activeConfig.gameName,
    drawHistory.length
  ]);

  // Helper to ensure BGM audio is playing if enabled
  const ensureBgmPlaying = useCallback(() => {
    const audio = bgmAudioRef.current;
    if (audio && settings.bgmEnabled && audio.paused) {
      audio.volume = Math.min(1, Math.max(0, settings.bgmVolume));
      audio.play().catch(() => {
        // Handled on next gesture
      });
    }
  }, [settings.bgmEnabled, settings.bgmVolume]);

  // Start manual mixing motor (loads balls from tubes then mixes)
  const handleStartMixing = useCallback(() => {
    ensureBgmPlaying();
    clearRetryTimer();
    const validation = validateBipartiteMatching(customConfig);
    if (!validation.valid) {
      setIsSettingsOpen(true);
      return;
    }
    hasRecordedCurrentDrawRef.current = false;
    if (machineState === "Completed" || extractedResults.length > 0) {
      setExtractedResults([]);
      setSessionKey((prev) => prev + 1);
    }
    setIsAutoSequence(false);
    setHasJamWarning(false);
    setIsMaxAttemptsExceeded(false);
    setCurrentSlotAttempts(1);
    setRejectionInfo(null);
    setMachineState("Loading");
  }, [clearRetryTimer, customConfig, ensureBgmPlaying, extractedResults.length, machineState]);

  // Start One-Click Automatic K-ball Sequence (Supports multiple consecutive rounds)
  const handleStartAutoSequence = useCallback(() => {
    ensureBgmPlaying();
    clearRetryTimer();
    const validation = validateBipartiteMatching(customConfig);
    if (!validation.valid) {
      setIsSettingsOpen(true);
      return;
    }
    hasRecordedCurrentDrawRef.current = false;
    // If previous round finished or has results, reset cleanly and re-mount session
    if (machineState === "Completed" || extractedResults.length > 0) {
      setExtractedResults([]);
      setSessionKey((prev) => prev + 1);
    }
    setIsAutoSequence(true);
    setInitialCountdown(settings.initialMixDuration);
    setIntervalRemaining(settings.trayIntervalDuration);
    setHasJamWarning(false);
    setIsMaxAttemptsExceeded(false);
    setCurrentSlotAttempts(1);
    setRejectionInfo(null);
    setMachineState("Loading");
  }, [
    clearRetryTimer,
    customConfig,
    ensureBgmPlaying,
    extractedResults.length,
    machineState,
    settings.initialMixDuration,
    settings.trayIntervalDuration
  ]);

  // Cancel capture and revert to mixing
  const handleCancelCapture = useCallback(() => {
    if (machineState !== "Capturing") return;
    setIsAutoSequence(false);
    setInitialCountdown(settings.initialMixDuration);
    setHasJamWarning(false);
    setMachineState("Mixing");
  }, [machineState, settings.initialMixDuration]);

  // Retry capture after timeout
  const handleRetryCapture = useCallback(() => {
    ensureBgmPlaying();
    setHasJamWarning(false);
    setMachineState("Capturing");
  }, [ensureBgmPlaying]);

  // Reset session
  const handleResetSession = useCallback(() => {
    ensureBgmPlaying();
    clearRetryTimer();
    hasRecordedCurrentDrawRef.current = false;
    setIsAutoSequence(false);
    setInitialCountdown(settings.initialMixDuration);
    setIntervalRemaining(settings.trayIntervalDuration);
    setHasJamWarning(false);
    setRejectionInfo(null);
    setCurrentSlotAttempts(1);
    setIsMaxAttemptsExceeded(false);
    setExtractedResults([]);
    setCameraPreset("default");
    setMachineState("Ready");
    setSessionKey((prev) => prev + 1);
  }, [clearRetryTimer, ensureBgmPlaying, settings.initialMixDuration, settings.trayIntervalDuration]);

  // Sync BGM background audio volume and state
  useEffect(() => {
    const audio = bgmAudioRef.current;
    if (!audio) return;

    audio.volume = Math.min(1, Math.max(0, settings.bgmVolume));

    if (settings.bgmEnabled) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          // Normal when autoplay is restricted by browser before first interaction
          console.log("BGM autoplay waiting for user interaction:", err.message);
        });
      }
    } else {
      audio.pause();
    }
  }, [settings.bgmEnabled, settings.bgmVolume]);

  // Ensure audio starts on ANY first user interaction if blocked by initial browser policy on F5/load
  useEffect(() => {
    if (!settings.bgmEnabled) return;

    const events = ["pointerdown", "touchstart", "mousedown", "keydown", "click"];

    const handleFirstInteraction = () => {
      const audio = bgmAudioRef.current;
      if (!audio || !settings.bgmEnabled) return;

      audio.volume = Math.min(1, Math.max(0, settings.bgmVolume));
      if (audio.paused) {
        audio
          .play()
          .then(() => {
            events.forEach((evt) => {
              window.removeEventListener(evt, handleFirstInteraction);
              document.removeEventListener(evt, handleFirstInteraction);
            });
          })
          .catch(() => {
            // Keep listeners if play failed
          });
      } else {
        events.forEach((evt) => {
          window.removeEventListener(evt, handleFirstInteraction);
          document.removeEventListener(evt, handleFirstInteraction);
        });
      }
    };

    events.forEach((evt) => {
      window.addEventListener(evt, handleFirstInteraction, { passive: true });
      document.addEventListener(evt, handleFirstInteraction, { passive: true });
    });

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, handleFirstInteraction);
        document.removeEventListener(evt, handleFirstInteraction);
      });
    };
  }, [settings.bgmEnabled, settings.bgmVolume]);

  const handleToggleBgm = useCallback(() => {
    const nextEnabled = !settings.bgmEnabled;
    handleUpdateSettings({ bgmEnabled: nextEnabled });
    const audio = bgmAudioRef.current;
    if (audio) {
      if (nextEnabled) {
        audio.volume = Math.min(1, Math.max(0, settings.bgmVolume));
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
    }
  }, [handleUpdateSettings, settings.bgmEnabled, settings.bgmVolume]);

  const handleChangeBgmVolume = useCallback((vol: number) => {
    handleUpdateSettings({ bgmVolume: vol });
    const audio = bgmAudioRef.current;
    if (audio) {
      audio.volume = Math.min(1, Math.max(0, vol));
    }
  }, [handleUpdateSettings]);

  // Clear draw history
  const handleClearHistory = useCallback(() => {
    setDrawHistory([]);
    saveStoredDrawHistory([]);
  }, []);

  // Agitate balls (Dev diagnostic)
  const handleAgitate = () => {
    if (requestAgitateRef.current) {
      requestAgitateRef.current();
    }
  };

  // Ball extracted callback
  const handleBallExtracted = useCallback((result: ExtractedBallResult) => {
    setExtractedResults((prev) => {
      if (prev.some((r) => r.ball.id === result.ball.id)) return prev;
      return [...prev, result];
    });
    // Reset attempt counter & rejection for current slot
    setCurrentSlotAttempts(1);
    setRejectionInfo(null);
  }, []);

  const isSettingsLocked = machineState !== "Ready" && machineState !== "Completed";

  return (
    <div className="flex flex-col gap-4 sm:gap-5 w-full max-w-7xl mx-auto">
      {/* Hidden background music audio element */}
      <audio
        ref={bgmAudioRef}
        src="/audio/bgm.mp3"
        loop
        preload="auto"
      />

      {/* 1. Gameshow Stage Top Bar */}
      <DrawingMachineToolbar
        customConfig={customConfig}
        onSelectPreset={handleSelectPreset}
        machineState={machineState}
        cameraPreset={cameraPreset}
        onSelectCameraPreset={setCameraPreset}
        isAutoSequence={isAutoSequence}
        initialCountdown={initialCountdown}
        mixingSeconds={mixingSeconds}
        captureSeconds={captureSeconds}
        intervalRemaining={intervalRemaining}
        retryCountdown={retryCountdown}
        currentAttempt={currentSlotAttempts}
        showCountdown={settings.showCountdown}
        onToggleSettingsModal={() => setIsSettingsOpen((prev) => !prev)}
        isSettingsOpen={isSettingsOpen}
        bgmEnabled={settings.bgmEnabled}
        bgmVolume={settings.bgmVolume}
        onToggleBgm={handleToggleBgm}
        onChangeBgmVolume={handleChangeBgmVolume}
      />

      {/* 2. Modal / Drawer: Configuration & Customization Menu */}
      {isSettingsOpen && (
        <DrawingMachineSettings
          customConfig={customConfig}
          onUpdateCustomConfig={handleUpdateCustomConfig}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onResetDefaults={handleResetDefaults}
          isLocked={isSettingsLocked}
          cameraPreset={cameraPreset}
          onSelectCameraPreset={setCameraPreset}
          showDebug={showDebug}
          onToggleDebug={() => setShowDebug((prev) => !prev)}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* 3. Optional Debug Telemetry Panel */}
      {showDebug && debugInfo && (
        <DrawingMachineDebugPanel
          config={activeConfig}
          debugInfo={debugInfo}
          machineState={machineState}
          onAgitate={handleAgitate}
        />
      )}

      {/* 4. 100% Unobstructed 3D WebGL Canvas Viewport */}
      <div 
        className="relative w-full aspect-[4/3] sm:aspect-[16/10] lg:aspect-[16/9] min-h-[500px] sm:min-h-[580px] max-h-[780px] bg-[#05070a] rounded-3xl overflow-hidden border border-zinc-800/80 shadow-2xl transition-colors duration-500"
        style={{
          boxShadow: `0 20px 50px -10px ${settings.accentColor}20, 0 0 35px 0 ${settings.accentColor}15`
        }}
      >
        {/* Dynamic Theme Atmospheric Glow Layers */}
        <div 
          className="absolute inset-0 pointer-events-none transition-opacity duration-700"
          style={{
            background: `radial-gradient(circle at 50% -10%, ${settings.accentColor}25 0%, transparent 60%), radial-gradient(circle at 50% 50%, ${settings.accentColor}12 0%, transparent 70%), radial-gradient(ellipse at 50% 105%, ${settings.accentColor}25 0%, transparent 55%)`
          }}
        />
        
        <DrawingMachineCanvas
          key={`${customConfig.preset}-${customConfig.totalBalls}-${customConfig.pickCount}-${sessionKey}`}
          config={activeConfig}
          ballsData={ballsData}
          machineState={machineState}
          onBallExtracted={handleBallExtracted}
          onBallRejected={handleBallRejected}
          onBallReturnComplete={handleBallReturnComplete}
          onMachineStateChange={handleMachineStateChange}
          currentAttempt={currentSlotAttempts}
          cameraPreset={cameraPreset}
          graphicsQuality={settings.graphicsQuality}
          accentColor={settings.accentColor}
          onDebugUpdate={setDebugInfo}
          onRequestAgitateRef={requestAgitateRef}
        />
      </div>

      {/* 5. Primary Action Controls Bar */}
      <DrawingMachineControls
        customConfig={customConfig}
        machineState={machineState}
        onStartMixing={handleStartMixing}
        onStartAutoSequence={handleStartAutoSequence}
        onCancelCapture={handleCancelCapture}
        onResetSession={handleResetSession}
        isAutoSequence={isAutoSequence}
        initialCountdown={initialCountdown}
        extractedCount={extractedResults.length}
        captureSeconds={captureSeconds}
        intervalRemaining={intervalRemaining}
        retryCountdown={retryCountdown}
        rejectionInfo={rejectionInfo}
        isMaxAttemptsExceeded={isMaxAttemptsExceeded}
        hasJamWarning={hasJamWarning}
        onRetryCapture={handleRetryCapture}
        showCountdown={settings.showCountdown}
      />

      {/* 6. Result Tray & Summary Panel */}
      <DrawingMachineResults
        config={activeConfig}
        extractedResults={extractedResults}
      />

      {/* 7. Draw History List (Local client-side persistence) */}
      <DrawingMachineHistory
        history={drawHistory}
        onClearHistory={handleClearHistory}
        onStartAutoSequence={handleStartAutoSequence}
      />

      {/* 8. Fireworks & Confetti Celebration Overlay upon draw completion */}
      <FireworksCelebration
        active={machineState === "Completed"}
        durationSeconds={7}
      />
    </div>
  );
}
