import { useI18n } from '../i18n/LanguageContext';

export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  busy,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
}) {
  const { t } = useI18n();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
      >
        <h2 className="text-lg font-semibold">{t('common.confirmDelete')}</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t('common.confirmDeleteText')}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-60"
          >
            {t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  );
}
