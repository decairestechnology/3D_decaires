import { useState, FormEvent } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { InlineConfirm } from '@/components/ui/InlineConfirm'
import { Label, Input } from '@/components/ui/Input'
import { Money } from '@/components/ui/Money'
import { useApi } from '@/lib/useApi'
import { api } from '@/lib/api'
import { clientes as clientesMock } from '@/data/mockData'
import { Cliente } from '@/types'

interface ClienteApiRow {
  id: string
  nome: string
  contato: string | null
  pedidos: number
  total_gasto: string
}

function iniciais(nome: string) {
  return nome.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
}

const formVazio = { id: '', nome: '', contato: '' }

export function Clientes() {
  const { data, loading, error, reload } = useApi<ClienteApiRow[]>('/api/clientes', [])
  const [modalOpen, setModalOpen] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)
  const [form, setForm] = useState(formVazio)

  const usandoMock = !loading && (error || data.length === 0)
  const clientes: Cliente[] = usandoMock
    ? clientesMock
    : data.map(c => ({ id: c.id, nome: c.nome, contato: c.contato ?? '—', pedidos: c.pedidos, totalGasto: Number(c.total_gasto) }))

  function abrirNovo() { setForm(formVazio); setModalOpen(true) }
  function abrirEdicao(c: Cliente) { setForm({ id: c.id, nome: c.nome, contato: c.contato === '—' ? '' : c.contato }); setModalOpen(true) }

  async function handleSalvar(e: FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) return
    setSalvando(true)
    try {
      const payload = { nome: form.nome, contato: form.contato || null }
      if (form.id) await api.patch(`/api/clientes/${form.id}`, payload)
      else await api.post('/api/clientes', payload)
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
      await api.del(`/api/clientes/${id}`)
      setConfirmandoId(null)
      reload()
    } catch (err) {
      console.error('[Excluir] erro:', err)
      alert('Não deu pra excluir — se esse cliente já tem pedido vinculado, não dá pra remover.')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-semibold m-0">Clientes</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-0.5">Histórico e contato {usandoMock && '(dados de exemplo)'}</p>
        </div>
        <Button variant="gradient" onClick={abrirNovo}><Plus size={15} />Novo cliente</Button>
      </div>

      <Card className="p-0">
        <table className="w-full border-collapse text-[13.5px]">
          <thead>
            <tr>
              <th className="w-12 border-b border-[var(--border)]"></th>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Nome</th>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Contato</th>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Pedidos</th>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Total gasto</th>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]"></th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c, i) => {
              const last = i === clientes.length - 1
              return (
                <tr key={c.id}>
                  <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>
                    <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 text-white flex items-center justify-center text-xs font-extrabold">
                      {iniciais(c.nome)}
                    </div>
                  </td>
                  <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>{c.nome}</td>
                  <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>{c.contato}</td>
                  <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>{c.pedidos}</td>
                  <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}><Money value={c.totalGasto} /></td>
                  <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>
                    {confirmandoId === c.id ? (
                      <InlineConfirm onCancel={() => setConfirmandoId(null)} onConfirm={() => excluir(c.id)} />
                    ) : !usandoMock && (
                      <div className="flex gap-1">
                        <button onClick={() => abrirEdicao(c)} className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)]">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setConfirmandoId(c.id)} className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-600">
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
        title={form.id ? 'Editar cliente' : 'Novo cliente'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="gradient" disabled={salvando} onClick={handleSalvar}><Plus size={15} />{salvando ? 'Salvando...' : 'Salvar'}</Button>
          </>
        }
      >
        <Label>Nome</Label>
        <Input placeholder="Nome do cliente" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
        <Label>Contato (telefone ou email)</Label>
        <Input placeholder="(16) 99999-9999" value={form.contato} onChange={e => setForm(f => ({ ...f, contato: e.target.value }))} />
      </Modal>
    </div>
  )
}
