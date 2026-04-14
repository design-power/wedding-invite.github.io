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

  useEffect(() => {
    void loadResults();
  }, [loadResults]);

  return {
    rows,
    status,
    message,
    reload: loadResults,
  };
}
