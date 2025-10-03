import { useLayoutEffect, useRef } from 'react'

export function Flashlight() {
  const isMobile = !window.matchMedia('(hover: hover)').matches
  const elementRef = useRef<HTMLDivElement>(null)

  if (isMobile) {
    return null
  }

  useLayoutEffect(() => {
    const element = elementRef.current
    if (!element) return

    let animationFrameId: number

    const handleMouseMove = (event: MouseEvent) => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }

      animationFrameId = requestAnimationFrame(() => {
        element.style.setProperty('--cursor-x', `${event.clientX}px`)
        element.style.setProperty('--cursor-y', `${event.clientY}px`)
      })
    }

    document.addEventListener('mousemove', handleMouseMove)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [])

  return (
    <div
      ref={elementRef}
      className="fixed inset-0 z-50 pointer-events-none"
      style={{
        backgroundImage: `radial-gradient(
          circle 16vmax at var(--cursor-x, 50%) var(--cursor-y, 50%),
          rgba(0, 0, 0, 0) 0%,
          rgba(0, 0, 0, 0.5) 80%,
          rgba(0, 0, 0, 0.8) 100%
        )`,
      }}
    ></div>
  )
}
