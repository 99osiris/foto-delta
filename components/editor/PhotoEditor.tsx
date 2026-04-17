'use client'
import { useEffect, useRef } from 'react'
import { useEditorStore } from '@/lib/store/editor'
import { VHSRenderer } from '@/lib/webgl/renderer'

export default function PhotoEditor({ fileUrl }: { fileUrl: string }) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<VHSRenderer | null>(null)
  const stopLoopRef = useRef<(() => void) | null>(null)

  const { mode } = useEditorStore()

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
      stopLoopRef.current?.()
      stopLoopRef.current = null
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
      stopLoopRef.current?.()
      stopLoopRef.current = renderer.startLoop(() =>
        useEditorStore.getState().activeParams()
      )
    }
    img.onerror = (e) => console.error('Image load failed:', e)
    img.src = fileUrl
  }, [fileUrl])

  useEffect(() => {
    rendererRef.current?.setMode(mode)
  }, [mode])

  return (
    <canvas
      ref={canvasRef}
      className="max-w-full max-h-[calc(100vh-48px)] object-contain"
      style={{ imageRendering: 'auto' }}
    />
  )
}
