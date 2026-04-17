import { create } from 'zustand'
import {
  FilterMode,
  VHSParams,  DigiParams,
  DEFAULT_VHS_PARAMS, DEFAULT_DIGI_PARAMS,
} from '../webgl/renderer'

type FileType = 'photo' | 'video' | null

interface EditorStore {
  // File
  file: File | null
  fileType: FileType
  fileUrl: string | null
  setFile: (file: File) => void
  clearFile: () => void

  // Mode
  mode: FilterMode
  setMode: (m: FilterMode) => void

  // VHS params
  vhsParams: VHSParams
  setVhsParam: <K extends keyof VHSParams>(key: K, value: VHSParams[K]) => void
  resetVhsParams: () => void

  // Digicam params
  digiParams: DigiParams
  setDigiParam: <K extends keyof DigiParams>(key: K, value: DigiParams[K]) => void
  resetDigiParams: () => void

  // Active params selector — returns whichever mode is active
  activeParams: () => VHSParams | DigiParams

  // Unlock
  isUnlocked: boolean
  setUnlocked: (v: boolean) => void

  // Processing (video)
  isProcessing: boolean
  progress: number
  setProcessing: (v: boolean) => void
  setProgress: (v: number) => void

  // UI
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
      fileUrl:  URL.createObjectURL(file),
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
    set(s => ({ vhsParams: { ...s.vhsParams, [key]: value } })),
  resetVhsParams: () => set({ vhsParams: { ...DEFAULT_VHS_PARAMS } }),

  digiParams: { ...DEFAULT_DIGI_PARAMS },
  setDigiParam: (key, value) =>
    set(s => ({ digiParams: { ...s.digiParams, [key]: value } })),
  resetDigiParams: () => set({ digiParams: { ...DEFAULT_DIGI_PARAMS } }),

  activeParams: () => {
    const { mode, vhsParams, digiParams } = get()
    return mode === 'vhs' ? vhsParams : digiParams
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
