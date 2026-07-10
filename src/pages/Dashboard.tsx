import { useNavigate } from 'react-router-dom'
import { Package, Banknote, TrendingUp, AlertTriangle, Printer } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Money } from '@/components/ui/Money'
import { useApi } from '@/lib/useApi'
import { pedidos as pedidosMock } from '@/data/mockData'

const statusBadge: Record<string, { color: 'cyan' | 'amber' | 'green' | 'gray'; label: string }> = {
  producao: { color: 'cyan', label: 'Em produção' },
  orcamento: { color: 'amber', label: 'Orçamento' },
  pronto: { color: 'green', label: 'Pronto' },
  entregue: { color: 'gray', label: 'Entregue' }
}

interface PedidoApiRow {
  id: string
  cliente_nome: string
  peca: string
  valor: string
  status: string
}

export function Dashboard() {
  const navigate = useNavigate()
  const { data, loading, error } = useApi<PedidoApiRow[]>('/api/pedidos', [])
  const usandoMock = !loading && (error || data.length === 0)
  const pedidos = usandoMock
    ? pedidosMock
    : data.slice(0, 4).map(p => ({ id: p.id, clienteNome: p.cliente_nome, peca: p.peca, valor: Number(p.valor), status: p.status }))
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <div>
          <h1 className="text-2xl font-semibold m-0">Dashboard</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-0.5 mb-5">Resumo geral da operação</p>
        </div>
        <Button variant="gradient" onClick={() => navigate('/pedidos', { state: { abrirModal: true } })}><Package size={15} />Novo pedido</Button>
      </div>

      <div className="flex gap-4 flex-wrap">
        <Card className="flex-1 min-w-[190px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><Package size={14} />Pedidos ativos</div>
          <div className="text-2xl font-extrabold">7</div>
          <div className="text-xs font-semibold mt-1 text-emerald-700">+2 essa semana</div>
        </Card>
        <Card className="flex-1 min-w-[190px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><Banknote size={14} />Faturamento (mês)</div>
          <div className="text-2xl font-extrabold"><Money value={3240} /></div>
          <div className="text-xs font-semibold mt-1 text-emerald-700">+18% vs mês anterior</div>
        </Card>
        <Card className="flex-1 min-w-[190px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><TrendingUp size={14} />Lucro estimado</div>
          <div className="text-2xl font-extrabold"><Money value={1480} /></div>
          <div className="text-xs font-semibold mt-1 text-emerald-700">margem 45%</div>
        </Card>
        <Card className="flex-1 min-w-[190px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><AlertTriangle size={14} />Estoque baixo</div>
          <div className="text-2xl font-extrabold">2 itens</div>
          <div className="text-xs font-semibold mt-1 text-red-700">PLA branco, PETG preto</div>
        </Card>
      </div>

      <h2 className="text-[1.05rem] font-semibold mt-7 mb-3">Prazos de entrega</h2>
      <p className="text-xs text-[var(--muted-foreground)] -mt-2 mb-3">Ainda de exemplo — liga na Agenda quando os pedidos reais tiverem prazo.</p>
      <Card className="p-0">
        <table className="w-full border-collapse text-[13.5px]">
          <thead>
            <tr>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Cliente</th>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Peça</th>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Prazo</th>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Situação</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-2.5 py-2.5 border-b border-[var(--border)]">Rafael Costa</td>
              <td className="px-2.5 py-2.5 border-b border-[var(--border)]">Case Raspberry Pi</td>
              <td className="px-2.5 py-2.5 border-b border-[var(--border)]">08/07</td>
              <td className="px-2.5 py-2.5 border-b border-[var(--border)]"><Badge color="red">Atrasado (2 dias)</Badge></td>
            </tr>
            <tr>
              <td className="px-2.5 py-2.5 border-b border-[var(--border)]">Marcos Silva</td>
              <td className="px-2.5 py-2.5 border-b border-[var(--border)]">Suporte celular (x3)</td>
              <td className="px-2.5 py-2.5 border-b border-[var(--border)]">12/07</td>
              <td className="px-2.5 py-2.5 border-b border-[var(--border)]"><Badge color="amber">Em 2 dias</Badge></td>
            </tr>
            <tr>
              <td className="px-2.5 py-2.5">Ateliê Flora</td>
              <td className="px-2.5 py-2.5">Vaso decorativo</td>
              <td className="px-2.5 py-2.5">18/07</td>
              <td className="px-2.5 py-2.5"><Badge color="cyan">No prazo</Badge></td>
            </tr>
          </tbody>
        </table>
      </Card>

      <h2 className="text-[1.05rem] font-semibold mt-7 mb-3">Fila de impressão</h2>
      <p className="text-xs text-[var(--muted-foreground)] -mt-2 mb-3">Ainda manual — sem integração com a impressora.</p>
      <Card className="p-0">
        <div className="flex items-center gap-3.5 px-4 py-3.5 border-b border-[var(--border)]">
          <div className="w-10 h-10 rounded-lg bg-[var(--accent)] text-[var(--primary)] flex items-center justify-center flex-shrink-0"><Printer size={18} /></div>
          <div className="flex-1">
            <div className="text-[13px] font-bold">Impressora 1 — Bambu Lab A1</div>
            <div className="text-[12.5px] text-[var(--muted-foreground)] mt-0.5">Suporte celular (x3) — Marcos Silva</div>
            <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden mt-2">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-600" style={{ width: '64%' }} />
            </div>
          </div>
          <div className="text-xs font-bold text-[var(--primary)] whitespace-nowrap">2h20 restantes</div>
        </div>
        <div className="flex items-center gap-3.5 px-4 py-3.5">
          <div className="w-10 h-10 rounded-lg bg-[var(--muted)] text-[var(--muted-foreground)] flex items-center justify-center flex-shrink-0"><Printer size={18} /></div>
          <div className="flex-1">
            <div className="text-[13px] font-bold">Impressora 2</div>
            <div className="text-[12.5px] text-[var(--muted-foreground)] mt-0.5">Livre — sem trabalho na fila</div>
          </div>
        </div>
      </Card>

      <h2 className="text-[1.05rem] font-semibold mt-7 mb-3">Pedidos recentes {usandoMock && <span className="text-xs font-normal text-[var(--muted-foreground)]">(dados de exemplo)</span>}</h2>
      <Card className="p-0">
        <table className="w-full border-collapse text-[13.5px]">
          <thead>
            <tr>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Cliente</th>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Peça</th>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Status</th>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Valor</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((p, i) => (
              <tr key={p.id}>
                <td className={`px-2.5 py-2.5 ${i < pedidos.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>{p.clienteNome}</td>
                <td className={`px-2.5 py-2.5 ${i < pedidos.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>{p.peca}</td>
                <td className={`px-2.5 py-2.5 ${i < pedidos.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>
                  <Badge color={statusBadge[p.status].color}>{statusBadge[p.status].label}</Badge>
                </td>
                <td className={`px-2.5 py-2.5 ${i < pedidos.length - 1 ? 'border-b border-[var(--border)]' : ''}`}><Money value={p.valor} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
