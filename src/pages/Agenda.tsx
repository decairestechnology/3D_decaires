import { useMemo, useState, FormEvent } from 'react'
import { Package, Wrench, Plus, Users, Trash2, Pencil, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { InlineConfirm } from '@/components/ui/InlineConfirm'
import { Label, Input, Select } from '@/components/ui/Input'
import { useApi } from '@/lib/useApi'
import { api } from '@/lib/api'
import { soData, formatarDataCurta } from '@/lib/date'

const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const diasSemana = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

type TipoEvento = 'entrega' | 'manutencao' | 'reuniao'
type Visao = 'mensal' | 'semanal' | 'diario' | 'lista'

interface EventoApiRow {
  id: string
  data: string
  horario: string | null
  titulo: string
  descricao: string | null
  tipo: TipoEvento
}
interface EventoUI {
  id: string
  data: string
  horario: string | null
  titulo: string
  descricao: string
  tipo: TipoEvento
}

const tipoInfo: Record<TipoEvento, { label: string; badge: 'cyan' | 'purple' | 'amber'; dot: string; icon: typeof Package }> = {
  entrega: { label: 'Entrega', badge: 'cyan', dot: 'bg-[#ECFEFF] text-[#0E7490]', icon: Package },
  manutencao: { label: 'Manutenção', badge: 'purple', dot: 'bg-[#F5F3FF] text-[#5B21B6]', icon: Wrench },
  reuniao: { label: 'Reunião', badge: 'amber', dot: 'bg-[#FFFBEB] text-[#92400E]', icon: Users }
}

const formVazio = { id: '', data: '', horario: '', titulo: '', descricao: '', tipo: 'entrega' as TipoEvento }

function gerarSemanas(ano: number, mes: number) {
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay()
  const diasNoMes = new Date(ano, mes + 1, 0).getDate()
  const celulas: number[] = []
  for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(0)
  for (let d = 1; d <= diasNoMes; d++) celulas.push(d)
  while (celulas.length % 7 !== 0) celulas.push(0)
  const semanas: number[][] = []
  for (let i = 0; i < celulas.length; i += 7) semanas.push(celulas.slice(i, i + 7))
  return semanas
}

export function Agenda() {
  const { data, loading, error, reload } = useApi<EventoApiRow[]>('/api/agenda', [])
  const [modalOpen, setModalOpen] = useState(false)
  const [lembreteAberto, setLembreteAberto] = useState<EventoUI | null>(null)
  const [confirmandoLembrete, setConfirmandoLembrete] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)
  const [form, setForm] = useState(formVazio)
  const [visao, setVisao] = useState<Visao>('mensal')

  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth())
  const [ano, setAno] = useState(hoje.getFullYear())

  const usandoMock = !loading && !!error
  const vazio = !loading && !error && data.length === 0
  const eventos: EventoUI[] = usandoMock ? [] : data.map(e => ({ id: e.id, data: e.data, horario: e.horario, titulo: e.titulo, descricao: e.descricao ?? '', tipo: e.tipo }))

  const semanas = useMemo(() => gerarSemanas(ano, mes), [ano, mes])

  function eventosNoDia(dia: number) {
    const chave = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    return eventos.filter(e => soData(e.data) === chave)
  }

  function irParaHoje() {
    setMes(hoje.getMonth())
    setAno(hoje.getFullYear())
  }
  function mesAnterior() {
    if (mes === 0) { setMes(11); setAno(a => a - 1) } else setMes(m => m - 1)
  }
  function mesSeguinte() {
    if (mes === 11) { setMes(0); setAno(a => a + 1) } else setMes(m => m + 1)
  }

  function abrirNovo() {
    setForm(formVazio)
    setModalOpen(true)
  }

  function abrirEdicao(ev: EventoUI) {
    setLembreteAberto(null)
    setForm({ id: ev.id, data: ev.data.slice(0, 10), horario: ev.horario ? ev.horario.slice(0, 5) : '', titulo: ev.titulo, descricao: ev.descricao, tipo: ev.tipo })
    setModalOpen(true)
  }

  async function handleSalvar(e: FormEvent) {
    e.preventDefault()
    if (!form.titulo.trim() || !form.data) return
    setSalvando(true)
    try {
      const payload = { data: form.data, titulo: form.titulo, descricao: form.descricao || null, tipo: form.tipo, horario: form.horario || null }
      if (form.id) await api.patch(`/api/agenda?id=${form.id}`, payload)
      else await api.post('/api/agenda', payload)
      setModalOpen(false)
      setForm(formVazio)
      reload()
    } catch (err) {
      console.error('[Salvar] erro:', err)
      alert('Não deu pra salvar — confere se o banco (Neon) está conectado e as variáveis de ambiente configuradas.')
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(id: string) {
    try {
      await api.del(`/api/agenda?id=${id}`)
      setConfirmandoId(null)
      setConfirmandoLembrete(false)
      setLembreteAberto(null)
      reload()
    } catch (err) {
      console.error('[Excluir] erro:', err)
      alert('Não deu pra excluir. Confere a conexão com o banco.')
    }
  }

  const listaCompromissos = (
    <Card className="p-0">
      {vazio ? (
        <div className="text-center py-10 text-sm text-[var(--muted-foreground)]">Nenhum compromisso ainda. Clica em "Novo compromisso" pra começar.</div>
      ) : eventos.map((e, i) => {
        const info = tipoInfo[e.tipo]
        const Icon = info.icon
        return (
          <div key={e.id} className={`flex items-center gap-3 px-4 py-3 ${i < eventos.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>
            <div className="text-xs font-bold text-[var(--muted-foreground)] w-14 flex-shrink-0 leading-tight">
              {formatarDataCurta(e.data)}
              {e.horario && <div className="text-[10px] font-semibold text-[var(--muted-foreground)] opacity-80">{e.horario.slice(0, 5)}</div>}
            </div>
            <div className={`w-[34px] h-[34px] rounded-lg flex items-center justify-center flex-shrink-0 ${info.dot}`}>
              <Icon size={16} />
            </div>
            <div className="flex-1 cursor-pointer" onClick={() => setLembreteAberto(e)}>
              <b className="text-[13.5px]">{e.titulo}</b>
              <div className="text-xs text-[var(--muted-foreground)]">{e.descricao}</div>
            </div>
            {confirmandoId === e.id ? (
              <InlineConfirm onCancel={() => setConfirmandoId(null)} onConfirm={() => excluir(e.id)} />
            ) : (
              <div className="flex items-center gap-2">
                <Badge color={info.badge}>{info.label}</Badge>
                {!usandoMock && (
                  <>
                    <button onClick={() => abrirEdicao(e)} className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)]">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setConfirmandoId(e.id)} className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-600">
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </Card>
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold m-0">Agenda</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-0.5">Prazos, manutenções e reuniões {usandoMock && '(sem conexão com o banco)'}</p>
        </div>
        <Button variant="gradient" onClick={abrirNovo}><Plus size={15} />Novo compromisso</Button>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={mesAnterior} className="w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--card)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--primary)]">
            <ChevronLeft size={15} />
          </button>
          <Select value={mes} onChange={e => setMes(Number(e.target.value))} className="!mb-0 !w-auto">
            {mesesNomes.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </Select>
          <Select value={ano} onChange={e => setAno(Number(e.target.value))} className="!mb-0 !w-auto">
            {[ano - 1, ano, ano + 1].map(a => <option key={a} value={a}>{a}</option>)}
          </Select>
          <button onClick={mesSeguinte} className="w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--card)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--primary)]">
            <ChevronRight size={15} />
          </button>
          <button onClick={irParaHoje} className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--primary)]">
            Hoje
          </button>
        </div>
        <div className="flex items-center gap-1 bg-[var(--muted)] rounded-lg p-1">
          {(['mensal', 'semanal', 'diario', 'lista'] as Visao[]).map(v => (
            <button
              key={v}
              onClick={() => setVisao(v)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize ${visao === v ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' : 'text-[var(--muted-foreground)]'}`}
            >
              {v === 'diario' ? 'Diário' : v}
            </button>
          ))}
        </div>
      </div>

      {visao === 'mensal' && (
        <Card>
          <div className="grid grid-cols-7 gap-1.5">
            {diasSemana.map(d => (
              <div key={d} className="text-center text-[11px] font-bold text-[var(--muted-foreground)] pb-1.5">{d}</div>
            ))}
            {semanas.flat().map((dia, i) => {
              if (dia === 0) return <div key={i} className="min-h-[78px]" />
              const evs = eventosNoDia(dia)
              const isHoje = dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear()
              return (
                <div
                  key={i}
                  className={`rounded-lg border p-1.5 text-xs font-bold min-h-[78px]
                  ${isHoje ? 'border-[var(--primary)] border-[1.5px] bg-[var(--accent)]' : 'border-[var(--border)] bg-[var(--card)]'}`}
                >
                  {dia}
                  <div className="flex flex-col gap-1 mt-1.5">
                    {evs.map(e => (
                      <span
                        key={e.id}
                        onClick={ev => { ev.stopPropagation(); setLembreteAberto(e) }}
                        className={`text-[10px] font-bold rounded px-1.5 py-0.5 truncate cursor-pointer hover:opacity-80 ${tipoInfo[e.tipo].dot}`}
                        title={e.titulo}
                      >
                        — {e.horario ? e.horario.slice(0, 5) + ' ' : ''}{e.titulo.replace(/^(Entrega|Manutenção|Reunião) — /, '')}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {(visao === 'semanal' || visao === 'diario') && (
        <Card><div className="text-center py-10 text-sm text-[var(--muted-foreground)]">Visão {visao} chega numa próxima atualização — usa "Mensal" ou "Lista" por enquanto.</div></Card>
      )}

      {visao === 'lista' && listaCompromissos}

      {visao === 'mensal' && (
        <>
          <h2 className="text-[1.05rem] font-semibold mt-7 mb-3">Próximos compromissos</h2>
          {listaCompromissos}
        </>
      )}

      {/* LEMBRETE (view estilo cartão) */}
      <Modal
        open={!!lembreteAberto}
        onClose={() => { setLembreteAberto(null); setConfirmandoLembrete(false) }}
        title=""
        footer={undefined}
      >
        {lembreteAberto && (
          <div>
            <div className="flex items-center justify-between mb-3 -mt-2">
              <Badge color={tipoInfo[lembreteAberto.tipo].badge}>{tipoInfo[lembreteAberto.tipo].label}</Badge>
              {!confirmandoLembrete && !usandoMock && (
                <div className="flex items-center gap-1">
                  <button onClick={() => abrirEdicao(lembreteAberto)} className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)]"><Pencil size={13} /></button>
                  <button onClick={() => setConfirmandoLembrete(true)} className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
                  <button onClick={() => setLembreteAberto(null)} className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)]"><X size={13} /></button>
                </div>
              )}
            </div>
            {confirmandoLembrete ? (
              <div className="mb-3"><InlineConfirm onCancel={() => setConfirmandoLembrete(false)} onConfirm={() => excluir(lembreteAberto.id)} /></div>
            ) : null}
            <b className="text-lg block mb-4">{lembreteAberto.titulo}</b>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--muted)] rounded-lg p-3">
                <div className="text-[11px] font-semibold text-[var(--muted-foreground)]">Data</div>
                <div className="text-sm font-bold mt-0.5">{formatarDataCurta(lembreteAberto.data)}</div>
              </div>
              <div className="bg-[var(--muted)] rounded-lg p-3">
                <div className="text-[11px] font-semibold text-[var(--muted-foreground)]">Horário</div>
                <div className="text-sm font-bold mt-0.5">{lembreteAberto.horario ? lembreteAberto.horario.slice(0, 5) : '— — —'}</div>
              </div>
            </div>
            {lembreteAberto.descricao && (
              <div className="bg-[var(--muted)] rounded-lg p-3 mt-3">
                <div className="text-[11px] font-semibold text-[var(--muted-foreground)]">Descrição</div>
                <div className="text-sm mt-0.5">{lembreteAberto.descricao}</div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Editar compromisso' : 'Novo compromisso'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="gradient" disabled={salvando} onClick={handleSalvar}><Plus size={15} />{salvando ? 'Salvando...' : 'Salvar'}</Button>
          </>
        }
      >
        <Label>Título</Label>
        <Input placeholder="Ex: Entrega — Cliente X" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
        <div className="grid grid-cols-3 gap-x-4">
          <div><Label>Data</Label><Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} /></div>
          <div><Label>Horário</Label><Input type="time" value={form.horario} onChange={e => setForm(f => ({ ...f, horario: e.target.value }))} /></div>
          <div>
            <Label>Tipo</Label>
            <Select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoEvento }))}>
              <option value="entrega">Entrega</option>
              <option value="manutencao">Manutenção</option>
              <option value="reuniao">Reunião</option>
            </Select>
          </div>
        </div>
        <Label>Descrição</Label>
        <Input placeholder="Detalhe opcional" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
      </Modal>
    </div>
  )
}
