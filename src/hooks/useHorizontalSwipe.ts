import { useRef } from 'react'
import type { TouchEventHandler } from 'react'

type UseHorizontalSwipeOptions = {
  minDistance?: number
  maxVerticalShift?: number
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
}

type SwipeHandlers = {
  onTouchStart: TouchEventHandler<HTMLElement>
  onTouchEnd: TouchEventHandler<HTMLElement>
  onTouchCancel: TouchEventHandler<HTMLElement>
}

export function useHorizontalSwipe({
  minDistance = 70,
  maxVerticalShift = 56,
  onSwipeLeft,
  onSwipeRight,
}: UseHorizontalSwipeOptions): SwipeHandlers {
  const startX = useRef<number | null>(null)
  const startY = useRef<number | null>(null)

  const reset = (): void => {
    startX.current = null
    startY.current = null
  }

  const onTouchStart: TouchEventHandler<HTMLElement> = (event) => {
    const touch = event.changedTouches[0]
    startX.current = touch.clientX
    startY.current = touch.clientY
  }

  const onTouchEnd: TouchEventHandler<HTMLElement> = (event) => {
    if (startX.current === null || startY.current === null) {
      return
    }

    const touch = event.changedTouches[0]
    const deltaX = touch.clientX - startX.current
    const deltaY = touch.clientY - startY.current
    reset()

    if (Math.abs(deltaX) < minDistance) {
      return
    }

    if (Math.abs(deltaY) > maxVerticalShift) {
      return
    }

    if (Math.abs(deltaX) < Math.abs(deltaY) * 1.2) {
      return
    }

    if (deltaX < 0) {
      onSwipeLeft?.()
      return
    }

    onSwipeRight?.()
  }

  const onTouchCancel: TouchEventHandler<HTMLElement> = () => {
    reset()
  }

  return { onTouchStart, onTouchEnd, onTouchCancel }
}
