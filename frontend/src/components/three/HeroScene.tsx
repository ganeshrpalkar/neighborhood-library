"use client";

import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Environment, Float, Sparkles, Stars, useTexture } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

type BookDef = { cover: string; title: string; author: string; isbn: string; spine: string };

// 14 distinct books (each appears once — no duplicates in the scene).
const BOOKS: BookDef[] = [
  { cover: "harry-potter", title: "Harry Potter and the Sorcerer's Stone", author: "J. K. Rowling", isbn: "9780590353427", spine: "#7c1f1f" },
  { cover: "lord-of-the-rings", title: "The Lord of the Rings", author: "J. R. R. Tolkien", isbn: "9780547928210", spine: "#2a1d10" },
  { cover: "the-hobbit", title: "The Hobbit", author: "J. R. R. Tolkien", isbn: "9780547928227", spine: "#163027" },
  { cover: "dune", title: "Dune", author: "Frank Herbert", isbn: "9780441013593", spine: "#3a2410" },
  { cover: "game-of-thrones", title: "A Game of Thrones", author: "George R. R. Martin", isbn: "9780553593716", spine: "#1f2937" },
  { cover: "nineteen-eighty-four", title: "1984", author: "George Orwell", isbn: "9780451524935", spine: "#1b1b1b" },
  { cover: "sapiens", title: "Sapiens", author: "Yuval Noah Harari", isbn: "9780062316097", spine: "#8a6d1a" },
  { cover: "atomic-habits", title: "Atomic Habits", author: "James Clear", isbn: "9780735211292", spine: "#a98300" },
  { cover: "clean-code", title: "Clean Code", author: "Robert C. Martin", isbn: "9780132350884", spine: "#0f3d3e" },
  { cover: "gatsby", title: "The Great Gatsby", author: "F. Scott Fitzgerald", isbn: "9780743273565", spine: "#1e3a8a" },
  { cover: "mockingbird", title: "To Kill a Mockingbird", author: "Harper Lee", isbn: "9780061120084", spine: "#14532d" },
  { cover: "pride-prejudice", title: "Pride and Prejudice", author: "Jane Austen", isbn: "9780141439518", spine: "#0f766e" },
  { cover: "alchemist", title: "The Alchemist", author: "Paulo Coelho", isbn: "9780061122415", spine: "#a16207" },
  { cover: "name-of-the-wind", title: "The Name of the Wind", author: "Patrick Rothfuss", isbn: "9780756404741", spine: "#1e293b" },
];

const PAGE_COLOR = "#efe7d0";

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp((n >> 16) + amt);
  const g = clamp(((n >> 8) & 255) + amt);
  const b = clamp((n & 255) + amt);
  return `rgb(${r},${g},${b})`;
}

/** Printed spine: title + author set vertically on a cloth-coloured binding with gilt bands. */
function makeSpineTexture(def: BookDef): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 512;
  const x = c.getContext("2d")!;
  const g = x.createLinearGradient(0, 0, 128, 0);
  g.addColorStop(0, shade(def.spine, -28));
  g.addColorStop(0.5, def.spine);
  g.addColorStop(1, shade(def.spine, -38));
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 512);
  x.fillStyle = "rgba(214,178,94,0.75)"; // gilt bands
  x.fillRect(12, 44, 104, 4);
  x.fillRect(12, 512 - 48, 104, 4);

  x.save();
  x.translate(64, 256);
  x.rotate(-Math.PI / 2);
  x.textAlign = "center";
  x.textBaseline = "middle";
  // title (toward top of spine)
  let fs = 30;
  x.font = `bold ${fs}px Georgia, serif`;
  while (x.measureText(def.title).width > 360 && fs > 13) {
    fs -= 2;
    x.font = `bold ${fs}px Georgia, serif`;
  }
  x.fillStyle = "#f4e7c6";
  x.fillText(def.title, 30, 0);
  // author (toward bottom of spine)
  x.font = "italic 18px Georgia, serif";
  x.fillStyle = "rgba(244,231,198,0.85)";
  x.fillText(def.author, -180, 0);
  x.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Back cover: cloth-coloured panel with a blurb block (decorative) and a barcode + ISBN. */
