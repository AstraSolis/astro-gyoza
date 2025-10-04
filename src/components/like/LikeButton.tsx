import { motion } from 'framer-motion'
import { useLikeClick } from '@/hooks/useLikeClick'
import { WalineAuth } from '@/utils/walineAuth'

interface LikeButtonProps {
  articlePath: string
  className?: string
  showCount?: boolean
}

/**
 * 点赞按钮组件
 */
export function LikeButton({ articlePath, className = '', showCount = true }: LikeButtonProps) {
  const { likeCount, isLiked, isLoading, isSubmitting, handleClick } = useLikeClick(articlePath)
  const isLoggedIn = WalineAuth.isLoggedIn()

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <motion.button
        type="button"
        aria-label={isLiked ? '取消点赞' : '点赞'}
        aria-pressed={isLiked}
        aria-live="polite"
        disabled={isLoading || isSubmitting}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        title={isLoggedIn ? (isLiked ? '取消点赞' : '点赞') : '请先登录后再点赞'}
        className={`
          relative size-8 flex items-center justify-center rounded-full
          transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none
          ${isLiked ? 'text-red-500' : 'text-text-secondary hover:text-accent'}
        `}
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.1 }}
      >
        <motion.i
          className={`iconfont text-xl ${isLiked ? 'icon-hearts' : 'icon-heart'}`}
          animate={
            isLiked
              ? {
                  scale: [1, 1.3, 1],
                  transition: { duration: 0.3 },
                }
              : {}
          }
        />

        {/* 点赞成功动画效果 */}
        {isLiked && (
          <motion.div
            className="absolute inset-0"
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <i className="iconfont icon-hearts text-xl text-red-500" />
          </motion.div>
        )}
      </motion.button>

      {showCount && (
        <span
          className={`text-sm font-medium transition-colors ${isLiked ? 'text-red-500' : 'text-text-secondary'}`}
        >
          {isLoading ? '...' : likeCount}
        </span>
      )}
    </div>
  )
}

/**
 * 简化版点赞按钮（用于侧边栏）
 */
export function LikeButtonAside({ articlePath }: { articlePath: string }) {
  const { likeCount, isLiked, isSubmitting, handleClick } = useLikeClick(articlePath)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        aria-label={isLiked ? '取消点赞' : '点赞'}
        aria-pressed={isLiked}
        aria-live="polite"
        className={`
          size-6 text-xl leading-none transition-colors
          focus:outline-none rounded
          ${isLiked ? 'text-red-500' : 'hover:text-accent'}
        `}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        disabled={isSubmitting}
      >
        <i className={`iconfont ${isLiked ? 'icon-hearts' : 'icon-heart'}`}></i>
      </button>
      <span
        className={`
          absolute left-full bottom-0 -ml-0.5 text-xs leading-none
          ${isLiked ? 'text-red-500' : 'text-text-secondary'}
        `}
      >
        {likeCount}
      </span>
    </div>
  )
}
