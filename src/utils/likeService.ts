import config from '@/config'

const { waline, like } = config
const serverURL = waline.serverURL

// 验证点赞配置（仅在开发环境）
if (import.meta.env.DEV) {
  if (!like || typeof like.enable !== 'boolean') {
    console.error('[点赞配置] 配置无效，请检查 src/config.yaml')
  }
}

/**
 * Waline 评论数据接口
 * 注意：Waline API 返回的字段可能因配置不同而有所差异
 */
export interface WalineComment {
  objectId: string
  comment: string
  url: string
  nick: string
  mail?: string // 邮箱可能不返回（隐私保护）
  user_id?: string // 用户 ID（用于匹配当前用户）
  avatar: string
  link?: string
  insertedAt?: string
  createdAt: string
  updatedAt?: string
  status?: string // 评论状态（approved, waiting, spam）
}

/**
 * Waline API 响应接口
 */
export interface WalineApiResponse<T> {
  data: T[]
  count?: number
  totalPages?: number
  page?: number
  pageSize?: number
}

/**
 * Waline 文章统计数据接口
 */
export interface WalineArticle {
  objectId: string
  path: string
  reaction0?: number // 点赞数
  time?: number // 浏览次数
  createdAt: string
  updatedAt: string
}

/**
 * 点赞用户信息接口
 */
export interface LikeUser {
  name: string
  email: string | undefined // 邮箱可能不存在
  avatar: string
  link?: string
  time: string
}

/**
 * 特殊评论标记,用于标识点赞记录
 */
export const LIKE_RECORD_MARKER = '[LIKE_RECORD]'

/**
 * 点赞服务类
 * 封装 Waline API 调用
 */
class LikeService {
  private serverURL: string
  private cache: Map<string, { data: number; timestamp: number }> = new Map()
  private readonly CACHE_TTL = 60000 // 60秒缓存
  private readonly FRESH_CACHE_TTL = 5000 // 刚操作后的短期缓存：5秒

  constructor(serverURL: string) {
    this.serverURL = serverURL

    // 定期清理过期缓存（每5分钟）
    if (typeof window !== 'undefined') {
      setInterval(() => this.clearExpiredCache(), 5 * 60 * 1000)
    }
  }

  /**
   * 清除缓存
   * @param path 文章路径，如果不提供则清除所有缓存
   */
  private clearCache(path?: string): void {
    if (path) {
      this.cache.delete(path)
    } else {
      this.cache.clear()
    }
  }

  /**
   * 清除过期缓存（定时清理）
   */
  private clearExpiredCache(): void {
    const now = Date.now()
    for (const [path, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.CACHE_TTL) {
        this.cache.delete(path)
      }
    }
  }

  /**
   * 清理 HTML 标签
   * 注意：Waline 会将评论内容转换为 HTML，所以 '[LIKE_RECORD]' 会变成 '<p>[LIKE_RECORD]</p>\n'
   */
  private cleanHtmlTags(text: string | undefined): string {
    return text?.replace(/<[^>]*>/g, '').trim() || ''
  }

  /**
   * 获取缓存
   */
  private getCache(path: string): number | null {
    const cached = this.cache.get(path)
    if (!cached) return null

    const isExpired = Date.now() - cached.timestamp > this.CACHE_TTL
    if (isExpired) {
      this.cache.delete(path)
      return null
    }

    return cached.data
  }

  /**
   * 设置缓存
   * @param path 文章路径
   * @param count 点赞数
   * @param fresh 是否为新鲜数据（刚操作后），新鲜数据使用更短的 TTL
   */
  private setCache(path: string, count: number, fresh = false): void {
    this.cache.set(path, {
      data: count,
      timestamp: Date.now() - (fresh ? this.CACHE_TTL - this.FRESH_CACHE_TTL : 0),
    })
  }

