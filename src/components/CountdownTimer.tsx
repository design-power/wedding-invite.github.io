import { useEffect, useState } from 'react';

import './countdown-timer.css';

type CountdownTimerProps = {
  singleDate: number;
};

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
};

function getTimeLeft(targetTimestamp: number): TimeLeft {
  const diff = Math.max(0, targetTimestamp - Date.now());
  const totalMinutes = Math.floor(diff / 1000 / 60);

  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return { days, hours, minutes };
}

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

function plural(value: number, forms: [string, string, string]): string {
  const absValue = Math.abs(value) % 100;
  const lastDigit = absValue % 10;

  if (absValue > 10 && absValue < 20) {
    return forms[2];
  }

  if (lastDigit > 1 && lastDigit < 5) {
    return forms[1];
  }

  if (lastDigit === 1) {
    return forms[0];
  }

  return forms[2];
}

export function CountdownTimer({ singleDate }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => getTimeLeft(singleDate));

  useEffect(() => {
    const update = (): void => {
      setTimeLeft(getTimeLeft(singleDate));
    };

    update();

    const timerId = window.setInterval(update, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [singleDate]);

  return (
    <section className="protocol-block protocol-timer">
      <div className="timer">
        <div className="timer-cell">
          <span className="timer-number">{timeLeft.days}</span>
          <span className="timer-text">{plural(timeLeft.days, ['День', 'Дня', 'Дней'])}</span>
        </div>
        <span className="timer-divider" />
        <div className="timer-cell">
          <span className="timer-number">{pad2(timeLeft.hours)}</span>
          <span className="timer-text">{plural(timeLeft.hours, ['Час', 'Часа', 'Часов'])}</span>
        </div>
        <span className="timer-divider" />
        <div className="timer-cell">
          <span className="timer-number">{pad2(timeLeft.minutes)}</span>
          <span className="timer-text">{plural(timeLeft.minutes, ['Минута', 'Минуты', 'Минут'])}</span>
        </div>
      </div>
    </section>
  );
}
