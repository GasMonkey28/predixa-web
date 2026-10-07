import { isInLocalRefreshWindow, startAutoRefresh, SUMMARY_REFRESH_WINDOW } from '../local-refresh-window'

describe('Summary morning auto-refresh', () => {
  let visibility: 'visible' | 'hidden'
  let events: EventTarget
  let cleanup: (() => void) | undefined

  beforeEach(() => {
    jest.useFakeTimers()
    visibility = 'visible'
    events = new EventTarget()
    Object.defineProperty(globalThis, 'window', { configurable: true, value: {
      setInterval: (callback: () => void, ms: number) => setInterval(callback, ms),
      clearInterval: (id: ReturnType<typeof setInterval>) => clearInterval(id),
    } })
    Object.defineProperty(globalThis, 'document', { configurable: true, value: {
      get visibilityState() { return visibility },
      addEventListener: events.addEventListener.bind(events),
      removeEventListener: events.removeEventListener.bind(events),
    } })
  })

  afterEach(() => {
    cleanup?.()
    cleanup = undefined
    Reflect.deleteProperty(globalThis, 'window')
    Reflect.deleteProperty(globalThis, 'document')
    jest.useRealTimers()
  })

  it.each([
    [7, 59, 59, false], [8, 0, 0, true], [8, 30, 0, true],
    [8, 59, 59, true], [9, 0, 0, false], [20, 30, 0, false],
  ])('uses the local clock at %i:%i:%i', (hour, minute, second, expected) => {
    // Construct a device-local Date rather than assuming UTC or a fixed offset.
    expect(isInLocalRefreshWindow(new Date(2026, 9, 7, hour, minute, second), SUMMARY_REFRESH_WINDOW)).toBe(expected)
  })

  it('starts when a tab opened before 8 reaches the window and stops at 9', () => {
    jest.setSystemTime(new Date(2026, 9, 7, 7, 59, 0))
    const refresh = jest.fn()
    cleanup = startAutoRefresh(refresh, 30_000, SUMMARY_REFRESH_WINDOW)
    jest.advanceTimersByTime(30_000)
    expect(refresh).not.toHaveBeenCalled()
    jest.advanceTimersByTime(30_000)
    expect(refresh).toHaveBeenCalledTimes(1)
    jest.advanceTimersByTime(30_000)
    expect(refresh).toHaveBeenCalledTimes(2)
    jest.setSystemTime(new Date(2026, 9, 7, 8, 59, 30))
    jest.advanceTimersByTime(30_000)
    expect(refresh).toHaveBeenCalledTimes(2)
  })

  it('pauses when hidden and refreshes immediately on returning inside the window', () => {
    jest.setSystemTime(new Date(2026, 9, 7, 8, 30))
    const refresh = jest.fn()
    cleanup = startAutoRefresh(refresh, 30_000, SUMMARY_REFRESH_WINDOW)
    visibility = 'hidden'
    jest.advanceTimersByTime(60_000)
    expect(refresh).not.toHaveBeenCalled()
    visibility = 'visible'
    events.dispatchEvent(new Event('visibilitychange'))
    expect(refresh).toHaveBeenCalledTimes(1)
    jest.setSystemTime(new Date(2026, 9, 7, 9, 1))
    events.dispatchEvent(new Event('visibilitychange'))
    jest.advanceTimersByTime(30_000)
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('resumes the next morning on a page left open overnight', () => {
    jest.setSystemTime(new Date(2026, 9, 7, 9, 30))
    const refresh = jest.fn()
    cleanup = startAutoRefresh(refresh, 30_000, SUMMARY_REFRESH_WINDOW)
    jest.advanceTimersByTime(30_000)
    expect(refresh).not.toHaveBeenCalled()
    jest.setSystemTime(new Date(2026, 9, 8, 8, 0))
    jest.advanceTimersByTime(30_000)
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('removes both the timer and visibility listener on cleanup', () => {
    jest.setSystemTime(new Date(2026, 9, 7, 8, 30))
    const refresh = jest.fn()
    cleanup = startAutoRefresh(refresh, 30_000, SUMMARY_REFRESH_WINDOW)
    cleanup()
    jest.advanceTimersByTime(60_000)
    events.dispatchEvent(new Event('visibilitychange'))
    expect(refresh).not.toHaveBeenCalled()
  })

  it('preserves existing all-day refresh for consumers without a time window', () => {
    jest.setSystemTime(new Date(2026, 9, 7, 15, 0))
    const refresh = jest.fn()
    cleanup = startAutoRefresh(refresh, 30_000)
    jest.advanceTimersByTime(30_000)
    events.dispatchEvent(new Event('visibilitychange'))
    expect(refresh).toHaveBeenCalledTimes(2)
  })
})