function makeBackTexture(def: BookDef): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 360;
  c.height = 480;
  const x = c.getContext("2d")!;
  const g = x.createLinearGradient(0, 0, 0, 480);
  g.addColorStop(0, shade(def.spine, 12));
  g.addColorStop(1, shade(def.spine, -22));
  x.fillStyle = g;
  x.fillRect(0, 0, 360, 480);
  x.strokeStyle = "rgba(255,255,255,0.12)";
  x.lineWidth = 2;
  x.strokeRect(16, 16, 328, 448);

  // decorative blurb lines (bars, not text)
  x.fillStyle = "rgba(245,240,225,0.16)";
  [300, 286, 308, 264, 292, 248, 276].forEach((w, i) => x.fillRect(34, 56 + i * 26, w, 8));

  // barcode + ISBN
  x.fillStyle = "#ffffff";
  x.fillRect(210, 388, 134, 70);
  x.fillStyle = "#000000";
  const digits = def.isbn.replace(/\D/g, "");
  let bx = 220;
  for (let i = 0; i < 48 && bx < 336; i++) {
    const d = parseInt(digits[i % digits.length] || "1", 10);
    const w = 1 + (d % 3);
    x.fillRect(bx, 396, w, 44);
    bx += w + 2;
  }
  x.font = "11px monospace";
  x.fillText(def.isbn, 220, 452);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function BookMesh({
  front,
  spineTex,
  backTex,
  width = 1.5,
  height = 2.28,
  depth = 0.42,
}: {
  front: THREE.Texture;
  spineTex: THREE.Texture;
  backTex: THREE.Texture;
  width?: number;
  height?: number;
  depth?: number;
}) {
  return (
    <mesh>
      <boxGeometry args={[width, height, depth]} />
      {/* +x fore-edge pages, -x spine, +y top, -y bottom, +z front cover, -z back cover */}
      <meshStandardMaterial attach="material-0" color={PAGE_COLOR} roughness={0.95} />
      <meshStandardMaterial attach="material-1" map={spineTex} roughness={0.5} metalness={0.08} />
      <meshStandardMaterial attach="material-2" color={PAGE_COLOR} roughness={0.95} />
      <meshStandardMaterial attach="material-3" color={PAGE_COLOR} roughness={0.95} />
      <meshStandardMaterial attach="material-4" map={front} roughness={0.45} metalness={0.05} />
      <meshStandardMaterial attach="material-5" map={backTex} roughness={0.55} metalness={0.05} />
    </mesh>
  );
}

