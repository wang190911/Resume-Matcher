'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useTranslations } from '@/lib/i18n';
import { APPLICATION_STATUS_ORDER, type ApplicationStatus } from '@/lib/api/tracker';
import { toggleStatusHidden } from '@/lib/utils/tracker-visibility';

interface ManageStatusColumnsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hidden: Set<ApplicationStatus>;
  onHiddenChange: (hidden: Set<ApplicationStatus>) => void;
}

export function ManageStatusColumnsDialog({
  open,
  onOpenChange,
  hidden,
  onHiddenChange,
}: ManageStatusColumnsDialogProps) {
  const { t } = useTranslations();

  const handleToggle = (status: ApplicationStatus) => {
    onHiddenChange(toggleStatusHidden(hidden, status));
  };

  // At most one hidden-away-from-visible: when only one status remains visible,
  // its toggle is disabled so the board can never be emptied.
  const visibleCount = APPLICATION_STATUS_ORDER.length - hidden.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('tracker.manageColumns.title')}</DialogTitle>
          <DialogDescription>{t('tracker.manageColumns.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {APPLICATION_STATUS_ORDER.map((status) => {
            const isHidden = hidden.has(status);
            const isLastVisible = !isHidden && visibleCount <= 1;
            return (
              <div
                key={status}
                className="flex items-center justify-between border border-black bg-white p-3 shadow-sw-sm"
              >
                <span className="font-mono text-sm font-bold uppercase tracking-wide text-ink">
                  {t(`tracker.columns.${status}`)}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!isHidden}
                  aria-label={t(`tracker.columns.${status}`)}
                  disabled={isLastVisible}
                  onClick={() => handleToggle(status)}
                  className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer items-center border-2 border-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${
                    isHidden ? 'bg-paper-tint' : 'bg-blue-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none block h-4 w-4 bg-white border border-black transition-transform duration-200 ${
                      isHidden ? 'translate-x-1' : 'translate-x-6'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>

        {visibleCount <= 1 && (
          <p className="font-mono text-xs text-steel-grey">
            {t('tracker.manageColumns.keepOneVisible')}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
