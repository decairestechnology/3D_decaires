import { useState, useEffect, FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { Plus, ChevronLeft, ChevronRight, Trash2, Pencil, Link as LinkIcon, FileText, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Money, formatMoney } from '@/components/ui/Money'
import { Modal } from '@/components/ui/Modal'
import { InlineConfirm } from '@/components/ui/InlineConfirm'
import { Label, Input, Select } from '@/components/ui/Input'
import { useApi } from '@/lib/useApi'
import { api } from '@/lib/api'
import { formatarDataBR } from '@/lib/date'
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
const statusLabel: Record<StatusPedido, string> = {
  orcamento: 'Orçamento', producao: 'Em produção', pronto: 'Pronto', entregue: 'Entregue'
}

interface PedidoApiRow {
  id: string
  numero: number
  cliente_id: string
  cliente_nome: string
  peca: string
  material: string | null
  valor: string
  prazo: string | null
  status: StatusPedido
  material_id: string | null
  material_nome: string | null
  peso_filamento_g: string | null
  link_arquivo: string | null
  observacoes: string | null
  catalogo_produto_id: string | null
}
interface ClienteApiRow { id: string; nome: string }
interface MaterialApiRow { id: string; nome: string }
interface CatalogoApiRow {
  id: string; codigo: string; nome: string; material_id: string | null
  peso_padrao_g: string | null; preco_padrao: string | null; ativo: boolean
}

const formVazio = {
  id: '', cliente_id: '', peca: '', valor: '', prazo: '', status: 'orcamento' as StatusPedido,
  material_id: '', peso_filamento_g: '', link_arquivo: '', observacoes: '', catalogo_produto_id: ''
}

export function Pedidos() {
  const location = useLocation()
  const { data, loading, error, reload } = useApi<PedidoApiRow[]>('/api/pedidos', [])
  const { data: clientesApi } = useApi<ClienteApiRow[]>('/api/clientes', [])
  const { data: materiaisApi } = useApi<MaterialApiRow[]>('/api/materiais', [])
  const { data: catalogoData } = useApi<CatalogoApiRow[]>('/api/catalogo', [])
  const catalogoApi = catalogoData.filter(p => p.ativo)

  const [modalOpen, setModalOpen] = useState(false)
  const [fichaAberta, setFichaAberta] = useState<PedidoApiRow | null>(null)
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

  const usandoMock = !loading && !!error
  const pedidos = usandoMock ? [] : data

  const [busca, setBusca] = useState('')
  const pedidosFiltrados = busca
    ? pedidos.filter(p =>
        p.peca.toLowerCase().includes(busca.toLowerCase()) ||
        p.cliente_nome.toLowerCase().includes(busca.toLowerCase()) ||
        String(p.numero).includes(busca)
      )
    : pedidos

  const clientesOptions = clientesApi

  function abrirNovo() {
    setForm(formVazio)
    setModalOpen(true)
  }

  function abrirEdicao(p: PedidoApiRow) {
    setForm({
      id: p.id, cliente_id: p.cliente_id, peca: p.peca, valor: String(p.valor).replace('.', ','),
      prazo: p.prazo ? p.prazo.slice(0, 10) : '', status: p.status,
      material_id: p.material_id ?? '', peso_filamento_g: p.peso_filamento_g ?? '',
      link_arquivo: p.link_arquivo ?? '', observacoes: p.observacoes ?? '', catalogo_produto_id: p.catalogo_produto_id ?? ''
    })
    setModalOpen(true)
  }

  async function mudarStatus(id: string, novo: StatusPedido | null) {
    if (!novo || usandoMock) return
    await api.patch(`/api/pedidos?id=${id}`, { status: novo })
    reload()
  }

  async function excluirPedido(id: string) {
    if (usandoMock) { setConfirmandoId(null); return }
    try {
      await api.del(`/api/pedidos?id=${id}`)
      setConfirmandoId(null)
      reload()
    } catch (err) {
      console.error('[Excluir pedido] erro:', err)
      const detalhe = err instanceof Error ? err.message : ''
      alert(`Não deu pra excluir. ${detalhe.slice(0, 150) || 'Confere o console (F12) pra mais detalhe.'}`)
    }
  }

  async function handleSalvar(e: FormEvent) {
    e.preventDefault()
    setSalvando(true)
    try {
      const materialNome = materiaisApi.find(m => m.id === form.material_id)?.nome ?? null
      const payload = {
        cliente_id: form.cliente_id,
        peca: form.peca,
        material: materialNome,
        material_id: form.material_id || null,
        peso_filamento_g: form.peso_filamento_g ? Number(form.peso_filamento_g) : null,
        link_arquivo: form.link_arquivo || null,
        observacoes: form.observacoes || null,
        valor: Number(form.valor.replace(',', '.')) || 0,
        prazo: form.prazo || null,
        status: form.status,
        catalogo_produto_id: form.catalogo_produto_id || null
      }
      if (form.id) await api.patch(`/api/pedidos?id=${form.id}`, payload)
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
          <p className="text-[var(--muted-foreground)] text-sm mt-0.5">Fluxo de produção {usandoMock && '(sem conexão com o banco)'}</p>
        </div>
        <Button variant="gradient" onClick={abrirNovo}><Plus size={15} />Novo pedido</Button>
      </div>

      <div className="relative mb-4 max-w-[320px]">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por peça, cliente ou nº..."
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] text-sm"
        />
      </div>

      <div className="flex gap-3.5 overflow-x-auto">
        {colunas.map(col => {
          const items = pedidosFiltrados.filter(p => p.status === col.status)
          return (
            <div key={col.status} className="bg-[var(--muted)] rounded-xl p-3 min-w-[240px] flex-1">
              <div className="text-[13px] font-bold mb-2.5 flex justify-between text-[var(--muted-foreground)]">
                {col.titulo} <span>{items.length}</span>
              </div>
              {items.map(p => (
                <div
                  key={p.id}
                  onClick={() => setFichaAberta(p)}
                  className="bg-[var(--card)] border border-[var(--border)] rounded-[10px] p-2.5 mb-2.5 text-[13px] shadow-sm cursor-pointer hover:border-[var(--primary)]"
                >
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <div className="text-[10px] font-bold text-[var(--muted-foreground)]">#{p.numero}</div>
                      <div className="font-bold">{p.cliente_nome}</div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); abrirEdicao(p) }}
                      title="Editar"
                      className="text-[var(--muted-foreground)] hover:text-[var(--primary)]"
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                  {p.peca}{p.material_nome ? ` — ${p.material_nome}` : ''}
                  <div className="text-xs text-[var(--muted-foreground)] flex justify-between mt-1 mb-2">
                    <Money value={Number(p.valor)} />
                    <span>{p.prazo ? formatarDataBR(p.prazo) : '—'}</span>
                  </div>

                  {confirmandoId === p.id ? (
                    <div onClick={e => e.stopPropagation()}>
                      <InlineConfirm onCancel={() => setConfirmandoId(null)} onConfirm={() => excluirPedido(p.id)} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-[var(--border)]" onClick={e => e.stopPropagation()}>
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

      {/* FICHA DO PEDIDO (view) */}
      <Modal
        open={!!fichaAberta}
        onClose={() => setFichaAberta(null)}
        title={fichaAberta ? `Pedido #${fichaAberta.numero}` : ''}
        footer={<Button variant="ghost" onClick={() => setFichaAberta(null)}>Fechar</Button>}
      >
        {fichaAberta && (
          <div className="flex flex-col gap-3 text-sm">
            <div><span className="text-xs font-semibold text-[var(--muted-foreground)] block">Cliente</span>{fichaAberta.cliente_nome}</div>
            <div><span className="text-xs font-semibold text-[var(--muted-foreground)] block">Peça</span>{fichaAberta.peca}</div>
            <div><span className="text-xs font-semibold text-[var(--muted-foreground)] block">Status</span>{statusLabel[fichaAberta.status]}</div>
            <div><span className="text-xs font-semibold text-[var(--muted-foreground)] block">Material</span>{fichaAberta.material_nome ?? '—'}</div>
            <div><span className="text-xs font-semibold text-[var(--muted-foreground)] block">Peso de filamento usado</span>{fichaAberta.peso_filamento_g ? `${fichaAberta.peso_filamento_g}g` : '—'}</div>
            <div><span className="text-xs font-semibold text-[var(--muted-foreground)] block">Valor</span>{formatMoney(Number(fichaAberta.valor))}</div>
            <div><span className="text-xs font-semibold text-[var(--muted-foreground)] block">Prazo</span>{fichaAberta.prazo ? formatarDataBR(fichaAberta.prazo) : '—'}</div>
            {fichaAberta.link_arquivo && (
              <div>
                <span className="text-xs font-semibold text-[var(--muted-foreground)] block">Arquivo de impressão</span>
                <a href={fichaAberta.link_arquivo} target="_blank" rel="noreferrer" className="text-[var(--primary)] underline flex items-center gap-1">
                  <LinkIcon size={13} />{fichaAberta.link_arquivo}
                </a>
              </div>
            )}
            {fichaAberta.observacoes && (
              <div>
                <span className="text-xs font-semibold text-[var(--muted-foreground)] block">Observações</span>
                <div className="flex items-start gap-1.5"><FileText size={13} className="mt-0.5 flex-shrink-0" />{fichaAberta.observacoes}</div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* NOVO / EDITAR */}
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

        {catalogoApi.length > 0 && (
          <>
            <Label>Produto do catálogo (opcional)</Label>
            <Select
              value=""
              onChange={e => {
                const prod = catalogoApi.find(p => p.id === e.target.value)
                if (!prod) return
                setForm(f => ({
                  ...f,
                  peca: prod.nome,
                  material_id: prod.material_id ?? f.material_id,
                  peso_filamento_g: prod.peso_padrao_g ?? f.peso_filamento_g,
                  valor: prod.preco_padrao ? String(prod.preco_padrao).replace('.', ',') : f.valor,
                  catalogo_produto_id: prod.id
                }))
              }}
            >
              <option value="">Preencher manualmente...</option>
              {catalogoApi.map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.nome}</option>)}
            </Select>
          </>
        )}

        <Label>Peça</Label>
        <Input placeholder="Ex: Suporte de celular (x3)" value={form.peca} onChange={e => setForm(f => ({ ...f, peca: e.target.value }))} />
        <div className="grid grid-cols-2 gap-x-4">
          <div>
            <Label>Material (com cor)</Label>
            <Select value={form.material_id} onChange={e => setForm(f => ({ ...f, material_id: e.target.value }))}>
              <option value="">Selecione...</option>
              {materiaisApi.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </Select>
          </div>
          <div><Label>Peso de filamento (g)</Label><Input placeholder="80" value={form.peso_filamento_g} onChange={e => setForm(f => ({ ...f, peso_filamento_g: e.target.value }))} /></div>
        </div>
        <Label>Link do arquivo (STL/3MF)</Label>
        <Input placeholder="https://..." value={form.link_arquivo} onChange={e => setForm(f => ({ ...f, link_arquivo: e.target.value }))} />
        <div className="grid grid-cols-2 gap-x-4">
          <div><Label>Valor (R$)</Label><Input placeholder="0,00" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} /></div>
          <div><Label>Prazo de entrega</Label><Input type="date" value={form.prazo} onChange={e => setForm(f => ({ ...f, prazo: e.target.value }))} /></div>
        </div>
        <Label>Status</Label>
        <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as StatusPedido }))}>
          <option value="orcamento">Orçamento</option>
          <option value="producao">Em produção</option>
          <option value="pronto">Pronto</option>
          <option value="entregue">Entregue</option>
        </Select>
        <Label>Observações</Label>
        <Input placeholder="Detalhe opcional sobre a produção" value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
        {!form.cliente_id && <div className="text-xs text-[var(--muted-foreground)] mt-1">Escolha um cliente cadastrado antes de salvar.</div>}
        {form.material_id && form.status === 'producao' && !form.id && (
          <div className="text-xs text-amber-600 mt-1">Ao marcar como "Em produção", o peso de filamento informado é abatido do estoque automaticamente.</div>
        )}
      </Modal>
    </div>
  )
}
