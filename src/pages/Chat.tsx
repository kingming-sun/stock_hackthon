import { useState } from 'react'

type Msg = { role: 'user' | 'ai'; content: string }

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')

  const send = () => {
    if (!input.trim()) return
    const userMsg: Msg = { role: 'user', content: input }
    setMessages((m) => [...m, userMsg, { role: 'ai', content: '收到，正在分析…' }])
    setInput('')
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6">
      <div className="h-[60vh] overflow-y-auto space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-sm text-gray-500">开始与AI助手对话，支持股票相关问题</div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <div className={m.role === 'user' ? 'inline-block px-3 py-2 rounded-lg bg-blue-600 text-white' : 'inline-block px-3 py-2 rounded-lg bg-gray-100 dark:bg-neutral-800'}>
              {m.content}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入问题…" className="flex-1 rounded-md border px-3 py-2 bg-transparent" />
        <button onClick={send} className="px-3 py-2 rounded-md bg-blue-600 text-white">发送</button>
      </div>
    </div>
  )
}

