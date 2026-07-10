import { useValuesVisibility } from '@/context/ValuesVisibilityContext'

export function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function Money({ value, className = '' }: { value: number; className?: string }) {
  const { hideValues } = useValuesVisibility()
  return <span className={`${hideValues ? 'money-hidden' : ''} ${className}`}>{formatMoney(value)}</span>
}
