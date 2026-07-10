import { Package, Wrench } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { eventosAgenda } from '@/data/mockData'

// Julho de 2026 — domingo como primeiro dia da semana
const semanas = [
  [0, 0, 0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9, 10, 11],
  [12, 13, 14, 15, 16, 17, 18],
  [19, 20, 21, 22, 23, 24, 25],
  [26, 27, 28, 29, 30, 31, 0]
]

const HOJE = 10

function eventosNoDia(dia: number) {
  return eventosAgenda.filter(e => Number(e.data.split('-')[2]) === dia)
}

export function Agenda() {
  return (
    <div>
      <h1 className="text-2xl font-semibold m-0">Agenda</h1>
      <p className="text-[var(--muted-foreground)] text-sm mt-0.5 mb-5">Prazos de entrega, manutenções e compromissos</p>

      <Card>
        <div className="flex items-center justify-between mb-3.5">
          <b className="text-[15px]">Julho 2026</b>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map(d => (
            <div key={d} className="text-center text-[11px] font-bold text-[var(--muted-foreground)] pb-1.5">{d}</div>
          ))}
          {semanas.flat().map((dia, i) => {
            if (dia === 0) return <div key={i} className="min-h-[78px]" />
            const eventos = eventosNoDia(dia)
            const isHoje = dia === HOJE
            return (
              <div
                key={i}
                className={`rounded-lg border p-1.5 text-xs font-bold min-h-[78px]
                ${isHoje ? 'border-[var(--primary)] border-[1.5px] bg-[var(--accent)]' : 'border-[var(--border)] bg-[var(--card)]'}`}
              >
                {dia}
                <div className="flex flex-col gap-1 mt-1.5">
                  {eventos.map(e => (
                    <span
                      key={e.id}
                      className={`text-[10px] font-bold rounded px-1.5 py-0.5 truncate
                      ${e.tipo === 'manutencao' ? 'bg-[#F5F3FF] text-[#5B21B6]' : 'bg-[#ECFEFF] text-[#0E7490]'}`}
                    >
                      {e.titulo.replace('Entrega — ', '').replace('Manutenção — ', '')}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <h2 className="text-[1.05rem] font-semibold mt-7 mb-3">Próximos compromissos</h2>
      <Card className="p-0">
        {eventosAgenda.map((e, i) => (
          <div
            key={e.id}
            className={`flex items-center gap-3 px-4 py-3 ${i < eventosAgenda.length - 1 ? 'border-b border-[var(--border)]' : ''}`}
          >
            <div className="text-xs font-bold text-[var(--muted-foreground)] w-11 flex-shrink-0">
              {e.data.split('-').slice(1).reverse().join('/')}
            </div>
            <div
              className={`w-[34px] h-[34px] rounded-lg flex items-center justify-center flex-shrink-0
              ${e.tipo === 'manutencao' ? 'bg-[#F5F3FF] text-[#5B21B6]' : 'bg-[var(--accent)] text-[var(--primary)]'}`}
            >
              {e.tipo === 'manutencao' ? <Wrench size={16} /> : <Package size={16} />}
            </div>
            <div className="flex-1">
              <b className="text-[13.5px]">{e.titulo}</b>
              <div className="text-xs text-[var(--muted-foreground)]">{e.descricao}</div>
            </div>
            <Badge color={e.tipo === 'manutencao' ? 'purple' : 'cyan'}>{e.tipo === 'manutencao' ? 'Agendado' : 'Entrega'}</Badge>
          </div>
        ))}
      </Card>
    </div>
  )
}