function Book({
  front,
  spineTex,
  backTex,
  position,
  rotation,
  baseScale,
}: {
  front: THREE.Texture;
  spineTex: THREE.Texture;
  backTex: THREE.Texture;
  position: [number, number, number];
  rotation: [number, number, number];
  baseScale: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const hovered = useRef(false);

  useFrame(() => {
    const gp = ref.current;
    if (!gp) return;
    const target = hovered.current ? baseScale * 1.32 : baseScale;
    gp.scale.setScalar(THREE.MathUtils.lerp(gp.scale.x, target, 0.15));
    gp.position.z = THREE.MathUtils.lerp(gp.position.z, position[2] + (hovered.current ? 1.0 : 0), 0.15);
    if (hovered.current) gp.rotation.y += 0.025;
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    hovered.current = true;
    if (typeof document !== "undefined") document.body.style.cursor = "pointer";
  };
  const out = () => {
    hovered.current = false;
    if (typeof document !== "undefined") document.body.style.cursor = "auto";
  };

  return (
    <group ref={ref} position={position} rotation={rotation} scale={baseScale} onPointerOver={over} onPointerOut={out}>
      <BookMesh front={front} spineTex={spineTex} backTex={backTex} />
    </group>
  );
}

function Cluster({ variant }: { variant: "hero" | "background" }) {
  const fronts = useTexture(BOOKS.map((b) => `/covers/${b.cover}.jpg`));
  const deco = useMemo(() => BOOKS.map((b) => ({ spine: makeSpineTexture(b), back: makeBackTexture(b) })), []);
  const spin = useRef<THREE.Group>(null);
  const parallax = useRef<THREE.Group>(null);

  useEffect(() => {
    fronts.forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      t.needsUpdate = true;
    });
  }, [fronts]);

  const placed = useMemo(() => {
    const facing = (angle: number): [number, number, number] => [0.12, Math.PI / 2 - angle, 0.05];
    const items: { idx: number; position: [number, number, number]; rotation: [number, number, number]; scale: number; floatSpeed: number; rotI: number; floatI: number }[] = [];

    if (variant === "hero") {
      items.push({ idx: 0, position: [0, 0, 0], rotation: [0, 0, 0], scale: 1.45, floatSpeed: 1.1, rotI: 0.3, floatI: 0.7 });
      const ring = 6;
      for (let i = 0; i < ring; i++) {
        const a = (i / ring) * Math.PI * 2;
        const r = 3.5;
        items.push({ idx: i + 1, position: [Math.cos(a) * r, Math.sin(a * 1.7) * 0.7, Math.sin(a) * r], rotation: facing(a), scale: 0.78 + (i % 3) * 0.08, floatSpeed: 1.3 + (i % 3) * 0.3, rotI: 0.5, floatI: 1.1 });
      }
      return items;
    }

    // background: every book placed once across two rings (no repeats)
    const inner = 7;
    for (let i = 0; i < inner; i++) {
      const a = (i / inner) * Math.PI * 2;
      const r = 4.6;
      items.push({ idx: i, position: [Math.cos(a) * r, Math.sin(a * 1.6) * 1.3, Math.sin(a) * r - 0.5], rotation: facing(a), scale: 0.9 + (i % 3) * 0.1, floatSpeed: 1.2 + (i % 4) * 0.25, rotI: 0.6, floatI: 1.3 });
    }
    const outer = BOOKS.length - inner;
    for (let j = 0; j < outer; j++) {
      const a = (j / outer) * Math.PI * 2 + 0.45;
      const r = 7.3;
      items.push({ idx: inner + j, position: [Math.cos(a) * r, Math.sin(a * 2.1) * 2.2, Math.sin(a) * r - 3], rotation: facing(a), scale: 0.62 + (j % 2) * 0.1, floatSpeed: 0.9 + (j % 3) * 0.3, rotI: 0.7, floatI: 1.6 });
    }
    return items;
  }, [variant]);

  useFrame((state, delta) => {
    if (spin.current) spin.current.rotation.y += delta * (variant === "hero" ? 0.16 : 0.1);
    if (parallax.current) {
      parallax.current.rotation.y = THREE.MathUtils.lerp(parallax.current.rotation.y, state.pointer.x * 0.45, 0.045);
      parallax.current.rotation.x = THREE.MathUtils.lerp(parallax.current.rotation.x, -state.pointer.y * 0.28, 0.045);
    }
  });

  return (
    <group ref={parallax}>
      <group ref={spin}>
        {placed.map((b, i) => (
          <Float key={i} speed={b.floatSpeed} rotationIntensity={b.rotI} floatIntensity={b.floatI}>
            <Book
              front={fronts[b.idx]}
              spineTex={deco[b.idx].spine}
              backTex={deco[b.idx].back}
              position={b.position}
              rotation={b.rotation}
              baseScale={b.scale}
            />
          </Float>
        ))}
      </group>
    </group>
  );
}

export default function HeroScene({ variant = "hero" }: { variant?: "hero" | "background" }) {
  const camZ = variant === "background" ? 10 : 8.4;
  return (
    <Canvas camera={{ position: [0, 0.5, camZ], fov: 44 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
      <Suspense fallback={null}>
        <ambientLight intensity={0.85} />
        <directionalLight position={[3, 5, 6]} intensity={2.1} color="#ffffff" />
        <pointLight position={[-6, 2, 4]} intensity={45} color="#8b5cf6" />
        <pointLight position={[6, -3, 2]} intensity={35} color="#22d3ee" />
        <Cluster variant={variant} />
        <Sparkles count={variant === "background" ? 80 : 40} scale={[18, 10, 10]} size={2.5} speed={0.3} color="#a78bfa" opacity={0.5} />
        <Stars radius={60} depth={40} count={variant === "background" ? 2000 : 1100} factor={3} saturation={0} fade speed={1} />
        <Environment preset="city" environmentIntensity={0.4} />
      </Suspense>
    </Canvas>
  );
}
