import RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three";
import {
  DrawingBall,
  MachineConfig,
  TUBE_BOTTOM_Y,
  TUBE_TOP_Y
} from "./types";

export interface PhysicsBallInstance {
  ball: DrawingBall;
  rigidBody: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  mesh: THREE.Mesh;
  isExtracted: boolean;
  transportProgress: number; // 0..1 when in chute
  trayPosition?: THREE.Vector3;
}

let rapierInitPromise: Promise<typeof RAPIER> | null = null;
export async function getRapierInstance(): Promise<typeof RAPIER> {
  if (!rapierInitPromise) {
    rapierInitPromise = RAPIER.init().then(() => RAPIER);
  }
  return rapierInitPromise;
}

export class DrawingMachinePhysics {
  public world!: RAPIER.World;
  public eventQueue!: RAPIER.EventQueue;
  private rapier!: typeof RAPIER;

  public balls: PhysicsBallInstance[] = [];
  public paddleBody!: RAPIER.RigidBody;
  public gateBody!: RAPIER.RigidBody;
  public sensorCollider!: RAPIER.Collider;

  // Dynamic Vertical loading tubes
  public loadingGateBodies: RAPIER.RigidBody[] = [];
  public loadingGateOpen: boolean[] = [];
  public tubeReleaseStarted: boolean[] = [];
  public tubeBallInstances: PhysicsBallInstance[][] = [];
  public tubeXPositions: number[] = [];
  public isLoadingSequenceActive = false;
  private loadingTimer = 0;
  private tubeStaggerSeconds = 0.3;

  public isGateOpen = false;
  public motorSpeed = 0; // Current angular velocity (rad/s)
  public targetMotorSpeed = 0;
  public currentPaddleAngle = 0;

  // Persistent per-ball entry tracking
  public enteredBallIds = new Set<number>();
  public onLoadingComplete?: () => void;

  // Capture & Validation callbacks
  public onBallValidation?: (ball: DrawingBall) => { accept: boolean; reason?: string };
  public onBallCaptured?: (ball: DrawingBall) => void;
  public onBallRejected?: (ball: DrawingBall, reason: string, instance: PhysicsBallInstance) => void;

  private isInitialized = false;
  private isDisposed = false;
  private config: MachineConfig;

  // Gate & Sensor coordinates
  private captureAngle = Math.PI * 0.42; // ~75 degrees
  private capturePos!: { x: number; y: number; z: number };

  constructor(config: MachineConfig) {
    this.config = config;
  }

