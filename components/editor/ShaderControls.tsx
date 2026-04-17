'use client'
import { useState } from 'react'
import { useEditorStore } from '@/lib/store/editor'
import { DEFAULT_VHS_PARAMS, DEFAULT_DIGI_PARAMS } from '@/lib/webgl/renderer'
import ExportButton from '@/components/editor/ExportButton'

const mono: React.CSSProperties = { fontFamily: "'Courier New', monospace" }
const green = '#4ade80'
const dim = '#444'
const dimmer = '#2a2a2a'
const bg = '#0c0c0c'
const border = '1px solid #1a1a1a'
const borderDim = '1px solid #141414'

function Slider({ label, value, min, max, step = 0.01, decimals = 2, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; decimals?: number
  onChange: (v: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100
  const shown = decimals <= 0 ? String(Math.round(value)) : value.toFixed(decimals)
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 9, color: dim, letterSpacing: 0.5, ...mono }}>{label.toUpperCase()}</span>
        <span style={{ fontSize: 9, color: '#666', ...mono }}>{shown}</span>
      </div>
      <div style={{ position: 'relative', height: 2, background: '#1a1a1a', borderRadius: 1, cursor: 'pointer' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: `${pct}%`, height: '100%', background: '#1a3a2a', borderRadius: 1 }} />
        <div style={{ position: 'absolute', top: -3, width: 8, height: 8, background: green, borderRadius: '50%', transform: 'translateX(-50%)', left: `${pct}%` }} />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
        />
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 8, letterSpacing: 2, color: dimmer, paddingBottom: 6, marginBottom: 8, borderBottom: borderDim, ...mono }}>
      {children}
    </div>
  )
}

const PRESETS = [
  { id: 'vhs94',     label: "VHS '94" },
  { id: 'digicam02', label: "CAM '02" },
  { id: 'hi8',       label: "HI8 '98" },
] as const

type PresetId = typeof PRESETS[number]['id']

const INTENSITY_LEVELS = {
  light:   0.4,
  medium:  1.0,
  heavy:   1.8,
  destroy: 3.5,
} as const

type IntensityLevel = keyof typeof INTENSITY_LEVELS

function applyIntensity(store: ReturnType<typeof useEditorStore.getState>, level: IntensityLevel) {
  const mul = INTENSITY_LEVELS[level]
  const { mode } = store

  if (mode === 'vhs') {
    const base = DEFAULT_VHS_PARAMS
    store.setVhsParam('chromaShift',       Math.min(12,   base.chromaShift       * mul))
    store.setVhsParam('jitterAmp',         Math.min(5,    base.jitterAmp         * mul))
    store.setVhsParam('lumaNoiseAmt',      Math.min(0.15, base.lumaNoiseAmt     * mul))
    store.setVhsParam('chromaNoiseAmt',    Math.min(0.10, base.chromaNoiseAmt   * mul))
    store.setVhsParam('dropoutCount',      Math.min(20,   Math.round(base.dropoutCount * mul)))
    store.setVhsParam('headSwitchHeight',  Math.min(60,   base.headSwitchHeight  * mul))
    store.setVhsParam('chromaI',           Math.min(0.3,  base.chromaI         * mul))
    store.setVhsParam('chromaQ',           Math.min(0.3,  base.chromaQ         * mul))
    store.setVhsParam('vignette',          Math.min(1.0,  base.vignette        * mul))
    store.setVhsParam('jpegQuality',       Math.max(0,    100 - (100 - base.jpegQuality) * mul))
    store.setVhsParam('scanlineIntensity', Math.max(0.4,  base.scanlineIntensity - (mul - 1) * 0.08))
    store.setVhsParam('ringing',           Math.min(6,    base.ringing           * mul))
    store.setVhsParam('colorDepth',        Math.min(1.0,  base.colorDepth        * mul))
    store.setVhsParam('headCapNoise',      Math.min(1.0,  base.headCapNoise      * mul))
  } else {
    const base = DEFAULT_DIGI_PARAMS
    store.setDigiParam('bayerNoise',      Math.min(0.1,  base.bayerNoise      * mul))
    store.setDigiParam('jpegQuality',     Math.max(0,    100 - (100 - base.jpegQuality) * mul))
    store.setDigiParam('chromaSub',       Math.min(1.0,  base.chromaSub       * mul))
    store.setDigiParam('chromaticAb',     Math.min(6.0,  base.chromaticAb     * mul))
    store.setDigiParam('lensBlur',        Math.min(1.0,  base.lensBlur        * mul))
    store.setDigiParam('bloomIntensity',  Math.min(0.8,  base.bloomIntensity  * mul))
    store.setDigiParam('shadowCyan',      Math.min(0.1,  base.shadowCyan      * mul))
    store.setDigiParam('hotPixels',       Math.min(1.0,  base.hotPixels       * mul))
    store.setDigiParam('ringing',         Math.min(4.0,  base.ringing         * mul))
    store.setDigiParam('quantization',    Math.min(1.0,  base.quantization    * mul))
  }
}

