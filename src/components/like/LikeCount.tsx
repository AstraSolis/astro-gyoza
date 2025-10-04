import { useEffect, useState } from 'react'
import { likeService } from '@/utils/likeService'

interface LikeCountProps {
  articlePath: string
  className?: string
  showIcon?: boolean
}

/**
 * 点赞数显示组件
 * 只显示点赞数,不包含交互功能
 */
export function LikeCount({ articlePath, className = '', showIcon = true }: LikeCountProps) {
  const [likeCount, setLikeCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchCount = async () => {
      setIsLoading(true)
      try {
        const stats = await likeService.getArticleStats(articlePath)
        if (stats) {
          setLikeCount(stats.reaction0 || 0)
        }
      } catch (error) {
        console.error('获取点赞数失败:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCount()
  }, [articlePath])

  if (isLoading) {
    return (
      <span className={`inline-flex items-center gap-1 text-sm text-text-secondary ${className}`}>
        {showIcon && <i className="iconfont icon-heart"></i>}
        <span className="inline-block w-4 h-3 bg-text-secondary/20 rounded animate-pulse"></span>
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1 text-sm text-text-secondary ${className}`}>
      {showIcon && <i className="iconfont icon-heart"></i>}
      <span>{likeCount}</span>
    </span>
  )
}