  public async init(): Promise<void> {
    if (this.isInitialized || this.isDisposed) return;

    this.rapier = await getRapierInstance();
    if (this.isDisposed) return;

    // Gravity pointing downwards
    const gravity = { x: 0.0, y: -9.81, z: 0.0 };
    this.world = new this.rapier.World(gravity);
    this.eventQueue = new this.rapier.EventQueue(true);

    const { drumRadius, drumDepth } = this.config;

    // 1. Build Airtight Drum Wall Colliders (32 segment polygon cylinder with top loading opening & lower extraction outlet)
    const segments = 32;
    const thickness = 0.12;
    const segmentWidth = (2 * Math.PI * drumRadius) / segments + 0.03; // Overlapping by 3cm to prevent seam leaks

    this.captureAngle = -Math.PI * 0.27; // ~ -48.6 degrees (~5:00 - 5:15 position: direct lower-right scoop path)
    this.capturePos = {
      x: Math.cos(this.captureAngle) * (drumRadius + 0.02),
      y: Math.sin(this.captureAngle) * (drumRadius + 0.02),
      z: 0
    };

    const tubeCount = this.config.tubeLayout?.tubeCount || 6;
    const tubeSpacing = this.config.tubeLayout?.tubeSpacing || 0.24;
    const flankWidth = (tubeCount * tubeSpacing) / 2 + 0.035;

    for (let i = 0; i < segments; i++) {
      const angle = (i * Math.PI * 2) / segments;
      const normalizedDiff = Math.abs(
        Math.atan2(Math.sin(angle - this.captureAngle), Math.cos(angle - this.captureAngle))
      );

      // Skip the segments where the extraction outlet throat connects (wide ~0.26m clean opening)
      if (normalizedDiff < (Math.PI / segments) * 1.8) {
        continue;
      }

      // Skip ONLY top drum collar segments where the dynamic vertical loading tubes connect
      const segX = Math.cos(angle) * drumRadius;
      const segY = Math.sin(angle) * drumRadius;
      if (segY > drumRadius * 0.55 && Math.abs(segX) < flankWidth) {
        continue;
      }

      const x = Math.cos(angle) * (drumRadius + thickness / 2);
      const y = Math.sin(angle) * (drumRadius + thickness / 2);

      const wallDesc = this.rapier.RigidBodyDesc.fixed().setTranslation(x, y, 0);
      const wallBody = this.world.createRigidBody(wallDesc);

      const colliderDesc = this.rapier.ColliderDesc.cuboid(
        segmentWidth / 2,
        thickness / 2,
        drumDepth / 2 + 0.02
      )
        .setRotation({
          x: 0,
          y: 0,
          z: Math.sin(angle / 2 + Math.PI / 4),
          w: Math.cos(angle / 2 + Math.PI / 4)
        })
        .setFriction(0.15)
        .setRestitution(0.65);

      this.world.createCollider(colliderDesc, wallBody);
    }

    // Front and Back Airtight Endcap Plates
    const frontWallDesc = this.rapier.RigidBodyDesc.fixed().setTranslation(
      0,
      0,
      drumDepth / 2 + thickness / 2
    );
    const frontWallBody = this.world.createRigidBody(frontWallDesc);
    this.world.createCollider(
      this.rapier.ColliderDesc.cuboid(drumRadius * 1.3, drumRadius * 1.3, thickness / 2)
        .setFriction(0.15)
        .setRestitution(0.6),
      frontWallBody
    );

    const backWallDesc = this.rapier.RigidBodyDesc.fixed().setTranslation(
      0,
      0,
      -drumDepth / 2 - thickness / 2
    );
    const backWallBody = this.world.createRigidBody(backWallDesc);
    this.world.createCollider(
      this.rapier.ColliderDesc.cuboid(drumRadius * 1.3, drumRadius * 1.3, thickness / 2)
        .setFriction(0.15)
        .setRestitution(0.6),
      backWallBody
    );

    // 1B. Build Dynamic Transparent Vertical Ball-Loading Tubes Colliders (Above the chamber)
    const tubeBottomY = TUBE_BOTTOM_Y;
    const chuteBaseY = 0.60;
    const dividerBaseY = 0.85;
    const tubeTopY = TUBE_TOP_Y;
    const dividerHeight = tubeTopY - dividerBaseY;
    const dividerCenterY = dividerBaseY + dividerHeight / 2;
    const totalChuteHeight = tubeTopY - chuteBaseY;
    const totalChuteCenterY = chuteBaseY + totalChuteHeight / 2;

    const tubeDividerPositions =
      this.config.tubeLayout?.tubeDividerPositions && this.config.tubeLayout.tubeDividerPositions.length > 0
        ? this.config.tubeLayout.tubeDividerPositions
        : [-0.72, -0.48, -0.24, 0.0, 0.24, 0.48, 0.72];

    tubeDividerPositions.forEach((divX) => {
      const divBody = this.world.createRigidBody(
        this.rapier.RigidBodyDesc.fixed().setTranslation(divX, dividerCenterY, 0)
      );
      this.world.createCollider(
        this.rapier.ColliderDesc.cuboid(0.012, dividerHeight / 2, drumDepth / 2 + 0.02)
          .setFriction(0.05)
          .setRestitution(0.3),
        divBody
      );
    });

    // Left & Right Outer Chute Transition Flank Walls
    [-flankWidth, flankWidth].forEach((flankX) => {
      const flankBody = this.world.createRigidBody(
        this.rapier.RigidBodyDesc.fixed().setTranslation(flankX, (chuteBaseY + tubeBottomY) / 2, 0)
      );
      this.world.createCollider(
        this.rapier.ColliderDesc.cuboid(0.02, (tubeBottomY - chuteBaseY) / 2 + 0.02, drumDepth / 2 + 0.02)
          .setFriction(0.05)
          .setRestitution(0.3),
        flankBody
      );
    });

    // Front & Back Enclosing Glass Panels for the Loading Tubes & Top Transition
    const frontBackHalfW = flankWidth + 0.02;
    const tubeFrontBody = this.world.createRigidBody(
      this.rapier.RigidBodyDesc.fixed().setTranslation(0, totalChuteCenterY, drumDepth / 2 + 0.02)
    );
    this.world.createCollider(
      this.rapier.ColliderDesc.cuboid(frontBackHalfW, totalChuteHeight / 2, 0.02)
        .setFriction(0.05)
        .setRestitution(0.3),
      tubeFrontBody
    );

    const tubeBackBody = this.world.createRigidBody(
      this.rapier.RigidBodyDesc.fixed().setTranslation(0, totalChuteCenterY, -drumDepth / 2 - 0.02)
    );
    this.world.createCollider(
      this.rapier.ColliderDesc.cuboid(frontBackHalfW, totalChuteHeight / 2, 0.02)
        .setFriction(0.05)
        .setRestitution(0.3),
      tubeBackBody
    );

    // Top Enclosing Roof Plate for the Loading Tubes
    const tubeRoofBody = this.world.createRigidBody(
      this.rapier.RigidBodyDesc.fixed().setTranslation(0, tubeTopY + 0.02, 0)
    );
    this.world.createCollider(
      this.rapier.ColliderDesc.cuboid(frontBackHalfW, 0.025, drumDepth / 2 + 0.03)
        .setFriction(0.05)
        .setRestitution(0.3),
      tubeRoofBody
    );

    // Kinematic Loading Gates at the bottom of the tubes
    this.tubeXPositions =
      this.config.tubeLayout?.tubeXPositions && this.config.tubeLayout.tubeXPositions.length > 0
        ? [...this.config.tubeLayout.tubeXPositions]
        : [-0.60, -0.36, -0.12, 0.12, 0.36, 0.60];

    this.loadingGateBodies = [];
    this.loadingGateOpen = Array.from({ length: this.tubeXPositions.length }, () => false);
    this.tubeReleaseStarted = Array.from({ length: this.tubeXPositions.length }, () => false);

    this.tubeXPositions.forEach((tx) => {
      const yDrum = Math.sqrt(Math.max(0.04, drumRadius * drumRadius - tx * tx));
      const gateBody = this.world.createRigidBody(
        this.rapier.RigidBodyDesc.kinematicPositionBased().setTranslation(tx, yDrum + 0.015, 0)
      );
      this.world.createCollider(
        this.rapier.ColliderDesc.cuboid(tubeSpacing / 2 + 0.01, 0.035, drumDepth / 2 + 0.05)
          .setFriction(0.3)
          .setRestitution(0.1),
        gateBody
      );
      this.loadingGateBodies.push(gateBody);
    });

    // 2. Rotating Mixing Paddles with Forward Scoop Lips (Kinematic Body)
    const paddleDesc = this.rapier.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 0, 0);
    this.paddleBody = this.world.createRigidBody(paddleDesc);

