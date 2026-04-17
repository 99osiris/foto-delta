'use client'
import { useEditorStore } from '@/lib/store/editor'
import { FilterMode, VHSParams, DigiParams, PRESET_HI8_VHS } from '@/lib/webgl/renderer'

const MODES: { id: FilterMode; label: string; sub: string }[] = [
  { id: 'vhs',     label: 'VHS',     sub: "'94 tape" },
  { id: 'digicam', label: 'Digicam', sub: "'02 sensor" },
]

const PRESETS = [
  {
    label: "VHS '94",
    action: (store: ReturnType<typeof useEditorStore.getState>) => {
      store.setMode('vhs')
      store.resetVhsParams()
    },
  },
  {
    label: "Digicam '02",
    action: (store: ReturnType<typeof useEditorStore.getState>) => {
      store.setMode('digicam')
      store.resetDigiParams()
    },
  },
  {
    label: "Hi8 '98",
    action: (store: ReturnType<typeof useEditorStore.getState>) => {
      store.setMode('vhs')
      store.resetVhsParams()
      Object.entries(PRESET_HI8_VHS).forEach(([k, v]) =>
        store.setVhsParam(k as keyof VHSParams, v as VHSParams[keyof VHSParams])
      )
    },
  },
]

function Slider({
  label, value, min, max, step = 0.01,
  onChange,
}: {
  label: string; value: number; min: number; max: number
  step?: number; onChange: (v: number) => void
}) {
  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-xs text-zinc-400">{label}</span>
        <span className="text-xs text-zinc-300 tabular-nums">{value.toFixed(2)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full accent-emerald-400"
      />
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] tracking-widest text-zinc-500 uppercase mb-3 mt-5 border-b border-zinc-800 pb-1">
      {children}
    </div>
  )
}

function VHSControls() {
  const { vhsParams, setVhsParam, resetVhsParams } = useEditorStore()
  const s = <K extends keyof typeof vhsParams>(k: K) =>
    (v: number) => setVhsParam(k, v as VHSParams[K])

  return (
    <>
      <SectionLabel>Magnetic — analog layer</SectionLabel>
      <Slider label="Chroma shift"       value={vhsParams.chromaShift}      min={0}   max={12}  step={0.1} onChange={s('chromaShift')} />
      <Slider label="Chroma blur I"      value={vhsParams.chromaBlurI}      min={0}   max={0.2}            onChange={s('chromaBlurI')} />
      <Slider label="Luma bandwidth"     value={vhsParams.lumaBandwidth}    min={0.1} max={1}              onChange={s('lumaBandwidth')} />
      <Slider label="Luma vertical bleed" value={vhsParams.lumaVertBleed}   min={0}   max={1}              onChange={s('lumaVertBleed')} />

      <SectionLabel>Color cast — R / G / B</SectionLabel>
      <Slider label="Red"   value={vhsParams.colorCast[0]} min={0.7} max={1.3} onChange={v => setVhsParam('colorCast', [v, vhsParams.colorCast[1], vhsParams.colorCast[2]])} />
      <Slider label="Green" value={vhsParams.colorCast[1]} min={0.7} max={1.3} onChange={v => setVhsParam('colorCast', [vhsParams.colorCast[0], v, vhsParams.colorCast[2]])} />
      <Slider label="Blue"  value={vhsParams.colorCast[2]} min={0.7} max={1.3} onChange={v => setVhsParam('colorCast', [vhsParams.colorCast[0], vhsParams.colorCast[1], v])} />

      <SectionLabel>Mechanical — tape</SectionLabel>
      <Slider label="Jitter frequency"   value={vhsParams.jitterFreq}        min={0}   max={0.3}  step={0.005} onChange={s('jitterFreq')} />
      <Slider label="Jitter amplitude"   value={vhsParams.jitterAmp}         min={0}   max={5}    step={0.1}   onChange={s('jitterAmp')} />
      <Slider label="Head switch height" value={vhsParams.headSwitchHeight}  min={0}   max={60}   step={1}     onChange={s('headSwitchHeight')} />
      <Slider label="Dropout count"      value={vhsParams.dropoutCount}      min={0}   max={20}   step={1}     onChange={s('dropoutCount')} />
      <Slider label="Sharpness"          value={vhsParams.sharpness}         min={0}   max={8}    step={0.1}   onChange={s('sharpness')} />

      <SectionLabel>Signal — noise</SectionLabel>
      <Slider label="Luma noise"         value={vhsParams.noiseY}            min={0}   max={0.15} step={0.005} onChange={s('noiseY')} />
      <Slider label="Chroma noise"       value={vhsParams.noiseC}            min={0}   max={0.08} step={0.002} onChange={s('noiseC')} />
      <Slider label="Scanline intensity" value={vhsParams.scanlineIntensity} min={0}   max={1}              onChange={s('scanlineIntensity')} />
      <Slider label="Black crush"        value={vhsParams.blackCrush}        min={0}   max={32}   step={1}   onChange={s('blackCrush')} />
      <Slider label="White crush"        value={vhsParams.whiteCrush}        min={220} max={255}  step={1}   onChange={s('whiteCrush')} />

      <button
        onClick={resetVhsParams}
        className="w-full mt-4 py-2 text-xs text-zinc-500 border border-zinc-800 rounded hover:border-zinc-600 hover:text-zinc-300 transition-colors"
      >
        Reset VHS
      </button>
    </>
  )
}

