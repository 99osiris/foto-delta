/** Returns error message string or null if valid. */
export async function validateMediaFile(f: File): Promise<string | null> {
  if (f.size > 20 * 1024 * 1024) {
    return 'File too large — max 20MB'
  }

  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'video/webm',
  ]

  const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
  const extOk =
    ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'mov', 'webm'].includes(ext)

  if (f.type && !allowedTypes.includes(f.type)) {
    return `Format not supported: ${f.type}`
  }
  if (!f.type && !extOk) {
    return 'Format not supported'
  }

  const looksVideo =
    f.type.startsWith('video/') || (!f.type && ['mp4', 'mov', 'webm'].includes(ext))
  const looksImage =
    f.type.startsWith('image/') || (!f.type && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext))

  if (looksVideo) {
    const url = URL.createObjectURL(f)
    const video = document.createElement('video')
    video.preload = 'metadata'
    try {
      await new Promise<void>((res, rej) => {
        video.onloadedmetadata = () => res()
        video.onerror = () => rej(new Error('Video unreadable'))
        video.src = url
      })
    } catch {
      URL.revokeObjectURL(url)
      return 'Could not read video file'
    }
    URL.revokeObjectURL(url)
    if (video.duration > 15) {
      return 'Videos must be 15 seconds or less'
    }
  }

  if (looksImage) {
    const url = URL.createObjectURL(f)
    try {
      await new Promise<void>((res, rej) => {
        const img = new Image()
        img.onload = () => {
          if (img.naturalWidth > 8192 || img.naturalHeight > 8192) {
            rej(new Error(`Image too large: ${img.naturalWidth}×${img.naturalHeight} — max 8192px`))
          } else {
            res()
          }
          URL.revokeObjectURL(url)
        }
        img.onerror = () => {
          URL.revokeObjectURL(url)
          rej(new Error('Image could not be decoded'))
        }
        img.src = url
      })
    } catch (e) {
      return e instanceof Error ? e.message : 'Image validation failed'
    }
  }

  return null
}