    const paddleLength = drumRadius * 0.78;
    const paddleWidth = drumDepth * 0.76;
    const paddleThickness = 0.035;

    for (let i = 0; i < this.config.paddleCount; i++) {
      const pAngle = (i * Math.PI * 2) / this.config.paddleCount;
      const bladeHalfLength = paddleLength / 2;
      const px = Math.cos(pAngle) * (bladeHalfLength + 0.04);
      const py = Math.sin(pAngle) * (bladeHalfLength + 0.04);

      // Main paddle arm blade
      const bladeCollider = this.rapier.ColliderDesc.cuboid(
        bladeHalfLength,
        paddleThickness / 2,
        paddleWidth / 2
      )
        .setTranslation(px, py, 0)
        .setRotation({
          x: 0,
          y: 0,
          z: Math.sin(pAngle / 2),
          w: Math.cos(pAngle / 2)
        })
        .setFriction(0.35)
        .setRestitution(0.72);

      this.world.createCollider(bladeCollider, this.paddleBody);

      // Forward curved scoop lip on paddle tip
      const lipLength = 0.09;
      const lipAngle = pAngle + 0.65;
      const lipX = Math.cos(pAngle) * (paddleLength + 0.02) + Math.cos(lipAngle) * (lipLength / 2);
      const lipY = Math.sin(pAngle) * (paddleLength + 0.02) + Math.sin(lipAngle) * (lipLength / 2);

      const lipCollider = this.rapier.ColliderDesc.cuboid(
        lipLength / 2,
        paddleThickness / 2,
        paddleWidth / 2
      )
        .setTranslation(lipX, lipY, 0)
        .setRotation({
          x: 0,
          y: 0,
          z: Math.sin(lipAngle / 2),
          w: Math.cos(lipAngle / 2)
        })
        .setFriction(0.35)
        .setRestitution(0.72);

      this.world.createCollider(lipCollider, this.paddleBody);
    }

    // 3. Fully Enclosed 6-Sided Extraction Funnel & Capture Pocket
    // A. Lower Ramp (guides bottom balls into throat)
    const rampAngle = this.captureAngle - 0.22;
    const rampX = Math.cos(rampAngle) * (drumRadius + 0.05);
    const rampY = Math.sin(rampAngle) * (drumRadius + 0.05);
    const rampBody = this.world.createRigidBody(this.rapier.RigidBodyDesc.fixed().setTranslation(rampX, rampY, 0));
    this.world.createCollider(
      this.rapier.ColliderDesc.cuboid(0.18, 0.03, drumDepth / 2 + 0.02)
        .setRotation({
          x: 0,
          y: 0,
          z: Math.sin(this.captureAngle / 2 + 0.18),
          w: Math.cos(this.captureAngle / 2 + 0.18)
        })
        .setFriction(0.05)
        .setRestitution(0.35),
      rampBody
    );

    // B. Upper Roof (channels balls downward)
    const hoodAngle = this.captureAngle + 0.22;
    const hoodX = Math.cos(hoodAngle) * (drumRadius + 0.05);
    const hoodY = Math.sin(hoodAngle) * (drumRadius + 0.05);
    const hoodBody = this.world.createRigidBody(this.rapier.RigidBodyDesc.fixed().setTranslation(hoodX, hoodY, 0));
    this.world.createCollider(
      this.rapier.ColliderDesc.cuboid(0.18, 0.03, drumDepth / 2 + 0.02)
        .setRotation({
          x: 0,
          y: 0,
          z: Math.sin(this.captureAngle / 2 - 0.18),
          w: Math.cos(this.captureAngle / 2 - 0.18)
        })
        .setFriction(0.05)
        .setRestitution(0.35),
      hoodBody
    );

    // C. Front Side Enclosure Wall (+Z cheek plate)
    const frontCheekBody = this.world.createRigidBody(
      this.rapier.RigidBodyDesc.fixed().setTranslation(this.capturePos.x + 0.06, this.capturePos.y + 0.06, drumDepth / 2 + 0.04)
    );
    this.world.createCollider(
      this.rapier.ColliderDesc.cuboid(0.20, 0.20, 0.04).setFriction(0.1).setRestitution(0.35),
      frontCheekBody
    );

    // D. Back Side Enclosure Wall (-Z cheek plate)
    const backCheekBody = this.world.createRigidBody(
      this.rapier.RigidBodyDesc.fixed().setTranslation(this.capturePos.x + 0.06, this.capturePos.y + 0.06, -drumDepth / 2 - 0.04)
    );
    this.world.createCollider(
      this.rapier.ColliderDesc.cuboid(0.20, 0.20, 0.04).setFriction(0.1).setRestitution(0.35),
      backCheekBody
    );

