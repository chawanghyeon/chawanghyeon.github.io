import React from 'react'
import { BaseComponentProps } from '../../lib/types'

interface StatsCardProps extends BaseComponentProps {
  title: string
  items: Array<{
    label: string
    value: number | string
    detail?: string
  }>
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  items,
  className = '',
  children,
  ...props
}) => {
  const classes = [
    'bg-[var(--surface)] border border-[var(--border)] p-3 rounded-lg',
    className
  ].filter(Boolean).join(' ')

  return (
    <div className={classes} {...props}>
      <h3 className="text-sm font-semibold mb-3 text-gray-700">{title}</h3>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <span className="text-[var(--muted)]">{item.label}:</span>
            <span className="font-medium">{item.value}</span>
            {item.detail && (
              <span className="text-xs text-[var(--muted)]">{item.detail}</span>
            )}
          </div>
        ))}
      </div>
      {children && (
        <div className="mt-3 pt-3 border-t border-[var(--border)]">
          {children}
        </div>
      )}
    </div>
  )
}

export default StatsCard
