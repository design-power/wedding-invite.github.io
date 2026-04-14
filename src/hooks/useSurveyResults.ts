import { useCallback, useEffect, useState } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/$/, '');

export type SurveyResultRow = {
  id: string;
  name: string;
  decision: string;
  createdAt: string;
};

export type SurveyResultsStatus = 'idle' | 'loading' | 'success' | 'error';

type ApiResultRow = {
  id?: string | number;
  name?: unknown;
  confirmation?: unknown;
  created_at?: unknown;
  createdAt?: unknown;
};

type ApiResultsResponse = {
  rows?: ApiResultRow[];
};

export type DeleteResultResponse = {
  ok: boolean;
  message?: string;
};

const getApiUrl = (path: string) => (API_BASE_URL ? API_BASE_URL + path : path);

const normalizeText = (value: unknown) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/\s+/g, ' ');
};

const normalizeDecision = (value: unknown) => {
  const normalized = normalizeText(String(value ?? ''));
  const raw = normalized.toLowerCase();

  if (!raw) {
    return 'Не указано';
  }

  if (raw === 'yes' || raw === 'true' || raw === 'приду' || raw === 'да') {
    return 'Приду';
  }

  if (raw === 'no' || raw === 'false' || raw === 'не приду' || raw === 'нет') {
    return 'Не приду';
  }

  if (raw === 'maybe' || raw === 'unknown' || raw === 'затрудняюсь' || raw === 'затрудняюсь ответить') {
    return 'Затрудняюсь ответить';
  }

  return normalized;
};

const toRows = (rows: ApiResultRow[]): SurveyResultRow[] =>
  rows
    .map((row, index) => {
      const createdAtCandidate = row.created_at ?? row.createdAt;
      const createdAt = typeof createdAtCandidate === 'string' ? createdAtCandidate : '';

      return {
        id: String(row.id ?? index),
        name: normalizeText(String(row.name ?? '')) || 'Не указано',
        decision: normalizeDecision(row.confirmation),
        createdAt,
      };
    })
    .sort((left, right) => {
      const leftDate = left.createdAt ? Date.parse(left.createdAt) : 0;
      const rightDate = right.createdAt ? Date.parse(right.createdAt) : 0;
      return rightDate - leftDate;
    });

const normalizeRowId = (rowId: string) => {
  const numericId = Number(rowId);

  if (!Number.isInteger(numericId) || numericId <= 0) {
    return 0;
  }

  return numericId;
};

export function useSurveyResults() {
  const [rows, setRows] = useState<SurveyResultRow[]>([]);
  const [status, setStatus] = useState<SurveyResultsStatus>('idle');
  const [message, setMessage] = useState('');

  const loadResults = useCallback(async () => {
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch(getApiUrl('/api/results'), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(responseText || 'HTTP ' + response.status);
      }

      const payload = (await response.json()) as ApiResultsResponse;
      const apiRows = Array.isArray(payload.rows) ? payload.rows : [];

      setRows(toRows(apiRows));
      setStatus('success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось загрузить ответы.';
      setStatus('error');
      setMessage(errorMessage);
    }
  }, []);

  const deleteResultById = useCallback(async (rowId: string, password: string): Promise<DeleteResultResponse> => {
    const normalizedId = normalizeRowId(rowId);

    if (!normalizedId) {
      return {
        ok: false,
        message: 'Некорректный идентификатор записи.',
      };
    }

    try {
      const response = await fetch(getApiUrl(`/api/results/${normalizedId}`), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          password,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          return {
            ok: false,
            message: 'Неверный пароль для удаления.',
          };
        }

        if (response.status === 404) {
          return {
            ok: false,
            message: 'Запись не найдена.',
          };
        }

        const responseText = await response.text();

        return {
          ok: false,
          message: responseText || 'Не удалось удалить запись.',
        };
      }

      setRows((previousRows) => previousRows.filter((row) => row.id !== String(normalizedId)));

      return {
        ok: true,
      };
    } catch (error) {
      console.error('Delete result failed:', error);

      return {
        ok: false,
        message: 'Не удалось удалить запись. Попробуйте снова.',
      };
    }
  }, []);

  useEffect(() => {
    void loadResults();
  }, [loadResults]);

  return {
    rows,
    status,
    message,
    reload: loadResults,
    deleteResultById,
  };
}
