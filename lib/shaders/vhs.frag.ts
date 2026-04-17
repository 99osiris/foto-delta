const src = /* glsl */`#version 300 es
precision highp float;

uniform sampler2D u_texture;
uniform float u_time;
uniform vec2  u_resolution;
uniform float u_jpegQuality;
uniform float u_blackCrush;
uniform float u_whiteCrush;
uniform float u_sharpness;
uniform float u_sharpnessWidth;
uniform vec3  u_colorCast;
uniform float u_lumaBandwidth;
uniform float u_chromaI;
uniform float u_chromaQ;
uniform float u_lumaVertBleed;
uniform float u_chromaShift;
uniform float u_lumaNoiseAmt;
uniform float u_chromaNoiseAmt;
uniform float u_jitterFreq;
uniform float u_jitterAmp;
uniform float u_jitterRoughness;
uniform float u_headSwitchHeight;
uniform float u_headSwitchAmt;
uniform float u_bottomDistHeight;
uniform float u_bottomDistAmt;
uniform float u_dropoutCount;
uniform float u_dropoutMaxLen;
uniform float u_dropoutIntensity;
uniform float u_scanlineIntensity;
uniform float u_vignette;

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

void main() {
  vec2 uv    = v_uv;
  vec2 px    = 1.0 / u_resolution;
  float fr   = floor(u_time * 30.0);
  float lineY = floor(uv.y * u_resolution.y);

  // MECHANICAL — warp UV
  float jSeed = floor(lineY * mix(1.0, 0.05, u_jitterRoughness));
  float jWave = sin(uv.y * u_jitterFreq * 80.0 + fr * 0.08);
  float jRand = (hash(vec2(jSeed, fr * 0.3)) - 0.5) * 2.0;
  uv.x += jWave * jRand * u_jitterAmp * px.x;

  float fromBot = (1.0 - uv.y) * u_resolution.y;
  if (fromBot < u_headSwitchHeight) {
    float t  = fromBot / max(u_headSwitchHeight, 1.0);
    float hn = hash(vec2(floor(uv.y * 500.0), fr)) - 0.5;
    uv.x    += hn * u_headSwitchAmt * (1.0 - t * t) * 0.04;
  }
  float botZone = u_headSwitchHeight + u_bottomDistHeight;
  if (fromBot < botZone && fromBot >= u_headSwitchHeight) {
    float t2  = (fromBot - u_headSwitchHeight) / max(u_bottomDistHeight, 1.0);
    float bd  = noise2(vec2(uv.y * 20.0, fr * 0.04)) - 0.5;
    uv.x     += bd * u_bottomDistAmt * (1.0 - t2) * px.x * 12.0;
  }
  uv = clamp(uv, 0.001, 0.999);

  // BASE COLOR + LEVELS
  vec3 col = texture(u_texture, uv).rgb;
  float blackF = u_blackCrush / 255.0;
  float whiteC = u_whiteCrush / 255.0;
  col = col * (whiteC - blackF) + vec3(blackF);

  // RINGING
  if (u_sharpness > 0.001) {
    float sw  = u_sharpnessWidth * px.x;
    vec3 colL = texture(u_texture, clamp(uv - vec2(sw,  0.0), 0.001, 0.999)).rgb;
    vec3 colR = texture(u_texture, clamp(uv + vec2(sw,  0.0), 0.001, 0.999)).rgb;
    col += (col - (colL + colR) * 0.5) * u_sharpness;
  }
  col *= u_colorCast;

  // CHROMA SHIFT
  float cs = u_chromaShift * px.x;
  col.r = texture(u_texture, clamp(uv - vec2(cs * 0.65, 0.0), 0.001, 0.999)).r;
  col.b = texture(u_texture, clamp(uv + vec2(cs * 0.35, 0.0), 0.001, 0.999)).b;

  // YIQ BANDWIDTH
  vec3 yiq = rgb2yiq(col);
  vec3 yL  = rgb2yiq(texture(u_texture, clamp(uv - vec2(px.x,        0.0), 0.001, 0.999)).rgb);
  vec3 yR  = rgb2yiq(texture(u_texture, clamp(uv + vec2(px.x,        0.0), 0.001, 0.999)).rgb);
  vec3 yL2 = rgb2yiq(texture(u_texture, clamp(uv - vec2(px.x * 2.0, 0.0), 0.001, 0.999)).rgb);
  vec3 yR2 = rgb2yiq(texture(u_texture, clamp(uv + vec2(px.x * 2.0, 0.0), 0.001, 0.999)).rgb);
  yiq.x = mix(yiq.x, (yL.x  + yR.x)  * 0.5, 1.0 - u_lumaBandwidth);
  yiq.y = mix(yiq.y, (yL2.y + yR2.y) * 0.5, u_chromaI);
  yiq.z = mix(yiq.z, (yL2.z + yR2.z) * 0.5, u_chromaQ);
  if (u_lumaVertBleed > 0.001) {
    vec3 yUp = rgb2yiq(texture(u_texture, clamp(uv - vec2(0.0, px.y), 0.001, 0.999)).rgb);
    yiq.x = mix(yiq.x, (yiq.x + yUp.x) * 0.5, u_lumaVertBleed);
  }
  col = yiq2rgb(yiq);

  // TAPE NOISE
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  float sBoost = 1.0 + (1.0 - smoothstep(0.0, 0.5, luma)) * 0.8;
  float yn = (hash(uv * u_resolution + vec2(fr * 7.1, fr * 3.3)) - 0.5) * u_lumaNoiseAmt * sBoost;
  float cn = (hash(uv.yx * u_resolution + vec2(fr * 5.7, fr * 9.1)) - 0.5) * u_chromaNoiseAmt * sBoost;
  col.r += yn + cn * 0.6;
  col.g += yn - cn * 0.2;
  col.b += yn + cn * 1.1;

  // JPEG BLOCKS
  float blockStr = max(0.0, (100.0 - u_jpegQuality) / 100.0);
  if (blockStr > 0.01) {
    vec2 bUV   = floor(uv * u_resolution / 8.0) * 8.0 / u_resolution;
    vec3 bCol  = texture(u_texture, clamp(bUV, 0.001, 0.999)).rgb;
    float lumaB = dot(bCol, vec3(0.299, 0.587, 0.114));
    luma = dot(col, vec3(0.299, 0.587, 0.114));
    float edge = 1.0 - clamp(abs(luma - lumaB) * 12.0, 0.0, 1.0);
    col = mix(col, bCol, blockStr * edge * 0.22);
  }

  // DROPOUTS
  for (float i = 0.0; i < 20.0; i++) {
    if (i >= u_dropoutCount) break;
    float s  = i * 131.1 + floor(fr * 0.4) * 41.7;
    float dy = hash1(s);
    float dx = hash1(s + 1.0);
    float dl = hash1(s + 2.0) * u_dropoutMaxLen / u_resolution.x;
    float dist = abs(uv.y - dy) * u_resolution.y;
    if (dist < 1.0 && uv.x > dx && uv.x < dx + dl) {
      float b = u_dropoutIntensity * (1.0 - dist * 0.8);
      col = mix(col, vec3(0.85 + hash(uv * 200.0 + fr) * 0.15), b);
    }
  }

  // SCANLINES + VIGNETTE
  float scan = mod(uv.y * u_resolution.y, 2.0) < 1.0 ? u_scanlineIntensity : 1.0;
  col *= scan;
  if (u_vignette > 0.001) {
    vec2 vig = (uv - 0.5) * vec2(0.9, 1.2);
    float v  = pow(clamp(1.0 - dot(vig, vig), 0.0, 1.0), 0.35);
    col *= mix(1.0, v, u_vignette);
  }

  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`
export default src
