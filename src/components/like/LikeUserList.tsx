import { useEffect, useState } from 'react'
import { likeService, type LikeUser } from '@/utils/likeService'
import { motion } from 'framer-motion'

interface LikeUserListProps {
  articlePath: string
  className?: string
  maxDisplay?: number // 最多显示多少个用户
  showCount?: boolean // 是否显示总数
}

/**
 * 点赞用户列表组件
 * 显示点赞了文章的用户头像列表
 */
export function LikeUserList({
  articlePath,
  className = '',
  maxDisplay = 10,
  showCount = true,
}: LikeUserListProps) {
  const [users, setUsers] = useState<LikeUser[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true)
      try {
        const likeUsers = await likeService.getLikeUsers(articlePath)
        setUsers(likeUsers)
      } catch (error) {
        console.error('获取点赞用户失败:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsers()
  }, [articlePath])

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-sm text-text-secondary">加载中...</span>
      </div>
    )
  }

  if (users.length === 0) {
    return null
  }

  const displayUsers = users.slice(0, maxDisplay)
  const remainingCount = users.length - maxDisplay

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showCount && <span className="text-sm text-text-secondary">{users.length} 人点赞</span>}

      <div className="flex -space-x-2">
        {displayUsers.map((user, index) => (
          <motion.div
            key={`${user.email}-${index}`}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="relative"
          >
            <img
              src={user.avatar}
              alt={user.name}
              title={`${user.name} 于 ${new Date(user.time).toLocaleString('zh-CN')} 点赞`}
              className="w-8 h-8 rounded-full border-2 border-primary hover:scale-110 transition-transform cursor-pointer"
            />
          </motion.div>
        ))}

        {remainingCount > 0 && (
          <div
            className="w-8 h-8 rounded-full border-2 border-primary bg-secondary flex items-center justify-center text-xs text-text-secondary"
            title={`还有 ${remainingCount} 人`}
          >
            +{remainingCount}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * 点赞用户详细列表（展开版）
 */
export function LikeUserDetailList({
  articlePath,
  className = '',
}: {
  articlePath: string
  className?: string
}) {
  const [users, setUsers] = useState<LikeUser[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true)
      try {
        const likeUsers = await likeService.getLikeUsers(articlePath)
        // 按时间倒序排序
        const sortedUsers = likeUsers.sort(
          (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
        )
        setUsers(sortedUsers)
      } catch (error) {
        console.error('获取点赞用户失败:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsers()
  }, [articlePath])

  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="text-sm text-text-secondary">加载中...</div>
      </div>
    )
  }

  if (users.length === 0) {
    return <div className={`text-sm text-text-secondary ${className}`}>暂无点赞</div>
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="text-sm font-medium text-text-primary">点赞用户 ({users.length})</div>

      <div className="space-y-2">
        {users.map((user, index) => (
          <motion.div
            key={`${user.email}-${index}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{user.name}</span>
                {user.link && (
                  <a
                    href={user.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent hover:underline"
                  >
                    <i className="iconfont icon-external-link"></i>
                  </a>
                )}
              </div>
              <div className="text-xs text-text-secondary">
                {new Date(user.time).toLocaleString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>

            <i className="iconfont icon-hearts text-red-500"></i>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
