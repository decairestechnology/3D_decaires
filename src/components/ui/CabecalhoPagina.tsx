import { ReactNode } from 'react'

interface CabecalhoPaginaProps {
  titulo: string
  descricao?: ReactNode
  acao?: ReactNode
  icone?: ReactNode
}

/** Cabeçalho padrão de página — mantém título, descrição e ação sempre no mesmo espaçamento. */
export function CabecalhoPagina({ titulo, descricao, acao, icone }: CabecalhoPaginaProps) {
  return (
    <div className="flex justify-between items-start gap-4 flex-wrap mb-4">
      <div>
        <h1 className="text-2xl font-semibold m-0 flex items-center gap-2">{icone}{titulo}</h1>
        {descricao && <p className="text-[var(--muted-foreground)] text-sm mt-0.5">{descricao}</p>}
      </div>
      {acao}
    </div>
  )
}
