import { useState, FormEvent } from 'react'
import { Plus, Wrench, Banknote, AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Money } from '@/components/ui/Money'
import { Modal } from '@/components/ui/Modal'
import { Label, Input, Select } from '@/components/ui/Input'
import { useApi } from '@/lib/useApi'
import { api } from '@/lib/api'
import { equipamentos as equipamentosMock } from '@/data/mockData'

interface EquipamentoApiRow {
  id: string
  nome: string
  tipo: 'impressora' | 'ferramenta'
  valor: string
  aquisicao: string
  status: string
}

function badgeColor(status: string): 'green' | 'amber' | 'gray' {
  if (status.toLowerCase().includes('funcionando') || status === 'OK') return 'green'
  if (status.toLowerCase().includes('pendente')) return 'amber'
  return 'gray'
}

export function Maquinario() {
  const { data, loading, error, reload } = useApi<EquipamentoApiRow[]>('/api/equipamentos', [])
  const [modalOpen, setModalOpen] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({ nome: '', tipo: 'impressora', valor: '', aquisicao: '', status: 'OK' })

  const usandoMock = !loading && (error || data.length === 0)
  const equipamentos = usandoMock
    ? equipamentosMock
    : data.map(e => ({ id: e.id, nome: e.nome, tipo: e.tipo, valor: Number(e.valor), aquisicao: e.aquisicao, status: e.status }))

  const impressoras = equipamentos.filter(e => e.tipo === 'impressora')
  const ferramentas = equipamentos.filter(e => e.tipo === 'ferramenta')
  const totalInvestido = equipamentos.reduce((s, e) => s + e.valor, 0)
  const pendentes = equipamentos.filter(e => e.status.toLowerCase().includes('pendente') || e.status.toLowerCase().includes('desgast'))

  async function handleSalvar(e: FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) return
    setSalvando(true)
    try {
      await api.post('/api/equipamentos', {
        nome: form.nome,
        tipo: form.tipo,
        valor: Number(form.valor.replace(',', '.')) || 0,
        aquisicao: form.aquisicao || null,
        status: form.status
      })
      setModalOpen(false)
      setForm({ nome: '', tipo: 'impressora', valor: '', aquisicao: '', status: 'OK' })
      reload()
    } catch {
      alert('Não deu pra salvar — confere se o banco (Neon) está conectado e as variáveis de ambiente configuradas.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-semibold m-0">Maquinário e ferramentas</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-0.5">Seus equipamentos, valor investido e manutenção {usandoMock && '(dados de exemplo)'}</p>
        </div>
        <Button variant="gradient" onClick={() => setModalOpen(true)}><Plus size={15} />Novo equipamento</Button>
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Novo equipamento"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="gradient" disabled={salvando} onClick={handleSalvar}><Plus size={15} />{salvando ? 'Salvando...' : 'Salvar'}</Button>
          </>
        }
      >
        <Label>Nome</Label>
        <Input placeholder="Ex: Bambu Lab A1 ou Espátula" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
        <div className="grid grid-cols-2 gap-x-4">
          <div>
            <Label>Tipo</Label>
            <Select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
              <option value="impressora">Impressora</option>
              <option value="ferramenta">Ferramenta</option>
            </Select>
          </div>
          <div><Label>Valor (R$)</Label><Input placeholder="0,00" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} /></div>
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          <div><Label>Data de aquisição</Label><Input type="date" value={form.aquisicao} onChange={e => setForm(f => ({ ...f, aquisicao: e.target.value }))} /></div>
          <div><Label>Status</Label><Input placeholder="OK" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} /></div>
        </div>
      </Modal>
    </div>
  )
}
