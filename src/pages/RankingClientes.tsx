import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trophy } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatMoney } from '@/components/ui/Money'
import { useApi } from '@/lib/useApi'

interface ClienteApiRow { id: string; nome: string; contato: string | null; pedidos: number; total_gasto: string }

export function RankingClientes() {
  const navigate = useNavigate()
  const { data } = useApi<ClienteApiRow[]>('/api/clientes', [])

  const ranking = useMemo(() => {
    return [...data]
      .map(c => ({ nome: c.nome, contato: c.contato ?? '—', pedidos: c.pedidos, total: Number(c.total_gasto) }))
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total)
  }, [data])

  return (
    <div>
      <Button variant="ghost" onClick={() => navigate('/relatorios')} className="mb-4"><ArrowLeft size={15} />Voltar pra Relatórios</Button>
      <h1 className="text-2xl font-semibold m-0 flex items-center gap-2"><Trophy size={22} className="text-amber-500" />Ranking de clientes</h1>
      <p className="text-[var(--muted-foreground)] text-sm mt-0.5">Todos os clientes, do que mais comprou pro que menos comprou</p>

      <Card className="p-0">
        {ranking.length === 0 ? (
          <div className="text-center py-10 text-sm text-[var(--muted-foreground)]">Nenhum pedido com valor lançado ainda.</div>
        ) : (
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr>
                <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]">#</th>
                <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]">Cliente</th>
                <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]">Contato</th>
                <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]">Pedidos</th>
                <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]">Total gasto</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((c, i) => {
                const last = i === ranking.length - 1
                return (
                  <tr key={c.nome}>
                    <td className={`px-3 py-3 font-bold ${!last ? 'border-b border-[var(--border)]' : ''}`}>{i + 1}º</td>
                    <td className={`px-3 py-3 font-semibold ${!last ? 'border-b border-[var(--border)]' : ''}`}>{c.nome}</td>
                    <td className={`px-3 py-3 text-[var(--muted-foreground)] ${!last ? 'border-b border-[var(--border)]' : ''}`}>{c.contato}</td>
                    <td className={`px-3 py-3 ${!last ? 'border-b border-[var(--border)]' : ''}`}>{c.pedidos}</td>
                    <td className={`px-3 py-3 font-bold text-[var(--secondary)] ${!last ? 'border-b border-[var(--border)]' : ''}`}>{formatMoney(c.total)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
