import { HTMLAttributes } from 'react'

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 shadow-sm ${className}`}
      {...props}
    />
  )
}
