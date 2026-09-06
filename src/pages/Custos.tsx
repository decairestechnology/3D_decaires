import { useState, FormEvent } from 'react'
import { Plus, Pencil, Trash2, AlertTriangle, Package, Receipt, Check, ArrowDownToLine } from 'lucide-react'
import { EstadoVazio } from '@/components/ui/EstadoVazio'
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { InlineConfirm } from '@/components/ui/InlineConfirm'
import { Label, Input, Select } from '@/components/ui/Input'
import { formatMoney } from '@/components/ui/Money'
import { useApi } from '@/lib/useApi'
import { api } from '@/lib/api'
import { custoUnitarioExtra } from '@/lib/custo'

interface ExtraApiRow {
  id: string; nome: string; unidade: string; quantidade: string; quantidade_usada: string
  custo_total: string; alerta_estoque_baixo: string; observacoes: string | null
}
interface CustoOpApiRow {
  id: string; descricao: string; categoria: string; valor: string; frequencia: string; observacoes: string | null
}
interface LancamentoApiRow { id: string; data: string; custo_operacional_id: string | null }

const categoriasCusto = ['aluguel', 'salario', 'imposto', 'internet', 'software', 'marketing', 'outros']
const frequencias = [
  { valor: 'mensal', label: 'Mensal' },
  { valor: 'anual', label: 'Anual' },
  { valor: 'unico', label: 'Único' }
]
const unidades = ['un', 'ml', 'l', 'g', 'kg', 'm', 'cm', 'par', 'pct']

const formExtraVazio = { id: '', nome: '', unidade: 'un', quantidade: '', quantidade_usada: '0', custo_total: '', alerta_estoque_baixo: '0', observacoes: '', lancar_despesa: false }
const formOpVazio = { id: '', descricao: '', categoria: 'outros', valor: '', frequencia: 'mensal', observacoes: '' }

