import { useMemo, useState, FormEvent } from 'react'
import {
  Plus, Pencil, Trash2, BarChart3, LineChart as LineChartIcon, Wallet,
  Search, TrendingUp, TrendingDown, Clock, Download, PiggyBank, Landmark, CalendarClock
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
import { formatarDataBR } from '@/lib/date'
import {
  LancamentoApiRow, Lancamento, normalizarLancamento, CategoriaFinanceira, categoriasPadrao, formasPagamento,
  InvestimentoApiRow, MovimentoApiRow, hojeLocal, somarMeses, lerValor, valorParaCampo, motivoErro, diasAte
} from '@/lib/financeiro'
import { AbaInvestimentos } from '@/pages/financeiro/AbaInvestimentos'
import { AbaContas } from '@/pages/financeiro/AbaContas'

const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

interface PedidoApiRow {
  id: string; numero: number; cliente_nome: string; valor: string
  status: string; status_pagamento?: string; valor_pago?: string
}

type CorBadge = 'green' | 'cyan' | 'purple' | 'amber' | 'gray' | 'red'
const coresFixas: Record<string, CorBadge> = {
  vendas: 'green', servicos: 'green', outras_receitas: 'green',
  materiais: 'cyan', energia: 'amber', manutencao: 'purple', prolabore: 'red', impostos: 'red', outros: 'gray'
}
const paleta: CorBadge[] = ['cyan', 'purple', 'amber', 'green', 'gray']
function corCategoria(chave: string): CorBadge {
  if (coresFixas[chave]) return coresFixas[chave]
  let h = 0
  for (const c of chave) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return paleta[h % paleta.length]
}

type Periodo = 'mes' | '3' | '6' | '12' | 'tudo' | 'personalizado'
type Aba = 'lancamentos' | 'contas' | 'investimentos'

const formVazio = {
  id: '', tipo: 'receita' as 'receita' | 'despesa', descricao: '', categoria: 'vendas', valor: '',
  forma: '', situacao: 'pago' as 'pago' | 'pendente', data: '', vencimento: '',
  parcelado: false, parcelas: '2', primeiraPaga: false, grupo: '' as string
}

export function Financeiro() {
  const { data, loading, error, reload } = useApi<LancamentoApiRow[]>('/api/lancamentos?todos=1', [])
  const { data: pedidosApi } = useApi<PedidoApiRow[]>('/api/pedidos', [])
  const { data: catApi, error: catErro, reload: reloadCat } = useApi<CategoriaFinanceira[]>('/api/lancamentos?recurso=categorias', [])
  const { data: invApi, error: invErro, reload: reloadInv } = useApi<InvestimentoApiRow[]>('/api/lancamentos?recurso=investimentos', [])
  const { data: movApi, reload: reloadMov } = useApi<MovimentoApiRow[]>('/api/lancamentos?recurso=movimentos', [])

  const [aba, setAba] = useState<Aba>('lancamentos')
  const [modalOpen, setModalOpen] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)
  const [confirmandoGrupo, setConfirmandoGrupo] = useState(false)
  const [form, setForm] = useState(formVazio)
  const [tipoGrafico, setTipoGrafico] = useState<'barra' | 'linha'>('barra')

  // ---- filtros
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'receita' | 'despesa'>('todos')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroForma, setFiltroForma] = useState('')
  const [busca, setBusca] = useState('')

  const usandoMock = !loading && !!error
  const todos: Lancamento[] = usandoMock ? [] : data.map(normalizarLancamento)
  const pagos = todos.filter(l => l.status === 'pago')
  const pendentes = todos.filter(l => l.status === 'pendente')
  const vazio = !loading && !error && pagos.length === 0

  // ---- categorias (do banco; se a migração 026 não rodou, usa as antigas fixas)
  const categorias = catErro || catApi.length === 0 ? categoriasPadrao : catApi
  function nomeCategoria(chave: string) {
    return categorias.find(c => c.chave === chave)?.nome ?? chave
  }
  const categoriasDoTipo = (tipo: 'receita' | 'despesa') => categorias.filter(c => c.tipo === tipo || c.tipo === 'ambos')

  // ---- investimentos
  const investimentos = invErro ? [] : invApi
  const movimentos = invErro ? [] : movApi
  const totalInvestido = investimentos.reduce((s, i) => s + Number(i.saldo), 0)
  const transferenciasCaixa = movimentos.reduce((s, m) => {
    if (!m.afeta_caixa) return s
    if (m.tipo === 'aplicacao') return s - Number(m.valor)
    if (m.tipo === 'resgate') return s + Number(m.valor)
    return s
  }, 0)

  /** Caixa = tudo que entrou − tudo que saiu − o que foi pro investimento + o que voltou dele. */
  const saldoCaixa = pagos.reduce((s, l) => s + (l.tipo === 'receita' ? l.valor : -l.valor), 0) + transferenciasCaixa
  const patrimonio = saldoCaixa + totalInvestido

  /** Quanto os clientes ainda devem (pedidos) + receitas lançadas como pendentes. */
  const aReceberPedidos = pedidosApi.reduce((s, p) => {
    if (p.status_pagamento === 'pago') return s
    return s + Math.max(Number(p.valor) - Number(p.valor_pago ?? 0), 0)
  }, 0)
  const aReceber = aReceberPedidos + pendentes.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0)
  const despesasPendentes = pendentes.filter(l => l.tipo === 'despesa')
  const aPagar = despesasPendentes.reduce((s, l) => s + l.valor, 0)
  const vencidas = despesasPendentes.filter(l => diasAte(l.vencimento) < 0)
  const caixaProjetado = saldoCaixa + aReceber - aPagar

  function recarregarTudo() {
    reload(); reloadInv(); reloadMov(); reloadCat()
  }

  const intervalo = useMemo(() => {
    const hoje = hojeLocal()
    if (periodo === 'tudo') return { de: '0000-01-01', ate: '9999-12-31' }
    if (periodo === 'personalizado') return { de: dataInicio || '0000-01-01', ate: dataFim || '9999-12-31' }
    if (periodo === 'mes') return { de: `${hoje.slice(0, 7)}-01`, ate: `${hoje.slice(0, 7)}-31` }
    const meses = Number(periodo)
    return { de: `${somarMeses(`${hoje.slice(0, 7)}-01`, -(meses - 1))}`, ate: '9999-12-31' }
  }, [periodo, dataInicio, dataFim])

  const filtrados = useMemo(() => {
    const termo = busca.toLowerCase()
    return pagos
      .filter(l => l.data >= intervalo.de && l.data <= intervalo.ate)
      .filter(l => filtroTipo === 'todos' || l.tipo === filtroTipo)
      .filter(l => !filtroCategoria || l.categoria === filtroCategoria)
      .filter(l => !filtroForma || (filtroForma === '__sem__' ? !l.formaPagamento : l.formaPagamento === filtroForma))
      .filter(l => !termo || l.descricao.toLowerCase().includes(termo))
      .sort((a, b) => b.data.localeCompare(a.data))
  }, [pagos, intervalo, filtroTipo, filtroCategoria, filtroForma, busca])

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
    pagos.forEach(l => {
      const m = meses.find(x => x.chave === l.data.slice(0, 7))
      if (!m) return
      if (l.tipo === 'receita') m.Receita += l.valor
      else m.Despesa += l.valor
    })
    meses.forEach(m => { m.Saldo = m.Receita - m.Despesa })
    return meses
  }, [pagos])

  // ---- modal de lançamento
  function abrirNovo(preset?: Partial<typeof formVazio>) {
    const tipo = preset?.tipo ?? 'receita'
    setForm({
      ...formVazio,
      tipo,
      categoria: categoriasDoTipo(tipo)[0]?.chave ?? 'outros',
      data: hojeLocal(),
      vencimento: hojeLocal(),
      ...preset
    })
    setConfirmandoGrupo(false)
    setModalOpen(true)
  }
  function abrirEdicao(l: Lancamento) {
    setForm({
      ...formVazio,
      id: l.id, tipo: l.tipo, descricao: l.descricao, categoria: l.categoria, valor: valorParaCampo(l.valor),
      forma: l.formaPagamento, situacao: l.status, data: l.data, vencimento: l.vencimento,
      grupo: l.grupoParcela ?? ''
    })
    setConfirmandoGrupo(false)
    setModalOpen(true)
  }
  function mudarTipo(tipo: 'receita' | 'despesa') {
    setForm(f => {
      const permitidas = categoriasDoTipo(tipo)
      const categoria = permitidas.some(c => c.chave === f.categoria) ? f.categoria : (permitidas[0]?.chave ?? 'outros')
      return { ...f, tipo, categoria }
    })
  }

  const nParcelas = Math.max(2, Math.min(60, Math.floor(Number(form.parcelas) || 2)))
  const valorDigitado = lerValor(form.valor)
  const valorParcela = Number.isFinite(valorDigitado) ? Math.floor((valorDigitado / nParcelas) * 100) / 100 : 0
  const primeiroVenc = form.vencimento || hojeLocal()
  const pendentesDoGrupo = form.grupo ? pendentes.filter(l => l.grupoParcela === form.grupo).length : 0

  function limparFiltros() {
    setPeriodo('mes'); setFiltroTipo('todos'); setFiltroCategoria(''); setFiltroForma(''); setBusca('')
    setDataInicio(''); setDataFim('')
  }
  const temFiltro = periodo !== 'mes' || filtroTipo !== 'todos' || !!filtroCategoria || !!filtroForma || !!busca

  /** Exporta o que está filtrado em CSV, pra abrir no Excel. */
  function exportarCsv() {
    const linhas = [
      ['Data', 'Descrição', 'Categoria', 'Tipo', 'Forma de pagamento', 'Valor'].join(';'),
      ...filtrados.map(l => [
        formatarDataBR(l.data),
        `"${l.descricao.replace(/"/g, '""')}"`,
        nomeCategoria(l.categoria),
        l.tipo === 'receita' ? 'Receita' : 'Despesa',
        l.formaPagamento,
        l.valor.toFixed(2).replace('.', ',')
      ].join(';'))
    ].join('\n')
    const blob = new Blob(['﻿' + linhas], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `financeiro-${hojeLocal()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleSalvar(e?: FormEvent) {
    e?.preventDefault()
    if (!form.descricao.trim() || !form.valor.trim()) return
    const valor = lerValor(form.valor)
    if (!(valor > 0)) { alert('Informe um valor maior que zero.'); return }
    setSalvando(true)
    try {
      if (form.id) {
        await api.patch(`/api/lancamentos?id=${form.id}`, {
          descricao: form.descricao, tipo: form.tipo, valor, categoria: form.categoria,
          forma_pagamento: form.forma, status: form.situacao,
          data: form.situacao === 'pendente' ? (form.vencimento || hojeLocal()) : (form.data || hojeLocal()),
          vencimento: form.situacao === 'pendente' ? (form.vencimento || hojeLocal()) : (form.vencimento || '')
        })
      } else {
        const parcelado = form.parcelado
        await api.post('/api/lancamentos', {
          descricao: form.descricao, tipo: form.tipo, valor, categoria: form.categoria,
          forma_pagamento: form.forma || null,
          status: parcelado ? 'pendente' : form.situacao,
          data: form.data || hojeLocal(),
          vencimento: parcelado || form.situacao === 'pendente' ? (form.vencimento || hojeLocal()) : null,
          parcelas: parcelado ? nParcelas : 1,
          primeira_paga: parcelado ? form.primeiraPaga : false
        })
      }
      setModalOpen(false)
      setForm(formVazio)
      reload()
    } catch (err) {
      alert('Não deu pra salvar.\n\nMotivo: ' + motivoErro(err))
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
      alert('Não deu pra excluir.\n\nMotivo: ' + motivoErro(err))
    }
  }
  async function excluirParcelasPendentes() {
    if (!form.grupo) return
    try {
      await api.del(`/api/lancamentos?grupo=${form.grupo}`)
      setModalOpen(false)
      reload()
    } catch (err) {
      alert('Não deu pra excluir as parcelas.\n\nMotivo: ' + motivoErro(err))
    }
  }

  const abas: { id: Aba; label: string; icone: typeof Wallet; contador?: number; alerta?: boolean }[] = [
    { id: 'lancamentos', label: 'Lançamentos', icone: Wallet },
    { id: 'contas', label: 'Contas a pagar', icone: CalendarClock, contador: pendentes.length, alerta: vencidas.length > 0 },
    { id: 'investimentos', label: 'Investimentos', icone: PiggyBank, contador: investimentos.filter(i => i.ativo).length }
  ]

  return (
    <div>
      <CabecalhoPagina
        titulo="Financeiro"
        descricao={`Caixa, contas e investimentos ${usandoMock ? '(sem conexão com o banco)' : ''}`}
        acao={<Button variant="gradient" onClick={() => abrirNovo(aba === 'contas' ? { tipo: 'despesa', situacao: 'pendente', categoria: categoriasDoTipo('despesa')[0]?.chave ?? 'outros' } : undefined)}><Plus size={15} />{aba === 'contas' ? 'Nova conta a pagar' : 'Novo lançamento'}</Button>}
      />

      {/* ---- Visão geral: sempre visível ---- */}
      <div className="flex gap-4 flex-wrap">
        <Card className="flex-1 min-w-[190px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><Wallet size={14} />Saldo em caixa</div>
          <div className={`text-2xl font-extrabold ${saldoCaixa >= 0 ? '' : 'text-red-600'}`}><Money value={saldoCaixa} /></div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">projetado: <Money value={caixaProjetado} /></div>
        </Card>
        <Card className="flex-1 min-w-[190px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><PiggyBank size={14} />Investido</div>
          <div className="text-2xl font-extrabold text-violet-700 dark:text-violet-400"><Money value={totalInvestido} /></div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">fora do caixa, rendendo</div>
        </Card>
        <Card className="flex-1 min-w-[190px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><Landmark size={14} />Patrimônio</div>
          <div className={`text-2xl font-extrabold ${patrimonio >= 0 ? 'text-[var(--secondary)]' : 'text-red-600'}`}><Money value={patrimonio} /></div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">caixa + investido</div>
        </Card>
        <Card className="flex-1 min-w-[190px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><Clock size={14} />A receber</div>
          <div className="text-2xl font-extrabold text-amber-600"><Money value={aReceber} /></div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">pedidos e receitas pendentes</div>
        </Card>
        <Card className="flex-1 min-w-[190px] cursor-pointer" onClick={() => setAba('contas')}>
          <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><CalendarClock size={14} />A pagar</div>
          <div className="text-2xl font-extrabold text-red-600"><Money value={aPagar} /></div>
          <div className={`text-xs mt-1 ${vencidas.length > 0 ? 'text-red-600 font-semibold' : 'text-[var(--muted-foreground)]'}`}>
            {vencidas.length > 0 ? `${vencidas.length} vencida(s)` : `${despesasPendentes.length} conta(s) em aberto`}
          </div>
        </Card>
      </div>

      {/* ---- Abas ---- */}
      <div className="mt-6 mb-4 flex gap-2 flex-wrap">
        {abas.map(t => {
          const Icone = t.icone
          return (
            <button
              key={t.id}
              onClick={() => setAba(t.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold border
              ${aba === t.id ? 'bg-[var(--accent)] text-[var(--primary)] border-[var(--primary)]' : 'bg-[var(--muted)] text-[var(--muted-foreground)] border-transparent'}`}
            >
              <Icone size={14} />{t.label}
              {!!t.contador && (
                <span className={`text-[10px] px-1.5 rounded-full ${t.alerta ? 'bg-red-500 text-white' : 'bg-[var(--card)] text-[var(--muted-foreground)]'}`}>{t.contador}</span>
              )}
            </button>
          )
        })}
      </div>

      {aba === 'contas' && (
        <AbaContas
          pendentes={pendentes}
          nomeCategoria={nomeCategoria}
          onEditar={abrirEdicao}
          onNovaConta={() => abrirNovo({ tipo: 'despesa', situacao: 'pendente', categoria: categoriasDoTipo('despesa')[0]?.chave ?? 'outros' })}
          onMudou={reload}
        />
      )}

      {aba === 'investimentos' && (
        <AbaInvestimentos
          investimentos={investimentos}
          movimentos={movimentos}
          saldoCaixa={saldoCaixa}
          erroCarregar={!!invErro}
          onMudou={recarregarTudo}
        />
      )}

      {aba === 'lancamentos' && (
        <>
          {/* ---- Filtros ---- */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
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
              {categorias.map(c => <option key={c.chave} value={c.chave}>{c.nome}</option>)}
            </Select>
            <Select value={filtroForma} onChange={e => setFiltroForma(e.target.value)} className="!mb-0 !w-auto min-w-[140px]">
              <option value="">Todas as formas</option>
              {formasPagamento.map(f => <option key={f} value={f}>{f}</option>)}
              <option value="__sem__">Sem forma informada</option>
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
                        <span>{nomeCategoria(g.cat)}</span>
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
          <Card className="p-0 overflow-x-auto">
            {vazio ? (
              <EstadoVazio icone={Wallet} titulo="Nenhum lançamento" descricao="Registre receitas e despesas pra acompanhar o caixa." acaoTexto="Novo lançamento" onAcao={() => abrirNovo()} />
            ) : filtrados.length === 0 ? (
              <div className="text-center py-10 text-sm text-[var(--muted-foreground)]">Nenhum lançamento pra esse filtro.</div>
            ) : (
              <table className="w-full border-collapse text-[13.5px]">
                <thead>
                  <tr>
                    {['Data', 'Descrição', 'Categoria', 'Forma', 'Valor', ''].map((h, i) => (
                      <th key={i} className={`${h === 'Valor' ? 'text-right' : 'text-left'} text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((l, i) => {
                    const last = i === filtrados.length - 1
                    const b = !last ? 'border-b border-[var(--border)]' : ''
                    const receitaLinha = l.tipo === 'receita'
                    return (
                      <tr key={l.id}>
                        <td className={`px-3 py-2.5 whitespace-nowrap ${b}`}>{formatarDataBR(l.data)}</td>
                        <td className={`px-3 py-2.5 ${b}`}>{l.descricao}</td>
                        <td className={`px-3 py-2.5 ${b}`}>
                          <Badge color={corCategoria(l.categoria)}>{nomeCategoria(l.categoria)}</Badge>
                        </td>
                        <td className={`px-3 py-2.5 text-xs text-[var(--muted-foreground)] whitespace-nowrap ${b}`}>{l.formaPagamento || '—'}</td>
                        <td className={`px-3 py-2.5 text-right font-semibold whitespace-nowrap ${receitaLinha ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'} ${b}`}>
                          {receitaLinha ? '+' : '−'} {formatMoney(l.valor)}
                        </td>
                        <td className={`px-3 py-2.5 ${b}`}>
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
                    <td colSpan={4} className="px-3 py-2.5 text-xs font-bold text-[var(--muted-foreground)] border-t border-[var(--border)]">TOTAL DO PERÍODO</td>
                    <td className={`px-3 py-2.5 text-right font-extrabold border-t border-[var(--border)] ${lucro >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>
                      {formatMoney(lucro)}
                    </td>
                    <td className="border-t border-[var(--border)]" />
                  </tr>
                </tfoot>
              </table>
            )}
          </Card>
          {movimentos.some(m => m.afeta_caixa) && (
            <div className="text-xs text-[var(--muted-foreground)] mt-2">
              Dinheiro enviado pra investimento não aparece aqui como despesa — ele não é gasto, só mudou de lugar. Veja na aba Investimentos.
            </div>
          )}
        </>
      )}

      {/* ---- Modal de lançamento ---- */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Editar lançamento' : form.situacao === 'pendente' && form.tipo === 'despesa' ? 'Nova conta a pagar' : 'Novo lançamento'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="gradient" disabled={salvando} onClick={() => handleSalvar()}><Plus size={15} />{salvando ? 'Salvando...' : 'Salvar'}</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-1 bg-[var(--muted)] rounded-lg p-1 mb-3">
          {(['receita', 'despesa'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => mudarTipo(t)}
              className={`py-1.5 rounded-md text-[13px] font-semibold ${form.tipo === t
                ? (t === 'receita' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white')
                : 'text-[var(--muted-foreground)]'}`}
            >
              {t === 'receita' ? 'Receita (entrou)' : 'Despesa (saiu)'}
            </button>
          ))}
        </div>

        <Label>Descrição</Label>
        <Input placeholder={form.tipo === 'receita' ? 'Ex: Venda — João' : 'Ex: Rolo de PLA, frete Correios...'} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />

        <div className="grid grid-cols-2 gap-x-4">
          <div>
            <Label>Categoria</Label>
            <Select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
              {categoriasDoTipo(form.tipo).map(c => <option key={c.chave} value={c.chave}>{c.nome}</option>)}
              {!categoriasDoTipo(form.tipo).some(c => c.chave === form.categoria) && (
                <option value={form.categoria}>{nomeCategoria(form.categoria)}</option>
              )}
            </Select>
          </div>
          <div>
            <Label>{form.parcelado ? 'Valor total (R$)' : 'Valor (R$)'}</Label>
            <Input placeholder="0,00" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
          </div>
        </div>

        <Label>Forma de pagamento</Label>
        <Select value={form.forma} onChange={e => setForm(f => ({ ...f, forma: e.target.value }))}>
          <option value="">Não informar</option>
          {formasPagamento.map(f => <option key={f} value={f}>{f}</option>)}
        </Select>

        {!form.parcelado && (
          <>
            <Label>Situação</Label>
            <div className="grid grid-cols-2 gap-1 bg-[var(--muted)] rounded-lg p-1 mb-3">
              {(['pago', 'pendente'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, situacao: s }))}
                  className={`py-1.5 rounded-md text-[13px] font-semibold ${form.situacao === s ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm' : 'text-[var(--muted-foreground)]'}`}
                >
                  {s === 'pago' ? (form.tipo === 'receita' ? 'Já recebi' : 'Já paguei') : (form.tipo === 'receita' ? 'Vou receber' : 'Vou pagar')}
                </button>
              ))}
            </div>
            {form.situacao === 'pago' ? (
              <><Label>Data</Label><Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} /></>
            ) : (
              <>
                <Label>Vencimento</Label>
                <Input type="date" value={form.vencimento} onChange={e => setForm(f => ({ ...f, vencimento: e.target.value }))} />
                <div className="text-[11px] text-[var(--muted-foreground)] -mt-2 mb-3">Fica em “Contas a pagar” e só desconta do caixa quando você marcar como pago.</div>
              </>
            )}
          </>
        )}

        {!form.id && (
          <div className="bg-[var(--muted)] rounded-lg p-3 mb-3">
            <label className="flex items-center gap-2 text-[13px] font-semibold cursor-pointer">
              <input type="checkbox" className="w-4 h-4" checked={form.parcelado} onChange={e => setForm(f => ({ ...f, parcelado: e.target.checked }))} />
              {form.tipo === 'despesa' ? 'Compra parcelada' : 'Recebimento parcelado'}
            </label>
            {form.parcelado && (
              <div className="mt-3">
                <div className="grid grid-cols-2 gap-x-4">
                  <div><Label>Nº de parcelas</Label><Input type="number" min={2} max={60} value={form.parcelas} onChange={e => setForm(f => ({ ...f, parcelas: e.target.value }))} /></div>
                  <div><Label>1º vencimento</Label><Input type="date" value={form.vencimento} onChange={e => setForm(f => ({ ...f, vencimento: e.target.value }))} /></div>
                </div>
                <label className="flex items-center gap-2 text-[13px] cursor-pointer mb-2">
                  <input type="checkbox" className="w-4 h-4" checked={form.primeiraPaga} onChange={e => setForm(f => ({ ...f, primeiraPaga: e.target.checked }))} />
                  {form.tipo === 'despesa' ? 'A 1ª parcela já foi paga' : 'A 1ª parcela já foi recebida'}
                </label>
                {Number.isFinite(valorDigitado) && valorDigitado > 0 && (
                  <div className="text-[12px] bg-[var(--card)] rounded-md px-2.5 py-2 border border-[var(--border)]">
                    <b>{nParcelas}x de {formatMoney(valorParcela)}</b>
                    <span className="text-[var(--muted-foreground)]"> · de {formatarDataBR(primeiroVenc)} a {formatarDataBR(somarMeses(primeiroVenc, nParcelas - 1))}</span>
                    <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">Cada parcela vira uma conta em “Contas a pagar”, com vencimento todo mês.</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {form.id && form.grupo && pendentesDoGrupo > 0 && (
          <div className="border-t border-[var(--border)] pt-3 mt-1">
            {confirmandoGrupo ? (
              <div>
                <div className="text-xs text-[var(--muted-foreground)] mb-2">Apaga as {pendentesDoGrupo} parcela(s) que ainda não foram pagas. As pagas continuam no histórico.</div>
                <InlineConfirm onCancel={() => setConfirmandoGrupo(false)} onConfirm={excluirParcelasPendentes} />
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmandoGrupo(true)} className="text-xs font-semibold text-red-600 flex items-center gap-1">
                <Trash2 size={12} />Excluir as {pendentesDoGrupo} parcela(s) pendentes deste parcelamento
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
