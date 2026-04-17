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

// VHS SP 1994 — Sony Betamax/VHS, cassette légèrement usée
export const DEFAULT_VHS_PARAMS: VHSParams = {
  jpegQuality: 62,
  blackCrush: 18,
  whiteCrush: 228,
  sharpness: 3.5,
  sharpnessWidth: 2.0,
  colorCast: [0.93, 1.04, 0.99] as [number, number, number],
  lumaBandwidth: 0.38,
  chromaI: 0.06,
  chromaQ: 0.08,
  lumaVertBleed: 0.42,
  chromaShift: 3.5,
  lumaNoiseAmt: 0.028,
  chromaNoiseAmt: 0.015,
  jitterFreq: 0.06,
  jitterAmp: 0.7,
  jitterRoughness: 0.35,
  headSwitchHeight: 18,
  headSwitchAmt: 0.04,
  bottomDistHeight: 32,
  bottomDistAmt: 0.45,
  dropoutCount: 3,
  dropoutMaxLen: 90,
  dropoutIntensity: 0.75,
  scanlineIntensity: 0.72,
  vignette: 0.35,
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

// Digicam 2003–2009 — Sony CyberShot DSC-S50 / DSC-T90
export const DEFAULT_DIGI_PARAMS: DigiParams = {
  bayerNoise: 0.055,
  hotPixels: 0.35,
  lensBlur: 0.52,
  chromaticAb: 2.8,
  barrelDistortion: 0.07,
  jpegBlock: 0.38,
  jpegChroma: 0.55,
  shadowCompression: 0.65,
  midtoneContrast: 0.82,
  highlightShift: 0.65,
  saturation: 0.58,
  cyanBoost: 1.55,
  shadowCyan: 0.055,
  blackLift: 0.045,
  colorMatrix: [0.84, 1.0, 1.2] as [number, number, number],
  bloomThreshold: 0.8,
  bloomRadius: 0.65,
  bloomIntensity: 0.42,
}

// Hi8 1998 — Sony Handycam CCD-TRV série
export const HI8_PARAMS: VHSParams = {
  jpegQuality: 78,
  blackCrush: 12,
  whiteCrush: 235,
  sharpness: 2.2,
  sharpnessWidth: 1.5,
  colorCast: [0.94, 1.02, 1.04] as [number, number, number],
  lumaBandwidth: 0.58,
  chromaI: 0.04,
  chromaQ: 0.05,
  lumaVertBleed: 0.28,
  chromaShift: 2.0,
  lumaNoiseAmt: 0.018,
  chromaNoiseAmt: 0.009,
  jitterFreq: 0.04,
  jitterAmp: 0.3,
  jitterRoughness: 0.25,
  headSwitchHeight: 8,
  headSwitchAmt: 0.02,
  bottomDistHeight: 16,
  bottomDistAmt: 0.22,
  dropoutCount: 1,
  dropoutMaxLen: 60,
  dropoutIntensity: 0.65,
  scanlineIntensity: 0.85,
  vignette: 0.22,
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
