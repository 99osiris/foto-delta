'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useEditorStore } from '@/lib/store/editor'
import { checkUnlocked, setUnlocked } from '@/lib/stripe'
import PhotoEditor from '@/components/editor/PhotoEditor'
import VideoEditor from '@/components/editor/VideoEditor'
import ShaderControls from '@/components/editor/ShaderControls'
import UnlockModal from '@/components/ui/UnlockModal'
import ExportButton from '@/components/editor/ExportButton'

const mono: React.CSSProperties = { fontFamily: "'Courier New', monospace" }

function EditorInner() {
  const {
    file, fileUrl, fileType,
    setFile, clearFile,
    setUnlocked: storeSetUnlocked,
    showUnlockModal,
  } = useEditorStore()

  const searchParams = useSearchParams()
  const [isMobile, setIsMobile] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const [zoom, setZoom] = useState(100)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
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
    setShowControls(false)
  }

  return (
    <main style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: '#0a0a0a',
      overflow: 'hidden',
      ...mono,
    }}>

      <div style={{
        height: 44,
        background: '#0f0f0f',
        borderBottom: '1px solid #1a1a1a',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 10,
        flexShrink: 0,
        zIndex: 10,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 3, color: '#fff' }}>FOTO</span>
        <div style={{ width: 1, height: 16, background: '#1f1f1f' }} />

        <label style={{
          fontSize: 10, padding: '4px 10px',
          border: '1px solid #2a2a2a', borderRadius: 2,
          color: '#888', cursor: 'pointer', letterSpacing: 0.5,
          whiteSpace: 'nowrap',
        }}>
          OPEN FILE
          <input
            type="file"
            accept="image/*,video/*"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
          />
        </label>

        {file && !isMobile && (
          <span style={{ fontSize: 10, color: '#444', letterSpacing: 0.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
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
                type="range"
                min={30}
                max={200}
                step={5}
                value={zoom}
                onChange={e => setZoom(parseInt(e.target.value, 10))}
                style={{ width: 80, accentColor: '#4ade80', cursor: 'pointer' }}
              />
            </div>
          )}

          {file && (
            <button
              type="button"
              onClick={() => { clearFile(); setShowControls(false) }}
              style={{
                fontSize: 10, padding: '4px 8px',
                border: '1px solid #2a2a2a', borderRadius: 2,
                color: '#666', background: 'transparent', cursor: 'pointer',
                letterSpacing: 0.5,
              }}
            >
              CLEAR
            </button>
          )}

          <ExportButton />

          {isMobile && fileUrl && (
            <button
              type="button"
              onClick={() => setShowControls(v => !v)}
              style={{
                fontSize: 10, padding: '4px 10px',
                border: `1px solid ${showControls ? '#1a3a2a' : '#2a2a2a'}`,
                borderRadius: 2,
                color: showControls ? '#4ade80' : '#666',
                background: showControls ? '#0a1410' : 'transparent',
                cursor: 'pointer', letterSpacing: 0.5,
              }}
            >
              {showControls ? 'PREVIEW' : 'CONTROLS'}
            </button>
          )}
        </div>
      </div>

      {isMobile ? (
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#050505',
            opacity: showControls ? 0 : 1,
            pointerEvents: showControls ? 'none' : 'auto',
            transition: 'opacity 0.15s',
          }}>
            {!fileUrl ? (
              <MobileDropZone onFile={handleFile} />
            ) : fileType === 'photo' ? (
              <PhotoEditor fileUrl={fileUrl} zoom={100} />
            ) : (
              <VideoEditor fileUrl={fileUrl} />
            )}
          </div>

          <div style={{
            position: 'absolute', inset: 0,
            background: '#0c0c0c',
            overflowY: 'auto',
            opacity: showControls ? 1 : 0,
            pointerEvents: showControls ? 'auto' : 'none',
            transition: 'opacity 0.15s',
          }}>
            <ShaderControls />
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#050505',
            overflow: 'hidden',
            position: 'relative',
          }}>
            {!fileUrl ? (
              <DesktopDropZone onFile={handleFile} />
            ) : fileType === 'photo' ? (
              <PhotoEditor fileUrl={fileUrl} zoom={zoom} />
            ) : (
              <VideoEditor fileUrl={fileUrl} />
            )}
          </div>

          <div style={{
            width: 256,
            background: '#0c0c0c',
            borderLeft: '1px solid #1a1a1a',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
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
      <input type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
      <div style={{
        position: 'relative', width: 280, height: 180,
        border: `1px solid ${drag ? '#2a5a3a' : '#1a1a1a'}`,
        transition: 'border-color 0.15s',
        background: drag ? '#0a1410' : 'transparent',
      }}>
        {[
          { t: '8px', l: '8px', b: { borderTop: '1px solid #2a2a2a', borderLeft: '1px solid #2a2a2a' } },
          { t: '8px', r: '8px', b: { borderTop: '1px solid #2a2a2a', borderRight: '1px solid #2a2a2a' } },
          { btm: '8px', l: '8px', b: { borderBottom: '1px solid #2a2a2a', borderLeft: '1px solid #2a2a2a' } },
          { btm: '8px', r: '8px', b: { borderBottom: '1px solid #2a2a2a', borderRight: '1px solid #2a2a2a' } },
        ].map((c, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: 14,
              height: 14,
              ...('t' in c ? { top: c.t } : {}),
              ...('btm' in c ? { bottom: c.btm } : {}),
              ...('l' in c ? { left: c.l } : {}),
              ...('r' in c ? { right: c.r } : {}),
              ...c.b,
            }}
          />
        ))}
        <div style={{ position: 'absolute', top: 10, left: 12, fontSize: 9, color: '#252525', letterSpacing: 1, fontFamily: "'Courier New', monospace" }}>00:00:00:00</div>
        <div style={{ position: 'absolute', top: 10, right: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#1a1a1a' }} />
          <span style={{ fontSize: 9, color: '#252525', letterSpacing: 1, fontFamily: "'Courier New', monospace" }}>SP</span>
        </div>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 32, fontWeight: 700, color: '#141414', letterSpacing: 6, fontFamily: "'Courier New', monospace" }}>FOTO</span>
        </div>
        <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center', fontSize: 9, color: '#252525', letterSpacing: 2, fontFamily: "'Courier New', monospace" }}>
          {drag ? 'RELEASE TO LOAD' : 'DROP FILE HERE'}
        </div>
      </div>
      <span style={{ fontSize: 9, color: '#2a2a2a', letterSpacing: 2, fontFamily: "'Courier New', monospace" }}>OR CLICK TO BROWSE · JPG PNG WEBP MP4 MOV</span>
    </label>
  )
}

function MobileDropZone({ onFile }: { onFile: (f: File) => void }) {
  return (
    <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '0 32px' }}>
      <input type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
      <div style={{ width: 64, height: 64, border: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 24, fontWeight: 700, color: '#1f1f1f', letterSpacing: 2, fontFamily: "'Courier New', monospace" }}>+</span>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: '#888', letterSpacing: 1, marginBottom: 6, fontFamily: "'Courier New', monospace" }}>TAP TO OPEN FILE</div>
        <div style={{ fontSize: 9, color: '#333', letterSpacing: 1, fontFamily: "'Courier New', monospace" }}>JPG PNG WEBP · MP4 MOV (MAX 15S)</div>
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
