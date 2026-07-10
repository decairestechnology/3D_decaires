import { useMemo, useState } from 'react'
import { Download, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Label, Input } from '@/components/ui/Input'
import { formatMoney } from '@/components/ui/Money'

const saldoMensal = [55, 70, 40, 85, 65, 100]
const distribuicao = [
  { nome: 'Filamento', pct: 58 },
  { nome: 'Energia', pct: 22 },
  { nome: 'Manutenção', pct: 12 },
  { nome: 'Outros', pct: 8 }
]

export function Relatorios() {
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

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-semibold m-0">Relatórios</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-0.5">Como o período selecionado se comportou</p>
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
          onClick={() => setAnalise('Seu lucro cresceu 18% no período. Filamento segue como maior custo (58%) — vale negociar compra em maior volume pra reduzir o preço por kg.')}
          className="text-xs font-bold text-[var(--secondary)] cursor-pointer whitespace-nowrap flex items-center gap-1"
        >
          <Sparkles size={12} /> gerar análise
        </span>
      </div>

      <div className="flex gap-4 flex-wrap items-stretch">
        <Card className="flex-[2] min-w-[340px]">
          <div className="font-bold mb-1">SALDO MENSAL</div>
          <div className="flex items-end gap-3.5 h-[140px] pt-2.5">
            {saldoMensal.map((h, i) => (
              <div key={i} className="flex-1 rounded-t-md bg-gradient-to-b from-cyan-400 to-cyan-500 min-w-[20px]" style={{ height: `${h}%` }} />
            ))}
          </div>
        </Card>
        <Card className="flex-1 min-w-[240px]">
          <div className="font-bold mb-1">DISTRIBUIÇÃO DE GASTOS — ESTE MÊS</div>
          {distribuicao.map(d => (
            <div key={d.nome} className="flex justify-between items-center py-2 border-b border-[var(--border)] last:border-none text-[13px]">
              <span>{d.nome}</span>
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
