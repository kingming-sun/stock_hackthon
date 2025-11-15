import { Outlet, NavLink } from 'react-router-dom'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'
import { Home as HomeIcon, LineChart, FileText, MessageSquare, Sun, Moon } from 'lucide-react'

export default function AppLayout() {
  const { isDark, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 text-gray-900 dark:text-gray-100">
      <div className="flex">
        <aside className="hidden md:block w-64 border-r border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
          <div className="h-16 flex items-center justify-between px-4">
            <div className="font-semibold text-lg">Stock Analysis</div>
            <button onClick={toggleTheme} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800">
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
          <nav className="px-2 space-y-1">
            <NavLink to="/" className={({ isActive }) => cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-neutral-800',
              isActive && 'bg-blue-50 text-blue-700 dark:bg-neutral-800 dark:text-blue-400'
            )}>
              <HomeIcon className="h-4 w-4" /> 首页
            </NavLink>
            <NavLink to="/analysis" className={({ isActive }) => cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-neutral-800',
              isActive && 'bg-blue-50 text-blue-700 dark:bg-neutral-800 dark:text-blue-400'
            )}>
              <LineChart className="h-4 w-4" /> 分析
            </NavLink>
            <NavLink to="/report" className={({ isActive }) => cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-neutral-800',
              isActive && 'bg-blue-50 text-blue-700 dark:bg-neutral-800 dark:text-blue-400'
            )}>
              <FileText className="h-4 w-4" /> 报告
            </NavLink>
            <NavLink to="/chat" className={({ isActive }) => cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-neutral-800',
              isActive && 'bg-blue-50 text-blue-700 dark:bg-neutral-800 dark:text-blue-400'
            )}>
              <MessageSquare className="h-4 w-4" /> 对话
            </NavLink>
          </nav>
        </aside>
        <main className="flex-1">
          <header className="md:hidden h-14 flex items-center justify-between px-4 border-b border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
            <div className="font-semibold">Stock Analysis</div>
            <button onClick={toggleTheme} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800">
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

