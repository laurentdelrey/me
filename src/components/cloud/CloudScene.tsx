"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type MutableRefObject,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { tagMatchesFilter, type TagFilter, type MediaTag } from "@/lib/work/tags";

export type CloudItem = {
  id: string;
  date: string;
  text: string;
  url: string;
  img: string; // thumbnail / poster
  imgFull: string; // full-res, loaded on focus
  videoUrl?: string; // videos play inline on hover/focus
  recap?: boolean; // year-end montage — gets extra visual weight
  w: number;
  h: number;
  eraId: string;
  tag: MediaTag;
};

export type CloudEra = {
  id: string;
  label: string;
  years: string;
  color: string;
  city: string;
  center: [number, number];
  zoom: number;
};

export type CloudShape = "sphere" | "heart" | "smiley" | "star" | "grid" | "about";

// Mutable control surface written by the UI shell, read by the render loop.
export type CloudControls = {
  filter: TagFilter;
  unfocusToken: number; // bumped → release focused card
  shape: CloudShape;
  started: boolean; // false until the loading intro hands over
};

type Props = {
  items: CloudItem[];
  controlsRef: MutableRefObject<CloudControls>;
  onHoverItem: (item: CloudItem | null, accent: string | null) => void;
  onFocusChange: (item: CloudItem | null, accent: string | null) => void;
  // fired once when enough thumbnails are in to raise the curtain
  onReady: () => void;
  // Rides the master frame's top edge — the page header lives here.
  frameLabel: ReactNode;
  // Anchored under the frame's bottom-right corner — the hovered/focused caption.
  frameCaption: ReactNode;
  // Master frame + value chips take the active filter's color.
  frameColor: string;
};

function rand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x) - 0.5;
}

function frac(x: number): number {
  return x - Math.floor(x);
}

// Sample a saturated accent color from a loaded thumbnail. Falls back to the
// CV palette when the image is essentially greyscale.
function sampleAccent(img: CanvasImageSource, seed: number): string {
  const fallback = CV.fallback[Math.abs(seed) % CV.fallback.length];
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 20;
    const ctx = c.getContext("2d");
    if (!ctx) return fallback;
    ctx.drawImage(img, 0, 0, 20, 20);
    const d = ctx.getImageData(0, 0, 20, 20).data;
    // average the hue of all decently-saturated pixels (vector mean) so one
    // noisy pixel can't produce a muddy accent
    let vx = 0;
    let vy = 0;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i] / 255;
      const g = d[i + 1] / 255;
      const b = d[i + 2] / 255;
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      const l = (mx + mn) / 2;
      const div = 1 - Math.abs(2 * l - 1);
      const s = div === 0 ? 0 : (mx - mn) / div;
      const score = s * (1 - Math.abs(l - 0.5) * 1.3);
      if (score < 0.35 || mx === mn) continue;
      let h = 0;
      if (mx === r) h = ((g - b) / (mx - mn)) % 6;
      else if (mx === g) h = (b - r) / (mx - mn) + 2;
      else h = (r - g) / (mx - mn) + 4;
      const rad = (((h * 60 + 360) % 360) * Math.PI) / 180;
      vx += Math.cos(rad) * score;
      vy += Math.sin(rad) * score;
      n++;
    }
    // too few colorful pixels → guaranteed-bright palette pick
    if (n < 4) return fallback;
    const hue = ((Math.atan2(vy, vx) * 180) / Math.PI + 360) % 360;
    return hslToHex(hue, 0.82, 0.52);
  } catch {
    return fallback;
  }
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const v = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Matches the profile picture's background — the canvas and the pfp blend.
export const CLOUD_BG = "#bfbfbf";
// The master frame is neutral system ink; per-card annotations take an
// accent sampled from the image itself (palette fallback for grey images).
export const CV = {
  frame: "#26262b",
  fallback: ["#00c853", "#2979ff", "#ff2fae", "#ffc400", "#e8442e"],
};

const CARD_MAX = 1.8;
const FRAME_PAD = 0.014; // hairline edge
const SPHERE_R = 4.6;

// Per-shape tuning: noise blurs organic shapes but destroys geometric ones,
// and smaller cards let the silhouette read.
const SHAPE_TUNE: Record<Exclude<CloudShape, "about">, { noise: number; card: number }> = {
  sphere: { noise: 1, card: 1 },
  heart: { noise: 0.2, card: 0.7 },
  smiley: { noise: 0.12, card: 0.58 },
  star: { noise: 0.12, card: 0.6 },
  grid: { noise: 0.02, card: 1 },
};

