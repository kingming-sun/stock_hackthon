import { useMemo, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

export default function Analysis() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const symbol = params.get('symbol') || ''
  const [form, setForm] = useState({
    symbol: symbol,
    quantity: '',
    cost: '',
    holdingDays: '',
    type: 'comprehensive'
  })

  const canSubmit = useMemo(() => form.symbol.trim().length > 0, [form])

  const submit = () => {
    const q = new URLSearchParams({
      symbol: form.symbol,
      type: form.type,
      quantity: form.quantity,
      cost: form.cost,
      holdingDays: form.holdingDays
    }).toString()
    navigate(`/report?${q}`)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6">
        <div className="text-lg font-semibold mb-4">股票信息</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">股票代码</label>
            <input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} className="w-full rounded-md border px-3 py-2 bg-transparent" placeholder="AAPL" />
          </div>
          <div>
            <label className="block text-sm mb-1">持仓数量</label>
            <input value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="w-full rounded-md border px-3 py-2 bg-transparent" placeholder="100" />
          </div>
          <div>
            <label className="block text-sm mb-1">成本价</label>
            <input value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="w-full rounded-md border px-3 py-2 bg-transparent" placeholder="150.00" />
          </div>
          <div>
            <label className="block text-sm mb-1">持仓时间（天）</label>
            <input value={form.holdingDays} onChange={(e) => setForm({ ...form, holdingDays: e.target.value })} className="w-full rounded-md border px-3 py-2 bg-transparent" placeholder="30" />
          </div>
          <div>
            <label className="block text-sm mb-1">分析类型</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-md border px-3 py-2 bg-transparent">
              <option value="technical">技术分析</option>
              <option value="fundamental">基本面分析</option>
              <option value="comprehensive">综合分析</option>
            </select>
          </div>
        </div>
        <div className="mt-6">
          <button disabled={!canSubmit} onClick={submit} className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50">生成报告</button>
        </div>
      </div>
    </div>
  )
}

