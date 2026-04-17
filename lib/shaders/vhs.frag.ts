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

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1,0));
  float c = hash(i + vec2(0,1));
  float d = hash(i + vec2(1,1));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}

vec3 rgb2yiq(vec3 c) {
  return vec3(
    dot(c, vec3( 0.299,  0.587,  0.114)),
    dot(c, vec3( 0.596, -0.274, -0.322)),
    dot(c, vec3( 0.211, -0.523,  0.312))
  );
}

vec3 yiq2rgb(vec3 yiq) {
  return vec3(
    dot(yiq, vec3(1.0,  0.956,  0.621)),
    dot(yiq, vec3(1.0, -0.272, -0.647)),
    dot(yiq, vec3(1.0, -1.106,  1.703))
  );
}

vec3 applyJpegDegradation(vec3 col, vec2 uv) {
  float blackFloor = u_blackCrush / 255.0;
  float whiteCeil = u_whiteCrush / 255.0;

  col = col * (whiteCeil - blackFloor) + vec3(blackFloor);

  float blockStrength = max(0.0, (100.0 - u_jpegQuality) / 100.0);
  if (blockStrength > 0.01) {
    vec2 blockUV  = floor(uv * u_resolution / 8.0) * 8.0 / u_resolution;
    vec3 blockCol = texture(u_texture, clamp(blockUV, 0.001, 0.999)).rgb;
    float lumaHere  = dot(col,      vec3(0.299, 0.587, 0.114));
    float lumaBlock = dot(blockCol, vec3(0.299, 0.587, 0.114));
    float edgeMask = 1.0 - clamp(abs(lumaHere - lumaBlock) * 15.0, 0.0, 1.0);
    col = mix(col, blockCol, blockStrength * edgeMask * 0.2);
  }

  return col;
}

vec3 applySignalArtifacts(vec3 col, vec2 uv) {
  vec2 px = 1.0 / u_resolution;

  if (u_sharpness > 0.0) {
    float sw = u_sharpnessWidth * px.x;
    vec3 left  = texture(u_texture, clamp(uv - vec2(sw, 0.0), 0.001, 0.999)).rgb;
    vec3 right = texture(u_texture, clamp(uv + vec2(sw, 0.0), 0.001, 0.999)).rgb;
    col += (col - (left + right) * 0.5) * u_sharpness;
  }

  col *= u_colorCast;

  return col;
}

vec3 applyAnalogLayer(vec3 col, vec2 uv, float frame) {
  vec2 px = 1.0 / u_resolution;

  float shift = u_chromaShift * px.x;
  float rSample = texture(u_texture, clamp(uv - vec2(shift * 0.6, 0.0), 0.001, 0.999)).r;
  float bSample = texture(u_texture, clamp(uv + vec2(shift * 0.4, 0.0), 0.001, 0.999)).b;
  col.r = rSample;
  col.b = bSample;

  vec3 yiq = rgb2yiq(col);

  float blurPx = px.x;
  vec3 yiqL  = rgb2yiq(texture(u_texture, clamp(uv - vec2(blurPx,       0.0), 0.001, 0.999)).rgb);
  vec3 yiqR  = rgb2yiq(texture(u_texture, clamp(uv + vec2(blurPx,       0.0), 0.001, 0.999)).rgb);
  vec3 yiqL2 = rgb2yiq(texture(u_texture, clamp(uv - vec2(blurPx * 2.0, 0.0), 0.001, 0.999)).rgb);
  vec3 yiqR2 = rgb2yiq(texture(u_texture, clamp(uv + vec2(blurPx * 2.0, 0.0), 0.001, 0.999)).rgb);

  yiq.x = mix(yiq.x, (yiqL.x  + yiqR.x)  * 0.5, 1.0 - u_lumaBandwidth);
  yiq.y = mix(yiq.y, (yiqL2.y + yiqR2.y) * 0.5, u_chromaI);
  yiq.z = mix(yiq.z, (yiqL2.z + yiqR2.z) * 0.5, u_chromaQ);

  if (u_lumaVertBleed > 0.0) {
    vec3 yiqUp = rgb2yiq(texture(u_texture, clamp(uv - vec2(0.0, px.y), 0.001, 0.999)).rgb);
    yiq.x = mix(yiq.x, (yiq.x + yiqUp.x) * 0.5, u_lumaVertBleed);
  }

  col = yiq2rgb(yiq);

  float yn = (hash(uv * u_resolution + frame) - 0.5) * u_lumaNoiseAmt;
  float cn = (hash(uv.yx * u_resolution + frame + 17.3) - 0.5) * u_chromaNoiseAmt;
  col += vec3(yn + cn * 0.5, yn - cn * 0.3, yn + cn);

  return col;
}

