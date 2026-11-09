import React from 'react';
import { Printer, X } from 'lucide-react';

interface PrintPreviewModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  documentSubtitle?: string;
  children: React.ReactNode;
}

export const SCHOOL_LOGO_SRC =
  '/assets/aistudio/gbps-school-village-kando-lund_a01134ed.svg';

export function AcademicCrestSvg({ className = 'w-11 h-11' }: { className?: string }) {
  return (
    <svg
      viewBox="75 60 380 380"
      xmlns="http://www.w3.org/2000/svg"
      className={`rounded-full overflow-hidden ${className}`}
      role="img"
      aria-label="GBPS: Kando Lund Official Crest"
    >
      <image href={SCHOOL_LOGO_SRC} x="0" y="0" width="1200" height="500" />
    </svg>
  );
}

export function SchoolLogoBanner({ className = 'h-16 w-auto' }: { className?: string }) {
  return (
    <img
      src={SCHOOL_LOGO_SRC}
      alt="GBPS: Kando Lund — Government Boys Primary School, School Village Kando Lund"
      className={`object-contain select-none ${className}`}
    />
  );
}

export function PrintPreviewModal({
  open,
  onClose,
  title,
  documentSubtitle = 'Official Institutional Record · GBPS: Kando Lund',
  children,
}: PrintPreviewModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Print-ready PDF / paper formatting
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto bg-slate-50 dark:bg-slate-950 flex-1">
          <div
            id="gbps-kando-lund-print-area"
            className="bg-white text-slate-900 border border-slate-200 rounded-lg p-8 mx-auto max-w-2xl"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-6 border-b border-slate-300">
              <div>
                <SchoolLogoBanner className="h-20 w-auto rounded-lg border border-slate-200/80" />
                <p className="text-xs text-slate-600 mt-2 font-medium">{documentSubtitle}</p>
              </div>
              <div className="sm:text-right text-xs text-slate-500 font-mono tabular-nums shrink-0">
                <div>Issued: {new Date().toISOString().slice(0, 10)}</div>
                <div>Campus Code: GBPS-KL</div>
              </div>
            </div>

            {children}

            <div className="mt-10 pt-5 border-t border-slate-200 flex items-end justify-between text-xs text-slate-500">
              <div>
                <div className="w-36 border-t border-slate-400 pt-1 text-slate-700 font-medium">
                  Registrar / Accountant
                </div>
              </div>
              <div className="text-center">Computer Generated Official Document</div>
              <div>
                <div className="w-36 border-t border-slate-400 pt-1 text-slate-700 font-medium text-right">
                  Principal Seal
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
