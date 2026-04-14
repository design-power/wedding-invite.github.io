import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/$/, '');
const WITNESS_FORM_SUBMITTED_STORAGE_KEY = 'wedding_invite_witness_form_submitted:v1';

const ALREADY_SUBMITTED_MESSAGE =
  'Ответ уже сохранен. Повторная отправка отключена на этом устройстве.';

const hasWindow = () => typeof window !== 'undefined';
const getApiUrl = (path: string) => (API_BASE_URL ? API_BASE_URL + path : path);

const readSubmittedFromStorage = (): boolean => {
  if (!hasWindow()) {
    return false;
  }

  try {
    const rawValue = window.localStorage.getItem(WITNESS_FORM_SUBMITTED_STORAGE_KEY);

    if (!rawValue) {
      return false;
    }

    const parsed = JSON.parse(rawValue) as { submitted?: boolean };
    return parsed.submitted === true;
  } catch {
    return false;
  }
};

const writeSubmittedToStorage = () => {
  if (!hasWindow()) {
    return;
  }

  try {
    window.localStorage.setItem(
      WITNESS_FORM_SUBMITTED_STORAGE_KEY,
      JSON.stringify({
        submitted: true,
        submittedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // Ignore storage write errors.
  }
};

export type FormSubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

export function useProtocolWitnessForm() {
  const [formSubmitStatus, setFormSubmitStatus] = useState<FormSubmitStatus>(() =>
    readSubmittedFromStorage() ? 'success' : 'idle',
  );
  const [formSubmitMessage, setFormSubmitMessage] = useState(() =>
    readSubmittedFromStorage() ? ALREADY_SUBMITTED_MESSAGE : '',
  );

  const handleSubmitWitnessForm = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (readSubmittedFromStorage()) {
      setFormSubmitStatus('success');
      setFormSubmitMessage(ALREADY_SUBMITTED_MESSAGE);
      return;
    }

    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    const fullName = String(formData.get('name') ?? '').trim();
    const confirmation = String(formData.get('confirmation') ?? '').trim();

    if (!fullName || !confirmation) {
      setFormSubmitStatus('error');
      setFormSubmitMessage('Заполните ФИО и выберите один из вариантов.');
      return;
    }

    if (confirmation !== 'yes' && confirmation !== 'no') {
      setFormSubmitStatus('error');
      setFormSubmitMessage('Выберите корректный вариант ответа.');
      return;
    }

    setFormSubmitStatus('submitting');
    setFormSubmitMessage('');

    try {
      const response = await fetch(getApiUrl('/api/rsvp'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: fullName,
          confirmation,
        }),
      });

      if (!response.ok) {
        const responseText = await response.text();

        if (response.status === 409) {
          writeSubmittedToStorage();
          setFormSubmitStatus('success');
          setFormSubmitMessage(ALREADY_SUBMITTED_MESSAGE);
          return;
        }

        throw new Error(responseText || 'HTTP ' + response.status);
      }

      formElement.reset();
      writeSubmittedToStorage();
      setFormSubmitStatus('success');
      setFormSubmitMessage('Спасибо! Ответ отправлен.');
    } catch (error) {
      console.error('RSVP submit failed:', error);
      setFormSubmitStatus('error');
      setFormSubmitMessage('Не удалось отправить форму. Попробуйте еще раз позже.');
    }
  }, []);

  return {
    formSubmitStatus,
    formSubmitMessage,
    handleSubmitWitnessForm,
  };
}
