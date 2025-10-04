import { useEffect, useState } from 'react'
import { likeService, type WalineArticle } from '@/utils/likeService'
import { motion } from 'framer-motion'

interface LikeRankingProps {
  type?: 'most' | 'recent'
  limit?: number
  className?: string
}

/**
 * 点赞排行榜组件
 */
export function LikeRanking({ type = 'most', limit = 10, className = '' }: LikeRankingProps) {
  const [articles, setArticles] = useState<WalineArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchArticles = async () => {
      setIsLoading(true)
      try {
        let data: WalineArticle[]
        if (type === 'most') {
          data = await likeService.getMostLikedArticles(limit)
        } else {
          data = await likeService.getRecentLikedArticles(limit)
        }
        setArticles(data)
      } catch (error) {
        console.error('获取点赞排行榜失败:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchArticles()
  }, [type, limit])

  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="text-sm text-text-secondary">加载中...</div>
      </div>
    )
  }

  if (articles.length === 0) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="text-sm text-text-secondary">暂无数据</div>
      </div>
    )
  }

  return (
    <motion.div
      className={`space-y-2 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {articles.map((article, index) => (
        <motion.a
          key={article.path}
          href={article.path}
          className="group flex items-center gap-3 py-2 hover:text-accent transition-colors"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <span
            className={`
              flex-shrink-0 size-6 flex items-center justify-center rounded-full text-xs font-bold
              ${index === 0 ? 'bg-yellow-500 text-white' : index === 1 ? 'bg-gray-400 text-white' : index === 2 ? 'bg-orange-600 text-white' : 'bg-secondary text-text-secondary'}
            `}
          >
            {index + 1}
          </span>

          <span className="flex-1 truncate text-sm group-hover:text-accent">
            {getArticleTitle(article.path)}
          </span>

          <span className="flex-shrink-0 flex items-center gap-1 text-xs text-text-secondary">
            <i className="iconfont icon-heart text-red-500"></i>
            <span>{article.reaction0 || 0}</span>
          </span>
        </motion.a>
      ))}
    </motion.div>
  )
}

/**
 * 从路径中提取文章标题
 * 如果项目中有文章元数据，可以在这里优化
 */
function getArticleTitle(path: string): string {
  // 移除开头的斜杠和 /posts/ 前缀
  const cleanPath = path.replace(/^\/posts\//, '').replace(/^\//, '')

  // 如果路径为空，返回默认标题
  if (!cleanPath) return '首页'

  // 将连字符替换为空格，首字母大写
  return cleanPath
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
