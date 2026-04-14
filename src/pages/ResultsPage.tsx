import { useMemo, useState } from 'react';
import { useSurveyResults } from '../hooks/useSurveyResults';
import './results.css';

export function ResultsPage() {
  const { rows, status, message, reload, deleteResultById } = useSurveyResults();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteStatusMessage, setDeleteStatusMessage] = useState('');
  const [deleteStatusType, setDeleteStatusType] = useState<'success' | 'error' | 'idle'>('idle');

  const stats = useMemo(() => {
    let confirmed = 0;
    let declined = 0;
    let unsure = 0;
    let other = 0;

    for (const row of rows) {
      if (row.decision === 'Приду') {
        confirmed += 1;
        continue;
      }

      if (row.decision === 'Не приду') {
        declined += 1;
        continue;
      }

      if (row.decision === 'Затрудняюсь ответить') {
        unsure += 1;
        continue;
      }

      other += 1;
    }

    return {
      total: rows.length,
      confirmed,
      declined,
      unsure,
      other,
    };
  }, [rows]);

  const handleDeleteResult = async (rowId: string, rowName: string) => {
    const enteredPassword = window.prompt('Введите пароль для удаления записи:');

    if (enteredPassword === null) {
      return;
    }

    const password = enteredPassword.trim();

    if (!password) {
      setDeleteStatusType('error');
      setDeleteStatusMessage('Пароль не введен.');
      return;
    }

    const isConfirmed = window.confirm(`Удалить запись «${rowName}»?`);

    if (!isConfirmed) {
      return;
    }

    setDeletingId(rowId);
    setDeleteStatusType('idle');
    setDeleteStatusMessage('');

    const result = await deleteResultById(rowId, password);

    setDeletingId(null);

    if (result.ok) {
      setDeleteStatusType('success');
      setDeleteStatusMessage('Запись удалена.');
      return;
    }

    setDeleteStatusType('error');
    setDeleteStatusMessage(result.message ?? 'Не удалось удалить запись.');
  };

  return (
    <section className="invitation-screen results-screen">
      <header className="results-header">
        <h1 className="results-title">РЕЗУЛЬТАТЫ ОТВЕТОВ</h1>
        <p className="results-subtitle">Имя и решение по приглашению</p>
      </header>

      <div className="results-actions">
        <button
          type="button"
          className="results-action"
          onClick={() => {
            void reload();
          }}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Обновление...' : 'Обновить'}
        </button>
      </div>

      {status === 'error' && <p className="results-status results-status--error">{message}</p>}
      {status === 'loading' && <p className="results-status">Загружаем ответы...</p>}
      {status === 'success' && rows.length === 0 && (
        <p className="results-status">Пока нет отправленных ответов.</p>
      )}
      {deleteStatusMessage && deleteStatusType !== 'idle' && (
        <p
          className={`results-status ${
            deleteStatusType === 'success' ? 'results-status--success' : 'results-status--error'
          }`}
        >
          {deleteStatusMessage}
        </p>
      )}

      {rows.length > 0 && (
        <>
          <section className="results-summary" aria-label="Сводка ответов">
            <p className="results-summary-total">
              Всего проголосовало: <strong>{stats.total}</strong>
            </p>
            <div className="results-summary-grid">
              <p className="results-summary-item">
                <span>Приду</span>
                <strong>{stats.confirmed}</strong>
              </p>
              <p className="results-summary-item">
                <span>Не приду</span>
                <strong>{stats.declined}</strong>
              </p>
              <p className="results-summary-item">
                <span>Затрудняюсь</span>
                <strong>{stats.unsure}</strong>
              </p>
              {stats.other > 0 && (
                <p className="results-summary-item">
                  <span>Другое</span>
                  <strong>{stats.other}</strong>
                </p>
              )}
            </div>
          </section>

          <div className="results-table-shell">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Имя</th>
                  <th>Решение</th>
                  <th className="results-table-delete-head">Удалить</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.decision}</td>
                    <td className="results-table-delete-cell">
                      <button
                        type="button"
                        className="results-delete-button"
                        aria-label={`Удалить запись ${row.name}`}
                        onClick={() => {
                          void handleDeleteResult(row.id, row.name);
                        }}
                        disabled={deletingId === row.id}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="18"
                          height="18"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M3 6h18" />
                          <path d="M8 6V4h8v2" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 10v6" />
                          <path d="M14 10v6" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
