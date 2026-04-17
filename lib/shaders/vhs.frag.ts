const src = /* glsl */`#version 300 es
precision highp float;

uniform sampler2D u_texture;
uniform float u_time;
uniform vec2  u_resolution;

// MEDIA DEGRADATION
uniform float u_downscale;        // 0.0-1.0 — simule résolution native basse (défaut 0.5 = 640px sur 1280)
uniform float u_jpegQuality;      // 0-100 — qualité JPEG (défaut 45)
uniform float u_chromaSub;        // 0.0-1.0 — subsampling chroma 4:2:0 (défaut 0.8)
uniform float u_ringing;          // 0.0-5.0 — overshoot sur les bords (défaut 2.5)
uniform float u_ringingWidth;     // 0.5-4.0 — largeur du ringing en pixels (défaut 1.5)

// SIGNAL
uniform float u_chromaShift;      // 0-8 — décalage chroma horizontal px (défaut 2.5)
uniform float u_lumaSmear;        // 0.0-1.0 — blur luma horizontal (défaut 0.35)
uniform float u_chromaSmearI;     // 0.0-0.3 — blur chroma axe I (défaut 0.08)
uniform float u_chromaSmearQ;     // 0.0-0.3 — blur chroma axe Q (défaut 0.10)
uniform float u_lumaVertBleed;    // 0.0-0.8 — smear vertical luma (défaut 0.3)

// NOISE
uniform float u_lumaNoiseAmt;     // 0.0-0.12 — bruit luma (défaut 0.03)
uniform float u_chromaNoiseAmt;   // 0.0-0.08 — bruit chroma (défaut 0.015)

// MECHANICAL
uniform float u_jitterAmp;        // 0.0-4.0 — amplitude jitter horizontal (défaut 0.4)
uniform float u_jitterFreq;       // 0.0-0.3 — fréquence jitter (défaut 0.05)
uniform float u_jitterRoughness;  // 0.0-1.0 — granularité jitter (défaut 0.3)
uniform float u_headSwitchHeight; // 0-50 — hauteur bande head switch bas frame (défaut 12)
uniform float u_headSwitchAmt;    // 0.0-0.08 — intensité head switch (défaut 0.03)
uniform float u_dropoutCount;     // 0-15 — nb de rayures dropout (défaut 2)
uniform float u_dropoutIntensity; // 0.0-1.0 — intensité dropout (défaut 0.7)

// INTERLACING
uniform float u_interlace;        // 0.0-1.0 — force de l'interlacing (défaut 0.6)

// DISPLAY
uniform float u_scanlineIntensity;// 0.0-1.0 — scanlines CRT (défaut 0.8)
uniform float u_vignette;         // 0.0-1.0 — vignette (défaut 0.25)

// LEVELS (écrasement brutal, pas gamma doux)
uniform float u_blackCrush;       // 0-30 — élève le plancher noir (défaut 14)
uniform float u_whiteCrush;       // 220-255 — plafonne les blancs (défaut 232)
uniform vec3  u_colorCast;        // cast couleur par canal (défaut 0.95/1.03/1.0)

in vec2 v_uv;
out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float hash1(float n) {
  return fract(sin(n) * 43758.5453);
}
float noise2(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0,0.0)), f.x),
    mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), f.x),
    f.y
  );
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

// Sample avec clamp safe
vec3 sampleTex(vec2 uv) {
  return texture(u_texture, clamp(uv, 0.001, 0.999)).rgb;
}

void main() {
  vec2 uv = v_uv;
  vec2 px = 1.0 / u_resolution;
  float fr = floor(u_time * 30.0);

  // ── STEP 1: DOWNSCALE — simuler résolution native basse ──────────────────
  // On pixelise l'UV pour simuler une vraie résolution basse
  // downscale=0.5 → simule 640px sur 1280px de large
  if (u_downscale < 0.99) {
    float factor = mix(8.0, 1.0, u_downscale);
    vec2 nativeRes = u_resolution / factor;
    uv = (floor(uv * nativeRes) + 0.5) / nativeRes;
  }

  // ── STEP 2: MECHANICAL WARP (avant tout sampling) ────────────────────────
  float lineY = floor(v_uv.y * u_resolution.y);
  float jSeed = floor(lineY * mix(1.0, 0.1, u_jitterRoughness));
  float jWave = sin(v_uv.y * u_jitterFreq * 80.0 + fr * 0.09);
  float jRand = (hash(vec2(jSeed, fr * 0.3)) - 0.5) * 2.0;
  uv.x += jWave * jRand * u_jitterAmp * px.x;

  float fromBot = (1.0 - v_uv.y) * u_resolution.y;
  if (fromBot < u_headSwitchHeight) {
    float t = fromBot / max(u_headSwitchHeight, 0.001);
    float hn = hash(vec2(floor(v_uv.y * 400.0), fr)) - 0.5;
    uv.x += hn * u_headSwitchAmt * (1.0 - t * t) * 0.05;
  }
  uv = clamp(uv, 0.001, 0.999);

  // ── STEP 3: JPEG DCT BLOCKS ───────────────────────────────────────────────
  // Vrais artefacts de compression: poster dans les zones lisses
  // Plus la qualité est basse, plus les blocs sont visibles
  vec3 col = sampleTex(uv);
  float blockStr = max(0.0, (100.0 - u_jpegQuality) / 100.0);

  if (blockStr > 0.005) {
    // Blocs 8x8 sur la résolution effective
    vec2 bRes = u_resolution * mix(1.0 / 8.0, 1.0 / 4.0, blockStr);
    vec2 bUV  = (floor(uv * bRes) + 0.5) / bRes;
    vec3 bCol = sampleTex(bUV);

    // Appliquer seulement dans les zones LISSES (pas sur les edges)
    // Un edge fort → peu de blocage (JPEG est smarter que ça)
    float lumaC  = dot(col,  vec3(0.299, 0.587, 0.114));
    float lumaB  = dot(bCol, vec3(0.299, 0.587, 0.114));
    float isEdge = clamp(abs(lumaC - lumaB) * 10.0, 0.0, 1.0);
    float blend  = blockStr * (1.0 - isEdge) * 0.35;
    col = mix(col, bCol, blend);

    // Artifacts de quantification: banding subtil dans les dégradés
    float band = floor(lumaC * mix(8.0, 32.0, u_jpegQuality / 100.0)) / mix(8.0, 32.0, u_jpegQuality / 100.0);
    col = mix(col, vec3(band) + (col - vec3(lumaC)), blockStr * 0.15);
  }

  // ── STEP 4: CHROMA SUBSAMPLING 4:2:0 ─────────────────────────────────────
  // C'est LA caractéristique des digicams et VHS numériques
  // La chroma est échantillonnée 2x moins souvent que la luma
  // Résultat: les bords de couleur "bavent" de 2 pixels horizontalement ET verticalement
  if (u_chromaSub > 0.005) {
    // Blocs de chroma 2x2
    vec2 cBlockSize = vec2(2.0, 2.0) / u_resolution;
    vec2 cUV = (floor(uv / cBlockSize) + 0.5) * cBlockSize;

    vec3 origYIQ  = rgb2yiq(col);
    vec3 chromaRef = rgb2yiq(sampleTex(cUV));

    // Blur supplémentaire horizontal de la chroma (effet naturel)
    vec3 chromaL = rgb2yiq(sampleTex(clamp(cUV - vec2(px.x * 2.0, 0.0), 0.001, 0.999)));
    vec3 chromaR = rgb2yiq(sampleTex(clamp(cUV + vec2(px.x * 2.0, 0.0), 0.001, 0.999)));
    float avgI = (chromaRef.y + chromaL.y + chromaR.y) / 3.0;
    float avgQ = (chromaRef.z + chromaL.z + chromaR.z) / 3.0;

    // Garder la luma originale, remplacer la chroma par la version subsamplée
    vec3 newYIQ = vec3(origYIQ.x, mix(origYIQ.y, avgI, u_chromaSub), mix(origYIQ.z, avgQ, u_chromaSub));
    col = yiq2rgb(newYIQ);
  }

  // ── STEP 5: RINGING / OVERSHOOT ───────────────────────────────────────────
  // L'artefact le plus caractéristique des digicams cheapo:
  // bord blanc lumineux sur le côté gauche des contrastes forts
  // bord sombre sur le côté droit
  // C'est l'overshoot de l'amplificateur de signal
  if (u_ringing > 0.005) {
    float rw = u_ringingWidth * px.x;
    vec3 colL = sampleTex(clamp(uv - vec2(rw, 0.0), 0.001, 0.999));
    vec3 colR = sampleTex(clamp(uv + vec2(rw, 0.0), 0.001, 0.999));
    // Unsharp mask = ringing
    vec3 unsharp = col - (colL + colR) * 0.5;
    col += unsharp * u_ringing;
  }

  // ── STEP 6: COLOR CAST ────────────────────────────────────────────────────
  col *= u_colorCast;

  // ── STEP 7: YIQ ANALOG SIGNAL ─────────────────────────────────────────────
  // Chroma shift et bandwidth limiting en espace YIQ

  // Chroma shift latéral
  float cs = u_chromaShift * px.x;
  col.r = sampleTex(clamp(uv - vec2(cs * 0.6, 0.0), 0.001, 0.999)).r;
  col.b = sampleTex(clamp(uv + vec2(cs * 0.4, 0.0), 0.001, 0.999)).b;

  vec3 yiq = rgb2yiq(col);

  // Luma blur (bande passante limitée)
  vec3 yL  = rgb2yiq(sampleTex(clamp(uv - vec2(px.x,        0.0), 0.001, 0.999)));
  vec3 yR  = rgb2yiq(sampleTex(clamp(uv + vec2(px.x,        0.0), 0.001, 0.999)));
  vec3 yL2 = rgb2yiq(sampleTex(clamp(uv - vec2(px.x * 2.0, 0.0), 0.001, 0.999)));
  vec3 yR2 = rgb2yiq(sampleTex(clamp(uv + vec2(px.x * 2.0, 0.0), 0.001, 0.999)));
  yiq.x = mix(yiq.x, (yL.x  + yR.x)  * 0.5, 1.0 - u_lumaSmear);
  yiq.y = mix(yiq.y, (yL2.y + yR2.y) * 0.5, u_chromaSmearI);
  yiq.z = mix(yiq.z, (yL2.z + yR2.z) * 0.5, u_chromaSmearQ);

  // Vertical bleed
  if (u_lumaVertBleed > 0.001) {
    vec3 yUp = rgb2yiq(sampleTex(clamp(uv - vec2(0.0, px.y), 0.001, 0.999)));
    yiq.x = mix(yiq.x, (yiq.x + yUp.x) * 0.5, u_lumaVertBleed);
  }
  col = yiq2rgb(yiq);

  // ── STEP 8: INTERLACING ───────────────────────────────────────────────────
  // VHS et caméscopes = vidéo entrelacée
  // Les lignes paires et impaires sont capturées à des instants différents
  // Sur une image fixe ça donne: lignes alternées légèrement décalées
  if (u_interlace > 0.001) {
    float isOdd = mod(floor(v_uv.y * u_resolution.y), 2.0);
    float interlaceOffset = u_interlace * px.x * 1.5;

    if (isOdd > 0.5) {
      // Lignes impaires: décalées légèrement à droite + légèrement plus sombres
      vec3 colShifted = sampleTex(clamp(uv + vec2(interlaceOffset, 0.0), 0.001, 0.999));
      col = mix(col, colShifted * 0.97, u_interlace * 0.5);
    } else {
      // Lignes paires: légèrement décalées à gauche
      vec3 colShifted = sampleTex(clamp(uv - vec2(interlaceOffset * 0.5, 0.0), 0.001, 0.999));
      col = mix(col, colShifted, u_interlace * 0.3);
    }
  }

  // ── STEP 9: TAPE NOISE ────────────────────────────────────────────────────
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  // Bruit plus fort dans les ombres (caractère CCD/magnétique)
  float shadowBoost = 1.0 + (1.0 - smoothstep(0.0, 0.45, luma)) * 1.0;

  float yn = (hash(uv * u_resolution + vec2(fr * 7.3, fr * 3.1)) - 0.5)
             * u_lumaNoiseAmt * shadowBoost;
  float cn = (hash(uv.yx * u_resolution + vec2(fr * 5.1, fr * 8.7)) - 0.5)
             * u_chromaNoiseAmt * shadowBoost;

  col.r += yn + cn * 0.7;
  col.g += yn - cn * 0.15;
  col.b += yn + cn * 1.2;

  // ── STEP 10: DROPOUTS ────────────────────────────────────────────────────
  for (float i = 0.0; i < 15.0; i++) {
    if (i >= u_dropoutCount) break;
    float s  = i * 131.1 + floor(fr * 0.5) * 41.7;
    float dy = hash1(s);
    float dx = hash1(s + 1.0);
    float dl = hash1(s + 2.0) * 120.0 / u_resolution.x;
    float dist = abs(v_uv.y - dy) * u_resolution.y;
    if (dist < 1.0 && v_uv.x > dx && v_uv.x < dx + dl) {
      float b = u_dropoutIntensity * (1.0 - dist * 0.7);
      col = mix(col, vec3(0.9 + hash(v_uv * 300.0 + fr) * 0.1), b);
    }
  }

  // ── STEP 11: LEVELS (brutal, pas de gamma smooth) ─────────────────────────
  // VHS et digicam ont des courbes de contraste dures, pas des S-curves douces
  float blackF = u_blackCrush / 255.0;
  float whiteC = u_whiteCrush / 255.0;
  col = (col - blackF) / (whiteC - blackF);

  // ── STEP 12: SCANLINES + VIGNETTE ─────────────────────────────────────────
  float scan = mod(v_uv.y * u_resolution.y, 2.0) < 1.0 ? u_scanlineIntensity : 1.0;
  col *= scan;

  if (u_vignette > 0.001) {
    vec2 vig = (v_uv - 0.5) * vec2(0.85, 1.1);
    float v  = pow(clamp(1.0 - dot(vig, vig), 0.0, 1.0), 0.3);
    col *= mix(1.0, v, u_vignette);
  }

  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`
export default src
