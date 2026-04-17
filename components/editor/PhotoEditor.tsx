'use client'
import { useEffect, useRef } from 'react'
import { useEditorStore } from '@/lib/store/editor'
import { VHSRenderer } from '@/lib/webgl/renderer'

interface Props {
  fileUrl: string
  zoom?: number
}

export default function PhotoEditor({ fileUrl, zoom = 100 }: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<VHSRenderer | null>(null)
  const stopRef     = useRef<(() => void) | null>(null)
  const { mode }    = useEditorStore()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      rendererRef.current = new VHSRenderer(canvas)
    } catch (e) {
      console.error('WebGL2 init failed:', e)
      return
    }
    return () => {
      stopRef.current?.()
      stopRef.current = null
      rendererRef.current?.destroy()
      rendererRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!fileUrl || !rendererRef.current) return
    const renderer = rendererRef.current
    const canvas   = canvasRef.current!

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      canvas.width  = img.naturalWidth
      canvas.height = img.naturalHeight
      renderer.loadSource(img)
      stopRef.current?.()
      stopRef.current = renderer.startLoop(() =>
        useEditorStore.getState().activeParams()
      )
    }
    img.onerror = (e) => console.error('Image load failed:', e)
    img.src = fileUrl
  }, [fileUrl])

  useEffect(() => {
    rendererRef.current?.setMode(mode)
  }, [mode])

  const scale = zoom / 100

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <canvas
        ref={canvasRef}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          imageRendering: 'auto',
          flexShrink: 0,
        }}
      />
    </div>
  )
}
