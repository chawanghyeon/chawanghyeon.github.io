import React from 'react'
import { createPortal } from 'react-dom'

type Props = {
  anchorRect: DOMRect | null
  anchorEl?: HTMLElement | null
  children: React.ReactNode
  onClose?: () => void
}

const MenuPortal: React.FC<Props> = ({ anchorRect, anchorEl, children, onClose }) => {
  const elRef = React.useRef<HTMLDivElement | null>(null)
  if (!elRef.current && typeof document !== 'undefined') elRef.current = document.createElement('div')

  const menuRef = React.useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null)

  React.useEffect(() => {
    const el = elRef.current!
    if (!el) return
    document.body.appendChild(el)
    return () => { if (el.parentElement) el.parentElement.removeChild(el) }
  }, [])

  // Compute and clamp the menu position based on the anchor and the menu size.
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const compute = () => {
      const el = menuRef.current
      // prefer anchorEl if provided, otherwise use anchorRect
      const rect = anchorEl ? anchorEl.getBoundingClientRect() : anchorRect
      if (!rect || !el) {
        setPos(null)
        return
      }
      const anchor = rect as DOMRect
      const scrollX = window.scrollX || 0
      const scrollY = window.scrollY || 0
      const vw = window.innerWidth
      const vh = window.innerHeight
      const mw = el.offsetWidth
      const mh = el.offsetHeight
      const margin = 6

      // default: place below the anchor
      let left = anchor.left + scrollX
      let top = anchor.bottom + scrollY + margin

      // clamp horizontally to viewport with margin
      const maxLeft = scrollX + vw - mw - margin
      left = Math.max(scrollX + margin, Math.min(left, maxLeft))

      // if it would overflow the bottom, try placing above the anchor
      const maxTop = scrollY + vh - mh - margin
      if (top > maxTop) {
        const aboveTop = anchor.top + scrollY - mh - margin
        top = Math.max(scrollY + margin, Math.min(aboveTop, maxTop))
      }

      setPos({ top, left })
    }

    // compute initially and on resize/scroll
    compute()
    const onResize = () => compute()
    window.addEventListener('resize', onResize)
    // use capture so scroll events from nested containers are caught
    window.addEventListener('scroll', onResize, true)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
    }
  }, [anchorRect, anchorEl, children])

  // Add outside-click handler to close the portal when clicking outside
  React.useEffect(() => {
    const el = elRef.current
    if (!el || !onClose) return
    // attach after current event loop to avoid catching the click that opened the menu
    const handle = (e: MouseEvent) => {
      const target = e.target as Node | null
      if (!target) return
      // if click is outside the menu element, close
      if (menuRef.current && !menuRef.current.contains(target)) {
        onClose()
      }
    }
    const t = setTimeout(() => document.addEventListener('mousedown', handle), 0)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', handle)
    }
  }, [onClose])

  // Keyboard navigation: focus first focusable element on mount and handle ESC/Arrows
  React.useEffect(() => {
    const el = menuRef.current
    if (!el) return
    // focus first focusable element
    const focusable = el.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    if (focusable.length > 0) {
      focusable[0].focus()
    } else {
      el.focus()
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onClose) onClose()
        return
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const nodes = Array.from(focusable) as HTMLElement[]
        if (nodes.length === 0) return
        const idx = nodes.indexOf(document.activeElement as HTMLElement)
        let next = 0
        if (e.key === 'ArrowDown') next = idx < nodes.length - 1 ? idx + 1 : 0
        else next = idx > 0 ? idx - 1 : nodes.length - 1
        nodes[next].focus()
      }
      if (e.key === 'Enter') {
        const active = document.activeElement as HTMLElement | null
        if (active && active.click) active.click()
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  if (!elRef.current) return null

  const style: React.CSSProperties = pos ? {
    position: 'absolute',
    top: pos.top,
    left: pos.left,
    zIndex: 9999
  } : { position: 'absolute', visibility: 'hidden' }

  return createPortal(
    <div ref={menuRef} style={style}>
      {children}
    </div>,
    elRef.current
  )
}

export default MenuPortal
