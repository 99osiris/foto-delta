'use client'
import { useEditorStore } from '@/lib/store/editor'

const mono: React.CSSProperties = { fontFamily: "'Courier New', monospace" }
const green = '#4ade80'

async function addWatermark(blob: Blob): Promise<Blob> {
  const img    = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  canvas.width  = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  const size = Math.max(14, Math.round(img.width * 0.025))
  ctx.font      = `bold ${size}px "Courier New", monospace`
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.textAlign = 'right'
  ctx.fillText('VHESS', img.width - 12, img.height - 12)
  return new Promise((res, rej) =>
    canvas.toBlob(b => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png')
  )
}

function triggerDownload(blob: Blob, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function ExportButton({ fullWidth = false }: { fullWidth?: boolean }) {
  const { fileType, isUnlocked, isProcessing, setShowUnlockModal, setProcessing, setProgress } = useEditorStore()

  if (!fileType) return null

  const handleExport = async () => {
    if (fileType === 'video' && !isUnlocked) {
      setShowUnlockModal(true)
      return
    }

    if (fileType === 'photo') {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement | null
      if (!canvas) return
      canvas.toBlob(async (blob) => {
        if (!blob) return
        const final = isUnlocked ? blob : await addWatermark(blob)
        triggerDownload(final, 'vhess-export.png')
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
        const ext = blob.type.includes('webm') ? 'webm' : 'mp4'
        triggerDownload(blob, `vhess-export.${ext}`)
      } catch (e) {
        console.error('Video export failed:', e)
      } finally {
        setProcessing(false)
        setProgress(0)
      }
    }
  }

  const isVideo = fileType === 'video'
  const label   = isProcessing ? 'PROCESSING...' : isVideo && !isUnlocked ? 'UNLOCK TO EXPORT VIDEO' : 'EXPORT'

  return (
    <div style={{ display: 'flex', gap: 6, width: fullWidth ? '100%' : 'auto', alignItems: 'center' }}>
      <button
        type="button"
        onClick={() => void handleExport()}
        disabled={isProcessing}
        style={{
          flex: fullWidth ? 1 : 'initial',
          padding: fullWidth ? '7px 0' : '4px 10px',
          fontSize: 9, letterSpacing: 1,
          border: '1px solid #1a3a2a',
          borderRadius: 2,
          color: isProcessing ? '#2a5a3a' : green,
          background: '#0a1410',
          cursor: isProcessing ? 'not-allowed' : 'pointer',
          opacity: isProcessing ? 0.6 : 1,
          ...mono,
        }}
      >
        {label}
      </button>
      {!isUnlocked && !fullWidth && (
        <button
          type="button"
          onClick={() => setShowUnlockModal(true)}
          style={{ padding: '4px 8px', fontSize: 9, letterSpacing: 0.5, border: '1px solid #2a1a0a', borderRadius: 2, color: '#f97316', background: '#0f0a05', cursor: 'pointer', ...mono }}
        >
          €3.99
        </button>
      )}
    </div>
  )
}
