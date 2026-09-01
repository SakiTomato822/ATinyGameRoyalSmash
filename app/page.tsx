"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import * as CANNON from "cannon-es";

type Result = "clear" | "failed" | null;

type HudState = {
  level: number;
  score: number;
  shots: number;
  remaining: number;
  combo: number;
  undosLeft: number;
  canUndo: boolean;
};

type VectorSnapshot = [number, number, number];
type QuaternionSnapshot = [number, number, number, number];

type TargetSnapshot = {
  position: VectorSnapshot;
  quaternion: QuaternionSnapshot;
  velocity: VectorSnapshot;
  angularVelocity: VectorSnapshot;
  counted: boolean;
  removed: boolean;
};

type GameSnapshot = {
  version: 2;
  savedAt: number;
  level: number;
  levelSeed: number;
  score: number;
  levelStartScore: number;
  shots: number;
  combo: number;
  undosLeft: number;
  aim: [number, number];
  result: Result;
  guideSeen: boolean;
  soundEnabled: boolean;
  targets: TargetSnapshot[];
};

type TargetKind = "can" | "block" | "beam";

type TargetPlacement = {
  x: number;
  y: number;
  z: number;
  colorIndex: number;
  kind: TargetKind;
  width?: number;
  height?: number;
};

type PhysicsTarget = {
  mesh: THREE.Group;
  body: CANNON.Body;
  counted: boolean;
  removed: boolean;
  colorIndex: number;
  kind: TargetKind;
};

type Projectile = {
  mesh: THREE.Mesh;
  body: CANNON.Body;
  bornAt: number;
};

const COLORS = [
  { name: "海湾蓝", body: 0x2587ef, dark: 0x104cac, light: 0x91ddff },
  { name: "珊瑚红", body: 0xf1495b, dark: 0xa81e3e, light: 0xffa292 },
  { name: "向日黄", body: 0xffb632, dark: 0xc86b13, light: 0xffe589 },
];

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createRandomSeed() {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint32Array(1))[0] || 1;
  }
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}

function generateLevelLayout(level: number, levelSeed: number): TargetPlacement[] {
  const random = seededRandom((level * 982451653 + levelSeed) >>> 0);
  const items: TargetPlacement[] = [];
  const unit = 0.9;
  const rowHeight = 0.86;
  const color = () => Math.floor(random() * COLORS.length);
  const add = (x: number, rowIndex: number, kind: TargetKind = "can", width?: number, height?: number, z = 0) => {
    items.push({ x, y: rowIndex * rowHeight, z, colorIndex: color(), kind, width, height });
  };
  const row = (count: number, rowIndex: number, offset = 0, kindChance = 0.16) => {
    const start = -((count - 1) * unit) / 2 + offset;
    for (let index = 0; index < count; index += 1) {
      add(start + index * unit, rowIndex, random() < kindChance ? "block" : "can", undefined, undefined, (index % 2 ? 1 : -1) * 0.025);
    }
  };
  const tower = (x: number, height: number, startRow = 0, blockChance = 0.18) => {
    for (let index = 0; index < height; index += 1) add(x, startRow + index, random() < blockChance ? "block" : "can");
  };
  const beam = (x: number, rowIndex: number, width: number) => add(x, rowIndex, "beam", width, 0.5);
  const variant = Math.floor(random() * 16);

  switch (variant) {
    case 0: {
      const base = 5 + Math.floor(random() * 3);
      for (let y = 0; y < Math.min(6, base - 1); y += 1) row(base - y, y, y % 2 ? 0.05 : -0.05);
      break;
    }
    case 1: {
      const height = 3 + Math.floor(random() * 2);
      const span = 1.35 + random() * 0.22;
      tower(-span, height);
      tower(span, height);
      beam(0, height - 0.2, span * 2 + 0.9);
      tower(0, 2, height + 0.4);
      break;
    }
    case 2: {
      const height = 3 + Math.floor(random() * 2);
      [-2.7, 0, 2.7].forEach((x) => tower(x, height));
      beam(-1.35, height - 0.2, 3.55);
      beam(1.35, height - 0.2, 3.55);
      row(5, height + 0.4);
      break;
    }
    case 3: {
      [-3.15, -2.25, 2.25, 3.15].forEach((x) => tower(x, 4));
      [-1.1, 1.1].forEach((x) => tower(x, 2));
      beam(0, 1.8, 3.3);
      row(3, 2.4);
      beam(-2.7, 3.8, 2.15);
      beam(2.7, 3.8, 2.15);
      add(-3.15, 4.35);
      add(3.15, 4.35);
      break;
    }
    case 4: {
      [1, 2, 3, 4, 5, 4, 3, 2, 1].forEach((height, index) => tower((index - 4) * unit, height));
      break;
    }
    case 5: {
      [3, 5, 7, 5, 3].forEach((count, index) => row(count, index, index >= 3 ? 0.03 : 0));
      add(0, 5);
      break;
    }
    case 6: {
      row(7, 0);
      [-2.7, -0.9, 0.9, 2.7].forEach((x) => tower(x, 3, 1));
      beam(-1.8, 3.8, 2.65);
      beam(1.8, 3.8, 2.65);
      row(7, 4.4);
      break;
    }
    case 7: {
      const count = 7 + Math.floor(random() * 3);
      for (let index = 0; index < count; index += 1) tower((index - (count - 1) / 2) * unit, 1 + Math.floor(random() * 6), 0, 0.26);
      break;
    }
    case 8: {
      tower(-3.15, 2);
      tower(-1.35, 3);
      tower(0.45, 4);
      tower(2.25, 5);
      beam(-2.25, 1.8, 2.65);
      beam(-0.45, 2.8, 2.65);
      beam(1.35, 3.8, 2.65);
      add(2.25, 5.2);
      break;
    }
    case 9: {
      tower(-2.25, 4);
      tower(2.25, 4);
      beam(0, 3.8, 5.4);
      row(5, 4.35);
      row(4, 5.35);
      row(3, 6.35);
      break;
    }
    case 10: {
      [-3.6, -1.2, 1.2, 3.6].forEach((x) => tower(x, 3));
      [-2.4, 0, 2.4].forEach((x) => beam(x, 2.8, 3.2));
      [-2.4, 0, 2.4].forEach((x) => add(x, 3.35));
      break;
    }
    case 11: {
      row(9, 0, 0, 0.32);
      row(9, 1, 0, 0.32);
      [-3.6, -2.7, 0, 2.7, 3.6].forEach((x) => tower(x, 3, 2, 0.42));
      beam(-1.35, 2.8, 2.7);
      beam(1.35, 2.8, 2.7);
      break;
    }
    case 12: {
      [7, 5, 3, 1].forEach((count, index) => row(count, index));
      tower(-3.15, 4);
      tower(3.15, 4);
      beam(0, 4.2, 7.1);
      add(0, 4.75, "block");
      break;
    }
    case 13: {
      [7, 5, 3, 2, 3, 5].forEach((count, index) => row(count, index, index % 2 ? 0.04 : -0.04));
      break;
    }
    case 14: {
      tower(-3.15, 5);
      tower(3.15, 5);
      tower(-1.05, 2);
      tower(1.05, 2);
      beam(0, 1.8, 7.35);
      [-2.1, 0, 2.1].forEach((x) => add(x, 2.35));
      beam(0, 3.15, 5.4);
      break;
    }
    default: {
      row(8, 0, 0, 0.5);
      [-3.15, -1.05, 1.05, 3.15].forEach((x, index) => tower(x, 2 + (index % 2), 1, 0.55));
      beam(-2.1, 3.7, 2.8);
      beam(2.1, 3.7, 2.8);
      row(5, 4.25, random() * 0.18 - 0.09, 0.45);
    }
  }
  return items;
}

