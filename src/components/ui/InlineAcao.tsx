import { ReactNode } from 'react'

interface InlineAcaoProps {
  pergunta: string
  textoConfirmar: string
  onConfirm: () => void
  onCancel: () => void
  icone?: ReactNode
}

/**
 * Confirmação inline pra ações que NÃO são exclusão (juntar, converter, etc).
 * Visual neutro — o InlineConfirm vermelho fica só pra excluir, pra não assustar.
 */
export function InlineAcao({ pergunta, textoConfirmar, onConfirm, onCancel, icone }: InlineAcaoProps) {
  return (
    <div className="flex items-center gap-2 bg-[var(--accent)] border border-[var(--primary)] rounded-lg px-3 py-1.5">
      <span className="text-xs font-semibold text-[var(--primary)]">{pergunta}</span>
      <button onClick={onCancel} className="text-xs font-semibold px-2 py-1 rounded bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)]">
        Cancelar
      </button>
      <button onClick={onConfirm} className="text-xs font-semibold px-2 py-1 rounded bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center gap-1">
        {icone}{textoConfirmar}
      </button>
    </div>
  )
}