    // E. Outer Backing Stop Plate (prevents balls exiting pocket outward)
    const outerStopBody = this.world.createRigidBody(
      this.rapier.RigidBodyDesc.fixed().setTranslation(
        this.capturePos.x + Math.cos(this.captureAngle) * 0.22,
        this.capturePos.y + Math.sin(this.captureAngle) * 0.22,
        0
      )
    );
    this.world.createCollider(
      this.rapier.ColliderDesc.cuboid(0.04, 0.16, drumDepth / 2 + 0.02)
        .setRotation({
          x: 0,
          y: 0,
          z: Math.sin(this.captureAngle / 2 + Math.PI / 4),
          w: Math.cos(this.captureAngle / 2 + Math.PI / 4)
        })
        .setFriction(0.1)
        .setRestitution(0.35),
      outerStopBody
    );

    // 4. Physical Sliding Gate (Kinematic Barrier across single-file throat)
    const gateDesc = this.rapier.RigidBodyDesc.kinematicPositionBased().setTranslation(
      this.capturePos.x,
      this.capturePos.y,
      0
    );
    this.gateBody = this.world.createRigidBody(gateDesc);

    this.world.createCollider(
      this.rapier.ColliderDesc.cuboid(0.16, 0.04, drumDepth / 2 + 0.02)
        .setRotation({
          x: 0,
          y: 0,
          z: Math.sin(this.captureAngle / 2 + Math.PI / 4),
          w: Math.cos(this.captureAngle / 2 + Math.PI / 4)
        })
        .setFriction(0.2)
        .setRestitution(0.4),
      this.gateBody
    );

    // 5. Single-Ball Capture Sensor Collider (Inside the pocket at the gate intake)
    const sensorX = this.capturePos.x + Math.cos(this.captureAngle) * 0.04;
    const sensorY = this.capturePos.y + Math.sin(this.captureAngle) * 0.04;
    const sensorDesc = this.rapier.ColliderDesc.ball(0.085)
      .setTranslation(sensorX, sensorY, 0)
      .setSensor(true)
      .setActiveEvents(this.rapier.ActiveEvents.COLLISION_EVENTS);

    const sensorBodyDesc = this.rapier.RigidBodyDesc.fixed();
    const sensorBody = this.world.createRigidBody(sensorBodyDesc);
    this.sensorCollider = this.world.createCollider(sensorDesc, sensorBody);

