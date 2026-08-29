import { ReactNode } from 'react'
import { LucideIcon, Inbox } from 'lucide-react'
import { Button } from './Button'

interface EstadoVazioProps {
  icone?: LucideIcon
  titulo: string
  descricao?: string
  acaoTexto?: string
  onAcao?: () => void
  children?: ReactNode
}

/** Estado vazio consistente pra tabela/lista sem dados. */
export function EstadoVazio({ icone: Icone = Inbox, titulo, descricao, acaoTexto, onAcao, children }: EstadoVazioProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      <div className="w-11 h-11 rounded-full bg-[var(--muted)] flex items-center justify-center mb-3">
        <Icone size={19} className="text-[var(--muted-foreground)]" />
      </div>
      <div className="text-sm font-semibold">{titulo}</div>
      {descricao && <div className="text-xs text-[var(--muted-foreground)] mt-1 max-w-[380px]">{descricao}</div>}
      {acaoTexto && onAcao && (
        <Button variant="primary" className="mt-3.5" onClick={onAcao}>{acaoTexto}</Button>
      )}
      {children}
    </div>
  )
}
