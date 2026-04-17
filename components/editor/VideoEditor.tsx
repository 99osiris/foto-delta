'use client'
import { useEffect, useRef } from 'react'
import { useEditorStore } from '@/lib/store/editor'
import { VHSRenderer } from '@/lib/webgl/renderer'

export default function VideoEditor({ fileUrl }: { fileUrl: string }) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const videoRef    = useRef<HTMLVideoElement>(null)
  const rendererRef = useRef<VHSRenderer | null>(null)
  const stopLoopRef = useRef<(() => void) | null>(null)
  const mountedRef  = useRef(false)   // guard against StrictMode double-mount

  const { mode } = useEditorStore()

  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true

    const canvas = canvasRef.current
    if (!canvas) return
    try {
      rendererRef.current = new VHSRenderer(canvas)
    } catch (e) {
      console.error('WebGL2 init failed:', e)
    }

    return () => {
      stopLoopRef.current?.()
      stopLoopRef.current = null
      // Keep rendererRef/mountedRef alive — see PhotoEditor for rationale.
    }
  }, [])

  useEffect(() => {
    const video    = videoRef.current
    const canvas   = canvasRef.current
    const renderer = rendererRef.current
    if (!fileUrl || !video || !canvas || !renderer) return

    video.src       = fileUrl
    video.muted     = true
    video.playsInline = true
    video.loop      = true

    const startPlayback = () => {
      canvas.width  = video.videoWidth  || 1280
      canvas.height = video.videoHeight || 720

      stopLoopRef.current?.()
      let raf = 0
      let stopped = false
      const loop = () => {
        if (stopped) return
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          renderer.loadSource(video)
          renderer.render(useEditorStore.getState().activeParams(), video.currentTime)
        }
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
      stopLoopRef.current = () => { stopped = true; cancelAnimationFrame(raf) }
      void video.play().catch(() => {})
    }

    video.addEventListener('loadeddata', startPlayback, { once: true })
    return () => {
      video.removeEventListener('loadeddata', startPlayback)
      stopLoopRef.current?.()
      stopLoopRef.current = null
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [fileUrl])

  useEffect(() => {
    rendererRef.current?.setMode(mode)
  }, [mode])

  return (
    <div className="relative max-w-full max-h-[calc(100vh-48px)]">
      <video ref={videoRef} className="hidden" playsInline muted loop />
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-[calc(100vh-48px)] object-contain"
        style={{ imageRendering: 'auto' }}
      />
    </div>
  )
}
