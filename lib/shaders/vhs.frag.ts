const src = /* glsl */`#version 300 es
precision highp float;

uniform sampler2D u_texture;
uniform float u_time;
uniform vec2  u_resolution;

uniform float u_chromaShift;
uniform float u_chromaBlurI;
uniform float u_chromaBlurQ;
uniform float u_lumaBandwidth;
uniform float u_lumaVertBleed;
uniform float u_jitterFreq;
uniform float u_jitterAmp;
uniform float u_jitterRoughness;
uniform float u_headSwitchHeight;
uniform float u_headSwitchAmount;
uniform float u_noiseY;
uniform float u_noiseC;
uniform float u_dropoutCount;
uniform float u_dropoutMaxLen;
uniform float u_dropoutIntensity;
uniform float u_scanlineIntensity;
uniform float u_sharpness;
uniform float u_sharpnessWidth;
uniform vec3  u_colorCast;
uniform float u_blackCrush;
uniform float u_whiteCrush;

in vec2 v_uv;
out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float hash1(float n) {
  return fract(sin(n) * 43758.5453);
}

vec3 rgb2yiq(vec3 c) {
  return vec3(
    dot(c, vec3(0.299,  0.587,  0.114)),
    dot(c, vec3(0.596, -0.274, -0.322)),
    dot(c, vec3(0.211, -0.523,  0.312))
  );
}

vec3 yiq2rgb(vec3 yiq) {
  return vec3(
    dot(yiq, vec3(1.0,  0.956,  0.621)),
    dot(yiq, vec3(1.0, -0.272, -0.647)),
    dot(yiq, vec3(1.0, -1.106,  1.703))
  );
}

void main() {
  vec2 uv = v_uv;
  vec2 px = 1.0 / u_resolution;
  float frame = floor(u_time * 30.0);

  float jBase = sin(uv.y * u_jitterFreq * 100.0 + u_time * 3.7);
  float jRand = hash(vec2(floor(uv.y * u_resolution.y * u_jitterRoughness), frame));
  float jitter = jBase * jRand * u_jitterAmp * px.x;
  uv.x += jitter;

  float fromBottom = (1.0 - uv.y) * u_resolution.y;
  if (fromBottom < u_headSwitchHeight) {
    float t = fromBottom / u_headSwitchHeight;
    float hsNoise = (hash(vec2(uv.y * 100.0, frame)) - 0.5) * u_headSwitchAmount;
    uv.x += hsNoise * (1.0 - t * t);
  }

  float shift = u_chromaShift * px.x;
  float r = texture(u_texture, clamp(uv - vec2(shift, 0.0), 0.0, 1.0)).r;
  float g = texture(u_texture, clamp(uv,                    0.0, 1.0)).g;
  float b = texture(u_texture, clamp(uv + vec2(shift, 0.0), 0.0, 1.0)).b;
  vec3 col = vec3(r, g, b);

  if (u_sharpness > 0.0) {
    float sw = u_sharpnessWidth * px.x;
    vec3 left  = texture(u_texture, clamp(uv - vec2(sw, 0.0), 0.0, 1.0)).rgb;
    vec3 right = texture(u_texture, clamp(uv + vec2(sw, 0.0), 0.0, 1.0)).rgb;
    col += (col - (left + right) * 0.5) * u_sharpness;
  }

  vec3 yiq = rgb2yiq(col);
  float blurStep = px.x * 2.0;
  vec3 yiqL = rgb2yiq(texture(u_texture, clamp(uv - vec2(blurStep, 0.0), 0.0, 1.0)).rgb);
  vec3 yiqR = rgb2yiq(texture(u_texture, clamp(uv + vec2(blurStep, 0.0), 0.0, 1.0)).rgb);
  yiq.y = mix(yiq.y, (yiqL.y + yiqR.y) * 0.5, u_chromaBlurI);
  yiq.z = mix(yiq.z, (yiqL.z + yiqR.z) * 0.5, u_chromaBlurQ);

  vec3 yiqB = rgb2yiq(texture(u_texture, clamp(uv - vec2(px.x, 0.0), 0.0, 1.0)).rgb);
  vec3 yiqF = rgb2yiq(texture(u_texture, clamp(uv + vec2(px.x, 0.0), 0.0, 1.0)).rgb);
  yiq.x = mix(yiq.x, (yiqB.x + yiqF.x) * 0.5, 1.0 - u_lumaBandwidth);

  if (u_lumaVertBleed > 0.0) {
    vec3 yiqU = rgb2yiq(texture(u_texture, clamp(uv - vec2(0.0, px.y), 0.0, 1.0)).rgb);
    yiq.x = mix(yiq.x, (yiq.x + yiqU.x) * 0.5, u_lumaVertBleed);
  }

  col = yiq2rgb(yiq);

  float yn = (hash(vec2(uv * u_resolution) + frame) - 0.5) * u_noiseY;
  float cn = (hash(vec2(uv.yx * u_resolution) + frame + 7.3) - 0.5) * u_noiseC;
  col += vec3(yn + cn, yn - cn * 0.5, yn);

  float scanMod = mod(uv.y * u_resolution.y, 2.0);
  float scanline = scanMod < 1.0 ? u_scanlineIntensity : 1.0;
  col *= scanline;

  col *= u_colorCast;

  col = (col - u_blackCrush / 255.0) / (1.0 - u_blackCrush / 255.0 - (255.0 - u_whiteCrush) / 255.0);

  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

export default src
