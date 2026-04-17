import { create } from 'zustand'
import {
  FilterMode,
  VHSParams,
  DigiParams,
  DEFAULT_VHS_PARAMS,
  DEFAULT_DIGI_PARAMS,
} from '../webgl/renderer'

/** Hi8 '98 — tuned from DEFAULT_VHS_PARAMS */
export const HI8_PARAMS: VHSParams = {
  ...DEFAULT_VHS_PARAMS,
  chromaShift: 1.8,
  chromaShiftRandom: 0.25,
  lumaSmear: 0.62,
  chromaI: 0.035,
  chromaQ: 0.045,
  interlace: 0.3,
  jitterAmp: 0.22,
  jitterFreq: 0.04,
  headSwitchHeight: 8,
  headSwitchAmt: 0.02,
  headCapNoise: 0.3,
  lumaNoiseAmt: 0.016,
  chromaNoiseAmt: 0.008,
  dropoutCount: 1,
  dropoutIntensity: 0.65,
  scanlineIntensity: 0.87,
  jpegQuality: 70,
  colorDepth: 0.25,
  ringing: 2.0,
  colorCast: [0.93, 1.02, 1.04] as [number, number, number],
  vignette: 0.2,
}

type FileType = 'photo' | 'video' | null

interface EditorStore {
  file: File | null
  fileType: FileType
  fileUrl: string | null
  setFile: (file: File) => void
  clearFile: () => void

  mode: FilterMode
  setMode: (m: FilterMode) => void

  vhsParams: VHSParams
  setVhsParam: <K extends keyof VHSParams>(key: K, value: VHSParams[K]) => void
  resetVhsParams: () => void

  digiParams: DigiParams
  setDigiParam: <K extends keyof DigiParams>(key: K, value: DigiParams[K]) => void
  resetDigiParams: () => void

  // Returns current params for the active mode — always fresh, never memoized
  activeParams: () => VHSParams | DigiParams

  // Apply a named preset — sets mode + resets params in one call
  applyPreset: (preset: 'vhs94' | 'digicam02' | 'hi8') => void

  isUnlocked: boolean
  setUnlocked: (v: boolean) => void

  isProcessing: boolean
  progress: number
  setProcessing: (v: boolean) => void
  setProgress: (v: number) => void

  showUnlockModal: boolean
  setShowUnlockModal: (v: boolean) => void
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  file: null,
  fileType: null,
  fileUrl: null,
  setFile: (file) => {
    const prev = get().fileUrl
    if (prev) URL.revokeObjectURL(prev)
    set({
      file,
      fileType: file.type.startsWith('video/') ? 'video' : 'photo',
      fileUrl: URL.createObjectURL(file),
    })
  },
  clearFile: () => {
    const prev = get().fileUrl
    if (prev) URL.revokeObjectURL(prev)
    set({ file: null, fileType: null, fileUrl: null })
  },

  mode: 'vhs',
  setMode: (m) => set({ mode: m }),

  vhsParams: { ...DEFAULT_VHS_PARAMS },
  setVhsParam: (key, value) =>
    set((s) => ({ vhsParams: { ...s.vhsParams, [key]: value } })),
  resetVhsParams: () => set({ vhsParams: { ...DEFAULT_VHS_PARAMS } }),

  digiParams: { ...DEFAULT_DIGI_PARAMS },
  setDigiParam: (key, value) =>
    set((s) => ({ digiParams: { ...s.digiParams, [key]: value } })),
  resetDigiParams: () => set({ digiParams: { ...DEFAULT_DIGI_PARAMS } }),

  activeParams: () => {
    const s = get()
    return s.mode === 'vhs' ? s.vhsParams : s.digiParams
  },

  applyPreset: (preset) => {
    switch (preset) {
      case 'vhs94':
        set({ mode: 'vhs', vhsParams: { ...DEFAULT_VHS_PARAMS } })
        break
      case 'digicam02':
        set({ mode: 'digicam', digiParams: { ...DEFAULT_DIGI_PARAMS } })
        break
      case 'hi8':
        set({ mode: 'vhs', vhsParams: { ...HI8_PARAMS } })
        break
    }
  },

  isUnlocked: false,
  setUnlocked: (v) => set({ isUnlocked: v }),

  isProcessing: false,
  progress: 0,
  setProcessing: (v) => set({ isProcessing: v }),
  setProgress: (v) => set({ progress: v }),

  showUnlockModal: false,
  setShowUnlockModal: (v) => set({ showUnlockModal: v }),
}))
