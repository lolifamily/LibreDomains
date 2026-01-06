precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

// Simplex 2D noise
vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v) {
  const vec4 C = vec4(
    0.211324865405187,
    0.366025403784439,
    -0.577350269189626,
    0.024390243902439
  );

  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);

  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);

  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;

  return 130.0 * dot(m, g);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float ratio = u_resolution.x / u_resolution.y;

  // Correct aspect ratio for noise
  vec2 noiseUV = uv;
  noiseUV.x *= ratio;

  // Mouse interaction
  vec2 mouse = u_mouse / u_resolution.xy;
  mouse.x *= ratio;
  float dist = distance(noiseUV, mouse);
  float interaction = smoothstep(0.5, 0.0, dist);

  // Flow animation
  float time = u_time * 0.1;
  float n1 = snoise(noiseUV * 0.8 + vec2(time, time * 0.5) - interaction * 0.2);
  float n2 = snoise(noiseUV * 1.5 - vec2(time * 0.2, time) + interaction * 0.1);

  // Color mixing
  vec3 color1 = vec3(0.85, 0.27, 0.93); // Fuchsia (#d946ef)
  vec3 color2 = vec3(0.54, 0.36, 0.96); // Violet (#8b5cf6)
  vec3 color3 = vec3(0.05, 0.64, 0.91); // Sky (#0ea5e9)
  vec3 bg = vec3(0.01, 0.02, 0.09);     // Dark (#020617)

  float mix1 = smoothstep(-0.5, 0.8, n1);
  float mix2 = smoothstep(-0.5, 0.8, n2);

  vec3 finalColor = mix(bg, color1, mix1 * 0.4);
  finalColor = mix(finalColor, color2, mix2 * 0.3);
  finalColor = mix(finalColor, color3, (n1 + n2) * 0.1 + interaction * 0.2);

  gl_FragColor = vec4(finalColor, 1.0);
}
