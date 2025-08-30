import React from 'react'
import { createPortal } from 'react-dom'

type Props = {
  anchorRect: DOMRect | null
  children: React.ReactNode
  onClose?: () => void
}

const MenuPortal: React.FC<Props> = ({ anchorRect, children }) => {
  const elRef = React.useRef<HTMLDivElement | null>(null)
  if (!elRef.current && typeof document !== 'undefined') elRef.current = document.createElement('div')

  React.useEffect(() => {
    const el = elRef.current!
    if (!el) return
    document.body.appendChild(el)
    return () => { if (el.parentElement) el.parentElement.removeChild(el) }
  }, [])

  if (!elRef.current) return null

  const style: React.CSSProperties = anchorRect ? {
    position: 'absolute',
    top: anchorRect.bottom + window.scrollY + 6,
    left: anchorRect.left + window.scrollX,
    zIndex: 9999
  } : { position: 'absolute', visibility: 'hidden' }

  return createPortal(
    <div style={style}>
      {children}
    </div>,
    elRef.current
  )
}

export default MenuPortal
