import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Package } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatMoney } from '@/components/ui/Money'
import { useApi } from '@/lib/useApi'

interface PedidoApiRow { id: string; peca: string; valor: string; material_nome?: string | null }

export function RankingProdutos() {
  const navigate = useNavigate()
  const { data } = useApi<PedidoApiRow[]>('/api/pedidos', [])

  const ranking = useMemo(() => {
    const totais: Record<string, { qtd: number; total: number; material: string }> = {}
    data.forEach(p => {
      const nome = p.peca.trim()
      if (!totais[nome]) totais[nome] = { qtd: 0, total: 0, material: p.material_nome ?? '—' }
      totais[nome].qtd += 1
      totais[nome].total += Number(p.valor)
    })
    return Object.entries(totais)
      .map(([nome, v]) => ({ nome, qtd: v.qtd, total: v.total, material: v.material }))
      .sort((a, b) => b.total - a.total)
  }, [data])

  return (
    <div>
      <Button variant="ghost" onClick={() => navigate('/relatorios')} className="mb-4"><ArrowLeft size={15} />Voltar pra Relatórios</Button>
      <h1 className="text-2xl font-semibold m-0 flex items-center gap-2"><Package size={22} className="text-[var(--primary)]" />Ranking de produtos</h1>
      <p className="text-[var(--muted-foreground)] text-sm mt-0.5">Peças mais pedidas, por faturamento total</p>

      <Card className="p-0">
        {ranking.length === 0 ? (
          <div className="text-center py-10 text-sm text-[var(--muted-foreground)]">Nenhum pedido lançado ainda.</div>
        ) : (
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr>
                <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]">#</th>
                <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]">Produto</th>
                <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]">Qtd. pedida</th>
                <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]">Faturamento total</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((p, i) => {
                const last = i === ranking.length - 1
                return (
                  <tr key={p.nome}>
                    <td className={`px-3 py-3 font-bold ${!last ? 'border-b border-[var(--border)]' : ''}`}>{i + 1}º</td>
                    <td className={`px-3 py-3 font-semibold ${!last ? 'border-b border-[var(--border)]' : ''}`}>{p.nome}</td>
                    <td className={`px-3 py-3 ${!last ? 'border-b border-[var(--border)]' : ''}`}>{p.qtd}</td>
                    <td className={`px-3 py-3 font-bold text-[var(--secondary)] ${!last ? 'border-b border-[var(--border)]' : ''}`}>{formatMoney(p.total)}</td>
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
