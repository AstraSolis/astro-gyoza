import { useEffect, useRef } from 'react'
import { init } from '@waline/client'
import '@waline/client/style'
import { LIKE_RECORD_MARKER } from '@/utils/likeService'

// 时间常量（毫秒）
const DEBOUNCE_DELAY = 50
const OBSERVER_RESUME_DELAY = 100
const INITIAL_HIDE_DELAY = 200

// 评论数选择器列表（按优先级排序）
const COMMENT_COUNT_SELECTORS = [
  '.wl-count',
  '.wl-num',
  '.wl-header-count',
  '.wl-comment-count',
] as const

/**
 * 评论布局管理器 - 负责评论区域的DOM操作和布局管理
 */
class CommentLayoutManager {
  private container: HTMLDivElement
  private isLayoutLocked = false

  constructor(container: HTMLDivElement) {
    this.container = container
  }

  /**
   * 隐藏点赞记录评论并返回隐藏数量
   */
  hideLikeRecordComments(): number {
    let hiddenCount = 0
    const commentNodes = this.container.querySelectorAll('.wl-card-item')

    commentNodes.forEach((node) => {
      const contentEl = node.querySelector('.wl-content')
      if (contentEl?.textContent?.includes(LIKE_RECORD_MARKER)) {
        ;(node as HTMLElement).style.display = 'none'
        hiddenCount++
      }
    })

    return hiddenCount
  }

  /**
   * 更新评论数显示
   */
  updateCommentCount(hiddenCount: number): void {
    if (hiddenCount <= 0) return

    const updatedElements = new Set<Element>()

    // 尝试使用已知选择器
    for (const selector of COMMENT_COUNT_SELECTORS) {
      try {
        const countElements = this.container.querySelectorAll(selector)
        countElements.forEach((element) => {
          if (updatedElements.has(element)) return

          if (this.updateElementCount(element, hiddenCount)) {
            updatedElements.add(element)
          }
        })
      } catch (e) {
        // 忽略选择器错误
        continue
      }
    }

    // 如果没有找到元素，使用通用方法
    if (updatedElements.size === 0) {
      this.updateCommentCountGeneric(hiddenCount)
    }
  }

  /**
   * 更新单个元素的计数值
   */
  private updateElementCount(element: Element, hiddenCount: number): boolean {
    const text = element.textContent || ''
    const match = text.match(/\d+/)

    if (!match) return false

    const currentCount = parseInt(match[0])
    const actualCount = Math.max(0, currentCount - hiddenCount)

    if (currentCount !== actualCount) {
      const newText = text.replace(/\d+/, actualCount.toString())
      element.textContent = newText
      return true
    }

    return false
  }

  /**
   * 通用方法更新评论数（遍历文本节点）
   */
  private updateCommentCountGeneric(hiddenCount: number): void {
    const walker = document.createTreeWalker(this.container, NodeFilter.SHOW_TEXT, null)

    let node
    while ((node = walker.nextNode())) {
      const text = node.textContent || ''
      if (/\d+\s*(条)?评论|评论.*?\(\d+\)/i.test(text)) {
        const match = text.match(/\d+/)
        if (match) {
          const currentCount = parseInt(match[0])
          const actualCount = Math.max(0, currentCount - hiddenCount)

          if (currentCount !== actualCount) {
            node.textContent = text.replace(/\d+/, actualCount.toString())
            break
          }
        }
      }
    }
  }

  /**
   * 重新排列评论布局
   */
  rearrangeCommentLayout(): void {
    const cards = this.container.querySelectorAll('.wl-card')

    cards.forEach((card) => {
      const head = card.querySelector('.wl-head')
      if (!head || head.hasAttribute('data-rearranged')) return

      head.setAttribute('data-rearranged', 'true')

      const elements = {
        nick: head.querySelector('.wl-nick'),
        badge: head.querySelector('.wl-badge'),
        meta: head.querySelector('.wl-meta'),
        time: head.querySelector('.wl-time'),
      }

      this.moveTimeAfterNick(elements.time, elements.nick, elements.badge)
      this.moveMetaAfterTime(elements.meta, elements.time, elements.nick, elements.badge)
      this.addSpacerToHead(head, elements.meta, elements.time)
    })
  }

  /**
   * 将时间元素移到用户名/徽章后面
   */
  private moveTimeAfterNick(
    time: Element | null,
    nick: Element | null,
    badge: Element | null,
  ): void {
    if (!nick || !time) return
    ;(badge || nick).after(time)
  }

  /**
   * 将元信息移到时间后面
   */
  private moveMetaAfterTime(
    meta: Element | null,
    time: Element | null,
    nick: Element | null,
    badge: Element | null,
  ): void {
    if (!meta) return

    const referenceElement = time || nick
    if (referenceElement) {
      if (badge && nick && !time) {
        badge.after(meta)
      } else {
        referenceElement.after(meta)
      }
    }
  }

  /**
   * 添加 spacer 元素用于布局对齐
   */
  private addSpacerToHead(head: Element, meta: Element | null, time: Element | null): void {
    if (head.querySelector('.spacer')) return

    const spacer = document.createElement('div')
    spacer.className = 'spacer'

    const referenceElement = meta || time
    if (referenceElement) {
      referenceElement.after(spacer)
    }
  }

  /**
   * 重新整理操作按钮布局
   */
  reorganizeActionButtons(): void {
    this.container.querySelectorAll('.wl-card').forEach((card) => {
      const content = card.querySelector('.wl-content')
      const actions = card.querySelector('.wl-comment-actions')

      if (content && actions && content.nextSibling !== actions) {
        content.parentNode?.insertBefore(actions, content.nextSibling)
        actions.classList.add('reorganized')
      }
    })
  }

