import * as THREE from "three";
import type { Table } from "@/core/types";
import type { GameTheme } from "../2d/theme";
import { toThree } from "./coords";

const hasDom = () => typeof document !== "undefined";

/** Height of the top of the cushion above the cloth. */
export const cushionHeight = (theme: GameTheme) => (theme.shape === "disc" ? 0.016 : 0.042);
const railHeight = (theme: GameTheme) => (theme.shape === "disc" ? 0.02 : 0.05);

function canvasTexture(w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture | null {
  if (!hasDom()) return null;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  paint(ctx);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Equirectangular ball surface. Plain balls get small spots on the axis points so that spin is visible. */
function ballTexture(id: string, theme: GameTheme): THREE.CanvasTexture | null {
  return canvasTexture(512, 256, (ctx) => {
    const w = 512;
    const h = 256;
    if (theme.paintBall3D) {
      theme.paintBall3D(ctx, w, h, id);
      return;
    }
    const colour = theme.ballColour(id);
    ctx.fillStyle = colour;
    ctx.fillRect(0, 0, w, h);
    const c = new THREE.Color(colour);
    const light = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b > 0.6;
    ctx.fillStyle = light ? "#c8201e" : "rgba(255,255,255,0.7)";
    for (const u of [0, 0.25, 0.5, 0.75]) {
      ctx.beginPath();
      ctx.ellipse(u * w, h / 2, 10, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillRect(0, 0, w, 8);
    ctx.fillRect(0, h - 8, w, 8);
  });
}

function discFaceTexture(id: string, theme: GameTheme): THREE.CanvasTexture | null {
  return canvasTexture(128, 128, (ctx) => {
    ctx.fillStyle = theme.ballColour(id);
    ctx.fillRect(0, 0, 128, 128);
    theme.decorateBall?.(ctx, 64, 64, 64, id);
  });
}

export interface BallObject {
  group: THREE.Group;
  /** Rotates with the ball's spin; the shadow stays flat on the cloth. */
  mesh: THREE.Mesh;
  height: number;
}

/** Shared geometries and materials, one set per scene, so 22 balls cost a handful of GPU resources. */
export class BallFactory {
  private geometries = new Map<string, THREE.BufferGeometry>();
  private materials = new Map<string, THREE.Material | THREE.Material[]>();
  private shadow: THREE.CanvasTexture | null;
  private shadowGeometry = new THREE.PlaneGeometry(1, 1);
  private shadowMaterial: THREE.MeshBasicMaterial;

  constructor(private theme: GameTheme) {
    this.shadow = canvasTexture(64, 64, (ctx) => {
      const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 32);
      g.addColorStop(0, "rgba(0,0,0,0.75)");
      g.addColorStop(0.55, "rgba(0,0,0,0.42)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
    });
    this.shadowMaterial = new THREE.MeshBasicMaterial({ map: this.shadow, color: this.shadow ? 0xffffff : 0x000000, transparent: true, opacity: 0.9, depthWrite: false });
  }

  private geometry(key: string, make: () => THREE.BufferGeometry) {
    let g = this.geometries.get(key);
    if (!g) {
      g = make();
      this.geometries.set(key, g);
    }
    return g;
  }

  create(id: string, radius: number): BallObject {
    const disc = this.theme.shape === "disc";
    const height = disc ? 0.0075 : radius * 2;
    const geometry = disc
      ? this.geometry(`disc/${radius}`, () => new THREE.CylinderGeometry(radius, radius, height, 40))
      : this.geometry(`ball/${radius}`, () => new THREE.SphereGeometry(radius, 40, 28));
    let material = this.materials.get(id);
    if (!material) {
      if (disc) {
        const side = new THREE.MeshStandardMaterial({ color: this.theme.ballColour(id), roughness: 0.55 });
        const tex = discFaceTexture(id, this.theme);
        const top = new THREE.MeshStandardMaterial({ map: tex, color: tex ? 0xffffff : this.theme.ballColour(id), roughness: 0.42 });
        material = [side, top, top];
      } else {
        const tex = ballTexture(id, this.theme);
        material = new THREE.MeshPhysicalMaterial({
          map: tex,
          color: tex ? 0xffffff : this.theme.ballColour(id),
          roughness: 0.32,
          metalness: 0,
          clearcoat: 1,
          clearcoatRoughness: 0.08,
          envMapIntensity: 0.9,
        });
      }
      this.materials.set(id, material);
    }
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    const shadow = new THREE.Mesh(this.shadowGeometry, this.shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.0015;
    shadow.scale.setScalar(radius * 3.1);
    const group = new THREE.Group();
    group.add(shadow, mesh);
    return { group, mesh, height };
  }

  dispose() {
    this.geometries.forEach((g) => g.dispose());
    this.shadowGeometry.dispose();
    this.shadowMaterial.dispose();
    this.shadow?.dispose();
    this.materials.forEach((m) => {
      for (const mat of Array.isArray(m) ? m : [m]) {
        (mat as THREE.MeshStandardMaterial).map?.dispose();
        mat.dispose();
      }
    });
  }
}

/** Cloth texture with the markings painted on, using the same mapping as the 2D view. */
function clothTexture(table: Table, theme: GameTheme): THREE.CanvasTexture | null {
  const px = Math.min(1100, 3600 / table.length);
  const w = Math.round(table.length * px);
  const h = Math.round(table.width * px);
  return canvasTexture(w, h, (ctx) => {
    ctx.fillStyle = theme.surface.cloth;
    ctx.fillRect(0, 0, w, h);
    const count = Math.round((w * h) / 60);
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${Math.random() * 0.05})` : `rgba(0,0,0,${Math.random() * 0.06})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 1);
    }
    theme.drawMarkings(ctx, { scale: px, ox: 0, oy: 0 }, table);
  });
}

/** Wood grain running along the texture's width. */
function woodTexture(base: string, dark: string): THREE.CanvasTexture | null {
  const tex = canvasTexture(1024, 128, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 1024, 128);
    for (let i = 0; i < 260; i++) {
      ctx.strokeStyle = dark;
      ctx.globalAlpha = 0.05 + Math.random() * 0.14;
      ctx.lineWidth = 0.5 + Math.random() * 1.6;
      const y = Math.random() * 128;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(340, y + Math.random() * 10 - 5, 680, y + Math.random() * 10 - 5, 1024, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
  if (tex) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
  }
  return tex;
}

/** A cushion cross-section: its inner face leans out from a nose above the cloth, as a real rubber does. */
function cushionGeometry(length: number, band: number, height: number): THREE.BufferGeometry {
  const noseHeight = height * 0.86;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.001);
  shape.lineTo(0, noseHeight * 0.85);
  shape.lineTo(band * 0.14, height);
  shape.lineTo(band, height);
  shape.lineTo(band, 0.001);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false, steps: 1 });
  g.translate(0, 0, -length / 2);
  // Now: x across the band (outwards), y up, z along the cushion. Turn it so that x runs along the cushion.
  g.rotateY(Math.PI / 2);
  return g;
}