  /**
   * 获取单篇文章的统计数据（点赞数）
   * @param path 文章路径
   * @param useCache 是否使用缓存，默认 true
   */
  async getArticleStats(path: string, useCache = true): Promise<WalineArticle | null> {
    // 验证 path 参数
    if (!path || path.trim() === '') {
      console.error('[点赞数] path 参数为空')
      return null
    }

    // 检查缓存
    if (useCache) {
      const cached = this.getCache(path)
      if (cached !== null) {
        return {
          objectId: '',
          path,
          reaction0: cached,
          createdAt: '',
          updatedAt: '',
        }
      }
    }

    try {
      // Waline 评论 API 使用 path 参数，不是 url
      const apiUrl = `${this.serverURL}/api/comment?path=${encodeURIComponent(path)}&type=all`
      const response = await fetch(apiUrl)

      if (!response.ok) {
        console.error('[点赞数] 获取失败，状态码:', response.status)
        return null
      }

      const jsonData = await response.json()

      // Waline 错误响应格式: {errno: 1001, errmsg: {...}}
      if (jsonData.errno && jsonData.errno !== 0) {
        console.error('[点赞数] Waline API 错误:', jsonData.errno, jsonData.errmsg)
        return null
      }

      // Waline 评论 API 返回格式: {errno: 0, data: {data: [...], count: 5, page: 1, ...}}
      const comments = jsonData.data?.data || []

      // 确保 comments 是数组
      if (!Array.isArray(comments)) {
        console.error('[点赞数] comments 不是数组:', typeof comments, comments)
        return null
      }

      const likeCount = this.countLikesFromComments(comments)

      // 设置缓存
      this.setCache(path, likeCount)

      return {
        objectId: '',
        path,
        reaction0: likeCount,
        createdAt: '',
        updatedAt: '',
      }
    } catch (error) {
      console.error('[点赞数] 获取失败:', error)
      return null
    }
  }

  /**
   * 批量获取多篇文章的点赞数
   * @param paths 文章路径数组
   */
  async getBatchArticleStats(paths: string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>()
    const uncachedPaths: string[] = []

    // 先从缓存获取
    for (const path of paths) {
      const cached = this.getCache(path)
      if (cached !== null) {
        result.set(path, cached)
      } else {
        uncachedPaths.push(path)
      }
    }

    // 如果所有数据都在缓存中，直接返回
    if (uncachedPaths.length === 0) {
      return result
    }

    try {
      // 获取所有评论，一次性计算多篇文章的点赞数
      const response = await fetch(`${this.serverURL}/api/comment?type=all`)
      if (!response.ok) {
        console.error('[批量点赞数] 获取失败')
        return result
      }

      const data = await response.json()

      // 检查 Waline 错误响应
      if (data.errno && data.errno !== 0) {
        console.error('[批量点赞数] Waline API 错误:', data.errno, data.errmsg)
        return result
      }

      // Waline 评论 API 返回: {data: {data: [...], ...}}
      const comments = data.data?.data || []

      // 确保 comments 是数组
      if (!Array.isArray(comments)) {
        console.error('[批量点赞数] comments 不是数组:', typeof comments)
        return result
      }

      // 按路径分组统计
      const statsMap = this.groupCommentsByPath(comments)

      // 填充结果并更新缓存
      for (const path of uncachedPaths) {
        const count = statsMap.get(path) || 0
        result.set(path, count)
        this.setCache(path, count)
      }

      return result
    } catch (error) {
      console.error('[批量点赞数] 获取失败:', error)
      return result
    }
  }

  /**
   * 从评论列表中统计点赞数
   */
  private countLikesFromComments(comments: WalineComment[]): number {
    return comments.reduce((count: number, comment: WalineComment) => {
      const plainText = this.cleanHtmlTags(comment.comment)
      return plainText === LIKE_RECORD_MARKER ? count + 1 : count
    }, 0)
  }

  /**
   * 按路径分组统计点赞数
   */
  private groupCommentsByPath(comments: WalineComment[]): Map<string, number> {
    const statsMap = new Map<string, number>()
    for (const comment of comments) {
      const plainText = this.cleanHtmlTags(comment.comment)
      if (plainText === LIKE_RECORD_MARKER) {
        const path = comment.url
        statsMap.set(path, (statsMap.get(path) || 0) + 1)
      }
    }
    return statsMap
  }

