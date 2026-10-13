import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, type ButtonVariant } from './Button';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

export const Dialog = ({ open, onClose, title, description, children, footer, size = 'md' }: DialogProps) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div className="absolute inset-0 bg-charcoal-900/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} aria-hidden />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className={cn('relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-lift outline-none sm:rounded-3xl', sizes[size])}
          >
            <div className="flex items-start justify-between gap-4 border-b border-ivory-200 px-6 py-5">
              <div>
                <h2 id={titleId} className="font-display text-2xl font-semibold text-charcoal-900">
                  {title}
                </h2>
                {description ? <p className="mt-1 text-sm text-charcoal-500">{description}</p> : null}
              </div>
              <button type="button" onClick={onClose} className="rounded-full p-2 text-charcoal-500 hover:bg-ivory-200 hover:text-charcoal-900" aria-label="Close dialog">
                <X className="h-5 w-5" />
              </button>
            </div>
            {children ? <div className="scrollbar-thin flex-1 overflow-y-auto px-6 py-5">{children}</div> : null}
            {footer ? <div className="flex flex-wrap items-center justify-end gap-3 border-t border-ivory-200 bg-ivory-50 px-6 py-4">{footer}</div> : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};

export interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ButtonVariant;
  loading?: boolean;
  children?: ReactNode;
  disabled?: boolean;
}

export const ConfirmationDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading,
  children,
  disabled,
}: ConfirmationDialogProps) => (
  <Dialog
    open={open}
    onClose={onClose}
    title={
      <span className="flex items-center gap-2">
        {variant === 'danger' ? <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden /> : null}
        {title}
      </span>
    }
    description={description}
    size="sm"
    footer={
      <>
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={variant} onClick={() => void onConfirm()} loading={loading} disabled={disabled}>
          {confirmLabel}
        </Button>
      </>
    }
  >
    {children}
  </Dialog>
);
