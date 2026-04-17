const src = /* glsl */`#version 300 es
precision highp float;

uniform sampler2D u_texture;
uniform float u_time;
uniform vec2  u_resolution;

uniform float u_bayerNoise;
uniform float u_hotPixels;
uniform float u_lensBlur;
uniform float u_chromaticAb;
uniform float u_barrelDistortion;
uniform float u_jpegBlock;
uniform float u_jpegChroma;
uniform float u_shadowCompression;
uniform float u_midtoneContrast;
uniform float u_highlightShift;
uniform float u_saturation;
uniform float u_cyanBoost;
uniform float u_shadowCyan;
uniform float u_blackLift;
uniform vec3  u_colorMatrix;
uniform float u_bloomThreshold;
uniform float u_bloomRadius;
uniform float u_bloomIntensity;

in vec2  v_uv;
out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float hash1(float n) {
  return fract(sin(n) * 43758.5453);
}
vec2 tex(vec2 uv) { return clamp(uv, 0.001, 0.999); }

// ── BARREL DISTORTION ─────────────────────────────────────────────────────
// Sony compact lenses have mild barrel distortion at wide end
vec2 barrel(vec2 uv, float k) {
  vec2 c = uv - 0.5;
  float r2 = dot(c, c);
  return uv + c * r2 * k;
}

// ── 9-TAP BOX BLUR ────────────────────────────────────────────────────────
vec3 boxBlur9(vec2 uv, float r) {
  vec2 px = r / u_resolution;
  vec3 s = vec3(0.0);
  for (float x = -1.0; x <= 1.0; x += 1.0) {
    for (float y = -1.0; y <= 1.0; y += 1.0) {
      s += texture(u_texture, tex(uv + px * vec2(x, y))).rgb;
    }
  }
  return s / 9.0;
}

void main() {
  vec2 uv = v_uv;
  vec2 px = 1.0 / u_resolution;
  float frame = floor(u_time * 30.0);

  // ── LAYER 1: BARREL DISTORTION ──────────────────────────────────────────
  if (u_barrelDistortion > 0.001) {
    uv = tex(barrel(uv, u_barrelDistortion));
  }

  // ── LAYER 2: CHROMATIC ABERRATION ────────────────────────────────────────
  // Sony CyberShot lenses show strong lateral CA at corners
  // R channel shifts outward from center, B shifts inward
  vec3 col;
  float dist = length(uv - 0.5) * 2.0;
  float edge = dist * dist * dist; // cubic — strong near corners
  float caAmt = u_chromaticAb * px.x * edge;
  vec2  cDir = normalize(uv - 0.5 + vec2(0.0001));

  col.r = texture(u_texture, tex(uv + cDir * caAmt * 1.4)).r;
  col.g = texture(u_texture, tex(uv)).g;
  col.b = texture(u_texture, tex(uv - cDir * caAmt * 0.9)).b;

  // ── LAYER 3: LENS BLUR (center softness) ─────────────────────────────────
  // Sony compact lenses are sharper at edges than center at closer distances
  // This is the opposite of DSLR — cheap fixed focal length behavior
  if (u_lensBlur > 0.001) {
    float centerDist = 1.0 - dist * 0.7;
    float blurAmt = u_lensBlur * max(0.0, centerDist);
    col = mix(col, boxBlur9(uv, blurAmt * 2.5), blurAmt * 0.8);
  }

  // ── LAYER 4: BAYER SENSOR NOISE ──────────────────────────────────────────
  // CCD Bayer pattern: RGGB tiling, each channel independent
  // Noise is pixel-locked (not frame-varying for stills) with slight frame drift for video
  vec2 pCoord = floor(uv * u_resolution);
  float frameDrift = frame * 0.03;

  // Per-pixel, per-channel independent noise
  float nR = (hash(pCoord * vec2(1.0,  0.7) + frameDrift) - 0.5) * u_bayerNoise;
  float nG = (hash(pCoord * vec2(0.8,  1.2) + frameDrift + 3.1) - 0.5) * u_bayerNoise * 0.65;
  float nB = (hash(pCoord * vec2(1.3,  0.9) + frameDrift + 7.7) - 0.5) * u_bayerNoise * 1.35;

  // Noise is heavier in shadows (CCD characteristic)
  float lumaBase = dot(col, vec3(0.299, 0.587, 0.114));
  float shadowAmp = 1.0 + (1.0 - smoothstep(0.0, 0.45, lumaBase)) * 1.2;
  col.r += nR * shadowAmp;
  col.g += nG * shadowAmp;
  col.b += nB * shadowAmp;

  // Hot pixels — dead CCD sensor sites, rare but visible
  // DSC-S50 was known for a few hot pixels after 2-3 years use
  if (u_hotPixels > 0.001) {
    float hotSeed = hash(pCoord * 0.007);
    if (hotSeed > 1.0 - u_hotPixels * 0.002) {
      float hc = hash(pCoord * 0.1);
      vec3 hotColor = hc > 0.6
        ? vec3(1.0, 0.1, 0.0)  // red hot pixel
        : hc > 0.3
          ? vec3(0.0, 0.1, 1.0)  // blue hot pixel
          : vec3(1.0, 1.0, 1.0); // white hot pixel
      col = mix(col, hotColor, 0.9);
    }
  }

  // ── LAYER 5: JPEG COMPRESSION ─────────────────────────────────────────────
  // Sony DSC cameras used aggressive JPEG compression, especially T90
  // 8x8 DCT blocks visible in smooth areas (sky, skin, gradients)
  if (u_jpegBlock > 0.001) {
    vec2 bUV    = floor(uv * u_resolution / 8.0) * 8.0 / u_resolution;
    vec3 bCol   = texture(u_texture, tex(bUV)).rgb;
    float lumaL = dot(col,  vec3(0.299, 0.587, 0.114));
    float lumaB = dot(bCol, vec3(0.299, 0.587, 0.114));
    float smooth = 1.0 - clamp(abs(lumaL - lumaB) * 14.0, 0.0, 1.0);
    col = mix(col, bCol, u_jpegBlock * smooth * 0.2);
  }

  // JPEG chroma subsampling 4:2:0
  // Color blurs by 2x2 grid while luma stays sharp → typical digicam softness
  if (u_jpegChroma > 0.001) {
    vec2 cUV  = floor(uv * u_resolution / 2.0) * 2.0 / u_resolution;
    vec3 cCol = texture(u_texture, tex(cUV)).rgb;
    float lumaHere  = dot(col,  vec3(0.299, 0.587, 0.114));
    float lumaThere = dot(cCol, vec3(0.299, 0.587, 0.114));
    // Blend color (chroma) but keep current luma
    col.r = mix(col.r, lumaHere + (cCol.r - lumaThere) * 0.9, u_jpegChroma * 0.6);
    col.b = mix(col.b, lumaHere + (cCol.b - lumaThere) * 0.9, u_jpegChroma * 0.6);
  }

  // ── LAYER 6: SONY CCD SENSOR CURVE ───────────────────────────────────────
  // Sony CCD chips had a specific S-curve:
  // 1. Shadows lifted and slightly compressed (milky look)
  // 2. Midtones slightly flat (less contrast than film)
  // 3. Highlights clip to blue-white (CCD saturation behavior)
  float luma = dot(col, vec3(0.299, 0.587, 0.114));

  // Shadow lift — characteristic "lifted blacks" of CCD sensors
  float shadowMask = 1.0 - smoothstep(0.0, 0.38, luma);
  col += vec3(shadowMask * u_shadowCompression * 0.07);

  // Midtone contrast reduction
  float midMask = smoothstep(0.15, 0.5, luma) * (1.0 - smoothstep(0.5, 0.85, luma));
  vec3 desatMid = vec3(luma) + (col - vec3(luma)) * u_midtoneContrast;
  col = mix(col, desatMid, midMask * 0.35);

  // Highlight shift — Sony CCD clips to blue-white, not neutral white
  float hiMask = smoothstep(0.72, 1.0, luma);
  vec3 blueWhite = vec3(luma * 0.93, luma * 0.96, min(1.0, luma * 1.08));
  col = mix(col, blueWhite, hiMask * u_highlightShift * 0.75);

  // ── LAYER 7: COLOR SCIENCE ────────────────────────────────────────────────
  // Sony CCD cameras: cold sensor, boosted blue, depressed red
  // Specific to Sony: cyan/teal colors rendered with unusual vividness
  col *= u_colorMatrix;

  // Global desaturation — early CCD had narrow color gamut
  luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(luma), col, u_saturation);

  // SELECTIVE CYAN BOOST — the most important line in this shader
  // Sony CCD sensors had a resonance in the cyan/teal range
  // This is what makes the Sami Seck / Shine Luxury look so distinctive
  float cyanMask = clamp((col.g + col.b - col.r * 2.1) * 1.8, 0.0, 1.0);
  col.g = mix(col.g, col.g * u_cyanBoost * 0.88, cyanMask * 0.5);
  col.b = mix(col.b, col.b * u_cyanBoost,         cyanMask * 0.5);
  col.r = mix(col.r, col.r * 0.82,                cyanMask * 0.4);

  // Shadow cyan tint — darks go cyan-green, not neutral black
  float sMask = 1.0 - smoothstep(0.0, 0.28, luma);
  col.g += u_shadowCyan * sMask * 0.7;
  col.b += u_shadowCyan * sMask;

  // Black lift — CCD sensor noise floor, no true black
  col = max(col, vec3(u_blackLift));

  // Sony CCD gamma — slightly elevated (0.87 approx)
  col = pow(clamp(col, 0.001, 1.0), vec3(0.87));

  // ── LAYER 8: HIGHLIGHT BLOOM ─────────────────────────────────────────────
  // CCD sensors bleed bright areas into neighbors — not lens flare,
  // but pixel capacitor overflow. Creates a soft cold glow on highlights.
  luma = dot(col, vec3(0.299, 0.587, 0.114));
  float bloomMask = smoothstep(u_bloomThreshold, 1.0, luma);
  if (bloomMask > 0.001 && u_bloomIntensity > 0.001) {
    float r = u_bloomRadius * 4.0;
    vec3 bloom = vec3(0.0);
    float total = 0.0;
    for (float bx = -2.0; bx <= 2.0; bx += 1.0) {
      for (float by = -2.0; by <= 2.0; by += 1.0) {
        float w = 1.0 / (1.0 + length(vec2(bx, by)));
        bloom += texture(u_texture, tex(uv + vec2(bx, by) * px * r)).rgb * w;
        total += w;
      }
    }
    bloom /= total;
    // Bloom is cold — CCD overexposure is always blue-tinted
    bloom = bloom * vec3(0.88, 0.94, 1.12);
    col = mix(col, bloom, bloomMask * u_bloomIntensity);
  }

  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`
export default src