  /**
   * 获取所有文章的统计数据
   */
  async getAllArticlesStats(): Promise<WalineArticle[]> {
    try {
      const response = await fetch(`${this.serverURL}/api/comment?type=all`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()

      // 检查 Waline 错误响应
      if (result.errno && result.errno !== 0) {
        console.error('[所有点赞数] Waline API 错误:', result.errno, result.errmsg)
        return []
      }

      // Waline 评论 API 返回: {data: {data: [...], ...}}
      const comments = result.data?.data || []

      // 确保 comments 是数组
      if (!Array.isArray(comments)) {
        console.error('[所有点赞数] comments 不是数组:', typeof comments)
        return []
      }

      const statsMap = this.groupCommentsByPath(comments)

      // 转换为 WalineArticle 格式并更新缓存
      const articles: WalineArticle[] = []
      statsMap.forEach((count: number, path: string) => {
        this.setCache(path, count)
        articles.push({
          objectId: '',
          path,
          reaction0: count,
          createdAt: '',
          updatedAt: '',
        })
      })

      return articles
    } catch (error) {
      console.error('获取所有文章统计数据失败:', error)
      return []
    }
  }

  // 不再需要 updateLike 方法，因为点赞数由评论数量决定

  /**
   * 点赞文章
   * @param path 文章路径
   */
  async likeArticle(path: string): Promise<number | null> {
    try {
      await this.createLikeRecord(path)

      // 清除缓存，强制重新获取
      this.clearCache(path)

      // 重试机制：确保获取到更新后的数据
      const stats = await this.retryGetStats(path, 3, 200)
      const newCount = stats ? stats.reaction0 || 0 : null

      // 使用短期缓存策略（5秒后过期，强制重新验证）
      if (newCount !== null) {
        this.setCache(path, newCount, true)
      }

      return newCount
    } catch (error) {
      console.error('[点赞] 操作失败:', error)
      throw error
    }
  }

  /**
   * 取消点赞
   * @param path 文章路径
   */
  async unlikeArticle(path: string): Promise<number | null> {
    try {
      await this.deleteLikeRecord(path)

      // 清除缓存，强制重新获取
      this.clearCache(path)

      // 重试机制：确保获取到更新后的数据
      const stats = await this.retryGetStats(path, 3, 200)
      const newCount = stats ? stats.reaction0 || 0 : null

      // 使用短期缓存策略（5秒后过期，强制重新验证）
      if (newCount !== null) {
        this.setCache(path, newCount, true)
      }

      return newCount
    } catch (error) {
      console.error('[取消点赞] 操作失败:', error)
      throw error
    }
  }

  /**
   * 带重试的获取统计数据
   * @param path 文章路径
   * @param maxRetries 最大重试次数
   * @param delayMs 每次重试的延迟（毫秒）
   */
  private async retryGetStats(
    path: string,
    maxRetries = 3,
    delayMs = 200,
  ): Promise<WalineArticle | null> {
    for (let i = 0; i < maxRetries; i++) {
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
      const stats = await this.getArticleStats(path, false)
      if (stats) return stats
    }
    return null
  }

  /**
   * 获取最多点赞的文章列表
   * @param limit 数量限制
   */
  async getMostLikedArticles(limit = 10): Promise<WalineArticle[]> {
    const articles = await this.getAllArticlesStats()
    return articles
      .filter((article) => article.reaction0 && article.reaction0 > 0)
      .sort((a, b) => (b.reaction0 || 0) - (a.reaction0 || 0))
      .slice(0, limit)
  }

  /**
   * 获取最近点赞的文章列表
   * @param limit 数量限制
   */
  async getRecentLikedArticles(limit = 10): Promise<WalineArticle[]> {
    const articles = await this.getAllArticlesStats()
    return articles
      .filter((article) => article.reaction0 && article.reaction0 > 0)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit)
  }

