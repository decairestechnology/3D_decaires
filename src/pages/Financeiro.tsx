import { useState, FormEvent } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Money } from '@/components/ui/Money'
import { Modal } from '@/components/ui/Modal'
import { InlineConfirm } from '@/components/ui/InlineConfirm'
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
  categoria?: string
}

const categoriaBadge: Record<string, 'green' | 'cyan' | 'purple' | 'amber' | 'gray'> = {
  vendas: 'green', materiais: 'cyan', energia: 'amber', manutencao: 'purple', outros: 'gray'
}
const categoriaLabel: Record<string, string> = {
  vendas: 'Vendas', materiais: 'Materiais', energia: 'Energia', manutencao: 'Manutenção', outros: 'Outros'
}

const formVazio = { id: '', data: '', descricao: '', tipo: 'receita', valor: '', categoria: 'vendas' }

export function Financeiro() {
  const { data, loading, error, reload } = useApi<LancamentoApiRow[]>('/api/lancamentos', [])
  const [modalOpen, setModalOpen] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)
  const [form, setForm] = useState(formVazio)

  const usandoMock = !loading && (error || data.length === 0)
  const lancamentos = usandoMock
    ? lancamentosMock.map(l => ({ ...l, categoria: l.tipo === 'receita' ? 'vendas' : 'outros' }))
    : data.map(l => ({ id: l.id, data: l.data, descricao: l.descricao, tipo: l.tipo, valor: Number(l.valor), categoria: l.categoria ?? 'outros' }))

  const receita = lancamentos.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0)
  const despesa = lancamentos.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0)

  function abrirNovo() {
    setForm(formVazio)
    setModalOpen(true)
  }
  function abrirEdicao(l: typeof lancamentos[number]) {
    setForm({ id: l.id, data: l.data, descricao: l.descricao, tipo: l.tipo, valor: String(l.valor).replace('.', ','), categoria: l.categoria })
    setModalOpen(true)
  }

  async function handleSalvar(e: FormEvent) {
    e.preventDefault()
    if (!form.descricao.trim() || !form.valor) return
    setSalvando(true)
    try {
      const payload = {
        data: form.data || new Date().toISOString().slice(0, 10),
        descricao: form.descricao,
        tipo: form.tipo,
        valor: Number(form.valor.replace(',', '.')) || 0,
        categoria: form.categoria
      }
      if (form.id) await api.patch(`/api/lancamentos/${form.id}`, payload)
      else await api.post('/api/lancamentos', payload)
      setModalOpen(false)
      setForm(formVazio)
      reload()
    } catch (err) {
      console.error('[Salvar] erro:', err)
      alert('Não deu pra salvar — confere se o banco (Neon) está conectado e as variáveis de ambiente configuradas.')
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(id: string) {
    try {
      await api.del(`/api/lancamentos/${id}`)
      setConfirmandoId(null)
      reload()
    } catch (err) {
      console.error('[Excluir] erro:', err)
      alert('Não deu pra excluir. Confere a conexão com o banco.')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-semibold m-0">Financeiro</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-0.5">Receitas, despesas e lucro {usandoMock && '(dados de exemplo)'}</p>
        </div>
        <Button variant="gradient" onClick={abrirNovo}><Plus size={15} />Novo lançamento</Button>
      </div>

      <div className="flex gap-4 flex-wrap">
        <Card className="flex-1 min-w-[190px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] mb-2">Receita (mês)</div>
          <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400"><Money value={receita} /></div>
        </Card>
        <Card className="flex-1 min-w-[190px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] mb-2">Despesas (mês)</div>
          <div className="text-2xl font-extrabold text-red-600"><Money value={despesa} /></div>
        </Card>
        <Card className="flex-1 min-w-[190px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] mb-2">Lucro líquido</div>
          <div className="text-2xl font-extrabold"><Money value={receita - despesa} /></div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">margem de {receita > 0 ? Math.round(((receita - despesa) / receita) * 100) : 0}%</div>
        </Card>
      </div>

      <h2 className="text-[1.05rem] font-semibold mt-7 mb-3">Lançamentos recentes</h2>
      <Card className="p-0">
        <table className="w-full border-collapse text-[13.5px]">
          <thead>
            <tr>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Data</th>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Descrição</th>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Categoria</th>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Tipo</th>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Valor</th>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]"></th>
            </tr>
          </thead>
          <tbody>
            {lancamentos.map((l, i) => {
              const last = i === lancamentos.length - 1
              return (
                <tr key={l.id}>
                  <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>{l.data.split('-').reverse().join('/')}</td>
                  <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>{l.descricao}</td>
                  <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>
                    <Badge color={categoriaBadge[l.categoria] ?? 'gray'}>{categoriaLabel[l.categoria] ?? l.categoria}</Badge>
                  </td>
                  <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>
                    <Badge color={l.tipo === 'receita' ? 'green' : 'red'}>{l.tipo === 'receita' ? 'Receita' : 'Despesa'}</Badge>
                  </td>
                  <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}><Money value={l.valor} /></td>
                  <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>
                    {confirmandoId === l.id ? (
                      <InlineConfirm onCancel={() => setConfirmandoId(null)} onConfirm={() => excluir(l.id)} />
                    ) : !usandoMock && (
                      <div className="flex gap-1">
                        <button onClick={() => abrirEdicao(l)} className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)]">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setConfirmandoId(l.id)} className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-600">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Editar lançamento' : 'Novo lançamento'}
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
        <div className="grid grid-cols-2 gap-x-4">
          <div><Label>Categoria</Label>
            <Select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
              <option value="vendas">Vendas</option>
              <option value="materiais">Materiais</option>
              <option value="energia">Energia</option>
              <option value="manutencao">Manutenção</option>
              <option value="outros">Outros</option>
            </Select>
          </div>
          <div><Label>Data</Label><Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} /></div>
        </div>
      </Modal>
    </div>
  )
}
