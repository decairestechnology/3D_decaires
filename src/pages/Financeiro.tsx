import { useMemo, useState, FormEvent } from 'react'
import {
  Plus, Pencil, Trash2, BarChart3, LineChart as LineChartIcon, Wallet,
  Search, TrendingUp, TrendingDown, Clock, Download
} from 'lucide-react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Money, formatMoney } from '@/components/ui/Money'
import { Modal } from '@/components/ui/Modal'
import { InlineConfirm } from '@/components/ui/InlineConfirm'
import { Label, Input, Select } from '@/components/ui/Input'
import { EstadoVazio } from '@/components/ui/EstadoVazio'
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina'
import { useApi } from '@/lib/useApi'
import { api } from '@/lib/api'
import { formatarDataBR, soData } from '@/lib/date'

const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

interface LancamentoApiRow {
  id: string; data: string; descricao: string
  tipo: 'receita' | 'despesa'; valor: string; categoria?: string
}
interface PedidoApiRow {
  id: string; numero: number; cliente_nome: string; valor: string
  status: string; status_pagamento?: string; valor_pago?: string
}

const categoriaBadge: Record<string, 'green' | 'cyan' | 'purple' | 'amber' | 'gray'> = {
  vendas: 'green', materiais: 'cyan', energia: 'amber', manutencao: 'purple', outros: 'gray'
}
const categoriaLabel: Record<string, string> = {
  vendas: 'Vendas', materiais: 'Materiais', energia: 'Energia', manutencao: 'Manutenção', outros: 'Outros'
}

type Periodo = 'mes' | '3' | '6' | '12' | 'tudo' | 'personalizado'

const formVazio = { id: '', data: '', descricao: '', tipo: 'receita', valor: '', categoria: 'vendas' }

