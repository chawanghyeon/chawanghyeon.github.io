export default function confirmAndRun(message: string, fn: () => void) {
  if (typeof window === 'undefined') return
  if (window.confirm(message)) {
    try {
      fn()
    } catch (err) {
      // swallow to avoid breaking UI
      console.error('confirmAndRun error', err)
    }
  }
}
