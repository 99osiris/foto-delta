'use client'
import { useEditorStore } from '@/lib/store/editor'

async function addWatermark(blob: Blob): Promise<Blob> {
  const img = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  ctx.font = `bold ${Math.round(img.width * 0.04)}px monospace`
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.textAlign = 'right'
  ctx.fillText('FOTO', img.width - 16, img.height - 16)
  return new Promise(res => canvas.toBlob(b => res(b!), 'image/png'))
}

function download(blob: Blob, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function ExportButton() {
  const {
    fileType, isUnlocked, isProcessing,
    setShowUnlockModal, setProcessing, setProgress,
  } = useEditorStore()

  const handleExport = async () => {
    if (fileType === 'video' && !isUnlocked) {
      setShowUnlockModal(true)
      return
    }

    if (fileType === 'photo') {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement
      if (!canvas) return
      canvas.toBlob(async (blob) => {
        if (!blob) return
        const final = isUnlocked ? blob : await addWatermark(blob)
        download(final, 'foto-export.png')
      }, 'image/png')
      return
    }

    if (fileType === 'video') {
      const { file, activeParams, mode } = useEditorStore.getState()
      if (!file) return
      setProcessing(true)
      setProgress(0)
      try {
        const { processVideoWithVHS } = await import('@/lib/ffmpeg/pipeline')
        const blob = await processVideoWithVHS(file, activeParams(), mode, setProgress)
        download(blob, 'foto-export.mp4')
      } catch (e) {
        console.error('Video export failed:', e)
      } finally {
        setProcessing(false)
        setProgress(0)
      }
    }
  }

  if (!fileType) return null

  return (
    <button
      onClick={() => void handleExport()}
      disabled={isProcessing}
      className="px-3 py-1 border border-zinc-700 rounded text-zinc-300 hover:border-emerald-500 hover:text-emerald-400 transition-colors text-xs disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {isProcessing ? 'Processing...' : 'Export'}
    </button>
  )
}