vec2 applyMechanical(vec2 uv, float frame) {
  vec2 px = 1.0 / u_resolution;
  float lineY = floor(uv.y * u_resolution.y);

  float jitterSeed = floor(lineY * (1.0 - u_jitterRoughness) + lineY * u_jitterRoughness * hash1(lineY));
  float jitterWave = sin(uv.y * u_jitterFreq * 100.0 + frame * 0.1 * 3.7);
  float jitterRand = hash(vec2(jitterSeed, frame)) - 0.5;
  float jitter     = jitterWave * jitterRand * u_jitterAmp * px.x;
  uv.x += jitter;

  float fromBottom = (1.0 - uv.y) * u_resolution.y;
  if (fromBottom < u_headSwitchHeight) {
    float t    = fromBottom / u_headSwitchHeight;
    float hNoise = (hash(vec2(uv.y * 200.0, frame)) - 0.5) * u_headSwitchAmt;
    uv.x += hNoise * (1.0 - t * t);
  }

  float totalBottom = u_headSwitchHeight + u_bottomDistHeight;
  if (fromBottom < totalBottom && fromBottom >= u_headSwitchHeight) {
    float t2 = (fromBottom - u_headSwitchHeight) / max(u_bottomDistHeight, 1.0);
    float bDist = noise(vec2(uv.y * 30.0, frame * 0.05)) * u_bottomDistAmt * (1.0 - t2);
    uv.x += (bDist - u_bottomDistAmt * 0.5) * px.x * 8.0;
  }

  return uv;
}

vec3 applyDropouts(vec3 col, vec2 uv, float frame) {
  for (float i = 0.0; i < 20.0; i++) {
    if (i >= u_dropoutCount) break;

    float seed  = i * 127.1 + floor(frame * 0.5) * 31.7;
    float dropY = hash1(seed);
    float dropX = hash1(seed + 1.0);
    float dropL = hash1(seed + 2.0) * u_dropoutMaxLen / u_resolution.x;

    float lineY = uv.y;
    float dist  = abs(lineY - dropY) * u_resolution.y;

    if (dist < 1.0 && uv.x >= dropX && uv.x <= dropX + dropL) {
      float brightness = u_dropoutIntensity * (1.0 - dist);
      col = mix(col, vec3(brightness + hash(uv * 100.0 + frame) * 0.2), brightness);
    }
  }
  return col;
}

vec3 applyDisplay(vec3 col, vec2 uv) {
  float scanMod  = mod(uv.y * u_resolution.y, 2.0);
  float scanline = scanMod < 1.0 ? u_scanlineIntensity : 1.0;
  col *= scanline;

  if (u_vignette > 0.0) {
    vec2 vigUV  = uv * 2.0 - 1.0;
    float vig   = 1.0 - dot(vigUV * vec2(0.5, 0.8), vigUV * vec2(0.5, 0.8));
    vig = clamp(vig, 0.0, 1.0);
    vig = pow(vig, 0.4);
    col *= mix(1.0, vig, u_vignette);
  }

  return col;
}

void main() {
  vec2 uv    = v_uv;
  float frame = floor(u_time * 30.0);

  uv = applyMechanical(uv, frame);

  vec3 col = texture(u_texture, clamp(uv, 0.001, 0.999)).rgb;

  col = applyJpegDegradation(col, uv);
  col = applySignalArtifacts(col, uv);
  col = applyAnalogLayer(col, uv, frame);
  col = applyDropouts(col, uv, frame);
  col = applyDisplay(col, uv);

  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

export default src
