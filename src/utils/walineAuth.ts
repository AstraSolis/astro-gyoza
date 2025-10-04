import config from '@/config'

const { waline } = config

/**
 * Waline 用户信息接口
 */
export interface WalineUser {
  token: string
  display_name: string
  email: string
  url?: string
  avatar?: string
  type?: string
  mailMd5?: string
  objectId?: string
}

/**
 * Waline 用户认证类
 */
export class WalineAuth {
  private static STORAGE_KEY = 'WALINE_USER'
  private static COMMENT_BOX_KEY = 'WALINE_COMMENT_BOX_EDITOR'

  /**
   * 获取当前登录的用户信息
   */
  static getUser(): WalineUser | null {
    if (typeof window === 'undefined') return null

    try {
      const userStr = localStorage.getItem(this.STORAGE_KEY)
      if (!userStr) return null

      const userData = JSON.parse(userStr)

      // 检查是否有有效的 token
      if (userData && userData.token) {
        return userData as WalineUser
      }

      return null
    } catch (error) {
      console.error('获取 Waline 用户信息失败:', error)
      return null
    }
  }

  /**
   * 检查用户是否已登录
   */
  static isLoggedIn(): boolean {
    const user = this.getUser()
    return user !== null && !!user.token
  }

  /**
   * 获取用户显示名称
   */
  static getUserName(): string {
    const user = this.getUser()
    return user?.display_name || '游客'
  }

  /**
   * 获取用户邮箱
   */
  static getUserEmail(): string | null {
    const user = this.getUser()
    return user?.email || null
  }

  /**
   * 获取当前登录用户的 ID (objectId)
   */
  static getUserId(): string | null {
    const user = this.getUser()
    return user?.objectId || null
  }

  /**
   * 获取用户头像
   */
  static getUserAvatar(): string | null {
    const user = this.getUser()
    return user?.avatar || null
  }

  /**
   * 获取用户 Token（用于 API 请求）
   */
  static getToken(): string | null {
    const user = this.getUser()
    return user?.token || null
  }

  /**
   * 引导用户登录
   * 通过滚动到评论区让用户看到登录框
   */
  static promptLogin(): void {
    // 查找评论区元素
    const commentBox = document.querySelector('.waline-wrapper, [id*="waline"], .wl-container')

    if (commentBox) {
      // 滚动到评论区
      commentBox.scrollIntoView({ behavior: 'smooth', block: 'center' })

      // 尝试聚焦到登录输入框
      setTimeout(() => {
        const loginInput = commentBox.querySelector<HTMLInputElement>(
          'input[type="text"], input[placeholder*="昵称"], input[placeholder*="名字"]',
        )
        loginInput?.focus()
      }, 500)
    }
  }

  /**
   * 打开登录对话框（如果页面有评论区）
   */
  static openLoginDialog(): void {
    // 如果当前页面没有评论区，提示用户
    const hasCommentBox = document.querySelector('.waline-wrapper, [id*="waline"], .wl-container')

    if (!hasCommentBox) {
      // 如果没有评论区，可以跳转到有评论区的页面
      console.warn('当前页面没有评论区，无法登录')
      return
    }

    this.promptLogin()
  }

  /**
   * 获取 Waline 服务器 URL
   */
  static getServerURL(): string {
    return waline.serverURL
  }

  /**
   * 验证 Token 是否有效（通过请求 Waline API）
   */
  static async verifyToken(): Promise<boolean> {
    const token = this.getToken()
    if (!token) return false

    try {
      const response = await fetch(`${waline.serverURL}/api/token`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      return response.ok
    } catch (error) {
      console.error('验证 Token 失败:', error)
      return false
    }
  }

  /**
   * 清除用户信息（登出）
   */
  static logout(): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(this.STORAGE_KEY)
      localStorage.removeItem(this.COMMENT_BOX_KEY)
    } catch (error) {
      console.error('登出失败:', error)
    }
  }
}
