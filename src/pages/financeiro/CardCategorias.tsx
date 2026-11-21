import { useState } from 'react'
import { Plus, Trash2, Lock, Pencil, Check, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Label, Input, Select } from '@/components/ui/Input'
import { InlineConfirm } from '@/components/ui/InlineConfirm'
import { useApi } from '@/lib/useApi'
import { api } from '@/lib/api'
import { CategoriaFinanceira, motivoErro } from '@/lib/financeiro'

const rotuloTipo: Record<CategoriaFinanceira['tipo'], string> = { receita: 'Receita', despesa: 'Despesa', ambos: 'Ambos' }

/** Card de Configurações pra cadastrar as categorias do Financeiro. */
export function CardCategorias({ className = '' }: { className?: string }) {
  const { data, error, reload } = useApi<CategoriaFinanceira[]>('/api/lancamentos?recurso=categorias', [])
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<CategoriaFinanceira['tipo']>('despesa')
  const [salvando, setSalvando] = useState(false)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)
  const [editando, setEditando] = useState<{ id: string; nome: string } | null>(null)

  async function adicionar() {
    if (!nome.trim()) return
    setSalvando(true)
    try {
      await api.post('/api/lancamentos?recurso=categorias', { nome, tipo })
      setNome('')
      reload()
    } catch (err) {
      alert('Não deu pra cadastrar a categoria.\n\nMotivo: ' + motivoErro(err))
    } finally {
      setSalvando(false)
    }
  }
  async function renomear() {
    if (!editando || !editando.nome.trim()) return
    try {
      await api.patch(`/api/lancamentos?recurso=categorias&id=${editando.id}`, { nome: editando.nome })
      setEditando(null)
      reload()
    } catch (err) {
      alert('Não deu pra renomear.\n\nMotivo: ' + motivoErro(err))
    }
  }
  async function excluir(c: CategoriaFinanceira) {
    try {
      await api.del(`/api/lancamentos?recurso=categorias&id=${c.id}`)
      setConfirmandoId(null)
      reload()
    } catch (err) {
      alert('Não deu pra excluir.\n\nMotivo: ' + motivoErro(err))
    }
  }

  const grupos: { titulo: string; itens: CategoriaFinanceira[] }[] = [
    { titulo: 'Receitas', itens: data.filter(c => c.tipo === 'receita') },
    { titulo: 'Despesas', itens: data.filter(c => c.tipo === 'despesa') },
    { titulo: 'Receita e despesa', itens: data.filter(c => c.tipo === 'ambos') }
  ]

  return (
    <Card className={`mt-4 flex-1 min-w-[300px] max-w-[420px] ${className}`}>
      <div className="text-xs font-bold text-[var(--muted-foreground)] mb-1">CATEGORIAS DO FINANCEIRO</div>
      <div className="text-xs text-[var(--muted-foreground)] mb-3">
        Aparecem na hora de lançar receita ou despesa e nos gráficos de “onde o dinheiro foi”.
      </div>

      {error && (
        <div className="text-xs text-red-600 mb-3">Não deu pra carregar — confere se a migração 026 foi rodada no Neon.</div>
      )}

      {grupos.filter(g => g.itens.length > 0).map(g => (
        <div key={g.titulo} className="mb-2">
          <div className="text-[11px] font-semibold text-[var(--muted-foreground)] mt-2 mb-1">{g.titulo}</div>
          {g.itens.map(c => (
            <div key={c.id} className="flex items-center gap-2 py-1.5 text-[13px] border-b border-[var(--border)] min-h-[38px]">
              {confirmandoId === c.id ? (
                <div className="flex-1">
                  {!!c.em_uso && <div className="text-[11px] text-[var(--muted-foreground)] mb-1">{c.em_uso} lançamento(s) vão para “Outros”.</div>}
                  <InlineConfirm onCancel={() => setConfirmandoId(null)} onConfirm={() => excluir(c)} />
                </div>
              ) : editando?.id === c.id ? (
                <>
                  <input
                    autoFocus
                    value={editando.nome}
                    onChange={e => setEditando({ id: c.id, nome: e.target.value })}
                    onKeyDown={e => { if (e.key === 'Enter') renomear(); if (e.key === 'Escape') setEditando(null) }}
                    className="flex-1 px-2 py-1 rounded border border-[var(--border)] bg-[var(--muted)] text-[13px]"
                  />
                  <button onClick={renomear} title="Salvar" className="w-7 h-7 rounded flex items-center justify-center text-[var(--primary)] hover:bg-[var(--muted)]"><Check size={13} /></button>
                  <button onClick={() => setEditando(null)} title="Cancelar" className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)]"><X size={13} /></button>
                </>
              ) : (
                <>
                  <span className="flex-1">{c.nome}</span>
                  {!!c.em_uso && <span className="text-[11px] text-[var(--muted-foreground)]">{c.em_uso} uso(s)</span>}
                  <button onClick={() => setEditando({ id: c.id, nome: c.nome })} title="Renomear" className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)]"><Pencil size={12} /></button>
                  {c.sistema ? (
                    <span title="Usada pelas automações (vendas, compras de material). Não pode excluir." className="w-7 h-7 flex items-center justify-center text-[var(--muted-foreground)]"><Lock size={12} /></span>
                  ) : (
                    <button onClick={() => setConfirmandoId(c.id)} title="Excluir" className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      ))}

      <div className="grid grid-cols-[1fr_120px] gap-x-2 mt-3">
        <div><Label>Nova categoria</Label><Input placeholder="Ex: Feira / evento" value={nome} onChange={e => setNome(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') adicionar() }} /></div>
        <div>
          <Label>Tipo</Label>
          <Select value={tipo} onChange={e => setTipo(e.target.value as CategoriaFinanceira['tipo'])}>
            {(Object.keys(rotuloTipo) as CategoriaFinanceira['tipo'][]).map(t => <option key={t} value={t}>{rotuloTipo[t]}</option>)}
          </Select>
        </div>
      </div>
      <Button variant="primary" disabled={salvando || !nome.trim()} onClick={adicionar}>
        <Plus size={15} />{salvando ? 'Salvando...' : 'Adicionar categoria'}
      </Button>
    </Card>
  )
}
