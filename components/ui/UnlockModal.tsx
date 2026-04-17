'use client'
import { useEditorStore } from '@/lib/store/editor'
import { redirectToCheckout } from '@/lib/stripe'

const mono: React.CSSProperties = { fontFamily: "'Courier New', monospace" }

export default function UnlockModal() {
  const { setShowUnlockModal } = useEditorStore()
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
      onClick={() => setShowUnlockModal(false)}
      onKeyDown={e => e.key === 'Escape' && setShowUnlockModal(false)}
      role="presentation"
    >
      <div
        style={{ background: '#0f0f0f', border: '1px solid #2a2a2a', padding: '28px 32px', width: 320, ...mono }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div style={{ fontSize: 9, letterSpacing: 3, color: '#444', marginBottom: 16 }}>UNLOCK FOTO</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8, letterSpacing: 1 }}>€3.99</div>
        <div style={{ fontSize: 11, color: '#555', lineHeight: 1.8, marginBottom: 20 }}>
          One-time payment.<br />
          Clean exports — no watermark.<br />
          Video processing up to 15 seconds.<br />
          All presets and filters, forever.
        </div>
        <button
          type="button"
          onClick={() => void redirectToCheckout()}
          style={{ width: '100%', padding: '10px 0', fontSize: 10, letterSpacing: 2, border: '1px solid #1a3a2a', borderRadius: 2, color: '#4ade80', background: '#0a1410', cursor: 'pointer', marginBottom: 8, ...mono }}
        >
          UNLOCK NOW
        </button>
        <button
          type="button"
          onClick={() => setShowUnlockModal(false)}
          style={{ width: '100%', padding: '8px 0', fontSize: 9, letterSpacing: 1, border: '1px solid #1a1a1a', borderRadius: 2, color: '#444', background: 'transparent', cursor: 'pointer', ...mono }}
        >
          MAYBE LATER
        </button>
      </div>
    </div>
  )
}
