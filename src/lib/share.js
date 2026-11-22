// Share a year-in-review story. Phones (Web Share with files): the story
// image goes into the share sheet with the link in the text. Otherwise the
// link is shared; on desktop the image is downloaded and the link copied.

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const isAbort = err => err?.name === 'AbortError'

export async function shareStory({ url, text, fileName, render, nav = navigator, download = downloadBlob }) {
  const blob = await render()
  const file = new File([blob], fileName, { type: 'image/png' })
  try {
    if (nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: text, text: `${text}\n${url}` })
      return 'shared'
    }
    if (nav.share) {
      await nav.share({ title: text, text, url })
      return 'shared'
    }
  } catch (err) {
    if (isAbort(err)) return 'cancelled'
    // NotAllowedError etc.: fall through to download + clipboard.
  }
  download(blob, fileName)
  await nav.clipboard?.writeText(url)
  return 'downloaded'
}
