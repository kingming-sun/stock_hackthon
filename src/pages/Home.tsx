import { useState } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

const popular = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 175.43, changePercent: 1.24 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 541.22, changePercent: -0.85 },
  { symbol: 'TSLA', name: 'Tesla, Inc.', price: 224.18, changePercent: 2.41 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', price: 378.12, changePercent: 0.57 }
]

export default function Home() {
  const [q, setQ] = useState('')

  return (
    <div className="space-y-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 border border-blue-200 dark:border-blue-900 rounded-xl bg-white dark:bg-neutral-950 px-4 py-3 shadow-sm">
          <Search className="h-5 w-5 text-blue-600" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索股票代码或名称"
            className="w-full bg-transparent outline-none text-sm"
          />
          <a href={`/analysis?symbol=${encodeURIComponent(q)}`} className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700">分析</a>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {popular.map((s) => (
          <a key={s.symbol} href={`/analysis?symbol=${s.symbol}`} className="block rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 hover:shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{s.symbol}</div>
                <div className="text-xs text-gray-500">{s.name}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">{s.price}</div>
                <div className={cn('text-xs', s.changePercent >= 0 ? 'text-green-600' : 'text-red-600')}>{s.changePercent}%</div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
