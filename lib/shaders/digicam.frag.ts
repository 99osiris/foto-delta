const src = /* glsl */`#version 300 es
precision highp float;

uniform sampler2D u_texture;
uniform float     u_time;
uniform vec2      u_resolution;
uniform float u_sensorNoise;
uniform float u_jpegBlock;
uniform float u_lensBlur;
uniform float u_chromaticAberration;
uniform float u_shadowCyan;
uniform float u_saturation;
uniform float u_cyanBoost;
uniform float u_highlightBlowout;
uniform float u_blackLift;
uniform vec3  u_colorCast;
uniform float u_chromaShift;
uniform float u_noiseY;

in vec2  v_uv;
out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec3 boxBlur(vec2 uv, float r) {
  vec2 px = r / u_resolution;
  vec3 s = vec3(0.0);
  s += texture(u_texture, uv + px * vec2(-1.0,-1.0)).rgb;
  s += texture(u_texture, uv + px * vec2( 0.0,-1.0)).rgb;
  s += texture(u_texture, uv + px * vec2( 1.0,-1.0)).rgb;
  s += texture(u_texture, uv + px * vec2(-1.0, 0.0)).rgb;
  s += texture(u_texture, uv                        ).rgb;
  s += texture(u_texture, uv + px * vec2( 1.0, 0.0)).rgb;
  s += texture(u_texture, uv + px * vec2(-1.0, 1.0)).rgb;
  s += texture(u_texture, uv + px * vec2( 0.0, 1.0)).rgb;
  s += texture(u_texture, uv + px * vec2( 1.0, 1.0)).rgb;
  return s / 9.0;
}

void main() {
  vec2  uv    = v_uv;
  vec2  px    = 1.0 / u_resolution;
  float frame = floor(u_time * 30.0);

  float distFromCenter = length(uv - 0.5) * 2.0;
  float blurAmount     = u_lensBlur * (1.0 - distFromCenter * 0.6);
  vec3  col = mix(texture(u_texture, uv).rgb, boxBlur(uv, blurAmount * 1.5), blurAmount);

  vec2  center     = vec2(0.5);
  vec2  dir        = normalize(uv - center);
  float edgeFactor = distFromCenter * distFromCenter;
  float shift      = u_chromaticAberration * px.x * edgeFactor;
  col.r = texture(u_texture, uv + dir * shift).r;
  col.b = texture(u_texture, uv - dir * shift * 0.7).b;

  float cs = u_chromaShift * px.x;
  col.r = mix(col.r, texture(u_texture, uv - vec2(cs, 0.0)).r, 0.4);

  vec2  blockUV   = floor(uv * u_resolution / 8.0) * 8.0 / u_resolution;
  vec3  blockCol  = texture(u_texture, blockUV).rgb;
  float lumaOrig  = dot(col,      vec3(0.299, 0.587, 0.114));
  float lumaBlock = dot(blockCol, vec3(0.299, 0.587, 0.114));
  float isSmooth  = 1.0 - clamp(abs(lumaOrig - lumaBlock) * 20.0, 0.0, 1.0);
  col = mix(col, blockCol, u_jpegBlock * isSmooth * 0.15);

  col *= u_colorCast;

  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(luma), col, u_saturation);

  float isCyan = clamp((col.g + col.b - col.r * 2.0) * 2.0, 0.0, 1.0);
  col = mix(col, col * vec3(0.85, u_cyanBoost * 0.9, u_cyanBoost), isCyan * 0.5);

  float shadowMask = 1.0 - smoothstep(0.0, 0.35, luma);
  col.g += u_shadowCyan * shadowMask * 0.8;
  col.b += u_shadowCyan * shadowMask;

  col = max(col, vec3(u_blackLift));

  float highlightMask = smoothstep(u_highlightBlowout, 1.0, luma);
  vec3  blown         = vec3(mix(luma, 0.96, 0.5));
  col = mix(col, blown, highlightMask * 0.7);

  vec2  pixelCoord = floor(uv * u_resolution);
  float noiseR = (hash(pixelCoord + vec2(0.0, frame * 0.1)) - 0.5) * u_sensorNoise;
  float noiseG = (hash(pixelCoord + vec2(1.3, frame * 0.1)) - 0.5) * u_sensorNoise;
  float noiseB = (hash(pixelCoord + vec2(2.7, frame * 0.1)) - 0.5) * u_sensorNoise * 1.3;
  float noiseShadowBoost = 1.0 - smoothstep(0.0, 0.6, luma);
  col += vec3(noiseR, noiseG, noiseB) * (0.6 + noiseShadowBoost * 0.4);

  float yn = (hash(pixelCoord + vec2(5.1, frame)) - 0.5) * u_noiseY;
  col += vec3(yn);

  col = pow(clamp(col, 0.001, 1.0), vec3(0.88));

  fragColor = vec4(col, 1.0);
}`

export default src
