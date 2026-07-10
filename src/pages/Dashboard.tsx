import { useNavigate } from 'react-router-dom'
import { Package, Banknote, TrendingUp, AlertTriangle, Printer } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Money } from '@/components/ui/Money'
import { useApi } from '@/lib/useApi'
import { formatarDataBR, soData } from '@/lib/date'
import { pedidos as pedidosMock } from '@/data/mockData'

const statusBadge: Record<string, { color: 'cyan' | 'amber' | 'green' | 'gray'; label: string }> = {
  producao: { color: 'cyan', label: 'Em produção' },
  orcamento: { color: 'amber', label: 'Orçamento' },
  pronto: { color: 'green', label: 'Pronto' },
  entregue: { color: 'gray', label: 'Entregue' }
}

interface PedidoApiRow {
  id: string; cliente_nome: string; peca: string; valor: string; prazo: string | null; status: string
}
interface LancamentoApiRow { tipo: 'receita' | 'despesa'; valor: string; data: string }
interface MaterialApiRow { nome: string; estoque_g: string; capacidade_g: string }
interface EquipamentoApiRow { id: string; nome: string; tipo: 'impressora' | 'ferramenta'; status: string }

function situacaoPrazo(prazoISO: string): { color: 'red' | 'amber' | 'cyan'; label: string } {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const prazo = new Date(soData(prazoISO) + 'T00:00:00')
  const diffDias = Math.round((prazo.getTime() - hoje.getTime()) / 86400000)
  if (diffDias < 0) return { color: 'red', label: `Atrasado (${Math.abs(diffDias)} dia${Math.abs(diffDias) > 1 ? 's' : ''})` }
  if (diffDias === 0) return { color: 'amber', label: 'Hoje' }
  if (diffDias <= 3) return { color: 'amber', label: `Em ${diffDias} dia${diffDias > 1 ? 's' : ''}` }
  return { color: 'cyan', label: 'No prazo' }
}

