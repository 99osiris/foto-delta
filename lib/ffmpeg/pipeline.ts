'use client'

import {
  VHSRenderer,
  type VHSParams,
  type DigiParams,
  type FilterMode,
} from '../webgl/renderer'

function seekVideo(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onErr)
      resolve()
    }
    const onErr = () => {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onErr)
      reject(new Error('Video seek failed'))
    }
    video.addEventListener('seeked', onSeeked, { once: true })
    video.addEventListener('error', onErr, { once: true })
    video.currentTime = t
  })
}

export async function processVideoWithVHS(
  inputFile: File,
  params: VHSParams | DigiParams,
  mode: FilterMode,
  onProgress: (pct: number) => void,
): Promise<Blob> {
  const url = URL.createObjectURL(inputFile)
  const video = document.createElement('video')
  video.src = url
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve()
    video.onerror = () => reject(new Error('Failed to load video'))
  })

  const canvas = document.createElement('canvas')
  canvas.width = 1280
  canvas.height = 720
  const renderer = new VHSRenderer(canvas)
  renderer.setMode(mode)

  const fps = 30
  const duration = Math.max(0.001, video.duration)
  const dt = 1 / fps
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm'

  const chunks: BlobPart[] = []
  const stream = canvas.captureStream(fps)
  const recorder = new MediaRecorder(stream, { mimeType: mime })
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  await new Promise<void>((resolve, reject) => {
    recorder.onerror = () => reject(new Error('MediaRecorder error'))
    recorder.onstop = () => resolve()
    recorder.start(250)

    let t = 0
    const step = async () => {
      try {
        if (t >= duration) {
          recorder.stop()
          return
        }
        await seekVideo(video, Math.min(t, duration - 1e-4))
        renderer.loadSource(video)
        renderer.render(params, t)
        onProgress(Math.min(100, Math.round((t / duration) * 100)))
        t += dt
        requestAnimationFrame(() => void step())
      } catch (e) {
        try {
          recorder.stop()
        } catch {
          /* ignore */
        }
        reject(e)
      }
    }
    void step()
  })

  URL.revokeObjectURL(url)
  return new Blob(chunks, { type: mime.split(';')[0] })
}
