uniform float uTime;
uniform vec3  uColor;
uniform float uFresnelPower;
uniform float uScanSpeed;
uniform float uScanStrength;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vViewDir;

void main() {
  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(vViewDir);

  float NdotV   = clamp(dot(N, V), 0.0, 1.0);
  float fresnel = pow(1.0 - NdotV, uFresnelPower);

  float skyAO = clamp(N.y * 0.5 + 0.5, 0.0, 1.0);
  float ao    = mix(0.6, 1.0, skyAO);

  float bandY = fract(vWorldPos.y * 0.5 - uTime * uScanSpeed);
  float scan  = smoothstep(0.03, 0.0, abs(bandY - 0.5));

  vec3 col = uColor * (0.45 + fresnel * 1.2) * ao;
  col     += uColor * scan * uScanStrength;

  float alpha = clamp(0.55 + fresnel * 0.45, 0.0, 1.0);

  gl_FragColor = vec4(col, alpha);
}
