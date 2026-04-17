'use client'
import { useState } from 'react'
import { useEditorStore } from '@/lib/store/editor'
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
    store.setVhsParam('chromaShift',    Math.min(12,  3    * mul))
    store.setVhsParam('jitterAmp',      Math.min(5,   0.5  * mul))
    store.setVhsParam('lumaNoiseAmt',   Math.min(0.15, 0.02 * mul))
    store.setVhsParam('chromaNoiseAmt', Math.min(0.10, 0.01 * mul))
    store.setVhsParam('chromaI',        Math.min(0.2,  0.03 * mul))
    store.setVhsParam('chromaQ',        Math.min(0.2,  0.03 * mul))
    store.setVhsParam('dropoutCount',   Math.min(20,  Math.round(2 * mul)))
    store.setVhsParam('headSwitchHeight', Math.min(60, 15 * mul))
    store.setVhsParam('scanlineIntensity', Math.max(0.4, 0.75 - (mul - 1) * 0.1))
  } else {
    store.setDigiParam('bayerNoise',   Math.min(0.12, 0.05 * mul))
    store.setDigiParam('jpegBlock',    Math.min(1.0,  0.35 * mul))
    store.setDigiParam('lensBlur',     Math.min(1.0,  0.5  * mul))
    store.setDigiParam('chromaticAb',  Math.min(8, 2.5 * mul))
  }
}

