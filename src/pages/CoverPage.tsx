import { useNavigate } from 'react-router-dom';
import { animated } from '@react-spring/web';
import { useHorizontalSwipe } from '../hooks/useHorizontalSwipe';
import { useStampAnimation } from '../hooks/useStampAnimation';
import { HandwritingText } from '../components/HandwritingText';

import './cover.css';

export function CoverPage() {
  const navigate = useNavigate();

  const stampAnimation = useStampAnimation({
    delayMs: 2000,
    baseTransform: 'translateX(-50%)',
    finalRotationDeg: -19,
  });

  const swipeHandlers = useHorizontalSwipe({
    onSwipeLeft: () => navigate('/protocol'),
  });

  const handleClick = () => {
    navigate('/protocol');
  };

  return (
    <section className="invitation-screen cover-screen" {...swipeHandlers}>
      <p className="cover-title">личное дело</p>

      <p className="cover-case-number">
        <span className="cover-case-prefix">№</span>
        <HandwritingText
          text="001"
          className="cover-case-script"
          durationMs={1400}
          delayMs={200}
          steps={6}
        />
        <span className="cover-case-line" aria-hidden />
      </p>

      <p className="cover-description">
        О задержании гражданки
        <br />
        с целью последующего
        <br />
        бракосочетания
      </p>

      <animated.button
        type="button"
        className="cover-open-button"
        onClick={handleClick}
        style={stampAnimation.style}
      >
        Открыть дело
      </animated.button>

      <img className="cover-heart-placeholder" src="/images/heart.webp" alt="" aria-hidden />
      <p className="cover-swipe-hint">свайп влево</p>
    </section>
  );
}
