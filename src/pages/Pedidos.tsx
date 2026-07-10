import { useState, useEffect, FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { Plus, ChevronLeft, ChevronRight, Trash2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Money } from '@/components/ui/Money'
import { Modal } from '@/components/ui/Modal'
import { InlineConfirm } from '@/components/ui/InlineConfirm'
import { Label, Input, Select } from '@/components/ui/Input'
import { useApi } from '@/lib/useApi'
import { api } from '@/lib/api'
import { pedidos as pedidosMock, clientes as clientesMock } from '@/data/mockData'
import { StatusPedido } from '@/types'

const colunas: { status: StatusPedido; titulo: string }[] = [
  { status: 'orcamento', titulo: 'ORÇAMENTO' },
  { status: 'producao', titulo: 'EM PRODUÇÃO' },
  { status: 'pronto', titulo: 'PRONTO' },
  { status: 'entregue', titulo: 'ENTREGUE' }
]

const proximoStatus: Record<StatusPedido, StatusPedido | null> = {
  orcamento: 'producao', producao: 'pronto', pronto: 'entregue', entregue: null
}
const statusAnterior: Record<StatusPedido, StatusPedido | null> = {
  orcamento: null, producao: 'orcamento', pronto: 'producao', entregue: 'pronto'
}

interface PedidoApiRow {
  id: string
  cliente_id?: string
  cliente_nome: string
  peca: string
  material: string | null
  valor: string
  prazo: string | null
  status: StatusPedido
}

interface ClienteApiRow { id: string; nome: string }

const formVazio = { id: '', cliente_id: '', peca: '', material: 'PLA', valor: '', prazo: '', status: 'orcamento' as StatusPedido }

export function Pedidos() {
  const location = useLocation()
  const { data, loading, error, reload } = useApi<PedidoApiRow[]>('/api/pedidos', [])
  const { data: clientesApi } = useApi<ClienteApiRow[]>('/api/clientes', [])

  const [modalOpen, setModalOpen] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)
  const [form, setForm] = useState(formVazio)

  useEffect(() => {
    if ((location.state as { abrirModal?: boolean })?.abrirModal) {
      abrirNovo()
      window.history.replaceState({}, '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  const usandoMock = !loading && (error || data.length === 0)
  const pedidos = usandoMock
    ? pedidosMock
    : data.map(p => ({ id: p.id, clienteId: p.cliente_id ?? '', clienteNome: p.cliente_nome, peca: p.peca, material: p.material ?? '', valor: Number(p.valor), prazo: p.prazo, status: p.status }))

  const clientesOptions = clientesApi.length > 0 ? clientesApi : clientesMock.map(c => ({ id: c.id, nome: c.nome }))

  function abrirNovo() {
    setForm(formVazio)
    setModalOpen(true)
  }

  function abrirEdicao(p: typeof pedidos[number]) {
    setForm({
      id: p.id,
      cliente_id: (p as { clienteId?: string }).clienteId ?? '',
      peca: p.peca,
      material: p.material || 'PLA',
      valor: String(p.valor).replace('.', ','),
      prazo: p.prazo ?? '',
      status: p.status
    })
    setModalOpen(true)
  }

  async function mudarStatus(id: string, novo: StatusPedido | null) {
    if (!novo || usandoMock) return
    await api.patch(`/api/pedidos/${id}`, { status: novo })
    reload()
  }

  async function excluirPedido(id: string) {
    if (usandoMock) { setConfirmandoId(null); return }
    try {
      await api.del(`/api/pedidos/${id}`)
      setConfirmandoId(null)
      reload()
    } catch (err) {
      console.error('[Excluir pedido] erro:', err)
      alert('Não deu pra excluir. Confere a conexão com o banco.')
    }
  }

  async function handleSalvar(e: FormEvent) {
    e.preventDefault()
    setSalvando(true)
    try {
      const payload = {
        cliente_id: form.cliente_id,
        peca: form.peca,
        material: form.material,
        valor: Number(form.valor.replace(',', '.')) || 0,
        prazo: form.prazo || null,
        status: form.status
      }
      if (form.id) await api.patch(`/api/pedidos/${form.id}`, payload)
      else await api.post('/api/pedidos', payload)
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

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-semibold m-0">Pedidos</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-0.5">Fluxo de produção {usandoMock && '(dados de exemplo)'}</p>
        </div>
        <Button variant="gradient" onClick={abrirNovo}><Plus size={15} />Novo pedido</Button>
      </div>

      <div className="flex gap-3.5 overflow-x-auto">
        {colunas.map(col => {
          const items = pedidos.filter(p => p.status === col.status)
          return (
            <div key={col.status} className="bg-[var(--muted)] rounded-xl p-3 min-w-[240px] flex-1">
              <div className="text-[13px] font-bold mb-2.5 flex justify-between text-[var(--muted-foreground)]">
                {col.titulo} <span>{items.length}</span>
              </div>
              {items.map(p => (
                <div key={p.id} className="bg-[var(--card)] border border-[var(--border)] rounded-[10px] p-2.5 mb-2.5 text-[13px] shadow-sm">
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-bold">{p.clienteNome}</div>
                    {!usandoMock && confirmandoId !== p.id && (
                      <button onClick={() => abrirEdicao(p)} title="Editar" className="text-[var(--muted-foreground)] hover:text-[var(--primary)] -mt-0.5">
                        <Pencil size={13} />
                      </button>
                    )}
                  </div>
                  {p.peca}{p.material ? ` — ${p.material}` : ''}
                  <div className="text-xs text-[var(--muted-foreground)] flex justify-between mt-1 mb-2">
                    <Money value={p.valor} />
                    <span>{p.prazo ? p.prazo.split('-').slice(1).reverse().join('/') : '—'}</span>
                  </div>

                  {confirmandoId === p.id ? (
                    <InlineConfirm onCancel={() => setConfirmandoId(null)} onConfirm={() => excluirPedido(p.id)} />
                  ) : (
                    <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-[var(--border)]">
                      <div className="flex gap-1">
                        <button
                          disabled={!statusAnterior[p.status]}
                          onClick={() => mudarStatus(p.id, statusAnterior[p.status])}
                          title="Voltar fase"
                          className="w-6 h-6 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)] disabled:opacity-30"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          disabled={!proximoStatus[p.status]}
                          onClick={() => mudarStatus(p.id, proximoStatus[p.status])}
                          title="Avançar fase"
                          className="w-6 h-6 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)] disabled:opacity-30"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                      <button
                        onClick={() => setConfirmandoId(p.id)}
                        title="Excluir"
                        className="w-6 h-6 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {items.length === 0 && <div className="text-center py-6 text-xs text-[var(--muted-foreground)]">Nenhum pedido aqui</div>}
            </div>
          )
        })}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Editar pedido' : 'Novo pedido'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="gradient" disabled={salvando} onClick={handleSalvar}>
              <Plus size={15} />{salvando ? 'Salvando...' : 'Salvar pedido'}
            </Button>
          </>
        }
      >
        <Label>Cliente</Label>
        <Select value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}>
          <option value="">Selecione...</option>
          {clientesOptions.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </Select>
        <Label>Peça</Label>
        <Input placeholder="Ex: Suporte de celular (x3)" value={form.peca} onChange={e => setForm(f => ({ ...f, peca: e.target.value }))} />
        <div className="grid grid-cols-2 gap-x-4">
          <div>
            <Label>Material</Label>
            <Select value={form.material} onChange={e => setForm(f => ({ ...f, material: e.target.value }))}>
              <option>PLA</option><option>PETG</option><option>ABS</option>
            </Select>
          </div>
          <div><Label>Valor (R$)</Label><Input placeholder="0,00" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} /></div>
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          <div><Label>Prazo de entrega</Label><Input type="date" value={form.prazo} onChange={e => setForm(f => ({ ...f, prazo: e.target.value }))} /></div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as StatusPedido }))}>
              <option value="orcamento">Orçamento</option>
              <option value="producao">Em produção</option>
              <option value="pronto">Pronto</option>
              <option value="entregue">Entregue</option>
            </Select>
          </div>
        </div>
        {!form.cliente_id && <div className="text-xs text-[var(--muted-foreground)] mt-1">Escolha um cliente cadastrado antes de salvar.</div>}
      </Modal>
    </div>
  )
}
