import { ReactNode } from 'react'

/** Título de seção dentro de uma página — espaçamento padronizado. */
export function TituloSecao({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h2 className={`text-[1.05rem] font-semibold mt-6 mb-3 flex items-center gap-2 ${className}`}>{children}</h2>
}
