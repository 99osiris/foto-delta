const src = /* glsl */`#version 300 es
precision highp float;

uniform sampler2D u_texture;
uniform float u_time;
uniform vec2  u_resolution;

// PASS 1 — VHS ANALOG SIGNAL
uniform float u_chromaShift;       // 0–12   défaut 3.0   — décalage chroma latéral px
uniform float u_chromaShiftRandom; // 0–1    défaut 0.4   — part aléatoire par ligne (Y/C random)
uniform float u_lumaSmear;         // 0–1    défaut 0.38  — bande passante luma (1=net, 0=très flou)
uniform float u_chromaI;           // 0–0.3  défaut 0.06  — blur axe I (orange-cyan)
uniform float u_chromaQ;           // 0–0.3  défaut 0.09  — blur axe Q (vert-magenta, plus étroit)
uniform float u_lumaVertBleed;     // 0–0.8  défaut 0.35  — smear vertical luma
uniform float u_lumaNoiseAmt;      // 0–0.15 défaut 0.022 — bruit luma (tape hiss)
uniform float u_chromaNoiseAmt;    // 0–0.10 défaut 0.012 — bruit chroma (color speckle)
uniform float u_jitterAmp;         // 0–5    défaut 0.5   — amplitude jitter horizontal
uniform float u_jitterFreq;        // 0–0.3  défaut 0.05  — fréquence onde jitter
uniform float u_jitterRoughness;   // 0–1    défaut 0.3   — part aléatoire du jitter
uniform float u_headSwitchHeight;  // 0–60   défaut 15    — hauteur bande head switch
uniform float u_headSwitchAmt;     // 0–0.1  défaut 0.035 — intensité head switch
uniform float u_headCapNoise;      // 0–1    défaut 0.5   — bandes de bruit dense au-dessus head switch
uniform float u_bottomDistHeight;  // 0–80   défaut 28    — zone distorsion bas frame
uniform float u_bottomDistAmt;     // 0–1    défaut 0.38  — intensité distorsion basse
uniform float u_dropoutCount;      // 0–20   défaut 2     — nb rayures dropout
uniform float u_dropoutMaxLen;     // 0–300  défaut 85    — longueur max dropout px
uniform float u_dropoutIntensity;  // 0–1    défaut 0.78  — intensité dropout
uniform float u_interlace;         // 0–1    défaut 0.55  — entrelacement lignes paires/impaires
uniform float u_scanlineIntensity; // 0–1    défaut 0.76  — scanlines CRT

// TAPE CREASE (LazarusOverlook CC0)
uniform float u_tapeCreaseAmt;      // 0.0-1.0 défaut 0.35 — intensité des plis cassette
uniform float u_tapeCreaseSpeed;  // 0.1-2.0 défaut 0.5  — vitesse déplacement pli
uniform float u_tapeCreaseJitter;   // 0.0-1.0 défaut 0.15 — irrégularité du pli
uniform float u_tapeCreaseDiscolor; // 0.0-2.0 défaut 0.8  — discoloration YIQ au pli
uniform float u_tapeCreaseSmear;    // 0.0-2.0 défaut 0.3  — smear horizontal au pli
// AC BEAT (LazarusOverlook CC0)
uniform float u_acBeatAmt;          // 0.0-0.5 défaut 0.08 — intensité bande lumineuse
uniform float u_acBeatSpeed;        // 0.0-1.0 défaut 0.15 — vitesse montée bande

// PASS 2 — INTERNET 90s RECOMPRESSION
uniform float u_jpegQuality;       // 0–100  défaut 58    — qualité JPEG (lower = plus d'artefacts)
uniform float u_jpegBlockSize;     // 4–16   défaut 8     — taille blocs DCT (8 = standard JPEG)
uniform float u_colorDepth;        // 0–1    défaut 0.45  — réduction profondeur couleur (Quantize)
uniform float u_ringing;           // 0–6    défaut 3.2   — overshoot signal (ringing)
uniform float u_ringingWidth;      // 0.5–4  défaut 1.8   — largeur ringing px

// DISPLAY + LEVELS
uniform float u_blackCrush;        // 0–30   défaut 16    — plancher noir
uniform float u_whiteCrush;        // 220–255 défaut 230  — plafond blanc
uniform vec3  u_colorCast;         // R/G/B  défaut 0.95/1.05/1.0
uniform float u_vignette;          // 0–1    défaut 0.28

in vec2 v_uv;
out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float hash1(float n) {
  return fract(sin(n) * 43758.5453);
}
float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec3 rgb2yiq(vec3 c) {
  return vec3(
    dot(c, vec3(0.299,  0.587,  0.114)),
    dot(c, vec3(0.596, -0.274, -0.322)),
    dot(c, vec3(0.211, -0.523,  0.312))
  );
}
vec3 yiq2rgb(vec3 y) {
  return vec3(
    dot(y, vec3(1.0,  0.956,  0.621)),
    dot(y, vec3(1.0, -0.272, -0.647)),
    dot(y, vec3(1.0, -1.106,  1.703))
  );
}

// Rotation 2D pour la discoloration chroma au tape crease (LazarusOverlook CC0)
mat2 rotate2D(float t) {
  float c = cos(t);
  float s = sin(t);
  return mat2(vec2(c, s), vec2(-s, c));
}

vec3 sampleAt(vec2 uv) {
  return texture(u_texture, clamp(uv, 0.001, 0.999)).rgb;
}

void main() {
  vec2 uv    = v_uv;
  vec2 px    = 1.0 / u_resolution;
  float fr   = floor(u_time * 30.0);
  float lineY = floor(uv.y * u_resolution.y);

  // ════════════════════════════════════════════════════════
  // PASS 1 — VHS ANALOG SIGNAL
  // ════════════════════════════════════════════════════════

  // ── 1A. MECHANICAL WARP ─────────────────────────────────
  // Jitter: combinaison onde + aléatoire par ligne
  float jSeed  = floor(lineY * mix(1.0, 0.08, u_jitterRoughness));
  float jWave  = sin(uv.y * u_jitterFreq * 80.0 + fr * 0.09);
  float jRand  = (hash(vec2(jSeed, fr * 0.3)) - 0.5) * 2.0;
  float jitter = jWave * jRand * u_jitterAmp * px.x;
  uv.x += jitter;

  // Head switching: bande basse frame, déplacement horizontal brusque
  float fromBot = (1.0 - uv.y) * u_resolution.y;
  if (fromBot < u_headSwitchHeight) {
    float t  = fromBot / max(u_headSwitchHeight, 0.001);
    float hn = hash(vec2(floor(uv.y * 600.0), fr)) - 0.5;
    uv.x    += hn * u_headSwitchAmt * (1.0 - t * t) * 0.05;
  }

  // Bottom distortion: zone plus large en-dessous
  float botZone = u_headSwitchHeight + u_bottomDistHeight;
  if (fromBot < botZone && fromBot >= u_headSwitchHeight) {
    float t2 = (fromBot - u_headSwitchHeight) / max(u_bottomDistHeight, 0.001);
    float bd = (noise2(vec2(uv.y * 18.0, fr * 0.035)) - 0.5);
    uv.x    += bd * u_bottomDistAmt * (1.0 - t2) * px.x * 14.0;
  }

  uv = clamp(uv, 0.001, 0.999);

  // ── 1B. CHROMA SHIFT — split Y/C propre (technique ROT-7 CC0, adapté) ───
  // Shifter seulement la chroma (axes I et Q), pas la luma
  float lineHash   = hash(vec2(lineY, fr * 0.2));
  float randShift  = mix(1.0, lineHash * 2.0, u_chromaShiftRandom);
  float cs         = u_chromaShift * randShift * px.x;

  vec3 colBase     = sampleAt(uv);
  vec3 colShifted  = sampleAt(uv + vec2(cs, 0.0));

  vec3 yiqBase    = rgb2yiq(colBase);
  vec3 yiqShifted = rgb2yiq(colShifted);
  vec3 yiqMixed   = vec3(yiqBase.x, yiqShifted.yz);
  vec3 col        = yiq2rgb(yiqMixed);

  col.r = mix(col.r, sampleAt(uv - vec2(cs * 0.4, 0.0)).r, 0.4);
  col.b = mix(col.b, sampleAt(uv + vec2(cs * 0.25, 0.0)).b, 0.4);

  // ── 1C. YIQ BANDWIDTH — multi-sample pondéré (LazarusOverlook CC0) ─
  vec3 yiq = rgb2yiq(col);

  vec3 yiq_L1 = rgb2yiq(sampleAt(uv - vec2(px.x,        0.0)));
  vec3 yiq_R1 = rgb2yiq(sampleAt(uv + vec2(px.x,        0.0)));
  vec3 yiq_L2 = rgb2yiq(sampleAt(uv - vec2(px.x * 2.0, 0.0)));
  vec3 yiq_R2 = rgb2yiq(sampleAt(uv + vec2(px.x * 2.0, 0.0)));

  float lumaBlurred = yiq_L2.x * 0.15 + yiq_L1.x * 0.35
                    + yiq_R1.x * 0.35 + yiq_R2.x * 0.15;
  yiq.x = mix(yiq.x, lumaBlurred, 1.0 - u_lumaSmear);

  vec3 yiq_L3 = rgb2yiq(sampleAt(uv - vec2(px.x * 3.0, 0.0)));
  vec3 yiq_R3 = rgb2yiq(sampleAt(uv + vec2(px.x * 3.0, 0.0)));

  float chromaI_blur = yiq_L3.y * 0.2 + yiq_L2.y * 0.25 + yiq_L1.y * 0.1
                     + yiq_R1.y * 0.1 + yiq_R2.y * 0.25 + yiq_R3.y * 0.2;
  yiq.y = mix(yiq.y, chromaI_blur / 1.1, u_chromaI);

  float chromaQ_blur = yiq_L3.z * 0.25 + yiq_L2.z * 0.25 + yiq_L1.z * 0.1
                     + yiq_R1.z * 0.1 + yiq_R2.z * 0.25 + yiq_R3.z * 0.25;
  yiq.z = mix(yiq.z, chromaQ_blur / 1.2, u_chromaQ);

  if (u_lumaVertBleed > 0.001) {
    vec3 yUp  = rgb2yiq(sampleAt(uv - vec2(0.0, px.y)));
    vec3 yUp2 = rgb2yiq(sampleAt(uv - vec2(0.0, px.y * 2.0)));
    yiq.x = mix(yiq.x, yiq.x * 0.5 + yUp.x * 0.35 + yUp2.x * 0.15, u_lumaVertBleed);
  }

  col = yiq2rgb(yiq);

  // ── 1D. COLOR CAST ──────────────────────────────────────────────────────
  col *= u_colorCast;

  // ── 1D-BIS. TAPE CREASE (adapté de LazarusOverlook CC0) ─────────────────
  if (u_tapeCreaseAmt > 0.001) {
    float tcPhase = smoothstep(0.9, 0.96,
      sin(uv.y * 8.0 - (u_time * u_tapeCreaseSpeed
        + u_tapeCreaseJitter * hash(vec2(u_time * 0.67, u_time * 0.59))) * 3.14159 * 1.2)
    );
    float tcNoise = smoothstep(0.3, 1.0, hash(vec2(uv.y * 4.77, fr)));
    float tc      = tcPhase * tcNoise;

    vec2  creaseUV = uv - vec2(tc * u_tapeCreaseSmear * px.x * 8.0, 0.0);
    vec3  colCrease = sampleAt(creaseUV);

    if (tc > 0.01) {
      vec3 yiqCrease = rgb2yiq(colCrease);
      float rotAngle = tc * u_tapeCreaseDiscolor * 0.2;
      yiqCrease.yz   = rotate2D(rotAngle) * yiqCrease.yz;
      colCrease      = yiq2rgb(yiqCrease);
      col = mix(col, colCrease, tc * u_tapeCreaseAmt);
    }

    float cn = tcNoise * (0.7 * tcPhase + 0.3) * u_tapeCreaseAmt;
    if (cn > 0.29) {
      float n0 = hash(vec2(uv.y + hash(vec2(uv.y, u_time)) * 0.1, u_time) * vec2(0.1, 1.0));
      float n1 = hash(vec2(uv.y + hash(vec2(uv.y, u_time)) * 0.1 + px.x, u_time) * vec2(0.1, 1.0));
      if (n1 < n0) {
        col = mix(col, vec3(pow(n0, 10.0) * 2.0), cn * 0.5);
      }
    }
  }

  // ── 1E. INTERLACING ─────────────────────────────────────────────────────
  // Lignes paires et impaires capturées à des instants légèrement différents
  // Sur image fixe: lignes alternées avec léger décalage + luminosité
  if (u_interlace > 0.001) {
    bool isOdd = mod(lineY, 2.0) > 0.5;
    float iOff = u_interlace * px.x * 1.2;
    if (isOdd) {
      vec3 shifted = sampleAt(uv + vec2(iOff, 0.0));
      col = mix(col, shifted * 0.96, u_interlace * 0.45);
    } else {
      vec3 shifted = sampleAt(uv - vec2(iOff * 0.5, 0.0));
      col = mix(col, shifted, u_interlace * 0.25);
    }
  }

  // ── 1F. TAPE NOISE ──────────────────────────────────────────────────────
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  // Bruit plus dense dans les ombres (magnétique)
  float sBoost = 1.0 + (1.0 - smoothstep(0.0, 0.4, luma)) * 1.1;

  float yn = (hash(uv * u_resolution + vec2(fr * 7.3, fr * 3.7)) - 0.5) * u_lumaNoiseAmt * sBoost;
  float cn = (hash(uv.yx * u_resolution + vec2(fr * 5.1, fr * 9.3)) - 0.5) * u_chromaNoiseAmt * sBoost;
  col.r += yn + cn * 0.65;
  col.g += yn - cn * 0.18;
  col.b += yn + cn * 1.15;

  // ── 1G. HEAD CAP NOISE (insight changelog Heisei v2) ────────────────────
  // Bandes horizontales denses de bruit juste au-dessus du head switch
  // Zone: headSwitchHeight → headSwitchHeight * 3
  if (u_headCapNoise > 0.001) {
    float capZoneTop = u_headSwitchHeight * 3.0;
    float capZoneBot = u_headSwitchHeight;
    if (fromBot > capZoneBot && fromBot < capZoneTop) {
      float capT    = (fromBot - capZoneBot) / (capZoneTop - capZoneBot);
      float capFade = 1.0 - capT;
      float capN    = (hash(vec2(lineY * 3.7, fr * 1.1 + uv.x * 20.0)) - 0.5);
      col += vec3(capN * u_headCapNoise * capFade * 0.25);
    }
  }

  // ── 1H. DROPOUTS ────────────────────────────────────────────────────────
  for (float i = 0.0; i < 20.0; i++) {
    if (i >= u_dropoutCount) break;
    float s   = i * 131.1 + floor(fr * 0.45) * 41.7;
    float dy  = hash1(s);
    float dx  = hash1(s + 1.0);
    float dl  = hash1(s + 2.0) * u_dropoutMaxLen / u_resolution.x;
    float dist = abs(v_uv.y - dy) * u_resolution.y;
    if (dist < 1.0 && v_uv.x > dx && v_uv.x < dx + dl) {
      float b = u_dropoutIntensity * (1.0 - dist * 0.75);
      col = mix(col, vec3(0.88 + hash(v_uv * 250.0 + fr) * 0.12), b);
    }
  }

  // ── 1I-BIS. AC BEAT (adapté de LazarusOverlook CC0) ─────────────────────
  if (u_acBeatAmt > 0.001) {
    float beatPhase = fract(u_time * u_acBeatSpeed * 0.1);
    float beatPos   = abs(uv.y - beatPhase);
    float beatWide  = smoothstep(0.15, 0.0, beatPos);
    float beatNoise = 0.7 + 0.3 * hash(vec2(0.0, uv.y * 0.1 + u_time * 0.2));
    col *= 1.0 + u_acBeatAmt * beatWide * beatNoise;
  }

  // ── 1I. SCANLINES CRT ───────────────────────────────────────────────────
  float scan = mod(lineY, 2.0) < 1.0 ? u_scanlineIntensity : 1.0;
  col *= scan;

  // ════════════════════════════════════════════════════════
  // PASS 2 — INTERNET 90s RECOMPRESSION
  // (appliqué sur le signal VHS déjà dégradé)
  // ════════════════════════════════════════════════════════

  // ── 2A. QUANTIZE COLOR DEPTH (Heisei v3 feature) ────────────────────────
  // Réduction de la profondeur de couleur: simule 5-6 bits par canal
  // Donne ce banding caractéristique des vidéos 90s recompressées
  if (u_colorDepth > 0.001) {
    // steps: 256 (8bit) → 8 (3bit) selon le slider
    float steps = mix(256.0, 8.0, u_colorDepth);
    col = floor(col * steps + 0.5) / steps;
  }

  // ── 2B. JPEG DCT BLOCK ARTIFACTS ────────────────────────────────────────
  // Appliqué APRÈS la dégradation VHS → les blocs apparaissent sur signal dégradé
  // C'est ce double-pass qui crée le look distinctif de Heisei
  float blockStr = max(0.0, (100.0 - u_jpegQuality) / 100.0);
  if (blockStr > 0.005) {
    // Taille de bloc variable (4–16px selon u_jpegBlockSize)
    float bSize = mix(4.0, 16.0, (u_jpegBlockSize - 4.0) / 12.0);
    vec2  bRes  = u_resolution / bSize;
    vec2  bUV   = (floor(v_uv * bRes) + 0.5) / bRes;

    // Sample la version "bloquée" — utilise les UVs ORIGINAUX (pas warpés)
    // pour simuler que la compression était appliquée à l'image originale
    vec3 bCol   = texture(u_texture, clamp(bUV, 0.001, 0.999)).rgb;

    // Masque: appliquer davantage dans les zones lisses
    float lumaC  = dot(col,  vec3(0.299, 0.587, 0.114));
    float lumaB  = dot(bCol, vec3(0.299, 0.587, 0.114));
    float isEdge = clamp(abs(lumaC - lumaB) * 8.0, 0.0, 1.0);
    float blend  = blockStr * (1.0 - isEdge * 0.7) * 0.4;
    col = mix(col, bCol, blend);

    // Artifact de quantification DCT: légère postérisation
    float bandSteps = mix(12.0, 64.0, u_jpegQuality / 100.0);
    vec3 banded = floor(col * bandSteps + 0.5) / bandSteps;
    col = mix(col, banded, blockStr * 0.3);
  }

  // ── 2C. RINGING AMPLIFIÉ ────────────────────────────────────────────────
  // Le ringing est appliqué en PASS 2 (post-compression)
  // C'est pour ça qu'il a ce côté "amplifié" chez Heisei
  // Il s'applique sur les blocs JPEG déjà présents, pas sur l'original
  if (u_ringing > 0.005) {
    float rw   = u_ringingWidth * px.x;
    vec3 colL  = sampleAt(clamp(v_uv - vec2(rw,        0.0), 0.001, 0.999));
    vec3 colR  = sampleAt(clamp(v_uv + vec2(rw,        0.0), 0.001, 0.999));
    vec3 colL2 = sampleAt(clamp(v_uv - vec2(rw * 2.0, 0.0), 0.001, 0.999));
    vec3 colR2 = sampleAt(clamp(v_uv + vec2(rw * 2.0, 0.0), 0.001, 0.999));
    // Double unsharp mask: ringing primaire + secondaire (Gibbs phenomenon)
    vec3 unsharp1 = col - (colL  + colR)  * 0.5;
    vec3 unsharp2 = col - (colL2 + colR2) * 0.5;
    col += unsharp1 * u_ringing + unsharp2 * u_ringing * 0.3;
  }

  // ── 2D. LEVELS (brutal, pas de gamma smooth) ────────────────────────────
  float blackF = u_blackCrush / 255.0;
  float whiteC = u_whiteCrush / 255.0;
  col = (col - blackF) / max(whiteC - blackF, 0.001);

  // ── 2E. VIGNETTE ────────────────────────────────────────────────────────
  if (u_vignette > 0.001) {
    vec2 vig = (v_uv - 0.5) * vec2(0.88, 1.15);
    float v  = pow(clamp(1.0 - dot(vig, vig), 0.0, 1.0), 0.32);
    col *= mix(1.0, v, u_vignette);
  }

  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`
export default src
