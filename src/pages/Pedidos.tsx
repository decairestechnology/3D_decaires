import { useState, useEffect, FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { Plus, ChevronLeft, ChevronRight, Trash2, Pencil, Link as LinkIcon, FileText, Search, Boxes, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Money, formatMoney } from '@/components/ui/Money'
import { Modal } from '@/components/ui/Modal'
import { InlineConfirm } from '@/components/ui/InlineConfirm'
import { Label, Input, Select } from '@/components/ui/Input'
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina'
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

const pagamentoInfo: Record<string, { label: string; color: 'green' | 'amber' | 'red' }> = {
  pago: { label: 'Pago', color: 'green' },
  parcial: { label: 'Parcial', color: 'amber' },
  pendente: { label: 'Pendente', color: 'red' }
}
const formasPagamento = ['Pix', 'Dinheiro', 'Cartão de débito', 'Cartão de crédito', 'Transferência', 'Outro']

interface MaterialUsado { material_id: string; peso_g: number }
interface ItemPedido {
  id: string
  origem: 'catalogo' | 'estoque' | 'manual'
  nome: string
  quantidade: number
  valor_unitario: number
  catalogo_produto_id?: string | null
  produto_pronto_id?: string | null
  materiais?: MaterialUsado[]
  link_arquivo?: string | null
}

interface PedidoApiRow {
  id: string; numero: number; cliente_id: string; cliente_nome: string
  peca: string; material: string | null; valor: string; prazo: string | null; status: StatusPedido
  material_id: string | null; material_nome: string | null; peso_filamento_g: string | null
  link_arquivo: string | null; observacoes: string | null; catalogo_produto_id: string | null
  materiais_usados: MaterialUsado[] | null; itens: ItemPedido[] | null
  status_pagamento: string; forma_pagamento: string | null; valor_pago: string; data_pagamento: string | null
}
interface ClienteApiRow { id: string; nome: string }
interface MaterialApiRow { id: string; nome: string }
interface CatalogoApiRow {
  id: string; codigo: string; nome: string; material_id: string | null
  peso_padrao_g: string | null; preco_padrao: string | null; ativo: boolean
  materiais_padrao: MaterialUsado[] | null; link_arquivo: string | null
}
interface ProntoApiRow { id: string; nome: string; quantidade: number; preco_venda: string; material: string | null; catalogo_produto_id: string | null }

// ---- Estrutura do formulário (usa string pra facilitar digitação)
interface LinhaMaterialForm { id: string; material_id: string; peso_g: string }
interface ItemForm {
  id: string
  origem: 'catalogo' | 'estoque' | 'manual'
  nome: string
  quantidade: string
  valor_unitario: string
  catalogo_produto_id: string
  produto_pronto_id: string
  materiais: LinhaMaterialForm[]
  link_arquivo: string
}

function novaLinhaMaterial(): LinhaMaterialForm {
  return { id: crypto.randomUUID(), material_id: '', peso_g: '' }
}
function novoItemForm(): ItemForm {
  return {
    id: crypto.randomUUID(), origem: 'manual', nome: '', quantidade: '1', valor_unitario: '',
    catalogo_produto_id: '', produto_pronto_id: '', materiais: [novaLinhaMaterial()], link_arquivo: ''
  }
}

const formVazio = {
  id: '', cliente_id: '', prazo: '', status: 'orcamento' as StatusPedido, observacoes: '',
  status_pagamento: 'pendente', forma_pagamento: '', valor_pago: '', data_pagamento: ''
}

/** Lê os itens de um pedido — pedidos antigos não têm lista, aí monta um item só. */
function itensDoPedido(p: PedidoApiRow): ItemPedido[] {
  if (p.itens && p.itens.length > 0) return p.itens
  const materiais = p.materiais_usados && p.materiais_usados.length > 0
    ? p.materiais_usados
    : (p.material_id && p.peso_filamento_g ? [{ material_id: p.material_id, peso_g: Number(p.peso_filamento_g) }] : [])
  return [{
    id: 'legado', origem: 'manual', nome: p.peca, quantidade: 1,
    valor_unitario: Number(p.valor), materiais, link_arquivo: p.link_arquivo
  }]
}

export function Pedidos() {
  const location = useLocation()
  const { data, loading, error, reload } = useApi<PedidoApiRow[]>('/api/pedidos', [])
  const { data: clientesApi } = useApi<ClienteApiRow[]>('/api/clientes', [])
  const { data: materiaisApi } = useApi<MaterialApiRow[]>('/api/materiais', [])
  const { data: catalogoData } = useApi<CatalogoApiRow[]>('/api/catalogo', [])
  const { data: prontosData, reload: reloadProntos } = useApi<ProntoApiRow[]>('/api/produtos-prontos', [])
  const catalogoApi = catalogoData.filter(p => p.ativo)
  const prontosDisponiveis = prontosData.filter(p => p.quantidade > 0)

  const [modalOpen, setModalOpen] = useState(false)
  const [fichaAberta, setFichaAberta] = useState<PedidoApiRow | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)
  const [form, setForm] = useState(formVazio)
  const [itens, setItens] = useState<ItemForm[]>([novoItemForm()])
  const [busca, setBusca] = useState('')

  useEffect(() => {
    if ((location.state as { abrirModal?: boolean })?.abrirModal) {
      abrirNovo()
      window.history.replaceState({}, '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  const usandoMock = !loading && !!error
  const pedidos = usandoMock ? [] : data

  const pedidosFiltrados = busca
    ? pedidos.filter(p =>
        p.peca.toLowerCase().includes(busca.toLowerCase()) ||
        p.cliente_nome.toLowerCase().includes(busca.toLowerCase()) ||
        String(p.numero).includes(busca))
    : pedidos

  const totalFormulario = itens.reduce(
    (s, i) => s + (Number(i.valor_unitario.replace(',', '.')) || 0) * (Number(i.quantidade) || 1), 0
  )

  function abrirNovo() {
    setForm(formVazio)
    setItens([novoItemForm()])
    setModalOpen(true)
  }

  function abrirEdicao(p: PedidoApiRow) {
    setForm({
      id: p.id, cliente_id: p.cliente_id, prazo: p.prazo ? p.prazo.slice(0, 10) : '',
      status: p.status, observacoes: p.observacoes ?? '',
      status_pagamento: p.status_pagamento ?? 'pendente', forma_pagamento: p.forma_pagamento ?? '',
      valor_pago: p.valor_pago ? String(p.valor_pago).replace('.', ',') : '',
      data_pagamento: p.data_pagamento ? p.data_pagamento.slice(0, 10) : ''
    })
    setItens(itensDoPedido(p).map(i => ({
      id: crypto.randomUUID(),
      origem: i.origem,
      nome: i.nome,
      quantidade: String(i.quantidade),
      valor_unitario: String(i.valor_unitario).replace('.', ','),
      catalogo_produto_id: i.catalogo_produto_id ?? '',
      produto_pronto_id: i.produto_pronto_id ?? '',
      materiais: (i.materiais && i.materiais.length > 0)
        ? i.materiais.map(m => ({ id: crypto.randomUUID(), material_id: m.material_id, peso_g: String(m.peso_g) }))
        : [novaLinhaMaterial()],
      link_arquivo: i.link_arquivo ?? ''
    })))
    setModalOpen(true)
  }

  function atualizarItem(itemId: string, campo: keyof ItemForm, valor: string) {
    setItens(lista => lista.map(i => (i.id === itemId ? { ...i, [campo]: valor } : i)))
  }
  function removerItem(itemId: string) {
    setItens(lista => (lista.length > 1 ? lista.filter(i => i.id !== itemId) : lista))
  }
  function atualizarMaterial(itemId: string, linhaId: string, campo: 'material_id' | 'peso_g', valor: string) {
    setItens(lista => lista.map(i => i.id !== itemId ? i : {
      ...i, materiais: i.materiais.map(l => (l.id === linhaId ? { ...l, [campo]: valor } : l))
    }))
  }
  function adicionarMaterial(itemId: string) {
    setItens(lista => lista.map(i => i.id !== itemId ? i : { ...i, materiais: [...i.materiais, novaLinhaMaterial()] }))
  }
  function removerMaterial(itemId: string, linhaId: string) {
    setItens(lista => lista.map(i => i.id !== itemId || i.materiais.length === 1 ? i : {
      ...i, materiais: i.materiais.filter(l => l.id !== linhaId)
    }))
  }

  function aplicarCatalogo(itemId: string, produtoId: string) {
    const prod = catalogoApi.find(p => p.id === produtoId)
    if (!prod) return
    setItens(lista => lista.map(i => i.id !== itemId ? i : {
      ...i,
      origem: 'catalogo',
      catalogo_produto_id: prod.id,
      produto_pronto_id: '',
      nome: prod.nome,
      valor_unitario: prod.preco_padrao ? String(prod.preco_padrao).replace('.', ',') : i.valor_unitario,
      link_arquivo: prod.link_arquivo ?? i.link_arquivo,
      materiais: prod.materiais_padrao && prod.materiais_padrao.length > 0
        ? prod.materiais_padrao.map(m => ({ id: crypto.randomUUID(), material_id: m.material_id, peso_g: String(m.peso_g) }))
        : prod.material_id
          ? [{ id: crypto.randomUUID(), material_id: prod.material_id, peso_g: prod.peso_padrao_g ?? '' }]
          : i.materiais
    }))
  }

  function aplicarProntoEstoque(itemId: string, prontoId: string) {
    const pronto = prontosDisponiveis.find(p => p.id === prontoId)
    if (!pronto) return
    setItens(lista => lista.map(i => i.id !== itemId ? i : {
      ...i,
      origem: 'estoque',
      produto_pronto_id: pronto.id,
      // herda o vínculo do catálogo pra venda contar no "Vendidos" do produto
      catalogo_produto_id: pronto.catalogo_produto_id ?? '',
      nome: pronto.nome,
      valor_unitario: String(pronto.preco_venda).replace('.', ','),
      materiais: [novaLinhaMaterial()]
    }))
  }

  async function mudarStatus(id: string, novo: StatusPedido | null) {
    if (!novo || usandoMock) return
    await api.patch(`/api/pedidos?id=${id}`, { status: novo })
    reload()
    reloadProntos()
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
      alert(`Não deu pra excluir. ${detalhe.slice(0, 150) || 'Confere o console (F12).'}`)
    }
  }

  async function handleSalvar(e: FormEvent) {
    e.preventDefault()
    if (!form.cliente_id) { alert('Escolhe um cliente antes de salvar.'); return }
    setSalvando(true)
    try {
      const itensPayload: ItemPedido[] = itens
        .filter(i => i.nome.trim())
        .map(i => ({
          id: i.id,
          origem: i.origem,
          nome: i.nome,
          quantidade: Number(i.quantidade) || 1,
          valor_unitario: Number(i.valor_unitario.replace(',', '.')) || 0,
          catalogo_produto_id: i.catalogo_produto_id || null,
          produto_pronto_id: i.produto_pronto_id || null,
          materiais: i.origem === 'estoque'
            ? []
            : i.materiais.filter(m => m.material_id && m.peso_g).map(m => ({ material_id: m.material_id, peso_g: Number(m.peso_g) })),
          link_arquivo: i.link_arquivo || null
        }))

      if (itensPayload.length === 0) { alert('Adiciona pelo menos um item com nome.'); setSalvando(false); return }

      const nomesMateriais = Array.from(new Set(
        itensPayload.flatMap(i => (i.materiais ?? []).map(m => materiaisApi.find(x => x.id === m.material_id)?.nome)).filter(Boolean)
      ))

      const payload = {
        cliente_id: form.cliente_id,
        itens: itensPayload,
        material: nomesMateriais.length > 0 ? nomesMateriais.join(' + ') : null,
        observacoes: form.observacoes || null,
        prazo: form.prazo || null,
        status: form.status,
        status_pagamento: form.status_pagamento,
        forma_pagamento: form.forma_pagamento || null,
        valor_pago: Number(form.valor_pago.replace(',', '.')) || 0,
        data_pagamento: form.data_pagamento || null
      }
      if (form.id) await api.patch(`/api/pedidos?id=${form.id}`, payload)
      else await api.post('/api/pedidos', payload)
      setModalOpen(false)
      setForm(formVazio)
      setItens([novoItemForm()])
      reload()
      reloadProntos()
    } catch (err) {
      console.error('[Salvar] erro:', err)
      const detalhe = err instanceof Error ? err.message : ''
      alert(`Não deu pra salvar. ${detalhe.slice(0, 200) || 'Confere o console (F12).'}`)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <CabecalhoPagina
        titulo="Pedidos"
        descricao={`Fluxo de produção ${usandoMock ? '(sem conexão com o banco)' : ''}`}
        acao={<Button variant="gradient" onClick={abrirNovo}><Plus size={15} />Novo pedido</Button>}
      />

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
              {items.map(p => {
                const pag = pagamentoInfo[p.status_pagamento] ?? pagamentoInfo.pendente
                const qtdItens = itensDoPedido(p).length
                return (
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
                    <div className="line-clamp-2">{p.peca}</div>
                    {qtdItens > 1 && <div className="text-[11px] text-[var(--muted-foreground)]">{qtdItens} itens</div>}
                    <div className="text-xs text-[var(--muted-foreground)] flex justify-between items-center mt-1 mb-2">
                      <Money value={Number(p.valor)} />
                      <span>{p.prazo ? formatarDataBR(p.prazo) : '—'}</span>
                    </div>
                    <div className="mb-2"><Badge color={pag.color}>{pag.label}</Badge></div>

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
                )
              })}
              {items.length === 0 && <div className="text-center py-6 text-xs text-[var(--muted-foreground)]">Nenhum pedido aqui</div>}
            </div>
          )
        })}
      </div>

      {/* ---- FICHA DO PEDIDO ---- */}
      <Modal
        open={!!fichaAberta}
        onClose={() => setFichaAberta(null)}
        title={fichaAberta ? `Pedido #${fichaAberta.numero}` : ''}
        footer={<Button variant="ghost" onClick={() => setFichaAberta(null)}>Fechar</Button>}
      >
        {fichaAberta && (
          <div className="flex flex-col gap-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--muted)] rounded-lg p-3">
                <div className="text-[11px] font-semibold text-[var(--muted-foreground)]">Cliente</div>
                <div className="font-bold mt-0.5">{fichaAberta.cliente_nome}</div>
              </div>
              <div className="bg-[var(--muted)] rounded-lg p-3">
                <div className="text-[11px] font-semibold text-[var(--muted-foreground)]">Status</div>
                <div className="font-bold mt-0.5">{statusLabel[fichaAberta.status]}</div>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-bold text-[var(--muted-foreground)] mb-1.5">ITENS</div>
              <div className="flex flex-col gap-2">
                {itensDoPedido(fichaAberta).map(item => (
                  <div key={item.id} className="bg-[var(--muted)] rounded-lg px-3 py-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="font-semibold text-[13px]">
                        {item.nome} {item.quantidade > 1 && <span className="text-[var(--muted-foreground)]">×{item.quantidade}</span>}
                      </div>
                      <div className="font-semibold text-[13px] whitespace-nowrap">{formatMoney(item.valor_unitario * item.quantidade)}</div>
                    </div>
                    {item.origem === 'estoque' && (
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                        <Boxes size={11} />Pronta entrega (do estoque)
                      </div>
                    )}
                    {(item.materiais ?? []).length > 0 && (
                      <div className="text-[11px] text-[var(--muted-foreground)] mt-1">
                        {(item.materiais ?? []).map(m =>
                          `${materiaisApi.find(x => x.id === m.material_id)?.nome ?? '—'} ${m.peso_g}g`
                        ).join(' · ')}
                      </div>
                    )}
                    {item.link_arquivo && (
                      <a href={item.link_arquivo} target="_blank" rel="noreferrer" className="text-[11px] text-[var(--primary)] underline flex items-center gap-1 mt-1">
                        <LinkIcon size={10} />arquivo de impressão
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--accent)] rounded-lg p-3">
                <div className="text-[11px] font-semibold text-[var(--muted-foreground)]">Valor total</div>
                <div className="text-lg font-extrabold text-[var(--secondary)]">{formatMoney(Number(fichaAberta.valor))}</div>
              </div>
              <div className="bg-[var(--muted)] rounded-lg p-3">
                <div className="text-[11px] font-semibold text-[var(--muted-foreground)]">Pagamento</div>
                <div className="mt-1"><Badge color={(pagamentoInfo[fichaAberta.status_pagamento] ?? pagamentoInfo.pendente).color}>
                  {(pagamentoInfo[fichaAberta.status_pagamento] ?? pagamentoInfo.pendente).label}
                </Badge></div>
                {fichaAberta.forma_pagamento && <div className="text-[11px] text-[var(--muted-foreground)] mt-1">{fichaAberta.forma_pagamento}</div>}
                {Number(fichaAberta.valor_pago) > 0 && Number(fichaAberta.valor_pago) < Number(fichaAberta.valor) && (
                  <div className="text-[11px] text-[var(--muted-foreground)]">Pago: {formatMoney(Number(fichaAberta.valor_pago))}</div>
                )}
              </div>
            </div>

            <div><span className="text-xs font-semibold text-[var(--muted-foreground)] block">Prazo</span>{fichaAberta.prazo ? formatarDataBR(fichaAberta.prazo) : '—'}</div>
            {fichaAberta.observacoes && (
              <div>
                <span className="text-xs font-semibold text-[var(--muted-foreground)] block">Observações</span>
                <div className="flex items-start gap-1.5"><FileText size={13} className="mt-0.5 flex-shrink-0" />{fichaAberta.observacoes}</div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ---- NOVO / EDITAR ---- */}
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
        <div className="grid grid-cols-2 gap-x-4">
          <div>
            <Label>Cliente</Label>
            <Select value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}>
              <option value="">Selecione...</option>
              {clientesApi.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
          </div>
          <div><Label>Prazo de entrega</Label><Input type="date" value={form.prazo} onChange={e => setForm(f => ({ ...f, prazo: e.target.value }))} /></div>
        </div>

        <div className="flex items-center justify-between mt-1 mb-2">
          <div className="text-xs font-bold text-[var(--muted-foreground)]">ITENS DO PEDIDO</div>
          <div className="text-sm font-bold text-[var(--secondary)]">{formatMoney(totalFormulario)}</div>
        </div>

        <div className="flex flex-col gap-3 mb-3">
          {itens.map((item, idx) => (
            <div key={item.id} className="border border-[var(--border)] rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <b className="text-[13px]">Item {idx + 1}</b>
                {itens.length > 1 && (
                  <button type="button" onClick={() => removerItem(item.id)} className="text-[var(--muted-foreground)] hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-x-3">
                {catalogoApi.length > 0 && (
                  <div>
                    <Label>Do catálogo (produzir)</Label>
                    <Select value={item.catalogo_produto_id} onChange={e => aplicarCatalogo(item.id, e.target.value)}>
                      <option value="">Selecione...</option>
                      {catalogoApi.map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.nome}</option>)}
                    </Select>
                  </div>
                )}
                {prontosDisponiveis.length > 0 && (
                  <div>
                    <Label>Do estoque (pronta entrega)</Label>
                    <Select value={item.produto_pronto_id} onChange={e => aplicarProntoEstoque(item.id, e.target.value)}>
                      <option value="">Selecione...</option>
                      {prontosDisponiveis.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.quantidade} disp.)</option>)}
                    </Select>
                  </div>
                )}
              </div>

              <Label>Nome do item</Label>
              <Input placeholder="Ex: Suporte de celular" value={item.nome} onChange={e => atualizarItem(item.id, 'nome', e.target.value)} />

              <div className="grid grid-cols-2 gap-x-3">
                <div><Label>Quantidade</Label><Input value={item.quantidade} onChange={e => atualizarItem(item.id, 'quantidade', e.target.value)} /></div>
                <div><Label>Valor unitário (R$)</Label><Input placeholder="0,00" value={item.valor_unitario} onChange={e => atualizarItem(item.id, 'valor_unitario', e.target.value)} /></div>
              </div>

              {item.origem === 'estoque' ? (
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mb-1">
                  <Boxes size={12} />Pronta entrega — sai do estoque na entrega, sem gastar filamento.
                </div>
              ) : (
                <>
                  <Label>Filamento usado (por cor)</Label>
                  <div className="flex flex-col gap-2 mb-2">
                    {item.materiais.map(l => (
                      <div key={l.id} className="grid grid-cols-[1fr_80px_26px] gap-2">
                        <Select value={l.material_id} onChange={e => atualizarMaterial(item.id, l.id, 'material_id', e.target.value)} className="!mb-0">
                          <option value="">Selecione...</option>
                          {materiaisApi.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                        </Select>
                        <Input placeholder="g" value={l.peso_g} onChange={e => atualizarMaterial(item.id, l.id, 'peso_g', e.target.value)} className="!mb-0" />
                        <button
                          type="button"
                          onClick={() => removerMaterial(item.id, l.id)}
                          disabled={item.materiais.length === 1}
                          className="w-6 h-9 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:text-red-600 disabled:opacity-20"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => adicionarMaterial(item.id)} className="text-xs font-semibold text-[var(--primary)] flex items-center gap-1 mb-2">
                    <Plus size={12} />Adicionar cor
                  </button>
                  <Label>Link do arquivo (STL/3MF)</Label>
                  <Input placeholder="https://..." value={item.link_arquivo} onChange={e => atualizarItem(item.id, 'link_arquivo', e.target.value)} />
                </>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setItens(l => [...l, novoItemForm()])}
          className="text-xs font-semibold text-[var(--primary)] flex items-center gap-1 mb-4"
        >
          <Plus size={13} />Adicionar outro item
        </button>

        <div className="text-xs font-bold text-[var(--muted-foreground)] mb-2 flex items-center gap-1.5"><Wallet size={13} />PAGAMENTO</div>
        <div className="grid grid-cols-2 gap-x-4">
          <div>
            <Label>Situação</Label>
            <Select value={form.status_pagamento} onChange={e => setForm(f => ({ ...f, status_pagamento: e.target.value }))}>
              <option value="pendente">Pendente</option>
              <option value="parcial">Parcial</option>
              <option value="pago">Pago</option>
            </Select>
          </div>
          <div>
            <Label>Forma</Label>
            <Select value={form.forma_pagamento} onChange={e => setForm(f => ({ ...f, forma_pagamento: e.target.value }))}>
              <option value="">Não definida</option>
              {formasPagamento.map(f => <option key={f} value={f}>{f}</option>)}
            </Select>
          </div>
        </div>
        {form.status_pagamento === 'parcial' && (
          <div className="grid grid-cols-2 gap-x-4">
            <div><Label>Valor já pago (R$)</Label><Input placeholder="0,00" value={form.valor_pago} onChange={e => setForm(f => ({ ...f, valor_pago: e.target.value }))} /></div>
            <div><Label>Data do pagamento</Label><Input type="date" value={form.data_pagamento} onChange={e => setForm(f => ({ ...f, data_pagamento: e.target.value }))} /></div>
          </div>
        )}

        <Label>Status do pedido</Label>
        <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as StatusPedido }))}>
          <option value="orcamento">Orçamento</option>
          <option value="producao">Em produção</option>
          <option value="pronto">Pronto</option>
          <option value="entregue">Entregue</option>
        </Select>
        <Label>Observações</Label>
        <Input placeholder="Detalhe opcional sobre a produção" value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
        <div className="text-xs text-[var(--muted-foreground)] mt-1">
          Ao entregar, o pedido vira receita no Financeiro automaticamente e os itens de pronta entrega saem do estoque.
        </div>
      </Modal>
    </div>
  )
}
