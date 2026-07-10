import { useState, FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Money } from '@/components/ui/Money'
import { Modal } from '@/components/ui/Modal'
import { Label, Input, Select } from '@/components/ui/Input'
import { useApi } from '@/lib/useApi'
import { api } from '@/lib/api'
import { lancamentos as lancamentosMock } from '@/data/mockData'

interface LancamentoApiRow {
  id: string
  data: string
  descricao: string
  tipo: 'receita' | 'despesa'
  valor: string
}

export function Financeiro() {
  const { data, loading, error, reload } = useApi<LancamentoApiRow[]>('/api/lancamentos', [])
  const [modalOpen, setModalOpen] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({ data: '', descricao: '', tipo: 'receita', valor: '' })

  const usandoMock = !loading && (error || data.length === 0)
  const lancamentos = usandoMock ? lancamentosMock : data.map(l => ({ id: l.id, data: l.data, descricao: l.descricao, tipo: l.tipo, valor: Number(l.valor) }))

  const receita = lancamentos.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0)
  const despesa = lancamentos.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0)

  async function handleSalvar(e: FormEvent) {
    e.preventDefault()
    if (!form.descricao.trim() || !form.valor) return
    setSalvando(true)
    try {
      await api.post('/api/lancamentos', {
        data: form.data || new Date().toISOString().slice(0, 10),
        descricao: form.descricao,
        tipo: form.tipo,
        valor: Number(form.valor.replace(',', '.')) || 0
      })
      setModalOpen(false)
      setForm({ data: '', descricao: '', tipo: 'receita', valor: '' })
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
          <h1 className="text-2xl font-semibold m-0">Financeiro</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-0.5">Receitas, despesas e lucro {usandoMock && '(dados de exemplo)'}</p>
        </div>
        <Button variant="gradient" onClick={() => setModalOpen(true)}><Plus size={15} />Novo lançamento</Button>
      </div>

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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Novo lançamento"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="gradient" disabled={salvando} onClick={handleSalvar}><Plus size={15} />{salvando ? 'Salvando...' : 'Salvar'}</Button>
          </>
        }
      >
        <Label>Descrição</Label>
        <Input placeholder="Ex: Venda — Cliente X" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
        <div className="grid grid-cols-2 gap-x-4">
          <div>
            <Label>Tipo</Label>
            <Select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
              <option value="receita">Receita</option>
              <option value="despesa">Despesa</option>
            </Select>
          </div>
          <div><Label>Valor (R$)</Label><Input placeholder="0,00" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} /></div>
        </div>
        <Label>Data</Label>
        <Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
      </Modal>
    </div>
  )
}