function createCanMesh(colorIndex: number, kind: TargetKind, width = 0.82, height = 0.82) {
  const palette = COLORS[colorIndex];
  const group = new THREE.Group();

  if (kind === "block" || kind === "beam") {
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, 0.82, Math.max(2, Math.ceil(width * 2)), 2, 2),
      new THREE.MeshStandardMaterial({ color: 0x8799a7, roughness: 0.32, metalness: 0.46 }),
    );
    block.castShadow = true;
    block.receiveShadow = true;
    group.add(block);

    const belt = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.04, Math.min(0.15, height * 0.28), 0.86),
      new THREE.MeshStandardMaterial({ color: palette.body, roughness: 0.28, metalness: 0.2 }),
    );
    belt.castShadow = true;
    group.add(belt);
    return group;
  }

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: palette.body,
    roughness: 0.22,
    metalness: 0.28,
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.82, 28), bodyMaterial);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const centerBand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.438, 0.438, 0.14, 28),
    new THREE.MeshStandardMaterial({ color: palette.dark, roughness: 0.3, metalness: 0.22 }),
  );
  centerBand.castShadow = true;
  group.add(centerBand);

  const metal = new THREE.MeshStandardMaterial({ color: 0xf4f8ff, roughness: 0.16, metalness: 0.82 });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.455, 0.455, 0.08, 28), metal);
  top.position.y = 0.43;
  top.castShadow = true;
  group.add(top);
  const bottom = top.clone();
  bottom.position.y = -0.43;
  group.add(bottom);

  const highlight = new THREE.Mesh(
    new THREE.BoxGeometry(0.055, 0.52, 0.018),
    new THREE.MeshBasicMaterial({ color: palette.light, transparent: true, opacity: 0.72 }),
  );
  highlight.position.set(-0.19, 0.06, 0.42);
  group.add(highlight);
  return group;
}