export default function CloudScene({
  items,
  controlsRef,
  onHoverItem,
  onFocusChange,
  frameLabel,
  frameCaption,
  frameColor,
  onReady,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bboxRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const callbacksRef = useRef({ onHoverItem, onFocusChange, onReady });
  callbacksRef.current = { onHoverItem, onFocusChange, onReady };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      40,
      container.clientWidth / container.clientHeight,
      0.1,
      120
    );
    camera.position.z = 15;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const geo = new THREE.PlaneGeometry(1, 1);

    type Card = {
      group: THREE.Group;
      imgMesh: THREE.Mesh;
      frameMesh: THREE.Mesh;
      mat: THREE.MeshBasicMaterial;
      item: CloudItem;
      baseColor: THREE.Color;
      thumbTex: THREE.Texture | null;
      texLoaded: boolean;
      accent: string;
      seed: number;
      hoverScale: number;
      visScale: number;
      gridX: number;
      gridY: number;
      gridScale: number;
      introDelay: number;
      introduced: boolean;
      introBlend: number;
      sortDist: number;
      ordinal: number;
      on: boolean;
      baseW: number;
      baseH: number;
    };

    const cards: Card[] = [];
    const pickMeshes: THREE.Mesh[] = [];

    items.forEach((item, i) => {
      const aspect = item.w / Math.max(1, item.h);
      const bw = aspect >= 1 ? CARD_MAX : CARD_MAX * aspect;
      const bh = aspect >= 1 ? CARD_MAX / aspect : CARD_MAX;

      const placeholder = new THREE.Color("#aeaeb2");
      const mat = new THREE.MeshBasicMaterial({
        color: placeholder.clone(),
        depthTest: false,
        depthWrite: false,
        transparent: true,
        opacity: 0,
      });
      const imgMesh = new THREE.Mesh(geo, mat);
      imgMesh.scale.set(bw, bh, 1);
      imgMesh.userData.cardIndex = i;

      const frameMesh = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({
          color: "#ffffff",
          depthTest: false,
          depthWrite: false,
          transparent: true,
          opacity: 0,
        })
      );
      frameMesh.scale.set(bw + FRAME_PAD, bh + FRAME_PAD, 1);
      frameMesh.position.z = -0.006;

      const group = new THREE.Group();
      group.add(frameMesh);
      group.add(imgMesh);
      scene.add(group);

      cards.push({
        group,
        imgMesh,
        frameMesh,
        mat,
        item,
        baseColor: placeholder,
        thumbTex: null,
        texLoaded: false,
        accent: CV.fallback[i % CV.fallback.length],
        seed: i,
        hoverScale: 1,
        visScale: 0,
        gridX: 0,
        gridY: 0,
        gridScale: 0.5,
        introDelay: (rand(i * 11 + 3) + 0.5) * 1300,
        introduced: false,
        introBlend: 0,
        sortDist: 15,
        ordinal: i,
        on: true,
        baseW: bw,
        baseH: bh,
      });
      pickMeshes.push(imgMesh);
    });

    // ---- texture loading --------------------------------------------------
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    let loadCursor = 0;
    let inFlight = 0;
    let disposed = false;
    let loadedCount = 0;
    let readyFired = false;
    const readyThreshold = Math.ceil(cards.length * 0.65);
    function noteLoaded() {
      loadedCount++;
      if (!readyFired && loadedCount >= readyThreshold) {
        readyFired = true;
        callbacksRef.current.onReady();
      }
    }
    // don't hold the curtain forever on a slow connection
    const readyTimeout = setTimeout(() => {
      if (!readyFired) {
        readyFired = true;
        callbacksRef.current.onReady();
      }
    }, 6000);
    const textures: THREE.Texture[] = [];
    const fullTextures = new Map<string, THREE.Texture>();

    function pump() {
      while (inFlight < 6 && loadCursor < cards.length && !disposed) {
        const card = cards[loadCursor++];
        inFlight++;
        loader.load(
          card.item.img,
          (tex) => {
            inFlight--;
            if (disposed) return void tex.dispose();
            tex.colorSpace = THREE.SRGBColorSpace;
            textures.push(tex);
            card.thumbTex = tex;
            if (tex.image) {
              card.accent = sampleAccent(tex.image as CanvasImageSource, card.seed);
            }
            card.mat.map = tex;
            card.baseColor = new THREE.Color("#ffffff");
            card.mat.needsUpdate = true;
            card.texLoaded = true;
            noteLoaded();
            pump();
          },
          undefined,
          () => {
            inFlight--;
            card.texLoaded = true;
            noteLoaded();
            pump();
          }
        );
      }
    }
    pump();

    function loadFull(card: Card) {
      const cached = fullTextures.get(card.item.id);
      if (cached) {
        card.mat.map = cached;
        card.mat.needsUpdate = true;
        return;
      }
      loader.load(card.item.imgFull, (tex) => {
        if (disposed) return void tex.dispose();
        tex.colorSpace = THREE.SRGBColorSpace;
        fullTextures.set(card.item.id, tex);
        // don't clobber a live video texture
        if (videoCard !== card && !isAmbient(card)) {
          card.mat.map = tex;
          card.mat.needsUpdate = true;
        }
      });
    }

    // ---- inline video playback (one at a time: focused, else hovered) -----
    let videoCard: Card | null = null;
    let videoEl: HTMLVideoElement | null = null;
    let videoTex: THREE.VideoTexture | null = null;

    function stopVideo() {
      if (!videoCard) return;
      const card = videoCard;
      videoCard = null;
      if (isAmbient(card)) return;
      if (videoEl) {
        videoEl.pause();
        videoEl.removeAttribute("src");
        videoEl.load();
        videoEl = null;
      }
      videoTex?.dispose();
      videoTex = null;
      card.mat.map = fullTextures.get(card.item.id) ?? card.thumbTex;
      card.mat.needsUpdate = true;
    }

    // ---- ambient videos: a small rotating pool plays inside the shape ----
    type Ambient = { card: Card; el: HTMLVideoElement; tex: THREE.VideoTexture };
    const ambient: Ambient[] = [];
    const AMBIENT_N = 4;
    let nextAmbientAt = 0;

    function stopAmbient(slot: Ambient) {
      const idx = ambient.indexOf(slot);
      if (idx !== -1) ambient.splice(idx, 1);
      slot.el.pause();
      slot.el.removeAttribute("src");
      slot.el.load();
      slot.tex.dispose();
      slot.card.mat.map =
        fullTextures.get(slot.card.item.id) ?? slot.card.thumbTex;
      slot.card.mat.needsUpdate = true;
    }

    function startAmbient(card: Card) {
      if (!card.item.videoUrl) return;
      const el = document.createElement("video");
      el.src = card.item.videoUrl;
      el.muted = true;
      el.loop = true;
      el.playsInline = true;
      el.crossOrigin = "anonymous";
      el.play().catch(() => {});
      const tex = new THREE.VideoTexture(el);
      tex.colorSpace = THREE.SRGBColorSpace;
      card.mat.map = tex;
      card.mat.needsUpdate = true;
      ambient.push({ card, el, tex });
    }

    function isAmbient(card: Card) {
      return ambient.some((a) => a.card === card);
    }

    function playVideo(card: Card) {
      if (videoCard === card || !card.item.videoUrl) return;
      // already playing ambiently — leave it be
      if (isAmbient(card)) return;
      stopVideo();
      videoCard = card;
      const v = document.createElement("video");
      v.src = card.item.videoUrl;
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.crossOrigin = "anonymous";
      v.play().catch(() => {});
      videoEl = v;
      videoTex = new THREE.VideoTexture(v);
      videoTex.colorSpace = THREE.SRGBColorSpace;
      card.mat.map = videoTex;
      card.mat.needsUpdate = true;
    }

    // ---- layouts ----------------------------------------------------------
    const golden = Math.PI * (3 - Math.sqrt(5));
    let visibleCount = cards.length;

    function recomputeOrdinals(filter: TagFilter, animateChange = false) {
      let o = 0;
      for (const c of cards) {
        const on = tagMatchesFilter(c.item.tag, filter);
        if (animateChange && on && !c.on) {
          // re-added cards bloom out from the center
          c.group.position.set(rand(c.seed * 3) * 1.5, rand(c.seed * 5) * 1.5, -2);
        }
        c.on = on;
        if (c.on) c.ordinal = o++;
      }
      visibleCount = Math.max(1, o);
    }

    function spherePos(ord: number, out: THREE.Vector3) {
      const t = visibleCount <= 1 ? 0 : ord / (visibleCount - 1);
      const y = 1 - 2 * t;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const th = ord * golden;
      out.set(
        Math.cos(th) * r * SPHERE_R,
        y * SPHERE_R * 0.92,
        Math.sin(th) * r * SPHERE_R
      );
    }

    // Filled heart facing the camera; rim-biased fill keeps the outline crisp.
    function heartPos(ord: number, out: THREE.Vector3) {
      const t = frac(ord * 0.61803398875) * Math.PI * 2;
      const st = Math.sin(t);
      const hx = 16 * st * st * st;
      const hy =
        13 * Math.cos(t) -
        5 * Math.cos(2 * t) -
        2 * Math.cos(3 * t) -
        Math.cos(4 * t);
      const r = Math.pow(frac(ord * 0.7548776662), 0.35);
      const cy = -2.6;
      const k = 0.3;
      out.set(
        hx * r * k,
        (cy + (hy - cy) * r + 2.6) * k,
        rand(ord * 5 + 4) * 1.2
      );
    }

    // Classic smiley: outline ring, two oval eyes, a big smile arc.
    function smileyPos(ord: number, out: THREE.Vector3) {
      const R = 4.3;
      const u = visibleCount <= 1 ? 0 : ord / visibleCount;
      const r1 = frac(ord * 0.61803398875 + 0.13);
      const r2 = frac(ord * 0.7548776662 + 0.37);
      if (u < 0.44) {
        // face outline
        const th = (u / 0.44) * Math.PI * 2;
        out.set(Math.sin(th) * R, Math.cos(th) * R, rand(ord * 5 + 4) * 0.9);
      } else if (u < 0.55) {
        // eyes — tall ovals
        const side = u < 0.495 ? -1 : 1;
        const th = r1 * Math.PI * 2;
        const rr = Math.sqrt(r2);
        out.set(
          side * 1.5 + Math.cos(th) * 0.5 * rr,
          1.35 + Math.sin(th) * 0.95 * rr,
          rand(ord * 5 + 4) * 0.7
        );
      } else {
        // smile arc
        const tt = (u - 0.55) / 0.45;
        const a = (Math.PI / 180) * (205 + 130 * tt);
        const rr = 2.55 + rand(ord * 11 + 3) * 0.35;
        out.set(
          Math.cos(a) * rr,
          Math.sin(a) * rr + 0.35,
          rand(ord * 5 + 4) * 0.7
        );
      }
    }

    // Five-pointed star: sample along the polygon edges, rim-biased fill.
    function starPos(ord: number, out: THREE.Vector3) {
      const R = 4.9;
      const RIN = 2.0;
      const m = 10;
      const u = frac(ord * 0.61803398875) * m;
      const e = Math.floor(u);
      const f = u - e;
      const a1 = (e / m) * Math.PI * 2 - Math.PI / 2;
      const a2 = ((e + 1) / m) * Math.PI * 2 - Math.PI / 2;
      const r1 = e % 2 === 0 ? R : RIN;
      const r2 = e % 2 === 0 ? RIN : R;
      const px = Math.cos(a1) * r1 + (Math.cos(a2) * r2 - Math.cos(a1) * r1) * f;
      const py = -(Math.sin(a1) * r1 + (Math.sin(a2) * r2 - Math.sin(a1) * r1) * f);
      const rr = Math.pow(frac(ord * 0.7548776662), 0.4);
      out.set(px * rr, py * rr + 0.2, rand(ord * 5 + 4) * 0.9);
    }

    // Masonry — fixed-width columns, natural aspect ratios, each card
    // dropped into the shortest column, in a fresh random order per visit.
    const gridShuffle = cards.map((_, i) => i);
    for (let i = gridShuffle.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [gridShuffle[i], gridShuffle[j]] = [gridShuffle[j], gridShuffle[i]];
    }
    let gridTop = 4;
    let gridTotalH = 10;
    let gridScrollY = 0;
    let gridScrollVel = 0;

    function shapePos(
      shape: Exclude<CloudShape, "about">,
      ord: number,
      out: THREE.Vector3
    ) {
      if (shape === "heart") heartPos(ord, out);
      else if (shape === "smiley") smileyPos(ord, out);
      else if (shape === "star") starPos(ord, out);
      else spherePos(ord, out);
    }

    // ---- interaction state ------------------------------------------------
    let effRot = 0.6;
    let rotVel = 0;
    let layoutShape: Exclude<CloudShape, "about"> = "sphere";
    let startedAtMs = 0;
    let aboutBlend = 0;
    let flatBlend = 0; // 1 = flat shape (heart/smiley/about): face camera
    let noiseBlend = 1;
    let cardScaleBlend = 1;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let downX = 0;
    let downY = 0;
    // fit the cloud: never closer than 17, further on narrow (mobile) screens
    function fitZoom() {
      return Math.max(
        15,
        4.8 / (Math.tan(THREE.MathUtils.degToRad(20)) * camera.aspect)
      );
    }
    let zoomTarget = 15;
    zoomTarget = fitZoom();
    camera.position.z = zoomTarget;
    const pointerNdc = new THREE.Vector2(2, 2);
    let pointerActive = false;
    // idle attract mode: after a quiet spell the cloud inspects itself
    let lastMoveAt = performance.now();
    let nextHopAt = 0;
    let attractMode = false; // annotation-only hover: no pop, no elevation
    let hovered: Card | null = null;
    let focused: Card | null = null;
    let lastHoverId: string | null = null;

    let seenFilter = controlsRef.current.filter;
    let seenUnfocusToken = controlsRef.current.unfocusToken;
    recomputeOrdinals(seenFilter);

    // cards start already in formation, invisible until their texture lands
    {
      const v = new THREE.Vector3();
      for (const c of cards) {
        spherePos(c.ordinal, v);
        c.group.position.copy(v);
        c.group.scale.setScalar(0.0001);
      }
    }

    const raycaster = new THREE.Raycaster();

    function setHovered(next: Card | null) {
      if (next === hovered) return;
      hovered = next;
      const id = hovered ? hovered.item.id : null;
      if (id !== lastHoverId) {
        lastHoverId = id;
        callbacksRef.current.onHoverItem(
          hovered ? hovered.item : null,
          hovered ? hovered.accent : null
        );
      }
    }

    function setFocus(card: Card | null) {
      if (focused === card) return;
      focused = card;
      if (focused) loadFull(focused);
      callbacksRef.current.onFocusChange(
        focused ? focused.item : null,
        focused ? focused.accent : null
      );
    }

    const pickNdc = new THREE.Vector2();
    function pickAt(clientX: number, clientY: number): Card | null {
      const rect = container!.getBoundingClientRect();
      pickNdc.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        (-(clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(pickNdc, camera);
      for (const h of raycaster.intersectObjects(pickMeshes, false)) {
        const c = cards[h.object.userData.cardIndex as number];
        if (c.on && c.visScale > 0.5) return c;
      }
      return null;
    }

    function onPointerDown(e: PointerEvent) {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      downX = e.clientX;
      downY = e.clientY;
      container?.setPointerCapture(e.pointerId);
    }
    function onPointerMove(e: PointerEvent) {
      const rect = container!.getBoundingClientRect();
      pointerActive = true;
      lastMoveAt = performance.now();
      pointerNdc.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1
      );
      if (dragging) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        if (controlsRef.current.shape === "grid") {
          // content follows the finger 1:1; velocity carries the momentum
          const perPx = (2 * Math.tan(THREE.MathUtils.degToRad(20)) * camera.position.z) / rect.height;
          const d = -dy * perPx;
          gridScrollY += d;
          gridScrollVel = d;
        } else {
          rotVel = dx * 0.004;
        }
      }
    }
    function onPointerUp(e: PointerEvent) {
      dragging = false;
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (moved >= 5) return;
      const hit = pickAt(e.clientX, e.clientY);
      if (hit && hit !== focused) setFocus(hit);
      else setFocus(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFocus(null);
      // arrow through the cloud while a card is expanded
      if (focused && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        e.preventDefault();
        const dir = e.key === "ArrowRight" ? 1 : -1;
        const target = ((focused.ordinal + dir) % visibleCount + visibleCount) % visibleCount;
        const next = cards.find((c) => c.on && c.ordinal === target);
        if (next) setFocus(next);
      }
    }

    function onWheel(e: WheelEvent) {
      if (controlsRef.current.shape !== "grid") return;
      e.preventDefault();
      gridScrollY += e.deltaY * 0.014;
    }

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", onPointerUp);
    container.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);

    function onResize() {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
      zoomTarget = fitZoom();
    }
    window.addEventListener("resize", onResize);

    // ---- animation loop ---------------------------------------------------
    const shapeV = new THREE.Vector3();
    const tmpV = new THREE.Vector3();
    const proj = new THREE.Vector3();
    let raf = 0;
    let frameCount = 0;
    const frameRect = { x: 0, y: 0, w: 0, h: 0, init: false };
    const clock = new THREE.Clock();

    function animate() {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const time = clock.elapsedTime;
      const nowMs = performance.now();
      const controls = controlsRef.current;

      if (controls.filter !== seenFilter) {
        seenFilter = controls.filter;
        recomputeOrdinals(seenFilter, true);
        if (focused && !focused.on) setFocus(null);
      }
      if (controls.unfocusToken !== seenUnfocusToken) {
        seenUnfocusToken = controls.unfocusToken;
        setFocus(null);
      }

      // about keeps the last real layout; the formation just flies off-screen
      if (controls.shape !== "about") layoutShape = controls.shape;
      aboutBlend += ((controls.shape === "about" ? 1 : 0) - aboutBlend) * 0.11;

      const frusH = Math.tan(THREE.MathUtils.degToRad(20)) * camera.position.z;

      // chronological masonry: shortest-column packing, scroll for the rest
      if (layoutShape === "grid") {
        const gw = frusH * camera.aspect * 2 * 0.92;
        const cols = Math.max(2, Math.round(gw / 1.7));
        const colW = gw / cols;
        const cardW = colW * 0.92;
        const gap = colW * 0.08;
        const colH: number[] = new Array(cols).fill(0);
        for (const idx of gridShuffle) {
          const card = cards[idx];
          if (!card.on) continue;
          const scl = cardW / card.baseW;
          const h = card.baseH * scl;
          let c = 0;
          for (let k = 1; k < cols; k++) if (colH[k] < colH[c]) c = k;
          card.gridScale = scl;
          card.gridX = (c - (cols - 1) / 2) * colW;
          card.gridY = colH[c] + h / 2;
          colH[c] += h + gap;
        }
        gridTotalH = Math.max(...colH);
        gridTop = frusH * 0.8;
        if (!dragging) {
          gridScrollY += gridScrollVel;
          gridScrollVel *= 0.94;
        }
        const maxScroll = Math.max(0, gridTotalH - frusH * 1.55);
        gridScrollY = THREE.MathUtils.clamp(gridScrollY, 0, maxScroll);
      }

      const tune = SHAPE_TUNE[layoutShape];
      noiseBlend += (tune.noise - noiseBlend) * 0.05;
      cardScaleBlend += (tune.card - cardScaleBlend) * 0.06;

      const noiseAmp =
        (0.09 + 0.075 * (1 + Math.sin(time * 0.045 + 2))) * noiseBlend;

      // flat shapes face the camera and sway instead of spin
      const flatTarget =
        layoutShape === "heart" ||
        layoutShape === "smiley" ||
        layoutShape === "star" ||
        layoutShape === "grid"
          ? 1
          : 0;
      flatBlend += (flatTarget - flatBlend) * 0.06;

      effRot += dt * 0.07 * (1 - flatBlend);
      if (flatBlend > 0.01) {
        const nearest = Math.round(effRot / (Math.PI * 2)) * Math.PI * 2;
        effRot += (nearest - effRot) * 0.09 * flatBlend;
      }
      effRot += rotVel;
      rotVel *= 0.94;

      const sway =
        layoutShape === "heart" ||
        layoutShape === "smiley" ||
        layoutShape === "star"
          ? Math.sin(time * 0.35) * 0.15 * flatBlend
          : 0;
      const angle = effRot + sway;

      camera.position.z += (zoomTarget - camera.position.z) * 0.08;

      // in about mode the whole formation exits above the frame; the grid is
      // taller than the screen, so it must travel its full height plus margin
      const yUp =
        aboutBlend *
        (layoutShape === "grid" ? gridTotalH + frusH * 2.5 : frusH * 3.2);

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      const rect = { w: container!.clientWidth, h: container!.clientHeight };

      for (const card of cards) {
        const i = card.ordinal;

        // cards appear as their thumbnail arrives — no grey tiles — in a
        // staggered wave that blooms outward from where the flipbook was
        if (controls.started && !startedAtMs) startedAtMs = nowMs;
        const due =
          controls.started && nowMs - startedAtMs >= card.introDelay;
        const visTarget = card.on && due && card.texLoaded ? 1 : 0;
        if (visTarget > 0 && !card.introduced) {
          card.introduced = true;
          card.visScale = 1; // no scale-up: it fades in at full size
          card.group.position.multiplyScalar(0.9);
        }
        if (card.introduced) {
          card.introBlend += (1 - card.introBlend) * 0.055;
        }
        card.visScale += (visTarget - card.visScale) * 0.12;

        // filtered-out cards shrink where they stand — no drifting away
        if (card.on) {
          if (layoutShape === "grid") {
            shapeV.set(
              card.gridX,
              gridTop - card.gridY + gridScrollY,
              rand(i * 5 + 4) * 0.06
            );
          } else {
            shapePos(layoutShape, i, shapeV);
          }
          tmpV.copy(shapeV);

          // noise on x/y only — z stays layered so cards don't slice through
          tmpV.x += rand(i * 3 + 1) * noiseAmp * 6;
          tmpV.y += rand(i * 3 + 2) * noiseAmp * 6;

          const rx = tmpV.x * cos + tmpV.z * sin;
          const rz = -tmpV.x * sin + tmpV.z * cos;
          tmpV.set(rx, tmpV.y + yUp, rz);

          if (card === focused) {
            tmpV.set(0, 0.25, camera.position.z - 6);
          } else if (
            card === hovered &&
            !attractMode &&
            layoutShape === "grid"
          ) {
            // slide expanded edge cards inward so they stay fully on screen
            const exScale = Math.min(card.gridScale * 2.2, 3.4 / card.baseH, 4.6 / card.baseW);
            const hw = (card.baseW * exScale) / 2 + 0.15;
            const hh = (card.baseH * exScale) / 2 + 0.15;
            const limW = frusH * camera.aspect;
            tmpV.x = THREE.MathUtils.clamp(tmpV.x, -limW + hw, limW - hw);
            tmpV.y = THREE.MathUtils.clamp(tmpV.y, -frusH + hh, frusH - hh);
          }

          card.group.position.lerp(tmpV, card === focused ? 0.12 : 0.14);
        }

        let scaleTarget =
          layoutShape === "grid"
            ? card.gridScale
            : cardScaleBlend * (card.item.recap ? 1.35 : 1);
        if (card === focused) {
          const focusH = 2 * 6 * Math.tan(THREE.MathUtils.degToRad(20));
          const focusW = focusH * camera.aspect;
          scaleTarget = Math.min(
            (focusH * 0.62) / card.baseH,
            (focusW * 0.82) / card.baseW
          );
        } else if (card === hovered && !attractMode && layoutShape === "grid") {
          // hover blooms to ~2.2 columns, capped to a sane world size
          scaleTarget = Math.min(card.gridScale * 2.2, 3.4 / card.baseH, 4.6 / card.baseW);
        }
        card.hoverScale += (scaleTarget - card.hoverScale) * 0.12;
        const s = card.hoverScale * card.visScale;
        card.group.scale.setScalar(Math.max(0.0001, s));

        card.mat.color.copy(card.baseColor);
        card.mat.opacity = card.introBlend;
        (card.frameMesh.material as THREE.MeshBasicMaterial).opacity =
          card.introBlend;

        // painter's algorithm: nearer cards draw later; the inspected card
        // always draws on top. The sort key is smoothed so near-ties don't
        // flicker order back and forth while the cloud rotates.
        const dist = card.group.position.distanceTo(camera.position);
        card.sortDist += (dist - card.sortDist) * 0.12;
        let ro = (100 - card.sortDist) * 10;
        // recap montages carry extra weight: they surface above neighbors
        if (card.item.recap) ro += 12;
        if (card === focused || (card === hovered && !attractMode)) ro += 10000;
        card.frameMesh.renderOrder = ro;
        card.imgMesh.renderOrder = ro + 0.5;

        if (card.on && card !== focused && card.visScale > 0.5) {
          proj.copy(card.group.position).project(camera);
          if (proj.z < 1) {
            const px = (proj.x * 0.5 + 0.5) * rect.w;
            const py = (-proj.y * 0.5 + 0.5) * rect.h;
            if (px < minX) minX = px;
            if (px > maxX) maxX = px;
            if (py < minY) minY = py;
            if (py > maxY) maxY = py;
          }
        }
      }

      // ---- hover: real pointer, or idle attract mode ----
      const idle =
        controls.started &&
        controls.shape !== "about" &&
        nowMs - lastMoveAt > 2500 &&
        !dragging &&
        !focused;
      attractMode = idle;
      if (controls.shape === "about" && hovered && hovered !== focused) {
        setHovered(null);
      }
      if (idle) {
        // the cloud inspects itself: cast rays at random screen points so it
        // only annotates cards a real cursor could actually hover
        if (nowMs > nextHopAt) {
          nextHopAt = nowMs + 2200 + Math.random() * 1400;
          outer: for (let attempts = 0; attempts < 10; attempts++) {
            pickNdc.set(Math.random() * 1.3 - 0.65, Math.random() * 1.3 - 0.65);
            raycaster.setFromCamera(pickNdc, camera);
            for (const h of raycaster.intersectObjects(pickMeshes, false)) {
              const c = cards[h.object.userData.cardIndex as number];
              if (c.on && c.visScale > 0.5) {
                setHovered(c);
                break outer;
              }
              break; // only the top-most card at this point counts
            }
          }
        }
      } else if (pointerActive && controls.shape !== "about") {
        raycaster.setFromCamera(pointerNdc, camera);
        const hits = raycaster.intersectObjects(pickMeshes, false);
        let next: Card | null = null;
        for (const h of hits) {
          const c = cards[h.object.userData.cardIndex as number];
          if (c.on && c.visScale > 0.5) {
            next = c;
            break;
          }
        }
        setHovered(next);
      }
      container!.style.cursor = dragging
        ? "grabbing"
        : hovered
          ? "pointer"
          : "grab";

      // ambient pool: keep a few videos playing inside the shape, swapping
      // one slot at a time so bandwidth stays sane
      if (controls.started && controls.shape !== "about" && nowMs > nextAmbientAt) {
        nextAmbientAt = nowMs + (ambient.length < AMBIENT_N ? 900 : 6000);
        // drop slots whose card left the stage
        for (const slot of [...ambient]) {
          if (!slot.card.on || slot.card.visScale < 0.5) stopAmbient(slot);
        }
        if (ambient.length >= AMBIENT_N && ambient.length > 0) {
          stopAmbient(ambient[0]);
        }
        const candidates = cards.filter(
          (c) =>
            c.item.videoUrl &&
            c.on &&
            c.visScale > 0.5 &&
            c.texLoaded &&
            c !== focused &&
            c !== videoCard &&
            !isAmbient(c) &&
            c.group.position.z > 0.5
        );
        if (candidates.length) {
          const recaps = candidates.filter((c) => c.item.recap);
          const pool =
            recaps.length && Math.random() < 0.45 ? recaps : candidates;
          startAmbient(pool[Math.floor(Math.random() * pool.length)]);
        }
      } else if (controls.shape === "about" && ambient.length) {
        for (const slot of [...ambient]) stopAmbient(slot);
      }

      // inline video: focused card wins, else the hovered one
      const videoTarget =
        focused?.item.videoUrl != null
          ? focused
          : hovered?.item.videoUrl != null
            ? hovered
            : null;
      if (videoTarget !== videoCard) {
        if (videoTarget) playVideo(videoTarget);
        else stopVideo();
      }

      // ---- annotation frame: cloud bounds, or snapped to hovered/focused card
      frameCount++;
      const bbox = bboxRef.current;
      const target = focused ?? hovered;
      let tx: number, ty: number, tw: number, th: number;
      if (target) {
        const hw = (target.baseW / 2) * target.group.scale.x;
        const hh = (target.baseH / 2) * target.group.scale.y;
        const p = target.group.position;
        proj.set(p.x - hw, p.y + hh, p.z).project(camera);
        const x1 = (proj.x * 0.5 + 0.5) * rect.w;
        const y1 = (-proj.y * 0.5 + 0.5) * rect.h;
        proj.set(p.x + hw, p.y - hh, p.z).project(camera);
        const x2 = (proj.x * 0.5 + 0.5) * rect.w;
        const y2 = (-proj.y * 0.5 + 0.5) * rect.h;
        tx = x1 - 10;
        ty = y1 - 10;
        tw = x2 - x1 + 20;
        th = y2 - y1 + 20;
      } else if (isFinite(minX)) {
        const pad = 46;
        tx = Math.max(34, minX - pad);
        ty = Math.max(96, minY - pad);
        tw = Math.min(rect.w - 34, maxX + pad) - tx;
        th = Math.min(rect.h - 34, maxY + pad) - ty;
      } else {
        tx = frameRect.x;
        ty = frameRect.y;
        tw = frameRect.w;
        th = frameRect.h;
      }
      if (!frameRect.init) {
        Object.assign(frameRect, { x: tx, y: ty, w: tw, h: th, init: true });
      } else {
        const k = 0.22;
        frameRect.x += (tx - frameRect.x) * k;
        frameRect.y += (ty - frameRect.y) * k;
        frameRect.w += (tw - frameRect.w) * k;
        frameRect.h += (th - frameRect.h) * k;
      }
      if (bbox) {
        // in about mode the story is the content — only card boxes, no master frame
        bbox.style.opacity =
          !controls.started ||
          ((controls.shape === "about" || controls.shape === "grid") && !target)
            ? "0"
            : "1";
        bbox.dataset.mode = focused ? "focus" : hovered ? "card" : "cloud";
        bbox.style.borderColor = target ? target.accent : "";
        bbox.style.transform = `translate(${frameRect.x.toFixed(1)}px, ${frameRect.y.toFixed(1)}px)`;
        bbox.style.width = `${Math.max(0, frameRect.w).toFixed(1)}px`;
        bbox.style.height = `${Math.max(0, frameRect.h).toFixed(1)}px`;

        if (frameCount % 5 === 0) {
          const deg = ((THREE.MathUtils.radToDeg(effRot) % 360) + 360) % 360;
          const set = (k: string, v: string) => {
            const el = chipRefs.current[k];
            if (el && el.textContent !== v) el.textContent = v;
          };
          set("rotate", `rotate~ ${deg.toFixed(1)}`);
          set("noise", `noise~ ${noiseAmp.toFixed(2)}`);
          set("zoom", `zoom~ ${camera.position.z.toFixed(1)}`);
          set("shape", `shape~ ${controls.shape} ${visibleCount}`);
          set("depth", `depth~ 0.035`);
        }
      }

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      disposed = true;
      clearTimeout(readyTimeout);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("wheel", onWheel);
      for (const slot of [...ambient]) stopAmbient(slot);
      stopVideo();
      textures.forEach((t) => t.dispose());
      fullTextures.forEach((t) => t.dispose());
      cards.forEach((c) => {
        c.mat.dispose();
        (c.frameMesh.material as THREE.Material).dispose();
      });
      geo.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const chip =
    "cloud-value-chip pointer-events-none absolute whitespace-nowrap px-1.5 py-0.5 font-mono text-[10px] leading-tight text-white";

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 touch-none select-none overflow-hidden"
      style={{ "--cvframe": frameColor } as CSSProperties}
    >
      <style jsx global>{`
        .cloud-value-chip {
          transition: opacity 180ms ease, background 300ms ease;
          background: var(--cvframe);
        }
        .cloud-bbox {
          border: 1px solid var(--cvframe);
          transition: border-color 300ms ease, opacity 300ms ease;
        }
        .cloud-bbox[data-mode="card"] .cloud-value-chip,
        .cloud-bbox[data-mode="focus"] .cloud-value-chip {
          opacity: 0;
        }
        /* header rides the top edge; card mode: tag flush left, its bottom
           sitting exactly on the frame's top line */
        .cloud-frame-label {
          left: 6rem;
          transform: translateY(-50%);
        }
        .cloud-bbox[data-mode="card"] .cloud-frame-label,
        .cloud-bbox[data-mode="focus"] .cloud-frame-label {
          left: -1px;
          transform: translateY(-100%);
        }
        /* caption tag hangs under the bottom-right corner */
        .cloud-frame-caption {
          right: -1px;
          top: 100%;
        }
      `}</style>

      {/* annotation frame: tracks the cloud, snaps to hovered/focused card */}
      <div ref={bboxRef} className="cloud-bbox pointer-events-none absolute left-0 top-0">
        <div className="cloud-frame-label pointer-events-auto absolute top-0">
          {frameLabel}
        </div>
        <div className="cloud-frame-caption pointer-events-none absolute">
          {frameCaption}
        </div>
        <span
          ref={(el) => {
            chipRefs.current["rotate"] = el;
          }}
          className={`${chip} left-0 top-0 -translate-x-1/3 -translate-y-1/2`}
        />
        <span
          ref={(el) => {
            chipRefs.current["noise"] = el;
          }}
          className={`${chip} right-0 top-0 -translate-y-1/2 translate-x-1/3`}
        />
        <span
          ref={(el) => {
            chipRefs.current["zoom"] = el;
          }}
          className={`${chip} bottom-0 left-0 -translate-x-1/3 translate-y-1/2`}
        />
        <span
          ref={(el) => {
            chipRefs.current["shape"] = el;
          }}
          className={`${chip} bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2`}
        />
        <span
          ref={(el) => {
            chipRefs.current["depth"] = el;
          }}
          className={`${chip} bottom-0 right-0 translate-x-1/3 translate-y-1/2`}
        />
      </div>
    </div>
  );
}
