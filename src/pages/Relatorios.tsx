import { useMemo, useState } from 'react'
import { Download, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Label, Input } from '@/components/ui/Input'
import { formatMoney } from '@/components/ui/Money'
import { useApi } from '@/lib/useApi'
import { lancamentos as lancamentosMock } from '@/data/mockData'

interface LancamentoApiRow {
  id: string; data: string; descricao: string; tipo: 'receita' | 'despesa'; valor: string; categoria?: string
}

const categoriaLabel: Record<string, string> = {
  vendas: 'Vendas', materiais: 'Materiais', energia: 'Energia', manutencao: 'Manutenção', outros: 'Outros'
}
const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export function Relatorios() {
  const { data, loading, error } = useApi<LancamentoApiRow[]>('/api/lancamentos', [])
  const usandoMock = !loading && (error || data.length === 0)
  const lancamentos = usandoMock
    ? lancamentosMock.map(l => ({ ...l, categoria: l.tipo === 'receita' ? 'vendas' : 'outros' }))
    : data.map(l => ({ id: l.id, data: l.data, descricao: l.descricao, tipo: l.tipo, valor: Number(l.valor), categoria: l.categoria ?? 'outros' }))

  const [periodo, setPeriodo] = useState<'3' | '6'>('6')
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

  const saldoMensal = useMemo(() => {
    const nMeses = Number(periodo)
    const hoje = new Date('2026-07-10')
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

  const distribuicaoGastos = useMemo(() => {
    const totais: Record<string, number> = {}
    lancamentos.filter(l => l.tipo === 'despesa').forEach(l => {
      totais[l.categoria] = (totais[l.categoria] ?? 0) + l.valor
    })
    const totalGeral = Object.values(totais).reduce((s, v) => s + v, 0)
    return Object.entries(totais)
      .map(([cat, valor]) => ({ categoria: categoriaLabel[cat] ?? cat, valor, pct: totalGeral > 0 ? Math.round((valor / totalGeral) * 100) : 0 }))
      .sort((a, b) => b.valor - a.valor)
  }, [lancamentos])

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-semibold m-0">Relatórios</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-0.5">Como o período selecionado se comportou {usandoMock && '(dados de exemplo)'}</p>
        </div>
        <Button variant="gradient"><Download size={15} />Baixar PDF</Button>
      </div>

      <div className="mb-4">
        {(['3', '6'] as const).map(p => (
          <span
            key={p}
            onClick={() => setPeriodo(p)}
            className={`inline-flex px-4 py-1.5 rounded-full text-[13px] font-semibold cursor-pointer border mr-2
            ${periodo === p ? 'bg-[var(--accent)] text-[var(--primary)] border-[var(--primary)]' : 'bg-[var(--muted)] text-[var(--muted-foreground)] border-transparent'}`}
          >
            {p} meses
          </span>
        ))}
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

      <div className="flex gap-4 flex-wrap items-stretch">
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
          {distribuicaoGastos.length === 0 && <div className="text-xs text-[var(--muted-foreground)] py-4">Nenhuma despesa lançada ainda.</div>}
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
