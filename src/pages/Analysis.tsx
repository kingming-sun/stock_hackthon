import { useMemo, useState } from 'react'
import { Search, LineChart, Layers, Newspaper, Sparkles, Info, CircleHelp } from 'lucide-react'

type Stock = { symbol: string; name: string; nameCN?: string }
type Position = { shares: number; cost: number; cash: number; assets: number }
type Candle = { time: string; open: number; high: number; low: number; close: number; volume: number; ma5: number; ma20: number }
type Analysis = {
  price: number
  changePercent: number
  kline: Candle[]
  rsi: number
  macdSignal: '买入' | '卖出' | '观望'
  boll: { upper: number; middle: number; lower: number }
  kdj: { k: number; d: number; j: number }
  volume: { avg: number; today: number }
  levels: { resistance: number; current: number; support: number }
  summary: string
  recommendation: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  sentimentLabel: 'positive' | 'neutral' | 'negative' | 'unknown'
  newsItems: { title?: string; url?: string; time?: string }[]
  score: number
}

const presets: Stock[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', nameCN: '苹果' },
  { symbol: 'TSLA', name: 'Tesla, Inc.', nameCN: '特斯拉' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', nameCN: '英伟达' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', nameCN: '微软' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', nameCN: '谷歌' },
  { symbol: 'META', name: 'Meta Platforms, Inc.', nameCN: 'Meta' },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.', nameCN: '亚马逊' },
  { symbol: 'BABA', name: 'Alibaba Group Holding', nameCN: '阿里巴巴' }
]

async function fetchRealAnalysis(stock: Stock, position?: Position): Promise<Analysis> {
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
  const [quoteRes, historyRes, aiRes] = await Promise.all([
    fetch(`${base}/api/stocks/${stock.symbol}/quote`),
    fetch(`${base}/api/stocks/${stock.symbol}/history`),
    fetch(`${base}/api/analysis/${stock.symbol}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis_type: 'comprehensive', portfolio: position ? { positions: { [stock.symbol]: { shares: position.shares, avg_cost: position.cost } }, total_value: position.assets } : {} })
    })
  ])
  if (!quoteRes.ok || !historyRes.ok || !aiRes.ok) throw new Error('后端请求失败')
  const quote = await quoteRes.json()
  const history = await historyRes.json()
  const ai = await aiRes.json()
  const candles: Candle[] = history.slice().reverse().map((d: any) => ({
    time: d.date,
    open: d.open,
    high: d.high,
    low: d.low,
    close: d.close,
    volume: d.volume,
    ma5: 0,
    ma20: 0
  }))
  for (let i = 0; i < candles.length; i++) {
    const ma5 = candles.slice(Math.max(0, i - 4), i + 1).reduce((s, c) => s + c.close, 0) / Math.min(i + 1, 5)
    const ma20 = candles.slice(Math.max(0, i - 19), i + 1).reduce((s, c) => s + c.close, 0) / Math.min(i + 1, 20)
    candles[i].ma5 = Number(ma5.toFixed(2))
    candles[i].ma20 = Number(ma20.toFixed(2))
  }
  const closes = candles.map(c => c.close)
  const avg = closes.reduce((s, v) => s + v, 0) / closes.length
  const std = Math.sqrt(closes.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / closes.length)
  const boll = { upper: Number((avg + 2 * std).toFixed(2)), middle: Number(avg.toFixed(2)), lower: Number((avg - 2 * std).toFixed(2)) }
  const price = Number(quote.price.toFixed(2))
  const changePercent = Number(quote.change_percent.toFixed(2))
  const volumeAvg = Math.round(candles.reduce((s, c) => s + c.volume, 0) / candles.length)
  const volumeToday = Math.round(candles[candles.length - 1]?.volume || 0)
  const rsiPeriod = 14
  let gains = 0, losses = 0
  for (let i = 1; i <= rsiPeriod && i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff >= 0) gains += diff; else losses -= diff
  }
  const rs = gains / Math.max(1, losses)
  const rsi = Math.round(100 - 100 / (1 + rs))
  const k = Math.min(100, Math.max(0, (price - boll.lower) / Math.max(1, boll.upper - boll.lower) * 100))
  const d = Number((k * 0.7 + 30).toFixed(2))
  const j = Number((3 * k - 2 * d).toFixed(2))
  const levels = { resistance: boll.upper, current: price, support: boll.lower }
  const recommendation = ai.recommendation as 'BUY' | 'SELL' | 'HOLD'
  const macdSignal: '买入' | '卖出' | '观望' = recommendation === 'BUY' ? '买入' : recommendation === 'SELL' ? '卖出' : '观望'
  const confidence = Number((ai.confidence_score || 0).toFixed(2))
  const sentimentLabel = (ai.key_metrics?.sentiment || 'unknown') as Analysis['sentimentLabel']
  const newsItems = (ai.detailed_analysis?.news_data?.news_items || []).map((n: any) => ({ title: n?.title, url: n?.url, time: n?.time_published }))
  const score = Math.round(50 + (rsi - 50) / 2)
  return { price, changePercent, kline: candles, rsi, macdSignal, boll, kdj: { k: Number(k.toFixed(2)), d, j }, volume: { avg: volumeAvg, today: volumeToday }, levels, summary: ai.summary || '', recommendation, confidence, sentimentLabel, newsItems, score }
}

function Progress({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2 w-full bg-muted rounded">
      <div style={{ width: `${Math.max(0, Math.min(100, value))}%` }} className={`h-2 rounded ${color}`} />
    </div>
  )
}

function KLineChart({ data }: { data: Candle[] }) {
  const W = Math.max(600, data.length * 24)
  const H = 320
  const P = 24
  const minV = Math.min(...data.map(d => d.close))
  const maxV = Math.max(...data.map(d => d.close))
  const scaleY = (v: number) => {
    const t = (v - minV) / ((maxV - minV) || 1)
    return P + (1 - t) * (H - 2 * P)
  }
  const scaleX = (i: number) => P + i * ((W - 2 * P) / Math.max(1, data.length - 1))
  const toPath = (key: 'close' | 'ma5' | 'ma20') => data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY((d as any)[key])}`).join(' ')
  const areaPath = () => {
    const top = toPath('close')
    const lastX = scaleX(data.length - 1)
    const firstX = scaleX(0)
    const bottom = `L ${lastX} ${H - P} L ${firstX} ${H - P} Z`
    return `${top} ${bottom}`
  }
  const firstPrice = data[0]?.close || 0
  const lastPrice = data[data.length - 1]?.close || 0
  const changePercent = ((lastPrice - firstPrice) / (firstPrice || 1)) * 100
  const isPositive = changePercent >= 0
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold">价格走势</div>
        <div className={isPositive ? 'text-green-600' : 'text-red-600'}>{isPositive ? '+' : ''}{changePercent.toFixed(2)}%</div>
      </div>
      <div className="w-full overflow-hidden rounded-lg border border-border bg-background">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[320px]">
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <rect x={P} y={P} width={W - 2 * P} height={H - 2 * P} fill="transparent" stroke="#e2e8f0" />
          <path d={areaPath()} fill="url(#colorPrice)" />
          <path d={toPath('close')} stroke="#3b82f6" strokeWidth={2} fill="none" />
          <path d={toPath('ma5')} stroke="#8b5cf6" strokeWidth={1.5} fill="none" />
          <path d={toPath('ma20')} stroke="#f59e0b" strokeWidth={1.5} fill="none" />
        </svg>
      </div>
      <div className="grid grid-cols-4 gap-3 mt-6">
        <div className="p-3 bg-muted rounded-lg"><div className="text-xs text-muted-foreground mb-1">开盘</div><div>{data[data.length - 1]?.open.toFixed(2)}</div></div>
        <div className="p-3 bg-muted rounded-lg"><div className="text-xs text-muted-foreground mb-1">最高</div><div className="text-red-600">{Math.max(...data.map(d => d.high)).toFixed(2)}</div></div>
        <div className="p-3 bg-muted rounded-lg"><div className="text-xs text-muted-foreground mb-1">最低</div><div className="text-green-600">{Math.min(...data.map(d => d.low)).toFixed(2)}</div></div>
        <div className="p-3 bg-muted rounded-lg"><div className="text-xs text-muted-foreground mb-1">收盘</div><div>{data[data.length - 1]?.close.toFixed(2)}</div></div>
      </div>
      <div className="flex items-center gap-4 mt-4 text-sm">
        <div className="flex items-center gap-2"><div className="w-3 h-0.5 bg-blue-600" /><span className="text-muted-foreground">价格</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-0.5 bg-purple-600" /><span className="text-muted-foreground">MA5</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-0.5 bg-amber-600" /><span className="text-muted-foreground">MA20</span></div>
      </div>
    </div>
  )
}

function TechnicalAnalysis({ a }: { a: Analysis }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="font-semibold mb-2">趋势与信号</div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="p-3 bg-muted rounded-lg"><div className="text-xs text-muted-foreground mb-1">趋势</div><div>{a.changePercent >= 0 ? '上升' : '下降'}</div></div>
          <div className="p-3 bg-muted rounded-lg"><div className="text-xs text-muted-foreground mb-1">MACD</div><div>{a.macdSignal}</div></div>
          <div className="p-3 bg-muted rounded-lg"><div className="text-xs text-muted-foreground mb-1">关键价位</div><div>阻力 {a.levels.resistance} / 当前 {a.levels.current} / 支撑 {a.levels.support}</div></div>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="font-semibold mb-2">技术指标</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm mb-2">RSI {a.rsi}</div>
            <Progress value={a.rsi} color={a.rsi > 60 ? 'bg-green-600' : a.rsi < 40 ? 'bg-red-600' : 'bg-blue-600'} />
          </div>
          <div className="space-y-1 text-sm">
            <div>布林带 上轨 {a.boll.upper}</div>
            <div>中轨 {a.boll.middle}</div>
            <div>下轨 {a.boll.lower}</div>
          </div>
          <div className="space-y-1 text-sm">
            <div>K {a.kdj.k}</div>
            <div>D {a.kdj.d}</div>
            <div>J {a.kdj.j}</div>
          </div>
          <div className="space-y-1 text-sm">
            <div>成交量均值 {a.volume.avg.toLocaleString()}</div>
            <div>今日成交量 {a.volume.today.toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FundamentalAnalysis({ a }: { a: Analysis }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="font-semibold mb-2">市场情绪</div>
        <div className="text-sm">整体情绪：{a.sentimentLabel}</div>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="font-semibold mb-2">最新消息</div>
        <div className="space-y-2">
          {a.newsItems.length === 0 && <div className="text-sm text-muted-foreground">暂无新闻数据</div>}
          {a.newsItems.map((n, i) => (
            <a key={i} href={n.url || '#'} className="block p-3 rounded-lg bg-muted hover:opacity-90">
              <div className="text-sm font-medium">{n.title || '新闻'}</div>
              <div className="text-xs text-muted-foreground">{n.time || ''}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

function ChatInterface({ messages, send, presetQs }: { messages: { role: 'user' | 'ai'; content: string }[]; send: (q: string) => void; presetQs: string[] }) {
  const [input, setInput] = useState('')
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="h-[260px] overflow-y-auto space-y-3">
        {messages.length === 0 && <div className="text-center text-sm text-muted-foreground">开始对话，询问交易建议与风险</div>}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <div className={m.role === 'user' ? 'inline-block px-3 py-2 rounded-lg bg-primary text-primary-foreground' : 'inline-block px-3 py-2 rounded-lg bg-muted'}>{m.content}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入问题…" className="flex-1 rounded-md border border-border px-3 py-2 bg-transparent" />
        <button onClick={() => { if (input.trim()) { send(input); setInput('') } }} className="px-3 py-2 rounded-md bg-primary text-primary-foreground">发送</button>
      </div>
      <div className="mt-3 flex gap-2">
        {presetQs.map((q, i) => (
          <button key={i} onClick={() => send(q)} className="px-3 py-1.5 rounded-md border text-xs">{q}</button>
        ))}
      </div>
    </div>
  )
}

export default function Analysis() {
  const [selected, setSelected] = useState<Stock | null>(null)
  const [position, setPosition] = useState<Position>({ shares: 0, cost: 0, cash: 0, assets: 0 })
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([])
  const [tab, setTab] = useState<'kline' | 'tech' | 'fund'>('kline')
  const valueCalc = useMemo(() => {
    const price = analysis?.price || 0
    const mv = position.shares * price
    const cash = position.cash
    const assets = Math.max(position.assets, mv + cash)
    const ratio = assets ? Math.round(mv / assets * 100) : 0
    return { mv: Number(mv.toFixed(2)), cash: Number(cash.toFixed(2)), assets: Number(assets.toFixed(2)), ratio }
  }, [position, analysis])

  const analyze = async () => {
    if (!selected) return
    setIsAnalyzing(true)
    try {
      const a = await fetchRealAnalysis(selected, position)
      setAnalysis(a)
    } catch (e) {
      setAnalysis(null)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const send = (q: string) => {
    setMessages((m) => [...m, { role: 'user', content: q }])
    const reply = analysis ? `结论：${analysis.recommendation}；置信度：${Math.round(analysis.confidence * 100)}%；摘要：${analysis.summary}` : '请先完成分析'
    setMessages((m) => [...m, { role: 'ai', content: reply }])
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="text-sm text-muted-foreground">基于技术面和消息面的智能分析，为您提供专业投资建议</div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="font-semibold">选择股票</div>
            <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2 bg-muted">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input placeholder="搜索股票代码或名称..." className="w-full bg-transparent outline-none text-sm" onChange={(e) => {
                const v = e.target.value.trim().toUpperCase()
                const hit = presets.find(p => p.symbol === v)
                if (hit) setSelected(hit)
              }} />
            </div>
            <div className="text-xs text-muted-foreground">热门股票</div>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((p) => (
                <button key={p.symbol} onClick={() => setSelected(p)} className={`flex items-center justify-between px-3 py-2 rounded-md border text-sm ${selected?.symbol === p.symbol ? 'bg-muted' : ''}`}>
                  <span className="font-medium">{p.symbol}</span>
                  <span className="text-xs text-muted-foreground">{p.nameCN}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="font-semibold">持仓情况（可选）</div>
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">持仓数量（股）</div>
                <input type="number" placeholder="例如：100" className="w-full rounded-md border border-border px-3 py-2 bg-muted" value={position.shares || ''} onChange={(e) => setPosition({ ...position, shares: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">成本价（美元）</div>
                <input type="number" placeholder="例如：150.50" className="w-full rounded-md border border-border px-3 py-2 bg-muted" value={position.cost || ''} onChange={(e) => setPosition({ ...position, cost: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">账户可用资金（美元）</div>
                <input type="number" placeholder="例如：50000" className="w-full rounded-md border border-border px-3 py-2 bg-muted" value={position.cash || ''} onChange={(e) => setPosition({ ...position, cash: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">账户总资产（美元）</div>
                <input type="number" placeholder="例如：100000" className="w-full rounded-md border border-border px-3 py-2 bg-muted" value={position.assets || ''} onChange={(e) => setPosition({ ...position, assets: Number(e.target.value) })} />
              </div>
            </div>
            <button onClick={analyze} disabled={!selected || isAnalyzing} className="w-full mt-2 px-4 py-2 rounded-md bg-muted text-foreground disabled:opacity-50">{isAnalyzing ? '分析中…' : '开始分析'}</button>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-muted rounded-lg"><div className="text-xs text-muted-foreground mb-1">持仓市值</div><div>{valueCalc.mv}</div></div>
              <div className="p-3 bg-muted rounded-lg"><div className="text-xs text-muted-foreground mb-1">可用资金</div><div>{valueCalc.cash}</div></div>
              <div className="p-3 bg-muted rounded-lg"><div className="text-xs text-muted-foreground mb-1">总资产</div><div>{valueCalc.assets}</div></div>
              <div className="p-3 bg-muted rounded-lg"><div className="text-xs text-muted-foreground mb-1">仓位占比</div><div className="flex items-center gap-2"><span>{valueCalc.ratio}%</span><div className="flex-1"><Progress value={valueCalc.ratio} color={'bg-blue-600'} /></div></div></div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-2 space-y-4">
          {!analysis && (
            <div className="rounded-xl border border-border bg-muted p-6 h-[380px] flex items-center justify-center text-sm text-muted-foreground">
              <div className="text-center space-y-2">
                <CircleHelp className="mx-auto h-6 w-6" />
                <div>选择一只股票并点击“开始分析”，AI将为您提供专业的投资建议</div>
              </div>
            </div>
          )}
          {analysis && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm">股票（{selected?.symbol}）</div>
                    <div className="text-xs text-muted-foreground">{new Date().toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-semibold">{analysis.price.toFixed(2)}</div>
                    <div className={analysis.changePercent >= 0 ? 'text-green-600 text-sm' : 'text-red-600 text-sm'}>{analysis.changePercent >= 0 ? '+' : ''}{analysis.changePercent.toFixed(2)}%</div>
                  </div>
                </div>
                <div className="flex gap-2 text-sm mt-3">
                  <button className={`flex items-center gap-1 px-3 py-1.5 rounded-md border ${tab === 'kline' ? 'bg-muted' : ''}`} onClick={() => setTab('kline')}><LineChart className="h-4 w-4" /> K线图</button>
                  <button className={`flex items-center gap-1 px-3 py-1.5 rounded-md border ${tab === 'tech' ? 'bg-muted' : ''}`} onClick={() => setTab('tech')}><Layers className="h-4 w-4" /> 技术面</button>
                  <button className={`flex items-center gap-1 px-3 py-1.5 rounded-md border ${tab === 'fund' ? 'bg-muted' : ''}`} onClick={() => setTab('fund')}><Newspaper className="h-4 w-4" /> 消息面</button>
                </div>
              </div>
              {tab === 'kline' && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <KLineChart data={analysis.kline} />
                </div>
              )}
              {tab === 'tech' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="font-semibold mb-2">趋势分析</div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="p-3 bg-muted rounded-lg"><div className="text-xs text-muted-foreground mb-1">趋势状态</div><div>{analysis.changePercent >= 0 ? '上升' : '下降'}</div></div>
                      <div className="p-3 bg-muted rounded-lg"><div className="text-xs text-muted-foreground mb-1">MACD信号</div><div>{analysis.macdSignal}</div></div>
                      <div className="p-3 bg-muted rounded-lg"><div className="text-xs text-muted-foreground mb-1">关键价位</div><div>阻力 {analysis.levels.resistance} / 当前 {analysis.levels.current} / 支撑 {analysis.levels.support}</div></div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="font-semibold mb-2">技术指标</div>
                    <TechnicalAnalysis a={analysis} />
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="font-semibold mb-2">成交量分析</div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="p-3 bg-muted rounded-lg"><div className="text-xs text-muted-foreground mb-1">均量</div><div>{analysis.volume.avg.toLocaleString()}</div></div>
                      <div className="p-3 bg-muted rounded-lg"><div className="text-xs text-muted-foreground mb-1">今日量</div><div>{analysis.volume.today.toLocaleString()}</div></div>
                    </div>
                    <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 text-amber-700 p-3 text-xs">
                      <Info className="h-4 w-4" />
                      <div>成交量放大2-7倍，若同时伴随价格突破关键位，可能出现趋势加速</div>
                    </div>
                  </div>
                </div>
              )}
              {tab === 'fund' && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <FundamentalAnalysis a={analysis} />
                </div>
              )}
              <div className="rounded-xl border border-border bg-blue-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-700"><Sparkles className="h-5 w-5" /><div className="font-semibold">AI 投资建议</div></div>
                  <div className="px-3 py-1.5 rounded-full bg-white text-blue-700 text-sm border">置信度 {Math.round(analysis.confidence * 100)}%</div>
                </div>
                <div className="mt-3 text-sm text-blue-700 space-y-2">
                  <div>结论：{analysis.recommendation}</div>
                  <div>摘要：{analysis.summary || '综合分析显示中性信号'}</div>
                  <div>关键位：阻力 {analysis.levels.resistance} / 支撑 {analysis.levels.support}</div>
                  <div>{position.shares > 0 ? `持仓估算盈亏：${((analysis.price - position.cost) * position.shares).toFixed(2)}` : '建议：无持仓可分批建仓，控制仓位'}</div>
                  <div className="mt-2 text-xs bg-white border rounded-md p-3 text-amber-600">风险提示：市场瞬时波动较大，请合理控制仓位与止损，避免重仓追高</div>
                </div>
              </div>
              <ChatInterface messages={messages} send={send} presetQs={["是否适合加仓？", "短线风险有哪些？", "目标价多久可达？"]} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