  /**
   * 创建点赞记录（作为特殊评论）
   * @param path 文章路径
   */
  private async createLikeRecord(path: string): Promise<void> {
    // 需要从 walineAuth 获取用户信息
    const { WalineAuth } = await import('./walineAuth')

    const token = WalineAuth.getToken()
    const userName = WalineAuth.getUserName()
    const userEmail = WalineAuth.getUserEmail()

    if (!token) {
      const error = new Error('用户未登录')
      console.warn('[点赞记录] 无法创建记录：用户未登录')
      throw error
    }

    // 验证 Token 有效性
    const isValid = await WalineAuth.verifyToken()
    if (!isValid) {
      const error = new Error('登录已过期，请重新登录')
      console.warn('[点赞记录] Token 无效或已过期')
      throw error
    }

    const response = await fetch(`${this.serverURL}/api/comment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        url: path,
        comment: LIKE_RECORD_MARKER, // 特殊标记，前端会自动过滤
        nick: userName,
        mail: userEmail,
        link: '',
        ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      const errorMsg = `创建点赞记录失败: ${response.statusText}`
      console.error('[点赞记录]', errorMsg, errorText)
      throw new Error(errorMsg)
    }
  }

  /**
   * 删除点赞记录
   * @param path 文章路径
   */
  private async deleteLikeRecord(path: string): Promise<void> {
    const { WalineAuth } = await import('./walineAuth')

    const token = WalineAuth.getToken()
    const userId = WalineAuth.getUserId()

    if (!token || !userId) {
      const error = new Error('用户未登录')
      console.warn('[点赞记录] 无法删除记录：用户未登录')
      throw error
    }

    // 验证 Token 有效性
    const isValid = await WalineAuth.verifyToken()
    if (!isValid) {
      const error = new Error('登录已过期，请重新登录')
      console.warn('[点赞记录] Token 无效或已过期')
      throw error
    }

    // 1. 获取该文章的所有点赞记录（使用 path 参数）
    const response = await fetch(
      `${this.serverURL}/api/comment?path=${encodeURIComponent(path)}&type=all`,
    )

    if (!response.ok) {
      const errorMsg = '获取点赞记录失败'
      console.warn('[点赞记录]', errorMsg)
      throw new Error(errorMsg)
    }

    const result = await response.json()

    // 检查 Waline 错误响应
    if (result.errno && result.errno !== 0) {
      const errorMsg = `Waline API 错误: ${JSON.stringify(result.errmsg)}`
      console.warn('[点赞记录]', errorMsg)
      throw new Error(errorMsg)
    }

    // Waline 评论 API 返回: {data: {data: [...], ...}}
    const comments = result.data?.data || []

    // 确保 comments 是数组
    if (!Array.isArray(comments)) {
      const errorMsg = 'comments 不是数组，无法删除点赞'
      console.warn('[点赞记录]', errorMsg)
      throw new Error(errorMsg)
    }

    // 2. 找到当前用户的点赞记录（使用 user_id 匹配）
    const userLikeRecord = comments.find((comment: WalineComment) => {
      const plainText = this.cleanHtmlTags(comment.comment)
      // 使用 user_id 字段匹配用户
      return plainText === LIKE_RECORD_MARKER && comment.user_id === userId
    })

    if (!userLikeRecord) {
      const errorMsg = '未找到点赞记录'
      console.warn('[点赞记录]', errorMsg)
      throw new Error(errorMsg)
    }

    // 3. 删除记录
    const deleteResponse = await fetch(`${this.serverURL}/api/comment/${userLikeRecord.objectId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text()
      const errorMsg = `删除点赞记录失败: ${deleteResponse.statusText}`
      console.error('[点赞记录]', errorMsg, errorText)
      throw new Error(errorMsg)
    }
  }

  /**
   * 获取文章的点赞用户列表
   * @param path 文章路径
   */
  async getLikeUsers(path: string): Promise<LikeUser[]> {
    try {
      // 使用 path 参数，不是 url
      const response = await fetch(
        `${this.serverURL}/api/comment?path=${encodeURIComponent(path)}&type=all`,
      )

      if (!response.ok) {
        console.error('[点赞用户] 获取失败')
        return []
      }

      const result = await response.json()

      // 检查 Waline 错误响应
      if (result.errno && result.errno !== 0) {
        console.error('[点赞用户] Waline API 错误:', result.errno, result.errmsg)
        return []
      }

      // Waline 评论 API 返回: {data: {data: [...], ...}}
      const comments = result.data?.data || []

      // 确保 comments 是数组
      if (!Array.isArray(comments)) {
        console.error('[点赞用户] comments 不是数组:', typeof comments)
        return []
      }

      // 过滤出点赞记录
      const likeRecords = comments.reduce((records: LikeUser[], comment: WalineComment) => {
        const plainText = this.cleanHtmlTags(comment.comment)
        if (plainText === LIKE_RECORD_MARKER) {
          records.push({
            name: comment.nick,
            email: comment.mail,
            avatar: comment.avatar,
            link: comment.link,
            time: comment.insertedAt || comment.createdAt,
          })
        }
        return records
      }, [])

      return likeRecords
    } catch (error) {
      console.error('[点赞用户] 获取失败:', error)
      return []
    }
  }

  /**
   * 检查用户是否点赞了指定文章
   * @param path 文章路径
   * @param userId 用户 ID (objectId)
   */
  async checkUserLiked(path: string, userId: string): Promise<boolean> {
    try {
      // 使用 path 参数，不是 url
      const response = await fetch(
        `${this.serverURL}/api/comment?path=${encodeURIComponent(path)}&type=all`,
      )

      if (!response.ok) return false

      const result = await response.json()

      // 检查 Waline 错误响应
      if (result.errno && result.errno !== 0) {
        console.error('[检查点赞状态] Waline API 错误:', result.errno, result.errmsg)
        return false
      }

      // Waline 评论 API 返回: {data: {data: [...], ...}}
      const comments = result.data?.data || []

      // 确保 comments 是数组
      if (!Array.isArray(comments)) {
        console.error('[检查点赞状态] comments 不是数组:', typeof comments)
        return false
      }

      return comments.some((comment: WalineComment) => {
        const plainText = this.cleanHtmlTags(comment.comment)
        // 使用 user_id 字段匹配，确保每个用户每篇文章只能点赞一次
        return plainText === LIKE_RECORD_MARKER && comment.user_id === userId
      })
    } catch (error) {
      console.error('[检查点赞状态] 失败:', error)
      return false
    }
  }
}

/**
 * 本地存储管理类
 * 用于记录用户已点赞的文章
 */
export class LikeStorage {
  private static STORAGE_KEY = 'waline-liked-posts'

