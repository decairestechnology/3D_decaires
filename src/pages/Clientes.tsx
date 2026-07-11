import { useState, FormEvent } from 'react'
import { Plus, Pencil, Trash2, Mail, MapPin, FileText, Phone, Search } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { InlineConfirm } from '@/components/ui/InlineConfirm'
import { Label, Input } from '@/components/ui/Input'
import { Money, formatMoney } from '@/components/ui/Money'
import { useApi } from '@/lib/useApi'
import { api } from '@/lib/api'
import { formatarDataBR } from '@/lib/date'
import { clientes as clientesMock } from '@/data/mockData'

interface PedidoApiRow {
  id: string; numero?: number; cliente_id: string; peca: string; valor: string; prazo: string | null; status: string
}
interface OrcamentoApiRow {
  id: string; cliente_id: string | null; itens: { nome: string }[]; valor_total: string; convertido: boolean; criado_em: string
}

const statusBadge: Record<string, { color: 'cyan' | 'amber' | 'green' | 'gray'; label: string }> = {
  producao: { color: 'cyan', label: 'Em produção' },
  orcamento: { color: 'amber', label: 'Orçamento' },
  pronto: { color: 'green', label: 'Pronto' },
  entregue: { color: 'gray', label: 'Entregue' }
}

interface ClienteApiRow {
  id: string
  nome: string
  contato: string | null
  email: string | null
  endereco: string | null
  observacoes: string | null
  pedidos: number
  total_gasto: string
}

function iniciais(nome: string) {
  return nome.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
}

const formVazio = { id: '', nome: '', contato: '', email: '', endereco: '', observacoes: '' }