export default function Home() {
  const mountRef = useRef<HTMLDivElement>(null);
  const restartRef = useRef<() => void>(() => undefined);
  const nextLevelRef = useRef<() => void>(() => undefined);
  const undoRef = useRef<() => void>(() => undefined);
  const skipProjectileRef = useRef<() => void>(() => undefined);
  const soundToggleRef = useRef<(enabled: boolean) => void>(() => undefined);
  const [hud, setHud] = useState<HudState>({ level: 1, score: 0, shots: 12, remaining: 14, combo: 0, undosLeft: 3, canUndo: false });
  const [result, setResult] = useState<Result>(null);
  const [ready, setReady] = useState(false);
  const [guide, setGuide] = useState(true);
  const [error, setError] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [canSkipProjectile, setCanSkipProjectile] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let animationFrame = 0;
    let level = 1;
    let levelSeed = createRandomSeed();
    let score = 0;
    let levelStartScore = 0;
    let shots = 12;
    let combo = 0;
    let undosLeft = 3;
    let canFire = true;
    let gameEnded = false;
    let currentResult: Result = null;
    let guideSeen = false;
    let preShotSnapshot: GameSnapshot | null = null;
    let dragging = false;
    let lastTime = performance.now();
    let lastHudAt = 0;
    let recoil = 0;
    let activeProjectile: Projectile | null = null;
    let skipOffered = false;
    let audioContext: AudioContext | null = null;
    let soundEnabled = true;
    let lastImpactSoundAt = 0;
    let lastFallSoundAt = 0;
    const targets: PhysicsTarget[] = [];

    const triggerHaptic = (event: "launch" | "impact" | "fall" | "clear" | "fail", intensity = 0.7) => {
      const safeIntensity = THREE.MathUtils.clamp(intensity, 0.1, 1);
      const bridge = (window as Window & { AndroidHaptics?: { pulse?: (eventName: string, strength: number) => void } }).AndroidHaptics;
      if (bridge?.pulse) {
        bridge.pulse(event, Math.round(safeIntensity * 100));
        return;
      }
      if (!navigator.vibrate) return;
      const patterns: Record<typeof event, number | number[]> = {
        launch: 24,
        impact: Math.round(12 + safeIntensity * 24),
        fall: 14,
        clear: [28, 42, 45, 35, 70],
        fail: [70, 45, 85],
      };
      navigator.vibrate(patterns[event]);
    };

    const ensureAudio = () => {
      if (!soundEnabled) return null;
      const AudioContextConstructor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextConstructor) return null;
      if (!audioContext) audioContext = new AudioContextConstructor();
      if (audioContext.state === "suspended") void audioContext.resume();
      return audioContext;
    };

    const playTone = (startFrequency: number, endFrequency: number, duration: number, volume: number, type: OscillatorType = "sine", delay = 0) => {
      const context = ensureAudio();
      if (!context) return;
      const startAt = context.currentTime + delay;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(Math.max(20, startFrequency), startAt);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), startAt + duration);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + duration + 0.02);
    };

    const playNoise = (duration: number, volume: number, frequency: number) => {
      const context = ensureAudio();
      if (!context) return;
      const frameCount = Math.max(1, Math.floor(context.sampleRate * duration));
      const buffer = context.createBuffer(1, frameCount, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < frameCount; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / frameCount);
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      filter.type = "bandpass";
      filter.frequency.value = frequency;
      filter.Q.value = 0.7;
      gain.gain.setValueAtTime(volume, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
      source.buffer = buffer;
      source.connect(filter).connect(gain).connect(context.destination);
      source.start();
    };

    const playShotSound = () => {
      triggerHaptic("launch", 0.76);
      playTone(210, 58, 0.2, 0.12, "sawtooth");
      playTone(760, 190, 0.09, 0.055, "triangle");
      playNoise(0.08, 0.045, 680);
    };
    const playImpactSound = (strength: number) => {
      const now = performance.now();
      if (now - lastImpactSoundAt < 58) return;
      lastImpactSoundAt = now;
      const force = Math.min(1, Math.max(0.15, strength / 14));
      triggerHaptic("impact", force);
      playTone(170 + force * 95, 75, 0.075 + force * 0.035, 0.035 + force * 0.07, "square");
      playNoise(0.055 + force * 0.04, 0.018 + force * 0.04, 520 + force * 650);
    };
    const playFallSound = (chain: number) => {
      const now = performance.now();
      if (now - lastFallSoundAt < 70) return;
      lastFallSoundAt = now;
      const pitch = 360 + Math.min(chain, 7) * 52;
      triggerHaptic("fall", Math.min(1, 0.42 + chain * 0.08));
      playTone(pitch, pitch * 1.22, 0.11, 0.052, "sine");
    };
    const playClearSound = () => {
      triggerHaptic("clear", 1);
      playTone(392, 392, 0.15, 0.06, "triangle");
      playTone(523, 523, 0.18, 0.065, "triangle", 0.11);
      playTone(659, 784, 0.28, 0.075, "triangle", 0.24);
    };
    const playFailSound = () => {
      triggerHaptic("fail", 0.72);
      playTone(245, 150, 0.32, 0.06, "triangle");
    };

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    } catch {
      queueMicrotask(() => setError(true));
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = "webgl-canvas";
    renderer.domElement.setAttribute("aria-label", "3D 炮弹物理游戏，拖动瞄准后松开发射");
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x89d8ff);
    scene.fog = new THREE.Fog(0xb8eaff, 16, 34);

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    camera.position.set(0, 6.6, 14.8);
    camera.lookAt(0, 2.45, 0);

    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
    world.allowSleep = true;
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.solver.iterations = 14;
    world.defaultContactMaterial.friction = 0.42;
    world.defaultContactMaterial.restitution = 0.12;

    const canMaterial = new CANNON.Material("can");
    const ballMaterial = new CANNON.Material("ball");
    const platformMaterial = new CANNON.Material("platform");
    world.addContactMaterial(new CANNON.ContactMaterial(ballMaterial, canMaterial, { friction: 0.28, restitution: 0.36 }));
    world.addContactMaterial(new CANNON.ContactMaterial(canMaterial, platformMaterial, { friction: 0.58, restitution: 0.05 }));

    const hemisphere = new THREE.HemisphereLight(0xdff7ff, 0x4c8e49, 2.15);
    scene.add(hemisphere);
    const sun = new THREE.DirectionalLight(0xfff4d3, 3.1);
    sun.position.set(-5, 11, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -10;
    sun.shadow.camera.right = 10;
    sun.shadow.camera.top = 13;
    sun.shadow.camera.bottom = -5;
    sun.shadow.bias = -0.0008;
    scene.add(sun);

    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x68bd61, roughness: 0.94 });
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(42, 42),
      floorMaterial,
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.4;
    floor.receiveShadow = true;
    scene.add(floor);

    const hillMaterial = new THREE.MeshStandardMaterial({ color: 0x88d374, roughness: 0.92 });
    for (const [x, z, scale] of [[-8, -7, 5], [8, -9, 6], [0, -13, 7]] as const) {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(scale, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), hillMaterial);
      hill.position.set(x, -2.45, z);
      hill.scale.y = 0.42;
      hill.receiveShadow = true;
      scene.add(hill);
    }

    const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
    const applySceneTheme = (dark: boolean) => {
      scene.background = new THREE.Color(dark ? 0x102638 : 0x89d8ff);
      if (scene.fog) scene.fog.color.setHex(dark ? 0x18384b : 0xb8eaff);
      floorMaterial.color.setHex(dark ? 0x254f3b : 0x68bd61);
      hillMaterial.color.setHex(dark ? 0x315d46 : 0x88d374);
      hemisphere.color.setHex(dark ? 0x8ebde0 : 0xdff7ff);
      hemisphere.groundColor.setHex(dark ? 0x183626 : 0x4c8e49);
      hemisphere.intensity = dark ? 1.45 : 2.15;
      sun.color.setHex(dark ? 0xbfd8ff : 0xfff4d3);
      sun.intensity = dark ? 2.25 : 3.1;
      renderer.toneMappingExposure = dark ? 0.9 : 1.08;
    };
    const onColorSchemeChange = (event: MediaQueryListEvent) => applySceneTheme(event.matches);
    colorScheme.addEventListener("change", onColorSchemeChange);
    applySceneTheme(colorScheme.matches);

    const platformMesh = new THREE.Mesh(
      new THREE.BoxGeometry(8.6, 0.26, 1.7),
      new THREE.MeshStandardMaterial({ color: 0x6c36dd, roughness: 0.24, metalness: 0.12 }),
    );
    platformMesh.position.set(0, 1.24, 0);
    platformMesh.castShadow = true;
    platformMesh.receiveShadow = true;
    scene.add(platformMesh);
    const platformBody = new CANNON.Body({ mass: 0, material: platformMaterial, shape: new CANNON.Box(new CANNON.Vec3(4.3, 0.13, 0.85)) });
    platformBody.position.set(0, 1.24, 0);
    world.addBody(platformBody);

    const support = new THREE.Group();
    const supportStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.42, 2.45, 24),
      new THREE.MeshStandardMaterial({ color: 0xf2a43b, roughness: 0.32, metalness: 0.08 }),
    );
    supportStem.position.y = 0.1;
    supportStem.castShadow = true;
    support.add(supportStem);
    const supportBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.02, 1.18, 0.42, 28),
      new THREE.MeshStandardMaterial({ color: 0x7540d4, roughness: 0.28, metalness: 0.12 }),
    );
    supportBase.position.y = -1.12;
    supportBase.castShadow = true;
    support.add(supportBase);
    support.position.y = 0.05;
    scene.add(support);

    const cannonRoot = new THREE.Group();
    const cannonBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.35, 0.42, 28),
      new THREE.MeshStandardMaterial({ color: 0x7540d6, roughness: 0.25, metalness: 0.13 }),
    );
    cannonBase.position.set(0, -0.2, 0);
    cannonBase.castShadow = true;
    cannonRoot.add(cannonBase);
    const goldBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.83, 1.0, 0.34, 28),
      new THREE.MeshStandardMaterial({ color: 0xf3ad35, roughness: 0.24, metalness: 0.18 }),
    );
    goldBase.position.y = 0.08;
    goldBase.castShadow = true;
    cannonRoot.add(goldBase);
    cannonRoot.position.set(0, 0.06, 6.1);
    scene.add(cannonRoot);

    const barrelPivot = new THREE.Group();
    const barrelMaterial = new THREE.MeshStandardMaterial({ color: 0xd82f48, roughness: 0.22, metalness: 0.18 });
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.58, 2.25, 28), barrelMaterial);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.x = 0.84;
    barrel.castShadow = true;
    barrelPivot.add(barrel);
    const muzzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.53, 0.53, 0.46, 28),
      new THREE.MeshStandardMaterial({ color: 0x2458cc, roughness: 0.2, metalness: 0.2 }),
    );
    muzzle.rotation.z = Math.PI / 2;
    muzzle.position.x = 1.83;
    muzzle.castShadow = true;
    barrelPivot.add(muzzle);
    const rearBand = new THREE.Mesh(
      new THREE.TorusGeometry(0.56, 0.11, 10, 28),
      new THREE.MeshStandardMaterial({ color: 0xf2b638, roughness: 0.2, metalness: 0.24 }),
    );
    rearBand.rotation.y = Math.PI / 2;
    rearBand.position.x = -0.15;
    barrelPivot.add(rearBand);
    barrelPivot.position.set(0, 0.52, 6.1);
    scene.add(barrelPivot);

    const aimDots: THREE.Mesh[] = [];
    const aimMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.86 });
    for (let i = 0; i < 14; i += 1) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.048 + i * 0.002, 10, 8), aimMaterial);
      scene.add(dot);
      aimDots.push(dot);
    }
    const reticleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, depthTest: false });
    const aimReticle = new THREE.Mesh(new THREE.RingGeometry(0.14, 0.21, 28), reticleMaterial);
    aimReticle.renderOrder = 6;
    scene.add(aimReticle);

    const aimDirection = new THREE.Vector3(0, 0.25, -1).normalize();
    const launchVelocity = new THREE.Vector3(0, 6.2, -13.7);
    const cannonOrigin = new THREE.Vector3(0, 0.52, 6.1);
    const muzzleWorld = new THREE.Vector3();
    const raycaster = new THREE.Raycaster();
    const aimPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const targetPoint = new THREE.Vector3(0, 3.4, 0);
    const xAxis = new THREE.Vector3(1, 0, 0);
    const horizontalLaunchSpeed = 13.5;
    let flightTime = 0.6;

    const syncHud = (force = false) => {
      const now = performance.now();
      if (!force && now - lastHudAt < 90) return;
      lastHudAt = now;
      const remaining = targets.filter((target) => !target.counted).length;
      setHud({ level, score, shots, remaining, combo, undosLeft, canUndo: Boolean(preShotSnapshot) && undosLeft > 0 });
    };

    const updateCannon = () => {
      barrelPivot.quaternion.setFromUnitVectors(xAxis, aimDirection);
      barrelPivot.position.copy(cannonOrigin).addScaledVector(aimDirection, -recoil);
      muzzleWorld.copy(cannonOrigin).addScaledVector(aimDirection, 2.12 - recoil);
      for (let i = 0; i < aimDots.length; i += 1) {
        const t = flightTime * ((i + 1) / (aimDots.length + 1));
        aimDots[i].position.copy(muzzleWorld).addScaledVector(launchVelocity, t);
        aimDots[i].position.y += 0.5 * world.gravity.y * t * t;
        aimDots[i].visible = canFire && !gameEnded;
      }
      aimReticle.position.copy(targetPoint);
      aimReticle.quaternion.copy(camera.quaternion);
      aimReticle.visible = canFire && !gameEnded;
    };

    const solveBallisticAim = () => {
      aimDirection.copy(targetPoint).sub(cannonOrigin).normalize();
      for (let iteration = 0; iteration < 4; iteration += 1) {
        muzzleWorld.copy(cannonOrigin).addScaledVector(aimDirection, 2.12);
        const dx = targetPoint.x - muzzleWorld.x;
        const dz = targetPoint.z - muzzleWorld.z;
        const horizontalDistance = Math.max(0.35, Math.hypot(dx, dz));
        flightTime = horizontalDistance / horizontalLaunchSpeed;
        const verticalVelocity = (targetPoint.y - muzzleWorld.y - 0.5 * world.gravity.y * flightTime * flightTime) / flightTime;
        launchVelocity.set(
          (dx / horizontalDistance) * horizontalLaunchSpeed,
          verticalVelocity,
          (dz / horizontalDistance) * horizontalLaunchSpeed,
        );
        aimDirection.copy(launchVelocity).normalize();
      }
      updateCannon();
    };

    const removeProjectile = (saveAfter = true) => {
      if (!activeProjectile) return;
      world.removeBody(activeProjectile.body);
      scene.remove(activeProjectile.mesh);
      activeProjectile.mesh.geometry.dispose();
      (activeProjectile.mesh.material as THREE.Material).dispose();
      activeProjectile = null;
      skipOffered = false;
      setCanSkipProjectile(false);
      if (!gameEnded) canFire = shots > 0;
      if (saveAfter) persistCurrentState();
    };

    const clearTargets = () => {
      for (const target of targets) {
        world.removeBody(target.body);
        scene.remove(target.mesh);
      }
      targets.length = 0;
    };

    const createTarget = (placement: TargetPlacement, index: number) => {
      const width = placement.width ?? 0.82;
      const height = placement.height ?? 0.82;
      const mesh = createCanMesh(placement.colorIndex, placement.kind, width, height);
      mesh.position.set(placement.x, 1.81 + placement.y, placement.z);
      mesh.rotation.y = ((placement.x * 17 + index * 7) % 5) * 0.009;
      scene.add(mesh);

      const baseMass = placement.kind === "can" ? 0.58 : placement.kind === "beam" ? 0.72 * (width / 0.82) : 0.82;
      const body = new CANNON.Body({ mass: baseMass, material: canMaterial });
      body.addShape(new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, 0.41)));
      body.position.set(mesh.position.x, mesh.position.y, mesh.position.z);
      body.quaternion.setFromEuler(0, mesh.rotation.y, 0);
      body.linearDamping = 0.018;
      body.angularDamping = 0.075;
      body.allowSleep = true;
      body.sleepSpeedLimit = 0.08;
      body.sleepTimeLimit = 0.7;
      world.addBody(body);
      targets.push({ mesh, body, counted: false, removed: false, colorIndex: placement.colorIndex, kind: placement.kind });
    };

    const vectorSnapshot = (value: CANNON.Vec3): VectorSnapshot => [value.x, value.y, value.z];
    const quaternionSnapshot = (value: CANNON.Quaternion): QuaternionSnapshot => [value.x, value.y, value.z, value.w];
    const captureSnapshot = (): GameSnapshot => ({
      version: 2,
      savedAt: Date.now(),
      level,
      levelSeed,
      score,
      levelStartScore,
      shots,
      combo,
      undosLeft,
      aim: [targetPoint.x, targetPoint.y],
      result: currentResult,
      guideSeen,
      soundEnabled,
      targets: targets.map((target) => ({
        position: vectorSnapshot(target.body.position),
        quaternion: quaternionSnapshot(target.body.quaternion),
        velocity: vectorSnapshot(target.body.velocity),
        angularVelocity: vectorSnapshot(target.body.angularVelocity),
        counted: target.counted,
        removed: target.removed,
      })),
    });

    const persistSnapshot = (snapshot: GameSnapshot) => {
      try {
        localStorage.setItem("royal-smash-save-v2", JSON.stringify({
          ...snapshot,
          savedAt: Date.now(),
          guideSeen,
          soundEnabled,
        }));
      } catch {
        // The game remains playable when private browsing blocks storage.
      }
    };

    const persistCurrentState = () => {
      if (activeProjectile && preShotSnapshot) persistSnapshot(preShotSnapshot);
      else persistSnapshot(captureSnapshot());
    };

    const readSavedState = (): GameSnapshot | null => {
      try {
        const parsed = JSON.parse(localStorage.getItem("royal-smash-save-v2") ?? "null") as Partial<GameSnapshot> | null;
        if (!parsed || parsed.version !== 2 || !Array.isArray(parsed.targets) || !Number.isFinite(parsed.levelSeed)) return null;
        return parsed as GameSnapshot;
      } catch {
        return null;
      }
    };

    const restoreSnapshot = (snapshot: GameSnapshot) => {
      if (snapshot.targets.length !== targets.length) return false;
      removeProjectile(false);
      level = Math.max(1, snapshot.level);
      levelSeed = snapshot.levelSeed >>> 0;
      score = Math.max(0, snapshot.score);
      levelStartScore = Math.max(0, snapshot.levelStartScore);
      shots = Math.max(0, snapshot.shots);
      combo = Math.max(0, snapshot.combo);
      undosLeft = THREE.MathUtils.clamp(snapshot.undosLeft, 0, 3);
      targetPoint.set(THREE.MathUtils.clamp(snapshot.aim[0], -4.3, 4.3), THREE.MathUtils.clamp(snapshot.aim[1], 1.84, 7.4), 0);
      currentResult = snapshot.result ?? null;
      gameEnded = Boolean(currentResult);
      canFire = !gameEnded && shots > 0;
      guideSeen = Boolean(snapshot.guideSeen);
      soundEnabled = snapshot.soundEnabled !== false;
      setSoundOn(soundEnabled);
      setGuide(!guideSeen);
      setResult(currentResult);
      preShotSnapshot = null;

      snapshot.targets.forEach((state, index) => {
        const target = targets[index];
        if (target.removed && !state.removed) {
          world.addBody(target.body);
          scene.add(target.mesh);
        } else if (!target.removed && state.removed) {
          world.removeBody(target.body);
          scene.remove(target.mesh);
        }
        target.body.position.set(...state.position);
        target.body.quaternion.set(...state.quaternion);
        target.body.velocity.set(...state.velocity);
        target.body.angularVelocity.set(...state.angularVelocity);
        target.body.wakeUp();
        target.mesh.position.set(...state.position);
        target.mesh.quaternion.set(...state.quaternion);
        target.counted = state.counted;
        target.removed = state.removed;
      });
      solveBallisticAim();
      syncHud(true);
      return true;
    };

    const buildLevel = (nextLevel: number, resetScore: boolean, nextSeed = resetScore ? levelSeed : createRandomSeed(), saveAfter = true) => {
      removeProjectile(false);
      clearTargets();
      level = nextLevel;
      levelSeed = nextSeed >>> 0;
      if (resetScore) score = levelStartScore;
      else levelStartScore = score;
      const layout = generateLevelLayout(level, levelSeed);
      shots = Math.max(10, Math.ceil(layout.length * 0.54) + 3);
      combo = 0;
      undosLeft = 3;
      preShotSnapshot = null;
      canFire = true;
      gameEnded = false;
      currentResult = null;
      setResult(null);
      layout.forEach(createTarget);
      syncHud(true);
      if (saveAfter) persistCurrentState();
    };

    const updateAimFromPointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      if (raycaster.ray.intersectPlane(aimPlane, targetPoint)) {
        targetPoint.x = THREE.MathUtils.clamp(targetPoint.x, -4.3, 4.3);
        targetPoint.y = THREE.MathUtils.clamp(targetPoint.y, 1.84, 7.4);
        solveBallisticAim();
      }
    };

    const fire = () => {
      if (!canFire || shots <= 0 || gameEnded || activeProjectile) return;
      preShotSnapshot = captureSnapshot();
      persistSnapshot(preShotSnapshot);
      canFire = false;
      ensureAudio();
      const ballColor = COLORS[(shots + level) % COLORS.length];
      shots -= 1;
      combo = 0;
      const launchPoint = cannonOrigin.clone().addScaledVector(aimDirection, 2.12);
      recoil = 0.24;
      playShotSound();
      updateCannon();

      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.36, 26, 18),
        new THREE.MeshStandardMaterial({ color: ballColor.body, roughness: 0.18, metalness: 0.18 }),
      );
      ball.castShadow = true;
      ball.position.copy(launchPoint);
      scene.add(ball);

      const body = new CANNON.Body({ mass: 3.7, material: ballMaterial, shape: new CANNON.Sphere(0.36) });
      body.position.set(launchPoint.x, launchPoint.y, launchPoint.z);
      body.velocity.set(launchVelocity.x, launchVelocity.y, launchVelocity.z);
      body.linearDamping = 0;
      body.addEventListener("collide", (event: { contact?: { getImpactVelocityAlongNormal?: () => number } }) => {
        const strength = Math.abs(event.contact?.getImpactVelocityAlongNormal?.() ?? body.velocity.length());
        if (strength > 0.8) playImpactSound(strength);
      });
      world.addBody(body);
      activeProjectile = { mesh: ball, body, bornAt: performance.now() };
      skipOffered = false;
      setCanSkipProjectile(false);
      guideSeen = true;
      setGuide(false);
      syncHud(true);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!canFire || gameEnded) return;
      ensureAudio();
      dragging = true;
      renderer.domElement.setPointerCapture(event.pointerId);
      updateAimFromPointer(event);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (dragging) updateAimFromPointer(event);
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      updateAimFromPointer(event);
      if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
      fire();
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.fov = camera.aspect < 0.58 ? 42 : camera.aspect > 0.82 ? 35 : 38;
      camera.position.z = camera.aspect < 0.58 ? 15.5 : 14.8;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    soundToggleRef.current = (enabled: boolean) => {
      soundEnabled = enabled;
      if (enabled) {
        ensureAudio();
        playTone(440, 620, 0.1, 0.035, "sine");
      } else if (audioContext?.state === "running") {
        void audioContext.suspend();
      }
      persistCurrentState();
    };
    restartRef.current = () => buildLevel(level, true);
    nextLevelRef.current = () => buildLevel(level + 1, false);
    undoRef.current = () => {
      if (!preShotSnapshot || undosLeft <= 0) return;
      const snapshot = preShotSnapshot;
      const nextUndoCount = Math.max(0, undosLeft - 1);
      if (restoreSnapshot(snapshot)) {
        undosLeft = nextUndoCount;
        preShotSnapshot = null;
        currentResult = null;
        gameEnded = false;
        canFire = shots > 0;
        setResult(null);
        syncHud(true);
        persistCurrentState();
      }
    };
    skipProjectileRef.current = () => removeProjectile();

    const savedState = readSavedState();
    if (savedState) {
      buildLevel(Math.max(1, savedState.level), false, savedState.levelSeed, false);
      if (!restoreSnapshot(savedState)) {
        buildLevel(1, false);
        solveBallisticAim();
      }
    } else {
      buildLevel(1, false);
      solveBallisticAim();
    }

    const saveWhenHidden = () => {
      if (document.visibilityState === "hidden") persistCurrentState();
    };
    const saveBeforeLeaving = () => persistCurrentState();
    document.addEventListener("visibilitychange", saveWhenHidden);
    window.addEventListener("pagehide", saveBeforeLeaving);
    queueMicrotask(() => setReady(true));

    const animate = (now: number) => {
      if (disposed) return;
      const delta = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      world.step(1 / 60, delta, 4);

      if (recoil > 0.002) recoil *= Math.pow(0.12, delta);
      else recoil = 0;
      updateCannon();

      for (const target of targets) {
        if (target.removed) continue;
        target.mesh.position.set(target.body.position.x, target.body.position.y, target.body.position.z);
        target.mesh.quaternion.set(target.body.quaternion.x, target.body.quaternion.y, target.body.quaternion.z, target.body.quaternion.w);

        const offPlatform = target.body.position.y < 0.48 || Math.abs(target.body.position.x) > 4.72 || Math.abs(target.body.position.z) > 1.3;
        if (!target.counted && offPlatform) {
          target.counted = true;
          combo += 1;
          score += 100 * Math.min(combo, 8);
          playFallSound(combo);
          target.body.applyImpulse(new CANNON.Vec3((Math.random() - 0.5) * 0.7, 0.15, (Math.random() - 0.5) * 0.7));
          syncHud(true);
        }
        if (target.body.position.y < -5.4) {
          target.removed = true;
          world.removeBody(target.body);
          scene.remove(target.mesh);
        }
      }

      if (activeProjectile) {
        activeProjectile.mesh.position.set(activeProjectile.body.position.x, activeProjectile.body.position.y, activeProjectile.body.position.z);
        activeProjectile.mesh.quaternion.set(activeProjectile.body.quaternion.x, activeProjectile.body.quaternion.y, activeProjectile.body.quaternion.z, activeProjectile.body.quaternion.w);
        const age = now - activeProjectile.bornAt;
        if (age > 1800 && !skipOffered) {
          skipOffered = true;
          setCanSkipProjectile(true);
        }
        const slow = activeProjectile.body.velocity.length() < 0.3 && age > 1700;
        const gone = activeProjectile.body.position.y < -5 || Math.abs(activeProjectile.body.position.x) > 13 || Math.abs(activeProjectile.body.position.z) > 14;
        if (age > 4200 || slow || gone) removeProjectile();
      }

      const remaining = targets.filter((target) => !target.counted).length;
      if (!gameEnded && remaining === 0) {
        gameEnded = true;
        canFire = false;
        score += shots * 250;
        currentResult = "clear";
        syncHud(true);
        playClearSound();
        setResult("clear");
        persistCurrentState();
      } else if (!gameEnded && shots === 0 && !activeProjectile && remaining > 0) {
        gameEnded = true;
        canFire = false;
        currentResult = "failed";
        syncHud(true);
        playFailSound();
        setResult("failed");
        persistCurrentState();
      } else {
        syncHud(false);
      }

      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      colorScheme.removeEventListener("change", onColorSchemeChange);
      document.removeEventListener("visibilitychange", saveWhenHidden);
      window.removeEventListener("pagehide", saveBeforeLeaving);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      });
      renderer.dispose();
      if (audioContext && audioContext.state !== "closed") void audioContext.close();
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <main className="physics-page">
      <div className="physics-shell">
        <div className="game-stage-card">
          <div className="game-hud" aria-label="游戏状态">
            <div><span>关卡</span><strong>{hud.level}</strong></div>
            <div><span>得分</span><strong>{hud.score.toLocaleString()}</strong></div>
            <div><span>炮弹</span><strong>{hud.shots}</strong></div>
            <div><span>目标</span><strong>{hud.remaining}</strong></div>
          </div>

          <div className="webgl-stage" ref={mountRef}>
            {!ready && !error && <div className="loading-card"><span /><b>正在搭建关卡…</b></div>}
            {error && <div className="loading-card error-card"><b>无法启动 3D 游戏</b><small>请换 Safari、Chrome 或 Edge。</small></div>}
            {guide && ready && (
              <div className="drag-guide">
                <span>↗</span>
                <b>拖动瞄准 · 松开发射</b>
              </div>
            )}
            {canSkipProjectile && (
              <button className="continue-shot" onClick={() => skipProjectileRef.current()}>立即继续</button>
            )}
            {hud.combo > 1 && <div className="combo-pop">连落 ×{hud.combo}</div>}

            {result && (
              <div className="game-result">
                <div className={result === "clear" ? "result-medal" : "result-medal failed"}>{result === "clear" ? "★" : "!"}</div>
                <small>{result === "clear" ? "平台已清空" : "炮弹用完了"}</small>
                <h2>{result === "clear" ? `第 ${hud.level} 关通过` : "再试一次"}</h2>
                <p>{result === "clear" ? `总分 ${hud.score.toLocaleString()}` : "可以撤回最后一发，或重新挑战本关。"}</p>
                <button onClick={() => result === "clear" ? nextLevelRef.current() : restartRef.current()}>{result === "clear" ? "下一关 →" : "重新挑战"}</button>
              </div>
            )}
          </div>

          <div className="game-toolbar" aria-label="游戏操作">
            <button disabled={!hud.canUndo} onClick={() => undoRef.current()} aria-label={`撤回上一发，本关剩余 ${hud.undosLeft} 次`}>
              ↶ 撤回 <b>{hud.undosLeft}</b>
            </button>
            <button onClick={() => restartRef.current()} aria-label="重置本关">↻ 重置</button>
            <button
              className={soundOn ? "is-on" : ""}
              onClick={() => setSoundOn((current) => {
                const next = !current;
                soundToggleRef.current(next);
                return next;
              })}
              aria-label={soundOn ? "关闭音效" : "打开音效"}
            >
              {soundOn ? "🔊 音效" : "🔇 静音"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