const named = <T extends THREE.Object3D>(o: T, name: string) => {
  o.name = name;
  return o;
};

/** Build the table: slab, cloth, cushions up to each pocket jaw, rails, pockets and trim. */
export function buildTable(table: Table, theme: GameTheme): THREE.Group {
  const g = new THREE.Group();
  g.name = "table";
  const L = table.length;
  const W = table.width;
  const { surface, frame, band } = theme;
  const rail = frame - band;
  const railTop = railHeight(theme);

  const wood = woodTexture(surface.rail, surface.railDark);
  const railMaterial = new THREE.MeshPhysicalMaterial({ map: wood, color: wood ? 0xffffff : surface.rail, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.3 });

  const slab = new THREE.Mesh(new THREE.BoxGeometry(L + 2 * frame + 0.05, 0.12, W + 2 * frame + 0.05), new THREE.MeshStandardMaterial({ color: surface.railDark, roughness: 0.8 }));
  slab.position.set(L / 2, -0.062, W / 2);
  slab.receiveShadow = true;
  g.add(named(slab, "slab"));

  const bandSurface = new THREE.Mesh(new THREE.PlaneGeometry(L + 2 * band, W + 2 * band), new THREE.MeshStandardMaterial({ color: surface.cushion, roughness: 0.95 }));
  bandSurface.rotation.x = -Math.PI / 2;
  bandSurface.position.set(L / 2, -0.0008, W / 2);
  g.add(named(bandSurface, "band"));

  const tex = clothTexture(table, theme);
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(L, W), new THREE.MeshStandardMaterial({ color: tex ? 0xffffff : surface.cloth, map: tex, roughness: theme.shape === "disc" ? 0.45 : 0.96 }));
  cloth.rotation.x = -Math.PI / 2;
  cloth.position.set(L / 2, 0, W / 2);
  cloth.receiveShadow = true;
  g.add(named(cloth, "cloth"));

  // Rails around the cushion band: X runs along the table, Z across it.
  const addRail = (w: number, d: number, x: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, railTop, d), railMaterial);
    m.position.set(x, railTop / 2, z);
    m.castShadow = true;
    g.add(named(m, "rail"));
  };
  addRail(L + 2 * frame, rail, L / 2, -(band + rail / 2));
  addRail(L + 2 * frame, rail, L / 2, W + band + rail / 2);
  addRail(rail, W + 2 * band, -(band + rail / 2), W / 2);
  addRail(rail, W + 2 * band, L + band + rail / 2, W / 2);

  // Pockets are dark wells with a trim ring, sitting over the band in the gap between cushions.
  const wellMaterial = new THREE.MeshBasicMaterial({ color: 0x030303 });
  const ringMaterial = new THREE.MeshStandardMaterial({ color: surface.trim, roughness: 0.3, metalness: 0.8 });
  for (const p of table.pockets) {
    const [x, , z] = toThree(p.position);
    const r = p.radius * 1.28;
    const well = new THREE.Mesh(new THREE.CircleGeometry(r, 36), wellMaterial);
    well.rotation.x = -Math.PI / 2;
    well.position.set(x, 0.004, z);
    g.add(named(well, "pocket"));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, Math.min(0.005, r * 0.08), 8, 48), ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.005, z);
    g.add(named(ring, "pocket-ring"));
  }

  // Cushions stop at the jaw tips. The nose of each sits exactly on the physics cushion line.
  const cushionMaterial = new THREE.MeshStandardMaterial({ color: surface.cushion, roughness: 0.88 });
  const height = cushionHeight(theme);
  const centreX = L / 2;
  const centreZ = W / 2;
  for (const c of table.cushions) {
    const [ax, , az] = toThree(c.a);
    const [bx, , bz] = toThree(c.b);
    const len = Math.hypot(bx - ax, bz - az);
    const dx = (bx - ax) / len;
    const dz = (bz - az) / len;
    const mx = (ax + bx) / 2;
    const mz = (az + bz) / 2;
    // Outward normal: away from the middle of the table.
    let nx = -dz;
    let nz = dx;
    if ((centreX - mx) * nx + (centreZ - mz) * nz > 0) {
      nx = -nx;
      nz = -nz;
    }
    const m = new THREE.Mesh(cushionGeometry(len, band, height), cushionMaterial);
    // The extrusion has its length on X and band depth on local -Z; turn so the depth points along the outward normal.
    m.rotation.y = Math.atan2(-nx, -nz);
    m.position.set(mx, 0, mz);
    m.receiveShadow = true;
    g.add(named(m, "cushion"));
  }
  return g;
}
