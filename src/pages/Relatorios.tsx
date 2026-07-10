import { useMemo, useState } from 'react'
import { Download, Sparkles, TrendingUp, TrendingDown, Trophy } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Label, Input } from '@/components/ui/Input'
import { formatMoney } from '@/components/ui/Money'
import { useApi } from '@/lib/useApi'
import { soData } from '@/lib/date'
import { lancamentos as lancamentosMock } from '@/data/mockData'

interface LancamentoApiRow {
  id: string; data: string; descricao: string; tipo: 'receita' | 'despesa'; valor: string; categoria?: string
}
interface ClienteApiRow { id: string; nome: string; pedidos: number; total_gasto: string }

const categoriaLabel: Record<string, string> = {
  vendas: 'Vendas', materiais: 'Materiais', energia: 'Energia', manutencao: 'Manutenção', outros: 'Outros'
}
const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

type Periodo = '3' | '6' | '12' | 'personalizado'

export function Relatorios() {
  const { data, loading, error } = useApi<LancamentoApiRow[]>('/api/lancamentos', [])
  const { data: clientesData } = useApi<ClienteApiRow[]>('/api/clientes', [])

  const usandoMock = !loading && !!error
  const vazio = !loading && !error && data.length === 0
  const lancamentos = usandoMock
    ? lancamentosMock.map(l => ({ ...l, categoria: l.tipo === 'receita' ? 'vendas' : 'outros' }))
    : data.map(l => ({ id: l.id, data: soData(l.data), descricao: l.descricao, tipo: l.tipo, valor: Number(l.valor), categoria: l.categoria ?? 'outros' }))

  const [periodo, setPeriodo] = useState<Periodo>('6')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [analise, setAnalise] = useState('Peça pra Scout ler os números do período e apontar o que se destaca.')

  const [potencia, setPotencia] = useState('220')
  const [horas, setHoras] = useState('96')
  const [tarifa, setTarifa] = useState('0,76')

  const energia = useMemo(() => {
    const w = parseFloat(potencia.replace(',', '.')) || 0
    const h = parseFloat(horas.replace(',', '.')) || 0
    const t = parseFloat(tarifa.replace(',', '.')) || 0
    const kwh = (w / 1000) * h
    const custoHora = (w / 1000) * t
    return { kwh, custoHora, custoTotal: kwh * t }
  }, [potencia, horas, tarifa])

  const hoje = new Date()

  // filtra lançamentos pro período selecionado (só usado pras métricas de comparação/ranking futuras, se precisar)
  const lancamentosFiltrados = useMemo(() => {
    if (periodo === 'personalizado' && dataInicio && dataFim) {
      return lancamentos.filter(l => l.data >= dataInicio && l.data <= dataFim)
    }
    return lancamentos
  }, [lancamentos, periodo, dataInicio, dataFim])

  const saldoMensal = useMemo(() => {
    const nMeses = periodo === 'personalizado' ? 6 : Number(periodo)
    const meses: { chave: string; label: string; saldo: number }[] = []
    for (let i = nMeses - 1; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      meses.push({ chave, label: mesesNomes[d.getMonth()], saldo: 0 })
    }
    lancamentos.forEach(l => {
      const chave = l.data.slice(0, 7)
      const mes = meses.find(m => m.chave === chave)
      if (mes) mes.saldo += l.tipo === 'receita' ? l.valor : -l.valor
    })
    const maxAbs = Math.max(...meses.map(m => Math.abs(m.saldo)), 1)
    return meses.map(m => ({ ...m, pct: Math.max((Math.abs(m.saldo) / maxAbs) * 100, 4) }))
  }, [lancamentos, periodo])

  const comparacaoMensal = useMemo(() => {
    const chaveAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
    const dAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
    const chaveAnterior = `${dAnterior.getFullYear()}-${String(dAnterior.getMonth() + 1).padStart(2, '0')}`

    function totalDoMes(chave: string) {
      const doMes = lancamentos.filter(l => l.data.slice(0, 7) === chave)
      const receita = doMes.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0)
      const despesa = doMes.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0)
      return { receita, despesa, lucro: receita - despesa }
    }

    const atual = totalDoMes(chaveAtual)
    const anterior = totalDoMes(chaveAnterior)
    const variacao = anterior.lucro !== 0 ? ((atual.lucro - anterior.lucro) / Math.abs(anterior.lucro)) * 100 : (atual.lucro > 0 ? 100 : 0)
    return { atual, anterior, variacao }
  }, [lancamentos])

  const rankingClientes = useMemo(() => {
    return [...clientesData]
      .map(c => ({ nome: c.nome, pedidos: c.pedidos, total: Number(c.total_gasto) }))
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [clientesData])

  const distribuicaoGastos = useMemo(() => {
    const totais: Record<string, number> = {}
    lancamentosFiltrados.filter(l => l.tipo === 'despesa').forEach(l => {
      totais[l.categoria] = (totais[l.categoria] ?? 0) + l.valor
    })
    const totalGeral = Object.values(totais).reduce((s, v) => s + v, 0)
    return Object.entries(totais)
      .map(([cat, valor]) => ({ categoria: categoriaLabel[cat] ?? cat, valor, pct: totalGeral > 0 ? Math.round((valor / totalGeral) * 100) : 0 }))
      .sort((a, b) => b.valor - a.valor)
  }, [lancamentosFiltrados])

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-semibold m-0">Relatórios</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-0.5">Como o período selecionado se comportou {usandoMock && '(dados de exemplo)'}</p>
        </div>
        <Button variant="gradient"><Download size={15} />Baixar PDF</Button>
      </div>

      <div className="mb-4 flex items-center gap-2 flex-wrap">
        {(['3', '6', '12'] as const).map(p => (
          <span
            key={p}
            onClick={() => setPeriodo(p)}
            className={`inline-flex px-4 py-1.5 rounded-full text-[13px] font-semibold cursor-pointer border
            ${periodo === p ? 'bg-[var(--accent)] text-[var(--primary)] border-[var(--primary)]' : 'bg-[var(--muted)] text-[var(--muted-foreground)] border-transparent'}`}
          >
            {p} meses
          </span>
        ))}
        <span
          onClick={() => setPeriodo('personalizado')}
          className={`inline-flex px-4 py-1.5 rounded-full text-[13px] font-semibold cursor-pointer border
          ${periodo === 'personalizado' ? 'bg-[var(--accent)] text-[var(--primary)] border-[var(--primary)]' : 'bg-[var(--muted)] text-[var(--muted-foreground)] border-transparent'}`}
        >
          Personalizado
        </span>
        {periodo === 'personalizado' && (
          <div className="flex items-center gap-2 ml-1">
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--muted)] text-xs" />
            <span className="text-xs text-[var(--muted-foreground)]">até</span>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--muted)] text-xs" />
          </div>
        )}
      </div>

      <div className="bg-[var(--card)] border-[1.5px] border-[var(--secondary)] rounded-xl px-4.5 py-4 flex justify-between items-center mt-4.5 mb-7">
        <div className="flex gap-3 items-center">
          <div className="w-[34px] h-[34px] rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 text-white flex items-center justify-center flex-shrink-0">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-[var(--muted-foreground)]">ANÁLISE DA SCOUT</div>
            <div className="text-[13.5px] mt-0.5">{analise}</div>
          </div>
        </div>
        <span
          onClick={() => setAnalise('Peça isso na barra da Scout lá em cima — ela lê seus dados reais e te dá uma análise sob medida.')}
          className="text-xs font-bold text-[var(--secondary)] cursor-pointer whitespace-nowrap flex items-center gap-1"
        >
          <Sparkles size={12} /> gerar análise
        </span>
      </div>

      <div className="flex gap-4 flex-wrap">
        <Card className="flex-1 min-w-[220px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] mb-2">Lucro este mês vs mês anterior</div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-extrabold">{formatMoney(comparacaoMensal.atual.lucro)}</div>
            <div className={`flex items-center gap-0.5 text-xs font-bold ${comparacaoMensal.variacao >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {comparacaoMensal.variacao >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {Math.abs(Math.round(comparacaoMensal.variacao))}%
            </div>
          </div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">Mês anterior: {formatMoney(comparacaoMensal.anterior.lucro)}</div>
        </Card>
        <Card className="flex-1 min-w-[220px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] mb-2">Receita este mês</div>
          <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">{formatMoney(comparacaoMensal.atual.receita)}</div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">Anterior: {formatMoney(comparacaoMensal.anterior.receita)}</div>
        </Card>
        <Card className="flex-1 min-w-[220px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] mb-2">Despesas este mês</div>
          <div className="text-2xl font-extrabold text-red-600">{formatMoney(comparacaoMensal.atual.despesa)}</div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">Anterior: {formatMoney(comparacaoMensal.anterior.despesa)}</div>
        </Card>
      </div>

      <div className="flex gap-4 flex-wrap items-stretch mt-4">
        <Card className="flex-[2] min-w-[340px]">
          <div className="font-bold mb-1">SALDO MENSAL</div>
          <div className="flex items-end gap-3.5 h-[140px] pt-2.5">
            {saldoMensal.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                <div
                  className={`w-full rounded-t-md ${m.saldo >= 0 ? 'bg-gradient-to-b from-cyan-400 to-cyan-500' : 'bg-gradient-to-b from-red-400 to-red-500'}`}
                  style={{ height: `${m.pct}%` }}
                  title={formatMoney(m.saldo)}
                />
                <div className="text-[10px] text-[var(--muted-foreground)] mt-1 font-semibold">{m.label}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="flex-1 min-w-[240px]">
          <div className="font-bold mb-1">DISTRIBUIÇÃO DE GASTOS</div>
          {distribuicaoGastos.length === 0 && <div className="text-xs text-[var(--muted-foreground)] py-4">Nenhuma despesa no período.</div>}
          {distribuicaoGastos.map(d => (
            <div key={d.categoria} className="flex justify-between items-center py-2 border-b border-[var(--border)] last:border-none text-[13px]">
              <span>{d.categoria}</span>
              <div className="h-1.5 rounded-full bg-[var(--border)] flex-1 mx-3 overflow-hidden">
                <div className="h-full rounded-full bg-[var(--secondary)]" style={{ width: `${d.pct}%` }} />
              </div>
              <span>{d.pct}%</span>
            </div>
          ))}
        </Card>
      </div>

      <h2 className="text-[1.05rem] font-semibold mt-7 mb-3 flex items-center gap-2"><Trophy size={17} className="text-amber-500" />Ranking de clientes</h2>
      <Card className="p-0">
        {rankingClientes.length === 0 ? (
          <div className="text-center py-6 text-xs text-[var(--muted-foreground)]">Nenhum pedido com valor lançado ainda.</div>
        ) : (
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr>
                <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">#</th>
                <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Cliente</th>
                <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Pedidos</th>
                <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Total gasto</th>
              </tr>
            </thead>
            <tbody>
              {rankingClientes.map((c, i) => {
                const last = i === rankingClientes.length - 1
                return (
                  <tr key={c.nome}>
                    <td className={`px-2.5 py-2.5 font-bold ${!last ? 'border-b border-[var(--border)]' : ''}`}>{i + 1}º</td>
                    <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>{c.nome}</td>
                    <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>{c.pedidos}</td>
                    <td className={`px-2.5 py-2.5 font-semibold ${!last ? 'border-b border-[var(--border)]' : ''}`}>{formatMoney(c.total)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      <h2 className="text-[1.05rem] font-semibold mt-7 mb-1">Calculadora de energia da impressão</h2>
      <p className="text-[var(--muted-foreground)] text-sm mb-4">
        Separa o quanto da sua conta de luz é só da impressora, já que você usa energia pra outras coisas também.
      </p>
      <div className="flex gap-4 flex-wrap items-start">
        <Card className="flex-1 min-w-[280px]">
          <Label>Potência da impressora (W)</Label>
          <Input value={potencia} onChange={e => setPotencia(e.target.value)} />
          <Label>Horas de impressão no mês</Label>
          <Input value={horas} onChange={e => setHoras(e.target.value)} />
          <Label>Tarifa de energia (R$/kWh)</Label>
          <Input value={tarifa} onChange={e => setTarifa(e.target.value)} />
        </Card>
        <Card className="flex-1 min-w-[280px]">
          <div className="font-bold mb-2.5">Resultado</div>
          <div className="flex justify-between text-[13px] py-1.5 border-b border-[var(--border)]"><span>Consumo no mês</span><span>{energia.kwh.toFixed(2).replace('.', ',')} kWh</span></div>
          <div className="flex justify-between text-[13px] py-1.5 border-b border-[var(--border)]"><span>Custo por hora de impressão</span><span>{formatMoney(energia.custoHora)}</span></div>
          <div className="bg-[var(--accent)] rounded-xl p-4 mt-1.5">
            <div className="text-xs font-semibold text-[var(--muted-foreground)]">Custo estimado da impressão no mês</div>
            <div className="text-2xl font-extrabold text-[var(--secondary)]">{formatMoney(energia.custoTotal)}</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">Só da impressora — o resto da conta é uso da casa/estúdio</div>
          </div>
        </Card>
      </div>
    </div>
  )
}
