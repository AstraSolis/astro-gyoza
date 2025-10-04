import { toast } from 'react-toastify'
import { WalineAuth } from '@/utils/walineAuth'

/**
 * 点赞错误处理 Hook
 * 统一处理点赞相关的错误提示
 */
export function useLikeErrorHandler() {
  return (error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('点赞操作失败:', error)

    // 登录相关错误
    if (errorMessage === 'LOGIN_REQUIRED') {
      toast.error('请先登录后再点赞', {
        position: 'bottom-center',
        autoClose: 3000,
        onClick: () => {
          WalineAuth.promptLogin()
        },
      })
      return
    }

    // Token 过期错误
    if (errorMessage.includes('登录已过期') || errorMessage.includes('Token')) {
      toast.error('登录已过期，请重新登录', {
        position: 'bottom-center',
        autoClose: 3000,
        onClick: () => {
          WalineAuth.logout()
          WalineAuth.promptLogin()
        },
      })
      return
    }

    // 重复点赞错误
    if (errorMessage.includes('已点赞') || errorMessage.includes('重复')) {
      toast.warning('您已经点过赞了', {
        position: 'bottom-center',
        autoClose: 2000,
      })
      return
    }

    // 网络错误
    if (errorMessage.includes('网络') || errorMessage.includes('Network')) {
      toast.error('网络连接失败，请检查网络后重试', {
        position: 'bottom-center',
        autoClose: 3000,
      })
      return
    }

    // 未找到点赞记录（取消点赞时）
    if (errorMessage.includes('未找到点赞记录')) {
      toast.info('未找到点赞记录，可能已被取消', {
        position: 'bottom-center',
        autoClose: 2000,
      })
      return
    }

    // 默认错误
    toast.error('操作失败，请稍后重试', {
      position: 'bottom-center',
      autoClose: 3000,
    })
  }
}
