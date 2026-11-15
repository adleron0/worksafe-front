/*
 * Camada de foil holográfico (WebGL2) dos certificados de destaque.
 *
 * Adaptada do componente HoloCard do React Bits
 * (https://reactbits.dev/components/holo-card — github.com/DavidHDev/react-bits).
 * Copyright (c) 2026 David Haz — MIT + Commons Clause License Condition v1.0.
 * Uso permitido como parte de um aplicativo; o componente não é redistribuído
 * nem vendido em si.
 *
 * Mudanças em relação ao original:
 * - roda por cima da imagem do certificado dentro do CertificateStage, que já
 *   cuida de inclinação/flip/zoom; a luz vem da posição do ponteiro do palco
 *   (--mx/--my/--hover/--rx/--ry no elemento [data-ws-tilt]);
 * - a composição final é para papel branco: o original combina em "screen"
 *   (clareia), que some no branco; aqui o foil TINGE (multiplica) e os brilhos
 *   substituem a cor — aparece no papel sem tirar a leitura do texto;
 * - sem ponteiro (celular), a luz passeia sozinha; reduced-motion = parado.
 */
import React, { useEffect, useRef } from "react";

/** Padronagem do centro (ids iguais aos do banco). */
export type FoilPattern =
  | "rosetas" | "estrelas" | "estilhacos" | "bolhas" | "espiral"
  | "glitter" | "arco_iris" | "gravado" | "nenhum";

// índice no shader
const PATTERNS: FoilPattern[] = [
  "rosetas", "estrelas", "estilhacos", "bolhas", "arco_iris", "espiral", "glitter", "gravado", "nenhum",
];

export interface FoilSettings {
  pattern: FoilPattern;
  /** Cor do metal (hex). */
  foil: string;
  /** 0 = furta-cor (arco-íris), 1 = metal (ouro/prata). */
  metal: number;
  /** 0–1: quanto o foil tinge o papel. */
  intensity: number;
  /** 0–1: brilhos na moldura. */
  edge: number;
  /** Largura da moldura (fração da largura) onde ficam os brilhos. */
  frame: number;
  /** Escala do padrão. */
  scale: number;
}