  /**
   * 添加交互增强功能
   */
  addInteractiveEnhancements(): void {
    this.enhanceReplyButtons()
    this.addBubbleTooltips()
  }

  /**
   * 增强回复按钮功能
   */
  private enhanceReplyButtons(): void {
    this.container.querySelectorAll('.wl-reply').forEach((btn) => {
      if (btn.hasAttribute('data-enhanced')) return

      btn.setAttribute('data-enhanced', 'true')
      btn.addEventListener('click', this.handleReplyClick.bind(this))
    })
  }

  /**
   * 处理回复按钮点击
   */
  private handleReplyClick = (e: Event): void => {
    e.preventDefault()
    const card = (e.target as HTMLElement).closest('.wl-card')
    const username = card?.querySelector('.wl-nick')?.textContent?.trim()
    const textarea = this.container.querySelector('.wl-editor') as HTMLTextAreaElement

    if (textarea && username) {
      textarea.focus()
      const mention = `@${username} `

      if (!textarea.value.includes(mention)) {
        textarea.value = mention + textarea.value
        textarea.setSelectionRange(mention.length, mention.length)
      }
    }
  }

  /**
   * 为气泡添加悬停提示
   */
  private addBubbleTooltips(): void {
    this.container.querySelectorAll('.wl-content').forEach((bubble) => {
      const card = bubble.closest('.wl-card')
      const time = card?.querySelector('.wl-time')?.textContent?.trim()
      const meta = Array.from(card?.querySelectorAll('.wl-meta > span') || [])
        .map((s) => s.textContent?.trim())
        .join(' ')

      if (time || meta) {
        bubble.setAttribute('title', [time, meta].filter(Boolean).join(' | '))
      }
    })
  }

  /**
   * 执行完整的布局更新
   */
  performFullLayoutUpdate(): number {
    if (this.isLayoutLocked) return 0

    this.isLayoutLocked = true

    try {
      const hiddenCount = this.hideLikeRecordComments()
      this.rearrangeCommentLayout()
      this.reorganizeActionButtons()
      this.addInteractiveEnhancements()

      return hiddenCount
    } finally {
      this.isLayoutLocked = false
    }
  }
}

/**
 * 自定义hook - 管理评论区DOM监听和布局更新
 */
function useCommentLayout(container: HTMLDivElement | null) {
  const layoutRef = useRef<CommentLayoutManager | null>(null)
  const observerRef = useRef<MutationObserver | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const isUpdatingRef = useRef(false)
  const lastHiddenCountRef = useRef(0)

  useEffect(() => {
    if (!container) return

    // 初始化布局管理器
    layoutRef.current = new CommentLayoutManager(container)

    // 处理点赞记录隐藏和评论数更新
    const handleLikeRecordsHiding = () => {
      if (!container || !layoutRef.current || isUpdatingRef.current) return

      const hiddenCount = layoutRef.current.performFullLayoutUpdate()

      // 只在隐藏数量变化时才修正评论数（避免无限循环）
      if (hiddenCount > 0 && hiddenCount !== lastHiddenCountRef.current) {
        lastHiddenCountRef.current = hiddenCount
        handleCommentCountUpdate(hiddenCount)
      }
    }

    // 处理评论数更新
    const handleCommentCountUpdate = (hiddenCount: number) => {
      if (!container || !layoutRef.current) return

      // 设置标志，防止无限循环
      isUpdatingRef.current = true

      // 暂时断开观察器
      if (observerRef.current) {
        observerRef.current.disconnect()
      }

      try {
        layoutRef.current.updateCommentCount(hiddenCount)
      } finally {
        // 延迟恢复观察器和标志
        setTimeout(() => {
          isUpdatingRef.current = false
          if (container && observerRef.current) {
            observerRef.current.observe(container, {
              childList: true,
              subtree: true,
            })
          }
        }, OBSERVER_RESUME_DELAY)
      }
    }

    // 创建防抖观察器
    observerRef.current = new MutationObserver(() => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      debounceRef.current = setTimeout(() => {
        handleLikeRecordsHiding()
      }, DEBOUNCE_DELAY)
    })

    // 初始处理
    const initialTimer = setTimeout(handleLikeRecordsHiding, INITIAL_HIDE_DELAY)

    // 开始监听后续变化
    observerRef.current.observe(container, {
      childList: true,
      subtree: true,
    })

    // 清理函数
    return () => {
      if (initialTimer) {
        clearTimeout(initialTimer)
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
      layoutRef.current = null
    }
  }, [container])
}

/**
 * Waline评论组件 - 主组件
 */
export function Waline({ serverURL }: { serverURL: string }) {
  const ref = useRef<HTMLDivElement>(null)

  // 使用自定义hook管理布局
  useCommentLayout(ref.current)

  useEffect(() => {
    if (!ref.current) return

    // 初始化Waline
    const walineInst = init({
      el: ref.current,
      serverURL,
      dark: "[data-theme='dark']",
      login: 'force',
      imageUploader: false,
      search: false,
      locale: {
        placeholder: '发条友善的评论吧（支持 Markdown 语法）…',
      },
      emoji: ['//unpkg.com/@waline/emojis@1.1.0/bilibili'],
    })

    return () => {
      walineInst?.destroy()
    }
  }, [serverURL])

  return <div ref={ref}></div>
}
