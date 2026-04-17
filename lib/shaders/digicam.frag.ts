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

vec3 boxBlur9(vec2 uv, float r) {
  vec2 px = r / u_resolution;
  vec3 s  = vec3(0.0);
  s += texture(u_texture, clamp(uv + px * vec2(-1.0, -1.0), 0.001, 0.999)).rgb;
  s += texture(u_texture, clamp(uv + px * vec2( 0.0, -1.0), 0.001, 0.999)).rgb;
  s += texture(u_texture, clamp(uv + px * vec2( 1.0, -1.0), 0.001, 0.999)).rgb;
  s += texture(u_texture, clamp(uv + px * vec2(-1.0,  0.0), 0.001, 0.999)).rgb;
  s += texture(u_texture, uv).rgb;
  s += texture(u_texture, clamp(uv + px * vec2( 1.0,  0.0), 0.001, 0.999)).rgb;
  s += texture(u_texture, clamp(uv + px * vec2(-1.0,  1.0), 0.001, 0.999)).rgb;
  s += texture(u_texture, clamp(uv + px * vec2( 0.0,  1.0), 0.001, 0.999)).rgb;
  s += texture(u_texture, clamp(uv + px * vec2( 1.0,  1.0), 0.001, 0.999)).rgb;
  return s / 9.0;
}

