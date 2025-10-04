import { useState, useEffect } from 'react'
import { WalineAuth } from '@/utils/walineAuth'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * 登录状态指示器组件
 * 显示当前用户的登录状态
 */
export function LoginStatus() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userName, setUserName] = useState('')
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    // 检查登录状态
    const checkLoginStatus = () => {
      const loggedIn = WalineAuth.isLoggedIn()
      setIsLoggedIn(loggedIn)
      if (loggedIn) {
        setUserName(WalineAuth.getUserName())
      }
    }

    // 初始检查
    checkLoginStatus()

    // 监听跨标签页的 localStorage 变化
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'WALINE_USER' || e.key === null) {
        checkLoginStatus()
      }
    }

    // 监听同页面的 localStorage 变化（通过自定义事件）
    const handleWalineStorage = (e: Event) => {
      const customEvent = e as CustomEvent<{
        key: string
        newValue: string | null
        oldValue: string | null
      }>
      const { key } = customEvent.detail
      if (key === 'WALINE_USER') {
        checkLoginStatus()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('waline:storage', handleWalineStorage as EventListener)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('waline:storage', handleWalineStorage as EventListener)
    }
  }, [])

  const handleLogin = () => {
    WalineAuth.promptLogin()
  }

  if (isLoggedIn) {
    return (
      <div
        className="relative inline-flex items-center gap-2 px-3 py-1 text-sm bg-green-500/10 text-green-600 dark:text-green-400 rounded-full cursor-pointer"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <i className="iconfont icon-check text-xs"></i>
        <span className="font-medium">{userName}</span>

        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-primary border border-primary px-3 py-2 rounded-lg shadow-lg whitespace-nowrap z-50"
            >
              <div className="text-xs text-text-secondary">已登录，可以点赞文章 ✓</div>
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary border-t border-l border-primary rotate-45"></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <button
      onClick={handleLogin}
      className="relative inline-flex items-center gap-2 px-3 py-1 text-sm bg-accent/10 text-accent rounded-full hover:bg-accent/20 transition-colors"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <i className="iconfont icon-user-heart text-xs"></i>
      <span className="font-medium">未登录</span>

      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-primary border border-primary px-3 py-2 rounded-lg shadow-lg whitespace-nowrap z-50"
          >
            <div className="text-xs text-text-secondary">点击前往评论区登录后即可点赞</div>
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary border-t border-l border-primary rotate-45"></div>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  )
}
