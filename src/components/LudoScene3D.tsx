import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ALL_COLORS,
  COLOR_HEX,
  getCurrentPlayerColor,
  getTokenBoardCoord,
  HOME_STRETCH_COORDS,
  MAIN_TRACK_COORDS,
  STAR_TRACK_INDICES,
} from '../game/ludoEngine';
import { GameState, PlayerColor, ScreenPhase } from '../game/types';

interface TokenAnimState {
  currentPos: THREE.Vector3;
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  queue: THREE.Vector3[];
  hopProgress: number;
  isHopping: boolean;
  scaleY: number;
  scaleXZ: number;
}

interface ParticleItem {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

export interface LudoSceneProps {
  screenPhase: ScreenPhase;
  gameState: GameState | null;
  cameraMode: 'angled' | 'top';
  isHumanTurn: boolean;
  diceRollingVisual: boolean;
  onSelectToken: (tokenId: number) => void;
  onRollDice: () => void;
  onStepHop?: (stepIndex: number) => void;
  stepAnimationSignal: {
    seq: number;
    color: PlayerColor;
    tokenId: number;
    steps: number[];
    captured: Array<{ color: PlayerColor; id: number }>;
    reachedHome: boolean;
  } | null;
}

const BOARD_WORLD_SIZE = 12.0;
const CELL_SIZE = BOARD_WORLD_SIZE / 15;

// 4 Corner Dice Pedestal anchors aligned directly beside each player's home corner
const CORNER_DICE_POSITIONS: Record<PlayerColor, [number, number, number]> = {
  red: [-4.35, 0.24, -7.15],
  green: [4.35, 0.24, -7.15],
  yellow: [4.35, 0.24, 7.15],
  blue: [-4.35, 0.24, 7.15],
};

function boardCoordToWorld(row: number, col: number, out: THREE.Vector3): THREE.Vector3 {
  const x = (col - 7) * CELL_SIZE;
  const z = (row - 7) * CELL_SIZE;
  return out.set(x, 0.24, z);
}

function createWoodTextures(): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const size = 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  cCtx.fillStyle = '#472414';
  cCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 2) {
    const wave = Math.sin(y * 0.08) * 14 + Math.sin(y * 0.23) * 6;
    const tone = Math.floor(38 + (Math.sin(y * 0.12 + wave * 0.1) + 1) * 18);
    cCtx.fillStyle = `rgb(${tone + 30}, ${Math.floor(tone * 0.62)}, ${Math.floor(tone * 0.36)})`;
    cCtx.fillRect(0, y, size, 2);

    const bTone = Math.floor(110 + Math.sin(y * 0.15) * 32);
    bCtx.fillStyle = `rgb(${bTone}, ${bTone}, ${bTone})`;
    bCtx.fillRect(0, y, size, 2);
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;

  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  return { map, bump };
}

function createFeltTextures(): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const size = 256;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  cCtx.fillStyle = '#112a22';
  cCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 4200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const light = Math.random() > 0.5;
    cCtx.fillStyle = light ? 'rgba(30, 74, 58, 0.35)' : 'rgba(8, 22, 17, 0.35)';
    cCtx.fillRect(x, y, 2, 2);
    bCtx.fillStyle = light ? 'rgba(200,200,200,0.4)' : 'rgba(70,70,70,0.4)';
    bCtx.fillRect(x, y, 2, 2);
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(6, 6);

  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(6, 6);
  return { map, bump };
}

