import * as THREE from 'three/webgpu';
import {
  Fn,
  float,
  hash,
  instanceIndex,
  instancedArray,
  length,
  mix,
  mx_noise_float,
  mx_noise_vec3,
  normalize,
  pass,
  screenUV,
  sin,
  smoothstep,
  time,
  uint,
  uniform,
  uv,
  vec3,
  vec4,
} from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import type { TargetData } from './targets';

export interface AudioLevels {
  low: number;
  mid: number;
  high: number;
  rms: number;
}

export interface FieldConfig {
  canvas: HTMLCanvasElement;
  particleCount: number;
  targetPoints: number;
  targetCount: number;
  reducedMotion: boolean;
  forceWebGL?: boolean;
}

export interface Reaction {
  radial: number;
  vertical: number;
  floor: number;
  z: number;
}

export interface TargetOptions {
  scale?: number;
  wave?: number;
  spin?: number;
  tilt?: number;
  pitch?: number;
  distance?: number;
  bright?: number;
  react?: Partial<Reaction>;
}

export interface Framing {
  offsetX: number;
  offsetY: number;
  zoom: number;
}

interface RegisteredTarget {
  scale: number;
  wave: number;
  spin: number;
  tilt: number;
  pitch: number;
  distance: number;
  bright: number;
  react: Reaction;
}

const NO_REACTION: Reaction = { radial: 0, vertical: 0, floor: -1, z: 0 };
const DEFAULT_POINT_WEIGHT = 0.5;
const DEFAULT_TARGET: RegisteredTarget = { scale: 1, wave: 0, spin: 0.12, tilt: 0.1, pitch: 0, distance: 3.1, bright: 1, react: NO_REACTION };

export class Field {
  readonly backend: 'webgpu' | 'webgl';
  private readonly renderer: THREE.WebGPURenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly sprite: THREE.Sprite;
  private readonly targetPos: THREE.StorageBufferNode<'vec4'>;
  private readonly targetCol: THREE.StorageBufferNode<'vec4'>;
  private readonly targetPosArray: Float32Array;
  private readonly targetColArray: Float32Array;
  private readonly computeInit: THREE.ComputeNode;
  private readonly computeUpdate: THREE.ComputeNode;
  private readonly pipeline: THREE.RenderPipeline;
  private readonly registered = new Map<number, RegisteredTarget>();

  private readonly uPrev = uniform(0, 'uint');
  private readonly uNext = uniform(0, 'uint');
  private readonly uBlend = uniform(1);
  private readonly uEnergy = uniform(0);
  private readonly uScalePrev = uniform(1);
  private readonly uScaleNext = uniform(1);
  private readonly uWavePrev = uniform(0);
  private readonly uWaveNext = uniform(0);
  private readonly uJitter = uniform(0.014);
  private readonly uStiffness = uniform(0.045);
  private readonly uDamping = uniform(0.86);
  private readonly uTurbulence = uniform(0.0022);
  private readonly uNoiseScale = uniform(1.6);
  private readonly uPointer = uniform(new THREE.Vector3(99, 99, 99));
  private readonly uPointerRadius = uniform(0.42);
  private readonly uPointerForce = uniform(0.05);
  private readonly uSize = uniform(0.0085);
  private readonly uBrightness = uniform(0.13);
  private baseBrightness = 0.13;
  private readonly uAlpha = uniform(0.7);
  private readonly uBloom = uniform(0.4);
  private readonly uAudioLow = uniform(0);
  private readonly uAudioHigh = uniform(0);
  private readonly uReactRadial = uniform(0);
  private readonly uReactVertical = uniform(0);
  private readonly uReactFloor = uniform(-1);
  private readonly uReactZ = uniform(0);
  private audioSource: (() => AudioLevels) | null = null;
  private audioBaseLow = 0;
  private audioBaseMid = 0;

  private current = 0;
  private blending = false;
  private blendStart = 0;
  private blendDuration = 1.8;
  private dialTo = 0;
  private dialT = 0;
  private signal = 1;
  private framing: Framing = { offsetX: 0, offsetY: 0, zoom: 1 };
  private targetDistance = DEFAULT_TARGET.distance;
  private spinAngle = 0;
  private pointerNdc = new THREE.Vector2(0, 0);
  private pointerActive = false;
  private idleFrames = 0;
  private readonly timer = new THREE.Timer();
  private readonly world = new THREE.Vector3();
  private disposed = false;

