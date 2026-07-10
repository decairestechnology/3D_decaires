import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Money } from '@/components/ui/Money'
import { useApi } from '@/lib/useApi'
import { lancamentos as lancamentosMock } from '@/data/mockData'

interface LancamentoApiRow {
  id: string
  data: string
  descricao: string
  tipo: 'receita' | 'despesa'
  valor: string
}

export function Financeiro() {
  const { data, loading, error } = useApi<LancamentoApiRow[]>('/api/lancamentos', [])
  const usandoMock = !loading && (error || data.length === 0)
  const lancamentos = usandoMock ? lancamentosMock : data.map(l => ({ id: l.id, data: l.data, descricao: l.descricao, tipo: l.tipo, valor: Number(l.valor) }))

  const receita = lancamentos.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0)
  const despesa = lancamentos.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0)

  return (
    <div>
      <h1 className="text-2xl font-semibold m-0">Financeiro</h1>
      <p className="text-[var(--muted-foreground)] text-sm mt-0.5 mb-5">Receitas, despesas e lucro {usandoMock && '(dados de exemplo)'}</p>

      <div className="flex gap-4 flex-wrap">
        <Card className="flex-1 min-w-[190px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] mb-2">Receita (mês)</div>
          <div className="text-2xl font-extrabold"><Money value={receita} /></div>
        </Card>
        <Card className="flex-1 min-w-[190px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] mb-2">Despesas (mês)</div>
          <div className="text-2xl font-extrabold"><Money value={despesa} /></div>
        </Card>
        <Card className="flex-1 min-w-[190px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] mb-2">Lucro líquido</div>
          <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400"><Money value={receita - despesa} /></div>
        </Card>
      </div>

      <h2 className="text-[1.05rem] font-semibold mt-7 mb-3">Lançamentos recentes</h2>
      <Card className="p-0">
        <table className="w-full border-collapse text-[13.5px]">
          <thead>
            <tr>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Data</th>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Descrição</th>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Tipo</th>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Valor</th>
            </tr>
          </thead>
          <tbody>
            {lancamentos.map((l, i) => (
              <tr key={l.id}>
                <td className={`px-2.5 py-2.5 ${i < lancamentos.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>{l.data.split('-').reverse().join('/')}</td>
                <td className={`px-2.5 py-2.5 ${i < lancamentos.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>{l.descricao}</td>
                <td className={`px-2.5 py-2.5 ${i < lancamentos.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>
                  <Badge color={l.tipo === 'receita' ? 'green' : 'red'}>{l.tipo === 'receita' ? 'Receita' : 'Despesa'}</Badge>
                </td>
                <td className={`px-2.5 py-2.5 ${i < lancamentos.length - 1 ? 'border-b border-[var(--border)]' : ''}`}><Money value={l.valor} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
