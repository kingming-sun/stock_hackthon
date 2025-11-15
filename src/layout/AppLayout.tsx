import { Outlet, NavLink } from 'react-router-dom'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'
import { Home as HomeIcon, LineChart, FileText, MessageSquare, Sun, Moon, Eye } from 'lucide-react'

export default function AppLayout() {
  const { isDark, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        <aside className="hidden md:block w-64 border-r border-border bg-card">
          <div className="h-16 flex items-center justify-between px-4">
            <div className="font-semibold text-lg">Stock Analysis</div>
            <button onClick={toggleTheme} className="p-2 rounded-md hover:bg-muted">
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
          <nav className="px-2 space-y-1">
            <NavLink to="/" className={({ isActive }) => cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted',
              isActive && 'bg-accent'
            )}>
              <HomeIcon className="h-4 w-4" /> 首页
            </NavLink>
            <NavLink to="/analysis" className={({ isActive }) => cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted',
              isActive && 'bg-accent'
            )}>
              <LineChart className="h-4 w-4" /> 分析
            </NavLink>
            <NavLink to="/report" className={({ isActive }) => cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted',
              isActive && 'bg-accent'
            )}>
              <FileText className="h-4 w-4" /> 报告
            </NavLink>
            <NavLink to="/chat" className={({ isActive }) => cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted',
              isActive && 'bg-accent'
            )}>
              <MessageSquare className="h-4 w-4" /> 对话
            </NavLink>
            <NavLink to="/preview" className={({ isActive }) => cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted',
              isActive && 'bg-accent'
            )}>
              <Eye className="h-4 w-4" /> 预览
            </NavLink>
          </nav>
        </aside>
        <main className="flex-1">
          <header className="md:hidden h-14 flex items-center justify-between px-4 border-b border-border bg-card">
            <div className="font-semibold">Stock Analysis</div>
            <button onClick={toggleTheme} className="p-2 rounded-md hover:bg-muted">
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </header>
          <div className="p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
