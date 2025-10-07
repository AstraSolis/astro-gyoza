import { useEffect, useRef } from 'react'
import { init } from '@waline/client'
import '@waline/client/style'

// 时间常量（毫秒）
const DEBOUNCE_DELAY = 50
const INITIAL_HIDE_DELAY = 200

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
  performFullLayoutUpdate(): void {
    if (this.isLayoutLocked) return

    this.isLayoutLocked = true

    try {
      this.rearrangeCommentLayout()
      this.reorganizeActionButtons()
      this.addInteractiveEnhancements()
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

  useEffect(() => {
    if (!container) return

    // 初始化布局管理器
    layoutRef.current = new CommentLayoutManager(container)

    // 处理布局更新
    const handleLayoutUpdate = () => {
      if (!container || !layoutRef.current) return
      layoutRef.current.performFullLayoutUpdate()
    }

    // 创建防抖观察器
    observerRef.current = new MutationObserver(() => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      debounceRef.current = setTimeout(() => {
        handleLayoutUpdate()
      }, DEBOUNCE_DELAY)
    })

    // 初始处理
    const initialTimer = setTimeout(handleLayoutUpdate, INITIAL_HIDE_DELAY)

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
