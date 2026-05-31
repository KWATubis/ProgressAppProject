// Adapted from "Holographic material by Anderson Mancini - Dec 2023"
// https://github.com/ektogamat/threejs-vanilla-holographic-material
//
// Ported into Portion from the holobody side project, then extended with a
// muscle-state colouring layer: each body vertex carries a baked muscle-state
// colour (`aStateColor`), a "is this vertex part of a tracked muscle" mask
// (`aHasState`), and a per-vertex selection flag (`aSelected`). The shader tints
// the hologram toward the state colour where a muscle is tracked and brightens
// the selected group. Cyan everywhere else keeps the original holo look.
import {
  ShaderMaterial,
  Clock,
  Uniform,
  Color,
  Vector3,
  AdditiveBlending,
  FrontSide,
  type Side,
  type Blending,
} from "three";

export interface HolographicMaterialParams {
  fresnelOpacity?: number;
  fresnelAmount?: number;
  scanlineSize?: number;
  hologramBrightness?: number;
  signalSpeed?: number;
  hologramColor?: string | number;
  enableBlinking?: boolean;
  blinkFresnelOnly?: boolean;
  hologramOpacity?: number;
  blendMode?: Blending;
  side?: Side;
  depthTest?: boolean;
  muscleEmphasis?: number; // 0 = flat, 1 = max contrast between muscle bulges and valleys
  lightDirection?: [number, number, number];
  surfaceBrightness?: number; // overall dimmer/brighter on the broad muscle fill (lower = dimmer)
  rimStrength?: number; // HDR multiplier on the silhouette/fresnel glow
  creaseStrength?: number; // how brightly muscle-separation seams glow (HDR; >1 blooms)
  creaseThreshold?: number; // concavity cutoff where a seam starts to light up (0..1)
  creaseWidth?: number; // softness band above the threshold (smaller = tighter line)
  creaseSharpness?: number; // >1 tightens seams to thin crisp lines, <1 softens them
  creaseRolloffLo?: number; // crease value where the deepest-pit glow starts fading out
  creaseRolloffHi?: number; // crease value where the deepest-pit glow is fully gone
  creaseLegLo?: number; // world-Y below which the seam glow is full (legs)
  creaseLegHi?: number; // world-Y above which the seam glow is gone (clean torso)
  footFadeLo?: number; // world-Y where the foot glow fade starts (kills the sole line)
  footFadeHi?: number; // world-Y where glow returns to full above the feet
  headFadeLo?: number; // world-Y where the head glow damp starts
  headFadeHi?: number; // world-Y where the head glow damp reaches full
  headGlow?: number; // rim+seam multiplier on the head (lower = dimmer head)
  headFill?: number; // surface-fill multiplier on the head
  stateMix?: number; // 0 = ignore muscle-state colour (pure cyan), 1 = fully tint by state
}

export class HolographicMaterial extends ShaderMaterial {
  clock = new Clock();

