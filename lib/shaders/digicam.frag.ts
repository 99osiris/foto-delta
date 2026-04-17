const src = /* glsl */`#version 300 es
precision highp float;

uniform sampler2D u_texture;
uniform float u_time;
uniform vec2  u_resolution;

// MEDIA DEGRADATION
uniform float u_downscale;        // 0.0-1.0 — résolution native (défaut 0.6 = 1024px sur 1600)
uniform float u_jpegQuality;      // 0-100 — qualité JPEG agressive (défaut 40)
uniform float u_chromaSub;        // 0.0-1.0 — subsampling 4:2:0 (défaut 0.9)
uniform float u_ringing;          // 0.0-4.0 — ringing digicam (défaut 1.8)
uniform float u_ringingWidth;     // 0.5-3.0 — largeur ringing (défaut 1.2)

// LENS
uniform float u_lensBlur;         // 0.0-1.0 — flou centre (défaut 0.4)
uniform float u_chromaticAb;      // 0.0-6.0 — aberration chromatique (défaut 2.2)
uniform float u_barrelDist;       // 0.0-0.2 — distorsion barrel (défaut 0.06)

// SENSOR
uniform float u_bayerNoise;       // 0.0-0.1 — bruit CCD structuré (défaut 0.045)
uniform float u_hotPixels;        // 0.0-1.0 — dead pixels (défaut 0.25)
uniform float u_quantization;     // 0.0-1.0 — banding 8-bit (défaut 0.35)

// COLOR SCIENCE
uniform float u_saturation;       // 0.3-1.2 — saturation globale (défaut 0.7)
uniform float u_cyanBoost;        // 1.0-2.0 — boost cyan Sony (défaut 1.35)
uniform float u_shadowCyan;       // 0.0-0.1 — ombres → cyan (défaut 0.04)
uniform float u_blackLift;        // 0.0-0.1 — plancher noir (défaut 0.04)
uniform vec3  u_colorMatrix;      // matrice couleur capteur (défaut 0.86/1.0/1.16)
uniform float u_highlightClip;    // 0.7-1.0 — clip brutal hautes lumières (défaut 0.88)

// BLOOM CCD
uniform float u_bloomThreshold;   // 0.6-1.0 — seuil bloom (défaut 0.80)
uniform float u_bloomIntensity;   // 0.0-0.8 — intensité bloom (défaut 0.35)

in vec2  v_uv;
out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec3 sampleTex(vec2 uv) {
  return texture(u_texture, clamp(uv, 0.001, 0.999)).rgb;
}

vec3 boxBlur9(vec2 uv, float r) {
  vec2 px = r / u_resolution;
  vec3 s = vec3(0.0);
  s += sampleTex(uv + px * vec2(-1.0,-1.0));
  s += sampleTex(uv + px * vec2( 0.0,-1.0));
  s += sampleTex(uv + px * vec2( 1.0,-1.0));
  s += sampleTex(uv + px * vec2(-1.0, 0.0));
  s += sampleTex(uv);
  s += sampleTex(uv + px * vec2( 1.0, 0.0));
  s += sampleTex(uv + px * vec2(-1.0, 1.0));
  s += sampleTex(uv + px * vec2( 0.0, 1.0));
  s += sampleTex(uv + px * vec2( 1.0, 1.0));
  return s / 9.0;
}

void main() {
  vec2 uv  = v_uv;
  vec2 px  = 1.0 / u_resolution;
  float fr = floor(u_time * 30.0);

  // ── STEP 1: BARREL DISTORTION ─────────────────────────────────────────────
  if (u_barrelDist > 0.001) {
    vec2 c = uv - 0.5;
    uv = clamp(uv + c * dot(c, c) * u_barrelDist, 0.001, 0.999);
  }

  // ── STEP 2: DOWNSCALE — résolution native ─────────────────────────────────
  if (u_downscale < 0.99) {
    float factor = mix(6.0, 1.0, u_downscale);
    vec2 nativeRes = u_resolution / factor;
    uv = (floor(uv * nativeRes) + 0.5) / nativeRes;
  }

  // ── STEP 3: CHROMATIC ABERRATION ──────────────────────────────────────────
  float dist     = length(uv - 0.5) * 2.0;
  float edge     = dist * dist * dist;
  float caAmt    = u_chromaticAb * px.x * edge;
  vec2  cDir     = normalize(uv - 0.5 + vec2(0.0001));

  vec3 col;
  col.r = sampleTex(uv + cDir * caAmt * 1.5).r;
  col.g = sampleTex(uv).g;
  col.b = sampleTex(uv - cDir * caAmt * 0.8).b;

  // ── STEP 4: LENS CENTER BLUR ──────────────────────────────────────────────
  if (u_lensBlur > 0.001) {
    float centerBlur = u_lensBlur * max(0.0, 1.0 - dist * 0.8);
    col = mix(col, boxBlur9(uv, centerBlur * 2.0), centerBlur * 0.75);
  }

  // ── STEP 5: JPEG DCT BLOCKS ───────────────────────────────────────────────
  float blockStr = max(0.0, (100.0 - u_jpegQuality) / 100.0);
  if (blockStr > 0.005) {
    vec2 bRes = u_resolution / 8.0;
    vec2 bUV  = (floor(uv * bRes) + 0.5) / bRes;
    vec3 bCol = sampleTex(bUV);
    float lC  = dot(col,  vec3(0.299, 0.587, 0.114));
    float lB  = dot(bCol, vec3(0.299, 0.587, 0.114));
    float isEdge = clamp(abs(lC - lB) * 12.0, 0.0, 1.0);
    col = mix(col, bCol, blockStr * (1.0 - isEdge) * 0.3);

    // Banding de quantification 8-bit
    float bandSteps = mix(8.0, 64.0, u_jpegQuality / 100.0);
    col = floor(col * bandSteps + 0.5) / bandSteps;
  }

  // ── STEP 6: CHROMA SUBSAMPLING 4:2:0 ─────────────────────────────────────
  if (u_chromaSub > 0.005) {
    vec2 cBlock = vec2(2.0, 2.0) / u_resolution;
    vec2 cUV    = (floor(uv / cBlock) + 0.5) * cBlock;

    vec3 cRef  = sampleTex(cUV);
    float lHere = dot(col,  vec3(0.299, 0.587, 0.114));
    float lThere = dot(cRef, vec3(0.299, 0.587, 0.114));

    // Chroma du bloc, luma du pixel courant
    col.r = mix(col.r, lHere + (cRef.r - lThere) * 0.85, u_chromaSub * 0.7);
    col.b = mix(col.b, lHere + (cRef.b - lThere) * 0.85, u_chromaSub * 0.7);
  }

  // ── STEP 7: RINGING ───────────────────────────────────────────────────────
  if (u_ringing > 0.005) {
    float rw   = u_ringingWidth * px.x;
    vec3 colL  = sampleTex(clamp(uv - vec2(rw, 0.0), 0.001, 0.999));
    vec3 colR  = sampleTex(clamp(uv + vec2(rw, 0.0), 0.001, 0.999));
    col += (col - (colL + colR) * 0.5) * u_ringing;
  }

  // ── STEP 8: BAYER CCD NOISE ───────────────────────────────────────────────
  vec2 pCoord = floor(uv * u_resolution);
  float fdrift = fr * 0.025;
  float nR = (hash(pCoord * vec2(1.0, 0.7) + fdrift) - 0.5) * u_bayerNoise;
  float nG = (hash(pCoord * vec2(0.8, 1.2) + fdrift + 3.1) - 0.5) * u_bayerNoise * 0.6;
  float nB = (hash(pCoord * vec2(1.3, 0.9) + fdrift + 7.7) - 0.5) * u_bayerNoise * 1.4;

  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  float shadowAmp = 1.0 + (1.0 - smoothstep(0.0, 0.4, luma)) * 1.3;
  col.r += nR * shadowAmp;
  col.g += nG * shadowAmp;
  col.b += nB * shadowAmp;

  // HOT PIXELS (pixels morts CCD)
  if (u_hotPixels > 0.001) {
    float hSeed = hash(pCoord * 0.007);
    if (hSeed > 1.0 - u_hotPixels * 0.002) {
      float hc = hash(pCoord * 0.1);
      col = hc > 0.5
        ? vec3(1.0, 0.08, 0.0)
        : hc > 0.25
          ? vec3(0.0, 0.08, 1.0)
          : vec3(1.0);
    }
  }

  // ── STEP 9: QUANTIZATION BANDING ──────────────────────────────────────────
  // 8-bit CCD = banding visible dans les dégradés lisses
  if (u_quantization > 0.001) {
    float steps = mix(64.0, 256.0, 1.0 - u_quantization);
    col = floor(col * steps + 0.5) / steps;
  }

  // ── STEP 10: COLOR SCIENCE SONY CCD ─────────────────────────────────────
  col *= u_colorMatrix;

  luma = dot(col, vec3(0.299, 0.587, 0.114));
  col  = mix(vec3(luma), col, u_saturation);

  // Boost cyan sélectif — signature Sony CCD
  float cyanMask = clamp((col.g + col.b - col.r * 2.1) * 1.8, 0.0, 1.0);
  col.g = mix(col.g, col.g * u_cyanBoost * 0.88, cyanMask * 0.5);
  col.b = mix(col.b, col.b * u_cyanBoost,         cyanMask * 0.5);
  col.r = mix(col.r, col.r * 0.83,                cyanMask * 0.4);

  // Shadow cyan
  float scMask = 1.0 - smoothstep(0.0, 0.28, luma);
  col.g += u_shadowCyan * scMask * 0.65;
  col.b += u_shadowCyan * scMask;
  col    = max(col, vec3(u_blackLift));

  // Gamma CCD Sony (~0.87)
  col = pow(clamp(col, 0.001, 1.0), vec3(0.87));

  // ── STEP 11: HIGHLIGHT CLIP BRUTAL ────────────────────────────────────────
  // CCD sature brusquement — pas de roll-off doux
  // En dessous du seuil: normal. Au-dessus: clip vers blanc-bleu
  luma = dot(col, vec3(0.299, 0.587, 0.114));
  float clipMask = smoothstep(u_highlightClip, u_highlightClip + 0.06, luma);
  vec3 clipped   = vec3(luma * 0.92, luma * 0.95, min(1.0, luma * 1.1));
  col = mix(col, clipped, clipMask * 0.85);

  // ── STEP 12: CCD HIGHLIGHT BLOOM ─────────────────────────────────────────
  luma = dot(col, vec3(0.299, 0.587, 0.114));
  float bloomMask = smoothstep(u_bloomThreshold, 1.0, luma);
  if (bloomMask > 0.001 && u_bloomIntensity > 0.001) {
    float r = 3.0;
    vec3 bloom = vec3(0.0); float tot = 0.0;
    for (float bx = -2.0; bx <= 2.0; bx += 1.0) {
      for (float by = -2.0; by <= 2.0; by += 1.0) {
        float w = 1.0 / (1.0 + length(vec2(bx, by)));
        bloom += sampleTex(clamp(uv + vec2(bx, by) * px * r, 0.001, 0.999)) * w;
        tot    += w;
      }
    }
    bloom = (bloom / tot) * vec3(0.87, 0.93, 1.14);
    col   = mix(col, bloom, bloomMask * u_bloomIntensity);
  }

  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`
export default src
