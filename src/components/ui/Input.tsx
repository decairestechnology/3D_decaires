import { InputHTMLAttributes, SelectHTMLAttributes, LabelHTMLAttributes } from 'react'

export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className="text-xs font-semibold text-[var(--muted-foreground)] block mb-1" {...props} />
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] text-sm mb-3 ${className}`}
      {...props}
    />
  )
}

export function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] text-sm mb-3 ${className}`}
      {...props}
    />
  )
}