function createBoardTexture(): THREE.CanvasTexture {
  const size = 1024;
  const cell = size / 15;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f8f4ea';
  ctx.fillRect(0, 0, size, size);

  const colors = {
    red: '#d93838',
    redLight: '#fde8e8',
    green: '#1e9e52',
    greenLight: '#e3f7eb',
    yellow: '#e6a817',
    yellowLight: '#fef6db',
    blue: '#235ee0',
    blueLight: '#e5eeff',
    gold: '#c89b3c',
  };

  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#fbf8f1' : '#f2ecde';
      ctx.fillRect(c * cell, r * cell, cell, cell);
      ctx.strokeStyle = 'rgba(45, 38, 32, 0.22)';
      ctx.lineWidth = 2;
      ctx.strokeRect(c * cell, r * cell, cell, cell);
    }
  }

  const drawColoredCell = (r: number, c: number, fill: string) => {
    ctx.fillStyle = fill;
    ctx.fillRect(c * cell + 2, r * cell + 2, cell - 4, cell - 4);
    ctx.strokeStyle = 'rgba(20, 18, 15, 0.28)';
    ctx.lineWidth = 2;
    ctx.strokeRect(c * cell, r * cell, cell, cell);
  };

  for (let i = 0; i < 5; i++) {
    drawColoredCell(HOME_STRETCH_COORDS.red[i][0], HOME_STRETCH_COORDS.red[i][1], colors.red);
    drawColoredCell(HOME_STRETCH_COORDS.green[i][0], HOME_STRETCH_COORDS.green[i][1], colors.green);
    drawColoredCell(HOME_STRETCH_COORDS.yellow[i][0], HOME_STRETCH_COORDS.yellow[i][1], colors.yellow);
    drawColoredCell(HOME_STRETCH_COORDS.blue[i][0], HOME_STRETCH_COORDS.blue[i][1], colors.blue);
  }

  const startCells: Array<{ r: number; c: number; fill: string; angle: number }> = [
    { r: 6, c: 1, fill: colors.red, angle: 0 },
    { r: 1, c: 8, fill: colors.green, angle: Math.PI / 2 },
    { r: 8, c: 13, fill: colors.yellow, angle: Math.PI },
    { r: 13, c: 6, fill: colors.blue, angle: -Math.PI / 2 },
  ];

  for (const s of startCells) {
    drawColoredCell(s.r, s.c, s.fill);
    ctx.save();
    ctx.translate((s.c + 0.5) * cell, (s.r + 0.5) * cell);
    ctx.rotate(s.angle);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.moveTo(cell * 0.24, 0);
    ctx.lineTo(-cell * 0.14, -cell * 0.2);
    ctx.lineTo(-cell * 0.06, 0);
    ctx.lineTo(-cell * 0.14, cell * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  const drawStar = (cx: number, cy: number, outerR: number, innerR: number, fill: string) => {
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = 'rgba(45, 38, 32, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  };

  for (const idx of STAR_TRACK_INDICES) {
    const [r, c] = MAIN_TRACK_COORDS[idx];
    drawColoredCell(r, c, '#efe7d2');
    drawStar((c + 0.5) * cell, (r + 0.5) * cell, cell * 0.32, cell * 0.14, '#c89b3c');
  }

  const drawYardExact = (
    startRow: number,
    startCol: number,
    mainColor: string,
    lightColor: string,
    yardCenters: Array<[number, number]>
  ) => {
    const x = startCol * cell;
    const y = startRow * cell;
    const w = 6 * cell;

    ctx.fillStyle = mainColor;
    ctx.fillRect(x, y, w, w);
    ctx.strokeStyle = '#2d2620';
    ctx.lineWidth = 6;
    ctx.strokeRect(x + 3, y + 3, w - 6, w - 6);

    const pad = cell * 0.72;
    const innerW = w - pad * 2;
    ctx.fillStyle = '#fcf9f2';
    ctx.beginPath();
    ctx.roundRect(x + pad, y + pad, innerW, innerW, cell * 0.42);
    ctx.fill();
    ctx.strokeStyle = colors.gold;
    ctx.lineWidth = 5;
    ctx.stroke();

    for (const [r, c] of yardCenters) {
      const cx = (c + 0.5) * cell;
      const cy = (r + 0.5) * cell;
      ctx.beginPath();
      ctx.arc(cx, cy, cell * 0.58, 0, Math.PI * 2);
      ctx.fillStyle = lightColor;
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = mainColor;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, cell * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = mainColor;
      ctx.globalAlpha = 0.25;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  };

  drawYardExact(0, 0, colors.red, colors.redLight, [
    [1.65, 1.65],
    [1.65, 3.35],
    [3.35, 1.65],
    [3.35, 3.35],
  ]);
  drawYardExact(0, 9, colors.green, colors.greenLight, [
    [1.65, 10.65],
    [1.65, 12.35],
    [3.35, 10.65],
    [3.35, 12.35],
  ]);
  drawYardExact(9, 9, colors.yellow, colors.yellowLight, [
    [10.65, 10.65],
    [10.65, 12.35],
    [12.35, 10.65],
    [12.35, 12.35],
  ]);
  drawYardExact(9, 0, colors.blue, colors.blueLight, [
    [10.65, 1.65],
    [10.65, 3.35],
    [12.35, 1.65],
    [12.35, 3.35],
  ]);

  const cx = 7.5 * cell;
  const cy = 7.5 * cell;
  const left = 6 * cell;
  const right = 9 * cell;
  const top = 6 * cell;
  const bottom = 9 * cell;

  const drawTri = (x1: number, y1: number, x2: number, y2: number, fill: string) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = '#2d2620';
    ctx.lineWidth = 4;
    ctx.stroke();
  };

  drawTri(left, top, left, bottom, colors.red);
  drawTri(left, top, right, top, colors.green);
  drawTri(right, top, right, bottom, colors.yellow);
  drawTri(right, bottom, left, bottom, colors.blue);

  ctx.beginPath();
  ctx.arc(cx, cy, cell * 0.56, 0, Math.PI * 2);
  ctx.fillStyle = '#fdf8eb';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = colors.gold;
  ctx.stroke();

  drawStar(cx, cy, cell * 0.36, cell * 0.16, colors.gold);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createDieFaceTexture(value: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#faf6eb';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, size - 20, size - 20);

  const pipPositions: Record<number, Array<[number, number]>> = {
    1: [[0.5, 0.5]],
    2: [
      [0.28, 0.28],
      [0.72, 0.72],
    ],
    3: [
      [0.28, 0.28],
      [0.5, 0.5],
      [0.72, 0.72],
    ],
    4: [
      [0.28, 0.28],
      [0.72, 0.28],
      [0.28, 0.72],
      [0.72, 0.72],
    ],
    5: [
      [0.28, 0.28],
      [0.72, 0.28],
      [0.5, 0.5],
      [0.28, 0.72],
      [0.72, 0.72],
    ],
    6: [
      [0.28, 0.24],
      [0.72, 0.24],
      [0.28, 0.5],
      [0.72, 0.5],
      [0.28, 0.76],
      [0.72, 0.76],
    ],
  };

  const pips = pipPositions[value] || pipPositions[1];
  for (const [px, py] of pips) {
    ctx.beginPath();
    ctx.arc(px * size, py * size, value === 1 ? 30 : 21, 0, Math.PI * 2);
    ctx.fillStyle = value === 1 || value === 6 ? '#c82333' : '#1e242c';
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0,0,0,0.58)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.24)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

const DICE_TARGET_EULERS: Record<number, THREE.Euler> = {
  1: new THREE.Euler(0, 0, 0),
  2: new THREE.Euler(-Math.PI / 2, 0, 0),
  3: new THREE.Euler(0, 0, Math.PI / 2),
  4: new THREE.Euler(0, 0, -Math.PI / 2),
  5: new THREE.Euler(Math.PI / 2, 0, 0),
  6: new THREE.Euler(Math.PI, 0, 0),
};

export const LudoScene3D: React.FC<LudoSceneProps> = (props) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef<LudoSceneProps>(props);
  propsRef.current = props;

  const animMapRef = useRef<Record<string, TokenAnimState>>({});
  const lastStepSeqRef = useRef<number>(-1);
  const diceSpinTargetRef = useRef<THREE.Quaternion>(new THREE.Quaternion());

  useEffect(() => {
    const sig = props.stepAnimationSignal;
    if (!sig || sig.seq === lastStepSeqRef.current) return;
    lastStepSeqRef.current = sig.seq;

    const key = `${sig.color}-${sig.tokenId}`;
    const anim = animMapRef.current[key];
    if (anim && sig.steps.length > 0) {
      for (const prog of sig.steps) {
        const [r, c] = getTokenBoardCoord(sig.color, sig.tokenId, prog);
        const wp = new THREE.Vector3();
        boardCoordToWorld(r, c, wp);
        anim.queue.push(wp);
      }
    }

    for (const cap of sig.captured) {
      const capKey = `${cap.color}-${cap.id}`;
      const capAnim = animMapRef.current[capKey];
      if (capAnim) {
        const [yr, yc] = getTokenBoardCoord(cap.color, cap.id, -1);
        const wp = new THREE.Vector3();
        boardCoordToWorld(yr, yc, wp);
        capAnim.queue = [wp];
      }
    }
  }, [props.stepAnimationSignal]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b1118');
    scene.fog = new THREE.FogExp2('#0b1118', 0.018);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const isInitialTitle = propsRef.current.screenPhase === 'title';
    const isInitialPortrait = width / height < 0.95;
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 150);
    if (isInitialTitle) {
      camera.position.set(
        isInitialPortrait ? 0 : -5.6,
        isInitialPortrait ? 18 : 13.5,
        isInitialPortrait ? 26 : 19.5
      );
      camera.lookAt(isInitialPortrait ? 0 : -5.2, 0, isInitialPortrait ? 1.5 : 0);
    } else {
      const initAspect = width / Math.max(height, 1);
      const dist = Math.max(24.0, 7.6 / (0.36397 * initAspect));
      camera.position.set(0, dist * 0.82, dist * 0.57);
      camera.lookAt(0, 0, 0);
    }

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    container.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const hemiLight = new THREE.HemisphereLight('#cfe0f5', '#2a1d14', 0.92);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#fff2dc', 1.9);
    keyLight.position.set(8, 16, 8);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    const d = 10.5;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 40;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#7bb3ff', 0.6);
    rimLight.position.set(-10, 8, -9);
    scene.add(rimLight);

    const disposables: Array<{ dispose: () => void }> = [];

    // Procedural Felt Baize Luxury Tabletop
    const feltTex = createFeltTextures();
    feltTex.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const tableGeo = new THREE.CylinderGeometry(26, 26, 0.8, 56);
    const tableMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: feltTex.map,
      bumpMap: feltTex.bump,
      bumpScale: 0.02,
      roughness: 0.9,
      metalness: 0.03,
    });
    const tableMesh = new THREE.Mesh(tableGeo, tableMat);
    tableMesh.position.y = -0.65;
    tableMesh.receiveShadow = true;
    scene.add(tableMesh);
    disposables.push(feltTex.map, feltTex.bump, tableGeo, tableMat);

    // Anisotropic Brushed Gold Inlay Ring
    const goldMat = new THREE.MeshPhysicalMaterial({
      color: '#d8b447',
      metalness: 0.92,
      roughness: 0.18,
      clearcoat: 0.7,
    });
    const tableTrimGeo = new THREE.TorusGeometry(11.4, 0.065, 12, 72);
    const tableTrim = new THREE.Mesh(tableTrimGeo, goldMat);
    tableTrim.rotation.x = Math.PI / 2;
    tableTrim.position.y = -0.24;
    scene.add(tableTrim);
    disposables.push(goldMat, tableTrimGeo);

    // Procedural Walnut Wood Grain Material
    const woodTex = createWoodTextures();
    woodTex.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const woodMat = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      map: woodTex.map,
      bumpMap: woodTex.bump,
      bumpScale: 0.025,
      roughness: 0.44,
      metalness: 0.06,
      clearcoat: 0.45,
      clearcoatRoughness: 0.25,
    });
    disposables.push(woodTex.map, woodTex.bump, woodMat);

    // Board Group (Composite Architectural Tabletop Assembly)
    const boardGroup = new THREE.Group();
    scene.add(boardGroup);

    // 1. Stepped Walnut Base Plinth
    const plinthBaseGeo = new THREE.BoxGeometry(BOARD_WORLD_SIZE + 1.55, 0.26, BOARD_WORLD_SIZE + 1.55);
    const plinthBase = new THREE.Mesh(plinthBaseGeo, woodMat);
    plinthBase.position.y = -0.14;
    plinthBase.castShadow = true;
    plinthBase.receiveShadow = true;
    boardGroup.add(plinthBase);
    disposables.push(plinthBaseGeo);

    // 2. Main Walnut Outer Frame
    const frameGeo = new THREE.BoxGeometry(BOARD_WORLD_SIZE + 1.15, 0.44, BOARD_WORLD_SIZE + 1.15);
    const frameMesh = new THREE.Mesh(frameGeo, woodMat);
    frameMesh.position.y = -0.02;
    frameMesh.castShadow = true;
    frameMesh.receiveShadow = true;
    boardGroup.add(frameMesh);
    disposables.push(frameGeo);

    // 3. Brass Inner Trim Bezel
    const brassTrimGeo = new THREE.BoxGeometry(BOARD_WORLD_SIZE + 0.26, 0.48, BOARD_WORLD_SIZE + 0.26);
    const brassTrim = new THREE.Mesh(brassTrimGeo, goldMat);
    brassTrim.position.y = -0.02;
    boardGroup.add(brassTrim);
    disposables.push(brassTrimGeo);

    // 4. 4 Brass Corner Plates + Rivets
    const cornerGeo = new THREE.BoxGeometry(0.92, 0.52, 0.92);
    const rivetGeo = new THREE.SphereGeometry(0.06, 10, 8);
    const cOffset = (BOARD_WORLD_SIZE + 1.15) / 2 - 0.38;
    [
      [-cOffset, -cOffset],
      [cOffset, -cOffset],
      [cOffset, cOffset],
      [-cOffset, cOffset],
    ].forEach(([cx, cz]) => {
      const corner = new THREE.Mesh(cornerGeo, goldMat);
      corner.position.set(cx, 0.01, cz);
      boardGroup.add(corner);

      const rivet = new THREE.Mesh(rivetGeo, goldMat);
      rivet.position.set(cx, 0.28, cz);
      boardGroup.add(rivet);
    });
    disposables.push(cornerGeo, rivetGeo);

    // 5. Ludo Playfield Top Plate
    const boardTex = createBoardTexture();
    boardTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const surfaceGeo = new THREE.BoxGeometry(BOARD_WORLD_SIZE, 0.06, BOARD_WORLD_SIZE);
    const surfaceMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: boardTex,
      roughness: 0.34,
      metalness: 0.05,
    });
    const surfaceMesh = new THREE.Mesh(surfaceGeo, surfaceMat);
    surfaceMesh.position.y = 0.21;
    surfaceMesh.receiveShadow = true;
    boardGroup.add(surfaceMesh);
    disposables.push(boardTex, surfaceGeo, surfaceMat);

    // 6. Center Crown Medallion Ring
    const crownRingGeo = new THREE.TorusGeometry(CELL_SIZE * 0.62, 0.048, 12, 32);
    const crownRing = new THREE.Mesh(crownRingGeo, goldMat);
    crownRing.rotation.x = Math.PI / 2;
    crownRing.position.y = 0.265;
    boardGroup.add(crownRing);
    disposables.push(crownRingGeo);

    // Composite 3D Ludo Tokens
    const shadowTex = createContactShadowTexture();
    const shadowGeo = new THREE.CircleGeometry(CELL_SIZE * 0.36, 20);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });

    const lathePoints = [
      new THREE.Vector2(0.01, 0.04),
      new THREE.Vector2(0.24, 0.04),
      new THREE.Vector2(0.22, 0.12),
      new THREE.Vector2(0.14, 0.24),
      new THREE.Vector2(0.10, 0.44),
      new THREE.Vector2(0.15, 0.56),
      new THREE.Vector2(0.01, 0.58),
    ];
    const bodyGeo = new THREE.LatheGeometry(lathePoints, 22);
    const basePlinthGeo = new THREE.CylinderGeometry(0.24, 0.26, 0.06, 22);
    const collarGeo = new THREE.TorusGeometry(0.125, 0.024, 10, 20);
    const jewelGeo = new THREE.SphereGeometry(0.125, 18, 14);
    const haloGeo = new THREE.TorusGeometry(CELL_SIZE * 0.41, 0.042, 10, 28);
    const hitProxyGeo = new THREE.CylinderGeometry(CELL_SIZE * 0.45, CELL_SIZE * 0.45, 0.9, 12);
    const hitProxyMat = new THREE.MeshBasicMaterial({ visible: false });

    disposables.push(
      shadowTex,
      shadowGeo,
      shadowMat,
      bodyGeo,
      basePlinthGeo,
      collarGeo,
      jewelGeo,
      haloGeo,
      hitProxyGeo,
      hitProxyMat
    );

    const tokenMaterials: Record<PlayerColor, THREE.MeshPhysicalMaterial> = {
      red: new THREE.MeshPhysicalMaterial({ color: COLOR_HEX.red, roughness: 0.18, metalness: 0.08, clearcoat: 1.0 }),
      green: new THREE.MeshPhysicalMaterial({ color: COLOR_HEX.green, roughness: 0.18, metalness: 0.08, clearcoat: 1.0 }),
      yellow: new THREE.MeshPhysicalMaterial({ color: COLOR_HEX.yellow, roughness: 0.18, metalness: 0.08, clearcoat: 1.0 }),
      blue: new THREE.MeshPhysicalMaterial({ color: COLOR_HEX.blue, roughness: 0.18, metalness: 0.08, clearcoat: 1.0 }),
    };
    const haloMat = new THREE.MeshBasicMaterial({ color: '#fff3a1' });
    disposables.push(
      tokenMaterials.red,
      tokenMaterials.green,
      tokenMaterials.yellow,
      tokenMaterials.blue,
      haloMat
    );

    interface TokenVisual {
      color: PlayerColor;
      id: number;
      group: THREE.Group;
      halo: THREE.Mesh;
      hitProxy: THREE.Mesh;
    }

    const tokenVisuals: TokenVisual[] = [];
    const raycastTargets: THREE.Object3D[] = [];

    for (const color of ALL_COLORS) {
      for (let id = 0; id < 4; id++) {
        const group = new THREE.Group();

        const shadow = new THREE.Mesh(shadowGeo, shadowMat);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.015;
        group.add(shadow);

        const plinth = new THREE.Mesh(basePlinthGeo, goldMat);
        plinth.position.y = 0.03;
        plinth.castShadow = true;
        group.add(plinth);

        const body = new THREE.Mesh(bodyGeo, tokenMaterials[color]);
        body.castShadow = true;
        group.add(body);

        const collar = new THREE.Mesh(collarGeo, goldMat);
        collar.rotation.x = Math.PI / 2;
        collar.position.y = 0.45;
        group.add(collar);

        const jewel = new THREE.Mesh(jewelGeo, tokenMaterials[color]);
        jewel.position.y = 0.65;
        jewel.castShadow = true;
        group.add(jewel);

        const halo = new THREE.Mesh(haloGeo, haloMat);
        halo.rotation.x = Math.PI / 2;
        halo.position.y = 0.045;
        halo.visible = false;
        group.add(halo);

        const hitProxy = new THREE.Mesh(hitProxyGeo, hitProxyMat);
        hitProxy.position.y = 0.45;
        hitProxy.userData = { kind: 'token', color, tokenId: id };
        group.add(hitProxy);
        raycastTargets.push(hitProxy);

        const [r, c] = getTokenBoardCoord(color, id, -1);
        const initPos = new THREE.Vector3();
        boardCoordToWorld(r, c, initPos);
        group.position.copy(initPos);

        boardGroup.add(group);
        tokenVisuals.push({ color, id, group, halo, hitProxy });

        animMapRef.current[`${color}-${id}`] = {
          currentPos: initPos.clone(),
          startPos: initPos.clone(),
          targetPos: initPos.clone(),
          queue: [],
          hopProgress: 0,
          isHopping: false,
          scaleY: 1,
          scaleXZ: 1,
        };
      }
    }

    // 4 Corner Dice Pedestals + Moving Active 3D Die!
    const trayBaseGeo = new THREE.CylinderGeometry(0.92, 1.02, 0.24, 32);
    const trayRimGeo = new THREE.TorusGeometry(0.91, 0.055, 12, 32);
    const trayFeltGeo = new THREE.CircleGeometry(0.84, 32);
    const activeGlowGeo = new THREE.TorusGeometry(1.06, 0.05, 10, 32);
    disposables.push(trayBaseGeo, trayRimGeo, trayFeltGeo, activeGlowGeo);

    const cornerPedestals: Record<
      PlayerColor,
      { group: THREE.Group; activeRing: THREE.Mesh; feltMat: THREE.MeshStandardMaterial }
    > = {} as Record<
      PlayerColor,
      { group: THREE.Group; activeRing: THREE.Mesh; feltMat: THREE.MeshStandardMaterial }
    >;

    for (const color of ALL_COLORS) {
      const pGroup = new THREE.Group();
      const [px, py, pz] = CORNER_DICE_POSITIONS[color];
      pGroup.position.set(px, py - 0.24, pz);

      const base = new THREE.Mesh(trayBaseGeo, woodMat);
      base.position.y = 0.12;
      base.receiveShadow = true;
      base.castShadow = true;
      pGroup.add(base);

      const feltMat = new THREE.MeshStandardMaterial({
        color: COLOR_HEX[color],
        roughness: 0.85,
        metalness: 0.05,
      });
      disposables.push(feltMat);
      const pad = new THREE.Mesh(trayFeltGeo, feltMat);
      pad.rotation.x = -Math.PI / 2;
      pad.position.y = 0.245;
      pGroup.add(pad);

      const rim = new THREE.Mesh(trayRimGeo, goldMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.245;
      pGroup.add(rim);

      const activeRingMat = new THREE.MeshBasicMaterial({ color: '#fde047' });
      disposables.push(activeRingMat);
      const activeRing = new THREE.Mesh(activeGlowGeo, activeRingMat);
      activeRing.rotation.x = Math.PI / 2;
      activeRing.position.y = 0.06;
      activeRing.visible = false;
      pGroup.add(activeRing);

      scene.add(pGroup);
      cornerPedestals[color] = { group: pGroup, activeRing, feltMat };
    }

    // The 3D Die itself — glides seamlessly to whichever player's corner pedestal is active!
    const diceMaterials = [3, 4, 1, 6, 2, 5].map((num) => {
      const tex = createDieFaceTexture(num);
      const mat = new THREE.MeshPhysicalMaterial({
        color: '#ffffff',
        map: tex,
        roughness: 0.18,
        metalness: 0.05,
        clearcoat: 0.9,
      });
      disposables.push(tex, mat);
      return mat;
    });

    const dieGeo = new THREE.BoxGeometry(0.84, 0.84, 0.84);
    const dieMesh = new THREE.Mesh(dieGeo, diceMaterials);
    const startDiePos = CORNER_DICE_POSITIONS.red;
    dieMesh.position.set(startDiePos[0], 0.67, startDiePos[2]);
    dieMesh.castShadow = true;
    dieMesh.userData = { kind: 'dice' };
    scene.add(dieMesh);
    raycastTargets.push(dieMesh);
    disposables.push(dieGeo);

    // Die travel animation state between player corners
    let currentDieOwner: PlayerColor = 'red';
    const dieTravelStart = new THREE.Vector3(startDiePos[0], 0.67, startDiePos[2]);
    const dieTravelTarget = new THREE.Vector3(startDiePos[0], 0.67, startDiePos[2]);
    let dieTravelProgress = 1;

    // Pooled InstancedMesh Particle Ring Buffer
    const PARTICLE_COUNT = 64;
    const particleGeo = new THREE.OctahedronGeometry(0.11, 0);
    const particleMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const particleInstanced = new THREE.InstancedMesh(particleGeo, particleMat, PARTICLE_COUNT);
    particleInstanced.frustumCulled = false;
    scene.add(particleInstanced);
    disposables.push(particleGeo, particleMat);

    const particles: ParticleItem[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      active: false,
      pos: new THREE.Vector3(0, -10, 0),
      vel: new THREE.Vector3(),
      life: 0,
      maxLife: 0.8,
      color: new THREE.Color('#ffd700'),
    }));

    const spawnBurst = (origin: THREE.Vector3, hexColor: string, count = 16) => {
      let spawned = 0;
      for (let i = 0; i < PARTICLE_COUNT && spawned < count; i++) {
        const p = particles[i];
        if (!p.active) {
          p.active = true;
          p.pos.copy(origin);
          p.pos.y += 0.35;
          const angle = (spawned / count) * Math.PI * 2 + Math.random() * 0.4;
          const speed = 1.8 + Math.random() * 2.5;
          p.vel.set(Math.cos(angle) * speed, 3.2 + Math.random() * 2.5, Math.sin(angle) * speed);
          p.life = 0;
          p.maxLife = 0.55 + Math.random() * 0.35;
          p.color.set(hexColor);
          spawned++;
        }
      }
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onPointerDown = (e: PointerEvent) => {
      const p = propsRef.current;
      if (p.screenPhase !== 'playing' || !p.gameState || !p.isHumanTurn) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(raycastTargets, false);
      if (hits.length === 0) return;

      for (const hit of hits) {
        const ud = hit.object.userData;
        if (ud.kind === 'dice' && p.gameState.turnPhase === 'waiting_roll') {
          p.onRollDice();
          return;
        }
        if (
          ud.kind === 'token' &&
          p.gameState.turnPhase === 'selecting_token' &&
          ud.color === getCurrentPlayerColor(p.gameState) &&
          p.gameState.validTokenIds.includes(ud.tokenId)
        ) {
          p.onSelectToken(ud.tokenId);
          return;
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const p = propsRef.current;
      if (p.screenPhase !== 'playing' || !p.gameState || !p.isHumanTurn) {
        renderer.domElement.style.cursor = 'default';
        return;
      }
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(raycastTargets, false);
      let hoverValid = false;
      for (const hit of hits) {
        const ud = hit.object.userData;
        if (ud.kind === 'dice' && p.gameState.turnPhase === 'waiting_roll') {
          hoverValid = true;
          break;
        }
        if (
          ud.kind === 'token' &&
          p.gameState.turnPhase === 'selecting_token' &&
          ud.color === getCurrentPlayerColor(p.gameState) &&
          p.gameState.validTokenIds.includes(ud.tokenId)
        ) {
          hoverValid = true;
          break;
        }
      }
      renderer.domElement.style.cursor = hoverValid ? 'pointer' : 'default';
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);

    const handleResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    const _camTargetPos = new THREE.Vector3();
    const _camLookAt = new THREE.Vector3();
    const _currentLookAt = new THREE.Vector3(
      isInitialTitle ? (isInitialPortrait ? 0 : -5.2) : 0,
      0,
      isInitialTitle ? (isInitialPortrait ? 1.5 : 0) : 0
    );
    const _tmpVec = new THREE.Vector3();
    const _dummy = new THREE.Object3D();
    const startTimeMs = performance.now();
    let lastTimeMs = startTimeMs;
    let prevScreenPhase: ScreenPhase = propsRef.current.screenPhase;

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const nowMs = performance.now();
      const rawDt = (nowMs - lastTimeMs) / 1000;
      lastTimeMs = nowMs;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
      const elapsed = (nowMs - startTimeMs) / 1000;
      const p = propsRef.current;

      const aspect = camera.aspect || 1;
      const isPortrait = aspect < 0.95;

      // Camera Choreography (symmetric board + top/bottom corner dice pedestals!)
      if (p.screenPhase === 'title') {
        const orbitAngle = elapsed * 0.16;
        const radius = isPortrait ? Math.max(26, 8.35 / (0.36397 * aspect)) : 19.5;
        const offsetX = isPortrait ? 0 : -5.6;
        _camTargetPos.set(
          Math.sin(orbitAngle) * radius * 0.45 + offsetX,
          isPortrait ? radius * 0.72 : 13.5,
          Math.cos(orbitAngle) * radius
        );
        _camLookAt.set(isPortrait ? 0 : -5.2, 0, isPortrait ? 1.5 : 0);
      } else {
        // Fit width 13.7 + margin AND top+bottom corner pedestals (-8.2 to +8.2) cleanly above bottom HUD
        const fitDist = Math.max(25.5, 8.35 / (0.36397 * aspect));
        if (p.cameraMode === 'top') {
          _camTargetPos.set(0, fitDist * 0.98, fitDist * 0.08);
          _camLookAt.set(0, 0, 0.4);
        } else {
          _camTargetPos.set(0, fitDist * 0.82, fitDist * 0.56);
          _camLookAt.set(0, 0, 0.7);
        }
      }

      if (prevScreenPhase === 'title' && p.screenPhase === 'playing') {
        camera.position.copy(_camTargetPos);
        _currentLookAt.copy(_camLookAt);
      }
      prevScreenPhase = p.screenPhase;

      const dampLambda = 9.0;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, _camTargetPos.x, dampLambda, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, _camTargetPos.y, dampLambda, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, _camTargetPos.z, dampLambda, dt);

      _currentLookAt.x = THREE.MathUtils.damp(_currentLookAt.x, _camLookAt.x, dampLambda, dt);
      _currentLookAt.y = THREE.MathUtils.damp(_currentLookAt.y, _camLookAt.y, dampLambda, dt);
      _currentLookAt.z = THREE.MathUtils.damp(_currentLookAt.z, _camLookAt.z, dampLambda, dt);
      camera.lookAt(_currentLookAt);

      const gs = p.gameState;
      const showGameplay = p.screenPhase !== 'title' && gs !== null;
      const activeTurnColor: PlayerColor = gs ? getCurrentPlayerColor(gs) : 'red';

      // Show corner pedestals for active players & pulse active corner halo
      for (const color of ALL_COLORS) {
        const ped = cornerPedestals[color];
        const isActiveSeat = gs ? gs.players[color]?.isActive : true;
        ped.group.visible = isActiveSeat;
        const isCurrentCorner = showGameplay && color === activeTurnColor && gs?.turnPhase !== 'finished';
        ped.activeRing.visible = Boolean(isCurrentCorner);
        if (isCurrentCorner) {
          const s = 1 + Math.sin(elapsed * 6) * 0.08;
          ped.activeRing.scale.set(s, s, 1);
        }
      }

      // Smoothly arc 3D Die to active player's corner pedestal when turn shifts
      if (activeTurnColor !== currentDieOwner) {
        currentDieOwner = activeTurnColor;
        dieTravelStart.copy(dieMesh.position);
        const dest = CORNER_DICE_POSITIONS[activeTurnColor];
        dieTravelTarget.set(dest[0], 0.67, dest[2]);
        dieTravelProgress = 0;
      }

      if (dieTravelProgress < 1) {
        dieTravelProgress = Math.min(1, dieTravelProgress + dt * 3.8);
        const t = dieTravelProgress;
        const ease = 1 - Math.pow(1 - t, 3);
        dieMesh.position.lerpVectors(dieTravelStart, dieTravelTarget, ease);
        dieMesh.position.y = 0.67 + Math.sin(t * Math.PI) * 1.65;
      }

      // Die rolling tumble vs resting orientation
      if (p.diceRollingVisual) {
        dieMesh.rotation.x += dt * 16.0;
        dieMesh.rotation.y += dt * 13.0;
        dieMesh.rotation.z += dt * 11.0;
        dieMesh.position.y = 1.05 + Math.abs(Math.sin(elapsed * 15)) * 0.65;
      } else {
        const val = gs?.diceValue ?? 6;
        const targetEuler = DICE_TARGET_EULERS[val] || DICE_TARGET_EULERS[1];
        diceSpinTargetRef.current.setFromEuler(targetEuler);
        dieMesh.quaternion.slerp(diceSpinTargetRef.current, 1 - Math.exp(-12 * dt));
        if (dieTravelProgress >= 1) {
          const hoverBob =
            showGameplay && p.isHumanTurn && gs?.turnPhase === 'waiting_roll'
              ? Math.abs(Math.sin(elapsed * 4.5)) * 0.12
              : 0;
          dieMesh.position.y = THREE.MathUtils.damp(dieMesh.position.y, 0.67 + hoverBob, 12, dt);
        }
      }

      // Token occupancy offsets
      const coordBuckets = new Map<string, TokenVisual[]>();
      for (const tv of tokenVisuals) {
        const isActiveColor = gs ? gs.players[tv.color]?.isActive : true;
        tv.group.visible = isActiveColor;
        if (!isActiveColor) continue;

        const prog = gs ? gs.tokens[tv.color][tv.id].progress : -1;
        const [r, c] = getTokenBoardCoord(tv.color, tv.id, prog);
        const bucketKey = `${r.toFixed(1)},${c.toFixed(1)}`;
        const arr = coordBuckets.get(bucketKey);
        if (arr) arr.push(tv);
        else coordBuckets.set(bucketKey, [tv]);
      }

      for (const tv of tokenVisuals) {
        if (!tv.group.visible) continue;

        const anim = animMapRef.current[`${tv.color}-${tv.id}`];
        const prog = gs ? gs.tokens[tv.color][tv.id].progress : -1;
        const [r, c] = getTokenBoardCoord(tv.color, tv.id, prog);
        const bucket = coordBuckets.get(`${r.toFixed(1)},${c.toFixed(1)}`) || [tv];
        const idxInBucket = bucket.indexOf(tv);
        const countInBucket = bucket.length;

        let offsetX = 0;
        let offsetZ = 0;
        if (countInBucket > 1 && prog >= 0) {
          const angle = (idxInBucket / countInBucket) * Math.PI * 2;
          const rad = CELL_SIZE * 0.22;
          offsetX = Math.cos(angle) * rad;
          offsetZ = Math.sin(angle) * rad;
        }

        if (!anim.isHopping && anim.queue.length > 0) {
          anim.startPos.copy(anim.currentPos);
          anim.targetPos.copy(anim.queue.shift()!);
          anim.hopProgress = 0;
          anim.isHopping = true;
          p.onStepHop?.(anim.queue.length);
        }

        if (anim.isHopping) {
          anim.hopProgress += dt * 5.8;
          if (anim.hopProgress >= 1) {
            anim.hopProgress = 1;
            anim.currentPos.copy(anim.targetPos);
            anim.isHopping = false;
            anim.scaleY = 0.8;
            anim.scaleXZ = 1.14;
            if (anim.queue.length === 0 && prog === 56) {
              spawnBurst(anim.currentPos, COLOR_HEX[tv.color], 22);
            }
          } else {
            const t = anim.hopProgress;
            anim.currentPos.lerpVectors(anim.startPos, anim.targetPos, t);
            anim.currentPos.y = 0.24 + Math.sin(t * Math.PI) * 0.65;
          }
        } else {
          boardCoordToWorld(r, c, _tmpVec);
          _tmpVec.x += offsetX;
          _tmpVec.z += offsetZ;
          anim.currentPos.x = THREE.MathUtils.damp(anim.currentPos.x, _tmpVec.x, 10, dt);
          anim.currentPos.z = THREE.MathUtils.damp(anim.currentPos.z, _tmpVec.z, 10, dt);
          anim.currentPos.y = THREE.MathUtils.damp(anim.currentPos.y, _tmpVec.y, 10, dt);
        }

        anim.scaleY = THREE.MathUtils.damp(anim.scaleY, 1, 12, dt);
        anim.scaleXZ = THREE.MathUtils.damp(anim.scaleXZ, 1, 12, dt);

        const isSelectable =
          showGameplay &&
          p.isHumanTurn &&
          gs?.turnPhase === 'selecting_token' &&
          tv.color === activeTurnColor &&
          gs.validTokenIds.includes(tv.id);

        tv.halo.visible = Boolean(isSelectable);
        if (isSelectable) {
          const pulseScale = 1 + Math.sin(elapsed * 7) * 0.14;
          tv.halo.scale.set(pulseScale, pulseScale, 1);
          tv.group.position.set(
            anim.currentPos.x,
            anim.currentPos.y + Math.abs(Math.sin(elapsed * 5.5)) * 0.14,
            anim.currentPos.z
          );
        } else {
          tv.group.position.copy(anim.currentPos);
        }

        const scaleFactor = countInBucket > 1 && prog >= 0 ? 0.82 : 1.0;
        tv.group.scale.set(
          anim.scaleXZ * scaleFactor,
          anim.scaleY * scaleFactor,
          anim.scaleXZ * scaleFactor
        );
      }

      let anyParticleUpdated = false;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const pt = particles[i];
        if (!pt.active) {
          _dummy.position.set(0, -50, 0);
          _dummy.scale.setScalar(0.001);
          _dummy.updateMatrix();
          particleInstanced.setMatrixAt(i, _dummy.matrix);
          continue;
        }
        anyParticleUpdated = true;
        pt.life += dt;
        if (pt.life >= pt.maxLife) {
          pt.active = false;
          continue;
        }
        pt.vel.y -= 9.5 * dt;
        pt.pos.addScaledVector(pt.vel, dt);
        const s = 1 - pt.life / pt.maxLife;
        _dummy.position.copy(pt.pos);
        _dummy.rotation.set(pt.life * 6, pt.life * 4, 0);
        _dummy.scale.setScalar(s);
        _dummy.updateMatrix();
        particleInstanced.setMatrixAt(i, _dummy.matrix);
        particleInstanced.setColorAt(i, pt.color);
      }
      particleInstanced.instanceMatrix.needsUpdate = true;
      if (anyParticleUpdated && particleInstanced.instanceColor) {
        particleInstanced.instanceColor.needsUpdate = true;
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      envTex.dispose();
      for (const d of disposables) {
        d.dispose();
      }
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      data-testid="ludo-3d-canvas"
      className="fixed inset-0 w-full h-full overflow-hidden"
    />
  );
};
