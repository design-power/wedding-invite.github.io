import { useCallback, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/$/, '');
const WITNESS_FORM_STORAGE_KEY = 'wedding_invite_witness_form_submission:v2';
const LEGACY_SUBMITTED_STORAGE_KEY = 'wedding_invite_witness_form_submitted:v1';

const hasWindow = () => typeof window !== 'undefined';
const getApiUrl = (path: string) => (API_BASE_URL ? API_BASE_URL + path : path);

const normalizeName = (value: unknown) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/\s+/g, ' ');
};

const normalizeResponseId = (value: unknown) => {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    return 0;
  }

  return numericValue;
};

export type ConfirmationValue = 'yes' | 'no' | 'maybe';

const normalizeConfirmationValue = (value: unknown): ConfirmationValue | '' => {
  if (typeof value !== 'string') {
    return '';
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === 'yes' || normalized === 'no' || normalized === 'maybe') {
    return normalized;
  }

  return '';
};

type StoredWitnessSubmission = {
  id: number;
  name: string;
  confirmation: ConfirmationValue;
  submittedAt: string;
};

type ApiRow = {
  id?: unknown;
  name?: unknown;
  confirmation?: unknown;
};

type RsvpApiResponse = {
  row?: ApiRow;
};

const clearLegacySubmittedState = () => {
  if (!hasWindow()) {
    return;
  }

  try {
    window.localStorage.removeItem(LEGACY_SUBMITTED_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup errors.
  }
};

const clearSubmissionStorage = () => {
  if (!hasWindow()) {
    return;
  }

  try {
    window.localStorage.removeItem(WITNESS_FORM_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup errors.
  }
};

const readSubmissionFromStorage = (): StoredWitnessSubmission | null => {
  if (!hasWindow()) {
    return null;
  }

  clearLegacySubmittedState();

  try {
    const rawValue = window.localStorage.getItem(WITNESS_FORM_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<StoredWitnessSubmission>;
    const id = normalizeResponseId(parsed.id);
    const name = normalizeName(parsed.name);
    const confirmation = normalizeConfirmationValue(parsed.confirmation);

    if (!id || !name || !confirmation) {
      return null;
    }

    return {
      id,
      name,
      confirmation,
      submittedAt:
        typeof parsed.submittedAt === 'string' && parsed.submittedAt
          ? parsed.submittedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
};

const writeSubmissionToStorage = (submission: StoredWitnessSubmission) => {
  if (!hasWindow()) {
    return;
  }

  try {
    window.localStorage.setItem(WITNESS_FORM_STORAGE_KEY, JSON.stringify(submission));
  } catch {
    // Ignore storage write errors.
  }
};

const readSubmissionFromPayload = (
  row: ApiRow | undefined,
  fallbackName: string,
  fallbackConfirmation: ConfirmationValue,
): StoredWitnessSubmission | null => {
  const id = normalizeResponseId(row?.id);
  const name = normalizeName(row?.name) || fallbackName;
  const confirmation = normalizeConfirmationValue(row?.confirmation) || fallbackConfirmation;

  if (!id || !name || !confirmation) {
    return null;
  }

  return {
    id,
    name,
    confirmation,
    submittedAt: new Date().toISOString(),
  };
};

const createSubmissionRequest = (name: string, confirmation: ConfirmationValue) =>
  fetch(getApiUrl('/api/rsvp'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      confirmation,
    }),
  });

const updateSubmissionRequest = (responseId: number, name: string, confirmation: ConfirmationValue) =>
  fetch(getApiUrl(`/api/rsvp/${responseId}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      confirmation,
    }),
  });

export type FormSubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

export function useProtocolWitnessForm() {
  const [storedSubmission, setStoredSubmission] = useState<StoredWitnessSubmission | null>(() =>
    readSubmissionFromStorage(),
  );
  const [nameValue, setNameValue] = useState(() => storedSubmission?.name ?? '');
  const [confirmationValue, setConfirmationValue] = useState<ConfirmationValue | ''>(
    () => storedSubmission?.confirmation ?? '',
  );
  const [isEditingAnswer, setIsEditingAnswer] = useState(false);
  const [formSubmitStatus, setFormSubmitStatus] = useState<FormSubmitStatus>(() =>
    storedSubmission ? 'success' : 'idle',
  );
  const [formSubmitMessage, setFormSubmitMessage] = useState(() =>
    storedSubmission ? 'Ответ сохранен. Если нужно, можно изменить данные.' : '',
  );

  const hasStoredSubmission = Boolean(storedSubmission);

  const handleSubmitWitnessForm = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const trimmedName = normalizeName(nameValue);
      const selectedConfirmation = normalizeConfirmationValue(confirmationValue);
      const isUpdateRequest = hasStoredSubmission && isEditingAnswer && storedSubmission;

      if (!trimmedName) {
        setFormSubmitStatus('error');
        setFormSubmitMessage('Заполните ФИО.');
        return;
      }

      if (!selectedConfirmation) {
        setFormSubmitStatus('error');
        setFormSubmitMessage('Выберите один из вариантов ответа.');
        return;
      }

      setFormSubmitStatus('submitting');
      setFormSubmitMessage('');

      try {
        let response: Response;
        let hasFallbackCreate = false;

        if (isUpdateRequest) {
          response = await updateSubmissionRequest(
            storedSubmission.id,
            trimmedName,
            selectedConfirmation,
          );

          // Local storage may point to a deleted DB row. Recreate the response instead of failing.
          if (response.status === 404) {
            clearSubmissionStorage();
            response = await createSubmissionRequest(trimmedName, selectedConfirmation);
            hasFallbackCreate = true;
          }
        } else {
          response = await createSubmissionRequest(trimmedName, selectedConfirmation);
        }

        if (!response.ok) {
          const responseText = await response.text();
          throw new Error(responseText || 'HTTP ' + response.status);
        }

        const payload = (await response.json()) as RsvpApiResponse;
        const nextSubmission = readSubmissionFromPayload(payload.row, trimmedName, selectedConfirmation);

        if (!nextSubmission) {
          throw new Error('Invalid API payload');
        }

        writeSubmissionToStorage(nextSubmission);
        setStoredSubmission(nextSubmission);
        setNameValue(nextSubmission.name);
        setConfirmationValue(nextSubmission.confirmation);
        setIsEditingAnswer(false);
        setFormSubmitStatus('success');
        setFormSubmitMessage(
          hasFallbackCreate
            ? 'Предыдущая запись не найдена. Создали новую и сохранили данные.'
            : isUpdateRequest
              ? 'Ответ обновлен.'
              : 'Спасибо! Ответ отправлен.',
        );
      } catch (error) {
        console.error('RSVP submit failed:', error);
        setFormSubmitStatus('error');
        setFormSubmitMessage('Не удалось отправить форму. Попробуйте еще раз позже.');
      }
    },
    [confirmationValue, hasStoredSubmission, isEditingAnswer, nameValue, storedSubmission],
  );

  const handleNameChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setNameValue(event.currentTarget.value);
  }, []);

  const handleConfirmationChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = normalizeConfirmationValue(event.currentTarget.value);

    if (!nextValue) {
      return;
    }

    setConfirmationValue(nextValue);
  }, []);

  const startEditingAnswer = useCallback(() => {
    if (!storedSubmission) {
      return;
    }

    setNameValue(storedSubmission.name);
    setConfirmationValue(storedSubmission.confirmation);
    setIsEditingAnswer(true);
    setFormSubmitStatus('idle');
    setFormSubmitMessage('');
  }, [storedSubmission]);

  const cancelEditingAnswer = useCallback(() => {
    if (!storedSubmission) {
      return;
    }

    setNameValue(storedSubmission.name);
    setConfirmationValue(storedSubmission.confirmation);
    setIsEditingAnswer(false);
    setFormSubmitStatus('success');
    setFormSubmitMessage('Ответ сохранен. Если нужно, можно изменить данные.');
  }, [storedSubmission]);

  const shouldShowNameField = !hasStoredSubmission || isEditingAnswer;
  const shouldShowDecisionFields = !hasStoredSubmission || isEditingAnswer;
  const shouldShowSubmitButton = !hasStoredSubmission || isEditingAnswer;
  const shouldShowEditButton = hasStoredSubmission && !isEditingAnswer;

  return {
    formSubmitStatus,
    formSubmitMessage,
    handleSubmitWitnessForm,
    nameValue,
    confirmationValue,
    shouldShowNameField,
    shouldShowDecisionFields,
    shouldShowSubmitButton,
    shouldShowEditButton,
    isEditingAnswer,
    handleNameChange,
    handleConfirmationChange,
    startEditingAnswer,
    cancelEditingAnswer,
  };
}
