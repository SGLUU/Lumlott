"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  MachineConfig,
  MachineState,
  DrawingBall,
  ExtractedBallResult,
  RejectionInfo,
  CameraViewPreset,
  PhysicsDebugInfo,
  GraphicsQuality,
  canCompleteRemainingSlots
} from "./types";
import { createBallTexture } from "./ball-textures";
import {
  buildDrawingMachine,
  Machine3DComponents,
  createXitLopLogoTexture,
  createBaseNameplateTexture,
  createSlotBadgeTexture,
  createBackdropNeonTexture
} from "./machine-builder";
import { DrawingMachinePhysics, PhysicsBallInstance } from "./physics-world";

interface DrawingMachineCanvasProps {
  config: MachineConfig;
  ballsData: DrawingBall[];
  machineState: MachineState;
  onBallExtracted: (result: ExtractedBallResult) => void;
  onBallRejected?: (rejection: RejectionInfo) => void;
  onBallReturnComplete?: () => void;
  onMachineStateChange: (newState: MachineState) => void;
  currentAttempt?: number;
  cameraPreset: "default" | "tubes" | "chamber" | "capture" | "tray";
  isLowQuality?: boolean;
  graphicsQuality?: GraphicsQuality;
  accentColor?: string;
  showWireframe?: boolean;
  onDebugUpdate?: (info: PhysicsDebugInfo) => void;
  onRequestAgitateRef?: React.MutableRefObject<(() => void) | null>;
}

export const CAMERA_PRESETS: Record<string, CameraViewPreset> = {
  default: {
    id: "default",
    label: "Toàn cảnh",
    position: [0, 0.65, 5.8],
    target: [0, 0.45, 0]
  },
  tubes: {
    id: "tubes",
    label: "Ống nạp",
    position: [0, 1.80, 3.2],
    target: [0, 1.80, 0]
  },
  chamber: {
    id: "chamber",
    label: "Lồng quay",
    position: [0.0, -0.20, 4.35],
    target: [0.0, -0.32, 0.15]
  },
  capture: {
    id: "capture",
    label: "Cửa xả",
    position: [1.10, -0.60, 2.3],
    target: [0.65, -0.72, 0.2]
  },
  tray: {
    id: "tray",
    label: "Khay số",
    position: [0, -0.65, 2.3],
    target: [0, -1.15, 0.55]
  }
};

