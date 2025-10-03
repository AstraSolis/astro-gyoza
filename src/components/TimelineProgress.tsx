import { useEffect, useRef, useState } from 'react'
import { animate } from 'framer-motion'
import { getDaysInYear, getDiffInDays, getStartOfDay, getStartOfYear } from '@/utils/date'

const MS_PER_DAY = 86400 * 1000

function calculateTimeStats() {
  const now = new Date()
  const yearStart = getStartOfYear(now)
  const dayStart = getStartOfDay(now)
  const daysInYear = getDaysInYear(now)

  const pastDays = getDiffInDays(yearStart, now)
  const msFromYearStart = now.getTime() - yearStart.getTime()
  const msFromDayStart = now.getTime() - dayStart.getTime()
  const msInYear = daysInYear * MS_PER_DAY

  return {
    currentYear: now.getFullYear(),
    dayOfYear: pastDays,
    percentOfYear: (msFromYearStart / msInYear) * 100,
    percentOfToday: (msFromDayStart / MS_PER_DAY) * 100,
  }
}

export function TimelineProgress() {
  const [stats, setStats] = useState(calculateTimeStats)

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(calculateTimeStats())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <p className="mt-4">
        今天是 {stats.currentYear} 年的第 <CountUp value={stats.dayOfYear} decimals={0} /> 天
      </p>
      <p className="mt-4">
        今年已过 <CountUp value={stats.percentOfYear} decimals={5} />%
      </p>
      <p className="mt-4">
        今天已过 <CountUp value={stats.percentOfToday} decimals={5} />%
      </p>
    </>
  )
}

function CountUp({ value, decimals }: { value: number; decimals: number }) {
  const nodeRef = useRef<HTMLSpanElement>(null)
  const prevValue = useRef(0)
  const animationRef = useRef<ReturnType<typeof animate> | null>(null)
  const isFirstAnimation = useRef(true)

  // 组件挂载时的初始化
  useEffect(() => {
    isFirstAnimation.current = true
    prevValue.current = 0
    return () => {
      // 组件卸载时重置状态,确保下次挂载时重新开始
      isFirstAnimation.current = true
      prevValue.current = 0
    }
  }, [])

  useEffect(() => {
    const node = nodeRef.current
    if (!node) return

    // 停止之前的动画
    animationRef.current?.stop()

    const startValue = isFirstAnimation.current ? 0 : prevValue.current
    const duration = 1
    const easing = isFirstAnimation.current ? undefined : 'linear'

    animationRef.current = animate(startValue, value, {
      duration,
      ease: easing,
      onUpdate: (v) => {
        node.textContent = v.toFixed(decimals)
      },
    })

    prevValue.current = value
    isFirstAnimation.current = false

    return () => {
      animationRef.current?.stop()
      animationRef.current = null
    }
  }, [value, decimals])

  return <span ref={nodeRef}>{value.toFixed(decimals)}</span>
}
