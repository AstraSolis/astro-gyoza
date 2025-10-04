import { useCallback } from 'react'
import { toast } from 'react-toastify'
import { useLikeState } from './useLikeState'
import { useLikeErrorHandler } from './useLikeErrorHandler'

/**
 * 点赞点击逻辑 Hook
 * 使用乐观更新策略，立即响应用户操作
 * @param articlePath 文章路径
 */
export function useLikeClick(articlePath: string) {
  const { isLiked, isSubmitting, toggleLike, ...rest } = useLikeState(articlePath)
  const handleLikeError = useLikeErrorHandler()

  const handleClick = useCallback(async () => {
    if (isSubmitting) return

    // 记录操作前的状态
    const wasLiked = isLiked

    try {
      // 乐观更新：立即调用 toggleLike（内部会立即更新 UI）
      await toggleLike()

      // 根据操作前的状态显示提示
      if (!wasLiked) {
        toast.success('感谢你的点赞！', {
          position: 'bottom-center',
          autoClose: 2000,
        })
      } else {
        toast.info('已取消点赞', {
          position: 'bottom-center',
          autoClose: 2000,
        })
      }
    } catch (error: unknown) {
      handleLikeError(error)
    }
  }, [isSubmitting, isLiked, toggleLike, handleLikeError])

  return {
    isLiked,
    isSubmitting,
    handleClick,
    ...rest,
  }
}
