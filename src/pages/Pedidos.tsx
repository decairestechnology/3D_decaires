import { useState, useEffect, FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { Plus, ChevronLeft, ChevronRight, Trash2, Pencil, Link as LinkIcon, FileText } from 'lucide-react'
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

interface MaterialUsado { material_id: string; peso_g: number }

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
  materiais_usados: MaterialUsado[] | null
}
interface ClienteApiRow { id: string; nome: string }
interface MaterialApiRow { id: string; nome: string }
interface CatalogoApiRow {
  id: string; codigo: string; nome: string; material_id: string | null
  peso_padrao_g: string | null; preco_padrao: string | null; ativo: boolean
  materiais_padrao: { material_id: string; peso_g: number }[] | null
}

interface LinhaMaterial { id: string; material_id: string; peso_g: string }

function novaLinhaMaterial(): LinhaMaterial {
  return { id: crypto.randomUUID(), material_id: '', peso_g: '' }
}

const formVazio = {
  id: '', cliente_id: '', peca: '', valor: '', prazo: '', status: 'orcamento' as StatusPedido,
  link_arquivo: '', observacoes: '', catalogo_produto_id: ''
}

// pega os materiais de um pedido (novo formato em lista, ou o antigo de 1 material só)
function materiaisDoPedido(p: PedidoApiRow): LinhaMaterial[] {
  if (p.materiais_usados && p.materiais_usados.length > 0) {
    return p.materiais_usados.map(m => ({ id: crypto.randomUUID(), material_id: m.material_id, peso_g: String(m.peso_g) }))
  }
  if (p.material_id && p.peso_filamento_g) {
    return [{ id: crypto.randomUUID(), material_id: p.material_id, peso_g: p.peso_filamento_g }]
  }
  return [novaLinhaMaterial()]
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
  const [materiaisLinhas, setMateriaisLinhas] = useState<LinhaMaterial[]>([novaLinhaMaterial()])

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
    setMateriaisLinhas([novaLinhaMaterial()])
    setModalOpen(true)
  }

  function abrirEdicao(p: PedidoApiRow) {
    setForm({
      id: p.id, cliente_id: p.cliente_id, peca: p.peca, valor: String(p.valor).replace('.', ','),
      prazo: p.prazo ? p.prazo.slice(0, 10) : '', status: p.status,
      link_arquivo: p.link_arquivo ?? '', observacoes: p.observacoes ?? '', catalogo_produto_id: p.catalogo_produto_id ?? ''
    })
    setMateriaisLinhas(materiaisDoPedido(p))
    setModalOpen(true)
  }

  function atualizarLinha(id: string, campo: keyof LinhaMaterial, valor: string) {
    setMateriaisLinhas(lista => lista.map(l => (l.id === id ? { ...l, [campo]: valor } : l)))
  }
  function removerLinha(id: string) {
    setMateriaisLinhas(lista => (lista.length > 1 ? lista.filter(l => l.id !== id) : lista))
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
      const linhasValidas = materiaisLinhas.filter(l => l.material_id && l.peso_g)
      const materiaisUsados = linhasValidas.map(l => ({ material_id: l.material_id, peso_g: Number(l.peso_g) }))
      const nomesMateriais = linhasValidas.map(l => materiaisApi.find(m => m.id === l.material_id)?.nome).filter(Boolean)
      const primeira = linhasValidas[0]

      const payload = {
        cliente_id: form.cliente_id,
        peca: form.peca,
        material: nomesMateriais.length > 0 ? nomesMateriais.join(' + ') : null,
        material_id: primeira?.material_id || null,
        peso_filamento_g: primeira ? Number(primeira.peso_g) : null,
        materiais_usados: materiaisUsados,
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
      setMateriaisLinhas([novaLinhaMaterial()])
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
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-semibold m-0">Pedidos</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-0.5">Fluxo de produção {usandoMock && '(sem conexão com o banco)'}</p>
        </div>
        <Button variant="gradient" onClick={abrirNovo}><Plus size={15} />Novo pedido</Button>
      </div>

      <div className="relative mb-4 max-w-[320px]">
        <Input placeholder="Buscar por peça, cliente ou nº..." value={busca} onChange={e => setBusca(e.target.value)} className="!mb-0" />
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
                  {p.peca}{p.material ? ` — ${p.material}` : ''}
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
            <div>
              <span className="text-xs font-semibold text-[var(--muted-foreground)] block mb-1">Materiais usados</span>
              {materiaisDoPedido(fichaAberta).filter(l => l.material_id).length === 0 ? '—' : (
                <div className="flex flex-col gap-1">
                  {materiaisDoPedido(fichaAberta).map(l => (
                    <div key={l.id} className="flex justify-between bg-[var(--muted)] rounded px-2.5 py-1.5 text-[13px]">
                      <span>{materiaisApi.find(m => m.id === l.material_id)?.nome ?? fichaAberta.material_nome ?? '—'}</span>
                      <span className="text-[var(--muted-foreground)]">{l.peso_g}g</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
                setForm(f => ({ ...f, peca: prod.nome, valor: prod.preco_padrao ? String(prod.preco_padrao).replace('.', ',') : f.valor, catalogo_produto_id: prod.id }))
                if (prod.materiais_padrao && prod.materiais_padrao.length > 0) {
                  setMateriaisLinhas(prod.materiais_padrao.map(m => ({ id: crypto.randomUUID(), material_id: m.material_id, peso_g: String(m.peso_g) })))
                } else if (prod.material_id) {
                  setMateriaisLinhas([{ id: crypto.randomUUID(), material_id: prod.material_id, peso_g: prod.peso_padrao_g ?? '' }])
                }
              }}
            >
              <option value="">Preencher manualmente...</option>
              {catalogoApi.map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.nome}</option>)}
            </Select>
          </>
        )}

        <Label>Peça</Label>
        <Input placeholder="Ex: Suporte de celular (x3)" value={form.peca} onChange={e => setForm(f => ({ ...f, peca: e.target.value }))} />

        <Label>Materiais usados (uma linha por cor/filamento)</Label>
        <div className="flex flex-col gap-2 mb-3">
          {materiaisLinhas.map((linha, idx) => (
            <div key={linha.id} className="grid grid-cols-[1fr_110px_28px] gap-2 items-start">
              <Select value={linha.material_id} onChange={e => atualizarLinha(linha.id, 'material_id', e.target.value)} className="!mb-0">
                <option value="">Selecione o material...</option>
                {materiaisApi.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </Select>
              <Input placeholder="Peso (g)" value={linha.peso_g} onChange={e => atualizarLinha(linha.id, 'peso_g', e.target.value)} className="!mb-0" />
              <button
                type="button"
                onClick={() => removerLinha(linha.id)}
                disabled={materiaisLinhas.length === 1}
                className="w-7 h-9 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:text-red-600 disabled:opacity-20"
              >
                <Trash2 size={14} />
              </button>
              {idx === materiaisLinhas.length - 1 && null}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setMateriaisLinhas(l => [...l, novaLinhaMaterial()])}
          className="text-xs font-semibold text-[var(--primary)] flex items-center gap-1 mb-3 -mt-1"
        >
          <Plus size={13} />Adicionar outro material/cor
        </button>

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
        {materiaisLinhas.some(l => l.material_id) && form.status === 'producao' && !form.id && (
          <div className="text-xs text-amber-600 mt-1">Ao marcar como "Em produção", o peso de cada material informado é abatido do estoque automaticamente.</div>
        )}
      </Modal>
    </div>
  )
}
