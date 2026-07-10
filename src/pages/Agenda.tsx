import { useState, FormEvent } from 'react'
import { Package, Wrench, Plus } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Label, Input, Select } from '@/components/ui/Input'
import { useApi } from '@/lib/useApi'
import { api } from '@/lib/api'
import { eventosAgenda as eventosMock } from '@/data/mockData'

// Julho de 2026 — domingo como primeiro dia da semana
const semanas = [
  [0, 0, 0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9, 10, 11],
  [12, 13, 14, 15, 16, 17, 18],
  [19, 20, 21, 22, 23, 24, 25],
  [26, 27, 28, 29, 30, 31, 0]
]

const HOJE = 10

interface EventoApiRow {
  id: string
  data: string
  titulo: string
  descricao: string | null
  tipo: 'entrega' | 'manutencao'
}

export function Agenda() {
  const { data, loading, error, reload } = useApi<EventoApiRow[]>('/api/agenda', [])
  const [modalOpen, setModalOpen] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({ data: '', titulo: '', descricao: '', tipo: 'entrega' })

  const usandoMock = !loading && (error || data.length === 0)
  const eventos = usandoMock ? eventosMock : data.map(e => ({ id: e.id, data: e.data, titulo: e.titulo, descricao: e.descricao ?? '', tipo: e.tipo }))

  function eventosNoDia(dia: number) {
    return eventos.filter(e => Number(e.data.split('-')[2]) === dia)
  }

  async function handleSalvar(e: FormEvent) {
    e.preventDefault()
    if (!form.titulo.trim() || !form.data) return
    setSalvando(true)
    try {
      await api.post('/api/agenda', {
        data: form.data,
        titulo: form.titulo,
        descricao: form.descricao || null,
        tipo: form.tipo
      })
      setModalOpen(false)
      setForm({ data: '', titulo: '', descricao: '', tipo: 'entrega' })
      reload()
    } catch {
      alert('Não deu pra salvar — confere se o banco (Neon) está conectado e as variáveis de ambiente configuradas.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-semibold m-0">Agenda</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-0.5">Prazos de entrega, manutenções e compromissos {usandoMock && '(dados de exemplo)'}</p>
        </div>
        <Button variant="gradient" onClick={() => setModalOpen(true)}><Plus size={15} />Novo compromisso</Button>
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
        {eventos.map((e, i) => (
          <div
            key={e.id}
            className={`flex items-center gap-3 px-4 py-3 ${i < eventos.length - 1 ? 'border-b border-[var(--border)]' : ''}`}
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Novo compromisso"
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
            <Select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
              <option value="entrega">Entrega</option>
              <option value="manutencao">Manutenção</option>
            </Select>
          </div>
        </div>
        <Label>Descrição</Label>
        <Input placeholder="Detalhe opcional" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
      </Modal>
    </div>
  )
}
