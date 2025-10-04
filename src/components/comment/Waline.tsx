import { useEffect, useRef } from 'react'
import { init } from '@waline/client'
import '@waline/client/style'
import { LIKE_RECORD_MARKER } from '@/utils/likeService'

/**
 * 隐藏点赞记录评论并返回隐藏数量
 */
function hideLikeRecordComments(container: HTMLDivElement): number {
  let hiddenCount = 0
  const commentNodes = container.querySelectorAll('.wl-card-item')

  commentNodes.forEach((node) => {
    const contentEl = node.querySelector('.wl-content')
    if (contentEl && contentEl.textContent?.includes(LIKE_RECORD_MARKER)) {
      ;(node as HTMLElement).style.display = 'none'
      hiddenCount++
    }
  })

  return hiddenCount
}

/**
 * 更新评论数显示
 */
function updateCommentCount(container: HTMLDivElement, hiddenCount: number): void {
  const selectors = ['.wl-count', '.wl-num', '.wl-header-count', '.wl-comment-count']
  const updatedElements = new Set<Element>()

  for (const selector of selectors) {
    try {
      const countElements = container.querySelectorAll(selector)
      countElements.forEach((element) => {
        if (updatedElements.has(element)) return

        const text = element.textContent || ''
        const match = text.match(/\d+/)
        if (match) {
          const currentCount = parseInt(match[0])
          const actualCount = Math.max(0, currentCount - hiddenCount)

          if (currentCount !== actualCount) {
            const newText = text.replace(/\d+/, actualCount.toString())
            element.textContent = newText
            updatedElements.add(element)
          }
        }
      })
    } catch (e) {
      // 某些选择器可能不支持，忽略
    }
  }

  // 通用方法：遍历文本节点
  if (updatedElements.size === 0) {
    updateCommentCountGeneric(container, hiddenCount)
  }
}

/**
 * 通用方法更新评论数
 */
function updateCommentCountGeneric(container: HTMLDivElement, hiddenCount: number): void {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null)

  let node
  while ((node = walker.nextNode())) {
    const text = node.textContent || ''
    if (/\d+\s*(条)?评论|评论.*?\(\d+\)/i.test(text)) {
      const match = text.match(/\d+/)
      if (match) {
        const currentCount = parseInt(match[0])
        const actualCount = Math.max(0, currentCount - hiddenCount)

        if (currentCount !== actualCount) {
          const newText = text.replace(/\d+/, actualCount.toString())
          node.textContent = newText
          break
        }
      }
    }
  }
}

export function Waline({ serverURL }: { serverURL: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
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

    // 防止无限循环的标志
    let isUpdating = false
    let lastHiddenCount = 0

    // 处理点赞记录隐藏和评论数更新
    const handleLikeRecordsHiding = () => {
      if (!ref.current || isUpdating) return

      const hiddenCount = hideLikeRecordComments(ref.current)

      // 只在隐藏数量变化时才修正评论数（避免无限循环）
      if (hiddenCount > 0 && hiddenCount !== lastHiddenCount) {
        lastHiddenCount = hiddenCount
        handleCommentCountUpdate(hiddenCount)
      }
    }

    // 处理评论数更新
    const handleCommentCountUpdate = (hiddenCount: number) => {
      if (!ref.current) return

      // 设置标志，防止无限循环
      isUpdating = true

      // 暂时断开观察器
      observer.disconnect()

      try {
        updateCommentCount(ref.current, hiddenCount)
      } finally {
        // 延迟恢复观察器和标志
        setTimeout(() => {
          isUpdating = false
          if (ref.current) {
            observer.observe(ref.current, {
              childList: true,
              subtree: true,
            })
          }
        }, 100)
      }
    }

    // 使用 MutationObserver 监听评论区 DOM 变化
    let debounceTimer: NodeJS.Timeout | null = null
    const observer = new MutationObserver(() => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
      debounceTimer = setTimeout(() => {
        handleLikeRecordsHiding()
      }, 50) // 50ms 防抖
    })

    if (ref.current) {
      // 初始隐藏
      setTimeout(handleLikeRecordsHiding, 200)

      // 监听后续变化
      observer.observe(ref.current, {
        childList: true,
        subtree: true,
      })
    }

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
      observer.disconnect()
      if (ref.current) {
        walineInst?.destroy()
      }
    }
  }, [serverURL])

  return <div ref={ref}></div>
}
