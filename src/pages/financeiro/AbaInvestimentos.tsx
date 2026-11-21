import { useMemo, useState } from 'react'
import {
  Plus, Pencil, Trash2, PiggyBank, ArrowDownToLine, ArrowUpFromLine, TrendingUp, RefreshCw, Landmark, AlertTriangle
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Money, formatMoney } from '@/components/ui/Money'
import { Modal } from '@/components/ui/Modal'
import { InlineConfirm } from '@/components/ui/InlineConfirm'
import { Label, Input, Select } from '@/components/ui/Input'
import { EstadoVazio } from '@/components/ui/EstadoVazio'
import { api } from '@/lib/api'
import { formatarDataBR } from '@/lib/date'
import {
  InvestimentoApiRow, MovimentoApiRow, tiposInvestimento, hojeLocal, lerValor, valorParaCampo,
  motivoErro, diasAte, saldoAte
} from '@/lib/financeiro'

const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

type TipoMov = 'aplicacao' | 'resgate' | 'rendimento' | 'atualizar_saldo'

const tituloMov: Record<TipoMov, string> = {
  aplicacao: 'Aplicar dinheiro',
  resgate: 'Resgatar',
  rendimento: 'Lançar rendimento',
  atualizar_saldo: 'Atualizar saldo'
}

const formInvVazio = { id: '', nome: '', banco: '', tipo: 'cdb', observacoes: '', saldo_inicial: '', ativo: true }
const formMovVazio = { investimentoId: '', tipo: 'aplicacao' as TipoMov, valor: '', data: '', afetaCaixa: true, descricao: '' }

interface Props {
  investimentos: InvestimentoApiRow[]
  movimentos: MovimentoApiRow[]
  saldoCaixa: number
  erroCarregar: boolean
  onMudou: () => void
}