  constructor(readonly config: FieldConfig) {
    const { canvas, particleCount, targetPoints, targetCount } = config;
    this.backend = !config.forceWebGL && 'gpu' in navigator ? 'webgpu' : 'webgl';
    this.renderer = new THREE.WebGPURenderer({ canvas, antialias: false, forceWebGL: this.backend === 'webgl' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.backend === 'webgpu' ? 1.5 : 1));
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    if (this.backend === 'webgl') {
      this.baseBrightness = 0.3;
      this.uBrightness.value = 0.3;
      this.uSize.value = 0.011;
    }

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
    this.camera.position.set(0, 0, DEFAULT_TARGET.distance);
    this.scene.background = new THREE.Color(0x131110);

    this.targetPosArray = new Float32Array(targetPoints * targetCount * 4);
    this.targetColArray = new Float32Array(targetPoints * targetCount * 4);
    this.targetPos = instancedArray(this.targetPosArray, 'vec4');
    this.targetCol = instancedArray(this.targetColArray, 'vec4');
    if (this.backend === 'webgl') {
      this.targetPos.setPBO(true);
      this.targetCol.setPBO(true);
    }

    const positions = instancedArray(particleCount, 'vec3');
    const velocities = instancedArray(particleCount, 'vec3');
    const colors = instancedArray(particleCount, 'vec3');
    const hotness = instancedArray(particleCount, 'float');

    const M = uint(targetPoints);

    this.computeInit = Fn(() => {
      const i = instanceIndex;
      const position = positions.element(i);
      const color = colors.element(i);
      const u = hash(i.add(uint(3)));
      const v = hash(i.add(uint(17)));
      const w = hash(i.add(uint(29)));
      const theta = u.mul(6.2831853);
      const z = v.mul(2).sub(1);
      const r = float(1).sub(z.mul(z)).sqrt().mul(w.mul(0.6).add(1.2));
      position.assign(vec3(r.mul(theta.cos()), z.mul(1.6), r.mul(theta.sin())));
      color.assign(vec3(0.5, 0.42, 0.3));
    })().compute(particleCount);

    const uPrev = this.uPrev;
    const uNext = this.uNext;
    const uBlend = this.uBlend;
    const uEnergy = this.uEnergy;
    const uScalePrev = this.uScalePrev;
    const uScaleNext = this.uScaleNext;
    const uWavePrev = this.uWavePrev;
    const uWaveNext = this.uWaveNext;
    const uJitter = this.uJitter;
    const uStiffness = this.uStiffness;
    const uDamping = this.uDamping;
    const uTurbulence = this.uTurbulence;
    const uNoiseScale = this.uNoiseScale;
    const uPointer = this.uPointer;
    const uPointerRadius = this.uPointerRadius;
    const uPointerForce = this.uPointerForce;
    const uAudioLow = this.uAudioLow;
    const uAudioHigh = this.uAudioHigh;
    const uReactRadial = this.uReactRadial;
    const uReactVertical = this.uReactVertical;
    const uReactFloor = this.uReactFloor;
    const uReactZ = this.uReactZ;
    const targetPos = this.targetPos;
    const targetCol = this.targetCol;

    this.computeUpdate = Fn(() => {
      const i = instanceIndex;
      const m = i.mod(M);
      const offsetPrev = uPrev.mul(M).add(m);
      const offsetNext = uNext.mul(M).add(m);
      const pA = targetPos.element(offsetPrev).xyz;
      const pB = targetPos.element(offsetNext).xyz;
      const cA = targetCol.element(offsetPrev).xyz;
      const cB = targetCol.element(offsetNext).xyz;
      const ease = smoothstep(0, 1, uBlend);
      const jitter = vec3(hash(i.add(uint(11))), hash(i.add(uint(23))), hash(i.add(uint(37)))).sub(0.5).mul(uJitter);
      const goalRaw = mix(pA.mul(uScalePrev), pB.mul(uScaleNext), ease);
      const hot = mix(targetCol.element(offsetPrev).w, targetCol.element(offsetNext).w, ease);
      hotness.element(i).assign(hot);
      const waveAmp = mix(uWavePrev, uWaveNext, ease);
      const wave = sin(goalRaw.x.mul(5.2).sub(time.mul(2.4))).mul(waveAmp.mul(float(1).add(uAudioLow.mul(1.4)))).mul(float(1).sub(goalRaw.z.abs().mul(0.8)));
      const reactNoise = mx_noise_float(goalRaw.mul(2.4).add(vec3(time.mul(0.35), time.mul(0.2), 0))).mul(0.5).add(0.5);
      const audioDrive = uAudioLow.mul(0.7).add(uAudioHigh.mul(0.9)).mul(hot.mul(1.2));
      const radialDir = normalize(goalRaw.add(vec3(0.0001, 0.0002, 0.0003)));
      const radial = radialDir.mul(audioDrive.mul(uReactRadial).mul(reactNoise.mul(0.7).add(0.3)));
      const height = goalRaw.y.sub(uReactFloor).max(0);
      const vertical = vec3(0, height.mul(audioDrive).mul(uReactVertical).mul(reactNoise.mul(0.8).add(0.2)), 0);
      const forward = vec3(0, 0, audioDrive.mul(uReactZ).mul(reactNoise.mul(0.5).add(0.5)));
      const goal = goalRaw.add(vec3(0, wave, 0)).add(radial).add(vertical).add(forward).add(jitter);

      const position = positions.element(i);
      const velocity = velocities.element(i);
      const color = colors.element(i);

      velocity.addAssign(goal.sub(position).mul(uStiffness));
      const turbulence = mx_noise_vec3(position.mul(uNoiseScale).add(vec3(time.mul(0.12), time.mul(0.05), time.mul(0.08))));
      velocity.addAssign(turbulence.mul(uTurbulence.add(uEnergy.mul(0.085))));
      const away = position.sub(uPointer);
      const dist = length(away);
      const push = smoothstep(uPointerRadius, float(0), dist).mul(uPointerForce);
      velocity.addAssign(away.div(dist.add(0.001)).mul(push));
      velocity.mulAssign(uDamping);
      position.addAssign(velocity);

      const goalColor = mix(cA, cB, ease);
      color.assign(mix(color, goalColor, 0.07));
    })().compute(particleCount);

    const material = new THREE.SpriteNodeMaterial();
    material.positionNode = positions.toAttribute();
    const glowAttr = hotness.toAttribute();
    material.colorNode = vec4(colors.toAttribute().xyz.mul(this.uBrightness.mul(float(1).add(this.uAudioHigh.mul(glowAttr).mul(1.6)))), 1);
    const d = length(uv().sub(0.5));
    material.opacityNode = float(1).sub(smoothstep(0.1, 0.5, d)).mul(this.uAlpha);
    material.scaleNode = this.uSize.mul(hash(instanceIndex.add(uint(5))).mul(0.9).add(0.55)).mul(float(1).add(this.uAudioHigh.mul(glowAttr).mul(0.7)));
    material.transparent = true;
    material.depthWrite = false;
    material.depthTest = false;
    material.blending = THREE.AdditiveBlending;

    this.sprite = new THREE.Sprite(material);
    this.sprite.count = particleCount;
    this.sprite.frustumCulled = false;
    this.scene.add(this.sprite);

    this.pipeline = new THREE.RenderPipeline(this.renderer);
    const scenePass = pass(this.scene, this.camera);
    const sceneColor = scenePass.getTextureNode();
    const glow = bloom(sceneColor, this.uBloom, 0.5, 0.55);
    const uBloomStrength = this.uBloom;
    this.pipeline.outputNode = Fn(() => {
      const base = sceneColor.rgb.add(glow.rgb.mul(uBloomStrength.greaterThan(0.001).select(1, 0))).toVar();
      const centered = screenUV.sub(0.5);
      const vignette = float(1).sub(length(centered).mul(0.55));
      const grain = hash(screenUV.x.mul(1920).add(screenUV.y.mul(1080 * 1920)).add(time.mul(60).floor())).sub(0.5).mul(0.05);
      const lit = base.mul(vignette);
      return vec4(lit.add(grain.mul(lit.add(0.06))), 1);
    })();
  }

