'use client'

import { useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react'

type DragStart = {
  pointerId: number
  x: number
  y: number
  width: number
  height: number
  layoutWidth: number
  horizontal: boolean
}

export default function MfhResizeHandle({
  layoutRef, panelWidth, height, onResize,
}: {
  layoutRef: RefObject<HTMLDivElement>
  panelWidth: number
  height: number
  onResize: (width: number, height: number) => void
}) {
  const dragRef = useRef<DragStart | null>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    if (!dragging) return
    const { cursor, userSelect } = document.body.style
    document.body.style.cursor = dragRef.current?.horizontal ? 'nesw-resize' : 'ns-resize'
    document.body.style.userSelect = 'none'
    return () => {
      document.body.style.cursor = cursor
      document.body.style.userSelect = userSelect
    }
  }, [dragging])

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0) return
    const layoutWidth = layoutRef.current?.getBoundingClientRect().width ?? 0
    if (!layoutWidth) return
    event.preventDefault()
    const horizontal = window.matchMedia('(min-width: 1280px)').matches
    const cardWidth = event.currentTarget.parentElement!.getBoundingClientRect().width
    dragRef.current = {
      pointerId: event.pointerId, x: event.clientX, y: event.clientY,
      width: horizontal ? cardWidth / layoutWidth * 100 : panelWidth,
      height, layoutWidth, horizontal,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
  }

  function stopDrag(event: PointerEvent<HTMLButtonElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <button
      type="button"
      aria-label="Resize Money Flow Horizon chart"
      title="Drag this corner to resize. You can also use the arrow keys."
      className={`absolute bottom-0 right-0 z-10 flex h-8 w-8 touch-none select-none items-center justify-center rounded-br-xl text-gray-500 cursor-ns-resize hover:bg-blue-100 hover:text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:hover:bg-blue-950 xl:left-0 xl:right-auto xl:rounded-br-none xl:rounded-bl-xl xl:cursor-nesw-resize ${dragging ? 'bg-blue-100 text-blue-600 dark:bg-blue-950' : ''}`}
      onPointerDown={startDrag}
      onPointerMove={(event) => {
        const start = dragRef.current
        if (!start || start.pointerId !== event.pointerId) return
        // Stop if a window resize moves the panel into or out of the desktop grid.
        if (start.horizontal !== window.matchMedia('(min-width: 1280px)').matches) {
          stopDrag(event)
          return
        }
        const width = start.horizontal
          ? start.width + (start.x - event.clientX) / start.layoutWidth * 100
          : start.width
        onResize(width, start.height + event.clientY - start.y)
      }}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onLostPointerCapture={stopDrag}
      onKeyDown={(event) => {
        const horizontal = window.matchMedia('(min-width: 1280px)').matches
        const step = event.shiftKey ? 5 : 1
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          event.preventDefault()
          onResize(panelWidth, height + (event.key === 'ArrowDown' ? 10 : -10) * step)
        } else if (horizontal && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
          event.preventDefault()
          onResize(panelWidth + (event.key === 'ArrowLeft' ? step : -step), height)
        }
      }}
    >
      <span aria-hidden="true" className="pointer-events-none flex -rotate-45 flex-col items-center gap-[3px] xl:rotate-45">
        <span className="w-4 border-t-2 border-current" />
        <span className="w-2.5 border-t-2 border-current" />
        <span className="w-1 border-t-2 border-current" />
      </span>
    </button>
  )
}