const VERTEX = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uArt;
uniform vec2 uSize;
uniform float uAspect;
uniform vec2 uTilt;
uniform vec2 uLight;
uniform float uDistance;
uniform int uPreset;
uniform float uIntensity;
uniform float uScale;
uniform float uEdge;
uniform float uFrame;
uniform vec3 uFoil;
uniform float uMetal;
uniform float uHover;
out vec4 outColor;
const float TAU = 6.28318530718;
struct Foil { float mask; float angle; float jitter; vec2 facet; };
float hash(vec2 p) { p = fract(p * vec2(234.34, 435.345)); p += dot(p, p + 34.23); return fract(p.x * p.y); }
vec2 hash2(vec2 p) { return vec2(hash(p), hash(p + 17.31)); }
vec3 hue(float t) {
  t = abs(fract(t * 0.5) * 2.0 - 1.0);
  vec3 c = mix(vec3(0.1, 0.25, 1.0), vec3(0.0, 0.85, 1.0), smoothstep(0.0, 0.25, t));
  c = mix(c, vec3(0.25, 1.0, 0.2), smoothstep(0.25, 0.45, t));
  c = mix(c, vec3(1.0, 0.92, 0.05), smoothstep(0.45, 0.65, t));
  c = mix(c, vec3(1.0, 0.45, 0.05), smoothstep(0.65, 0.85, t));
  return mix(c, vec3(0.95, 0.12, 0.3), smoothstep(0.85, 1.0, t));
}
Foil bursts(vec2 p) {
  vec2 q = mat2(0.7071068, 0.7071068, -0.7071068, 0.7071068) * (p - vec2(0.5, 0.5 * uAspect)) / (0.283 / uScale);
  vec2 d = fract(q) - 0.5;
  float u = length(d) / 0.49;
  float angle = atan(d.y, d.x);
  if (u < 0.12) {
    float ring = min(floor(u / 0.045 + 0.5), 2.0);
    float count = max(1.0, ring * 6.0);
    float spot = (floor(angle / TAU * count) + 0.5) / count * TAU;
    vec2 dt = vec2(cos(spot), sin(spot)) * ring * 0.045;
    return Foil(smoothstep(0.024, 0.012, length(d / 0.49 - dt)), angle, 0.5, vec2(0.0));
  }
  bool inner = u < 0.66;
  float slot = angle / TAU * (inner ? 56.0 : 72.0);
  bool shifted = mod(floor(slot), 2.0) > 0.5;
  vec2 band = inner ? (shifted ? vec2(0.45, 0.61) : vec2(0.33, 0.49)) : (shifted ? vec2(0.84, 0.99) : vec2(0.7, 0.85));
  float across = abs(u - (band.x + band.y) * 0.5) / ((band.y - band.x) * 0.5);
  float along = abs(fract(slot) - 0.5) * 2.0;
  float width = inner ? 0.72 : 0.6;
  return Foil(smoothstep(1.0, 0.78, across) * smoothstep(width, width - 0.2, along), angle, 0.5, vec2(0.0));
}
Foil stars(vec2 p) {
  Foil best = Foil(0.0, 0.0, 0.0, vec2(0.0));
  vec2 g = p / (0.08 / uScale);
  vec2 base = floor(g);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 id = base + vec2(float(i), float(j));
    float pick = hash(id + 1.3);
    vec2 d = g - (id + 0.5 + (hash2(id) - 0.5) * 0.55);
    float m = smoothstep(0.07, 0.035, length(d));
    if (pick < 0.62) {
      float size = mix(0.16, 0.5, pow(hash(id + 9.0), 1.8));
      float sector = TAU / (pick < 0.3 ? 4.0 : 5.0);
      float k = abs(fract((atan(d.y, d.x) + hash(id + 4.0) * TAU) / sector) - 0.5) * 2.0;
      float edge = size * mix(1.0, 0.36, pow(k, 0.6));
      m = smoothstep(edge, edge * 0.8, length(d));
    }
    if (m > best.mask) best = Foil(m, hash(id + 6.0) * TAU, hash(id + 8.0), (hash2(id + 2.0) - 0.5) * 0.6);
  }
  return best;
}
Foil shards(vec2 p) {
  vec2 g = p * 19.0 * uScale;
  vec2 base = floor(g);
  float best = 9.0; float second = 9.0; vec2 id = base;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 cell = base + vec2(float(i), float(j));
    float d = length(cell + 0.08 + hash2(cell) * 0.84 - g);
    if (d < best) { second = best; best = d; id = cell; } else if (d < second) { second = d; }
  }
  float crack = smoothstep(0.015, 0.07, second - best);
  float shine = 0.25 + 0.75 * pow(hash(id + 7.7), 2.0);
  return Foil((0.2 + 0.8 * crack) * shine, hash(id + 3.17) * TAU, hash(id + 11.73), (hash2(id + 5.0) - 0.5) * 0.5);
}
Foil cosmos(vec2 p) {
  Foil best = Foil(0.0, 0.0, 0.0, vec2(0.0));
  vec2 g = p / (0.16 / uScale);
  vec2 base = floor(g);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 id = base + vec2(float(i), float(j));
    vec2 d = g - (id + 0.5 + (hash2(id) - 0.5) * 0.7);
    float size = mix(0.16, 0.52, hash(id + 2.0));
    float r = length(d);
    float m = max(smoothstep(0.05, 0.0, abs(r - size)), smoothstep(size, size - 0.04, r) * 0.22);
    if (m > best.mask) best = Foil(m, hash(id + 6.0) * TAU + atan(d.y, d.x) * 0.5, hash(id + 1.0), (hash2(id + 4.0) - 0.5) * 0.5);
  }
  vec2 fine = p / (0.035 / uScale);
  vec2 cell = floor(fine);
  float dots = smoothstep(0.2, 0.1, length(fine - cell - 0.5 - (hash2(cell + 9.0) - 0.5) * 0.6)) * step(0.55, hash(cell + 2.0));
  if (dots > best.mask) best = Foil(dots, hash(cell) * TAU, hash(cell + 3.0), (hash2(cell + 7.0) - 0.5) * 0.6);
  return best;
}
Foil rainbow(vec2 p) { return Foil(0.86 + 0.14 * hash(floor(p * 700.0 * uScale)), 0.2, 0.5, vec2(0.0)); }
Foil swirl(vec2 p) {
  vec2 d = p - vec2(0.5, 0.42 * uAspect);
  float angle = atan(d.y, d.x);
  float rays = 0.55 + 0.45 * smoothstep(0.3, 0.7, abs(fract(angle / TAU * 60.0 * uScale) - 0.5) * 2.0);
  return Foil(rays, angle, length(d), vec2(0.0));
}
Foil glitter(vec2 p) {
  vec2 g = p * 72.0 * uScale;
  vec2 cell = floor(g);
  float size = mix(0.18, 0.4, hash(cell + 3.0));
  float m = smoothstep(size, size * 0.55, length(fract(g) - 0.5 - (hash2(cell) - 0.5) * 0.5)) * step(0.25, hash(cell + 5.0));
  return Foil(m, hash(cell + 7.0) * TAU, hash(cell + 9.0), (hash2(cell + 11.0) - 0.5) * 0.9);
}
// gravado: só as linhas finas (sem os flocos do original)
Foil gold(vec2 p) {
  float etch = 0.55 + 0.45 * smoothstep(0.2, 0.8, abs(fract((p.x * 0.6 + p.y) * 140.0 * uScale) - 0.5) * 2.0);
  return Foil(etch, 0.9, 0.4, vec2(0.0));
}
// distância de cada forma (d no espaço da célula, r = tamanho)
float shapeDist(vec2 d, float kind, float r) {
  vec2 a = abs(d);
  if (kind < 1.0) return length(d) - r;                                   // ponto
  if (kind < 2.0) return (a.x + a.y) - r;                                 // losango
  if (kind < 3.0) return max(a.x * 0.866 + a.y * 0.5, a.y) - r;           // hexágono
  float ang = atan(d.y, d.x);
  float n = kind < 4.0 ? 4.0 : 5.0;                                       // estrela de 4 / 5 pontas
  float k = abs(fract(ang / TAU * n) - 0.5) * 2.0;
  return length(d) - r * mix(0.38, 1.0, pow(k, 2.2));
}
// uma camada de brilhos: densidade, formas, tamanhos e giros sorteados
vec3 sparkleLayer(vec2 p, float grid, float seed, vec3 halfway, vec2 sweep) {
  vec2 g = p * grid;
  vec2 cell = floor(g);
  float present = step(0.58, hash(cell + seed));
  vec2 d = fract(g) - 0.5 - (hash2(cell + seed + 1.0) - 0.5) * 0.5;
  float spin = hash(cell + seed + 3.0) * TAU;
  d = mat2(cos(spin), -sin(spin), sin(spin), cos(spin)) * d;
  float kind = floor(hash(cell + seed + 5.0) * 5.0);
  float r = mix(0.1, 0.36, pow(hash(cell + seed + 2.0), 1.6));
  float piece = smoothstep(0.02, -0.02, shapeDist(d, kind, r)) * present;
  vec3 facet = normalize(vec3((hash2(cell + seed + 6.0) - 0.5) * 0.9, 1.0));
  float flash = pow(max(dot(facet, halfway), 0.0), 6.0);
  vec3 tint = hue(dot(sweep, vec2(cos(spin), sin(spin))) * 1.2 + dot(sweep, vec2(0.8, 0.6)) * 0.8 + hash(cell + seed + 8.0) * 0.5);
  tint = mix(tint, mix(uFoil, vec3(1.0), 0.25 * flash), uMetal * 0.75);
  return piece * tint * (0.35 + 1.5 * flash);
}
vec3 sparkles(vec2 p, vec3 halfway, vec2 sweep, float awake) {
  vec3 big = sparkleLayer(p, 34.0, 0.0, halfway, sweep);
  vec3 small = sparkleLayer(p, 88.0, 40.0, halfway, sweep);
  return max(big, small * 0.85) * awake;
}
void main() {
  vec2 uv = vec2(gl_FragCoord.x / uSize.x, 1.0 - gl_FragCoord.y / uSize.y);
  vec2 p = vec2(uv.x, uv.y * uAspect);
  vec2 center = vec2(0.5, 0.5 * uAspect);
  vec4 sampled = texture(uArt, uv);
  vec3 art = pow(sampled.rgb, vec3(2.2));
  mat3 rx = mat3(1.0, 0.0, 0.0, 0.0, cos(uTilt.x), sin(uTilt.x), 0.0, -sin(uTilt.x), cos(uTilt.x));
  mat3 ry = mat3(cos(uTilt.y), 0.0, -sin(uTilt.y), 0.0, 1.0, 0.0, sin(uTilt.y), 0.0, cos(uTilt.y));
  mat3 turn = rx * ry;
  vec3 world = turn * vec3(p - center, 0.0);
  vec3 view = normalize(transpose(turn) * (vec3(0.0, 0.0, uDistance) - world));
  vec3 lamp = vec3((uLight - 0.5) * vec2(1.1, 1.1 * uAspect), 0.9);
  vec3 light = normalize(transpose(turn) * (lamp - world));
  vec3 halfway = normalize(light + view);
  vec2 sweep = light.xy + view.xy;
  float sheen = pow(max(halfway.z, 0.0), 10.0);
  // moldura: faixa na borda onde ficam os brilhos
  vec2 q = abs(p - center) - center;
  float inside = -max(q.x, q.y);
  float frame = 1.0 - smoothstep(uFrame - 0.002, uFrame + 0.002, inside);
  Foil f;
  if (uPreset == 0) f = bursts(p);
  else if (uPreset == 1) f = stars(p);
  else if (uPreset == 2) f = shards(p);
  else if (uPreset == 3) f = cosmos(p);
  else if (uPreset == 4) f = rainbow(p);
  else if (uPreset == 5) f = swirl(p);
  else if (uPreset == 6) f = glitter(p);
  else if (uPreset == 7) f = gold(p);
  else f = Foil(0.0, 0.0, 0.0, vec2(0.0));
  vec3 metal = uFoil;
  vec4 look = uPreset == 0 ? vec4(0.25, 1.9, 0.12, 1.0)
    : uPreset == 1 ? vec4(0.6, 1.4, 0.3, 1.0)
    : uPreset == 2 ? vec4(0.9, 0.9, 0.6, 0.5)
    : uPreset == 3 ? vec4(0.7, 1.2, 0.35, 0.85)
    : uPreset == 4 ? vec4(0.0, 2.2, 0.0, 0.45)
    : uPreset == 5 ? vec4(1.6, 0.3, 0.0, 0.4)
    : uPreset == 6 ? vec4(0.9, 1.0, 0.6, 1.0)
    : vec4(0.3, 1.0, 0.2, 0.95);
  vec2 dir = vec2(cos(f.angle), sin(f.angle));
  float phase = dot(sweep, dir) * look.x + dot(sweep, vec2(0.8, 0.6)) * look.y + f.jitter * look.z;
  float spoke = 1.0;
  if (uPreset == 5) {
    float facing = dot(normalize(sweep + 0.0001), dir);
    phase = f.jitter * 2.4 + facing * 0.6 + length(sweep) * 0.8;
    spoke = 0.3 + 0.7 * smoothstep(0.25, 0.95, abs(facing));
  }
  vec3 tint = hue(phase);
  // tema metal (ouro/prata): a cor do metal com um toque do furta-cor
  tint = mix(tint, metal, uMetal * 0.72);
  float glint = pow(max(dot(normalize(vec3(f.facet, 1.0)), halfway), 0.0), 24.0) * step(0.001, length(f.facet));
  bool layered = uPreset == 2 || uPreset == 4 || uPreset == 5 || uPreset == 7;
  float tilted = smoothstep(0.02, 0.21, length(sin(uTilt)));
  float awake = mix(0.35, 1.0, max(tilted, uHover));
  float strength = uIntensity * f.mask * (1.0 - frame) * awake;
  float band = uPreset == 5 ? spoke : layered ? 0.25 + 0.75 * smoothstep(0.3, 0.95, 0.5 + 0.5 * cos(phase * TAU * 0.5 + 1.3)) : 1.0;
  // papel branco: o foil tinge (multiplica) — "screen" sumiria no branco
  float amount = clamp(strength * look.w * band, 0.0, 1.0);
  vec3 dye = mix(vec3(1.0), mix(tint, vec3(1.0), 0.18) * (0.9 + 0.2 * sheen), amount);
  vec3 color = art * dye;
  // reflexo pontual dos flocos: troca a cor pelo brilho do metal/furta-cor
  color = mix(color, mix(tint, metal, 0.5) * 1.05, clamp(glint * strength * 1.4, 0.0, 0.85));
  // brilhos na moldura
  vec3 sp = sparkles(p, halfway, sweep, awake) * uEdge * frame;
  float spm = clamp(max(sp.r, max(sp.g, sp.b)), 0.0, 1.0);
  color = mix(color, sp / max(spm, 0.001), spm * 0.8);
  color = pow(clamp(color, 0.0, 1.0), vec3(1.0 / 2.2));
  outColor = vec4(color, 1.0);
}
`;

const parseColor = (value: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{6})$/i.exec(value.trim());
  if (!m) return [0.78, 0.8, 0.84];
  const n = parseInt(m[1], 16);
  return [16, 8, 0].map((s) => Math.pow(((n >> s) & 255) / 255, 2.2)) as [number, number, number];
};

const compile = (gl: WebGL2RenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  console.warn("FoilShaderLayer:", gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
};

export const FoilShaderLayer: React.FC<{
  /** Imagem do certificado (precisa de CORS para virar textura). */
  src: string;
  settings: FoilSettings;
  /** Falso esconde (ex.: ampliado — aí vale a imagem nítida de impressão). */
  active?: boolean;
}> = ({ src, settings, active = true }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [ready, setReady] = React.useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!gl) return; // sem WebGL2: fica só o brilho em volta do cartão
    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    if (!vertex || !fragment) return;
    const program = gl.createProgram()!;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.bindAttribLocation(program, 0, "position");
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const texture = gl.createTexture();
    const u = (name: string) => gl.getUniformLocation(program, name);
    const U = {
      art: u("uArt"), size: u("uSize"), aspect: u("uAspect"), tilt: u("uTilt"), light: u("uLight"),
      distance: u("uDistance"), preset: u("uPreset"), intensity: u("uIntensity"), scale: u("uScale"),
      edge: u("uEdge"), frame: u("uFrame"), foil: u("uFoil"), metal: u("uMetal"), hover: u("uHover"),
    };

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const tiltEl = canvas.closest("[data-ws-tilt]") as HTMLElement | null;
    const num = (name: string, fallback: number) => {
      const v = parseFloat(tiltEl?.style.getPropertyValue(name) ?? "");
      return Number.isFinite(v) ? v : fallback;
    };
    let textureReady = false;
    let alive = true;
    let visible = true;
    let raf = 0;
    let clock = Math.random() * 40;
    let last = performance.now();
    const state = { lx: 0.36, ly: 0.26, tx: 0, ty: 0 };

    const draw = () => {
      if (!textureReady) return;
      const s = settingsRef.current;
      const w = canvas.width;
      const h = canvas.height;
      gl.viewport(0, 0, w, h);
      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(U.art, 0);
      gl.uniform2f(U.size, w, h);
      gl.uniform1f(U.aspect, h / w);
      gl.uniform2f(U.tilt, (state.tx * Math.PI) / 180, (state.ty * Math.PI) / 180);
      gl.uniform2f(U.light, state.lx, state.ly);
      gl.uniform1f(U.distance, 1100 / Math.max(1, canvas.clientWidth));
      gl.uniform1i(U.preset, Math.max(0, PATTERNS.indexOf(s.pattern)));
      gl.uniform1f(U.metal, s.metal);
      gl.uniform1f(U.intensity, s.intensity);
      gl.uniform1f(U.scale, s.scale);
      gl.uniform1f(U.edge, s.edge);
      gl.uniform1f(U.frame, s.frame);
      const [r, g, b] = parseColor(s.foil);
      gl.uniform3f(U.foil, r, g, b);
      gl.uniform1f(U.hover, num("--hover", 0));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const tick = (now: number) => {
      raf = 0;
      if (!alive) return;
      const dt = Math.min(1 / 30, (now - last) / 1000);
      last = now;
      const hover = num("--hover", 0) > 0.5;
      let lx: number, ly: number, tx: number, ty: number;
      if (hover) {
        // luz no ponteiro; inclinação = a do palco
        lx = num("--mx", 0.5);
        ly = num("--my", 0.5);
        tx = num("--rx", 0);
        ty = num("--ry", 0);
      } else if (!reduce) {
        // sem ponteiro: a luz passeia devagar (como no original)
        clock += dt;
        lx = 0.5 + Math.sin(clock * 0.41) * 0.42;
        ly = 0.38 + Math.sin(clock * 0.33 + 0.6) * 0.3;
        tx = Math.sin(clock * 0.7) * 3.5;
        ty = Math.sin(clock * 0.53 + 1.2) * 5;
      } else {
        lx = 0.36; ly = 0.26; tx = 0; ty = 0;
      }
      const k = 1 - Math.exp(-dt * 10);
      state.lx += (lx - state.lx) * k;
      state.ly += (ly - state.ly) * k;
      state.tx += (tx - state.tx) * k;
      state.ty += (ty - state.ty) * k;
      draw();
      if (visible && !document.hidden) raf = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (raf || !alive) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      draw();
    };

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      if (!alive) return;
      try {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);
        textureReady = true;
        setReady(true);
        resize();
        wake();
      } catch {
        textureReady = false; // imagem sem CORS: fica sem foil
      }
    };
    img.src = src;

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
      if (visible) wake();
    });
    io.observe(canvas);
    const onVisibility = () => !document.hidden && wake();
    document.addEventListener("visibilitychange", onVisibility);
    resize();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [src]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-300"
      style={{ opacity: ready && active ? 1 : 0 }}
    />
  );
};

export default FoilShaderLayer;
