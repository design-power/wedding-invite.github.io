import { useCallback, useEffect, useState } from 'react';

type UseInViewAnimationOptions = {
  root?: Element | Document | null;
  rootMargin?: string;
  threshold?: number | number[];
  once?: boolean;
  enabled?: boolean;
};

type UseInViewAnimationResult<T extends Element> = {
  ref: (node: T | null) => void;
  isInView: boolean;
  hasEntered: boolean;
  isActive: boolean;
};

export function useInViewAnimation<T extends Element = HTMLElement>({
  root = null,
  rootMargin = '0px',
  threshold = 0.25,
  once = true,
  enabled = true,
}: UseInViewAnimationOptions = {}): UseInViewAnimationResult<T> {
  const [node, setNode] = useState<T | null>(null);
  const [isInView, setIsInView] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);

  const ref = useCallback((target: T | null) => {
    setNode(target);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsInView(false);
      setHasEntered(false);
      return;
    }

    if (!node) {
      return;
    }

    if (typeof window === 'undefined' || typeof window.IntersectionObserver === 'undefined') {
      setIsInView(true);
      setHasEntered(true);
      return;
    }

    const observer = new window.IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setIsInView(visible);

        if (visible) {
          setHasEntered(true);
          if (once) {
            observer.unobserve(entry.target);
          }
          return;
        }

        if (!once) {
          setHasEntered(false);
        }
      },
      {
        root,
        rootMargin,
        threshold,
      },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [enabled, node, once, root, rootMargin, threshold]);

  return {
    ref,
    isInView,
    hasEntered,
    isActive: once ? hasEntered : isInView,
  };
}
