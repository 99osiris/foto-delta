const src = /* glsl */`#version 300 es
precision highp float;

uniform sampler2D u_texture;
uniform float     u_time;
uniform vec2      u_resolution;

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

vec3 boxBlur(vec2 uv, float r) {
  vec2 px = r / u_resolution;
  vec3 s  = vec3(0.0);
  for(float x = -1.0; x <= 1.0; x++) {
    for(float y = -1.0; y <= 1.0; y++) {
      s += texture(u_texture, clamp(uv + px * vec2(x, y), 0.001, 0.999)).rgb;
    }
  }
  return s / 9.0;
}

vec3 applyBayerNoise(vec3 col, vec2 uv) {
  vec2 pixelCoord = floor(uv * u_resolution);
  float px = mod(pixelCoord.x, 2.0);
  float py = mod(pixelCoord.y, 2.0);

  float frame = floor(u_time * 30.0);
  float noiseR = (hash(pixelCoord * vec2(1.0, 0.7) + frame * 0.05) - 0.5) * u_bayerNoise;
  float noiseG = (hash(pixelCoord * vec2(0.9, 1.1) + frame * 0.05 + 3.1) - 0.5) * u_bayerNoise * 0.7;
  float noiseB = (hash(pixelCoord * vec2(1.1, 0.8) + frame * 0.05 + 7.3) - 0.5) * u_bayerNoise * 1.4;

  float rWeight = (px == 0.0 && py == 0.0) ? 0.4 : 1.0;
  float bWeight = (px == 1.0 && py == 1.0) ? 0.4 : 1.0;

  col.r += noiseR * rWeight;
  col.g += noiseG;
  col.b += noiseB * bWeight;

  float hotSeed = hash(pixelCoord * 0.01);
  float hotThreshold = 1.0 - (u_hotPixels * 0.001);
  if (hotSeed > hotThreshold) {
    float hotColor = hash(pixelCoord * 0.1);
    col = mix(col, vec3(hotColor > 0.6 ? 1.0 : 0.0, hotColor < 0.4 ? 0.9 : 0.1, hotColor > 0.7 ? 0.95 : 0.0), 0.85);
  }

  return col;
}

vec3 applyLens(vec3 col, vec2 uv) {
  vec2 px = 1.0 / u_resolution;

  if (u_barrelDistortion > 0.0) {
    vec2 centered = uv - 0.5;
    float r2 = dot(centered, centered);
    uv = uv + centered * r2 * u_barrelDistortion;
    uv = clamp(uv, 0.001, 0.999);
    col = texture(u_texture, uv).rgb;
  }

  float dist = length(uv - 0.5) * 2.0;
  float centerBlur = u_lensBlur * max(0.0, 1.0 - dist * 1.2);
  col = mix(col, boxBlur(uv, centerBlur * 2.0), centerBlur);

  float edgeFactor = dist * dist;
  float caShift    = u_chromaticAb * (1.0 / u_resolution.x) * edgeFactor;
  vec2 rd = uv - 0.5;
  float rdLen = length(rd);
  vec2 radialDir = rdLen > 0.0001 ? rd / rdLen : vec2(1.0, 0.0);
  col.r = texture(u_texture, clamp(uv + radialDir * caShift * 1.2, 0.001, 0.999)).r;
  col.b = texture(u_texture, clamp(uv - radialDir * caShift * 0.8, 0.001, 0.999)).b;

  return col;
}

vec3 applyJpeg(vec3 col, vec2 uv) {
  if (u_jpegBlock < 0.01) return col;

  vec2 blockUV    = floor(uv * u_resolution / 8.0) * 8.0 / u_resolution;
  vec3 blockCol   = texture(u_texture, clamp(blockUV, 0.001, 0.999)).rgb;
  float lumaLocal = dot(col,      vec3(0.299, 0.587, 0.114));
  float lumaBlock = dot(blockCol, vec3(0.299, 0.587, 0.114));
  float smoothMask = 1.0 - clamp(abs(lumaLocal - lumaBlock) * 18.0, 0.0, 1.0);
  col = mix(col, blockCol, u_jpegBlock * smoothMask * 0.18);

  if (u_jpegChroma > 0.0) {
    vec2 chromaBlock = floor(uv * u_resolution / 2.0) * 2.0 / u_resolution;
    vec3 chromaCol   = texture(u_texture, clamp(chromaBlock, 0.001, 0.999)).rgb;
    float lumaOrig   = dot(col, vec3(0.299, 0.587, 0.114));
    float lumaChroma = dot(chromaCol, vec3(0.299, 0.587, 0.114));
    vec3 result = col;
    result.r = mix(col.r, lumaOrig + (chromaCol.r - lumaChroma), u_jpegChroma);
    result.b = mix(col.b, lumaOrig + (chromaCol.b - lumaChroma), u_jpegChroma);
    col = result;
  }

  return col;
}

vec3 applySensorCurve(vec3 col) {
  float luma = dot(col, vec3(0.299, 0.587, 0.114));

  float shadowMask = 1.0 - smoothstep(0.0, 0.4, luma);
  float shadowLift = shadowMask * u_shadowCompression * 0.08;
  col += vec3(shadowLift);

  float midMask = smoothstep(0.15, 0.85, luma) * (1.0 - smoothstep(0.85, 1.0, luma));
  col = mix(col, vec3(luma) + (col - vec3(luma)) * u_midtoneContrast, midMask * 0.4);

  float highlightMask = smoothstep(0.75, 1.0, luma);
  vec3 blueWhite = vec3(
    luma * 0.95,
    luma * 0.97,
    min(1.0, luma * 1.06)
  );
  col = mix(col, blueWhite, highlightMask * u_highlightShift * 0.7);

  return col;
}

vec3 applyColorScience(vec3 col) {
  col *= u_colorMatrix;

  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(luma), col, u_saturation);

  float cyanMask = clamp((col.g + col.b - col.r * 2.0) * 2.0, 0.0, 1.0);
  col = mix(col, col * vec3(0.82, u_cyanBoost * 0.88, u_cyanBoost), cyanMask * 0.55);

  float shadowMask = 1.0 - smoothstep(0.0, 0.30, luma);
  col.g += u_shadowCyan * shadowMask * 0.75;
  col.b += u_shadowCyan * shadowMask;

  col = max(col, vec3(u_blackLift));

  col = pow(clamp(col, 0.001, 1.0), vec3(0.86));

  return col;
}

vec3 applyHighlightBloom(vec3 col, vec2 uv) {
  if (u_bloomIntensity < 0.01) return col;

  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  float bloomMask = smoothstep(u_bloomThreshold, 1.0, luma);

  if (bloomMask > 0.001) {
    vec2 px = 1.0 / u_resolution;
    float r = u_bloomRadius * 3.0;
    vec3 bloom = vec3(0.0);
    float total = 0.0;
    for (float bx = -2.0; bx <= 2.0; bx += 1.0) {
      for (float by = -2.0; by <= 2.0; by += 1.0) {
        vec2 sampleUV = clamp(uv + vec2(bx, by) * px * r, 0.001, 0.999);
        vec3 s = texture(u_texture, sampleUV).rgb;
        float w = 1.0 / (1.0 + length(vec2(bx, by)));
        bloom += s * w;
        total += w;
      }
    }
    bloom /= total;

    bloom *= vec3(0.9, 0.95, 1.1);
    col = mix(col, bloom, bloomMask * u_bloomIntensity);
  }

  return col;
}

void main() {
  vec2 uv = v_uv;
  vec3 col = texture(u_texture, uv).rgb;

  col = applyBayerNoise(col, uv);
  col = applyLens(col, uv);
  col = applyJpeg(col, uv);
  col = applySensorCurve(col);
  col = applyColorScience(col);
  col = applyHighlightBloom(col, uv);

  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

export default src