export default function ShaderControls({ hidePanelPresets = false }: { hidePanelPresets?: boolean }) {
  const store = useEditorStore()
  const { mode, vhsParams, digiParams, setVhsParam, setDigiParam, applyPreset } = store
  const [activePreset, setActivePreset] = useState<PresetId>('vhs94')
  const [activeIntensity, setActiveIntensity] = useState<IntensityLevel>('medium')

  const handlePreset = (id: PresetId) => {
    setActivePreset(id)
    applyPreset(id)
  }

  const handleIntensity = (level: IntensityLevel) => {
    setActiveIntensity(level)
    applyIntensity(useEditorStore.getState(), level)
  }

  const vS = <K extends keyof typeof vhsParams>(k: K) => (v: number) => setVhsParam(k, v as typeof vhsParams[K])
  const dS = <K extends keyof typeof digiParams>(k: K) => (v: number) => setDigiParam(k, v as typeof digiParams[K])

  return (
    <div style={{
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: "'Courier New', monospace",
    }}>
    <div style={{
      width: '100%',
      maxWidth: hidePanelPresets ? '100%' : 256,
      margin: '0 auto',
      background: bg,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flexShrink: 0,
      flex: 1,
      minHeight: 0,
      ...mono,
    }}>

      {!hidePanelPresets && (
      <div style={{ padding: '12px 12px 10px', borderBottom: border }}>
        <div style={{ fontSize: 8, letterSpacing: 2, color: dimmer, marginBottom: 8 }}>PRESETS</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {PRESETS.map(p => (
            <button key={p.id} type="button" onClick={() => handlePreset(p.id)} style={{
              flex: 1, padding: '5px 0', fontSize: 9, letterSpacing: 0.5,
              border: activePreset === p.id ? '1px solid #1a3a2a' : '1px solid #1e1e1e',
              borderRadius: 2, color: activePreset === p.id ? green : '#555',
              background: activePreset === p.id ? '#0a1410' : 'transparent',
              cursor: 'pointer', ...mono,
            }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      )}

      <div style={{ padding: '10px 12px', borderBottom: border }}>
        <div style={{ fontSize: 8, letterSpacing: 2, color: dimmer, marginBottom: 8 }}>INTENSITY</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(Object.keys(INTENSITY_LEVELS) as IntensityLevel[]).map(level => (
            <button key={level} type="button" onClick={() => handleIntensity(level)} style={{
              flex: 1, padding: '5px 0', fontSize: 8, letterSpacing: 0.3,
              border: activeIntensity === level ? '1px solid #1a3a2a' : '1px solid #1e1e1e',
              borderRadius: 2, color: activeIntensity === level ? green : '#555',
              background: activeIntensity === level ? '#0a1410' : 'transparent',
              cursor: 'pointer', textTransform: 'uppercase', ...mono,
            }}>
              {level}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 80px' }}>

        {mode === 'vhs' && (
          <>
            <SectionLabel>PASS 1 — SIGNAL VHS</SectionLabel>
            <Slider label="Chroma shift" value={vhsParams.chromaShift} min={0} max={12} step={0.05} onChange={vS('chromaShift')} />
            <Slider label="Chroma shift random" value={vhsParams.chromaShiftRandom} min={0} max={1} onChange={vS('chromaShiftRandom')} />
            <Slider label="Luma smear" value={vhsParams.lumaSmear} min={0} max={1} onChange={vS('lumaSmear')} />
            <Slider label="Chroma I bleed" value={vhsParams.chromaI} min={0} max={0.3} step={0.005} onChange={vS('chromaI')} />
            <Slider label="Chroma Q bleed" value={vhsParams.chromaQ} min={0} max={0.3} step={0.005} onChange={vS('chromaQ')} />
            <Slider label="Vertical bleed" value={vhsParams.lumaVertBleed} min={0} max={0.8} onChange={vS('lumaVertBleed')} />
            <Slider label="Luma noise" value={vhsParams.lumaNoiseAmt} min={0} max={0.15} step={0.002} onChange={vS('lumaNoiseAmt')} />
            <Slider label="Chroma noise" value={vhsParams.chromaNoiseAmt} min={0} max={0.10} step={0.002} onChange={vS('chromaNoiseAmt')} />
            <Slider label="Interlacing" value={vhsParams.interlace} min={0} max={1} onChange={vS('interlace')} />

            <SectionLabel>PASS 1 — MÉCANIQUE</SectionLabel>
            <Slider label="Jitter amplitude" value={vhsParams.jitterAmp} min={0} max={5} step={0.05} onChange={vS('jitterAmp')} />
            <Slider label="Jitter frequency" value={vhsParams.jitterFreq} min={0} max={0.3} step={0.005} onChange={vS('jitterFreq')} />
            <Slider label="Jitter roughness" value={vhsParams.jitterRoughness} min={0} max={1} onChange={vS('jitterRoughness')} />
            <Slider label="Head switch height" value={vhsParams.headSwitchHeight} min={0} max={60} step={1} decimals={0} onChange={vS('headSwitchHeight')} />
            <Slider label="Head switch amount" value={vhsParams.headSwitchAmt} min={0} max={0.1} step={0.002} onChange={vS('headSwitchAmt')} />
            <Slider label="Head cap noise" value={vhsParams.headCapNoise} min={0} max={1} onChange={vS('headCapNoise')} />
            <Slider label="Bottom distortion height" value={vhsParams.bottomDistHeight} min={0} max={80} step={1} decimals={0} onChange={vS('bottomDistHeight')} />
            <Slider label="Bottom distortion amount" value={vhsParams.bottomDistAmt} min={0} max={1} onChange={vS('bottomDistAmt')} />
            <Slider label="Dropout count" value={vhsParams.dropoutCount} min={0} max={20} step={1} decimals={0} onChange={vS('dropoutCount')} />
            <Slider label="Dropout max length" value={vhsParams.dropoutMaxLen} min={0} max={300} step={1} decimals={0} onChange={vS('dropoutMaxLen')} />
            <Slider label="Dropout intensity" value={vhsParams.dropoutIntensity} min={0} max={1} onChange={vS('dropoutIntensity')} />

            <SectionLabel>TAPE CREASE</SectionLabel>
            <Slider label="Tape crease amount" value={vhsParams.tapeCreaseAmt} min={0} max={1} onChange={vS('tapeCreaseAmt')} />
            <Slider label="Crease speed" value={vhsParams.tapeCreaseSpeed} min={0.1} max={2} step={0.05} onChange={vS('tapeCreaseSpeed')} />
            <Slider label="Crease jitter" value={vhsParams.tapeCreaseJitter} min={0} max={1} onChange={vS('tapeCreaseJitter')} />
            <Slider label="Crease discolor" value={vhsParams.tapeCreaseDiscolor} min={0} max={2} step={0.05} onChange={vS('tapeCreaseDiscolor')} />
            <Slider label="Crease smear" value={vhsParams.tapeCreaseSmear} min={0} max={2} step={0.05} onChange={vS('tapeCreaseSmear')} />
            <Slider label="AC beat amount" value={vhsParams.acBeatAmt} min={0} max={0.5} step={0.01} onChange={vS('acBeatAmt')} />
            <Slider label="AC beat speed" value={vhsParams.acBeatSpeed} min={0} max={1} step={0.01} onChange={vS('acBeatSpeed')} />

            <Slider label="Scanlines" value={vhsParams.scanlineIntensity} min={0} max={1} onChange={vS('scanlineIntensity')} />

            <SectionLabel>PASS 2 — RECOMPRESSION INTERNET</SectionLabel>
            <Slider label="JPEG quality" value={vhsParams.jpegQuality} min={0} max={100} step={1} decimals={0} onChange={vS('jpegQuality')} />
            <Slider label="JPEG block size" value={vhsParams.jpegBlockSize} min={4} max={16} step={1} decimals={0} onChange={vS('jpegBlockSize')} />
            <Slider label="Color depth (quantize)" value={vhsParams.colorDepth} min={0} max={1} onChange={vS('colorDepth')} />
            <Slider label="Ringing" value={vhsParams.ringing} min={0} max={6} step={0.05} onChange={vS('ringing')} />
            <Slider label="Ringing width" value={vhsParams.ringingWidth} min={0.5} max={4} step={0.05} onChange={vS('ringingWidth')} />

            <SectionLabel>NIVEAUX</SectionLabel>
            <Slider label="Black crush" value={vhsParams.blackCrush} min={0} max={30} step={1} decimals={0} onChange={vS('blackCrush')} />
            <Slider label="White crush" value={vhsParams.whiteCrush} min={220} max={255} step={1} decimals={0} onChange={vS('whiteCrush')} />
            <Slider label="Vignette" value={vhsParams.vignette} min={0} max={1} onChange={vS('vignette')} />

            <SectionLabel>COLOR CAST</SectionLabel>
            <Slider label="Red" value={vhsParams.colorCast[0]} min={0.7} max={1.3} onChange={v => setVhsParam('colorCast', [v, vhsParams.colorCast[1], vhsParams.colorCast[2]])} />
            <Slider label="Green" value={vhsParams.colorCast[1]} min={0.7} max={1.3} onChange={v => setVhsParam('colorCast', [vhsParams.colorCast[0], v, vhsParams.colorCast[2]])} />
            <Slider label="Blue" value={vhsParams.colorCast[2]} min={0.7} max={1.3} onChange={v => setVhsParam('colorCast', [vhsParams.colorCast[0], vhsParams.colorCast[1], v])} />

            <div style={{ paddingTop: 8, paddingBottom: 16 }}>
              <button type="button" onClick={() => store.resetVhsParams()} style={{ width: '100%', padding: '6px 0', fontSize: 9, letterSpacing: 1, border: '1px solid #1e1e1e', borderRadius: 2, color: '#444', background: 'transparent', cursor: 'pointer', ...mono }}>
                RESET TO DEFAULT
              </button>
            </div>
          </>
        )}

        {mode === 'digicam' && (
          <>
            <SectionLabel>MEDIA DEGRADATION</SectionLabel>
            <Slider label="Native resolution (downscale)" value={digiParams.downscale} min={0} max={1} step={0.01} onChange={dS('downscale')} />
            <Slider label="JPEG quality" value={digiParams.jpegQuality} min={0} max={100} step={1} decimals={0} onChange={dS('jpegQuality')} />
            <Slider label="Chroma subsampling" value={digiParams.chromaSub} min={0} max={1} onChange={dS('chromaSub')} />
            <Slider label="Ringing" value={digiParams.ringing} min={0} max={4} step={0.05} onChange={dS('ringing')} />
            <Slider label="Ringing width" value={digiParams.ringingWidth} min={0.5} max={3} step={0.05} onChange={dS('ringingWidth')} />
            <Slider label="Quantization banding" value={digiParams.quantization} min={0} max={1} onChange={dS('quantization')} />

            <SectionLabel>LENS</SectionLabel>
            <Slider label="Lens blur" value={digiParams.lensBlur} min={0} max={1} step={0.02} onChange={dS('lensBlur')} />
            <Slider label="Chromatic aberration" value={digiParams.chromaticAb} min={0} max={6} step={0.1} onChange={dS('chromaticAb')} />
            <Slider label="Barrel distortion" value={digiParams.barrelDist} min={0} max={0.2} step={0.005} onChange={dS('barrelDist')} />

            <SectionLabel>SENSOR</SectionLabel>
            <Slider label="Bayer noise" value={digiParams.bayerNoise} min={0} max={0.1} step={0.002} onChange={dS('bayerNoise')} />
            <Slider label="Hot pixels" value={digiParams.hotPixels} min={0} max={1} onChange={dS('hotPixels')} />

            <SectionLabel>COLOR SCIENCE</SectionLabel>
            <Slider label="Saturation" value={digiParams.saturation} min={0.3} max={1.2} onChange={dS('saturation')} />
            <Slider label="Cyan boost" value={digiParams.cyanBoost} min={1.0} max={2.0} step={0.02} onChange={dS('cyanBoost')} />
            <Slider label="Shadow cyan" value={digiParams.shadowCyan} min={0} max={0.1} step={0.002} onChange={dS('shadowCyan')} />
            <Slider label="Highlight clip" value={digiParams.highlightClip} min={0.7} max={1.0} step={0.01} onChange={dS('highlightClip')} />
            <Slider label="Black lift" value={digiParams.blackLift} min={0} max={0.1} step={0.002} onChange={dS('blackLift')} />
            <Slider label="Red" value={digiParams.colorMatrix[0]} min={0.7} max={1.3} onChange={v => setDigiParam('colorMatrix', [v, digiParams.colorMatrix[1], digiParams.colorMatrix[2]])} />
            <Slider label="Green" value={digiParams.colorMatrix[1]} min={0.7} max={1.3} onChange={v => setDigiParam('colorMatrix', [digiParams.colorMatrix[0], v, digiParams.colorMatrix[2]])} />
            <Slider label="Blue" value={digiParams.colorMatrix[2]} min={0.7} max={1.3} onChange={v => setDigiParam('colorMatrix', [digiParams.colorMatrix[0], digiParams.colorMatrix[1], v])} />

            <SectionLabel>BLOOM</SectionLabel>
            <Slider label="Bloom threshold" value={digiParams.bloomThreshold} min={0.6} max={1.0} step={0.01} onChange={dS('bloomThreshold')} />
            <Slider label="Bloom intensity" value={digiParams.bloomIntensity} min={0} max={0.8} step={0.01} onChange={dS('bloomIntensity')} />

            <div style={{ paddingTop: 8, paddingBottom: 16 }}>
              <button type="button" onClick={() => store.resetDigiParams()} style={{ width: '100%', padding: '6px 0', fontSize: 9, letterSpacing: 1, border: '1px solid #1e1e1e', borderRadius: 2, color: '#444', background: 'transparent', cursor: 'pointer', ...mono }}>
                RESET TO DEFAULT
              </button>
            </div>
          </>
        )}
      </div>

      <div style={{ padding: '10px 12px', borderTop: border, display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        <ExportButton fullWidth />
      </div>
    </div>
    </div>
  )
}