export default function DrawingMachineCanvas({
  config,
  ballsData,
  machineState,
  onBallExtracted,
  onBallRejected,
  onBallReturnComplete,
  onMachineStateChange,
  currentAttempt = 1,
  cameraPreset,
  isLowQuality = false,
  graphicsQuality = "high",
  accentColor = "#f59e0b",
  showWireframe = false,
  onDebugUpdate,
  onRequestAgitateRef
}: DrawingMachineCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webGlSupported, setWebGlSupported] = useState(true);

  // References to long-lived Three / Physics instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const machineComponentsRef = useRef<Machine3DComponents | null>(null);
  const physicsRef = useRef<DrawingMachinePhysics | null>(null);
  const ballInstancesRef = useRef<PhysicsBallInstance[]>([]);
  const extractedResultsRef = useRef<ExtractedBallResult[]>([]);

  const configRef = useRef<MachineConfig>(config);
  configRef.current = config;

  const machineStateRef = useRef<MachineState>(machineState);
  machineStateRef.current = machineState;

  const onMachineStateChangeRef = useRef(onMachineStateChange);
  onMachineStateChangeRef.current = onMachineStateChange;

  const onBallExtractedRef = useRef(onBallExtracted);
  onBallExtractedRef.current = onBallExtracted;

  const onBallRejectedRef = useRef(onBallRejected);
  onBallRejectedRef.current = onBallRejected;

  const onBallReturnCompleteRef = useRef(onBallReturnComplete);
  onBallReturnCompleteRef.current = onBallReturnComplete;

  const currentAttemptRef = useRef(currentAttempt);
  currentAttemptRef.current = currentAttempt;

  // Animation & Transition tracking
  const activeTransportBallRef = useRef<{
    instance: PhysicsBallInstance;
    targetSlotIndex: number;
    progress: number;
    speed: number;
    chutePath: THREE.CatmullRomCurve3;
    startDropPos: THREE.Vector3;
    rightLandingPos: THREE.Vector3;
    targetSlotPos: THREE.Vector3;
  } | null>(null);

  const activeReturnBallRef = useRef<{
    instance: PhysicsBallInstance;
    progress: number;
    speed: number;
    dynamicCurve: THREE.CatmullRomCurve3;
  } | null>(null);

  const rimPulseTimerRef = useRef<number>(0);

  // Target camera positions for smooth interpolation
  const targetCamPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0.3, 3.8));
  const targetCamLookRef = useRef<THREE.Vector3>(new THREE.Vector3(0, -0.15, 0));

  // Check WebGL availability
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) setWebGlSupported(false);
    } catch {
      setWebGlSupported(false);
    }
  }, []);

  // Update dynamic accent color in real-time across ALL machine components
  useEffect(() => {
    const comps = machineComponentsRef.current;
    if (comps && accentColor) {
      const col = new THREE.Color(accentColor);

      // 1. Primary Gold Accent Material (Drum rims, tube collars, paddle arm, hubs, gate, tray trim)
      if (comps.goldAccentMat) {
        comps.goldAccentMat.color.copy(col);
        comps.goldAccentMat.emissive.copy(col.clone().multiplyScalar(0.35));
      }

      // 2. 16 Perimeter LED Rim Lights
      if (comps.rimLightMaterials) {
        comps.rimLightMaterials.forEach((mat) => {
          mat.color.copy(col);
          mat.emissive.copy(col);
        });
      }

      // 3. Central Hub "XỊT LỐP" Logo Badge
      if (comps.logoMat) {
        comps.logoMat.emissive.copy(col.clone().multiplyScalar(0.25));
        if (comps.logoMat.map) {
          comps.logoMat.map.dispose();
          comps.logoMat.map = createXitLopLogoTexture(accentColor);
          comps.logoMat.needsUpdate = true;
        }
      }

      // 4. Base Nameplate
      if (comps.nameplateMat) {
        comps.nameplateMat.emissive.copy(col.clone().multiplyScalar(0.25));
        if (comps.nameplateMat.map) {
          comps.nameplateMat.map.dispose();
          comps.nameplateMat.map = createBaseNameplateTexture(accentColor);
          comps.nameplateMat.needsUpdate = true;
        }
      }

      // 5. Paddle Tip Accents
      if (comps.tipAccentMat) {
        comps.tipAccentMat.color.copy(col);
        comps.tipAccentMat.emissive.copy(col.clone().multiplyScalar(0.5));
      }

      // 6. 3D Tray Number Badges (01..06)
      if (comps.trayBadgeMaterials) {
        comps.trayBadgeMaterials.forEach((mat, idx) => {
          mat.emissive.copy(col.clone().multiplyScalar(0.15));
          if (mat.map) {
            mat.map.dispose();
            mat.map = createSlotBadgeTexture(idx + 1, accentColor);
            mat.needsUpdate = true;
          }
        });
      }

      // 7. Dynamic Theme-Tinted Transparent Chute
      if (comps.chuteGlassMat) {
        const chuteGlassColor = col.clone().lerp(new THREE.Color("#ffffff"), 0.35);
        comps.chuteGlassMat.color.copy(chuteGlassColor);
        comps.chuteGlassMat.emissive.copy(col.clone().multiplyScalar(0.12));
      }

      // 8. 3D Stage Environment Floor, Podium, Neon Materials & Spotlights & Particle Field
      if (comps.stageFloorMat) {
        comps.stageFloorMat.emissive.copy(col.clone().multiplyScalar(0.03).add(new THREE.Color(0x06080d)));
      }
      if (comps.stagePodiumMat) {
        comps.stagePodiumMat.emissive.copy(col.clone().multiplyScalar(0.05).add(new THREE.Color(0x0a0e16)));
      }
      if (comps.stageNeonMaterials) {
        comps.stageNeonMaterials.forEach((mat) => {
          mat.color.copy(col);
          mat.emissive.copy(col);
        });
      }
      if (comps.stageMovingSpotlights && comps.stageMovingSpotlights.length > 0) {
        comps.stageMovingSpotlights[0].light.color.copy(col);
      }
      if (comps.stageParticleSystem && comps.stageParticleBaseColors) {
        const colGold = new THREE.Color("#fbbf24");
        const colCyan = new THREE.Color("#38bdf8");
        const colorAttr = comps.stageParticleSystem.geometry.getAttribute("color") as THREE.BufferAttribute;
        if (colorAttr) {
          const count = colorAttr.count;
          for (let p = 0; p < count; p++) {
            const roll = (p % 10) / 10;
            const particleColor = roll < 0.6 ? col : roll < 0.85 ? colGold : colCyan;
            colorAttr.setXYZ(p, particleColor.r, particleColor.g, particleColor.b);
          }
          colorAttr.needsUpdate = true;
        }
      }

      // 9. Centerpiece 3D Neon Cyclorama Wall
      if (comps.backdropNeonMat) {
        comps.backdropNeonMat.emissive.copy(col.clone().multiplyScalar(0.28));
        if (comps.backdropNeonMat.map) {
          comps.backdropNeonMat.map.dispose();
          const newTex = createBackdropNeonTexture(accentColor);
          newTex.wrapS = THREE.RepeatWrapping;
          newTex.wrapT = THREE.ClampToEdgeWrapping;
          newTex.repeat.set(3, 1);
          newTex.offset.x = 0;
          comps.backdropNeonMat.map = newTex;
          comps.backdropNeonMat.needsUpdate = true;
        }
      }
    }
  }, [accentColor]);

  // Update dynamic graphics quality in real-time
  useEffect(() => {
    if (rendererRef.current) {
      const targetDpr =
        graphicsQuality === "high"
          ? Math.min(window.devicePixelRatio, 2.0)
          : graphicsQuality === "medium"
          ? Math.min(window.devicePixelRatio, 1.25)
          : 1.0;
      rendererRef.current.setPixelRatio(targetDpr);
      rendererRef.current.shadowMap.enabled = graphicsQuality === "high" && !isLowQuality;
    }
  }, [graphicsQuality, isLowQuality]);

  // Update camera preset targets
  useEffect(() => {
    const preset = CAMERA_PRESETS[cameraPreset] || CAMERA_PRESETS.default;
    targetCamPosRef.current.set(...preset.position);
    targetCamLookRef.current.set(...preset.target);
  }, [cameraPreset]);

  // Handle machine state changes (Motor speed & Gate state)
  useEffect(() => {
    if (!physicsRef.current) return;
    const physics = physicsRef.current;

    switch (machineState) {
      case "Ready":
        physics.setMixingSpeed(0);
        physics.setGateState(false);
        physics.closeAllLoadingGates();
        break;

      case "Loading":
        physics.setMixingSpeed(config.paddleSpeed);
        physics.setGateState(false);
        physics.startLoadingSequence(config.tubeStaggerSeconds || 0.3);
        break;

      case "Mixing":
        physics.setMixingSpeed(config.paddleSpeed);
        physics.setGateState(false);
        break;

      case "Capturing":
        physics.setMixingSpeed(config.paddleSpeed * 1.15);
        physics.setGateState(true); // Open the extraction gate!
        break;

      case "Returning":
        physics.setMixingSpeed(config.paddleSpeed * 0.9);
        physics.setGateState(false);
        break;

      case "Transporting":
        // Keep mixing while ball travels through tube to tray
        physics.setMixingSpeed(config.paddleSpeed * 0.9);
        physics.setGateState(false); // Snap gate closed
        break;

      case "WaitingNext":
        // Continuous mixing between balls during the interval
        physics.setMixingSpeed(config.paddleSpeed);
        physics.setGateState(false);
        break;

      case "Completed":
        // Gradually stop paddles
        physics.setMixingSpeed(0);
        physics.setGateState(false);
        break;
    }
  }, [machineState, config.paddleSpeed, config.tubeStaggerSeconds]);

  // Expose agitate function
  useEffect(() => {
    if (onRequestAgitateRef) {
      onRequestAgitateRef.current = () => {
        if (physicsRef.current) {
          physicsRef.current.agitateBalls();
        }
      };
    }
  }, [onRequestAgitateRef]);

  // Main Three.js + Rapier Initialization
  useEffect(() => {
    if (!containerRef.current || !webGlSupported) return;

    let isMounted = true;
    let animationFrameId: number;
    let lastTime = performance.now();
    let frameCount = 0;
    let lastFpsUpdate = performance.now();

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Three.js Scene & Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070a);
    scene.fog = new THREE.FogExp2(0x05070a, 0.035);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 50);
    const initialPreset = CAMERA_PRESETS[cameraPreset] || CAMERA_PRESETS.default;
    camera.position.set(...initialPreset.position);
    camera.lookAt(...initialPreset.target);
    cameraRef.current = camera;

    const isLow = isLowQuality || graphicsQuality === "low";
    const initialDpr =
      graphicsQuality === "high" && !isLowQuality
        ? Math.min(window.devicePixelRatio, 2.0)
        : graphicsQuality === "medium" && !isLowQuality
        ? Math.min(window.devicePixelRatio, 1.25)
        : 1.0;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isLow,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(initialDpr);
    renderer.shadowMap.enabled = graphicsQuality === "high" && !isLowQuality;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // OrbitControls for interactive viewing
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 6.5;
    controls.minDistance = 1.2;
    controls.maxPolarAngle = Math.PI / 2 + 0.15; // Don't go below ground
    controls.target.set(...initialPreset.target);

    let isUserDragging = false;
    controls.addEventListener("start", () => {
      isUserDragging = true;
    });
    controls.addEventListener("end", () => {
      isUserDragging = false;
    });
    controlsRef.current = controls;

    // 2. Build 3D Machine Meshes
    const machine = buildDrawingMachine(config, isLow, accentColor);
    scene.add(machine.rootGroup);
    machineComponentsRef.current = machine;

    // Physics wireframe debug renderer
    const debugLineGeom = new THREE.BufferGeometry();
    const debugLineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      depthTest: false,
      transparent: true,
      opacity: 0.9
    });
    const debugLineMesh = new THREE.LineSegments(debugLineGeom, debugLineMat);
    debugLineMesh.renderOrder = 999;
    debugLineMesh.visible = false;
    scene.add(debugLineMesh);

    // Pre-create ball textures for all balls
    const textureMap = new Map<number, THREE.CanvasTexture>();
    ballsData.forEach((b) => {
      const tex = createBallTexture(b.number);
      textureMap.set(b.number, tex);
    });

    // 3. Initialize Rapier Physics World
    const physics = new DrawingMachinePhysics(config);
    physicsRef.current = physics;

    physics
      .init()
      .then(() => {
        if (!isMounted) return;

        // Spawn dynamic physical lottery balls
        const instances = physics.spawnBalls(ballsData, scene, textureMap);
        ballInstancesRef.current = instances;

        // Set up validation callback when a ball enters the extraction sensor
        physics.onBallValidation = (candidateBall: DrawingBall) => {
          const cfg = configRef.current;
          const alreadyDrawn = new Set(extractedResultsRef.current.map((r) => r.ball.number));
          if (alreadyDrawn.has(candidateBall.number)) {
            return { accept: false, reason: `Bóng ${candidateBall.formatted} đã được rút trước đó` };
          }

          const currentSlot = extractedResultsRef.current.length;
          if (currentSlot >= cfg.pickCount) {
            return { accept: false, reason: "Đã đủ số kết quả" };
          }

          if (cfg.enableRangeLimits && cfg.rangeLimits) {
            const limit = cfg.rangeLimits[currentSlot] || { min: 1, max: cfg.totalBalls };
            if (candidateBall.number < limit.min || candidateBall.number > limit.max) {
              const minFmt = limit.min.toString().padStart(2, "0");
              const maxFmt = limit.max.toString().padStart(2, "0");
              return {
                accept: false,
                reason: `Bóng ${candidateBall.formatted} ngoài khoảng [${minFmt} - ${maxFmt}] — lấy lại`
              };
            }

            // Check future bipartite matching feasibility
            const canComplete = canCompleteRemainingSlots(
              candidateBall.number,
              currentSlot,
              cfg.pickCount,
              alreadyDrawn,
              cfg.rangeLimits,
              cfg.totalBalls,
              true
            );

            if (!canComplete) {
              return {
                accept: false,
                reason: `Bóng ${candidateBall.formatted} không còn đủ số cho các vị trí sau — lấy lại`
              };
            }
          }

          return { accept: true };
        };

        // Set up callback when a ball physically enters the extraction sensor and is ACCEPTED
        physics.onBallCaptured = (capturedBall: DrawingBall) => {
          const cfg = configRef.current;
          const instance = ballInstancesRef.current.find(
            (b) => b.ball.id === capturedBall.id
          );

          if (!instance) return;

          const slotIndex = extractedResultsRef.current.length;
          const chutePath = machineComponentsRef.current?.chutePath;
          if (!chutePath) return;

          const chuteStart = chutePath.getPointAt(0);
          const chuteEnd = chutePath.getPointAt(1.0);

          const slotPositions = machineComponentsRef.current?.traySlotPositions || [];
          const targetSlotPos = slotPositions[slotIndex] || new THREE.Vector3(0, -1.095, cfg.drumDepth / 2 + 0.55);

          // Find the rightmost landing position on the tray (drops on the rightmost slot first)
          const sameRowSlots = slotPositions.filter((s) => Math.abs(s.z - targetSlotPos.z) < 0.08);
          const rowSlots = sameRowSlots.length > 0 ? sameRowSlots : slotPositions;
          let maxLandingX = targetSlotPos.x;
          rowSlots.forEach((s) => {
            if (s.x > maxLandingX) maxLandingX = s.x;
          });
          const rightLandingPos = new THREE.Vector3(maxLandingX, targetSlotPos.y, targetSlotPos.z);

          // Set visual mesh position directly to start of extraction chute path
          instance.mesh.position.copy(chuteStart);

          activeTransportBallRef.current = {
            instance,
            targetSlotIndex: slotIndex,
            progress: 0,
            speed: 0.50, // ~2.0s smooth physical transport and rolling onto tray
            chutePath,
            startDropPos: chuteEnd.clone(),
            rightLandingPos,
            targetSlotPos: targetSlotPos.clone()
          };

          // Transition to Transporting state
          onMachineStateChangeRef.current("Transporting");
        };

        // Set up callback when a ball is REJECTED (Outside range / Matching failure)
        physics.onBallRejected = (rejectedBall: DrawingBall, reason: string, inst: PhysicsBallInstance) => {
          const cfg = configRef.current;
          const slotIndex = extractedResultsRef.current.length;
          const captureGateAngle = -Math.PI * 0.27;
          const captureX = Math.cos(captureGateAngle) * cfg.drumRadius;
          const captureY = Math.sin(captureGateAngle) * cfg.drumRadius;

          const returnP0 = new THREE.Vector3(captureX, captureY, 0);
          const returnP1 = new THREE.Vector3(captureX * 0.85, captureY + 0.35, 0.05);
          const returnP2 = new THREE.Vector3(captureX * 0.50, 0.15, 0.02);
          const returnP3 = new THREE.Vector3(0.15, 0.35, 0.0);
          const returnP4 = new THREE.Vector3(0.0, 0.25, 0.0);

          const returnCurve = new THREE.CatmullRomCurve3(
            [returnP0, returnP1, returnP2, returnP3, returnP4],
            false,
            "centripetal"
          );

          inst.mesh.position.copy(returnP0);

          activeReturnBallRef.current = {
            instance: inst,
            progress: 0,
            speed: 0.85, // ~1.2s smooth return
            dynamicCurve: returnCurve
          };

          if (onBallRejectedRef.current) {
            onBallRejectedRef.current({
              ball: rejectedBall,
              slotIndex,
              reason,
              timestamp: Date.now(),
              attemptNumber: currentAttemptRef.current || 1
            });
          }

          onMachineStateChangeRef.current("Returning");
        };

        // Callback when all balls have entered chamber and all loading gates closed
        physics.onLoadingComplete = () => {
          if (machineStateRef.current === "Loading") {
            onMachineStateChangeRef.current("Mixing");
          }
        };

        // If machine was already in loading/mixing state when initialized, trigger corresponding physics actions
        if (machineStateRef.current === "Loading") {
          physics.setMixingSpeed(configRef.current.paddleSpeed);
          physics.startLoadingSequence(configRef.current.tubeStaggerSeconds || 0.3);
        } else if (machineStateRef.current === "Mixing" || machineStateRef.current === "Capturing") {
          physics.setMixingSpeed(configRef.current.paddleSpeed);
          if (machineStateRef.current === "Capturing") {
            physics.setGateState(true);
          }
        }
      })
      .catch((err) => {
        console.error("Lỗi khởi tạo mô phỏng vật lý Rapier:", err);
      });

    // 4. Resize Listener
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      const aspect = w / h;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);

      // Adjust camera distance to fit nicely on all screen sizes using active preset
      const currentPreset = CAMERA_PRESETS[cameraPreset] || CAMERA_PRESETS.default;
      const fitDistance = currentPreset.position[2] * Math.max(1.0, 1.20 / Math.max(aspect, 0.6));
      targetCamPosRef.current.set(currentPreset.position[0], currentPreset.position[1], fitDistance);
      targetCamLookRef.current.set(...currentPreset.target);
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    // 5. Main Render Loop
    const animate = (currentTime: number) => {
      if (!isMounted) return;
      animationFrameId = requestAnimationFrame(animate);

      // Clamp delta to at most 33ms (prevents excessive catch-up steps if DevTools was open or tab in background)
      const rawDelta = (currentTime - lastTime) / 1000;
      const delta = Math.min(Math.max(rawDelta, 0.001), 0.033);
      lastTime = currentTime;

      frameCount++;
      if (currentTime - lastFpsUpdate >= 500) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastFpsUpdate));
        frameCount = 0;
        lastFpsUpdate = currentTime;

        if (onDebugUpdate && physicsRef.current) {
          const p = physicsRef.current;
          const activeCount = ballInstancesRef.current.filter((b) => !b.isExtracted).length;
          const oob = p.getOutOfBoundsBalls();
          onDebugUpdate({
            activeBallsCount: activeCount,
            extractedCount: extractedResultsRef.current.length,
            gateOpen: p.isGateOpen,
            motorSpeed: Math.round(p.motorSpeed * 10) / 10,
            fps,
            physicsStepTimeMs: Math.round(delta * 1000),
            outOfBoundsCount: oob.length,
            currentAttempt: currentAttemptRef.current
          });
        }
      }

      // Step physics simulation safely
      if (physicsRef.current) {
        physicsRef.current.step(delta);

        // Check if loading sequence completed (all balls entered the chamber)
        if (machineStateRef.current === "Loading" && physicsRef.current.hasAllBallsEntered()) {
          physicsRef.current.closeAllLoadingGates();
          onMachineStateChangeRef.current("Mixing");
        }

        // Update wireframe visualization if active
        if (showWireframe) {
          const dbgBuffers = physicsRef.current.getDebugRenderBuffers();
          if (dbgBuffers && dbgBuffers.vertices.length > 0) {
            debugLineGeom.setAttribute(
              "position",
              new THREE.BufferAttribute(dbgBuffers.vertices, 3)
            );
            debugLineGeom.setAttribute(
              "color",
              new THREE.BufferAttribute(dbgBuffers.colors, 4)
            );
            debugLineMesh.visible = true;
          } else {
            debugLineMesh.visible = false;
          }
        } else {
          debugLineMesh.visible = false;
        }

        // Sync visual components with physics
        if (machineComponentsRef.current) {
          // 1. Sync visual paddle rotation with physics
          machineComponentsRef.current.paddleGroup.rotation.z =
            physicsRef.current.currentPaddleAngle;

          // 2. Animate loading tube gate blades (sliding open / closed)
          const loadingGateStates = physicsRef.current.getLoadingGateStates();
          const loadingMeshes = machineComponentsRef.current.loadingGateMeshes;
          if (loadingMeshes) {
            loadingMeshes.forEach((mesh, idx) => {
              const isOpen = loadingGateStates[idx];
              const targetZ = isOpen ? configRef.current.drumDepth / 2 + 0.25 : 0;
              mesh.position.z = THREE.MathUtils.lerp(mesh.position.z, targetZ, 0.25);
            });
          }

          // 3. Lower extraction sliding gate visual animation (open / close)
          const gateMesh = machineComponentsRef.current.gateMesh;
          const targetZ = physicsRef.current.isGateOpen ? -(configRef.current.drumDepth / 2 + 0.15) : 0;
          gateMesh.position.z = THREE.MathUtils.lerp(gateMesh.position.z, targetZ, 0.25);
        }
      }

      // Update active ball continuous return back to drum
      if (activeReturnBallRef.current) {
        const ret = activeReturnBallRef.current;
        ret.progress += delta * ret.speed;

        if (ret.progress < 1.0) {
          const curvePos = ret.dynamicCurve.getPointAt(Math.min(ret.progress, 1.0));
          ret.instance.mesh.position.copy(curvePos);
          ret.instance.mesh.rotation.x -= delta * 14;
          ret.instance.mesh.rotation.y += delta * 6;
        } else {
          // Ball arrived back inside the chamber!
          if (physicsRef.current) {
            physicsRef.current.reintroduceBallToDrum(ret.instance);
          }
          activeReturnBallRef.current = null;
          if (onBallReturnCompleteRef.current) {
            onBallReturnCompleteRef.current();
          }
        }
      }

      // Update active ball transport along extraction tube to result tray
      if (activeTransportBallRef.current && machineComponentsRef.current) {
        const transport = activeTransportBallRef.current;
        transport.progress += delta * transport.speed;

        const { instance, chutePath, startDropPos, rightLandingPos, targetSlotPos } = transport;
        const progress = transport.progress;

        // Stage 1: Chute descent inside the transparent tube (0.0 to 0.36)
        if (progress < 0.36) {
          const pChute = progress / 0.36;
          // Smooth acceleration down the tube
          const tChute = pChute * pChute * (3 - 2 * pChute);
          const pos = chutePath.getPointAt(Math.min(1.0, Math.max(0.0, tChute)));
          instance.mesh.position.copy(pos);

          // Rolling spin rotation down the chute
          instance.mesh.rotation.x += delta * 14;
          instance.mesh.rotation.z += delta * 8;
        } else if (progress < 1.0) {
          // Stage 2: Drops from chute exit onto the right slot of the tray, then rolls horizontally from right to left into target slot
          const pTray = (progress - 0.36) / 0.64; // 0.0 to 1.0
          const dropPhase = 0.28; // First 28% of tray phase is the drop from chute mouth onto right landing slot

          if (pTray < dropPhase) {
            // Sub-phase A: Drop down from chute mouth directly onto right slot
            const tDrop = pTray / dropPhase;
            const easeDrop = tDrop * tDrop; // Parabolic gravity acceleration

            const currentX = THREE.MathUtils.lerp(startDropPos.x, rightLandingPos.x, tDrop);
            const currentY = THREE.MathUtils.lerp(startDropPos.y, rightLandingPos.y, easeDrop);
            const currentZ = THREE.MathUtils.lerp(startDropPos.z, rightLandingPos.z, tDrop);

            instance.mesh.position.set(currentX, currentY, currentZ);
            instance.mesh.rotation.x += delta * 10;
            instance.mesh.rotation.z += delta * 12;
          } else {
            // Sub-phase B: Roll horizontally from right slot across the tray into destination slot (right to left)
            const tRoll = (pTray - dropPhase) / (1.0 - dropPhase); // 0.0 to 1.0
            // Smooth deceleration roll into destination slot
            const easeRoll = 1 - Math.pow(1 - tRoll, 2.4);

            const currentX = THREE.MathUtils.lerp(rightLandingPos.x, targetSlotPos.x, easeRoll);
            // Height is strictly clamped to tray surface level (never sinks into tray!)
            const currentY = targetSlotPos.y;
            const currentZ = targetSlotPos.z;

            instance.mesh.position.set(currentX, currentY, currentZ);

            // Roll spin around Z (moving left along -X axis creates counter-clockwise roll rotation)
            const rollDist = rightLandingPos.x - targetSlotPos.x;
            if (Math.abs(rollDist) > 0.01) {
              const rollSpeedFactor = Math.min(32, Math.max(14, Math.abs(rollDist) * 35));
              instance.mesh.rotation.z += delta * rollSpeedFactor * (1 - easeRoll * 0.65);
            }
            instance.mesh.rotation.x += delta * 3 * (1 - easeRoll);
          }
        } else {
          // Ball has arrived at its final slot in the result tray!
          instance.mesh.position.copy(targetSlotPos);

          // Rotate number badge nicely toward the camera
          instance.mesh.rotation.set(0.15, 0, 0);

          // Trigger festive rim light pulse wave
          rimPulseTimerRef.current = 1.2;

          // Record extracted result with range limit annotation
          const newOrderIndex = extractedResultsRef.current.length + 1;
          const limit =
            configRef.current.enableRangeLimits && configRef.current.rangeLimits
              ? configRef.current.rangeLimits[transport.targetSlotIndex]
              : undefined;

          const result: ExtractedBallResult = {
            ball: transport.instance.ball,
            orderIndex: newOrderIndex,
            extractedAt: Date.now(),
            rangeLimit: limit ? { min: limit.min, max: limit.max } : undefined
          };

          extractedResultsRef.current.push(result);
          onBallExtractedRef.current(result);

          activeTransportBallRef.current = null;

          // If reached pickCount balls, complete session; otherwise transition to WaitingNext (5s interval)
          if (extractedResultsRef.current.length >= configRef.current.pickCount) {
            onMachineStateChangeRef.current("Completed");
          } else {
            onMachineStateChangeRef.current("WaitingNext");
          }
        }
      }

      // 4. Animate 16-segment Gameshow Outer Rim Lights
      if (machineComponentsRef.current?.rimLightMaterials) {
        const mats = machineComponentsRef.current.rimLightMaterials;
        const isMixing =
          machineStateRef.current === "Mixing" ||
          machineStateRef.current === "Loading" ||
          machineStateRef.current === "Capturing";

        if (rimPulseTimerRef.current > 0) {
          rimPulseTimerRef.current -= delta;
          const pulseProgress = Math.max(0, rimPulseTimerRef.current / 1.2);
          const waveOffset = (1.2 - rimPulseTimerRef.current) * 16;
          mats.forEach((mat, idx) => {
            const dist = Math.abs((idx - (waveOffset % 16) + 16) % 16);
            const intensity = dist < 2.5 ? 2.0 * pulseProgress : 0.45 * pulseProgress;
            mat.emissiveIntensity = Math.max(0.35, intensity);
          });
        } else if (isMixing) {
          // Soft ambient circular wave during mixing
          const t = currentTime * 0.003;
          mats.forEach((mat, idx) => {
            const wave = Math.sin(t + (idx * Math.PI * 2) / 16);
            mat.emissiveIntensity = 0.45 + 0.25 * wave;
          });
        } else {
          // Restful warm golden glow when idle
          mats.forEach((mat) => {
            mat.emissiveIntensity = 0.40;
          });
        }
      }

      // 5. Animate 3D Stage Environment (Sweeping Spotlights, Floating Particles, Stage Neon Pulse)
      const comps = machineComponentsRef.current;
      if (comps) {
        const tSec = currentTime * 0.001;

        // Animate Sweeping Spotlights
        if (comps.stageMovingSpotlights) {
          const isCapturing = machineStateRef.current === "Capturing";
          const isMixing = machineStateRef.current === "Mixing" || machineStateRef.current === "Loading";

          comps.stageMovingSpotlights.forEach((spot, idx) => {
            if (isCapturing) {
              const targetX = idx === 0 ? 0.9 : 0.6;
              const targetY = -0.4;
              const targetZ = 0.4;
              spot.target.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.08);
              spot.light.intensity = 3.2;
            } else if (isMixing) {
              const angle = tSec * spot.speed + spot.baseAngle;
              const targetX = Math.sin(angle) * 1.8;
              const targetY = -0.2 + Math.cos(angle * 1.4) * 0.6;
              const targetZ = Math.sin(angle * 0.8) * 0.5;
              spot.target.position.set(targetX, targetY, targetZ);
              spot.light.intensity = 2.4;
            } else {
              const angle = tSec * 0.4 + spot.baseAngle;
              const targetX = Math.sin(angle) * 1.2;
              const targetY = -0.3 + Math.cos(angle * 0.8) * 0.3;
              spot.target.position.set(targetX, targetY, 0);
              spot.light.intensity = 1.8;
            }
          });
        }

        // Animate Floating Celebration Particles
        if (comps.stageParticleSystem) {
          const posAttr = comps.stageParticleSystem.geometry.getAttribute("position") as THREE.BufferAttribute;
          if (posAttr) {
            const arr = posAttr.array as Float32Array;
            const count = posAttr.count;
            const isMixing = machineStateRef.current === "Mixing" || machineStateRef.current === "Capturing";
            const speedMult = isMixing ? 1.8 : 1.0;

            for (let p = 0; p < count; p++) {
              arr[p * 3 + 1] += 0.003 * speedMult;
              arr[p * 3] += Math.sin(tSec * 1.2 + p) * 0.0015 * speedMult;
              arr[p * 3 + 2] += Math.cos(tSec * 0.9 + p) * 0.0012 * speedMult;

              if (arr[p * 3 + 1] > 3.2) {
                arr[p * 3 + 1] = -1.15;
              }
            }
            posAttr.needsUpdate = true;
          }
        }

        // Animate Stage Floor & Backdrop Neon Pulses
        if (comps.stageNeonMaterials) {
          const isCapturing = machineStateRef.current === "Capturing";
          const isMixing = machineStateRef.current === "Mixing" || machineStateRef.current === "Loading";
          const pulse = isCapturing
            ? 0.95 + 0.45 * Math.sin(tSec * 12)
            : isMixing
            ? 0.85 + 0.25 * Math.sin(tSec * 3)
            : 0.70 + 0.15 * Math.sin(tSec * 1.5);

          comps.stageNeonMaterials.forEach((mat) => {
            mat.emissiveIntensity = pulse;
          });
        }
      }

      // Smooth camera interpolation towards active preset
      if (controls && !isUserDragging) {
        camera.position.lerp(targetCamPosRef.current, 0.05);
        controls.target.lerp(targetCamLookRef.current, 0.05);
      }
      controls.update();

      // Render frame
      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    // Cleanup and complete disposal on unmount
    return () => {
      isMounted = false;
      if (animationFrameId !== undefined) {
        cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener("resize", handleResize);

      if (physicsRef.current) {
        physicsRef.current.dispose();
        physicsRef.current = null;
      }

      if (controlsRef.current) {
        controlsRef.current.dispose();
      }

      if (machineComponentsRef.current) {
        machineComponentsRef.current.materialsToDispose.forEach((m) => m.dispose());
        machineComponentsRef.current.geometriesToDispose.forEach((g) => g.dispose());
      }

      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (rendererRef.current.domElement && rendererRef.current.domElement.parentNode) {
          rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLowQuality, webGlSupported]);

  if (!webGlSupported) {
    return (
      <div className="w-full h-full min-h-[480px] flex flex-col items-center justify-center bg-zinc-900 text-white p-6 rounded-2xl text-center">
        <p className="text-lg font-bold text-rose-400 mb-2">
          Không thể tải bộ máy vật lý 3D
        </p>
        <p className="text-sm text-zinc-400 max-w-md">
          Trình duyệt hoặc thiết bị của bạn chưa bật hỗ trợ WebGL. Vui lòng bật WebGL hoặc thử trình duyệt khác.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[520px] lg:min-h-[640px] select-none overflow-hidden rounded-2xl"
    />
  );
}
