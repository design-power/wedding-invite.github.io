import { to, useSpring } from '@react-spring/web';
import { useEffect, useMemo, useRef } from 'react';

type UseStampAnimationOptions = {
  enabled?: boolean;
  delayMs?: number;
  baseTransform?: string;
  finalRotationDeg?: number;
};

export function useStampAnimation({
  enabled = true,
  delayMs = 1000,
  baseTransform = '',
  finalRotationDeg = -19,
}: UseStampAnimationOptions = {}) {
  const preparedBaseTransform = useMemo(() => baseTransform.trim(), [baseTransform]);
  const initialRotationDeg = finalRotationDeg - 11;
  const impactRotationDeg = finalRotationDeg + 3;
  const hiddenState = useMemo(
    () => ({
      opacity: 0,
      y: -38,
      scale: 1.45,
      rotation: initialRotationDeg,
      blur: 6,
    }),
    [initialRotationDeg],
  );

  const [spring, api] = useSpring(() => hiddenState);
  const apiRef = useRef(api);
  const hasPlayedRef = useRef(false);

  apiRef.current = api;

  useEffect(() => {
    const springApi = apiRef.current;

    if (!enabled || hasPlayedRef.current) {
      return;
    }

    let isCancelled = false;
    const timer = window.setTimeout(
      () => {
        void (async () => {
          if (isCancelled || hasPlayedRef.current) {
            return;
          }

          await springApi.start({
            opacity: 1,
            y: 2,
            scale: 0.94,
            rotation: impactRotationDeg,
            blur: 0,
            config: {
              tension: 760,
              friction: 24,
              mass: 0.7,
            },
          });

          if (isCancelled) {
            return;
          }

          await springApi.start({
            opacity: 1,
            y: 0,
            scale: 1,
            rotation: finalRotationDeg,
            blur: 0,
            config: {
              tension: 460,
              friction: 19,
              mass: 0.9,
            },
          });

          if (!isCancelled) {
            hasPlayedRef.current = true;
          }
        })();
      },
      Math.max(delayMs, 0),
    );

    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
      springApi.stop();
    };
  }, [delayMs, enabled, finalRotationDeg, impactRotationDeg]);

  return {
    style: {
      opacity: spring.opacity,
      filter: spring.blur.to((blur) => `blur(${blur}px)`),
      transform: to([spring.y, spring.scale, spring.rotation], (y, scale, rotation) => {
        const motionTransform = `translateY(${y}px) rotate(${rotation}deg) scale(${scale})`;
        return preparedBaseTransform
          ? `${preparedBaseTransform} ${motionTransform}`
          : motionTransform;
      }),
    },
  };
}
