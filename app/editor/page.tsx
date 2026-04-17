'use client'
import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useEditorStore } from '@/lib/store/editor'
import { checkUnlocked, setUnlocked } from '@/lib/stripe'
import UploadZone from '@/components/editor/UploadZone'
import PhotoEditor from '@/components/editor/PhotoEditor'
import VideoEditor from '@/components/editor/VideoEditor'
import ShaderControls from '@/components/editor/ShaderControls'
import ExportButton from '@/components/editor/ExportButton'
import UnlockModal from '@/components/ui/UnlockModal'

function EditorInner() {
  const {
    file,
    fileUrl,
    fileType,
    setUnlocked: storeSetUnlocked,
    showUnlockModal,
    setFile,
  } = useEditorStore()

  const searchParams = useSearchParams()

  useEffect(() => {
    if (checkUnlocked()) storeSetUnlocked(true)
    if (searchParams.get('unlocked') === 'true') {
      setUnlocked()
      storeSetUnlocked(true)
    }
  }, [searchParams, storeSetUnlocked])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) setFile(f)
    e.target.value = ''
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-800 text-sm">
        <span className="font-bold tracking-widest text-white">FOTO — Delta</span>
        <label className="cursor-pointer px-3 py-1 border border-zinc-700 rounded text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors text-xs">
          Open file
          <input
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileInput}
          />
        </label>
        {file && (
          <span className="text-zinc-500 text-xs truncate max-w-xs">{file.name}</span>
        )}
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => useEditorStore.getState().clearFile()}
            className="px-3 py-1 border border-zinc-700 rounded text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors text-xs"
          >
            Clear
          </button>
          <ExportButton />
        </div>
      </div>

      {!fileUrl ? (
        <div className="flex-1 flex items-center justify-center">
          <UploadZone />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex items-center justify-center bg-zinc-950 overflow-hidden p-4">
            {fileType === 'photo' && <PhotoEditor fileUrl={fileUrl} />}
            {fileType === 'video' && <VideoEditor fileUrl={fileUrl} />}
          </div>
          <div className="w-72 bg-zinc-900 border-l border-zinc-800 overflow-y-auto flex-shrink-0">
            <ShaderControls />
          </div>
        </div>
      )}

      {showUnlockModal && <UnlockModal />}
    </main>
  )
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <EditorInner />
    </Suspense>
  )
}
