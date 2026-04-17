'use client'
import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useEditorStore } from '@/lib/store/editor'
import { checkUnlocked, setUnlocked } from '@/lib/stripe'
import { HI8_PARAMS } from '@/lib/store/editor'
import PhotoEditor from '@/components/editor/PhotoEditor'
import VideoEditor from '@/components/editor/VideoEditor'
import ShaderControls from '@/components/editor/ShaderControls'
import UnlockModal from '@/components/ui/UnlockModal'
import ExportButton from '@/components/editor/ExportButton'
import VhessLogo from '@/components/ui/VhessLogo'

const mono: React.CSSProperties = { fontFamily: "'Courier New', monospace" }

const SHEET_PEEK = 72
const SHEET_OPEN = 0.62

const MOBILE_PRESETS = [
  { id: 'vhs94' as const, label: "VHS '94" },
  { id: 'digicam02' as const, label: "CAM '02" },
  { id: 'hi8' as const, label: "HI8 '98" },
]

function MobilePresetBar() {
  const mode = useEditorStore(s => s.mode)
  const vhs = useEditorStore(s => s.vhsParams)
  const applyPreset = useEditorStore(s => s.applyPreset)

  const isHi8 =
    mode === 'vhs' &&
    vhs.jpegQuality === HI8_PARAMS.jpegQuality &&
    vhs.chromaShift === HI8_PARAMS.chromaShift &&
    vhs.chromaShiftRandom === HI8_PARAMS.chromaShiftRandom &&
    vhs.lumaSmear === HI8_PARAMS.lumaSmear &&
    vhs.colorDepth === HI8_PARAMS.colorDepth

  return (
    <div style={{ display: 'flex', gap: 6, padding: '0 12px' }}>
      {MOBILE_PRESETS.map(p => {
        const isActive =
          (p.id === 'vhs94' && mode === 'vhs' && !isHi8) ||
          (p.id === 'digicam02' && mode === 'digicam') ||
          (p.id === 'hi8' && isHi8)
        return (
          <button
            key={p.id}
            type="button"
            onClick={e => {
              e.stopPropagation()
              applyPreset(p.id)
            }}
            style={{
              flex: 1,
              padding: '5px 12px',
              fontSize: 9,
              letterSpacing: 0.5,
              border: isActive ? '1px solid #1a3a2a' : '1px solid #1e1e1e',
              borderRadius: 2,
              color: isActive ? '#4ade80' : '#555',
              background: isActive ? '#0a1410' : 'transparent',
              cursor: 'pointer',
              ...mono,
            }}
          >
            {p.label}
          </button>
        )
      })}
    </div>
  )
}

function EditorInner() {
  const {
    file, fileUrl, fileType,
    setFile, clearFile,
    setUnlocked: storeSetUnlocked,
    showUnlockModal,
  } = useEditorStore()

  const searchParams = useSearchParams()
  const [isMobile, setIsMobile]       = useState(false)
  const [sheetOpen, setSheetOpen]     = useState(false)
  const [zoom, setZoom]               = useState(100)
  const [screenH, setScreenH]         = useState(800)
  const dragStartY = useRef<number>(0)

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 768)
      setScreenH(window.innerHeight)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (checkUnlocked()) storeSetUnlocked(true)
    if (searchParams.get('unlocked') === 'true') {
      setUnlocked()
      storeSetUnlocked(true)
    }
  }, [searchParams, storeSetUnlocked])

  const handleFile = (f: File) => {
    setFile(f)
    setSheetOpen(false)
  }

  const onSheetDragStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY
  }
  const onSheetDragEnd = (e: React.TouchEvent) => {
    const dy = dragStartY.current - e.changedTouches[0].clientY
    if (dy > 40)       setSheetOpen(true)
    else if (dy < -40) setSheetOpen(false)
  }

  const sheetHeight = sheetOpen
    ? Math.round(screenH * SHEET_OPEN)
    : SHEET_PEEK

  const canvasAreaHeight = isMobile
    ? screenH - 44 - sheetHeight
    : undefined

  return (
    <main style={{
      height: '100dvh', display: 'flex', flexDirection: 'column',
      background: '#0a0a0a', overflow: 'hidden', ...mono,
    }}>

      <div style={{
        height: 44, background: '#0f0f0f',
        borderBottom: '1px solid #1a1a1a',
        display: 'flex', alignItems: 'center',
        padding: '0 12px', gap: 10, flexShrink: 0, zIndex: 20,
      }}>
        <VhessLogo size="topbar" />
        <div style={{ width: 1, height: 16, background: '#1f1f1f' }} />
        <label style={{
          fontSize: 10, padding: '4px 10px',
          border: '1px solid #2a2a2a', borderRadius: 2,
          color: '#888', cursor: 'pointer', letterSpacing: 0.5,
          whiteSpace: 'nowrap',
        }}>
          OPEN FILE
          <input
            type="file" accept="image/*,video/*"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
          />
        </label>
        {file && !isMobile && (
          <span style={{
            fontSize: 10, color: '#444', letterSpacing: 0.3,
            overflow: 'hidden', textOverflow: 'ellipsis',
            whiteSpace: 'nowrap', maxWidth: 200,
          }}>
            {file.name}
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {fileUrl && !isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 9, color: '#444', letterSpacing: 1, whiteSpace: 'nowrap' }}>
                {zoom}%
              </span>
              <input
                type="range" min={30} max={200} step={5} value={zoom}
                onChange={e => setZoom(parseInt(e.target.value, 10))}
                style={{ width: 80, accentColor: '#4ade80', cursor: 'pointer' }}
              />
            </div>
          )}
          {file && (
            <button type="button" onClick={() => { clearFile(); setSheetOpen(false) }} style={{
              fontSize: 10, padding: '4px 8px',
              border: '1px solid #2a2a2a', borderRadius: 2,
              color: '#666', background: 'transparent', cursor: 'pointer', letterSpacing: 0.5,
            }}>
              CLEAR
            </button>
          )}
          <ExportButton />
        </div>
      </div>

      {isMobile ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

          <div style={{
            height: canvasAreaHeight,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#050505', flexShrink: 0, overflow: 'hidden',
            transition: 'height 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
          }}>
            {!fileUrl
              ? <MobileDropZone onFile={handleFile} />
              : fileType === 'photo'
                ? <PhotoEditor fileUrl={fileUrl} zoom={100} />
                : <VideoEditor fileUrl={fileUrl} />
            }
          </div>

          <div
            style={{
              height: sheetHeight,
              background: '#0c0c0c',
              borderTop: '1px solid #1a1a1a',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden', flexShrink: 0,
              transition: 'height 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
              zIndex: 10,
            }}
            onTouchStart={onSheetDragStart}
            onTouchEnd={onSheetDragEnd}
          >
            <div
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', padding: '8px 0 4px',
                cursor: 'pointer', flexShrink: 0,
              }}
              onClick={() => setSheetOpen(v => !v)}
            >
              <div style={{
                width: 32, height: 3, borderRadius: 2,
                background: '#2a2a2a', marginBottom: 6,
              }} />
              <MobilePresetBar />
            </div>

            <div style={{
              flex: 1, overflowY: sheetOpen ? 'auto' : 'hidden',
              opacity: sheetOpen ? 1 : 0,
              transition: 'opacity 0.2s',
              minHeight: 0,
            }}>
              <ShaderControls hidePanelPresets />
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: '#050505',
            overflow: 'hidden', position: 'relative',
          }}>
            {!fileUrl
              ? <DesktopDropZone onFile={handleFile} />
              : fileType === 'photo'
                ? <PhotoEditor fileUrl={fileUrl} zoom={zoom} />
                : <VideoEditor fileUrl={fileUrl} />
            }
          </div>
          <div style={{
            width: 256, background: '#0c0c0c',
            borderLeft: '1px solid #1a1a1a',
            overflow: 'hidden', display: 'flex',
            flexDirection: 'column', flexShrink: 0,
          }}>
            <ShaderControls />
          </div>
        </div>
      )}

      {showUnlockModal && <UnlockModal />}
    </main>
  )
}

