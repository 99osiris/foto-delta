'use client'
import { createProgram, setUniforms } from '../shaders/shader-utils'
import vertSrc      from '../shaders/quad.vert'
import vhsFragSrc   from '../shaders/vhs.frag'
import digiFragSrc  from '../shaders/digicam.frag'

export type FilterMode = 'vhs' | 'digicam'

export interface VHSParams {
  // Pass 1 — VHS analog
  chromaShift: number
  chromaShiftRandom: number
  lumaSmear: number
  chromaI: number
  chromaQ: number
  lumaVertBleed: number
  lumaNoiseAmt: number
  chromaNoiseAmt: number
  jitterAmp: number
  jitterFreq: number
  jitterRoughness: number
  headSwitchHeight: number
  headSwitchAmt: number
  headCapNoise: number
  bottomDistHeight: number
  bottomDistAmt: number
  dropoutCount: number
  dropoutMaxLen: number
  dropoutIntensity: number
  interlace: number
  scanlineIntensity: number
  // Tape crease + AC beat (CC0 LazarusOverlook)
  tapeCreaseAmt: number
  tapeCreaseSpeed: number
  tapeCreaseJitter: number
  tapeCreaseDiscolor: number
  tapeCreaseSmear: number
  acBeatAmt: number
  acBeatSpeed: number
  // Pass 2 — Internet 90s recompression
  jpegQuality: number
  jpegBlockSize: number
  colorDepth: number
  ringing: number
  ringingWidth: number
  // Display + levels
  blackCrush: number
  whiteCrush: number
  colorCast: [number, number, number]
  vignette: number
}

export const DEFAULT_VHS_PARAMS: VHSParams = {
  chromaShift: 3.0,
  chromaShiftRandom: 0.4,
  lumaSmear: 0.38,
  chromaI: 0.06,
  chromaQ: 0.09,
  lumaVertBleed: 0.35,
  lumaNoiseAmt: 0.022,
  chromaNoiseAmt: 0.012,
  jitterAmp: 0.5,
  jitterFreq: 0.05,
  jitterRoughness: 0.3,
  headSwitchHeight: 15,
  headSwitchAmt: 0.035,
  headCapNoise: 0.5,
  bottomDistHeight: 28,
  bottomDistAmt: 0.38,
  dropoutCount: 2,
  dropoutMaxLen: 85,
  dropoutIntensity: 0.78,
  interlace: 0.55,
  scanlineIntensity: 0.76,
  tapeCreaseAmt: 0.35,
  tapeCreaseSpeed: 0.5,
  tapeCreaseJitter: 0.15,
  tapeCreaseDiscolor: 0.8,
  tapeCreaseSmear: 0.3,
  acBeatAmt: 0.08,
  acBeatSpeed: 0.15,
  jpegQuality: 58,
  jpegBlockSize: 8,
  colorDepth: 0.45,
  ringing: 3.2,
  ringingWidth: 1.8,
  blackCrush: 16,
  whiteCrush: 230,
  colorCast: [0.95, 1.05, 1.0] as [number, number, number],
  vignette: 0.28,
}

export interface DigiParams {
  downscale: number
  jpegQuality: number
  chromaSub: number
  ringing: number
  ringingWidth: number
  lensBlur: number
  chromaticAb: number
  barrelDist: number
  bayerNoise: number
  hotPixels: number
  quantization: number
  saturation: number
  cyanBoost: number
  shadowCyan: number
  blackLift: number
  colorMatrix: [number, number, number]
  highlightClip: number
  bloomThreshold: number
  bloomIntensity: number
}

export const DEFAULT_DIGI_PARAMS: DigiParams = {
  downscale: 0.6,
  jpegQuality: 40,
  chromaSub: 0.9,
  ringing: 1.8,
  ringingWidth: 1.2,
  lensBlur: 0.4,
  chromaticAb: 2.2,
  barrelDist: 0.06,
  bayerNoise: 0.045,
  hotPixels: 0.25,
  quantization: 0.35,
  saturation: 0.7,
  cyanBoost: 1.35,
  shadowCyan: 0.04,
  blackLift: 0.04,
  colorMatrix: [0.86, 1.0, 1.16] as [number, number, number],
  highlightClip: 0.88,
  bloomThreshold: 0.80,
  bloomIntensity: 0.35,
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
        // Pass 1
        u_chromaShift:       p.chromaShift,
        u_chromaShiftRandom: p.chromaShiftRandom,
        u_lumaSmear:         p.lumaSmear,
        u_chromaI:           p.chromaI,
        u_chromaQ:           p.chromaQ,
        u_lumaVertBleed:     p.lumaVertBleed,
        u_lumaNoiseAmt:      p.lumaNoiseAmt,
        u_chromaNoiseAmt:    p.chromaNoiseAmt,
        u_jitterAmp:         p.jitterAmp,
        u_jitterFreq:        p.jitterFreq,
        u_jitterRoughness:   p.jitterRoughness,
        u_headSwitchHeight:  p.headSwitchHeight,
        u_headSwitchAmt:     p.headSwitchAmt,
        u_headCapNoise:      p.headCapNoise,
        u_bottomDistHeight:  p.bottomDistHeight,
        u_bottomDistAmt:     p.bottomDistAmt,
        u_dropoutCount:      p.dropoutCount,
        u_dropoutMaxLen:     p.dropoutMaxLen,
        u_dropoutIntensity:  p.dropoutIntensity,
        u_interlace:         p.interlace,
        u_scanlineIntensity: p.scanlineIntensity,
        u_tapeCreaseAmt:      p.tapeCreaseAmt,
        u_tapeCreaseSpeed:    p.tapeCreaseSpeed,
        u_tapeCreaseJitter:   p.tapeCreaseJitter,
        u_tapeCreaseDiscolor: p.tapeCreaseDiscolor,
        u_tapeCreaseSmear:    p.tapeCreaseSmear,
        u_acBeatAmt:          p.acBeatAmt,
        u_acBeatSpeed:        p.acBeatSpeed,
        // Pass 2
        u_jpegQuality:       p.jpegQuality,
        u_jpegBlockSize:     p.jpegBlockSize,
        u_colorDepth:        p.colorDepth,
        u_ringing:           p.ringing,
        u_ringingWidth:      p.ringingWidth,
        // Display
        u_blackCrush:        p.blackCrush,
        u_whiteCrush:        p.whiteCrush,
        u_colorCast:         p.colorCast,
        u_vignette:          p.vignette,
      })
    } else {
      const p = params as DigiParams
      setUniforms(gl, this.activeProgram, {
        ...base,
        u_downscale:       p.downscale,
        u_jpegQuality:     p.jpegQuality,
        u_chromaSub:       p.chromaSub,
        u_ringing:         p.ringing,
        u_ringingWidth:    p.ringingWidth,
        u_lensBlur:        p.lensBlur,
        u_chromaticAb:     p.chromaticAb,
        u_barrelDist:      p.barrelDist,
        u_bayerNoise:      p.bayerNoise,
        u_hotPixels:       p.hotPixels,
        u_quantization:    p.quantization,
        u_saturation:      p.saturation,
        u_cyanBoost:       p.cyanBoost,
        u_shadowCyan:      p.shadowCyan,
        u_blackLift:       p.blackLift,
        u_colorMatrix:     p.colorMatrix,
        u_highlightClip:   p.highlightClip,
        u_bloomThreshold:  p.bloomThreshold,
        u_bloomIntensity:  p.bloomIntensity,
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
