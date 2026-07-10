import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'gradient' | 'ghost' | 'whatsapp'
  children: ReactNode
}

export function Button({ variant = 'primary', className = '', style, children, ...props }: ButtonProps) {
  const base = 'px-4 py-2 rounded-lg text-sm font-semibold transition inline-flex items-center gap-2 justify-center'
  const variants: Record<string, string> = {
    primary: 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 rounded-lg',
    gradient:
      'text-white font-bold rounded-xl shadow-sm hover:opacity-90 bg-gradient-to-br from-cyan-500 to-violet-600',
    ghost: 'bg-transparent border border-[var(--border)] hover:bg-[var(--muted)]',
    whatsapp: 'bg-[#25D366] text-white font-bold hover:opacity-90 rounded-xl'
  }
  const corTexto = variant === 'ghost' ? { color: 'var(--foreground)' } : {}
  return (
    <button className={`${base} ${variants[variant]} ${className}`} style={{ ...corTexto, ...style }} {...props}>
      {children}
    </button>
  )
}
