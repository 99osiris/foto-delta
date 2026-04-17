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
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string>('')

  // Init renderer
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      console.error('[PhotoEditor] canvasRef is null on mount')
      return
    }

    let renderer: VHSRenderer | undefined
    try {
      renderer = new VHSRenderer(canvas)
      rendererRef.current = renderer
      console.log('[PhotoEditor] VHSRenderer created OK')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[PhotoEditor] VHSRenderer init failed:', msg)
      setErrorMsg(msg)
      setStatus('error')
      return
    }

    return () => {
      stopRef.current?.()
      stopRef.current = null
      renderer?.destroy()
      rendererRef.current = null
    }
  }, [])

  // Load image whenever fileUrl changes
  useEffect(() => {
    if (!fileUrl) return

    if (!rendererRef.current) {
      console.error('[PhotoEditor] fileUrl changed but rendererRef is null — renderer init failed earlier')
      setErrorMsg('WebGL renderer was not initialized (see console)')
      setStatus('error')
      return
    }

    const renderer = rendererRef.current
    const canvas   = canvasRef.current!
    setStatus('loading')

    const img = new Image()
    img.onload = () => {
      console.log('[PhotoEditor] image loaded:', img.naturalWidth, 'x', img.naturalHeight)
      canvas.width  = img.naturalWidth
      canvas.height = img.naturalHeight
      try {
        renderer.loadSource(img)
        stopRef.current?.()
        stopRef.current = renderer.startLoop(() =>
          useEditorStore.getState().activeParams()
        )
        setStatus('ready')
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error('[PhotoEditor] loadSource or startLoop failed:', msg)
        setErrorMsg(msg)
        setStatus('error')
      }
    }
    img.onerror = () => {
      console.error('[PhotoEditor] img.onerror fired for url:', fileUrl?.slice(0, 60))
      setErrorMsg('Failed to load image from: ' + fileUrl?.slice(0, 60))
      setStatus('error')
    }
    img.src = fileUrl
  }, [fileUrl])

  // Sync mode to renderer
  useEffect(() => {
    rendererRef.current?.setMode(mode)
  }, [mode])

  if (status === 'error') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 12, padding: 24, maxWidth: 400, textAlign: 'center',
        fontFamily: "'Courier New', monospace",
      }}>
        <div style={{ fontSize: 10, color: '#ef4444', letterSpacing: 2 }}>RENDER ERROR</div>
        <div style={{ fontSize: 11, color: '#666', lineHeight: 1.6 }}>
          {errorMsg || 'WebGL renderer failed to initialize'}
        </div>
        <div style={{ fontSize: 9, color: '#333', letterSpacing: 1 }}>
          Check browser console (F12) for full error
        </div>
      </div>
    )
  }

  const scale = (zoom ?? 100) / 100

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', position: 'relative',
    }}>
      {status === 'loading' && (
        <div style={{
          position: 'absolute',
          fontSize: 9, color: '#4ade80', letterSpacing: 2,
          fontFamily: "'Courier New', monospace",
          animation: 'vhessPulse 1s ease-in-out infinite',
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
          opacity: status === 'ready' ? 1 : 0,
          transition: 'opacity 0.3s',
          flexShrink: 0,
          display: 'block',
        }}
      />
    </div>
  )
}
