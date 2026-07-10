import { Plus, Wrench, Banknote, AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Money } from '@/components/ui/Money'
import { equipamentos } from '@/data/mockData'

export function Maquinario() {
  const impressoras = equipamentos.filter(e => e.tipo === 'impressora')
  const ferramentas = equipamentos.filter(e => e.tipo === 'ferramenta')
  const totalInvestido = equipamentos.reduce((s, e) => s + e.valor, 0)
  const pendentes = equipamentos.filter(e => e.status.toLowerCase().includes('pendente') || e.status.toLowerCase().includes('desgast'))

  function badgeColor(status: string): 'green' | 'amber' | 'gray' {
    if (status.toLowerCase().includes('funcionando') || status === 'OK') return 'green'
    if (status.toLowerCase().includes('pendente')) return 'amber'
    return 'gray'
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-semibold m-0">Maquinário e ferramentas</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-0.5">Seus equipamentos, valor investido e manutenção</p>
        </div>
        <Button variant="gradient"><Plus size={15} />Novo equipamento</Button>
      </div>

      <div className="flex gap-4 flex-wrap">
        <Card className="flex-1 min-w-[190px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><Wrench size={14} />Equipamentos ativos</div>
          <div className="text-2xl font-extrabold">{equipamentos.length}</div>
        </Card>
        <Card className="flex-1 min-w-[190px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><Banknote size={14} />Total investido</div>
          <div className="text-2xl font-extrabold"><Money value={totalInvestido} /></div>
        </Card>
        <Card className="flex-1 min-w-[190px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><AlertTriangle size={14} />Manutenção pendente</div>
          <div className="text-2xl font-extrabold">{pendentes.length} {pendentes.length === 1 ? 'item' : 'itens'}</div>
        </Card>
      </div>

      <h2 className="text-[1.05rem] font-semibold mt-7 mb-3">Impressoras</h2>
      <div className="flex gap-4 flex-wrap">
        {impressoras.map(e => (
          <Card key={e.id} className="flex-1 min-w-[260px]">
            <div className="flex justify-between">
              <b className="text-sm">{e.nome}</b>
              <Badge color={badgeColor(e.status)}>{e.status}</Badge>
            </div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1.5">
              Comprada em {e.aquisicao.split('-').reverse().join('/')} · <Money value={e.valor} />
            </div>
          </Card>
        ))}
      </div>

      <h2 className="text-[1.05rem] font-semibold mt-7 mb-3">Ferramentas</h2>
      <Card className="p-0">
        <table className="w-full border-collapse text-[13.5px]">
          <thead>
            <tr>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Item</th>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Valor</th>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Aquisição</th>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Status</th>
            </tr>
          </thead>
          <tbody>
            {ferramentas.map((e, i) => (
              <tr key={e.id}>
                <td className={`px-2.5 py-2.5 ${i < ferramentas.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>{e.nome}</td>
                <td className={`px-2.5 py-2.5 ${i < ferramentas.length - 1 ? 'border-b border-[var(--border)]' : ''}`}><Money value={e.valor} /></td>
                <td className={`px-2.5 py-2.5 ${i < ferramentas.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>{e.aquisicao.slice(0, 7).split('-').reverse().join('/')}</td>
                <td className={`px-2.5 py-2.5 ${i < ferramentas.length - 1 ? 'border-b border-[var(--border)]' : ''}`}><Badge color={badgeColor(e.status)}>{e.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
