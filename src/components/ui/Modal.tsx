import { ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[var(--card)] rounded-2xl shadow-2xl w-full max-w-md max-h-[88vh] overflow-y-auto">
        <div className="flex justify-between items-center px-5 py-4 border-b border-[var(--border)] sticky top-0 bg-[var(--card)]">
          <h3 className="m-0 text-base font-bold">{title}</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[var(--muted)] text-[var(--muted-foreground)] flex items-center justify-center"
          >
            <X size={14} />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-[var(--border)] flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}
