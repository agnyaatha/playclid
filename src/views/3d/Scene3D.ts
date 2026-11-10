import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import type { Body, Table } from "@/core/types";
import type { Marker, Scene } from "../2d/draw";
import type { GameTheme } from "../2d/theme";
import { BallFactory, buildTable, type BallObject } from "./build";
import { FOV, lerpPose, poseDistance, poseFor, type CameraMode, type Pose } from "./camera";
import { aimDirection, fromThree, toThree } from "./coords";

export interface OverlayInput {
  aiming?: Scene["aiming"];
  markers?: Marker[];
  cameraMode: CameraMode;
}

const GOLD = 0xd4a94e;
const IVORY = 0xf0e9d8;

const disposeObject = (root: THREE.Object3D) =>
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    for (const x of Array.isArray(mat) ? mat : mat ? [mat] : []) {
      (x as THREE.MeshStandardMaterial).map?.dispose();
      x.dispose();
    }
  });

/**
 * The 3D table. A plain class with no React in it: the wrapper feeds it bodies each frame and it draws, so
 * animation never goes through React state. It owns the renderer, scene, camera and every GPU resource.
 */
export class Scene3D {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 1.9, 0.05, 30);
  private factory: BallFactory;
  private balls = new Map<string, BallObject>();
  private orientation = new Map<string, THREE.Quaternion>();
  private markerGroup = new THREE.Group();
  private aimGroup = new THREE.Group();
  private ballsGroup = new THREE.Group();
  private cue: THREE.Group;
  private ghost: THREE.Mesh;
  private lineMaterials: LineMaterial[] = [];
  private lines: { aim: Line2; hit: Line2; cue: Line2 };
  private env: THREE.Texture;
  private input: OverlayInput = { cameraMode: "auto" };
  private latestBodies: Body[] = [];
  private syncedBodies: Body[] | null = null;
  private dpr = 1;
  private lowQuality = false;
  private slowFrames = 0;
  private width = 1;
  private height = 1;
  private pose: Pose | null = null;
  private lastTime = 0;
  private aspect = 1.9;
  private raycaster = new THREE.Raycaster();
  /** When set, the camera jumps to its pose instead of gliding (prefers-reduced-motion). */
  reducedMotion = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private table: Table,
    private theme: GameTheme,
    private strikerId: string,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setClearColor(0x0a0d0b);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Shadows only change when a ball moves; `render` asks for an update then.
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.scene.background = this.roomGlow();

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = this.env;
    this.scene.environmentIntensity = 0.35;

    // A low canopy over the table: the key light casts the only real shadows, from directly above.
    const size = Math.max(table.length, table.width);
    const key = new THREE.DirectionalLight(0xfff1d8, 2.3);
    key.position.set(table.length / 2 + size * 0.06, size * 1.4, table.width / 2 + size * 0.05);
    key.target.position.set(table.length / 2, 0, table.width / 2);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const half = size * 0.62;
    Object.assign(key.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 0.1, far: size * 3 });
    key.shadow.bias = -0.0004;
    key.shadow.radius = 3;
    this.scene.add(key, key.target, new THREE.HemisphereLight(0xfff6e4, 0x18221c, 0.55));

    this.scene.add(buildTable(table, theme), this.ballsGroup, this.markerGroup, this.aimGroup);
    this.factory = new BallFactory(theme);

    this.cue = this.buildCue();
    this.cue.visible = false;
    this.scene.add(this.cue);

    this.ghost = new THREE.Mesh(
      new THREE.SphereGeometry(1, 28, 20),
      new THREE.MeshBasicMaterial({ color: IVORY, transparent: true, opacity: 0.3, depthWrite: false }),
    );
    this.ghost.visible = false;
    this.aimGroup.add(this.ghost);
    this.lines = {
      aim: this.makeLine(IVORY, 2),
      hit: this.makeLine(GOLD, 2.5),
      cue: this.makeLine(IVORY, 2),
    };
  }

  /** A dim warm falloff behind the table, so the room reads as a space and not as a void. */
  private roomGlow(): THREE.Texture | null {
    const c = document.createElement("canvas");
    c.width = 16;
    c.height = 256;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#080b09");
    g.addColorStop(0.55, "#13201a");
    g.addColorStop(1, "#1c2a22");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private buildCue(): THREE.Group {
    // The butt is at +Y, so the group can be pointed away from the ball.
    const length = 1.45;
    const group = new THREE.Group();
    const shaftLen = length * 0.66;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.0048, shaftLen, 20), new THREE.MeshStandardMaterial({ color: "#d9b47c", roughness: 0.4 }));
    shaft.position.y = shaftLen / 2;
    const buttLen = length - shaftLen;
    const butt = new THREE.Mesh(new THREE.CylinderGeometry(0.0145, 0.0095, buttLen, 20), new THREE.MeshPhysicalMaterial({ color: "#2a140a", roughness: 0.3, clearcoat: 1 }));
    butt.position.y = shaftLen + buttLen / 2;
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.0048, 0.0048, 0.012, 20), new THREE.MeshStandardMaterial({ color: "#3f7fb3", roughness: 0.8 }));
    tip.position.y = -0.006;
    for (const m of [shaft, butt]) m.castShadow = true;
    group.add(shaft, butt, tip);
    return group;
  }

  private makeLine(colour: number, width: number): Line2 {
    const material = new LineMaterial({ color: colour, linewidth: width, dashed: true, dashSize: 0.03, gapSize: 0.022, transparent: true, opacity: 0.95, depthWrite: false });
    this.lineMaterials.push(material);
    const line = new Line2(new LineGeometry(), material);
    line.visible = false;
    line.frustumCulled = false;
    this.aimGroup.add(line);
    return line;
  }

  private setLine(line: Line2, points: [number, number, number][] | null) {
    if (!points || points.length < 2) {
      line.visible = false;
      return;
    }
    line.geometry.dispose();
    const geometry = new LineGeometry();
    geometry.setPositions(points.flat());
    line.geometry = geometry;
    line.computeLineDistances();
    line.visible = true;
  }

  resize(width: number, height: number, dpr: number) {
    this.dpr = dpr;
    this.width = width;
    this.height = height;
    this.renderer.setPixelRatio(this.lowQuality ? 1 : Math.min(dpr, 2));
    this.renderer.setSize(width, height, false);
    this.aspect = width / Math.max(1, height);
    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
    for (const m of this.lineMaterials) m.resolution.set(width, height);
  }

  /** Update the aim overlay, targets and camera mode. Parts whose input has not changed are left alone. */
  setOverlay(input: OverlayInput) {
    const prev = this.input;
    this.input = input;
    if (input.markers !== prev.markers) this.rebuildMarkers();
    if (input.aiming !== prev.aiming) this.rebuildAim();
  }

  private rebuildMarkers() {
    for (const child of [...this.markerGroup.children]) {
      this.markerGroup.remove(child);
      disposeObject(child);
    }
    for (const m of this.input.markers ?? []) {
      const [x, , z] = toThree({ x: m.x, y: m.y, z: 0 });
      if (m.kind === "zone") {
        const disc = new THREE.Mesh(new THREE.CircleGeometry(m.radius, 48), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.16, depthWrite: false }));
        disc.rotation.x = -Math.PI / 2;
        disc.position.set(x, 0.006, z);
        this.markerGroup.add(disc);
      }
      const inner = m.kind === "zone" ? 0.96 : 0.9;
      const ring = new THREE.Mesh(new THREE.RingGeometry(m.radius * inner, m.radius, 64), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, 0.007, z);
      this.markerGroup.add(ring);
    }
  }

  private striker() {
    return this.latestBodies.find((b) => b.id === this.strikerId) ?? null;
  }

  private rebuildAim() {
    const aiming = this.input.aiming;
    const striker = this.striker();
    if (!aiming || !striker || striker.state === "pocketed") {
      this.aimGroup.visible = false;
      return;
    }
    this.aimGroup.visible = true;
    const R = striker.radius;
    const y = this.theme.shape === "disc" ? 0.009 : R * 0.5;
    const { prediction: pr, aids } = aiming;

    let aimPoints: [number, number, number][] | null = null;
    if (aids.aimLine) {
      const path = pr?.path ?? [];
      if (path.length > 1) aimPoints = path.map((p) => [p.y, y, p.x]);
      else {
        const [dx, dz] = aimDirection(aiming.aim);
        const [sx, , sz] = toThree(striker.position);
        aimPoints = [
          [sx, y, sz],
          [sx + dx * 1.5, y, sz + dz * 1.5],
        ];
      }
    }
    this.setLine(this.lines.aim, aimPoints);

    this.ghost.visible = !!(pr?.ghost && aids.ghostBall);
    if (pr?.ghost) {
      this.ghost.position.set(pr.ghost.y, this.theme.shape === "disc" ? 0.004 : R, pr.ghost.x);
      this.ghost.scale.set(R, this.theme.shape === "disc" ? 0.004 : R, R);
    }

    const ray = (from: { x: number; y: number } | undefined, v: { x: number; y: number } | null | undefined) => {
      if (!from || !v) return null;
      const speed = Math.hypot(v.x, v.y);
      if (speed < 1e-6) return null;
      const len = Math.min(0.9, Math.max(0.15, speed * 0.3)) * Math.min(1, this.table.width / 1.2);
      return [
        [from.y, y, from.x],
        [from.y + (v.y / speed) * len, y, from.x + (v.x / speed) * len],
      ] as [number, number, number][];
    };
    const show = pr?.ghost && aids.prediction;
    const hit = pr?.hitId ? this.latestBodies.find((b) => b.id === pr.hitId) : undefined;
    this.setLine(this.lines.hit, show ? ray(hit?.position, pr?.hitVelocity) : null);
    this.setLine(this.lines.cue, show ? ray(pr?.ghost ?? undefined, pr?.cueVelocity) : null);
  }

  /** Bring ball meshes in line with the bodies, spinning each by its angular velocity over `simDt` seconds. */
  private syncBalls(bodies: Body[], simDt: number) {
    if (simDt > 0 || bodies !== this.syncedBodies) this.renderer.shadowMap.needsUpdate = true;
    this.syncedBodies = bodies;
    const disc = this.theme.shape === "disc";
    const axis = new THREE.Vector3();
    const step = new THREE.Quaternion();
    for (const b of bodies) {
      let obj = this.balls.get(b.id);
      if (!obj) {
        obj = this.factory.create(b.id, b.radius);
        this.balls.set(b.id, obj);
        this.orientation.set(b.id, new THREE.Quaternion());
        this.ballsGroup.add(obj.group);
      }
      obj.group.visible = b.state !== "pocketed";
      const [x, , z] = toThree(b.position);
      obj.group.position.set(x, 0, z);
      obj.mesh.position.y = obj.height / 2;

      if (simDt > 0) {
        const q = this.orientation.get(b.id)!;
        // A disc only turns about the vertical; its "rolling" spin is a modelling device, not motion.
        const [wx, wy, wz] = disc ? [0, b.angularVelocity.z, 0] : toThree(b.angularVelocity);
        const mag = Math.hypot(wx, wy, wz);
        if (mag > 1e-6) {
          q.premultiply(step.setFromAxisAngle(axis.set(wx / mag, wy / mag, wz / mag), mag * simDt)).normalize();
        }
      }
      obj.mesh.quaternion.copy(this.orientation.get(b.id)!);
    }
  }

  private syncCue() {
    const aiming = this.input.aiming;
    const striker = this.striker();
    if (!aiming || !striker || striker.state === "pocketed" || this.theme.shape === "disc") {
      this.cue.visible = false;
      return;
    }
    const [dx, dz] = aimDirection(aiming.aim);
    const [sx, , sz] = toThree(striker.position);
    const gap = striker.radius * 1.5 + aiming.power * 0.2;
    // A slight rise towards the butt, so the cue clears the rail as a real one does.
    const lift = 0.1;
    const dir = new THREE.Vector3(-dx, lift, -dz).normalize();
    this.cue.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    this.cue.position.set(sx - dx * gap, striker.radius + gap * lift, sz - dz * gap);
    this.cue.visible = true;
  }

  /**
   * Draw one frame. `simDt` is the simulated time since the last frame (zero when nothing is playing), used to
   * spin the balls. Returns true while the camera is still moving, so the caller keeps frames coming.
   */
  render(bodies: Body[], playing: boolean, simDt: number): boolean {
    const first = this.latestBodies.length === 0;
    this.latestBodies = bodies;
    if (first) this.rebuildAim();
    this.syncBalls(bodies, simDt);
    this.syncCue();

    const now = performance.now();
    const wallDt = this.lastTime ? Math.min(0.1, (now - this.lastTime) / 1000) : 1;
    this.lastTime = now;

    const s = this.striker();
    const target = poseFor(
      this.input.cameraMode,
      playing,
      this.aspect,
      this.table,
      s ? { x: s.position.x, y: s.position.y } : null,
      this.input.aiming?.aim ?? this.lastAim,
      this.theme.frame,
    );
    if (this.input.aiming) this.lastAim = this.input.aiming.aim;
    const k = this.pose && !this.reducedMotion ? 1 - Math.exp(-wallDt * 7) : 1;
    this.pose = this.pose ? lerpPose(this.pose, target, k) : target;
    this.camera.position.set(...this.pose.position);
    this.camera.up.set(...this.pose.up);
    this.camera.lookAt(...this.pose.target);

    const started = performance.now();
    this.renderer.render(this.scene, this.camera);
    this.adaptQuality(performance.now() - started, playing);
    return poseDistance(this.pose, target) > 1e-3;
  }

  private lastAim = Math.PI / 2;

  /** On a weak GPU, trade resolution and soft shadows for frame rate rather than stuttering through a shot. */
  private adaptQuality(ms: number, playing: boolean) {
    if (!playing || this.lowQuality) return;
    this.slowFrames = ms > 24 ? this.slowFrames + 1 : Math.max(0, this.slowFrames - 1);
    if (this.slowFrames < 12) return;
    this.lowQuality = true;
    this.renderer.shadowMap.enabled = false;
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      for (const x of Array.isArray(mat) ? mat : mat ? [mat] : []) x.needsUpdate = true;
    });
    this.resize(this.width, this.height, this.dpr);
  }

  /** Where a pointer is on the table, in table coordinates, or null if it misses. */
  pick(clientX: number, clientY: number): { x: number; y: number } | null {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -(((clientY - r.top) / r.height) * 2 - 1));
    this.raycaster.setFromCamera(ndc, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(this.striker()?.radius ?? 0));
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(plane, hit)) return null;
    const p = fromThree(hit.x, hit.y, hit.z);
    return { x: p.x, y: p.y };
  }

  dispose() {
    disposeObject(this.scene);
    this.factory.dispose();
    this.env.dispose();
    this.lineMaterials.forEach((m) => m.dispose());
    this.renderer.dispose();
  }
}