export function Clientes() {
  const { data, loading, error, reload } = useApi<ClienteApiRow[]>('/api/clientes', [])
  const { data: pedidosApi } = useApi<PedidoApiRow[]>('/api/pedidos', [])
  const { data: orcamentosApi } = useApi<OrcamentoApiRow[]>('/api/orcamentos', [])
  const [modalOpen, setModalOpen] = useState(false)
  const [fichaAberta, setFichaAberta] = useState<ReturnType<typeof mapCliente> | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)
  const [form, setForm] = useState(formVazio)

  const usandoMock = !loading && !!error
  const vazio = !loading && !error && data.length === 0

  function mapCliente(c: ClienteApiRow) {
    return {
      id: c.id, nome: c.nome, contato: c.contato ?? '—', email: c.email ?? '',
      endereco: c.endereco ?? '', observacoes: c.observacoes ?? '',
      pedidos: c.pedidos, totalGasto: Number(c.total_gasto)
    }
  }

  const clientes = usandoMock
    ? clientesMock.map(c => ({ ...c, email: '', endereco: '', observacoes: '' }))
    : data.map(mapCliente)

  const [busca, setBusca] = useState('')
  const clientesFiltrados = busca
    ? clientes.filter(c => c.nome.toLowerCase().includes(busca.toLowerCase()) || c.contato.toLowerCase().includes(busca.toLowerCase()))
    : clientes

  function abrirNovo() { setForm(formVazio); setModalOpen(true) }
  function abrirEdicao(c: typeof clientes[number]) {
    setForm({
      id: c.id, nome: c.nome, contato: c.contato === '—' ? '' : c.contato,
      email: c.email, endereco: c.endereco, observacoes: c.observacoes
    })
    setModalOpen(true)
  }

  async function handleSalvar(e: FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) return
    setSalvando(true)
    try {
      const payload = {
        nome: form.nome,
        contato: form.contato || null,
        email: form.email || null,
        endereco: form.endereco || null,
        observacoes: form.observacoes || null
      }
      if (form.id) await api.patch(`/api/clientes?id=${form.id}`, payload)
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
      await api.del(`/api/clientes?id=${id}`)
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

      <div className="relative mb-4 max-w-[320px]">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome ou contato..."
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] text-sm"
        />
      </div>

      <Card className="p-0">
        {vazio ? (
          <div className="text-center py-10 text-sm text-[var(--muted-foreground)]">Nenhum cliente cadastrado ainda. Clica em "Novo cliente" pra começar.</div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="text-center py-10 text-sm text-[var(--muted-foreground)]">Nenhum cliente encontrado pra "{busca}".</div>
        ) : (
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
            {clientesFiltrados.map((c, i) => {
              const last = i === clientesFiltrados.length - 1
              return (
                <tr key={c.id} onClick={() => setFichaAberta(c)} className="cursor-pointer hover:bg-[var(--muted)]">
                  <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>
                    <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 text-white flex items-center justify-center text-xs font-extrabold">
                      {iniciais(c.nome)}
                    </div>
                  </td>
                  <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>
                    {c.nome}
                    {c.email && <div className="text-xs text-[var(--muted-foreground)]">{c.email}</div>}
                  </td>
                  <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>{c.contato}</td>
                  <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>{c.pedidos}</td>
                  <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}><Money value={c.totalGasto} /></td>
                  <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`} onClick={e => e.stopPropagation()}>
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
        )}
      </Card>

      <Modal
        open={!!fichaAberta}
        onClose={() => setFichaAberta(null)}
        title={fichaAberta?.nome ?? ''}
        footer={<Button variant="ghost" onClick={() => setFichaAberta(null)}>Fechar</Button>}
      >
        {fichaAberta && (
          <div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-[var(--muted)] rounded-lg p-3">
                <div className="text-[11px] font-semibold text-[var(--muted-foreground)]">Pedidos</div>
                <div className="text-lg font-extrabold">{fichaAberta.pedidos}</div>
              </div>
              <div className="bg-[var(--muted)] rounded-lg p-3">
                <div className="text-[11px] font-semibold text-[var(--muted-foreground)]">Orçamentos</div>
                <div className="text-lg font-extrabold">{orcamentosApi.filter(o => o.cliente_id === fichaAberta.id).length}</div>
              </div>
              <div className="bg-[var(--muted)] rounded-lg p-3">
                <div className="text-[11px] font-semibold text-[var(--muted-foreground)]">Total gasto</div>
                <div className="text-lg font-extrabold">{formatMoney(fichaAberta.totalGasto)}</div>
              </div>
            </div>

            <div className="flex flex-col gap-2 text-sm mb-4">
              {fichaAberta.contato !== '—' && <div className="flex items-center gap-2"><Phone size={13} className="text-[var(--muted-foreground)]" />{fichaAberta.contato}</div>}
              {fichaAberta.email && <div className="flex items-center gap-2"><Mail size={13} className="text-[var(--muted-foreground)]" />{fichaAberta.email}</div>}
              {fichaAberta.endereco && <div className="flex items-center gap-2"><MapPin size={13} className="text-[var(--muted-foreground)]" />{fichaAberta.endereco}</div>}
              {fichaAberta.observacoes && <div className="flex items-start gap-2"><FileText size={13} className="text-[var(--muted-foreground)] mt-0.5" />{fichaAberta.observacoes}</div>}
            </div>

            <div className="text-xs font-bold text-[var(--muted-foreground)] mb-2">HISTÓRICO DE PEDIDOS</div>
            {pedidosApi.filter(p => p.cliente_id === fichaAberta.id).length === 0 ? (
              <div className="text-sm text-[var(--muted-foreground)] py-3 text-center bg-[var(--muted)] rounded-lg">Nenhum pedido ainda.</div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
                {pedidosApi.filter(p => p.cliente_id === fichaAberta.id).map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-[var(--muted)] rounded-lg px-3 py-2 text-[13px]">
                    <div>
                      {p.numero && <span className="text-[10px] font-bold text-[var(--muted-foreground)] mr-1">#{p.numero}</span>}
                      {p.peca}
                      <div className="text-xs text-[var(--muted-foreground)]">{p.prazo ? formatarDataBR(p.prazo) : 'Sem prazo'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{formatMoney(Number(p.valor))}</span>
                      <Badge color={statusBadge[p.status]?.color ?? 'gray'}>{statusBadge[p.status]?.label ?? p.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="text-xs font-bold text-[var(--muted-foreground)] mb-2 mt-4">HISTÓRICO DE ORÇAMENTOS</div>
            {orcamentosApi.filter(o => o.cliente_id === fichaAberta.id).length === 0 ? (
              <div className="text-sm text-[var(--muted-foreground)] py-3 text-center bg-[var(--muted)] rounded-lg">Nenhum orçamento ainda.</div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
                {orcamentosApi.filter(o => o.cliente_id === fichaAberta.id).map(o => (
                  <div key={o.id} className="flex items-center justify-between bg-[var(--muted)] rounded-lg px-3 py-2 text-[13px]">
                    <div>
                      {o.itens.map(it => it.nome).join(', ')}
                      <div className="text-xs text-[var(--muted-foreground)]">{formatarDataBR(o.criado_em)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{formatMoney(Number(o.valor_total))}</span>
                      <Badge color={o.convertido ? 'green' : 'amber'}>{o.convertido ? 'Virou pedido' : 'Em aberto'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

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
        <div className="grid grid-cols-2 gap-x-4">
          <div><Label>Telefone</Label><Input placeholder="(16) 99999-9999" value={form.contato} onChange={e => setForm(f => ({ ...f, contato: e.target.value }))} /></div>
          <div><Label>Email</Label><Input placeholder="cliente@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
        </div>
        <Label>Endereço</Label>
        <Input placeholder="Rua, número, bairro, cidade" value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} />
        <Label>Observações</Label>
        <Input placeholder="Preferências, histórico, o que for útil lembrar" value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
      </Modal>
    </div>
  )
}