  /**
   * 检查是否已点赞
   * @param path 文章路径
   */
  static hasLiked(path: string): boolean {
    if (typeof window === 'undefined') return false
    try {
      const likedPosts = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]')
      return likedPosts.includes(path)
    } catch {
      return false
    }
  }

  /**
   * 标记为已点赞
   * @param path 文章路径
   */
  static setLiked(path: string): void {
    if (typeof window === 'undefined') return
    try {
      const likedPosts = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]')
      if (!likedPosts.includes(path)) {
        likedPosts.push(path)
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(likedPosts))
      }
    } catch (error) {
      console.error('保存点赞状态失败:', error)
    }
  }

  /**
   * 取消点赞标记
   * @param path 文章路径
   */
  static setUnliked(path: string): void {
    if (typeof window === 'undefined') return
    try {
      const likedPosts = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]')
      const filtered = likedPosts.filter((p: string) => p !== path)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered))
    } catch (error) {
      console.error('取消点赞状态失败:', error)
    }
  }

  /**
   * 获取所有已点赞的文章路径
   */
  static getAllLiked(): string[] {
    if (typeof window === 'undefined') return []
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]')
    } catch {
      return []
    }
  }

  /**
   * 清理无效的本地记录
   * 移除重复项，确保数据一致性
   */
  static clearInvalidRecords(): void {
    if (typeof window === 'undefined') return

    try {
      const likedPosts = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]')
      // 移除重复项
      const uniquePosts = [...new Set(likedPosts)]
      if (uniquePosts.length !== likedPosts.length) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(uniquePosts))
      }
    } catch (error) {
      console.error('[本地存储] 清理失败:', error)
    }
  }
}

// 导出单例实例
export const likeService = new LikeService(serverURL)
