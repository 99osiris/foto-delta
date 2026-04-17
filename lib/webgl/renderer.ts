'use client'
import { createProgram, setUniforms } from '../shaders/shader-utils'
import vertSrc      from '../shaders/quad.vert'
import vhsFragSrc   from '../shaders/vhs.frag'
import digiFragSrc  from '../shaders/digicam.frag'

export type FilterMode = 'vhs' | 'digicam'

export interface VHSParams {
  // VHS mode params
  chromaShift: number
  chromaBlurI: number
  chromaBlurQ: number
  lumaBandwidth: number
  lumaVertBleed: number
  jitterFreq: number
  jitterAmp: number
  jitterRoughness: number
  headSwitchHeight: number
  headSwitchAmount: number
  noiseY: number
  noiseC: number
  dropoutCount: number
  dropoutMaxLen: number
  dropoutIntensity: number
  scanlineIntensity: number
  sharpness: number
  sharpnessWidth: number
  colorCast: [number, number, number]
  blackCrush: number
  whiteCrush: number
}

export interface DigiParams {
  // Digicam mode params
  sensorNoise: number
  jpegBlock: number
  lensBlur: number
  chromaticAberration: number
  shadowCyan: number
  saturation: number
  cyanBoost: number
  highlightBlowout: number
  blackLift: number
  colorCast: [number, number, number]
  chromaShift: number
  noiseY: number
}

export const DEFAULT_VHS_PARAMS: VHSParams = {
  chromaShift: 3, chromaBlurI: 0.03, chromaBlurQ: 0.03,
  lumaBandwidth: 0.4, lumaVertBleed: 0.4,
  jitterFreq: 0.05, jitterAmp: 0.5, jitterRoughness: 0.3,
  headSwitchHeight: 15, headSwitchAmount: 0.03,
  noiseY: 0.02, noiseC: 0.01,
  dropoutCount: 2, dropoutMaxLen: 80, dropoutIntensity: 0.8,
  scanlineIntensity: 0.75, sharpness: 3.0, sharpnessWidth: 2,
  colorCast: [0.95, 1.05, 1.0], blackCrush: 16, whiteCrush: 230,
}

export const DEFAULT_DIGI_PARAMS: DigiParams = {
  sensorNoise: 0.04,
  jpegBlock: 0.3,
  lensBlur: 0.6,
  chromaticAberration: 2.0,
  shadowCyan: 0.04,
  saturation: 0.65,
  cyanBoost: 1.4,
  highlightBlowout: 0.88,
  blackLift: 0.05,
  colorCast: [0.85, 1.0, 1.15],
  chromaShift: 1.5,
  noiseY: 0.025,
}

// Hi8 '98 — blend preset, sits between VHS and Digicam
export const PRESET_HI8_VHS: Partial<VHSParams> = {
  chromaShift: 1.5, jitterAmp: 0.2, headSwitchHeight: 6,
  noiseY: 0.015, scanlineIntensity: 0.88, colorCast: [0.92, 1.02, 1.06],
}
export const PRESET_HI8_DIGI: Partial<DigiParams> = {
  lensBlur: 0.3, jpegBlock: 0.15, shadowCyan: 0.02,
  saturation: 0.8, cyanBoost: 1.15, sensorNoise: 0.02,
}

