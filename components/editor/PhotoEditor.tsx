'use client'
import { useEffect, useRef, useState } from 'react'
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
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  // Init renderer
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      rendererRef.current = new VHSRenderer(canvas)
      setError(null)
    } catch (e: unknown) {
      console.error('WebGL2 init failed:', e)
      setError(e instanceof Error ? e.message : 'WebGL2 failed to initialize')
      return
    }
    return () => {
      stopRef.current?.()
      stopRef.current = null
      rendererRef.current?.destroy()
      rendererRef.current = null
    }
  }, [])

  // Load image — retry until renderer exists (Strict Mode / ordering)
  useEffect(() => {
    if (!fileUrl) return
    setLoaded(false)
    let cancelled = false

    const run = () => {
      if (cancelled) return
      if (!rendererRef.current || !canvasRef.current) {
        requestAnimationFrame(run)
        return
      }
      const renderer = rendererRef.current
      const canvas   = canvasRef.current

      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        if (cancelled || !rendererRef.current) return
        canvas.width  = img.naturalWidth
        canvas.height = img.naturalHeight
        try {
          renderer.loadSource(img)
          stopRef.current?.()
          stopRef.current = renderer.startLoop(() =>
            useEditorStore.getState().activeParams()
          )
          setLoaded(true)
          setError(null)
        } catch (e: unknown) {
          console.error('Renderer loadSource failed:', e)
          setError(e instanceof Error ? e.message : 'Failed to load image into WebGL')
        }
      }
      img.onerror = () => {
        console.error('Image load failed:', fileUrl)
        setError('Failed to load image file')
      }
      img.src = fileUrl
    }

    run()
    return () => {
      cancelled = true
    }
  }, [fileUrl])

  // Sync mode
  useEffect(() => {
    rendererRef.current?.setMode(mode)
  }, [mode])

  if (error) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 12, padding: 24, fontFamily: "'Courier New', monospace",
      }}>
        <div style={{ fontSize: 10, color: '#ef4444', letterSpacing: 1 }}>RENDER ERROR</div>
        <div style={{ fontSize: 9, color: '#666', maxWidth: 300, textAlign: 'center', lineHeight: 1.6 }}>
          {error}
        </div>
        <div style={{ fontSize: 9, color: '#333', letterSpacing: 0.5 }}>
          Check browser console for details
        </div>
      </div>
    )
  }

  const scale = zoom / 100

  return (
    <div style={{
      position: 'relative',
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {!loaded && (
        <div style={{
          position: 'absolute',
          fontSize: 9, color: '#444',
          fontFamily: "'Courier New', monospace",
          letterSpacing: 2,
        }}>
          LOADING...
        </div>
      )}
      <canvas
        ref={canvasRef}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.2s',
          flexShrink: 0,
        }}
      />
    </div>
  )
}
