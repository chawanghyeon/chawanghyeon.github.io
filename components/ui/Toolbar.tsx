import React from 'react'
import { BaseComponentProps } from '../../lib/types'

interface ToolbarProps extends BaseComponentProps {
  children: React.ReactNode
}

const Toolbar: React.FC<ToolbarProps> = ({
  children,
  className = '',
  ...props
}) => {
  const classes = [
    'bg-[var(--surface)] border border-[var(--border)] p-2.5 rounded-lg mb-3.5',
    className
  ].filter(Boolean).join(' ')

  return (
    <div className={classes} {...props}>
      <div className="flex gap-3 items-center justify-between flex-wrap">
        {children}
      </div>
    </div>
  )
}

export default Toolbar
