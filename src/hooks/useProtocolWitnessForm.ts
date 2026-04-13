import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';

const YANDEX_FORMS_SURVEY_ID = import.meta.env.VITE_YANDEX_FORMS_SURVEY_ID ?? '';
const YANDEX_FORMS_NAME_SLUG = import.meta.env.VITE_YANDEX_FORMS_NAME_SLUG ?? 'name';
const YANDEX_FORMS_CONFIRMATION_SLUG = import.meta.env.VITE_YANDEX_FORMS_CONFIRMATION_SLUG ?? 'confirmation';
const YANDEX_FORMS_KEY = import.meta.env.VITE_YANDEX_FORMS_KEY ?? '';
const YANDEX_FORMS_OAUTH_TOKEN = import.meta.env.VITE_YANDEX_FORMS_OAUTH_TOKEN ?? '';
const RAW_YANDEX_FORMS_PROXY_URL = import.meta.env.VITE_YANDEX_FORMS_PROXY_URL ?? '';
const YANDEX_FORMS_PROXY_URL =
  RAW_YANDEX_FORMS_PROXY_URL.trim() || (import.meta.env.DEV ? '/api/yandex-forms' : '');

const WITNESS_FORM_SUBMITTED_STORAGE_KEY_BASE = 'wedding_invite_witness_form_submitted';

const getFormsApiBaseUrl = () => YANDEX_FORMS_PROXY_URL.replace(/\/$/, '');
const getSubmittedStorageKey = () =>
  WITNESS_FORM_SUBMITTED_STORAGE_KEY_BASE + ':' + (YANDEX_FORMS_SURVEY_ID || 'default');

const hasWindow = () => typeof window !== 'undefined';

const readSubmittedFromStorage = (): boolean => {
  if (!hasWindow()) {
    return false;
  }

  try {
    const rawValue = window.localStorage.getItem(getSubmittedStorageKey());

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
      getSubmittedStorageKey(),
      JSON.stringify({
        submitted: true,
        submittedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // Ignore storage write errors (Safari private mode / quota).
  }
};

const ALREADY_SUBMITTED_MESSAGE =
  'Ответ уже сохранен. Повторная отправка отключена на этом устройстве.';

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

    if (!YANDEX_FORMS_SURVEY_ID) {
      setFormSubmitStatus('error');
      setFormSubmitMessage(
        'Не настроен VITE_YANDEX_FORMS_SURVEY_ID. Добавьте его в .env и перезапустите dev сервер.',
      );
      return;
    }

    if (!YANDEX_FORMS_PROXY_URL) {
      setFormSubmitStatus('error');
      setFormSubmitMessage(
        'Не настроен VITE_YANDEX_FORMS_PROXY_URL для production. Укажите URL вашего proxy/backend.',
      );
      return;
    }

    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    const fullName = String(formData.get('name') ?? '').trim();
    const confirmationRaw = String(formData.get('confirmation') ?? '').trim();

    if (!fullName || !confirmationRaw) {
      setFormSubmitStatus('error');
      setFormSubmitMessage('Заполните ФИО и выберите один из вариантов.');
      return;
    }

    setFormSubmitStatus('submitting');
    setFormSubmitMessage('');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (YANDEX_FORMS_OAUTH_TOKEN) {
      headers.Authorization = 'OAuth ' + YANDEX_FORMS_OAUTH_TOKEN;
    }

    // Yandex choice question expects an array of selected answer IDs.
    const confirmationValue = [confirmationRaw === 'yes' ? 'yes' : 'no'];

    const formsApiBaseUrl = getFormsApiBaseUrl();
    const formsKey = YANDEX_FORMS_KEY.trim();
    const submitQuery = formsKey ? '?key=' + encodeURIComponent(formsKey) : '';
    const submitUrl =
      formsApiBaseUrl + '/surveys/' + YANDEX_FORMS_SURVEY_ID + '/form' + submitQuery;

    try {
      const response = await fetch(submitUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          [YANDEX_FORMS_NAME_SLUG]: fullName,
          [YANDEX_FORMS_CONFIRMATION_SLUG]: confirmationValue,
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
      console.error('Yandex Forms submit failed:', error);
      setFormSubmitStatus('error');
      setFormSubmitMessage('Не удалось отправить форму. Проверьте настройки Yandex Forms и сеть.');
    }
  }, []);

  return {
    formSubmitStatus,
    formSubmitMessage,
    handleSubmitWitnessForm,
  };
}