    this.isInitialized = true;
  }

  // Precompute deterministic non-overlapping 3D lattice candidate slots inside lower drum volume
  private generateLatticeSlots(ballRadius: number, drumRadius: number, drumDepth: number): Array<{ x: number; y: number; z: number }> {
    const slots: Array<{ x: number; y: number; z: number }> = [];
    const spacing = ballRadius * 2.2;
    const maxR = drumRadius - ballRadius * 1.35;
    const maxZ = drumDepth / 2 - ballRadius * 1.35;

    for (let y = -ballRadius * 1.2; y >= -maxR; y -= spacing) {
      for (let x = -maxR; x <= maxR; x += spacing) {
        if (Math.hypot(x, y) <= maxR) {
          for (let z = -maxZ; z <= maxZ; z += spacing) {
            slots.push({ x, y, z });
          }
        }
      }
    }
    // Randomize slot order so ball distribution looks natural
    return slots.sort(() => Math.random() - 0.5);
  }

  // Spawn dynamic physical lottery balls stacked vertically in the 6 transparent loading tubes
  public spawnBalls(
    ballDataList: DrawingBall[],
    scene: THREE.Object3D,
    textureMap: Map<number, THREE.CanvasTexture>
  ): PhysicsBallInstance[] {
    const { ballRadius } = this.config;
    const sphereGeom = new THREE.SphereGeometry(ballRadius, 32, 24);

    const tubeCount = this.tubeXPositions.length;
    this.balls = [];
    this.tubeBallInstances = Array.from({ length: tubeCount }, () => []);
    this.tubeReleaseStarted = Array.from({ length: tubeCount }, () => false);
    this.enteredBallIds.clear();

    // Reset loading gates to closed state
    this.closeAllLoadingGates();

    const ballPitch = ballRadius * 2.05; // Zero intersection spacing

    const tubeAssignments =
      this.config.tubeLayout?.tubeBallRanges ||
      Array.from({ length: tubeCount }, (_, idx) => [idx + 1]);

    // Build map from ball number to DrawingBall data
    const ballMap = new Map<number, DrawingBall>();
    ballDataList.forEach((b) => ballMap.set(b.number, b));

    // Place balls in T tubes, ordered left-to-right, numbers ascending bottom-to-top
    for (let tubeIdx = 0; tubeIdx < tubeCount; tubeIdx++) {
      const assignedNumbers = tubeAssignments[tubeIdx] || [];
      const tx = this.tubeXPositions[tubeIdx];
      const yDrum = Math.sqrt(Math.max(0.04, this.config.drumRadius * this.config.drumRadius - tx * tx));

      assignedNumbers.forEach((ballNum, stackIdx) => {
        const ballData = ballMap.get(ballNum);
        if (!ballData) return;

        const spawnX = tx;
        const spawnY = yDrum + 0.055 + ballRadius + stackIdx * ballPitch;
        const spawnZ = 0;

        // Create Three.js ball mesh with consistent satin finish
        const texture = textureMap.get(ballData.number);
        const ballMat = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.28,
          metalness: 0.04,
          emissive: 0x000000
        });

        const mesh = new THREE.Mesh(sphereGeom, ballMat);
        mesh.position.set(spawnX, spawnY, spawnZ);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);

        // Create Rapier dynamic rigid body
        const rbDesc = this.rapier.RigidBodyDesc.dynamic()
          .setTranslation(spawnX, spawnY, spawnZ)
          .setLinearDamping(0.08)
          .setAngularDamping(0.12);

        const rigidBody = this.world.createRigidBody(rbDesc);

        const colliderDesc = this.rapier.ColliderDesc.ball(ballRadius)
          .setFriction(0.2)
          .setRestitution(0.65)
          .setDensity(1.0);

        const collider = this.world.createCollider(colliderDesc, rigidBody);

        const instance: PhysicsBallInstance = {
          ball: ballData,
          rigidBody,
          collider,
          mesh,
          isExtracted: false,
          transportProgress: 0
        };

        this.balls.push(instance);
        this.tubeBallInstances[tubeIdx].push(instance);
      });
    }

    return this.balls;
  }

  // Set state for a specific loading tube retaining gate (0..T-1)
  public setLoadingGateState(tubeIndex: number, open: boolean): void {
    if (tubeIndex < 0 || tubeIndex >= this.tubeXPositions.length) return;
    this.loadingGateOpen[tubeIndex] = open;

    const tx = this.tubeXPositions[tubeIndex];
    const yDrum = Math.sqrt(Math.max(0.04, this.config.drumRadius * this.config.drumRadius - tx * tx));
    const gateBody = this.loadingGateBodies[tubeIndex];
    if (!gateBody) return;

    if (open) {
      // Retract gate collider forward completely out of the vertical tube path
      gateBody.setTranslation({ x: tx, y: yDrum + 0.015, z: 2.5 }, true);
      gateBody.setNextKinematicTranslation({
        x: tx,
        y: yDrum + 0.015,
        z: 2.5
      });
    } else {
      // Place gate collider back into blocking position at tube bottom
      gateBody.setTranslation({ x: tx, y: yDrum + 0.015, z: 0 }, true);
      gateBody.setNextKinematicTranslation({
        x: tx,
        y: yDrum + 0.015,
        z: 0
      });
    }
  }

  // Start sequential left-to-right tube release sequence (stagger: default 0.3s)
  public startLoadingSequence(tubeStaggerSeconds = 0.3): void {
    const tubeCount = this.tubeXPositions.length;
    this.isLoadingSequenceActive = true;
    this.loadingTimer = 0;
    this.tubeStaggerSeconds = tubeStaggerSeconds;
    this.tubeReleaseStarted = Array.from({ length: tubeCount }, () => false);
    this.setMixingSpeed(this.config.paddleSpeed); // Start rotating paddles immediately so cascading balls get swept up and mixed in real-time

    // Open tube 0 immediately at t=0
    if (tubeCount > 0) {
      this.tubeReleaseStarted[0] = true;
      this.setLoadingGateState(0, true);
    }
  }

  // Close all loading gates to form an airtight top seal
  public closeAllLoadingGates(): void {
    this.isLoadingSequenceActive = false;
    for (let i = 0; i < this.tubeXPositions.length; i++) {
      this.setLoadingGateState(i, false);
    }
  }

  // Persistent entry check: all balls have entered chamber and all gates are closed
  public hasAllBallsEntered(): boolean {
    if (this.balls.length === 0) return false;
    const allIn = this.enteredBallIds.size >= this.config.totalBalls;
    const allGatesClosed = this.loadingGateOpen.every((isOpen) => !isOpen);
    return allIn && allGatesClosed;
  }

  // Check if all balls have fully dropped below the top loading boundary into the chamber and all inlet gates closed
  public areAllBallsInChamber(): boolean {
    return this.hasAllBallsEntered();
  }

  // Get current open/closed states of all loading gates
  public getLoadingGateStates(): boolean[] {
    return [...this.loadingGateOpen];
  }

  // Open / close the physical extraction gate
  public setGateState(open: boolean): void {
    this.isGateOpen = open;

    if (open) {
      // Retract sliding gate collider completely out of the throat along Z
      this.gateBody.setNextKinematicTranslation({
        x: this.capturePos.x,
        y: this.capturePos.y,
        z: this.config.drumDepth / 2 + 0.35
      });
    } else {
      // Move gate collider back into blocking position across throat at z = 0
      this.gateBody.setNextKinematicTranslation({
        x: this.capturePos.x,
        y: this.capturePos.y,
        z: 0
      });
    }
  }

  // Set target motor mixing speed (rad/s)
  public setMixingSpeed(speedRadPerSec: number): void {
    this.targetMotorSpeed = speedRadPerSec;
  }

  // Step physics simulation loop
  public step(deltaSeconds: number): void {
    if (!this.isInitialized) return;

    const tubeCount = this.tubeXPositions.length;

    // Handle sequential left-to-right loading tube gates opening & per-tube auto-closing on last ball clear
    if (this.isLoadingSequenceActive) {
      this.loadingTimer += deltaSeconds;

      // 1. Open gates left-to-right staggered by 0.3s
      for (let i = 0; i < tubeCount; i++) {
        if (this.loadingTimer >= i * this.tubeStaggerSeconds && !this.tubeReleaseStarted[i]) {
          this.tubeReleaseStarted[i] = true;
          this.setLoadingGateState(i, true);
        }
      }

      // 2. Persistent per-ball entry tracking: count each ball ID once when it crosses below y < 0.88m
      this.balls.forEach((b) => {
        if (!b.isExtracted && !this.enteredBallIds.has(b.ball.id)) {
          if (b.rigidBody.translation().y < 0.88) {
            this.enteredBallIds.add(b.ball.id);
          }
        }
      });

      // 3. Guaranteed downward gravity assist for released tubes & prevent upward bounce back
      for (let i = 0; i < tubeCount; i++) {
        if (this.tubeReleaseStarted[i]) {
          const tubeBalls = this.tubeBallInstances[i] || [];
          tubeBalls.forEach((b) => {
            if (!b.isExtracted) {
              const pos = b.rigidBody.translation();
              const vel = b.rigidBody.linvel();
              if (pos.y > 0.85) {
                // Ensure strong downward velocity so balls waterfall cleanly
                const targetVy = this.loadingTimer > 1.8 ? -2.5 : Math.min(vel.y, -1.2);
                b.rigidBody.setLinvel({ x: vel.x * 0.6, y: targetVy, z: vel.z * 0.6 }, true);
              }
            }
          });
        }
      }

      // 4. Close each inlet gate ONLY after all balls assigned to that tube have entered the chamber
      for (let i = 0; i < tubeCount; i++) {
        if (this.tubeReleaseStarted[i] && this.loadingGateOpen[i]) {
          const tubeBalls = this.tubeBallInstances[i] || [];
          if (tubeBalls.length > 0 && tubeBalls.every((b) => this.enteredBallIds.has(b.ball.id))) {
            this.setLoadingGateState(i, false);
          }
        }
      }

      // 5. When all expected balls have entered or safety timeout reached, finish loading sequence
      const isComplete = this.hasAllBallsEntered() || (this.loadingTimer > 3.8 && this.enteredBallIds.size >= this.config.totalBalls * 0.85);
      if (isComplete) {
        // Mark all balls as entered if any were lagging
        this.balls.forEach((b) => this.enteredBallIds.add(b.ball.id));
        this.isLoadingSequenceActive = false;
        this.closeAllLoadingGates();
        this.setMixingSpeed(this.config.paddleSpeed);
        if (this.onLoadingComplete) {
          this.onLoadingComplete();
        }
      }
    } else if (this.hasAllBallsEntered()) {
      const { drumRadius, drumDepth, ballRadius } = this.config;
      const flankWidth = (tubeCount * (this.config.tubeLayout?.tubeSpacing || 0.24)) / 2 + 0.035;

      // 6. Chamber Top Collar Containment: During mixing/capturing, deflect circulating balls downward
      this.balls.forEach((b) => {
        if (!b.isExtracted && this.enteredBallIds.has(b.ball.id)) {
          const pos = b.rigidBody.translation();
          const vel = b.rigidBody.linvel();
          const topThreshold = Math.min(0.82, drumRadius * 0.78);
          if (pos.y > topThreshold && Math.abs(pos.x) < flankWidth) {
            if (vel.y > 0) {
              b.rigidBody.setLinvel({ x: vel.x, y: -Math.abs(vel.y) * 0.75 - 0.6, z: vel.z }, true);
            }
            if (pos.y > topThreshold + 0.08) {
              b.rigidBody.setTranslation({ x: pos.x, y: topThreshold, z: pos.z }, true);
            }
          }

          // Proactive Cylindrical Boundary Check (Prevents any ball tunneling/escape under high paddle speed)
          const r = Math.hypot(pos.x, pos.y);
          const maxR = drumRadius - ballRadius * 0.45;
          const maxZ = drumDepth / 2 - ballRadius * 0.45;

          const angle = Math.atan2(pos.y, pos.x);
          const diffFromThroat = Math.abs(
            Math.atan2(Math.sin(angle - this.captureAngle), Math.cos(angle - this.captureAngle))
          );
          const isNearCaptureThroat = diffFromThroat < 0.32;

          if (!isNearCaptureThroat && r > maxR && pos.y <= topThreshold) {
            const nx = pos.x / (r || 1);
            const ny = pos.y / (r || 1);
            b.rigidBody.setTranslation({ x: nx * (maxR - 0.01), y: ny * (maxR - 0.01), z: pos.z }, true);
            const vDotN = vel.x * nx + vel.y * ny;
            if (vDotN > 0) {
              b.rigidBody.setLinvel({ x: vel.x - 1.6 * vDotN * nx, y: vel.y - 1.6 * vDotN * ny, z: vel.z }, true);
            }
          }

          if (Math.abs(pos.z) > maxZ) {
            const signZ = Math.sign(pos.z) || 1;
            b.rigidBody.setTranslation({ x: pos.x, y: pos.y, z: signZ * (maxZ - 0.01) }, true);
            if (vel.z * signZ > 0) {
              b.rigidBody.setLinvel({ x: vel.x, y: vel.y, z: -vel.z * 0.6 }, true);
            }
          }
        }
      });
    }

    // Smooth motor acceleration / deceleration
    const accelRate = 2.5; // rad/s^2
    if (this.motorSpeed < this.targetMotorSpeed) {
      this.motorSpeed = Math.min(this.targetMotorSpeed, this.motorSpeed + accelRate * deltaSeconds);
    } else if (this.motorSpeed > this.targetMotorSpeed) {
      this.motorSpeed = Math.max(this.targetMotorSpeed, this.motorSpeed - accelRate * deltaSeconds);
    }

    // Rotate mixing paddles kinematically
    if (Math.abs(this.motorSpeed) > 0.001) {
      this.currentPaddleAngle += this.motorSpeed * deltaSeconds;
      const q = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 0, 1),
        this.currentPaddleAngle
      );

      this.paddleBody.setNextKinematicRotation({
        x: q.x,
        y: q.y,
        z: q.z,
        w: q.w
      });
    }

    // Apply realistic pneumatic intake suction draw towards gate intake when gate is open
    if (this.isGateOpen) {
      const gateTargetX = this.capturePos.x;
      const gateTargetY = this.capturePos.y;
      this.balls.forEach((b) => {
        if (!b.isExtracted && this.enteredBallIds.has(b.ball.id)) {
          const bp = b.rigidBody.translation();
          const dx = gateTargetX - bp.x;
          const dy = gateTargetY - bp.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < 0.40 * 0.40) {
            const dist = Math.sqrt(distSq) || 1;
            const dirX = dx / dist;
            const dirY = dy / dist;
            const pullForce = 2.4; // Responsive pneumatic draw into capture collar
            const vel = b.rigidBody.linvel();
            b.rigidBody.setLinvel(
              {
                x: vel.x * 0.90 + dirX * pullForce * deltaSeconds * 10,
                y: vel.y * 0.90 + dirY * pullForce * deltaSeconds * 10,
                z: vel.z * 0.85
              },
              true
            );
          }
        }
      });
    }

    // Step physics world with substepping for high collision precision
    const fixedDt = 1 / 60;
    const substeps = 2;
    for (let s = 0; s < substeps; s++) {
      this.world.timestep = fixedDt / substeps;
      this.world.step(this.eventQueue);
    }

    // Process collision events (Check if any ball physically entered capture sensor)
    if (this.isGateOpen) {
      let capturedInstance: PhysicsBallInstance | undefined;

      this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
        if (!started || capturedInstance) return;

        const sensorHandle = this.sensorCollider.handle;
        if (handle1 === sensorHandle || handle2 === sensorHandle) {
          const otherHandle = handle1 === sensorHandle ? handle2 : handle1;
          const found = this.balls.find(
            (b) => !b.isExtracted && b.collider.handle === otherHandle
          );
          if (found) capturedInstance = found;
        }
      });

      // Direct intersection & proximity fallback check for 100% guaranteed zero-latency detection
      if (!capturedInstance) {
        const sX = this.capturePos.x + Math.cos(this.captureAngle) * 0.04;
        const sY = this.capturePos.y + Math.sin(this.captureAngle) * 0.04;
        const thresholdSq = 0.12 * 0.12;

        for (const b of this.balls) {
          if (!b.isExtracted) {
            if (this.world.intersectionPair(this.sensorCollider, b.collider)) {
              capturedInstance = b;
              break;
            }
            const bp = b.rigidBody.translation();
            const dx = bp.x - sX;
            const dy = bp.y - sY;
            const dz = bp.z;
            if (dx * dx + dy * dy + dz * dz <= thresholdSq) {
              capturedInstance = b;
              break;
            }
          }
        }
      }

      if (capturedInstance && this.isGateOpen) {
        // Instantly snap gate shut to prevent second ball from entering!
        this.setGateState(false);

        // Conditional validation check
        if (this.onBallValidation) {
          const validation = this.onBallValidation(capturedInstance.ball);
          if (validation.accept) {
            this.handleBallCapture(capturedInstance);
          } else {
            this.handleBallRejection(capturedInstance, validation.reason || "Ngoài khoảng");
          }
        } else {
          this.handleBallCapture(capturedInstance);
        }
      }
    } else {
      // Drain events when gate is closed so queue doesn't accumulate stale events
      this.eventQueue.drainCollisionEvents(() => {});
    }

    // Safety Enclosure Guard: Ensure no dynamic churning ball ever escapes the drum boundary
    if (!this.isLoadingSequenceActive) {
      const drumR = this.config.drumRadius;
      const maxDistSq = (drumR + 0.06) * (drumR + 0.06);
      const maxZ = this.config.drumDepth / 2 + 0.04;

      this.balls.forEach((b) => {
        if (!b.isExtracted && this.enteredBallIds.has(b.ball.id)) {
          const bp = b.rigidBody.translation();
          const distSq = bp.x * bp.x + bp.y * bp.y;
          const isFarZ = Math.abs(bp.z) > maxZ;

          if (distSq > maxDistSq || isFarZ) {
            const distToCapture = Math.hypot(bp.x - this.capturePos.x, bp.y - this.capturePos.y);
            if (!this.isGateOpen || distToCapture > 0.28) {
              b.rigidBody.setTranslation(
                {
                  x: (Math.random() - 0.5) * 0.20,
                  y: 0.15 + Math.random() * 0.20,
                  z: (Math.random() - 0.5) * 0.10
                },
                true
              );
              b.rigidBody.setLinvel({ x: 0, y: -0.5, z: 0 }, true);
            }
          }
        }
      });
    }

    // Update Three.js meshes from Rapier rigid bodies for active balls
    this.balls.forEach((b) => {
      if (!b.isExtracted) {
        const pos = b.rigidBody.translation();
        const rot = b.rigidBody.rotation();

        b.mesh.position.set(pos.x, pos.y, pos.z);
        b.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
      }
    });
  }

  // Handle ball physically captured and accepted
  private handleBallCapture(instance: PhysicsBallInstance): void {
    instance.isExtracted = true;

    // Remove from active physics churning and clear capture pocket for next ball
    try {
      instance.collider.setEnabled(false);
    } catch {
      // fallback
    }
    instance.rigidBody.setBodyType(this.rapier.RigidBodyType.KinematicPositionBased, true);
    instance.rigidBody.setTranslation({ x: 50, y: -50, z: 50 }, true);

    if (this.onBallCaptured) {
      this.onBallCaptured(instance.ball);
    }
  }

  // Handle ball physically rejected (outside range or violates future matching)
  private handleBallRejection(instance: PhysicsBallInstance, reason: string): void {
    instance.isExtracted = true;
    try {
      instance.collider.setEnabled(false);
    } catch {
      // fallback
    }
    instance.rigidBody.setBodyType(this.rapier.RigidBodyType.KinematicPositionBased, true);
    instance.rigidBody.setTranslation({ x: 50, y: -50, z: 50 }, true);

    if (this.onBallRejected) {
      this.onBallRejected(instance.ball, reason, instance);
    }
  }

  // Reintroduce rejected ball back into the drum with natural velocity
  public reintroduceBallToDrum(instance: PhysicsBallInstance): void {
    const reX = 0.0;
    const reY = 0.25;
    const reZ = (Math.random() - 0.5) * 0.10;

    instance.isExtracted = false;
    instance.rigidBody.setTranslation({ x: reX, y: reY, z: reZ }, true);
    instance.rigidBody.setLinvel({ x: (Math.random() - 0.5) * 0.5, y: -0.6, z: (Math.random() - 0.5) * 0.2 }, true);
    instance.rigidBody.setBodyType(this.rapier.RigidBodyType.Dynamic, true);
    try {
      instance.collider.setEnabled(true);
    } catch {
      // fallback
    }
  }

  // Agitate balls with a gentle physical impulse if balls settle
  public agitateBalls(): void {
    this.balls.forEach((b) => {
      if (!b.isExtracted) {
        b.rigidBody.applyImpulse(
          {
            x: (Math.random() - 0.5) * 0.4,
            y: 0.3 + Math.random() * 0.4,
            z: (Math.random() - 0.5) * 0.4
          },
          true
        );
      }
    });
  }

  // Get Rapier collider wireframe vertex buffers for visual debug overlay
  public getDebugRenderBuffers(): { vertices: Float32Array; colors: Float32Array } | null {
    if (!this.isInitialized || !this.world) return null;
    try {
      const debugBuffers = this.world.debugRender();
      return {
        vertices: debugBuffers.vertices,
        colors: debugBuffers.colors
      };
    } catch {
      return null;
    }
  }

  // Detect any balls that breached the permitted chamber/pocket/tube boundaries
  public getOutOfBoundsBalls(): Array<{ ball: DrawingBall; position: { x: number; y: number; z: number } }> {
    if (!this.isInitialized) return [];
    const { drumRadius, drumDepth, ballRadius } = this.config;
    const maxZ = drumDepth / 2 + ballRadius + 0.05;
    const outList: Array<{ ball: DrawingBall; position: { x: number; y: number; z: number } }> = [];

    this.balls.forEach((b) => {
      if (!b.isExtracted) {
        const p = b.rigidBody.translation();

        const tubeCount = this.config.tubeLayout?.tubeCount || 6;
        const flankWidth = (tubeCount * (this.config.tubeLayout?.tubeSpacing || 0.24)) / 2 + 0.05;

        // 1. Check if safely positioned inside the loading tubes above the drum
        const inTubeZone =
          p.y >= 0.85 &&
          p.y <= 3.35 &&
          Math.abs(p.x) <= flankWidth &&
          Math.abs(p.z) <= drumDepth / 2 + 0.08;

        if (inTubeZone) {
          return;
        }

        // 2. Check if safely positioned inside the mixing drum or extraction throat
        const r = Math.hypot(p.x, p.y);
        const angle = Math.atan2(p.y, p.x);
        const isNearThroat =
          Math.abs(
            Math.atan2(Math.sin(angle - this.captureAngle), Math.cos(angle - this.captureAngle))
          ) < 0.35;
        const maxR = isNearThroat ? drumRadius + 0.32 : drumRadius + ballRadius + 0.04;

        if (r > maxR || Math.abs(p.z) > maxZ) {
          outList.push({ ball: b.ball, position: { x: p.x, y: p.y, z: p.z } });
        }
      }
    });

    return outList;
  }

  public dispose(): void {
    this.isDisposed = true;
    if (!this.isInitialized) return;
    this.isInitialized = false;
    if (this.world) {
      try {
        this.world.free();
      } catch (err) {
        console.warn("Physics world disposal warning:", err);
      }
    }
  }
}