export function AbaInvestimentos({ investimentos, movimentos, saldoCaixa, erroCarregar, onMudou }: Props) {
  const [modalInv, setModalInv] = useState(false)
  const [modalMov, setModalMov] = useState(false)
  const [formInv, setFormInv] = useState(formInvVazio)
  const [formMov, setFormMov] = useState(formMovVazio)
  const [salvando, setSalvando] = useState(false)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)
  const [filtroHistorico, setFiltroHistorico] = useState('')
  const [mostrarEncerrados, setMostrarEncerrados] = useState(false)

  const ativos = investimentos.filter(i => i.ativo)
  const encerrados = investimentos.filter(i => !i.ativo)
  const totalInvestido = investimentos.reduce((s, i) => s + Number(i.saldo), 0)
  const totalRendimento = investimentos.reduce((s, i) => s + Number(i.total_rendimento), 0)
  const mesAtual = hojeLocal().slice(0, 7)
  const rendimentoMes = movimentos
    .filter(m => m.tipo === 'rendimento' && m.data.slice(0, 7) === mesAtual)
    .reduce((s, m) => s + Number(m.valor), 0)
  const aplicadoLiquido = investimentos.reduce((s, i) => s + Number(i.total_aplicado) - Number(i.total_resgatado), 0)
  const pctRendimento = aplicadoLiquido > 0 ? (totalRendimento / aplicadoLiquido) * 100 : 0

  /** Saldo total no fim de cada um dos últimos 12 meses. */
  const evolucao = useMemo(() => {
    const h = new Date()
    const pontos: { mes: string; Investido: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const fim = new Date(h.getFullYear(), h.getMonth() - i + 1, 0)
      const iso = `${fim.getFullYear()}-${String(fim.getMonth() + 1).padStart(2, '0')}-${String(fim.getDate()).padStart(2, '0')}`
      pontos.push({ mes: `${mesesNomes[fim.getMonth()]}/${String(fim.getFullYear()).slice(2)}`, Investido: Math.round(saldoAte(movimentos, iso) * 100) / 100 })
    }
    // Começa o gráfico no primeiro mês que teve dinheiro, pra não ficar uma linha reta no zero.
    const primeiro = pontos.findIndex(p => p.Investido !== 0)
    return primeiro <= 0 ? pontos : pontos.slice(primeiro)
  }, [movimentos])

  const historico = movimentos.filter(m => !filtroHistorico || m.investimento_id === filtroHistorico)

  function abrirNovoInvestimento() {
    setFormInv({ ...formInvVazio })
    setModalInv(true)
  }
  function abrirEdicaoInvestimento(i: InvestimentoApiRow) {
    setFormInv({ id: i.id, nome: i.nome, banco: i.banco ?? '', tipo: i.tipo, observacoes: i.observacoes ?? '', saldo_inicial: '', ativo: i.ativo })
    setModalInv(true)
  }
  function abrirMovimento(i: InvestimentoApiRow, tipo: TipoMov) {
    setFormMov({ ...formMovVazio, investimentoId: i.id, tipo, data: hojeLocal() })
    setModalMov(true)
  }

  async function salvarInvestimento() {
    if (!formInv.nome.trim()) return
    setSalvando(true)
    try {
      if (formInv.id) {
        await api.patch(`/api/lancamentos?recurso=investimentos&id=${formInv.id}`, {
          nome: formInv.nome, banco: formInv.banco, tipo: formInv.tipo, observacoes: formInv.observacoes, ativo: formInv.ativo
        })
      } else {
        const inicial = lerValor(formInv.saldo_inicial)
        await api.post('/api/lancamentos?recurso=investimentos', {
          nome: formInv.nome, banco: formInv.banco, tipo: formInv.tipo, observacoes: formInv.observacoes,
          saldo_inicial: inicial > 0 ? inicial : 0, data: hojeLocal()
        })
      }
      setModalInv(false)
      onMudou()
    } catch (err) {
      alert('Não deu pra salvar o investimento.\n\nMotivo: ' + motivoErro(err))
    } finally {
      setSalvando(false)
    }
  }

  const invDoMov = investimentos.find(i => i.id === formMov.investimentoId)
  const saldoDoMov = invDoMov ? Number(invDoMov.saldo) : 0
  const valorMov = lerValor(formMov.valor)
  const diferencaAtualizacao = formMov.tipo === 'atualizar_saldo' && Number.isFinite(valorMov) ? valorMov - saldoDoMov : 0
  const caixaFicaNegativo = formMov.tipo === 'aplicacao' && formMov.afetaCaixa && Number.isFinite(valorMov) && valorMov > saldoCaixa

  async function salvarMovimento() {
    if (!formMov.investimentoId || !formMov.valor.trim()) return
    setSalvando(true)
    try {
      const v = lerValor(formMov.valor)
      const payload = formMov.tipo === 'atualizar_saldo'
        ? { investimento_id: formMov.investimentoId, tipo: 'atualizar_saldo', saldo_atual: v, data: formMov.data || hojeLocal(), descricao: formMov.descricao || null }
        : {
            investimento_id: formMov.investimentoId, tipo: formMov.tipo, valor: v, data: formMov.data || hojeLocal(),
            afeta_caixa: formMov.afetaCaixa, descricao: formMov.descricao || null
          }
      await api.post('/api/lancamentos?recurso=movimentos', payload)
      setModalMov(false)
      onMudou()
    } catch (err) {
      alert('Não deu pra salvar.\n\nMotivo: ' + motivoErro(err))
    } finally {
      setSalvando(false)
    }
  }

  async function excluirInvestimento(id: string) {
    try { await api.del(`/api/lancamentos?recurso=investimentos&id=${id}`); setConfirmandoId(null); onMudou() }
    catch (err) { alert('Não deu pra excluir.\n\nMotivo: ' + motivoErro(err)) }
  }
  async function excluirMovimento(id: string) {
    try { await api.del(`/api/lancamentos?recurso=movimentos&id=${id}`); setConfirmandoId(null); onMudou() }
    catch (err) { alert('Não deu pra excluir.\n\nMotivo: ' + motivoErro(err)) }
  }

  if (erroCarregar) {
    return (
      <Card>
        <EstadoVazio
          icone={AlertTriangle}
          titulo="Investimentos ainda não ativados"
          descricao="Roda a migração 026 no Neon (SQL Editor) e recarrega a página com Ctrl+Shift+R."
        />
      </Card>
    )
  }

  function cardInvestimento(i: InvestimentoApiRow) {
    const saldo = Number(i.saldo)
    const rendeu = Number(i.total_rendimento)
    const base = Number(i.total_aplicado) - Number(i.total_resgatado)
    const pct = base > 0 ? (rendeu / base) * 100 : 0
    const diasSemAtualizar = i.ultimo_movimento ? -diasAte(i.ultimo_movimento) : null
    return (
      <Card key={i.id} className={`flex-1 min-w-[280px] max-w-[420px] ${i.ativo ? '' : 'opacity-70'}`}>
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <div className="font-bold text-sm truncate">{i.nome}</div>
            <div className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-1.5 mt-0.5">
              <Landmark size={11} />{i.banco || 'Banco não informado'} · {tiposInvestimento[i.tipo] ?? i.tipo}
            </div>
          </div>
          {confirmandoId === i.id ? null : (
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => abrirEdicaoInvestimento(i)} title="Editar" className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)]"><Pencil size={13} /></button>
              <button onClick={() => setConfirmandoId(i.id)} title="Excluir" className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
            </div>
          )}
        </div>

        {confirmandoId === i.id ? (
          <div className="mt-3">
            <div className="text-xs text-[var(--muted-foreground)] mb-2">
              Apaga o investimento e todo o histórico dele. Se o dinheiro ainda está no banco, prefira "Resgatar" ou marcar como encerrado.
            </div>
            <InlineConfirm onCancel={() => setConfirmandoId(null)} onConfirm={() => excluirInvestimento(i.id)} />
          </div>
        ) : (
          <>
            <div className="text-2xl font-extrabold mt-3"><Money value={saldo} /></div>
            <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
              rendeu <span className={rendeu >= 0 ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-red-600 font-semibold'}>{formatMoney(rendeu)}</span>
              {base > 0 && <> ({pct.toFixed(2).replace('.', ',')}%)</>}
            </div>
            {i.ativo && diasSemAtualizar !== null && diasSemAtualizar > 30 && (
              <div className="text-[11px] text-amber-700 mt-1.5 flex items-center gap-1"><RefreshCw size={11} />Sem atualizar há {diasSemAtualizar} dias</div>
            )}
            {i.ativo && (
              <div className="grid grid-cols-2 gap-1.5 mt-3">
                <button onClick={() => abrirMovimento(i, 'aplicacao')} className="text-xs font-semibold px-2 py-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--accent)] flex items-center justify-center gap-1.5"><ArrowDownToLine size={13} />Aplicar</button>
                <button onClick={() => abrirMovimento(i, 'resgate')} className="text-xs font-semibold px-2 py-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--accent)] flex items-center justify-center gap-1.5"><ArrowUpFromLine size={13} />Resgatar</button>
                <button onClick={() => abrirMovimento(i, 'atualizar_saldo')} className="text-xs font-semibold px-2 py-2 rounded-lg bg-[var(--accent)] text-[var(--primary)] flex items-center justify-center gap-1.5"><RefreshCw size={13} />Atualizar saldo</button>
                <button onClick={() => abrirMovimento(i, 'rendimento')} className="text-xs font-semibold px-2 py-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--accent)] flex items-center justify-center gap-1.5"><TrendingUp size={13} />Rendimento</button>
              </div>
            )}
          </>
        )}
      </Card>
    )
  }

  return (
    <div>
      <div className="flex gap-4 flex-wrap">
        <Card className="flex-1 min-w-[180px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><PiggyBank size={14} />Total investido</div>
          <div className="text-xl font-extrabold"><Money value={totalInvestido} /></div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">{ativos.length} investimento(s) ativo(s)</div>
        </Card>
        <Card className="flex-1 min-w-[180px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><TrendingUp size={14} />Rendeu até hoje</div>
          <div className={`text-xl font-extrabold ${totalRendimento >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}><Money value={totalRendimento} /></div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">{pctRendimento.toFixed(2).replace('.', ',')}% sobre o que você aplicou</div>
        </Card>
        <Card className="flex-1 min-w-[180px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><TrendingUp size={14} />Rendeu neste mês</div>
          <div className={`text-xl font-extrabold ${rendimentoMes >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}><Money value={rendimentoMes} /></div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">atualize o saldo pra ficar certinho</div>
        </Card>
      </div>

      <div className="flex items-center justify-between mt-6 mb-3">
        <h2 className="text-[1.05rem] font-semibold m-0">Seus investimentos</h2>
        <Button variant="primary" onClick={abrirNovoInvestimento}><Plus size={15} />Novo investimento</Button>
      </div>

      {investimentos.length === 0 ? (
        <Card>
          <EstadoVazio
            icone={PiggyBank}
            titulo="Nenhum investimento cadastrado"
            descricao="Cadastre onde o dinheiro da empresa está aplicado (CDB, caixinha, Tesouro...). Se já tem dinheiro lá, informe o saldo atual: ele entra sem sair do caixa."
            acaoTexto="Cadastrar investimento"
            onAcao={abrirNovoInvestimento}
          />
        </Card>
      ) : (
        <>
          <div className="flex gap-4 flex-wrap">{ativos.map(cardInvestimento)}</div>
          {encerrados.length > 0 && (
            <>
              <button onClick={() => setMostrarEncerrados(v => !v)} className="text-xs font-semibold text-[var(--primary)] mt-3">
                {mostrarEncerrados ? 'Esconder' : 'Mostrar'} encerrados ({encerrados.length})
              </button>
              {mostrarEncerrados && <div className="flex gap-4 flex-wrap mt-3">{encerrados.map(cardInvestimento)}</div>}
            </>
          )}
        </>
      )}

      {movimentos.length > 0 && (
        <div className="flex gap-4 flex-wrap items-stretch mt-6">
          <div className="flex-[3] min-w-[340px]">
            <h2 className="text-[1.05rem] font-semibold mb-3">Evolução do total investido</h2>
            <Card>
              <div style={{ width: '100%', height: 240 }}>
                <ResponsiveContainer>
                  <LineChart data={evolucao} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={80} tickFormatter={v => formatMoney(v)} />
                    <Tooltip formatter={(v: number) => formatMoney(v)} contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="Investido" stroke="#7C3AED" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}

      {movimentos.length > 0 && (
        <>
          <div className="flex items-center justify-between mt-6 mb-3 gap-2 flex-wrap">
            <h2 className="text-[1.05rem] font-semibold m-0">Histórico de movimentos</h2>
            <Select value={filtroHistorico} onChange={e => setFiltroHistorico(e.target.value)} className="!mb-0 !w-auto min-w-[180px]">
              <option value="">Todos os investimentos</option>
              {investimentos.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
            </Select>
          </div>
          <Card className="p-0 overflow-x-auto">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr>
                  {['Data', 'Investimento', 'Movimento', 'Caixa', 'Valor', ''].map((h, idx) => (
                    <th key={idx} className={`${h === 'Valor' ? 'text-right' : 'text-left'} text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historico.map((m, idx) => {
                  const last = idx === historico.length - 1
                  const b = !last ? 'border-b border-[var(--border)]' : ''
                  const v = Number(m.valor)
                  const entra = m.tipo !== 'resgate'
                  const rotulo = m.tipo === 'aplicacao'
                    ? (m.descricao === 'Saldo inicial' ? 'Saldo inicial' : 'Aplicação')
                    : m.tipo === 'resgate' ? 'Resgate' : (m.descricao === 'Atualização de saldo' ? 'Atualização de saldo' : 'Rendimento')
                  const cor = m.tipo === 'aplicacao' ? 'purple' : m.tipo === 'resgate' ? 'cyan' : (v >= 0 ? 'green' : 'red')
                  return (
                    <tr key={m.id}>
                      <td className={`px-3 py-2.5 whitespace-nowrap ${b}`}>{formatarDataBR(m.data)}</td>
                      <td className={`px-3 py-2.5 ${b}`}>
                        {m.investimento_nome}
                        {m.descricao && m.descricao !== 'Saldo inicial' && m.descricao !== 'Atualização de saldo' && (
                          <div className="text-xs text-[var(--muted-foreground)]">{m.descricao}</div>
                        )}
                      </td>
                      <td className={`px-3 py-2.5 ${b}`}><Badge color={cor}>{rotulo}</Badge></td>
                      <td className={`px-3 py-2.5 text-xs text-[var(--muted-foreground)] ${b}`}>
                        {m.afeta_caixa ? (m.tipo === 'aplicacao' ? 'saiu do caixa' : 'voltou pro caixa') : '—'}
                      </td>
                      <td className={`px-3 py-2.5 text-right font-semibold whitespace-nowrap ${entra && v >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'} ${b}`}>
                        {entra && v >= 0 ? '+' : '−'} {formatMoney(Math.abs(v))}
                      </td>
                      <td className={`px-3 py-2.5 ${b}`}>
                        {confirmandoId === m.id ? (
                          <InlineConfirm onCancel={() => setConfirmandoId(null)} onConfirm={() => excluirMovimento(m.id)} />
                        ) : (
                          <button onClick={() => setConfirmandoId(m.id)} title="Excluir movimento" className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {/* ---- Modal: cadastro do investimento ---- */}
      <Modal
        open={modalInv}
        onClose={() => setModalInv(false)}
        title={formInv.id ? 'Editar investimento' : 'Novo investimento'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalInv(false)}>Cancelar</Button>
            <Button variant="gradient" disabled={salvando || !formInv.nome.trim()} onClick={salvarInvestimento}><Plus size={15} />{salvando ? 'Salvando...' : 'Salvar'}</Button>
          </>
        }
      >
        <Label>Nome</Label>
        <Input placeholder="Ex: Reserva da empresa" value={formInv.nome} onChange={e => setFormInv(f => ({ ...f, nome: e.target.value }))} />
        <div className="grid grid-cols-2 gap-x-4">
          <div><Label>Banco</Label><Input placeholder="Ex: Nubank" value={formInv.banco} onChange={e => setFormInv(f => ({ ...f, banco: e.target.value }))} /></div>
          <div>
            <Label>Tipo</Label>
            <Select value={formInv.tipo} onChange={e => setFormInv(f => ({ ...f, tipo: e.target.value }))}>
              {Object.entries(tiposInvestimento).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </div>
        </div>
        {!formInv.id && (
          <>
            <Label>Saldo que já está investido (opcional)</Label>
            <Input placeholder="0,00" value={formInv.saldo_inicial} onChange={e => setFormInv(f => ({ ...f, saldo_inicial: e.target.value }))} />
            <div className="text-[11px] text-[var(--muted-foreground)] -mt-2 mb-3">
              Pra dinheiro que já estava aplicado antes de usar o sistema. Entra no investimento sem sair do caixa.
            </div>
          </>
        )}
        <Label>Observações</Label>
        <Input placeholder="Ex: 100% do CDI, liquidez diária" value={formInv.observacoes} onChange={e => setFormInv(f => ({ ...f, observacoes: e.target.value }))} />
        {formInv.id && (
          <label className="flex items-center gap-2 text-[13px] font-semibold cursor-pointer">
            <input type="checkbox" className="w-4 h-4" checked={!formInv.ativo} onChange={e => setFormInv(f => ({ ...f, ativo: !e.target.checked }))} />
            Investimento encerrado (some da lista principal)
          </label>
        )}
      </Modal>

      {/* ---- Modal: movimento ---- */}
      <Modal
        open={modalMov}
        onClose={() => setModalMov(false)}
        title={`${tituloMov[formMov.tipo]}${invDoMov ? ` — ${invDoMov.nome}` : ''}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalMov(false)}>Cancelar</Button>
            <Button variant="gradient" disabled={salvando || !formMov.valor.trim()} onClick={salvarMovimento}><Plus size={15} />{salvando ? 'Salvando...' : 'Confirmar'}</Button>
          </>
        }
      >
        <div className="bg-[var(--muted)] rounded-lg px-3 py-2 text-xs mb-3 flex justify-between">
          <span className="text-[var(--muted-foreground)]">Saldo no sistema</span>
          <b>{formatMoney(saldoDoMov)}</b>
        </div>

        {formMov.tipo === 'atualizar_saldo' ? (
          <>
            <Label>Saldo que aparece no banco hoje (R$)</Label>
            <Input autoFocus placeholder={valorParaCampo(saldoDoMov)} value={formMov.valor} onChange={e => setFormMov(f => ({ ...f, valor: e.target.value }))} />
            {formMov.valor.trim() && Number.isFinite(valorMov) && (
              <div className={`text-[13px] font-semibold -mt-1 mb-3 ${diferencaAtualizacao >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>
                {diferencaAtualizacao === 0 ? 'Igual ao do sistema — nada pra atualizar.'
                  : diferencaAtualizacao > 0 ? `Rendeu ${formatMoney(diferencaAtualizacao)} desde a última atualização`
                    : `Caiu ${formatMoney(-diferencaAtualizacao)} desde a última atualização`}
              </div>
            )}
            <div className="text-[11px] text-[var(--muted-foreground)] mb-3">
              A diferença entra como rendimento. Não mexe no caixa da empresa.
            </div>
          </>
        ) : (
          <>
            <Label>{formMov.tipo === 'rendimento' ? 'Valor do rendimento (R$)' : 'Valor (R$)'}</Label>
            <Input autoFocus placeholder="0,00" value={formMov.valor} onChange={e => setFormMov(f => ({ ...f, valor: e.target.value }))} />
            {formMov.tipo === 'rendimento' && (
              <div className="text-[11px] text-[var(--muted-foreground)] -mt-2 mb-3">Se o investimento caiu, coloca o valor com sinal de menos (ex: -12,50).</div>
            )}
            {formMov.tipo === 'resgate' && Number.isFinite(valorMov) && valorMov > saldoDoMov && (
              <div className="text-[12px] text-red-600 -mt-2 mb-3">Maior que o saldo do investimento.</div>
            )}
          </>
        )}

        <Label>Data</Label>
        <Input type="date" value={formMov.data} onChange={e => setFormMov(f => ({ ...f, data: e.target.value }))} />

        {(formMov.tipo === 'aplicacao' || formMov.tipo === 'resgate') && (
          <div className="bg-[var(--muted)] rounded-lg p-3 mb-3">
            <label className="flex items-center gap-2 text-[13px] font-semibold cursor-pointer">
              <input type="checkbox" className="w-4 h-4" checked={formMov.afetaCaixa} onChange={e => setFormMov(f => ({ ...f, afetaCaixa: e.target.checked }))} />
              {formMov.tipo === 'aplicacao' ? 'Tirar esse valor do caixa da empresa' : 'Devolver esse valor pro caixa da empresa'}
            </label>
            <div className="text-[11px] text-[var(--muted-foreground)] mt-1 ml-6">
              {formMov.tipo === 'aplicacao'
                ? 'Desmarca se o dinheiro veio de fora (ex: do seu bolso) e não do caixa.'
                : 'Desmarca se o resgate foi pra você e não pra empresa.'}
            </div>
            {caixaFicaNegativo && (
              <div className="text-[12px] text-amber-700 mt-2 ml-6">O caixa tem {formatMoney(saldoCaixa)} — vai ficar negativo.</div>
            )}
          </div>
        )}

        <Label>Observação (opcional)</Label>
        <Input placeholder="Ex: sobra do mês" value={formMov.descricao} onChange={e => setFormMov(f => ({ ...f, descricao: e.target.value }))} />
      </Modal>
    </div>
  )
}