export class VHSRenderer {
  private gl: WebGL2RenderingContext
  private programs: Record<FilterMode, WebGLProgram>
  private activeProgram: WebGLProgram
  private activeMode: FilterMode = 'vhs'
  private texture: WebGLTexture
  private startTime: number

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true })
    if (!gl) throw new Error('WebGL2 not supported in this browser')
    this.gl = gl
    // Compile both shaders upfront — fast, avoids stutter on first mode switch
    this.programs = {
      vhs:     createProgram(gl, vertSrc, vhsFragSrc),
      digicam: createProgram(gl, vertSrc, digiFragSrc),
    }
    this.activeProgram = this.programs.vhs
    this.texture  = this.initTexture()
    this.startTime = Date.now()
    this.setupQuad()
  }

  setMode(mode: FilterMode) {
    this.activeMode    = mode
    this.activeProgram = this.programs[mode]
  }

  getMode(): FilterMode {
    return this.activeMode
  }

  private initTexture(): WebGLTexture {
    const { gl } = this
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    return tex
  }

  private setupQuad() {
    const { gl } = this
    const vao = gl.createVertexArray()!
    gl.bindVertexArray(vao)
    const buf = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW)
    // Bind position attribute for BOTH programs
    for (const prog of Object.values(this.programs)) {
      const loc = gl.getAttribLocation(prog, 'a_position')
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    }
    gl.bindVertexArray(vao)
  }

  loadSource(source: HTMLImageElement | HTMLVideoElement | ImageBitmap) {
    const { gl, texture } = this
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source as TexImageSource)
    const w =
      source instanceof HTMLVideoElement
        ? source.videoWidth
        : source instanceof HTMLImageElement
          ? source.naturalWidth
          : source.width
    const h =
      source instanceof HTMLVideoElement
        ? source.videoHeight
        : source instanceof HTMLImageElement
          ? source.naturalHeight
          : source.height
    const isPot = (n: number) => (n & (n - 1)) === 0 && n > 0
    if (w > 0 && h > 0 && isPot(w) && isPot(h)) {
      gl.generateMipmap(gl.TEXTURE_2D)
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    }
  }

  render(params: VHSParams | DigiParams, timeOverride?: number) {
    const { gl } = this
    const t = timeOverride ?? (Date.now() - this.startTime) / 1000
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    gl.useProgram(this.activeProgram)

    const base = {
      u_time:       t,
      u_resolution: [gl.canvas.width, gl.canvas.height],
    }

    if (this.activeMode === 'vhs') {
      const p = params as VHSParams
      setUniforms(gl, this.activeProgram, {
        ...base,
        u_chromaShift:       p.chromaShift,
        u_chromaBlurI:       p.chromaBlurI,
        u_chromaBlurQ:       p.chromaBlurQ,
        u_lumaBandwidth:     p.lumaBandwidth,
        u_lumaVertBleed:     p.lumaVertBleed,
        u_jitterFreq:        p.jitterFreq,
        u_jitterAmp:         p.jitterAmp,
        u_jitterRoughness:   p.jitterRoughness,
        u_headSwitchHeight:  p.headSwitchHeight,
        u_headSwitchAmount:  p.headSwitchAmount,
        u_noiseY:            p.noiseY,
        u_noiseC:            p.noiseC,
        u_dropoutCount:      p.dropoutCount,
        u_dropoutMaxLen:     p.dropoutMaxLen,
        u_dropoutIntensity:  p.dropoutIntensity,
        u_scanlineIntensity: p.scanlineIntensity,
        u_sharpness:         p.sharpness,
        u_sharpnessWidth:    p.sharpnessWidth,
        u_colorCast:         p.colorCast,
        u_blackCrush:        p.blackCrush,
        u_whiteCrush:        p.whiteCrush,
      })
    } else {
      const p = params as DigiParams
      setUniforms(gl, this.activeProgram, {
        ...base,
        u_sensorNoise:          p.sensorNoise,
        u_jpegBlock:            p.jpegBlock,
        u_lensBlur:             p.lensBlur,
        u_chromaticAberration:  p.chromaticAberration,
        u_shadowCyan:           p.shadowCyan,
        u_saturation:           p.saturation,
        u_cyanBoost:            p.cyanBoost,
        u_highlightBlowout:     p.highlightBlowout,
        u_blackLift:            p.blackLift,
        u_colorCast:            p.colorCast,
        u_chromaShift:          p.chromaShift,
        u_noiseY:               p.noiseY,
      })
    }

    const texLoc = gl.getUniformLocation(this.activeProgram, 'u_texture')
    gl.uniform1i(texLoc, 0)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  async exportPNG(): Promise<Blob> {
    return new Promise((res, rej) =>
      (this.gl.canvas as HTMLCanvasElement).toBlob(b => b ? res(b) : rej(new Error('Export failed')), 'image/png')
    )
  }

  startLoop(getParams: () => VHSParams | DigiParams): () => void {
    let rafId: number
    const loop = () => {
      this.render(getParams())
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }

  destroy() {
    // Do not call loseContext() — it poisons the canvas for React StrictMode remounts.
    // The browser GC handles context cleanup when the canvas leaves the DOM.
  }
}