export function Custos() {
  const { data: extrasApi, loading: extrasLoading, error: extrasError, reload: reloadExtras } = useApi<ExtraApiRow[]>('/api/custos?tipo=extras', [])
  const { data: opsApi, loading: opsLoading, error: opsError, reload: reloadOps } = useApi<CustoOpApiRow[]>('/api/custos?tipo=operacionais', [])
  const { data: lancamentosApi, reload: reloadLancamentos } = useApi<LancamentoApiRow[]>('/api/lancamentos', [])
  const [lancando, setLancando] = useState<string | null>(null)

  const [aba, setAba] = useState<'extras' | 'operacionais'>('extras')
  const [modalExtra, setModalExtra] = useState(false)
  const [modalOp, setModalOp] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)
  const [formExtra, setFormExtra] = useState(formExtraVazio)
  const [formOp, setFormOp] = useState(formOpVazio)

  const extrasVazio = !extrasLoading && !extrasError && extrasApi.length === 0
  const opsVazio = !opsLoading && !opsError && opsApi.length === 0

  function saldoExtra(e: ExtraApiRow) {
    return Number(e.quantidade) - Number(e.quantidade_usada)
  }
  function baixoExtra(e: ExtraApiRow) {
    const alerta = Number(e.alerta_estoque_baixo)
    return alerta > 0 && saldoExtra(e) <= alerta
  }

  const totalMensal = opsApi.reduce((s, o) => {
    const v = Number(o.valor)
    if (o.frequencia === 'mensal') return s + v
    if (o.frequencia === 'anual') return s + v / 12
    return s
  }, 0)

  const mesAtual = new Date().toISOString().slice(0, 7)

  /** Esse custo fixo já foi lançado no Financeiro neste mês? */
  function jaLancadoNoMes(custoId: string) {
    return lancamentosApi.some(l => l.custo_operacional_id === custoId && l.data.slice(0, 7) === mesAtual)
  }

  /** Lança um custo fixo como despesa do mês no Financeiro. */
  async function lancarNoFinanceiro(o: CustoOpApiRow) {
    setLancando(o.id)
    try {
      await api.post('/api/lancamentos', {
        data: new Date().toISOString().slice(0, 10),
        descricao: o.descricao,
        tipo: 'despesa',
        valor: Number(o.valor),
        categoria: ['aluguel', 'salario', 'imposto'].includes(o.categoria) ? 'outros' : o.categoria === 'energia' ? 'energia' : 'outros',
        custo_operacional_id: o.id
      })
      reloadLancamentos()
    } catch (err) {
      console.error('[Lançar custo] erro:', err)
      alert('Não deu pra lançar no Financeiro. Confere o console (F12).')
    } finally {
      setLancando(null)
    }
  }

  /** Lança de uma vez todos os custos mensais que ainda não foram lançados. */
  async function lancarTodosDoMes() {
    const pendentes = opsApi.filter(o => o.frequencia === 'mensal' && !jaLancadoNoMes(o.id))
    if (pendentes.length === 0) return
    setLancando('todos')
    try {
      for (const o of pendentes) {
        await api.post('/api/lancamentos', {
          data: new Date().toISOString().slice(0, 10),
          descricao: o.descricao,
          tipo: 'despesa',
          valor: Number(o.valor),
          categoria: o.categoria === 'energia' ? 'energia' : 'outros',
          custo_operacional_id: o.id
        })
      }
      reloadLancamentos()
      alert(`${pendentes.length} custo(s) lançado(s) no Financeiro.`)
    } catch (err) {
      console.error('[Lançar todos] erro:', err)
      alert('Não deu pra lançar tudo. Confere o console (F12).')
    } finally {
      setLancando(null)
    }
  }

  function abrirNovoExtra() { setFormExtra(formExtraVazio); setModalExtra(true) }
  function abrirEdicaoExtra(e: ExtraApiRow) {
    setFormExtra({
      id: e.id, nome: e.nome, unidade: e.unidade, quantidade: e.quantidade,
      quantidade_usada: e.quantidade_usada, custo_total: String(e.custo_total).replace('.', ','),
      alerta_estoque_baixo: e.alerta_estoque_baixo, observacoes: e.observacoes ?? '', lancar_despesa: false
    })
    setModalExtra(true)
  }
  function abrirNovoOp() { setFormOp(formOpVazio); setModalOp(true) }
  function abrirEdicaoOp(o: CustoOpApiRow) {
    setFormOp({
      id: o.id, descricao: o.descricao, categoria: o.categoria,
      valor: String(o.valor).replace('.', ','), frequencia: o.frequencia, observacoes: o.observacoes ?? ''
    })
    setModalOp(true)
  }

  async function salvarExtra(ev: FormEvent) {
    ev.preventDefault()
    if (!formExtra.nome.trim()) return
    setSalvando(true)
    try {
      const payload = {
        nome: formExtra.nome, unidade: formExtra.unidade,
        quantidade: Number(formExtra.quantidade.replace(',', '.')) || 0,
        quantidade_usada: Number(formExtra.quantidade_usada.replace(',', '.')) || 0,
        custo_total: Number(formExtra.custo_total.replace(',', '.')) || 0,
        alerta_estoque_baixo: Number(formExtra.alerta_estoque_baixo.replace(',', '.')) || 0,
        observacoes: formExtra.observacoes || null
      }
      if (formExtra.id) {
        await api.patch(`/api/custos?tipo=extras&id=${formExtra.id}`, payload)
      } else {
        await api.post('/api/custos?tipo=extras', payload)
        // Lança a compra como despesa no Financeiro, se marcado
        if (formExtra.lancar_despesa && payload.custo_total > 0) {
          await api.post('/api/lancamentos', {
            data: new Date().toISOString().slice(0, 10),
            descricao: `Compra de material — ${formExtra.nome}`,
            tipo: 'despesa', valor: payload.custo_total, categoria: 'materiais'
          })
        }
      }
      setModalExtra(false)
      setFormExtra(formExtraVazio)
      reloadExtras()
    } catch (err) {
      console.error('[Salvar extra] erro:', err)
      const detalhe = err instanceof Error ? err.message : ''
      alert(`Não deu pra salvar. ${detalhe.slice(0, 150) || 'Confere o console (F12).'}`)
    } finally {
      setSalvando(false)
    }
  }

  async function salvarOp(ev: FormEvent) {
    ev.preventDefault()
    if (!formOp.descricao.trim()) return
    setSalvando(true)
    try {
      const payload = {
        descricao: formOp.descricao, categoria: formOp.categoria,
        valor: Number(formOp.valor.replace(',', '.')) || 0,
        frequencia: formOp.frequencia, observacoes: formOp.observacoes || null
      }
      if (formOp.id) await api.patch(`/api/custos?tipo=operacionais&id=${formOp.id}`, payload)
      else await api.post('/api/custos?tipo=operacionais', payload)
      setModalOp(false)
      setFormOp(formOpVazio)
      reloadOps()
    } catch (err) {
      console.error('[Salvar custo] erro:', err)
      const detalhe = err instanceof Error ? err.message : ''
      alert(`Não deu pra salvar. ${detalhe.slice(0, 150) || 'Confere o console (F12).'}`)
    } finally {
      setSalvando(false)
    }
  }

  async function excluirExtra(id: string) {
    try { await api.del(`/api/custos?tipo=extras&id=${id}`); setConfirmandoId(null); reloadExtras() }
    catch (err) { console.error('[Excluir] erro:', err); alert('Não deu pra excluir.') }
  }
  async function excluirOp(id: string) {
    try { await api.del(`/api/custos?tipo=operacionais&id=${id}`); setConfirmandoId(null); reloadOps() }
    catch (err) { console.error('[Excluir] erro:', err); alert('Não deu pra excluir.') }
  }

  return (
    <div>
      <CabecalhoPagina
        titulo="Custos"
        descricao="Insumos que não são filamento e custos fixos do negócio"
        acao={
          <Button variant="gradient" onClick={aba === 'extras' ? abrirNovoExtra : abrirNovoOp}>
            <Plus size={15} />{aba === 'extras' ? 'Novo material extra' : 'Novo custo fixo'}
          </Button>
        }
      />

      <div className="mb-4 flex gap-2">
        {([['extras', 'Materiais extras'], ['operacionais', 'Custos operacionais']] as const).map(([tab, label]) => (
          <span
            key={tab}
            onClick={() => setAba(tab)}
            className={`inline-flex px-4 py-1.5 rounded-full text-[13px] font-semibold cursor-pointer border
            ${aba === tab ? 'bg-[var(--accent)] text-[var(--primary)] border-[var(--primary)]' : 'bg-[var(--muted)] text-[var(--muted-foreground)] border-transparent'}`}
          >
            {label}
          </span>
        ))}
      </div>

      {aba === 'extras' && (
        <>
          <p className="text-[var(--muted-foreground)] text-sm mb-4">
            Parafuso, ímã, tinta, embalagem — tudo que entra na peça além do filamento. O custo unitário sai do total pago dividido pela quantidade.
          </p>
          {extrasApi.some(baixoExtra) && (
            <div className="bg-[#FEF2F2] border border-red-300 text-[#991B1B] rounded-lg px-3.5 py-2.5 text-sm font-semibold flex items-center gap-2 mb-4">
              <AlertTriangle size={16} /> {extrasApi.filter(baixoExtra).length} material(is) extra(s) com estoque baixo
            </div>
          )}
          <Card className="p-0">
            {extrasVazio ? (
              <EstadoVazio icone={Package} titulo="Nenhum material extra ainda" descricao="Parafuso, ímã, tinta, embalagem — tudo que entra na peça além do filamento." acaoTexto="Cadastrar primeiro material" onAcao={abrirNovoExtra} />
            ) : (
              <table className="w-full border-collapse text-[13.5px]">
                <thead>
                  <tr>
                    <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]">Material</th>
                    <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]">Saldo</th>
                    <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]">Custo unitário</th>
                    <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]">Custo total</th>
                    <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]"></th>
                  </tr>
                </thead>
                <tbody>
                  {extrasApi.map((e, i) => {
                    const last = i === extrasApi.length - 1
                    const custoUn = custoUnitarioExtra(Number(e.custo_total), Number(e.quantidade))
                    return (
                      <tr key={e.id}>
                        <td className={`px-3 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>
                          {e.nome}
                          {e.observacoes && <div className="text-xs text-[var(--muted-foreground)]">{e.observacoes}</div>}
                        </td>
                        <td className={`px-3 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>
                          <span className="flex items-center gap-2">
                            {saldoExtra(e)} {e.unidade}
                            {baixoExtra(e) && <Badge color="red">Baixo</Badge>}
                          </span>
                        </td>
                        <td className={`px-3 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>{formatMoney(custoUn)}</td>
                        <td className={`px-3 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>{formatMoney(Number(e.custo_total))}</td>
                        <td className={`px-3 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>
                          {confirmandoId === e.id ? (
                            <InlineConfirm onCancel={() => setConfirmandoId(null)} onConfirm={() => excluirExtra(e.id)} />
                          ) : (
                            <div className="flex gap-1">
                              <button onClick={() => abrirEdicaoExtra(e)} className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)]"><Pencil size={13} /></button>
                              <button onClick={() => setConfirmandoId(e.id)} className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
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
        </>
      )}

      {aba === 'operacionais' && (
        <>
          <p className="text-[var(--muted-foreground)] text-sm mb-4">
            Aluguel, salário, imposto, internet — o que você paga todo mês independente de produzir. Aqui é só o cadastro; use o botão Lançar pra jogar a despesa no Financeiro do mês.
          </p>
          <div className="flex gap-4 flex-wrap mb-4">
            <Card className="flex-1 min-w-[220px]">
              <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><Receipt size={14} />Custo fixo mensal</div>
              <div className="text-2xl font-extrabold">{formatMoney(totalMensal)}</div>
              <div className="text-xs text-[var(--muted-foreground)] mt-1">Anuais já divididos por 12</div>
            </Card>
            <Card className="flex-1 min-w-[220px]">
              <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><Package size={14} />Custos cadastrados</div>
              <div className="text-2xl font-extrabold">{opsApi.length}</div>
            </Card>
            <Card className="flex-1 min-w-[220px]">
              <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><ArrowDownToLine size={14} />Lancados este mes</div>
              <div className="text-2xl font-extrabold">
                {opsApi.filter(o => jaLancadoNoMes(o.id)).length}
                <span className="text-base font-normal text-[var(--muted-foreground)]"> de {opsApi.filter(o => o.frequencia === 'mensal').length}</span>
              </div>
              {opsApi.some(o => o.frequencia === 'mensal' && !jaLancadoNoMes(o.id)) && (
                <button
                  onClick={lancarTodosDoMes}
                  disabled={lancando === 'todos'}
                  className="text-xs font-semibold text-[var(--primary)] mt-1.5"
                >
                  {lancando === 'todos' ? 'Lancando...' : 'Lancar os que faltam'}
                </button>
              )}
            </Card>
          </div>
          <Card className="p-0">
            {opsVazio ? (
              <EstadoVazio icone={Receipt} titulo="Nenhum custo fixo ainda" descricao="Aluguel, salário, imposto — o que você paga todo mês independente de produzir." acaoTexto="Cadastrar primeiro custo" onAcao={abrirNovoOp} />
            ) : (
              <table className="w-full border-collapse text-[13.5px]">
                <thead>
                  <tr>
                    <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]">Descrição</th>
                    <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]">Categoria</th>
                    <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]">Valor</th>
                    <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]">Frequência</th>
                    <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]">Financeiro</th>
                    <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]"></th>
                  </tr>
                </thead>
                <tbody>
                  {opsApi.map((o, i) => {
                    const last = i === opsApi.length - 1
                    return (
                      <tr key={o.id}>
                        <td className={`px-3 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>
                          {o.descricao}
                          {o.observacoes && <div className="text-xs text-[var(--muted-foreground)]">{o.observacoes}</div>}
                        </td>
                        <td className={`px-3 py-2.5 capitalize ${!last ? 'border-b border-[var(--border)]' : ''}`}>{o.categoria}</td>
                        <td className={`px-3 py-2.5 font-semibold ${!last ? 'border-b border-[var(--border)]' : ''}`}>{formatMoney(Number(o.valor))}</td>
                        <td className={`px-3 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>
                          {frequencias.find(f => f.valor === o.frequencia)?.label ?? o.frequencia}
                        </td>
                        <td className={`px-3 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>
                          {jaLancadoNoMes(o.id) ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              <Check size={13} />Lancado
                            </span>
                          ) : (
                            <button
                              onClick={() => lancarNoFinanceiro(o)}
                              disabled={lancando === o.id}
                              className="text-xs font-semibold text-[var(--primary)] flex items-center gap-1 hover:underline"
                            >
                              <ArrowDownToLine size={12} />{lancando === o.id ? 'Lancando...' : 'Lancar'}
                            </button>
                          )}
                        </td>
                        <td className={`px-3 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>
                          {confirmandoId === o.id ? (
                            <InlineConfirm onCancel={() => setConfirmandoId(null)} onConfirm={() => excluirOp(o.id)} />
                          ) : (
                            <div className="flex gap-1">
                              <button onClick={() => abrirEdicaoOp(o)} className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)]"><Pencil size={13} /></button>
                              <button onClick={() => setConfirmandoId(o.id)} className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
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
        </>
      )}

      <Modal
        open={modalExtra}
        onClose={() => setModalExtra(false)}
        title={formExtra.id ? 'Editar material extra' : 'Novo material extra'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalExtra(false)}>Cancelar</Button>
            <Button variant="gradient" disabled={salvando} onClick={salvarExtra}><Plus size={15} />{salvando ? 'Salvando...' : 'Salvar'}</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-x-4">
          <div><Label>Nome</Label><Input placeholder="Ex: Parafuso M3" value={formExtra.nome} onChange={e => setFormExtra(f => ({ ...f, nome: e.target.value }))} /></div>
          <div>
            <Label>Unidade</Label>
            <Select value={formExtra.unidade} onChange={e => setFormExtra(f => ({ ...f, unidade: e.target.value }))}>
              {unidades.map(u => <option key={u} value={u}>{u}</option>)}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          <div>
            <Label>Quantidade comprada</Label>
            <Input placeholder="100" value={formExtra.quantidade} onChange={e => setFormExtra(f => ({ ...f, quantidade: e.target.value }))} />
          </div>
          <div>
            <Label>Quantidade já usada</Label>
            <Input placeholder="0" value={formExtra.quantidade_usada} onChange={e => setFormExtra(f => ({ ...f, quantidade_usada: e.target.value }))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          <div>
            <Label>Custo total pago (R$)</Label>
            <Input placeholder="0,00" value={formExtra.custo_total} onChange={e => setFormExtra(f => ({ ...f, custo_total: e.target.value }))} />
          </div>
          <div>
            <Label>Alerta de estoque baixo</Label>
            <Input placeholder="0" value={formExtra.alerta_estoque_baixo} onChange={e => setFormExtra(f => ({ ...f, alerta_estoque_baixo: e.target.value }))} />
          </div>
        </div>
        {formExtra.quantidade && formExtra.custo_total && (
          <div className="text-[11px] text-[var(--muted-foreground)] -mt-2 mb-3">
            Custo unitário: {formatMoney(custoUnitarioExtra(Number(formExtra.custo_total.replace(',', '.')) || 0, Number(formExtra.quantidade.replace(',', '.')) || 0))} por {formExtra.unidade}
          </div>
        )}
        {!formExtra.id && (
          <label className="flex items-center gap-2 text-[13px] font-semibold cursor-pointer bg-[var(--muted)] rounded-lg p-3 mb-3">
            <input
              type="checkbox"
              checked={formExtra.lancar_despesa}
              onChange={e => setFormExtra(f => ({ ...f, lancar_despesa: e.target.checked }))}
              className="w-4 h-4"
            />
            Lançar essa compra como despesa no Financeiro
          </label>
        )}
        <Label>Observações</Label>
        <Input placeholder="Detalhe opcional" value={formExtra.observacoes} onChange={e => setFormExtra(f => ({ ...f, observacoes: e.target.value }))} />
      </Modal>

      <Modal
        open={modalOp}
        onClose={() => setModalOp(false)}
        title={formOp.id ? 'Editar custo fixo' : 'Novo custo fixo'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOp(false)}>Cancelar</Button>
            <Button variant="gradient" disabled={salvando} onClick={salvarOp}><Plus size={15} />{salvando ? 'Salvando...' : 'Salvar'}</Button>
          </>
        }
      >
        <Label>Descrição</Label>
        <Input placeholder="Ex: Aluguel do espaço" value={formOp.descricao} onChange={e => setFormOp(f => ({ ...f, descricao: e.target.value }))} />
        <div className="grid grid-cols-2 gap-x-4">
          <div>
            <Label>Categoria</Label>
            <Select value={formOp.categoria} onChange={e => setFormOp(f => ({ ...f, categoria: e.target.value }))}>
              {categoriasCusto.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
            </Select>
          </div>
          <div>
            <Label>Frequência</Label>
            <Select value={formOp.frequencia} onChange={e => setFormOp(f => ({ ...f, frequencia: e.target.value }))}>
              {frequencias.map(f => <option key={f.valor} value={f.valor}>{f.label}</option>)}
            </Select>
          </div>
        </div>
        <Label>Valor (R$)</Label>
        <Input placeholder="0,00" value={formOp.valor} onChange={e => setFormOp(f => ({ ...f, valor: e.target.value }))} />
        <Label>Observações</Label>
        <Input placeholder="Detalhe opcional" value={formOp.observacoes} onChange={e => setFormOp(f => ({ ...f, observacoes: e.target.value }))} />
      </Modal>
    </div>
  )
}