function DigiControls() {
  const { digiParams, setDigiParam, resetDigiParams } = useEditorStore()
  const s = <K extends keyof typeof digiParams>(k: K) =>
    (v: number) => setDigiParam(k, v as DigiParams[K])

  return (
    <>
      <SectionLabel>Sensor — CMOS characteristics</SectionLabel>
      <Slider label="Sensor noise"     value={digiParams.sensorNoise}   min={0}   max={0.15} step={0.005} onChange={s('sensorNoise')} />
      <Slider label="JPEG compression" value={digiParams.jpegBlock}     min={0}   max={1}                onChange={s('jpegBlock')} />
      <Slider label="Black lift"       value={digiParams.blackLift}     min={0}   max={0.12} step={0.005} onChange={s('blackLift')} />

      <SectionLabel>Lens — optics</SectionLabel>
      <Slider label="Lens blur"              value={digiParams.lensBlur}            min={0} max={1}   step={0.02} onChange={s('lensBlur')} />
      <Slider label="Chromatic aberration"   value={digiParams.chromaticAberration} min={0} max={8}   step={0.1}  onChange={s('chromaticAberration')} />

      <SectionLabel>Color — the soul of the look</SectionLabel>
      <Slider label="Saturation"        value={digiParams.saturation}       min={0.3} max={1.2}            onChange={s('saturation')} />
      <Slider label="Cyan boost"        value={digiParams.cyanBoost}        min={1.0} max={2.5} step={0.05} onChange={s('cyanBoost')} />
      <Slider label="Shadow cyan tint"  value={digiParams.shadowCyan}       min={0}   max={0.12} step={0.005} onChange={s('shadowCyan')} />
      <Slider label="Highlight blowout" value={digiParams.highlightBlowout} min={0.7} max={1.0} step={0.01} onChange={s('highlightBlowout')} />

      <SectionLabel>Color cast — R / G / B</SectionLabel>
      <Slider label="Red"   value={digiParams.colorCast[0]} min={0.7} max={1.3} onChange={v => setDigiParam('colorCast', [v, digiParams.colorCast[1], digiParams.colorCast[2]])} />
      <Slider label="Green" value={digiParams.colorCast[1]} min={0.7} max={1.3} onChange={v => setDigiParam('colorCast', [digiParams.colorCast[0], v, digiParams.colorCast[2]])} />
      <Slider label="Blue"  value={digiParams.colorCast[2]} min={0.7} max={1.3} onChange={v => setDigiParam('colorCast', [digiParams.colorCast[0], digiParams.colorCast[1], v])} />

      <SectionLabel>Signal — noise</SectionLabel>
      <Slider label="Luma noise"           value={digiParams.noiseY}     min={0}   max={0.08} step={0.002} onChange={s('noiseY')} />
      <Slider label="Chroma shift"         value={digiParams.chromaShift} min={0}  max={6}    step={0.1}   onChange={s('chromaShift')} />

      <button
        onClick={resetDigiParams}
        className="w-full mt-4 py-2 text-xs text-zinc-500 border border-zinc-800 rounded hover:border-zinc-600 hover:text-zinc-300 transition-colors"
      >
        Reset Digicam
      </button>
    </>
  )
}

export default function ShaderControls() {
  const { mode, setMode } = useEditorStore()

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex gap-1 mb-3">
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => p.action(useEditorStore.getState())}
            className="flex-1 py-1.5 text-[10px] tracking-wider text-zinc-500 border border-zinc-800 rounded hover:border-zinc-600 hover:text-zinc-300 transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex gap-1 mb-4 bg-zinc-950 rounded p-1">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`
              flex-1 py-2 px-3 rounded text-xs transition-all
              ${mode === m.id
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-500 hover:text-zinc-300'}
            `}
          >
            <div className="font-bold tracking-wider">{m.label}</div>
            <div className="text-[10px] opacity-60 mt-0.5">{m.sub}</div>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {mode === 'vhs'     && <VHSControls />}
        {mode === 'digicam' && <DigiControls />}
      </div>
    </div>
  )
}
