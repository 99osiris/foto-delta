'use client'
import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useEditorStore } from '@/lib/store/editor'
import { checkUnlocked, setUnlocked } from '@/lib/stripe'
import PhotoEditor from '@/components/editor/PhotoEditor'
import VideoEditor from '@/components/editor/VideoEditor'
import ShaderControls from '@/components/editor/ShaderControls'
import UnlockModal from '@/components/ui/UnlockModal'
import ExportButton from '@/components/editor/ExportButton'

function EditorInner() {
  const { file, fileUrl, fileType, setFile, clearFile, setUnlocked: storeSetUnlocked, showUnlockModal } = useEditorStore()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (checkUnlocked()) storeSetUnlocked(true)
    if (searchParams.get('unlocked') === 'true') {
      setUnlocked()
      storeSetUnlocked(true)
    }
  }, [searchParams, storeSetUnlocked])

  const handleFile = (f: File) => setFile(f)

  return (
    <main style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0a0a', fontFamily: "'Courier New', monospace", color: '#fff' }}>

      <div style={{ height: 40, background: '#0f0f0f', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 3, color: '#fff' }}>FOTO</span>
        <div style={{ width: 1, height: 16, background: '#1f1f1f' }} />
        <label style={{ fontSize: 10, padding: '4px 10px', border: '1px solid #2a2a2a', borderRadius: 2, color: '#888', cursor: 'pointer', letterSpacing: 0.5 }}>
          OPEN FILE
          <input type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
        </label>
        {file && <span style={{ fontSize: 10, color: '#444', letterSpacing: 0.5 }}>{file.name}</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {file && (
            <button onClick={clearFile} style={{ fontSize: 10, padding: '4px 10px', border: '1px solid #2a2a2a', borderRadius: 2, color: '#666', background: 'transparent', cursor: 'pointer', letterSpacing: 0.5 }}>
              CLEAR
            </button>
          )}
          <ExportButton />
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505', position: 'relative' }}>
          {!fileUrl ? (
            <label style={{ cursor: 'pointer' }}>
              <input type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, userSelect: 'none' }}>
                <div style={{ position: 'relative', width: 280, height: 180, border: '1px solid #1a1a1a' }}>
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
                        ...( 't' in c ? { top: c.t } : {} ),
                        ...( 'btm' in c ? { bottom: c.btm } : {} ),
                        ...( 'l' in c ? { left: c.l } : {} ),
                        ...( 'r' in c ? { right: c.r } : {} ),
                        ...c.b,
                      }}
                    />
                  ))}
                  <div style={{ position: 'absolute', top: 10, left: 12, fontSize: 9, color: '#2a2a2a', letterSpacing: 1 }}>00:00:00:00</div>
                  <div style={{ position: 'absolute', top: 10, right: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#1a1a1a' }} />
                    <span style={{ fontSize: 9, color: '#2a2a2a', letterSpacing: 1 }}>SP</span>
                  </div>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 32, fontWeight: 700, color: '#161616', letterSpacing: 6 }}>FOTO</span>
                  </div>
                  <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center', fontSize: 9, color: '#2a2a2a', letterSpacing: 2 }}>DROP FILE HERE</div>
                </div>
                <span style={{ fontSize: 9, color: '#333', letterSpacing: 2 }}>OR CLICK TO BROWSE · JPG PNG WEBP MP4 MOV</span>
              </div>
            </label>
          ) : (
            fileType === 'photo'
              ? <PhotoEditor fileUrl={fileUrl} />
              : <VideoEditor fileUrl={fileUrl} />
          )}
        </div>

        <ShaderControls />
      </div>

      {showUnlockModal && <UnlockModal />}
    </main>
  )
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div style={{ height: '100vh', background: '#0a0a0a' }} />}>
      <EditorInner />
    </Suspense>
  )
}
