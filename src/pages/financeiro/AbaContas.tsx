import { useState } from 'react'
import { Check, Pencil, Trash2, CalendarClock, AlertTriangle, CalendarDays, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Money, formatMoney } from '@/components/ui/Money'
import { Select } from '@/components/ui/Input'
import { InlineConfirm } from '@/components/ui/InlineConfirm'
import { InlineAcao } from '@/components/ui/InlineAcao'
import { EstadoVazio } from '@/components/ui/EstadoVazio'
import { api } from '@/lib/api'
import { formatarDataBR } from '@/lib/date'
import { Lancamento, situacaoVencimento, diasAte, hojeLocal, motivoErro } from '@/lib/financeiro'

interface Props {
  pendentes: Lancamento[]
  nomeCategoria: (chave: string) => string
  onEditar: (l: Lancamento) => void
  onNovaConta: () => void
  onMudou: () => void
}

export function AbaContas({ pendentes, nomeCategoria, onEditar, onNovaConta, onMudou }: Props) {
  const [filtro, setFiltro] = useState<'todas' | 'despesa' | 'receita'>('despesa')
  const [confirmando, setConfirmando] = useState<{ id: string; acao: 'pagar' | 'excluir' } | null>(null)

  const lista = pendentes
    .filter(l => filtro === 'todas' || l.tipo === filtro)
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))

  const aPagar = pendentes.filter(l => l.tipo === 'despesa')
  const vencidas = aPagar.filter(l => diasAte(l.vencimento) < 0)
  const proximos7 = aPagar.filter(l => { const d = diasAte(l.vencimento); return d >= 0 && d <= 7 })
  const mesAtual = hojeLocal().slice(0, 7)
  const doMes = aPagar.filter(l => l.vencimento.slice(0, 7) === mesAtual)
  const soma = (xs: Lancamento[]) => xs.reduce((s, l) => s + l.valor, 0)

  async function marcarPago(l: Lancamento) {
    try {
      await api.patch(`/api/lancamentos?id=${l.id}`, { status: 'pago', data: hojeLocal() })
      setConfirmando(null)
      onMudou()
    } catch (err) {
      alert('Não deu pra marcar como pago.\n\nMotivo: ' + motivoErro(err))
    }
  }
  async function excluir(l: Lancamento) {
    try {
      await api.del(`/api/lancamentos?id=${l.id}`)
      setConfirmando(null)
      onMudou()
    } catch (err) {
      alert('Não deu pra excluir.\n\nMotivo: ' + motivoErro(err))
    }
  }

  return (
    <div>
      <div className="flex gap-4 flex-wrap">
        <Card className="flex-1 min-w-[180px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><AlertTriangle size={14} />Vencidas</div>
          <div className={`text-xl font-extrabold ${vencidas.length > 0 ? 'text-red-600' : ''}`}><Money value={soma(vencidas)} /></div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">{vencidas.length} conta(s)</div>
        </Card>
        <Card className="flex-1 min-w-[180px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><CalendarClock size={14} />Próximos 7 dias</div>
          <div className={`text-xl font-extrabold ${proximos7.length > 0 ? 'text-amber-600' : ''}`}><Money value={soma(proximos7)} /></div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">{proximos7.length} conta(s)</div>
        </Card>
        <Card className="flex-1 min-w-[180px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><CalendarDays size={14} />A pagar neste mês</div>
          <div className="text-xl font-extrabold"><Money value={soma(doMes)} /></div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">{doMes.length} conta(s)</div>
        </Card>
        <Card className="flex-1 min-w-[180px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><CalendarDays size={14} />Total a pagar</div>
          <div className="text-xl font-extrabold"><Money value={soma(aPagar)} /></div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">todas as parcelas futuras</div>
        </Card>
      </div>

      <div className="flex items-center justify-between mt-6 mb-3 gap-2 flex-wrap">
        <h2 className="text-[1.05rem] font-semibold m-0">Contas em aberto</h2>
        <Select value={filtro} onChange={e => setFiltro(e.target.value as typeof filtro)} className="!mb-0 !w-auto min-w-[160px]">
          <option value="despesa">A pagar</option>
          <option value="receita">A receber</option>
          <option value="todas">Todas</option>
        </Select>
      </div>

      <Card className="p-0 overflow-x-auto">
        {lista.length === 0 ? (
          <EstadoVazio
            icone={CalendarClock}
            titulo={filtro === 'receita' ? 'Nada a receber lançado' : 'Nenhuma conta em aberto'}
            descricao="Lance uma despesa como “pendente” com a data de vencimento, ou parcele uma compra. Ela aparece aqui até você marcar como paga."
            acaoTexto="Nova conta a pagar"
            onAcao={onNovaConta}
          />
        ) : (
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr>
                {['Vencimento', 'Descrição', 'Categoria', 'Valor', ''].map((h, i) => (
                  <th key={i} className={`${h === 'Valor' ? 'text-right' : 'text-left'} text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map((l, i) => {
                const last = i === lista.length - 1
                const b = !last ? 'border-b border-[var(--border)]' : ''
                const sit = situacaoVencimento(l.vencimento)
                const receita = l.tipo === 'receita'
                return (
                  <tr key={l.id}>
                    <td className={`px-3 py-2.5 whitespace-nowrap ${b}`}>
                      <div className="font-semibold">{formatarDataBR(l.vencimento)}</div>
                      <Badge color={sit.cor}>{sit.texto}</Badge>
                    </td>
                    <td className={`px-3 py-2.5 ${b}`}>
                      <div className="flex items-center gap-1.5">
                        {receita ? <ArrowDownCircle size={13} className="text-emerald-600 flex-shrink-0" /> : <ArrowUpCircle size={13} className="text-red-500 flex-shrink-0" />}
                        {l.descricao}
                      </div>
                      {l.formaPagamento && <div className="text-xs text-[var(--muted-foreground)]">{l.formaPagamento}</div>}
                    </td>
                    <td className={`px-3 py-2.5 ${b}`}><Badge color="gray">{nomeCategoria(l.categoria)}</Badge></td>
                    <td className={`px-3 py-2.5 text-right font-semibold whitespace-nowrap ${receita ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'} ${b}`}>
                      {formatMoney(l.valor)}
                    </td>
                    <td className={`px-3 py-2.5 ${b}`}>
                      {confirmando?.id === l.id && confirmando.acao === 'pagar' ? (
                        <InlineAcao
                          pergunta={receita ? 'Recebeu hoje?' : 'Pagou hoje?'}
                          textoConfirmar={receita ? 'Recebido' : 'Pago'}
                          icone={<Check size={12} />}
                          onCancel={() => setConfirmando(null)}
                          onConfirm={() => marcarPago(l)}
                        />
                      ) : confirmando?.id === l.id && confirmando.acao === 'excluir' ? (
                        <InlineConfirm onCancel={() => setConfirmando(null)} onConfirm={() => excluir(l)} />
                      ) : (
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => setConfirmando({ id: l.id, acao: 'pagar' })}
                            className="text-xs font-semibold px-2.5 h-7 rounded-lg bg-[var(--accent)] text-[var(--primary)] flex items-center gap-1 whitespace-nowrap"
                          >
                            <Check size={12} />{receita ? 'Recebi' : 'Paguei'}
                          </button>
                          <button onClick={() => onEditar(l)} title="Editar" className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)]"><Pencil size={13} /></button>
                          <button onClick={() => setConfirmando({ id: l.id, acao: 'excluir' })} title="Excluir" className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
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
      <div className="text-xs text-[var(--muted-foreground)] mt-2">
        Ao marcar como pago, a conta sai daqui e entra nos lançamentos com a data de hoje — aí sim desconta do caixa.
      </div>
    </div>
  )
}