void main() {
  vec2 uv  = v_uv;
  vec2 px  = 1.0 / u_resolution;
  float fr = floor(u_time * 30.0);

  // BARREL DISTORTION
  if (u_barrelDistortion > 0.001) {
    vec2 c  = uv - 0.5;
    float r2 = dot(c, c);
    uv = clamp(uv + c * r2 * u_barrelDistortion, 0.001, 0.999);
  }

  // CHROMATIC ABERRATION — radial, cubic falloff
  float dist     = length(uv - 0.5) * 2.0;
  float edge     = dist * dist * dist;
  float caAmt    = u_chromaticAb * px.x * edge;
  vec2  cDir     = normalize(uv - 0.5 + vec2(0.0001));

  vec3 col;
  col.r = texture(u_texture, clamp(uv + cDir * caAmt * 1.4,  0.001, 0.999)).r;
  col.g = texture(u_texture, uv).g;
  col.b = texture(u_texture, clamp(uv - cDir * caAmt * 0.9,  0.001, 0.999)).b;

  // LENS CENTER BLUR
  if (u_lensBlur > 0.001) {
    float centerDist = max(0.0, 1.0 - dist * 0.7);
    float blurAmt    = u_lensBlur * centerDist;
    col = mix(col, boxBlur9(uv, blurAmt * 2.5), blurAmt * 0.8);
  }

  // BAYER CCD NOISE
  vec2  pCoord = floor(uv * u_resolution);
  float fdrift = fr * 0.03;
  float nR = (hash(pCoord * vec2(1.0, 0.7) + fdrift)        - 0.5) * u_bayerNoise;
  float nG = (hash(pCoord * vec2(0.8, 1.2) + fdrift + 3.1)  - 0.5) * u_bayerNoise * 0.65;
  float nB = (hash(pCoord * vec2(1.3, 0.9) + fdrift + 7.7)  - 0.5) * u_bayerNoise * 1.35;
  float lumaBase  = dot(col, vec3(0.299, 0.587, 0.114));
  float shadowAmp = 1.0 + (1.0 - smoothstep(0.0, 0.45, lumaBase)) * 1.2;
  col.r += nR * shadowAmp;
  col.g += nG * shadowAmp;
  col.b += nB * shadowAmp;

  // HOT PIXELS
  if (u_hotPixels > 0.001) {
    float hotSeed = hash(pCoord * 0.007);
    if (hotSeed > 1.0 - u_hotPixels * 0.002) {
      float hc = hash(pCoord * 0.1);
      vec3 hotCol = hc > 0.6
        ? vec3(1.0, 0.1, 0.0)
        : hc > 0.3
          ? vec3(0.0, 0.1, 1.0)
          : vec3(1.0, 1.0, 1.0);
      col = mix(col, hotCol, 0.9);
    }
  }

  // JPEG 8x8 BLOCKS
  if (u_jpegBlock > 0.001) {
    vec2 bUV   = floor(uv * u_resolution / 8.0) * 8.0 / u_resolution;
    vec3 bCol  = texture(u_texture, clamp(bUV, 0.001, 0.999)).rgb;
    float lL   = dot(col,  vec3(0.299, 0.587, 0.114));
    float lB   = dot(bCol, vec3(0.299, 0.587, 0.114));
    float sm   = 1.0 - clamp(abs(lL - lB) * 14.0, 0.0, 1.0);
    col = mix(col, bCol, u_jpegBlock * sm * 0.2);
  }

  // JPEG CHROMA SUBSAMPLING 4:2:0
  if (u_jpegChroma > 0.001) {
    vec2 cUV   = floor(uv * u_resolution / 2.0) * 2.0 / u_resolution;
    vec3 cCol  = texture(u_texture, clamp(cUV, 0.001, 0.999)).rgb;
    float lH   = dot(col,  vec3(0.299, 0.587, 0.114));
    float lT   = dot(cCol, vec3(0.299, 0.587, 0.114));
    col.r = mix(col.r, lH + (cCol.r - lT) * 0.9, u_jpegChroma * 0.6);
    col.b = mix(col.b, lH + (cCol.b - lT) * 0.9, u_jpegChroma * 0.6);
  }

  // SONY CCD SENSOR CURVE
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  float sMask = 1.0 - smoothstep(0.0, 0.38, luma);
  col += vec3(sMask * u_shadowCompression * 0.07);
  float mMask = smoothstep(0.15, 0.5, luma) * (1.0 - smoothstep(0.5, 0.85, luma));
  vec3 desatM = vec3(luma) + (col - vec3(luma)) * u_midtoneContrast;
  col = mix(col, desatM, mMask * 0.35);
  float hMask = smoothstep(0.72, 1.0, luma);
  vec3 blueW  = vec3(luma * 0.93, luma * 0.96, min(1.0, luma * 1.08));
  col = mix(col, blueW, hMask * u_highlightShift * 0.75);

  // COLOR SCIENCE
  col *= u_colorMatrix;
  luma = dot(col, vec3(0.299, 0.587, 0.114));
  col  = mix(vec3(luma), col, u_saturation);

  // SELECTIVE CYAN BOOST — most important line for Sony CCD look
  float cyanMask = clamp((col.g + col.b - col.r * 2.1) * 1.8, 0.0, 1.0);
  col.g = mix(col.g, col.g * u_cyanBoost * 0.88, cyanMask * 0.5);
  col.b = mix(col.b, col.b * u_cyanBoost,         cyanMask * 0.5);
  col.r = mix(col.r, col.r * 0.82,                cyanMask * 0.4);

  float scMask = 1.0 - smoothstep(0.0, 0.28, luma);
  col.g += u_shadowCyan * scMask * 0.7;
  col.b += u_shadowCyan * scMask;
  col    = max(col, vec3(u_blackLift));
  col    = pow(clamp(col, 0.001, 1.0), vec3(0.87));

  // HIGHLIGHT BLOOM (CCD pixel overflow)
  luma = dot(col, vec3(0.299, 0.587, 0.114));
  float bloomM = smoothstep(u_bloomThreshold, 1.0, luma);
  if (bloomM > 0.001 && u_bloomIntensity > 0.001) {
    float r    = u_bloomRadius * 4.0;
    vec3 bloom = vec3(0.0);
    float tot  = 0.0;
    for (float bx = -2.0; bx <= 2.0; bx += 1.0) {
      for (float by = -2.0; by <= 2.0; by += 1.0) {
        float w = 1.0 / (1.0 + length(vec2(bx, by)));
        bloom  += texture(u_texture, clamp(uv + vec2(bx, by) * px * r, 0.001, 0.999)).rgb * w;
        tot    += w;
      }
    }
    bloom /= tot;
    bloom  = bloom * vec3(0.88, 0.94, 1.12);
    col    = mix(col, bloom, bloomM * u_bloomIntensity);
  }

  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`
export default src