export default function ShaderControls() {
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
    <div style={{ width: '100%', maxWidth: 256, margin: '0 auto', background: bg, display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0, flex: 1, minHeight: 0, ...mono }}>

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
            <SectionLabel>JPEG — DEGRADATION</SectionLabel>
            <Slider label="JPEG quality" value={vhsParams.jpegQuality} min={0} max={100} step={1} decimals={0} onChange={vS('jpegQuality')} />
            <Slider label="Black crush" value={vhsParams.blackCrush} min={0} max={32} step={1} decimals={0} onChange={vS('blackCrush')} />
            <Slider label="White crush" value={vhsParams.whiteCrush} min={220} max={255} step={1} decimals={0} onChange={vS('whiteCrush')} />

            <SectionLabel>SIGNAL — ARTIFACTS</SectionLabel>
            <Slider label="Sharpness" value={vhsParams.sharpness} min={0} max={8} step={0.1} onChange={vS('sharpness')} />
            <Slider label="Sharpness width" value={vhsParams.sharpnessWidth} min={0} max={4} step={0.1} onChange={vS('sharpnessWidth')} />

            <SectionLabel>ANALOG — YIQ</SectionLabel>
            <Slider label="Chroma shift" value={vhsParams.chromaShift} min={0} max={12} step={0.1} onChange={vS('chromaShift')} />
            <Slider label="Luma bandwidth" value={vhsParams.lumaBandwidth} min={0.1} max={1} onChange={vS('lumaBandwidth')} />
            <Slider label="Chroma I bleed" value={vhsParams.chromaI} min={0} max={0.2} onChange={vS('chromaI')} />
            <Slider label="Chroma Q bleed" value={vhsParams.chromaQ} min={0} max={0.2} onChange={vS('chromaQ')} />
            <Slider label="Vertical bleed" value={vhsParams.lumaVertBleed} min={0} max={1} onChange={vS('lumaVertBleed')} />
            <Slider label="Luma noise" value={vhsParams.lumaNoiseAmt} min={0} max={0.15} step={0.005} onChange={vS('lumaNoiseAmt')} />
            <Slider label="Chroma noise" value={vhsParams.chromaNoiseAmt} min={0} max={0.10} step={0.002} onChange={vS('chromaNoiseAmt')} />

            <SectionLabel>MECHANICAL — TAPE</SectionLabel>
            <Slider label="Jitter frequency" value={vhsParams.jitterFreq} min={0} max={0.3} step={0.005} onChange={vS('jitterFreq')} />
            <Slider label="Jitter amplitude" value={vhsParams.jitterAmp} min={0} max={5} step={0.1} onChange={vS('jitterAmp')} />
            <Slider label="Jitter roughness" value={vhsParams.jitterRoughness} min={0} max={1} onChange={vS('jitterRoughness')} />
            <Slider label="Head switch height" value={vhsParams.headSwitchHeight} min={0} max={60} step={1} decimals={0} onChange={vS('headSwitchHeight')} />
            <Slider label="Head switch amount" value={vhsParams.headSwitchAmt} min={0} max={0.1} step={0.005} onChange={vS('headSwitchAmt')} />
            <Slider label="Bottom dist height" value={vhsParams.bottomDistHeight} min={0} max={80} step={1} decimals={0} onChange={vS('bottomDistHeight')} />
            <Slider label="Bottom distortion" value={vhsParams.bottomDistAmt} min={0} max={1} onChange={vS('bottomDistAmt')} />
            <Slider label="Dropout count" value={vhsParams.dropoutCount} min={0} max={20} step={1} decimals={0} onChange={vS('dropoutCount')} />
            <Slider label="Dropout max len" value={vhsParams.dropoutMaxLen} min={0} max={300} step={1} decimals={0} onChange={vS('dropoutMaxLen')} />
            <Slider label="Dropout intensity" value={vhsParams.dropoutIntensity} min={0} max={1} onChange={vS('dropoutIntensity')} />

            <SectionLabel>DISPLAY</SectionLabel>
            <Slider label="Scanline intensity" value={vhsParams.scanlineIntensity} min={0} max={1} onChange={vS('scanlineIntensity')} />
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
            <SectionLabel>BAYER — CCD</SectionLabel>
            <Slider label="Bayer noise" value={digiParams.bayerNoise} min={0} max={0.12} step={0.005} onChange={dS('bayerNoise')} />
            <Slider label="Hot pixels" value={digiParams.hotPixels} min={0} max={1} onChange={dS('hotPixels')} />

            <SectionLabel>LENS — OPTICS</SectionLabel>
            <Slider label="Lens blur" value={digiParams.lensBlur} min={0} max={1} step={0.02} onChange={dS('lensBlur')} />
            <Slider label="Chromatic aberration" value={digiParams.chromaticAb} min={0} max={8} step={0.1} onChange={dS('chromaticAb')} />
            <Slider label="Barrel distortion" value={digiParams.barrelDistortion} min={0} max={0.3} step={0.01} onChange={dS('barrelDistortion')} />

            <SectionLabel>JPEG</SectionLabel>
            <Slider label="JPEG blocks" value={digiParams.jpegBlock} min={0} max={1} onChange={dS('jpegBlock')} />
            <Slider label="Chroma subsampling" value={digiParams.jpegChroma} min={0} max={1} onChange={dS('jpegChroma')} />

            <SectionLabel>SENSOR — CURVE</SectionLabel>
            <Slider label="Shadow compression" value={digiParams.shadowCompression} min={0} max={1} onChange={dS('shadowCompression')} />
            <Slider label="Midtone contrast" value={digiParams.midtoneContrast} min={0.5} max={1.5} step={0.01} onChange={dS('midtoneContrast')} />
            <Slider label="Highlight shift" value={digiParams.highlightShift} min={0} max={1} onChange={dS('highlightShift')} />

            <SectionLabel>COLOR SCIENCE</SectionLabel>
            <Slider label="Saturation" value={digiParams.saturation} min={0.3} max={1.2} onChange={dS('saturation')} />
            <Slider label="Cyan boost" value={digiParams.cyanBoost} min={1.0} max={2.5} step={0.05} onChange={dS('cyanBoost')} />
            <Slider label="Shadow cyan tint" value={digiParams.shadowCyan} min={0} max={0.15} step={0.005} onChange={dS('shadowCyan')} />
            <Slider label="Black lift" value={digiParams.blackLift} min={0} max={0.12} step={0.005} onChange={dS('blackLift')} />
            <Slider label="Red" value={digiParams.colorMatrix[0]} min={0.7} max={1.3} onChange={v => setDigiParam('colorMatrix', [v, digiParams.colorMatrix[1], digiParams.colorMatrix[2]])} />
            <Slider label="Green" value={digiParams.colorMatrix[1]} min={0.7} max={1.3} onChange={v => setDigiParam('colorMatrix', [digiParams.colorMatrix[0], v, digiParams.colorMatrix[2]])} />
            <Slider label="Blue" value={digiParams.colorMatrix[2]} min={0.7} max={1.3} onChange={v => setDigiParam('colorMatrix', [digiParams.colorMatrix[0], digiParams.colorMatrix[1], v])} />

            <SectionLabel>HIGHLIGHT — BLOOM</SectionLabel>
            <Slider label="Bloom threshold" value={digiParams.bloomThreshold} min={0.6} max={1.0} step={0.01} onChange={dS('bloomThreshold')} />
            <Slider label="Bloom radius" value={digiParams.bloomRadius} min={0} max={1} onChange={dS('bloomRadius')} />
            <Slider label="Bloom intensity" value={digiParams.bloomIntensity} min={0} max={1} onChange={dS('bloomIntensity')} />

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