export function Financeiro() {
  const { data, loading, error, reload } = useApi<LancamentoApiRow[]>('/api/lancamentos', [])
  const { data: pedidosApi } = useApi<PedidoApiRow[]>('/api/pedidos', [])
  const [modalOpen, setModalOpen] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)
  const [form, setForm] = useState(formVazio)
  const [tipoGrafico, setTipoGrafico] = useState<'barra' | 'linha'>('barra')

  // ---- filtros
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'receita' | 'despesa'>('todos')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [busca, setBusca] = useState('')

  const usandoMock = !loading && !!error
  const vazio = !loading && !error && data.length === 0
  const lancamentos = usandoMock
    ? []
    : data.map(l => ({
        id: l.id, data: soData(l.data), descricao: l.descricao,
        tipo: l.tipo, valor: Number(l.valor), categoria: l.categoria ?? 'outros'
      }))

  /** Saldo em caixa = tudo que entrou menos tudo que saiu, desde sempre. */
  const saldoCaixa = lancamentos.reduce((s, l) => s + (l.tipo === 'receita' ? l.valor : -l.valor), 0)

  /** Quanto os clientes ainda devem (pedido não pago ou parcial). */
  const aReceber = pedidosApi.reduce((s, p) => {
    if (p.status_pagamento === 'pago') return s
    return s + Math.max(Number(p.valor) - Number(p.valor_pago ?? 0), 0)
  }, 0)

  const intervalo = useMemo(() => {
    const hoje = new Date()
    if (periodo === 'tudo') return { de: '0000-01-01', ate: '9999-12-31' }
    if (periodo === 'personalizado') {
      return { de: dataInicio || '0000-01-01', ate: dataFim || '9999-12-31' }
    }
    if (periodo === 'mes') {
      const chave = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
      return { de: `${chave}-01`, ate: `${chave}-31` }
    }
    const meses = Number(periodo)
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - (meses - 1), 1)
    return { de: d.toISOString().slice(0, 10), ate: '9999-12-31' }
  }, [periodo, dataInicio, dataFim])

  const filtrados = useMemo(() => {
    return lancamentos
      .filter(l => l.data >= intervalo.de && l.data <= intervalo.ate)
      .filter(l => filtroTipo === 'todos' || l.tipo === filtroTipo)
      .filter(l => !filtroCategoria || l.categoria === filtroCategoria)
      .filter(l => !busca || l.descricao.toLowerCase().includes(busca.toLowerCase()))
      .sort((a, b) => b.data.localeCompare(a.data))
  }, [lancamentos, intervalo, filtroTipo, filtroCategoria, busca])

  const receita = filtrados.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0)
  const despesa = filtrados.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0)
  const lucro = receita - despesa
  const margem = receita > 0 ? Math.round((lucro / receita) * 100) : 0

  /** Onde o dinheiro está indo — só despesas, agrupadas por categoria. */
  const gastosPorCategoria = useMemo(() => {
    const totais: Record<string, number> = {}
    filtrados.filter(l => l.tipo === 'despesa').forEach(l => {
      totais[l.categoria] = (totais[l.categoria] ?? 0) + l.valor
    })
    const total = Object.values(totais).reduce((s, v) => s + v, 0)
    return Object.entries(totais)
      .map(([cat, valor]) => ({ cat, valor, pct: total > 0 ? Math.round((valor / total) * 100) : 0 }))
      .sort((a, b) => b.valor - a.valor)
  }, [filtrados])

  const fluxoMensal = useMemo(() => {
    const hoje = new Date()
    const meses: { chave: string; mes: string; Receita: number; Despesa: number; Saldo: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      meses.push({
        chave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        mes: mesesNomes[d.getMonth()], Receita: 0, Despesa: 0, Saldo: 0
      })
    }
    lancamentos.forEach(l => {
      const m = meses.find(x => x.chave === l.data.slice(0, 7))
      if (!m) return
      if (l.tipo === 'receita') m.Receita += l.valor
      else m.Despesa += l.valor
    })
    meses.forEach(m => { m.Saldo = m.Receita - m.Despesa })
    return meses
  }, [lancamentos])

  function abrirNovo() { setForm(formVazio); setModalOpen(true) }
  function abrirEdicao(l: typeof lancamentos[number]) {
    setForm({ id: l.id, data: l.data.slice(0, 10), descricao: l.descricao, tipo: l.tipo, valor: String(l.valor).replace('.', ','), categoria: l.categoria })
    setModalOpen(true)
  }

  function limparFiltros() {
    setPeriodo('mes'); setFiltroTipo('todos'); setFiltroCategoria(''); setBusca('')
    setDataInicio(''); setDataFim('')
  }
  const temFiltro = periodo !== 'mes' || filtroTipo !== 'todos' || !!filtroCategoria || !!busca

  /** Exporta o que está filtrado em CSV, pra abrir no Excel. */
  function exportarCsv() {
    const linhas = [
      ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor'].join(';'),
      ...filtrados.map(l => [
        formatarDataBR(l.data),
        `"${l.descricao.replace(/"/g, '""')}"`,
        categoriaLabel[l.categoria] ?? l.categoria,
        l.tipo === 'receita' ? 'Receita' : 'Despesa',
        l.valor.toFixed(2).replace('.', ',')
      ].join(';'))
    ].join('\n')
    const blob = new Blob(['\ufeff' + linhas], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `financeiro-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleSalvar(e: FormEvent) {
    e.preventDefault()
    if (!form.descricao.trim() || !form.valor) return
    setSalvando(true)
    try {
      const payload = {
        data: form.data || new Date().toISOString().slice(0, 10),
        descricao: form.descricao,
        tipo: form.tipo,
        valor: Number(form.valor.replace(',', '.')) || 0,
        categoria: form.categoria
      }
      if (form.id) await api.patch(`/api/lancamentos?id=${form.id}`, payload)
      else await api.post('/api/lancamentos', payload)
      setModalOpen(false)
      setForm(formVazio)
      reload()
    } catch (err) {
      console.error('[Salvar] erro:', err)
      const detalhe = err instanceof Error ? err.message : ''
      alert(`Não deu pra salvar. ${detalhe.slice(0, 150) || 'Confere o console (F12).'}`)
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(id: string) {
    try {
      await api.del(`/api/lancamentos?id=${id}`)
      setConfirmandoId(null)
      reload()
    } catch (err) {
      console.error('[Excluir] erro:', err)
      alert('Não deu pra excluir. Confere a conexão com o banco.')
    }
  }

  return (
    <div>
      <CabecalhoPagina
        titulo="Financeiro"
        descricao={`Receitas, despesas e saldo ${usandoMock ? '(sem conexão com o banco)' : ''}`}
        acao={<Button variant="gradient" onClick={abrirNovo}><Plus size={15} />Novo lançamento</Button>}
      />

      {/* ---- KPIs principais ---- */}
      <div className="flex gap-4 flex-wrap">
        <Card className="flex-1 min-w-[200px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2">
            <Wallet size={14} />Saldo em caixa
          </div>
          <div className={`text-2xl font-extrabold ${saldoCaixa >= 0 ? '' : 'text-red-600'}`}>
            <Money value={saldoCaixa} />
          </div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">tudo que entrou menos o que saiu</div>
        </Card>
        <Card className="flex-1 min-w-[200px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2">
            <Clock size={14} />A receber
          </div>
          <div className="text-2xl font-extrabold text-amber-600"><Money value={aReceber} /></div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">pedidos ainda não pagos</div>
        </Card>
        <Card className="flex-1 min-w-[200px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2">
            <Wallet size={14} />Caixa projetado
          </div>
          <div className="text-2xl font-extrabold text-[var(--secondary)]"><Money value={saldoCaixa + aReceber} /></div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">se todos pagarem</div>
        </Card>
      </div>

      {/* ---- Filtros ---- */}
      <div className="flex items-center gap-2 mt-6 mb-3 flex-wrap">
        <Select value={periodo} onChange={e => setPeriodo(e.target.value as Periodo)} className="!mb-0 !w-auto min-w-[150px]">
          <option value="mes">Mês atual</option>
          <option value="3">Últimos 3 meses</option>
          <option value="6">Últimos 6 meses</option>
          <option value="12">Últimos 12 meses</option>
          <option value="tudo">Tudo</option>
          <option value="personalizado">Personalizado</option>
        </Select>
        {periodo === 'personalizado' && (
          <>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="px-2.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] text-sm" />
            <span className="text-xs text-[var(--muted-foreground)]">até</span>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="px-2.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] text-sm" />
          </>
        )}
        <Select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as typeof filtroTipo)} className="!mb-0 !w-auto min-w-[130px]">
          <option value="todos">Receita e despesa</option>
          <option value="receita">Só receitas</option>
          <option value="despesa">Só despesas</option>
        </Select>
        <Select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="!mb-0 !w-auto min-w-[140px]">
          <option value="">Todas categorias</option>
          {Object.entries(categoriaLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <div className="relative flex-1 min-w-[180px] max-w-[260px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar descrição..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] text-sm"
          />
        </div>
        {temFiltro && (
          <button onClick={limparFiltros} className="text-xs font-semibold text-[var(--primary)] px-2">Limpar filtros</button>
        )}
        {filtrados.length > 0 && (
          <button onClick={exportarCsv} title="Exportar CSV" className="w-9 h-9 rounded-lg border border-[var(--border)] bg-[var(--card)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--primary)]">
            <Download size={15} />
          </button>
        )}
      </div>

      {/* ---- Resumo do período filtrado ---- */}
      <div className="flex gap-4 flex-wrap">
        <Card className="flex-1 min-w-[180px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><TrendingUp size={13} />Receita no período</div>
          <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400"><Money value={receita} /></div>
        </Card>
        <Card className="flex-1 min-w-[180px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><TrendingDown size={13} />Despesa no período</div>
          <div className="text-xl font-extrabold text-red-600"><Money value={despesa} /></div>
        </Card>
        <Card className="flex-1 min-w-[180px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] mb-2">Resultado</div>
          <div className={`text-xl font-extrabold ${lucro >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}><Money value={lucro} /></div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">margem de {margem}%</div>
        </Card>
        <Card className="flex-1 min-w-[180px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] mb-2">Lançamentos</div>
          <div className="text-xl font-extrabold">{filtrados.length}</div>
        </Card>
      </div>

      {/* ---- Gráfico + distribuição ---- */}
      <div className="flex gap-4 flex-wrap items-stretch mt-6">
        <div className="flex-[2] min-w-[340px]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[1.05rem] font-semibold m-0">Fluxo de caixa mensal</h2>
            <div className="flex items-center gap-1 bg-[var(--muted)] rounded-lg p-1">
              <button
                onClick={() => setTipoGrafico('barra')}
                className={`px-2.5 py-1.5 rounded-md flex items-center gap-1.5 text-xs font-semibold ${tipoGrafico === 'barra' ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' : 'text-[var(--muted-foreground)]'}`}
              >
                <BarChart3 size={13} />Barra
              </button>
              <button
                onClick={() => setTipoGrafico('linha')}
                className={`px-2.5 py-1.5 rounded-md flex items-center gap-1.5 text-xs font-semibold ${tipoGrafico === 'linha' ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' : 'text-[var(--muted-foreground)]'}`}
              >
                <LineChartIcon size={13} />Linha
              </button>
            </div>
          </div>
          <Card>
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                {tipoGrafico === 'barra' ? (
                  <BarChart data={fluxoMensal} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={70} tickFormatter={v => formatMoney(v)} />
                    <Tooltip formatter={(v: number) => formatMoney(v)} contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="Receita" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Despesa" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <LineChart data={fluxoMensal} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={70} tickFormatter={v => formatMoney(v)} />
                    <Tooltip formatter={(v: number) => formatMoney(v)} contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="Receita" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Despesa" stroke="#EF4444" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Saldo" stroke="#7C3AED" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="flex-1 min-w-[240px]">
          <h2 className="text-[1.05rem] font-semibold mb-3">Onde o dinheiro foi</h2>
          <Card>
            {gastosPorCategoria.length === 0 ? (
              <div className="text-xs text-[var(--muted-foreground)] py-6 text-center">Nenhuma despesa no período.</div>
            ) : (
              gastosPorCategoria.map(g => (
                <div key={g.cat} className="py-2 border-b border-[var(--border)] last:border-none">
                  <div className="flex justify-between items-center text-[13px] mb-1">
                    <span>{categoriaLabel[g.cat] ?? g.cat}</span>
                    <span className="font-semibold">{formatMoney(g.valor)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--secondary)]" style={{ width: `${g.pct}%` }} />
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>

      {/* ---- Lançamentos ---- */}
      <h2 className="text-[1.05rem] font-semibold mt-6 mb-3">
        Lançamentos {filtrados.length > 0 && <span className="text-sm font-normal text-[var(--muted-foreground)]">({filtrados.length})</span>}
      </h2>
      <Card className="p-0">
        {vazio ? (
          <EstadoVazio icone={Wallet} titulo="Nenhum lançamento" descricao="Registre receitas e despesas pra acompanhar o caixa." acaoTexto="Novo lançamento" onAcao={abrirNovo} />
        ) : filtrados.length === 0 ? (
          <div className="text-center py-10 text-sm text-[var(--muted-foreground)]">Nenhum lançamento pra esse filtro.</div>
        ) : (
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr>
                <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]">Data</th>
                <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]">Descrição</th>
                <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]">Categoria</th>
                <th className="text-right text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]">Valor</th>
                <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((l, i) => {
                const last = i === filtrados.length - 1
                const receitaLinha = l.tipo === 'receita'
                return (
                  <tr key={l.id}>
                    <td className={`px-3 py-2.5 whitespace-nowrap ${!last ? 'border-b border-[var(--border)]' : ''}`}>{formatarDataBR(l.data)}</td>
                    <td className={`px-3 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>{l.descricao}</td>
                    <td className={`px-3 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>
                      <Badge color={categoriaBadge[l.categoria] ?? 'gray'}>{categoriaLabel[l.categoria] ?? l.categoria}</Badge>
                    </td>
                    <td className={`px-3 py-2.5 text-right font-semibold whitespace-nowrap ${receitaLinha ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'} ${!last ? 'border-b border-[var(--border)]' : ''}`}>
                      {receitaLinha ? '+' : '−'} {formatMoney(l.valor)}
                    </td>
                    <td className={`px-3 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>
                      {confirmandoId === l.id ? (
                        <InlineConfirm onCancel={() => setConfirmandoId(null)} onConfirm={() => excluir(l.id)} />
                      ) : (
                        <div className="flex gap-1">
                          <button onClick={() => abrirEdicao(l)} className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)]"><Pencil size={13} /></button>
                          <button onClick={() => setConfirmandoId(l.id)} className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="px-3 py-2.5 text-xs font-bold text-[var(--muted-foreground)] border-t border-[var(--border)]">
                  TOTAL DO PERÍODO
                </td>
                <td className={`px-3 py-2.5 text-right font-extrabold border-t border-[var(--border)] ${lucro >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>
                  {formatMoney(lucro)}
                </td>
                <td className="border-t border-[var(--border)]" />
              </tr>
            </tfoot>
          </table>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Editar lançamento' : 'Novo lançamento'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="gradient" disabled={salvando} onClick={handleSalvar}><Plus size={15} />{salvando ? 'Salvando...' : 'Salvar'}</Button>
          </>
        }
      >
        <Label>Descrição</Label>
        <Input placeholder="Ex: Venda — João" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
        <div className="grid grid-cols-2 gap-x-4">
          <div>
            <Label>Tipo</Label>
            <Select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
              <option value="receita">Receita</option>
              <option value="despesa">Despesa</option>
            </Select>
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
              {Object.entries(categoriaLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          <div><Label>Valor (R$)</Label><Input placeholder="0,00" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} /></div>
          <div><Label>Data</Label><Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} /></div>
        </div>
      </Modal>
    </div>
  )
}