  constructor(parameters: HolographicMaterialParams = {}) {
    super();

    this.vertexShader = /* glsl */ `
      #define STANDARD

      varying vec3 vViewPosition;
      varying vec2 vUv;
      varying vec4 vPos;
      varying vec3 vNormalW;
      varying vec3 vPositionW;
      varying float vCrease;
      varying float vForm;
      varying float vWorldY;
      varying vec3 vStateColor;
      varying float vHasState;
      varying float vSelected;

      attribute float aCrease;
      attribute float aForm;
      attribute vec3 aStateColor;
      attribute float aHasState;
      attribute float aSelected;

      #include <common>
      #include <uv_pars_vertex>
      #include <color_pars_vertex>
      #include <fog_pars_vertex>
      #include <morphtarget_pars_vertex>
      #include <skinning_pars_vertex>
      #include <logdepthbuf_pars_vertex>
      #include <clipping_planes_pars_vertex>

      void main() {
        #include <uv_vertex>
        #include <color_vertex>
        #include <morphcolor_vertex>

        #if defined ( USE_SKINNING )
        #include <beginnormal_vertex>
        #include <morphnormal_vertex>
        #include <skinbase_vertex>
        #include <skinnormal_vertex>
        #include <defaultnormal_vertex>
        #endif

        #include <begin_vertex>
        #include <morphtarget_vertex>
        #include <skinning_vertex>
        #include <project_vertex>
        #include <logdepthbuf_vertex>
        #include <clipping_planes_vertex>
        #include <worldpos_vertex>
        #include <fog_vertex>

        vUv = uv;
        vCrease = aCrease;
        vForm = aForm;
        vStateColor = aStateColor;
        vHasState = aHasState;
        vSelected = aSelected;
        vPos = projectionMatrix * modelViewMatrix * vec4( transformed, 1.0 );
        vPositionW = vec3( vec4( transformed, 1.0 ) * modelMatrix );
        vWorldY = ( modelMatrix * vec4( transformed, 1.0 ) ).y;
        vNormalW = normalize( vec3( vec4( normal, 0.0 ) * modelMatrix ) );
        gl_Position = projectionMatrix * modelViewMatrix * vec4( transformed, 1.0 );
      }
    `;

    this.fragmentShader = /* glsl */ `
      varying vec2 vUv;
      varying vec3 vPositionW;
      varying vec4 vPos;
      varying vec3 vNormalW;
      varying float vCrease;
      varying float vForm;
      varying float vWorldY;
      varying vec3 vStateColor;
      varying float vHasState;
      varying float vSelected;

      uniform float time;
      uniform float fresnelOpacity;
      uniform float scanlineSize;
      uniform float fresnelAmount;
      uniform float signalSpeed;
      uniform float hologramBrightness;
      uniform float hologramOpacity;
      uniform bool  blinkFresnelOnly;
      uniform bool  enableBlinking;
      uniform vec3  hologramColor;
      uniform float muscleEmphasis;
      uniform vec3  lightDirection;
      uniform float surfaceBrightness;
      uniform float rimStrength;
      uniform float creaseStrength;
      uniform float creaseThreshold;
      uniform float creaseWidth;
      uniform float creaseSharpness;
      uniform float creaseRolloffLo;
      uniform float creaseRolloffHi;
      uniform float creaseLegLo;
      uniform float creaseLegHi;
      uniform float footFadeLo;
      uniform float footFadeHi;
      uniform float headFadeLo;
      uniform float headFadeHi;
      uniform float headGlow;
      uniform float headFill;
      uniform float stateMix;

      float flicker( float amt, float t ) {
        return clamp( fract( cos( t ) * 43758.5453123 ), amt, 1.0 );
      }

      float random(in float a, in float b) {
        return fract((cos(dot(vec2(a,b), vec2(12.9898,78.233))) * 43758.5453));
      }

      void main() {
        // Per-fragment hologram colour: cyan by default, tinted toward the baked
        // muscle-state colour where this vertex belongs to a tracked muscle.
        vec3 holoCol = mix(hologramColor, vStateColor, clamp(vHasState, 0.0, 1.0) * stateMix);

        vec2 vCoords = vPos.xy;
        vCoords /= vPos.w;
        vCoords = vCoords * 0.5 + 0.5;
        vec2 myUV = fract( vCoords );

        vec4 baseHolo = vec4(holoCol, mix(hologramBrightness, vUv.y, 0.5));

        float scanlines = 10.0;
        scanlines += 20.0 * sin(time * signalSpeed * 20.8 - myUV.y * 60.0 * scanlineSize);
        scanlines *= smoothstep(1.3 * cos(time * signalSpeed + myUV.y * scanlineSize), 0.78, 0.9);
        scanlines *= max(0.25, sin(time * signalSpeed) * 1.0);

        float r = random(vUv.x, vUv.y);
        float g = random(vUv.y * 20.2, vUv.y * 0.2);
        float b = random(vUv.y * 0.9, vUv.y * 0.2);

        baseHolo += vec4(r*scanlines, b*scanlines, r, 1.0) / 84.0;
        vec4 scanlineMix = mix(vec4(0.0), baseHolo, baseHolo.a);

        vec3 Nw = normalize(vNormalW);
        vec3 viewDirectionW = normalize(cameraPosition - vPositionW);

        float blinkValue = enableBlinking ? 0.6 - signalSpeed : 1.0;
        float blink = flicker(blinkValue, time * signalSpeed * 0.02);

        // ---- Form shading: a soft top-light so the muscle bellies still read
        // as rounded volume instead of a flat cutout.
        float ndotl = clamp(dot(Nw, normalize(lightDirection)), 0.0, 1.0);
        float sharpNdotL = pow(ndotl, 1.8);
        float bodyShade = mix(1.0 - muscleEmphasis, 1.0, sharpNdotL);
        vec3 shadedFill = scanlineMix.rgb * bodyShade * surfaceBrightness;

        // Broad-form mask: ~1 on big muscle forms, ~0 on fine detail (hands,
        // face). Calms the rim + seam glow on the hands and face so they stop
        // reading as enormous glowing blobs, while leaving the torso untouched.
        float form = clamp(vForm, 0.0, 1.0);

        // ---- Silhouette glow (fresnel rim), pushed HDR so the bloom pass
        // haloes the body's edge like the reference.
        float fresnelEffect = clamp(fresnelAmount - dot(viewDirectionW, Nw) * (1.6 - fresnelOpacity / 2.0), 0.0, fresnelOpacity);
        vec3 rim = holoCol * fresnelEffect * rimStrength * mix(0.30, 1.0, form);

        // ---- Muscle-separation seams from a baked object-space cavity map.
        float seam = smoothstep(creaseThreshold, min(1.0, creaseThreshold + creaseWidth), vCrease);
        seam = pow(seam, creaseSharpness);
        seam *= 1.0 - smoothstep(creaseRolloffLo, creaseRolloffHi, vCrease);
        vec3 seamGlow = holoCol * seam * creaseStrength * mix(0.12, 1.0, form);
        seamGlow = min(seamGlow, holoCol * 1.5);

        // ---- Vertical glow shaping in true world space (feet ~0, head ~2.0).
        float footFade = smoothstep(footFadeLo, footFadeHi, vWorldY);
        float headK    = smoothstep(headFadeLo, headFadeHi, vWorldY);
        float headDamp = mix(1.0, headGlow, headK);
        float legMask  = 1.0 - smoothstep(creaseLegLo, creaseLegHi, vWorldY);
        rim        *= footFade * headDamp;
        seamGlow   *= footFade * headDamp * legMask;
        shadedFill *= footFade * mix(1.0, headFill, headK);

        vec3 finalColor;
        if (blinkFresnelOnly) {
          finalColor = shadedFill + rim * blink;
        } else {
          finalColor = shadedFill * blink + rim;
        }
        finalColor += seamGlow;

        // ---- Selection highlight: brighten the picked muscle group and add a
        // crisp state-coloured rim so the user sees exactly what they clicked.
        float sel = clamp(vSelected, 0.0, 1.0);
        finalColor += holoCol * sel * 0.55;
        finalColor += holoCol * sel * fresnelEffect * 1.2;

        // ---- Alpha: translucent across the bellies so the grid and far side
        // bleed through, snapping back to solid along the glowing seams (legs only).
        float shadedAlpha = hologramOpacity * mix(1.0 - muscleEmphasis * 0.85, 1.0, sharpNdotL);
        shadedAlpha = max(shadedAlpha, seam * legMask);
        shadedAlpha = max(shadedAlpha, sel * 0.55);

        gl_FragColor = vec4(finalColor, clamp(shadedAlpha, 0.0, 1.0));
      }
    `;

    const lightDir = parameters.lightDirection ?? [0.25, 1.0, 0.4];
    this.uniforms = {
      time: new Uniform(0),
      fresnelOpacity: new Uniform(parameters.fresnelOpacity ?? 1.0),
      fresnelAmount: new Uniform(parameters.fresnelAmount ?? 0.45),
      scanlineSize: new Uniform(parameters.scanlineSize ?? 8.0),
      hologramBrightness: new Uniform(parameters.hologramBrightness ?? 1.2),
      signalSpeed: new Uniform(parameters.signalSpeed ?? 1.0),
      hologramColor: new Uniform(new Color(parameters.hologramColor ?? "#5be3ff")),
      enableBlinking: new Uniform(parameters.enableBlinking ?? true),
      blinkFresnelOnly: new Uniform(parameters.blinkFresnelOnly ?? true),
      hologramOpacity: new Uniform(parameters.hologramOpacity ?? 1.0),
      muscleEmphasis: new Uniform(parameters.muscleEmphasis ?? 0.7),
      lightDirection: new Uniform(new Vector3(lightDir[0], lightDir[1], lightDir[2])),
      surfaceBrightness: new Uniform(parameters.surfaceBrightness ?? 1.0),
      rimStrength: new Uniform(parameters.rimStrength ?? 1.5),
      creaseStrength: new Uniform(parameters.creaseStrength ?? 2.4),
      creaseThreshold: new Uniform(parameters.creaseThreshold ?? 0.58),
      creaseWidth: new Uniform(parameters.creaseWidth ?? 0.3),
      creaseSharpness: new Uniform(parameters.creaseSharpness ?? 1.4),
      creaseRolloffLo: new Uniform(parameters.creaseRolloffLo ?? 0.82),
      creaseRolloffHi: new Uniform(parameters.creaseRolloffHi ?? 0.98),
      creaseLegLo: new Uniform(parameters.creaseLegLo ?? 1.02),
      creaseLegHi: new Uniform(parameters.creaseLegHi ?? 1.2),
      footFadeLo: new Uniform(parameters.footFadeLo ?? 0.0),
      footFadeHi: new Uniform(parameters.footFadeHi ?? 0.1),
      headFadeLo: new Uniform(parameters.headFadeLo ?? 1.64),
      headFadeHi: new Uniform(parameters.headFadeHi ?? 1.8),
      headGlow: new Uniform(parameters.headGlow ?? 0.28),
      headFill: new Uniform(parameters.headFill ?? 0.5),
      stateMix: new Uniform(parameters.stateMix ?? 0.85),
    };

    this.setValues(parameters as Record<string, unknown>);
    this.depthTest = parameters.depthTest ?? false;
    this.blending = parameters.blendMode ?? AdditiveBlending;
    this.transparent = true;
    this.side = parameters.side ?? FrontSide;
  }

  update() {
    this.uniforms.time.value = this.clock.getElapsedTime();
  }
}
