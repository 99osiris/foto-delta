const src = /* glsl */`#version 300 es
precision highp float;

uniform sampler2D u_texture;
uniform vec2      u_resolution;

// HUE par zone (adapté de lil_sue CC0)
uniform float u_masterHue;    // -180 à 180  défaut 0.0
uniform float u_shadowHue;    // -180 à 180  défaut 0.0
uniform float u_midHue;       // -180 à 180  défaut 0.0
uniform float u_highHue;      // -180 à 180  défaut 0.0

// SATURATION par zone
uniform float u_masterSat;    // 0.0 à 2.0   défaut 1.0
uniform float u_shadowSat;    // 0.0 à 2.0   défaut 1.0
uniform float u_midSat;       // 0.0 à 2.0   défaut 1.0
uniform float u_highSat;      // 0.0 à 2.0   défaut 1.0

// BRIGHTNESS par zone
uniform float u_masterVal;    // 0.0 à 2.0   défaut 1.0
uniform float u_shadowVal;    // -0.5 à 0.5  défaut 0.0
uniform float u_midVal;       // -0.5 à 0.5  défaut 0.0
uniform float u_highVal;      // -0.5 à 0.5  défaut 0.0

// CONTRAST + TINT
uniform float u_contrast;     // 0.5 à 2.0   défaut 1.0
uniform float u_pivot;        // 0.0 à 1.0   défaut 0.5
uniform float u_tintStrength; // 0.0 à 1.0   défaut 0.0
uniform vec3  u_tintColor;    // RGB          défaut 1.0/1.0/1.0

in vec2  v_uv;
out vec4 fragColor;

// Rotation de teinte via formule de Rodrigues (adapté de lil_sue CC0)
vec3 applyHue(vec3 c, float h) {
  if (abs(h) < 0.001) return c;
  vec3  k = vec3(0.57735);
  float a = radians(h);
  return c * cos(a) + cross(k, c) * sin(a) + k * dot(k, c) * (1.0 - cos(a));
}

void main() {
  vec3  col = texture(u_texture, v_uv).rgb;
  float lum = dot(col, vec3(0.299, 0.587, 0.114));

  // Zone masks (adapté de lil_sue CC0)
  float sMask  = smoothstep(0.25, 0.0,  lum);
  float mMask  = smoothstep(0.25, 0.5,  lum) * smoothstep(0.75, 0.5, lum);
  float hMask  = smoothstep(0.75, 1.0,  lum);

  // 1. HUE par zone
  float hueShift = u_masterHue
                 + u_shadowHue * sMask
                 + u_midHue    * mMask
                 + u_highHue   * hMask;
  col = applyHue(col, hueShift);

  // 2. SATURATION par zone
  float gray   = dot(col, vec3(0.299, 0.587, 0.114));
  float satMul = u_masterSat
               * (1.0 + (u_shadowSat - 1.0) * sMask
                      + (u_midSat    - 1.0) * mMask
                      + (u_highSat   - 1.0) * hMask);
  col = mix(vec3(gray), col, satMul);

  // 3. BRIGHTNESS par zone
  col += u_shadowVal * sMask
       + u_midVal    * mMask
       + u_highVal   * hMask;
  col *= u_masterVal;

  // 4. CONTRAST avec pivot
  col = (col - u_pivot) * u_contrast + u_pivot;

  // 5. TINT sur luma finale
  float finalLum  = dot(col, vec3(0.299, 0.587, 0.114));
  vec3  monoTint  = vec3(finalLum) * u_tintColor;
  col = mix(col, monoTint, u_tintStrength);

  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`
export default src