export function Dashboard() {
  const navigate = useNavigate()
  const { data, loading, error } = useApi<PedidoApiRow[]>('/api/pedidos', [])
  const { data: lancData } = useApi<LancamentoApiRow[]>('/api/lancamentos', [])
  const { data: matData } = useApi<MaterialApiRow[]>('/api/materiais', [])
  const { data: equipData } = useApi<EquipamentoApiRow[]>('/api/equipamentos', [])

  const usandoMock = !loading && !!error
  const vazio = !loading && !error && data.length === 0
  const pedidosTodos = usandoMock
    ? pedidosMock.map(p => ({ ...p, prazo: null as string | null }))
    : data.map(p => ({ id: p.id, clienteNome: p.cliente_nome, peca: p.peca, valor: Number(p.valor), prazo: p.prazo, status: p.status }))

  const pedidosAtivos = pedidosTodos.filter(p => p.status !== 'entregue')
  const pedidosRecentes = pedidosTodos.slice(0, 5)

  const mesAtual = new Date().toISOString().slice(0, 7)
  const lancamentosMes = lancData.filter(l => soData(l.data).slice(0, 7) === mesAtual)
  const faturamento = lancamentosMes.filter(l => l.tipo === 'receita').reduce((s, l) => s + Number(l.valor), 0)
  const despesas = lancamentosMes.filter(l => l.tipo === 'despesa').reduce((s, l) => s + Number(l.valor), 0)
  const lucro = faturamento - despesas
  const margem = faturamento > 0 ? Math.round((lucro / faturamento) * 100) : 0

  const materiaisBaixos = matData.filter(m => (Number(m.estoque_g) / Number(m.capacidade_g)) * 100 <= 20)

  const prazos = pedidosAtivos
    .filter((p): p is typeof p & { prazo: string } => !!p.prazo)
    .sort((a, b) => soData(a.prazo).localeCompare(soData(b.prazo)))
    .slice(0, 6)

  const impressoras = equipData.filter(e => e.tipo === 'impressora')

  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <div>
          <h1 className="text-2xl font-semibold m-0">Dashboard</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-0.5 mb-5">Resumo geral da operação {usandoMock && '(dados de exemplo)'}</p>
        </div>
        <Button variant="gradient" onClick={() => navigate('/pedidos', { state: { abrirModal: true } })}><Package size={15} />Novo pedido</Button>
      </div>

      <div className="flex gap-4 flex-wrap">
        <Card className="flex-1 min-w-[190px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><Package size={14} />Pedidos ativos</div>
          <div className="text-2xl font-extrabold">{pedidosAtivos.length}</div>
        </Card>
        <Card className="flex-1 min-w-[190px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><Banknote size={14} />Faturamento (mês)</div>
          <div className="text-2xl font-extrabold"><Money value={faturamento} /></div>
        </Card>
        <Card className="flex-1 min-w-[190px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><TrendingUp size={14} />Lucro estimado</div>
          <div className="text-2xl font-extrabold"><Money value={lucro} /></div>
          <div className="text-xs font-semibold mt-1 text-[var(--muted-foreground)]">margem {margem}%</div>
        </Card>
        <Card className="flex-1 min-w-[190px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><AlertTriangle size={14} />Estoque baixo</div>
          <div className="text-2xl font-extrabold">{materiaisBaixos.length} {materiaisBaixos.length === 1 ? 'item' : 'itens'}</div>
          {materiaisBaixos.length > 0 && (
            <div className="text-xs font-semibold mt-1 text-red-600 truncate">{materiaisBaixos.map(m => m.nome).join(', ')}</div>
          )}
        </Card>
      </div>

      <h2 className="text-[1.05rem] font-semibold mt-7 mb-3">Prazos de entrega</h2>
      <Card className="p-0">
        {prazos.length === 0 ? (
          <div className="text-center py-6 text-xs text-[var(--muted-foreground)]">Nenhum pedido com prazo em aberto.</div>
        ) : (
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
              {prazos.map((p, i) => {
                const sit = situacaoPrazo(p.prazo)
                const last = i === prazos.length - 1
                return (
                  <tr key={p.id}>
                    <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>{p.clienteNome}</td>
                    <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>{p.peca}</td>
                    <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>{formatarDataBR(p.prazo)}</td>
                    <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}><Badge color={sit.color}>{sit.label}</Badge></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      <h2 className="text-[1.05rem] font-semibold mt-7 mb-3">Impressoras</h2>
      <Card className="p-0">
        {impressoras.length === 0 ? (
          <div className="text-center py-6 text-xs text-[var(--muted-foreground)]">Cadastre suas impressoras em Maquinário.</div>
        ) : (
          impressoras.map((e, i) => (
            <div key={e.id} className={`flex items-center gap-3.5 px-4 py-3.5 ${i < impressoras.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${e.status.toLowerCase().includes('funcionando') ? 'bg-[var(--accent)] text-[var(--primary)]' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'}`}>
                <Printer size={18} />
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-bold">{e.nome}</div>
              </div>
              <Badge color={e.status.toLowerCase().includes('funcionando') ? 'green' : 'amber'}>{e.status}</Badge>
            </div>
          ))
        )}
      </Card>

      <h2 className="text-[1.05rem] font-semibold mt-7 mb-3">Pedidos recentes {usandoMock && <span className="text-xs font-normal text-[var(--muted-foreground)]">(dados de exemplo)</span>}</h2>
      <Card className="p-0">
        {pedidosRecentes.length === 0 ? (
          <div className="text-center py-6 text-xs text-[var(--muted-foreground)]">Nenhum pedido cadastrado ainda.</div>
        ) : (
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
              {pedidosRecentes.map((p, i) => (
                <tr key={p.id}>
                  <td className={`px-2.5 py-2.5 ${i < pedidosRecentes.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>{p.clienteNome}</td>
                  <td className={`px-2.5 py-2.5 ${i < pedidosRecentes.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>{p.peca}</td>
                  <td className={`px-2.5 py-2.5 ${i < pedidosRecentes.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>
                    <Badge color={statusBadge[p.status].color}>{statusBadge[p.status].label}</Badge>
                  </td>
                  <td className={`px-2.5 py-2.5 ${i < pedidosRecentes.length - 1 ? 'border-b border-[var(--border)]' : ''}`}><Money value={p.valor} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