  async init(): Promise<void> {
    await this.renderer.init();
    this.renderer.compute(this.computeInit);
    this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  setTarget(index: number, data: TargetData, options: TargetOptions = {}): void {
    const { targetPoints, targetCount } = this.config;
    if (index < 0 || index >= targetCount) throw new Error(`field: target ${index} out of range`);
    const count = Math.min(targetPoints, data.positions.length / 3);
    const base = index * targetPoints * 4;
    for (let i = 0; i < targetPoints; i++) {
      const src = (i % count) * 3;
      const dst = base + i * 4;
      this.targetPosArray[dst] = data.positions[src];
      this.targetPosArray[dst + 1] = data.positions[src + 1];
      this.targetPosArray[dst + 2] = data.positions[src + 2];
      this.targetColArray[dst] = data.colors[src];
      this.targetColArray[dst + 1] = data.colors[src + 1];
      this.targetColArray[dst + 2] = data.colors[src + 2];
      this.targetColArray[dst + 3] = data.weights ? data.weights[i % count] : DEFAULT_POINT_WEIGHT;
    }
    this.targetPos.value.needsUpdate = true;
    this.targetCol.value.needsUpdate = true;
    this.registered.set(index, { ...DEFAULT_TARGET, ...options, react: { ...NO_REACTION, ...options.react } });
    if (index === this.current) this.applyTargetUniforms();
  }

  hasTarget(index: number): boolean {
    return this.registered.has(index);
  }

  tuneTo(index: number, immediate = false): void {
    if (!this.registered.has(index)) return;
    if (index === this.current && !this.blending) return;
    const from = this.blending ? this.blendProgress() > 0.5 ? this.uNext.value : this.uPrev.value : this.current;
    this.uPrev.value = from;
    this.uNext.value = index;
    this.uScalePrev.value = this.registered.get(from)?.scale ?? 1;
    this.uWavePrev.value = this.registered.get(from)?.wave ?? 0;
    this.current = index;
    this.dialTo = index;
    this.dialT = 1;
    this.signal = 1;
    this.applyTargetUniforms();
    if (immediate || this.config.reducedMotion) {
      this.uBlend.value = 1;
      this.blending = false;
      return;
    }
    this.blending = true;
    this.blendStart = performance.now();
    this.uBlend.value = 0;
  }

  setDial(from: number, to: number, t: number, signal: number, fallback: number): void {
    const a = this.registered.has(from) ? from : fallback;
    const b = this.registered.has(to) ? to : fallback;
    if (!this.registered.has(a) || !this.registered.has(b)) return;
    this.blending = false;
    this.uPrev.value = a;
    this.uNext.value = b;
    this.uScalePrev.value = this.registered.get(a)?.scale ?? 1;
    this.uWavePrev.value = this.registered.get(a)?.wave ?? 0;
    this.uScaleNext.value = this.registered.get(b)?.scale ?? 1;
    this.uWaveNext.value = this.registered.get(b)?.wave ?? 0;
    this.uBlend.value = this.config.reducedMotion ? (t < 0.5 ? 0 : 1) : t;
    this.current = a;
    this.dialTo = b;
    this.dialT = t;
    this.signal = signal;
  }

  get currentTarget(): number {
    return this.current;
  }

  setFraming(framing: Framing): void {
    this.framing = framing;
  }

  setPointer(clientX: number, clientY: number): void {
    const rect = this.config.canvas.getBoundingClientRect();
    this.pointerNdc.set(((clientX - rect.left) / rect.width) * 2 - 1, -(((clientY - rect.top) / rect.height) * 2 - 1));
    this.pointerActive = true;
    this.idleFrames = 0;
  }

  clearPointer(): void {
    this.pointerActive = false;
  }

  pulse(strength = 1): void {
    this.uEnergy.value = Math.max(this.uEnergy.value, strength);
  }

  setAudioSource(source: (() => AudioLevels) | null): void {
    this.audioSource = source;
  }

  setBrightness(value: number): void {
    this.baseBrightness = value;
  }

  debugSet(params: Partial<Record<'size' | 'brightness' | 'alpha' | 'bloom' | 'jitter' | 'stiffness' | 'damping' | 'turbulence' | 'exposure', number>>): void {
    if (params.size !== undefined) this.uSize.value = params.size;
    if (params.brightness !== undefined) this.baseBrightness = params.brightness;
    if (params.alpha !== undefined) this.uAlpha.value = params.alpha;
    if (params.bloom !== undefined) this.uBloom.value = params.bloom;
    if (params.jitter !== undefined) this.uJitter.value = params.jitter;
    if (params.stiffness !== undefined) this.uStiffness.value = params.stiffness;
    if (params.damping !== undefined) this.uDamping.value = params.damping;
    if (params.turbulence !== undefined) this.uTurbulence.value = params.turbulence;
    if (params.exposure !== undefined) this.renderer.toneMappingExposure = params.exposure;
  }

  resize(): void {
    const { canvas } = this.config;
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  dispose(): void {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.renderer.dispose();
  }

  private applyTargetUniforms(): void {
    const target = this.registered.get(this.current) ?? DEFAULT_TARGET;
    this.uScaleNext.value = target.scale;
    this.uWaveNext.value = target.wave;
    this.targetDistance = target.distance;
  }

  get dialTarget(): number {
    return this.dialTo;
  }

  private blendProgress(): number {
    return Math.min(1, (performance.now() - this.blendStart) / (this.blendDuration * 1000));
  }

  private frame(): void {
    if (this.disposed) return;
    this.timer.update();
    const dt = Math.min(0.05, this.timer.getDelta());
    if (this.blending) {
      const t = this.blendProgress();
      this.uBlend.value = t;
      this.uEnergy.value = Math.max(this.uEnergy.value, Math.sin(t * Math.PI));
      if (t >= 1) {
        this.blending = false;
        this.uPrev.value = this.uNext.value;
        this.uScalePrev.value = this.uScaleNext.value;
        this.uWavePrev.value = this.uWaveNext.value;
      }
    }
    const levels = this.audioSource?.();
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
    const lowNorm = levels ? clamp01((levels.low - 0.3) / 0.65) : 0;
    const midNorm = levels ? clamp01((levels.mid - 0.2) / 0.6) : 0;
    const settle = Math.min(1, dt * 0.7);
    this.audioBaseLow += (lowNorm - this.audioBaseLow) * settle;
    this.audioBaseMid += (midNorm - this.audioBaseMid) * settle;
    const wantLow = 0.3 * lowNorm + 0.7 * clamp01((lowNorm - this.audioBaseLow) * 4);
    const wantBeat = clamp01((midNorm - this.audioBaseMid) * 4);
    const follow = (current: number, want: number) => current + (want - current) * Math.min(1, dt * (want > current ? 12 : 4));
    this.uAudioLow.value = follow(this.uAudioLow.value, wantLow);
    this.uAudioHigh.value = follow(this.uAudioHigh.value, wantBeat);
    this.uEnergy.value *= Math.pow(0.02, dt);
    if (this.uEnergy.value < 0.002) this.uEnergy.value = 0;
    if (!this.config.reducedMotion) this.uEnergy.value = Math.max(this.uEnergy.value, (1 - this.signal) * 0.8);

    const from = this.registered.get(this.current) ?? DEFAULT_TARGET;
    const to = this.registered.get(this.dialTo) ?? from;
    const mixT = this.blending ? 1 : this.dialT;
    const m = (a: number, b: number) => a + (b - a) * mixT;
    const target: RegisteredTarget = {
      scale: m(from.scale, to.scale),
      wave: m(from.wave, to.wave),
      spin: m(from.spin, to.spin),
      tilt: m(from.tilt, to.tilt),
      pitch: m(from.pitch, to.pitch),
      distance: m(from.distance, to.distance),
      bright: m(from.bright, to.bright) * (0.45 + 0.55 * this.signal),
      react: {
        radial: m(from.react.radial, to.react.radial),
        vertical: m(from.react.vertical, to.react.vertical),
        floor: m(from.react.floor, to.react.floor),
        z: m(from.react.z, to.react.z),
      },
    };
    const motion = this.config.reducedMotion ? 0 : 1;
    this.spinAngle += dt * motion;
    const spin = target.spin > 0.5 ? this.spinAngle * target.spin : Math.sin(this.spinAngle * 0.5) * target.spin;
    const px = this.pointerActive ? this.pointerNdc.x : 0;
    const py = this.pointerActive ? this.pointerNdc.y : 0;
    const wantX = this.framing.offsetX;
    const wantY = this.framing.offsetY;
    const k = 1 - Math.pow(0.001, dt);
    this.sprite.position.x += (wantX - this.sprite.position.x) * k;
    this.sprite.position.y += (wantY - this.sprite.position.y) * k;
    this.sprite.rotation.y += (spin + px * 0.35 * motion - this.sprite.rotation.y) * k;
    this.sprite.rotation.x += (target.pitch - py * target.tilt * motion - this.sprite.rotation.x) * k;
    this.camera.position.z += ((this.blending ? this.targetDistance : target.distance) * this.framing.zoom - this.camera.position.z) * k;
    this.uBrightness.value += (this.baseBrightness * target.bright - this.uBrightness.value) * k;
    this.uReactRadial.value += (target.react.radial - this.uReactRadial.value) * k;
    this.uReactVertical.value += (target.react.vertical - this.uReactVertical.value) * k;
    this.uReactFloor.value += (target.react.floor - this.uReactFloor.value) * k;
    this.uReactZ.value += (target.react.z - this.uReactZ.value) * k;

    if (this.pointerActive && motion) {
      const fovY = Math.tan((this.camera.fov * Math.PI) / 360) * this.camera.position.z;
      this.world.set(this.pointerNdc.x * fovY * this.camera.aspect, this.pointerNdc.y * fovY, 0);
      this.sprite.updateMatrixWorld();
      this.sprite.worldToLocal(this.world);
      this.uPointer.value.copy(this.world);
      if (++this.idleFrames > 240) this.pointerActive = false;
    } else {
      this.uPointer.value.set(99, 99, 99);
    }

    this.renderer.compute(this.computeUpdate);
    this.pipeline.render();
  }
}
