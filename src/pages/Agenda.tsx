import { useState, FormEvent } from 'react'
import { Package, Wrench, Plus, Users, Trash2, Pencil } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { InlineConfirm } from '@/components/ui/InlineConfirm'
import { Label, Input, Select } from '@/components/ui/Input'
import { useApi } from '@/lib/useApi'
import { api } from '@/lib/api'
import { eventosAgenda as eventosMock } from '@/data/mockData'

const semanas = [
  [0, 0, 0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9, 10, 11],
  [12, 13, 14, 15, 16, 17, 18],
  [19, 20, 21, 22, 23, 24, 25],
  [26, 27, 28, 29, 30, 31, 0]
]
const HOJE = 10

type TipoEvento = 'entrega' | 'manutencao' | 'reuniao'

interface EventoApiRow {
  id: string
  data: string
  titulo: string
  descricao: string | null
  tipo: TipoEvento
}

const tipoInfo: Record<TipoEvento, { label: string; badge: 'cyan' | 'purple' | 'amber'; dot: string; icon: typeof Package }> = {
  entrega: { label: 'Entrega', badge: 'cyan', dot: 'bg-[#ECFEFF] text-[#0E7490]', icon: Package },
  manutencao: { label: 'Manutenção', badge: 'purple', dot: 'bg-[#F5F3FF] text-[#5B21B6]', icon: Wrench },
  reuniao: { label: 'Reunião', badge: 'amber', dot: 'bg-[#FFFBEB] text-[#92400E]', icon: Users }
}

const formVazio = { id: '', data: '', titulo: '', descricao: '', tipo: 'entrega' as TipoEvento }

export function Agenda() {
  const { data, loading, error, reload } = useApi<EventoApiRow[]>('/api/agenda', [])
  const [modalOpen, setModalOpen] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)
  const [form, setForm] = useState(formVazio)

  const usandoMock = !loading && (error || data.length === 0)
  const eventos = usandoMock ? eventosMock as (typeof eventosMock[number] & { tipo: TipoEvento })[] : data.map(e => ({ id: e.id, data: e.data, titulo: e.titulo, descricao: e.descricao ?? '', tipo: e.tipo }))

  function eventosNoDia(dia: number) {
    return eventos.filter(e => Number(e.data.split('-')[2]) === dia)
  }

  function abrirNovo() {
    setForm(formVazio)
    setModalOpen(true)
  }

  function abrirEdicao(ev: typeof eventos[number]) {
    setForm({ id: ev.id, data: ev.data, titulo: ev.titulo, descricao: ev.descricao, tipo: ev.tipo })
    setModalOpen(true)
  }

  async function handleSalvar(e: FormEvent) {
    e.preventDefault()
    if (!form.titulo.trim() || !form.data) return
    setSalvando(true)
    try {
      const payload = { data: form.data, titulo: form.titulo, descricao: form.descricao || null, tipo: form.tipo }
      if (form.id) await api.patch(`/api/agenda/${form.id}`, payload)
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
      await api.del(`/api/agenda/${id}`)
      setConfirmandoId(null)
      reload()
    } catch (err) {
      console.error('[Excluir] erro:', err)
      alert('Não deu pra excluir. Confere a conexão com o banco.')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-semibold m-0">Agenda</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-0.5">Prazos, manutenções e reuniões {usandoMock && '(dados de exemplo)'}</p>
        </div>
        <Button variant="gradient" onClick={abrirNovo}><Plus size={15} />Novo compromisso</Button>
      </div>

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
            const evs = eventosNoDia(dia)
            const isHoje = dia === HOJE
            return (
              <div
                key={i}
                className={`rounded-lg border p-1.5 text-xs font-bold min-h-[78px]
                ${isHoje ? 'border-[var(--primary)] border-[1.5px] bg-[var(--accent)]' : 'border-[var(--border)] bg-[var(--card)]'}`}
              >
                {dia}
                <div className="flex flex-col gap-1 mt-1.5">
                  {evs.map(e => (
                    <span key={e.id} className={`text-[10px] font-bold rounded px-1.5 py-0.5 truncate ${tipoInfo[e.tipo].dot}`}>
                      {e.titulo.replace(/^(Entrega|Manutenção|Reunião) — /, '')}
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
        {eventos.map((e, i) => {
          const info = tipoInfo[e.tipo]
          const Icon = info.icon
          return (
            <div key={e.id} className={`flex items-center gap-3 px-4 py-3 ${i < eventos.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>
              <div className="text-xs font-bold text-[var(--muted-foreground)] w-11 flex-shrink-0">
                {e.data.split('-').slice(1).reverse().join('/')}
              </div>
              <div className={`w-[34px] h-[34px] rounded-lg flex items-center justify-center flex-shrink-0 ${info.dot}`}>
                <Icon size={16} />
              </div>
              <div className="flex-1">
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
        <div className="grid grid-cols-2 gap-x-4">
          <div><Label>Data</Label><Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} /></div>
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
