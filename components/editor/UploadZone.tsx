'use client'
import { useRef, useState } from 'react'
import { useEditorStore } from '@/lib/store/editor'

export default function UploadZone() {
  const { setFile } = useEditorStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateAndSet = async (f: File) => {
    setError(null)
    if (f.type.startsWith('video/')) {
      const url = URL.createObjectURL(f)
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.src = url
      await new Promise<void>(res => { video.onloadedmetadata = () => res() })
      URL.revokeObjectURL(url)
      if (video.duration > 15) {
        setError('Videos must be 15 seconds or less.')
        return
      }
    }
    setFile(f)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) validateAndSet(f)
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) validateAndSet(f)
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        w-80 h-56 flex flex-col items-center justify-center gap-3
        border-2 border-dashed rounded-lg cursor-pointer transition-colors
        ${dragOver
          ? 'border-emerald-400 bg-emerald-400/5'
          : 'border-zinc-700 hover:border-zinc-500'}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={onInputChange}
      />
      <div className="text-3xl opacity-30">+</div>
      <p className="text-sm text-zinc-400">Drop a photo or video here</p>
      <p className="text-xs text-zinc-600">JPG, PNG, WEBP · MP4, MOV (max 15s)</p>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
