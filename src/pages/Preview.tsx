import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

export default function Preview() {
  const [params, setParams] = useSearchParams()
  const defaultSrc = 'https://6ad6a239-53f2-4e5e-8c15-7e470819f6d6-figmaiframepreview.figma.site/preview_page_v2.html'
  const currentSrc = params.get('src') || defaultSrc
  const [srcInput, setSrcInput] = useState(currentSrc)

  const valid = useMemo(() => {
    try {
      const u = new URL(srcInput)
      return u.protocol === 'http:' || u.protocol === 'https:'
    } catch {
      return false
    }
  }, [srcInput])

  useEffect(() => {
    setSrcInput(currentSrc)
  }, [currentSrc])

  const apply = () => {
    if (!valid) return
    const next = new URLSearchParams({ src: srcInput })
    setParams(next)
  }

  const reload = () => {
    setParams(new URLSearchParams({ src: currentSrc, ts: String(Date.now()) }))
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 flex gap-2 items-center">
        <input
          value={srcInput}
          onChange={(e) => setSrcInput(e.target.value)}
          placeholder="输入预览URL"
          className="flex-1 rounded-md border px-3 py-2 bg-transparent"
        />
        <button onClick={apply} disabled={!valid} className="px-3 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50">加载</button>
        <button onClick={reload} className="px-3 py-2 rounded-md border">刷新</button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <iframe
          title="Preview"
          src={currentSrc}
          allow="autoplay; clipboard-read; clipboard-write"
          loading="lazy"
          referrerPolicy="no-referrer"
          allowFullScreen
          className="w-full h-[75vh]"
        />
      </div>
    </div>
  )
}

