import { useCallback, useEffect, useState } from 'react';

type UseScrollStaggerRevealOptions = {
  totalItems: number;
  startViewportRatio?: number;
  endViewportRatio?: number;
  once?: boolean;
  enabled?: boolean;
};

type UseScrollStaggerRevealResult<T extends Element> = {
  ref: (node: T | null) => void;
  visibleCount: number;
  isCompleted: boolean;
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

export function useScrollStaggerReveal<T extends Element = HTMLElement>({
  totalItems,
  startViewportRatio = 0.92,
  endViewportRatio = 0.5,
  once = true,
  enabled = true,
}: UseScrollStaggerRevealOptions): UseScrollStaggerRevealResult<T> {
  const [node, setNode] = useState<T | null>(null);
  const [visibleCount, setVisibleCount] = useState(0);

  const ref = useCallback((target: T | null) => {
    setNode(target);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setVisibleCount(0);
      return;
    }

    if (!node) {
      return;
    }

    if (typeof window === 'undefined') {
      setVisibleCount(totalItems);
      return;
    }

    const update = (): void => {
      const rect = node.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const anchorY = rect.top + rect.height / 2;
      const startY = viewportHeight * startViewportRatio;
      const endY = viewportHeight * endViewportRatio;
      const range = Math.max(startY - endY, 1);
      const progress = clamp((startY - anchorY) / range, 0, 1);
      const targetVisible = clamp(Math.ceil(progress * totalItems), 0, totalItems);

      setVisibleCount((previous) => (once ? Math.max(previous, targetVisible) : targetVisible));
    };

    update();

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [enabled, endViewportRatio, node, once, startViewportRatio, totalItems]);

  return {
    ref,
    visibleCount,
    isCompleted: visibleCount >= totalItems,
  };
}
