import { useState } from 'react'

type Msg = { role: 'user' | 'ai'; content: string }

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [symbol, setSymbol] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = async () => {
    if (!input.trim()) return
    if (!symbol.trim()) {
      setError('请先输入股票代码')
      return
    }
    setError(null)
    const userMsg: Msg = { role: 'user', content: input }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setLoading(true)
    try {
      const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
      const res = await fetch(`${base}/api/analysis/${encodeURIComponent(symbol)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis_type: 'comprehensive' })
      })
      if (!res.ok) throw new Error(`请求失败: ${res.status}`)
      const data = await res.json()
      const aiContent = `建议：${data.recommendation}\n置信度：${Math.round(data.confidence_score * 100)}%\n摘要：${data.summary}`
      setMessages((m) => [...m, { role: 'ai', content: aiContent }])
    } catch (e) {
      setMessages((m) => [...m, { role: 'ai', content: e instanceof Error ? e.message : '请求失败' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="h-[60vh] overflow-y-auto space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground">开始与AI助手对话，支持股票相关问题</div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <div className={m.role === 'user' ? 'inline-block px-3 py-2 rounded-lg bg-primary text-primary-foreground' : 'inline-block px-3 py-2 rounded-lg bg-muted'}>
              {m.content}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="股票代码（如 AAPL）" className="w-32 rounded-md border border-border px-3 py-2 bg-transparent" />
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入问题…" className="flex-1 rounded-md border border-border px-3 py-2 bg-transparent" />
        <button onClick={send} disabled={loading} className="px-3 py-2 rounded-md bg-primary text-primary-foreground">{loading ? '分析中…' : '发送'}</button>
      </div>
      {error && <div className="mt-2 text-xs text-destructive">{error}</div>}
    </div>
  )
}