function DesktopDropZone({ onFile }: { onFile: (f: File) => void }) {
  const [drag, setDrag] = useState(false)
  return (
    <label
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
      style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}
    >
      <input type="file" accept="image/*,video/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
      <div style={{
        position: 'relative', width: 280, height: 180,
        border: `1px solid ${drag ? '#2a5a3a' : '#1a1a1a'}`,
        background: drag ? '#0a1410' : 'transparent',
        transition: 'all 0.15s',
      }}>
        {([
          'top:8px,left:8px,borderTop,borderLeft',
          'top:8px,right:8px,borderTop,borderRight',
          'bottom:8px,left:8px,borderBottom,borderLeft',
          'bottom:8px,right:8px,borderBottom,borderRight',
        ] as const).map((spec, i) => {
          const [v, h, ...bs] = spec.split(',')
          const [vk, vv] = v.split(':')
          const [hk, hv] = h.split(':')
          const borders = bs.reduce((a: Record<string, string>, k: string) => ({ ...a, [k]: '1px solid #2a2a2a' }), {})
          return <div key={i} style={{ position: 'absolute', width: 14, height: 14, [vk]: vv, [hk]: hv, ...borders }} />
        })}
        <div style={{ position: 'absolute', top: 10, left: 12, fontSize: 9, color: '#252525', letterSpacing: 1, fontFamily: "'Courier New', monospace" }}>00:00:00:00</div>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 32, fontWeight: 700, color: '#141414', letterSpacing: 6, fontFamily: "'Courier New', monospace" }}>VHESS</span>
        </div>
        <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center', fontSize: 9, color: '#252525', letterSpacing: 2, fontFamily: "'Courier New', monospace" }}>
          {drag ? 'RELEASE TO LOAD' : 'DROP FILE HERE'}
        </div>
      </div>
      <span style={{ fontSize: 9, color: '#2a2a2a', letterSpacing: 2, fontFamily: "'Courier New', monospace" }}>
        OR CLICK TO BROWSE · JPG PNG WEBP MP4 MOV
      </span>
    </label>
  )
}

function MobileDropZone({ onFile }: { onFile: (f: File) => void }) {
  return (
    <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <input type="file" accept="image/*,video/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
      <div style={{ width: 56, height: 56, border: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 22, color: '#1f1f1f', fontFamily: "'Courier New', monospace" }}>+</span>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: '#666', letterSpacing: 1, marginBottom: 6, fontFamily: "'Courier New', monospace" }}>TAP TO OPEN FILE</div>
        <div style={{ fontSize: 9, color: '#333', letterSpacing: 1, fontFamily: "'Courier New', monospace" }}>JPG PNG WEBP · MP4 MOV · MAX 15S</div>
      </div>
    </label>
  )
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div style={{ height: '100dvh', background: '#0a0a0a' }} />}>
      <EditorInner />
    </Suspense>
  )
}
