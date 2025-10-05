import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

export interface JottingsItem {
  text: string
  date: Date
  from?: string
  author?: string
}

export interface YearGroup {
  year: number
  items: JottingsItem[]
}

interface JottingsListProps {
  yearGroups: YearGroup[]
}

export function JottingsList({ yearGroups }: JottingsListProps) {
  return (
    <section>
      {yearGroups.map((yearGroup) => (
        <YearGroupSection key={yearGroup.year} yearGroup={yearGroup} />
      ))}
    </section>
  )
}

function YearGroupSection({ yearGroup }: { yearGroup: YearGroup }) {
  return (
    <div className="relative py-10">
      <h3
        className="absolute -top-3 -left-8 text-[7rem] text-transparent leading-none font-bold pointer-events-none select-none font-['Atkinson']"
        style={{
          WebkitTextStroke: '2px rgb(var(--color-text-primary) / 0.1)',
        }}
      >
        {yearGroup.year}
      </h3>

      <ul className="space-y-4">
        {yearGroup.items.map((item, index) => (
          <JottingsItemComponent key={`${yearGroup.year}-${index}`} item={item} />
        ))}
      </ul>
    </div>
  )
}

function JottingsItemComponent({ item }: { item: JottingsItem }) {
  const [isVisible, setIsVisible] = useState(false)
  const itemRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    const element = itemRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true)
        }
      },
      {
        threshold: 0.1,
        rootMargin: '0px',
      },
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [isVisible])

  return (
    <motion.li
      ref={itemRef}
      className="flex items-start space-x-2"
      initial={{ opacity: 0, x: -32 }}
      animate={isVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: -32 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <span className="shrink-0 text-text-secondary text-sm mt-[0.125rem]">
        {formatDate(item.date)}
      </span>
      <div className="flex-1">
        <p className="cursor-default underline decoration-transparent decoration-2 underline-offset-2 transition-all duration-300 ease-out hover:decoration-accent whitespace-pre-wrap">
          {item.text}
        </p>

        {(item.from || item.author) && (
          <p className="mt-1 text-sm text-text-secondary text-right">
            {item.from && <span>—— {item.from}</span>}
            {item.author && (
              <span>
                {item.from ? ',' : '—— '}
                {item.author}
              </span>
            )}
          </p>
        )}
      </div>
    </motion.li>
  )
}

function formatDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}/${day}`
}
