import { useState, useEffect } from 'react'
import { likeService, LikeStorage } from '@/utils/likeService'
import { WalineAuth } from '@/utils/walineAuth'

/**
 * 点赞状态管理 Hook
 * @param articlePath 文章路径
 */
export function useLikeState(articlePath: string) {
  const [likeCount, setLikeCount] = useState<number>(0)
  const [isLiked, setIsLiked] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // 初始化：获取点赞数和本地状态
  useEffect(() => {
    let isCancelled = false

    const init = async () => {
      setIsLoading(true)
      try {
        // 同步本地存储与服务器（如果用户已登录）
        // 注意：syncWithServer 已禁用（Waline API 限制）

        // 检查服务器端的真实点赞状态
        let serverLiked = false
        const userId = WalineAuth.getUserId()

        if (userId) {
          serverLiked = await likeService.checkUserLiked(articlePath, userId)

          // 防止竞态条件：组件已卸载或 articlePath 已改变
          if (isCancelled) return

          // 更新本地存储以匹配服务器状态
          if (serverLiked) {
            LikeStorage.setLiked(articlePath)
          } else {
            LikeStorage.setUnliked(articlePath)
          }
        }

        // 防止竞态条件：组件已卸载或 articlePath 已改变
        if (isCancelled) return

        setIsLiked(serverLiked)

        // 获取服务器点赞数
        const stats = await likeService.getArticleStats(articlePath)

        // 防止竞态条件：组件已卸载或 articlePath 已改变
        if (isCancelled) return

        if (stats) {
          const count = stats.reaction0 || 0
          setLikeCount(count)
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('初始化点赞状态失败:', error)
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    init()

    // 清理函数：防止组件卸载后更新状态
    return () => {
      isCancelled = true
    }
  }, [articlePath])

  // 切换点赞状态（乐观更新）
  const toggleLike = async () => {
    if (isSubmitting) return

    // 检查用户是否已登录
    if (!WalineAuth.isLoggedIn()) {
      throw new Error('LOGIN_REQUIRED')
    }

    setIsSubmitting(true)

    // 保存原始状态，用于失败回滚
    const originalIsLiked = isLiked
    const originalLikeCount = likeCount
    const newIsLiked = !isLiked

    // 🚀 乐观更新：立即更新 UI
    setIsLiked(newIsLiked)
    setLikeCount((prev) => (newIsLiked ? prev + 1 : Math.max(0, prev - 1)))

    // 立即更新本地存储
    if (newIsLiked) {
      LikeStorage.setLiked(articlePath)
    } else {
      LikeStorage.setUnliked(articlePath)
    }

    try {
      let newCount: number | null

      if (newIsLiked) {
        // 后台发送点赞请求
        newCount = await likeService.likeArticle(articlePath)

        if (newCount !== null) {
          // 用服务器返回的真实数据更新（通常和乐观更新一致）
          setLikeCount(newCount)
        } else {
          console.error('[点赞] API 返回 null，点赞可能失败')
          throw new Error('点赞失败，请稍后重试')
        }
      } else {
        // 后台发送取消点赞请求
        newCount = await likeService.unlikeArticle(articlePath)

        if (newCount !== null) {
          // 用服务器返回的真实数据更新
          setLikeCount(newCount)
        } else {
          console.error('[取消点赞] API 返回 null，取消点赞可能失败')
          throw new Error('取消点赞失败，请稍后重试')
        }
      }
    } catch (error) {
      // 请求失败，回滚到原始状态
      setIsLiked(originalIsLiked)
      setLikeCount(originalLikeCount)

      if (originalIsLiked) {
        LikeStorage.setLiked(articlePath)
      } else {
        LikeStorage.setUnliked(articlePath)
      }

      // 重新抛出错误，让按钮组件处理
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    likeCount,
    isLiked,
    isLoading,
    isSubmitting,
    toggleLike,
  }
}
