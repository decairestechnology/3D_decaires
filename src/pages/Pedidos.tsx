import { useState, FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Money } from '@/components/ui/Money'
import { Modal } from '@/components/ui/Modal'
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
  orcamento: 'producao',
  producao: 'pronto',
  pronto: 'entregue',
  entregue: null
}

interface PedidoApiRow {
  id: string
  cliente_nome: string
  peca: string
  material: string | null
  valor: string
  prazo: string | null
  status: StatusPedido
}

interface ClienteApiRow {
  id: string
  nome: string
}

export function Pedidos() {
  const { data, loading, error, reload } = useApi<PedidoApiRow[]>('/api/pedidos', [])
  const { data: clientesApi } = useApi<ClienteApiRow[]>('/api/clientes', [])

  const [modalOpen, setModalOpen] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({ cliente_id: '', peca: '', material: 'PLA', quantidade: '1', valor: '', prazo: '', status: 'orcamento' as StatusPedido })

  const usandoMock = !loading && (error || data.length === 0)
  const pedidos = usandoMock
    ? pedidosMock
    : data.map(p => ({ id: p.id, clienteNome: p.cliente_nome, peca: p.peca, material: p.material ?? '', valor: Number(p.valor), prazo: p.prazo, status: p.status }))

  const clientesOptions = clientesApi.length > 0 ? clientesApi : clientesMock.map(c => ({ id: c.id, nome: c.nome }))

  async function avancarStatus(id: string, atual: StatusPedido) {
    const proximo = proximoStatus[atual]
    if (!proximo || usandoMock) return
    await api.patch(`/api/pedidos/${id}`, { status: proximo })
    reload()
  }

  async function handleSalvar(e: FormEvent) {
    e.preventDefault()
    setSalvando(true)
    try {
      await api.post('/api/pedidos', {
        cliente_id: form.cliente_id,
        peca: form.quantidade && Number(form.quantidade) > 1 ? `${form.peca} (x${form.quantidade})` : form.peca,
        material: form.material,
        valor: Number(form.valor.replace(',', '.')) || 0,
        prazo: form.prazo || null,
        status: form.status
      })
      setModalOpen(false)
      setForm({ cliente_id: '', peca: '', material: 'PLA', quantidade: '1', valor: '', prazo: '', status: 'orcamento' })
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
        <Button variant="gradient" onClick={() => setModalOpen(true)}><Plus size={15} />Novo pedido</Button>
      </div>

      <div className="flex gap-3.5 overflow-x-auto">
        {colunas.map(col => {
          const items = pedidos.filter(p => p.status === col.status)
          return (
            <div key={col.status} className="bg-[var(--muted)] rounded-xl p-3 min-w-[230px] flex-1">
              <div className="text-[13px] font-bold mb-2.5 flex justify-between text-[var(--muted-foreground)]">
                {col.titulo} <span>{items.length}</span>
              </div>
              {items.map(p => (
                <div
                  key={p.id}
                  onClick={() => avancarStatus(p.id, p.status)}
                  title={proximoStatus[p.status] ? 'Clique pra avançar o status' : ''}
                  className={`bg-[var(--card)] border border-[var(--border)] rounded-[10px] p-2.5 mb-2.5 text-[13px] shadow-sm ${proximoStatus[p.status] && !usandoMock ? 'cursor-pointer hover:border-[var(--primary)]' : ''}`}
                >
                  <div className="font-bold mb-1">{p.clienteNome}</div>
                  {p.peca}{p.material ? ` — ${p.material}` : ''}
                  <div className="text-xs text-[var(--muted-foreground)] flex justify-between mt-1">
                    <Money value={p.valor} />
                    <span>{p.prazo ? p.prazo.split('-').slice(1).reverse().join('/') : '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Novo pedido"
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
        <Input placeholder="Ex: Suporte de celular" value={form.peca} onChange={e => setForm(f => ({ ...f, peca: e.target.value }))} />
        <div className="grid grid-cols-2 gap-x-4">
          <div>
            <Label>Material</Label>
            <Select value={form.material} onChange={e => setForm(f => ({ ...f, material: e.target.value }))}>
              <option>PLA</option><option>PETG</option><option>ABS</option>
            </Select>
          </div>
          <div><Label>Quantidade</Label><Input value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} /></div>
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          <div><Label>Valor (R$)</Label><Input placeholder="0,00" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} /></div>
          <div><Label>Prazo de entrega</Label><Input type="date" value={form.prazo} onChange={e => setForm(f => ({ ...f, prazo: e.target.value }))} /></div>
        </div>
        <Label>Status inicial</Label>
        <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as StatusPedido }))}>
          <option value="orcamento">Orçamento</option>
          <option value="producao">Em produção</option>
          <option value="pronto">Pronto</option>
        </Select>
        {!form.cliente_id && <div className="text-xs text-[var(--muted-foreground)] mt-1">Escolha um cliente cadastrado antes de salvar.</div>}
      </Modal>
    </div>
  )
}
