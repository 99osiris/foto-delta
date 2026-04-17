'use client'
import { useEditorStore } from '@/lib/store/editor'
import { redirectToCheckout } from '@/lib/stripe'

export default function UnlockModal() {
  const { setShowUnlockModal } = useEditorStore()
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={() => setShowUnlockModal(false)}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-lg p-8 max-w-sm w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-white mb-2">Unlock FOTO</h2>
        <p className="text-zinc-400 text-sm mb-6">
          One-time payment. Clean exports, video processing, all filters forever.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => void redirectToCheckout()}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded transition-colors"
          >
            Unlock — €3.99
          </button>
          <button
            onClick={() => setShowUnlockModal(false)}
            className="w-full py-2 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
