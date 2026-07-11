import { useState, FormEvent } from 'react'
import { Plus, Pencil, Trash2, EyeOff, Eye as EyeIcon, Tag } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { InlineConfirm } from '@/components/ui/InlineConfirm'
import { Label, Input, Select } from '@/components/ui/Input'
import { formatMoney } from '@/components/ui/Money'
import { useApi } from '@/lib/useApi'
import { api } from '@/lib/api'

interface ProdutoApiRow {
  id: string; codigo: string; nome: string; material_id: string | null; material_nome: string | null
  peso_padrao_g: string | null; tempo_impressao_h: string | null; preco_padrao: string | null
  descricao: string | null; ativo: boolean
}
interface MaterialApiRow { id: string; nome: string }

const formVazio = { id: '', codigo: '', nome: '', material_id: '', peso_padrao_g: '', tempo_impressao_h: '', preco_padrao: '', descricao: '' }

export function Catalogo() {
  const { data, loading, error, reload } = useApi<ProdutoApiRow[]>('/api/catalogo', [])
  const { data: materiaisApi } = useApi<MaterialApiRow[]>('/api/materiais', [])
  const [modalOpen, setModalOpen] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)
  const [form, setForm] = useState(formVazio)

  const usandoMock = !loading && !!error
  const vazio = !loading && !error && data.length === 0
  const produtos = usandoMock ? [] : data

  function abrirNovo() { setForm(formVazio); setModalOpen(true) }
  function abrirEdicao(p: ProdutoApiRow) {
    setForm({
      id: p.id, codigo: p.codigo, nome: p.nome, material_id: p.material_id ?? '',
      peso_padrao_g: p.peso_padrao_g ?? '', tempo_impressao_h: p.tempo_impressao_h ?? '',
      preco_padrao: p.preco_padrao ? String(p.preco_padrao).replace('.', ',') : '', descricao: p.descricao ?? ''
    })
    setModalOpen(true)
  }

  async function handleSalvar(e: FormEvent) {
    e.preventDefault()
    if (!form.codigo.trim() || !form.nome.trim()) return
    setSalvando(true)
    try {
      const payload = {
        codigo: form.codigo.trim().toUpperCase(), nome: form.nome, material_id: form.material_id || null,
        peso_padrao_g: form.peso_padrao_g ? Number(form.peso_padrao_g) : null,
        tempo_impressao_h: form.tempo_impressao_h ? Number(form.tempo_impressao_h.replace(',', '.')) : null,
        preco_padrao: form.preco_padrao ? Number(form.preco_padrao.replace(',', '.')) : null,
        descricao: form.descricao || null
      }
      if (form.id) await api.patch(`/api/catalogo?id=${form.id}`, payload)
      else await api.post('/api/catalogo', payload)
      setModalOpen(false)
      setForm(formVazio)
      reload()
    } catch (err) {
      console.error('[Salvar] erro:', err)
      alert('Não deu pra salvar — o código pode já existir, ou confere a conexão com o banco.')
    } finally {
      setSalvando(false)
    }
  }

  async function alternarAtivo(p: ProdutoApiRow) {
    try { await api.patch(`/api/catalogo?id=${p.id}`, { ativo: !p.ativo }); reload() }
    catch (err) { console.error('[Alternar ativo] erro:', err) }
  }

  async function excluir(id: string) {
    try { await api.del(`/api/catalogo?id=${id}`); setConfirmandoId(null); reload() }
    catch (err) { console.error('[Excluir] erro:', err); alert('Não deu pra excluir. Confere a conexão com o banco.') }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-semibold m-0">Catálogo</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-0.5">Produtos com código de referência — usa em Pedido ou Orçamento sem digitar tudo de novo {usandoMock && '(sem conexão com o banco)'}</p>
        </div>
        <Button variant="gradient" onClick={abrirNovo}><Plus size={15} />Novo produto</Button>
      </div>

      {vazio ? (
        <Card><div className="text-center py-10 text-sm text-[var(--muted-foreground)]">Nenhum produto no catálogo ainda. Clica em "Novo produto" pra começar.</div></Card>
      ) : (
        <Card className="p-0">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr>
                <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]">Código</th>
                <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]">Nome</th>
                <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]">Material</th>
                <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]">Peso</th>
                <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]">Preço padrão</th>
                <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]"></th>
                <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]"></th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p, i) => {
                const last = i === produtos.length - 1
                return (
                  <tr key={p.id}>
                    <td className={`px-3 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-bold bg-[var(--muted)] px-2 py-1 rounded"><Tag size={11} />{p.codigo}</span>
                    </td>
                    <td className={`px-3 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>
                      {p.nome}
                      {!p.ativo && <Badge color="gray">Oculto</Badge>}
                    </td>
                    <td className={`px-3 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>{p.material_nome ?? '—'}</td>
                    <td className={`px-3 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>{p.peso_padrao_g ? `${p.peso_padrao_g}g` : '—'}</td>
                    <td className={`px-3 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>{p.preco_padrao ? formatMoney(Number(p.preco_padrao)) : '—'}</td>
                    <td className={`px-3 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>
                      {confirmandoId === p.id ? (
                        <InlineConfirm onCancel={() => setConfirmandoId(null)} onConfirm={() => excluir(p.id)} />
                      ) : (
                        <div className="flex gap-1">
                          <button onClick={() => alternarAtivo(p)} title={p.ativo ? 'Ocultar' : 'Mostrar'} className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)]">
                            {p.ativo ? <EyeIcon size={13} /> : <EyeOff size={13} />}
                          </button>
                          <button onClick={() => abrirEdicao(p)} className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)]"><Pencil size={13} /></button>
                          <button onClick={() => setConfirmandoId(p.id)} className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Editar produto do catálogo' : 'Novo produto no catálogo'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="gradient" disabled={salvando} onClick={handleSalvar}><Plus size={15} />{salvando ? 'Salvando...' : 'Salvar'}</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-x-4">
          <div><Label>Código de referência</Label><Input placeholder="Ex: VASO-P" value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))} /></div>
          <div><Label>Nome do produto</Label><Input placeholder="Ex: Vaso decorativo P" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
        </div>
        <Label>Material padrão</Label>
        <Select value={form.material_id} onChange={e => setForm(f => ({ ...f, material_id: e.target.value }))}>
          <option value="">Nenhum (escolhe na hora do pedido)</option>
          {materiaisApi.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </Select>
        <div className="grid grid-cols-3 gap-x-4">
          <div><Label>Peso padrão (g)</Label><Input placeholder="80" value={form.peso_padrao_g} onChange={e => setForm(f => ({ ...f, peso_padrao_g: e.target.value }))} /></div>
          <div><Label>Tempo impressão (h)</Label><Input placeholder="6" value={form.tempo_impressao_h} onChange={e => setForm(f => ({ ...f, tempo_impressao_h: e.target.value }))} /></div>
          <div><Label>Preço padrão (R$)</Label><Input placeholder="0,00" value={form.preco_padrao} onChange={e => setForm(f => ({ ...f, preco_padrao: e.target.value }))} /></div>
        </div>
        <Label>Descrição</Label>
        <Input placeholder="Detalhe opcional" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
      </Modal>
    </div>
  )
}
