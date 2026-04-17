'use client'
import { createProgram, setUniforms } from '../shaders/shader-utils'
import vertSrc      from '../shaders/quad.vert'
import vhsFragSrc   from '../shaders/vhs.frag'
import digiFragSrc  from '../shaders/digicam.frag'

export type FilterMode = 'vhs' | 'digicam'

export interface VHSParams {
  jpegQuality: number
  blackCrush: number
  whiteCrush: number
  sharpness: number
  sharpnessWidth: number
  colorCast: [number, number, number]
  lumaBandwidth: number
  chromaI: number
  chromaQ: number
  lumaVertBleed: number
  chromaShift: number
  lumaNoiseAmt: number
  chromaNoiseAmt: number
  jitterFreq: number
  jitterAmp: number
  jitterRoughness: number
  headSwitchHeight: number
  headSwitchAmt: number
  bottomDistHeight: number
  bottomDistAmt: number
  dropoutCount: number
  dropoutMaxLen: number
  dropoutIntensity: number
  scanlineIntensity: number
  vignette: number
}

export const DEFAULT_VHS_PARAMS: VHSParams = {
  jpegQuality: 65, blackCrush: 16, whiteCrush: 230,
  sharpness: 3.0, sharpnessWidth: 2.0, colorCast: [0.95, 1.05, 1.0],
  lumaBandwidth: 0.40, chromaI: 0.03, chromaQ: 0.03,
  lumaVertBleed: 0.40, chromaShift: 3.0,
  lumaNoiseAmt: 0.020, chromaNoiseAmt: 0.010,
  jitterFreq: 0.05, jitterAmp: 0.5, jitterRoughness: 0.3,
  headSwitchHeight: 15, headSwitchAmt: 0.03,
  bottomDistHeight: 30, bottomDistAmt: 0.40,
  dropoutCount: 2, dropoutMaxLen: 80, dropoutIntensity: 0.8,
  scanlineIntensity: 0.75, vignette: 0.3,
}

export interface DigiParams {
  bayerNoise: number
  hotPixels: number
  lensBlur: number
  chromaticAb: number
  barrelDistortion: number
  jpegBlock: number
  jpegChroma: number
  shadowCompression: number
  midtoneContrast: number
  highlightShift: number
  saturation: number
  cyanBoost: number
  shadowCyan: number
  blackLift: number
  colorMatrix: [number, number, number]
  bloomThreshold: number
  bloomRadius: number
  bloomIntensity: number
}

export const DEFAULT_DIGI_PARAMS: DigiParams = {
  bayerNoise: 0.05, hotPixels: 0.3,
  lensBlur: 0.5, chromaticAb: 2.5, barrelDistortion: 0.08,
  jpegBlock: 0.35, jpegChroma: 0.5,
  shadowCompression: 0.6, midtoneContrast: 0.85, highlightShift: 0.6,
  saturation: 0.60, cyanBoost: 1.5, shadowCyan: 0.05,
  blackLift: 0.04, colorMatrix: [0.85, 1.0, 1.18],
  bloomThreshold: 0.82, bloomRadius: 0.6, bloomIntensity: 0.4,
}

export const PRESET_HI8_VHS: Partial<VHSParams> = {
  jpegQuality: 75,
  chromaShift: 1.5,
  chromaI: 0.015,
  chromaQ: 0.012,
  jitterAmp: 0.2,
  jitterFreq: 0.03,
  headSwitchHeight: 6,
  headSwitchAmt: 0.015,
  bottomDistHeight: 15,
  bottomDistAmt: 0.2,
  lumaNoiseAmt: 0.015,
  chromaNoiseAmt: 0.005,
  scanlineIntensity: 0.90,
  colorCast: [0.92, 1.02, 1.06],
  sharpness: 2.0,
  dropoutCount: 1,
  vignette: 0.2,
}

export const PRESET_HI8_DIGI: Partial<DigiParams> = {
  lensBlur: 0.3, jpegBlock: 0.15, shadowCyan: 0.02,
  saturation: 0.8, cyanBoost: 1.15, bayerNoise: 0.02,
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
        u_jpegQuality:      p.jpegQuality,
        u_blackCrush:       p.blackCrush,
        u_whiteCrush:       p.whiteCrush,
        u_sharpness:        p.sharpness,
        u_sharpnessWidth:   p.sharpnessWidth,
        u_colorCast:        p.colorCast,
        u_lumaBandwidth:    p.lumaBandwidth,
        u_chromaI:          p.chromaI,
        u_chromaQ:          p.chromaQ,
        u_lumaVertBleed:    p.lumaVertBleed,
        u_chromaShift:      p.chromaShift,
        u_lumaNoiseAmt:     p.lumaNoiseAmt,
        u_chromaNoiseAmt:   p.chromaNoiseAmt,
        u_jitterFreq:       p.jitterFreq,
        u_jitterAmp:        p.jitterAmp,
        u_jitterRoughness:  p.jitterRoughness,
        u_headSwitchHeight: p.headSwitchHeight,
        u_headSwitchAmt:    p.headSwitchAmt,
        u_bottomDistHeight: p.bottomDistHeight,
        u_bottomDistAmt:    p.bottomDistAmt,
        u_dropoutCount:     p.dropoutCount,
        u_dropoutMaxLen:    p.dropoutMaxLen,
        u_dropoutIntensity: p.dropoutIntensity,
        u_scanlineIntensity: p.scanlineIntensity,
        u_vignette:          p.vignette,
      })
    } else {
      const p = params as DigiParams
      setUniforms(gl, this.activeProgram, {
        ...base,
        u_bayerNoise:        p.bayerNoise,
        u_hotPixels:         p.hotPixels,
        u_lensBlur:          p.lensBlur,
        u_chromaticAb:       p.chromaticAb,
        u_barrelDistortion:  p.barrelDistortion,
        u_jpegBlock:         p.jpegBlock,
        u_jpegChroma:        p.jpegChroma,
        u_shadowCompression: p.shadowCompression,
        u_midtoneContrast:   p.midtoneContrast,
        u_highlightShift:    p.highlightShift,
        u_saturation:        p.saturation,
        u_cyanBoost:         p.cyanBoost,
        u_shadowCyan:        p.shadowCyan,
        u_blackLift:         p.blackLift,
        u_colorMatrix:       p.colorMatrix,
        u_bloomThreshold:    p.bloomThreshold,
        u_bloomRadius:       p.bloomRadius,
        u_bloomIntensity:    p.bloomIntensity,
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
  }
}
