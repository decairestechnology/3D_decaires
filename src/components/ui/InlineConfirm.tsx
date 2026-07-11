import { Trash2 } from 'lucide-react'

interface InlineConfirmProps {
  onConfirm: () => void
  onCancel: () => void
}

// Barra de confirmação inline pra exclusão — nunca usar window.confirm() nativo.
export function InlineConfirm({ onConfirm, onCancel }: InlineConfirmProps) {
  return (
    <div className="flex items-center gap-2 bg-[#FEF2F2] border border-red-200 rounded-lg px-3 py-1.5">
      <span className="text-xs font-semibold text-[#991B1B]">Excluir?</span>
      <button onClick={onCancel} className="text-xs font-semibold px-2 py-1 rounded bg-white border border-[var(--border)]" style={{ color: '#0F172A' }}>
        Cancelar
      </button>
      <button onClick={onConfirm} className="text-xs font-semibold px-2 py-1 rounded bg-[#EF4444] text-white flex items-center gap-1">
        <Trash2 size={12} />Excluir
      </button>
    </div>
  )
}
