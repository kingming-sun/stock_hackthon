import { NavLink } from 'react-router-dom'
import { LineChart, FileText, MessageSquare, Eye } from 'lucide-react'

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="text-2xl font-semibold mb-2">欢迎使用 Stock Analysis</div>
        <div className="text-sm text-muted-foreground">选择一个功能开始：分析、报告、对话或预览。</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <NavLink to="/analysis" className="rounded-xl border border-border bg-card p-4 hover:bg-muted">
          <div className="flex items-center gap-2 mb-2"><LineChart className="h-5 w-5" /><div className="font-medium">分析</div></div>
          <div className="text-sm text-muted-foreground">技术指标与行情数据的可视化分析。</div>
        </NavLink>
        <NavLink to="/report" className="rounded-xl border border-border bg-card p-4 hover:bg-muted">
          <div className="flex items-center gap-2 mb-2"><FileText className="h-5 w-5" /><div className="font-medium">报告</div></div>
          <div className="text-sm text-muted-foreground">生成并查看股票分析报告。</div>
        </NavLink>
        <NavLink to="/chat" className="rounded-xl border border-border bg-card p-4 hover:bg-muted">
          <div className="flex items-center gap-2 mb-2"><MessageSquare className="h-5 w-5" /><div className="font-medium">对话</div></div>
          <div className="text-sm text-muted-foreground">与AI助手交流股票问题。</div>
        </NavLink>
        <NavLink to="/preview" className="rounded-xl border border-border bg-card p-4 hover:bg-muted">
          <div className="flex items-center gap-2 mb-2"><Eye className="h-5 w-5" /><div className="font-medium">预览</div></div>
          <div className="text-sm text-muted-foreground">加载外部页面进行预览。</div>
        </NavLink>
      </div>
    </div>
  )
}
