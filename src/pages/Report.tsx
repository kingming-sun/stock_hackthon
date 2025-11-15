import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6">
      <div className="text-lg font-semibold mb-4">{title}</div>
      {children}
    </div>
  )
}

export default function Report() {
  const [p] = useSearchParams()
  const symbol = p.get('symbol') || '—'
  const type = p.get('type') || 'comprehensive'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<{
    summary: string
    recommendation: string
    confidence_score: number
    key_metrics: Record<string, any>
  } | null>(null)

  useEffect(() => {
    if (!symbol || symbol === '—') return
    setLoading(true)
    setError(null)
    fetch(`http://localhost:8000/api/analysis/${encodeURIComponent(symbol)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis_type: type })
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`请求失败: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setAnalysis({
          summary: data.summary,
          recommendation: data.recommendation,
          confidence_score: data.confidence_score,
          key_metrics: data.key_metrics || {}
        })
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [symbol, type])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-2xl font-semibold">{symbol} 分析报告</div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 rounded-md border">分享</button>
          <button className="px-3 py-1.5 rounded-md border">下载</button>
          <button className="px-3 py-1.5 rounded-md border">收藏</button>
        </div>
      </div>

      <Section title="技术分析">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-64 rounded-lg bg-gray-100 dark:bg-neutral-800 flex items-center justify-center">
            {loading ? '加载中…' : error ? `错误：${error}` : 'K线图'}
          </div>
          <div className="space-y-2 text-sm">
            {analysis ? (
              <>
                <div>{analysis.summary}</div>
                <div>建议：{analysis.recommendation}</div>
                <div>信心：{Math.round(analysis.confidence_score * 100)}%</div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(analysis.key_metrics).map(([k, v]) => (
                    <div key={k} className="flex justify-between"><span>{k}</span><span>{String(v)}</span></div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div>均线：SMA20 172.45, SMA50 168.92</div>
                <div>MACD：2.15, 信号 1.87, 柱体 0.28</div>
                <div>RSI：65.3</div>
              </>
            )}
          </div>
        </div>
      </Section>

      <Section title="消息面分析">
        <div className="space-y-2 text-sm">
          <div>近期新闻偏正面，产品需求强劲，供应链稳定</div>
          <div>机构研报维持买入评级，目标价上调</div>
        </div>
      </Section>

      <Section title="投资建议">
        <div className="space-y-2 text-sm">
          <div className="font-medium">建议：持有</div>
          <div>风险等级：中等</div>
          <div>关键因素：RSI接近超买区间；成交量放大；突破关键阻力位</div>
        </div>
      </Section>
    </div>
  )
}
