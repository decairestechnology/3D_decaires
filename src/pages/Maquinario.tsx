import { useState, FormEvent } from 'react'
import { Plus, Wrench, Banknote, AlertTriangle, Pencil, Trash2, CalendarPlus, TrendingDown } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Money, formatMoney } from '@/components/ui/Money'
import { Modal } from '@/components/ui/Modal'
import { InlineConfirm } from '@/components/ui/InlineConfirm'
import { Label, Input, Select } from '@/components/ui/Input'
import { useApi } from '@/lib/useApi'
import { api } from '@/lib/api'
import { equipamentos as equipamentosMock } from '@/data/mockData'
import { formatarDataBR, mesAno, soData } from '@/lib/date'

interface EquipamentoApiRow {
  id: string; nome: string; tipo: 'impressora' | 'ferramenta'; valor: string; aquisicao: string; status: string; vida_util_anos: number; potencia_w: string | null
}
interface AgendaApiRow { id: string; data: string; titulo: string; tipo: string; equipamento_id: string | null }
interface EquipamentoUI { id: string; nome: string; tipo: 'impressora' | 'ferramenta'; valor: number; aquisicao: string; status: string; vidaUtilAnos: number }

function badgeColor(status: string): 'green' | 'amber' | 'gray' {
  if (status.toLowerCase().includes('funcionando') || status === 'OK') return 'green'
  if (status.toLowerCase().includes('pendente')) return 'amber'
  return 'gray'
}

function calcularDepreciacao(valor: number, aquisicao: string | null, vidaUtilAnos: number) {
  if (!aquisicao || !valor) return { pctDepreciado: 0, valorAtual: valor }
  const meses = (Date.now() - new Date(soData(aquisicao)).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  const mesesTotais = vidaUtilAnos * 12
  const pctDepreciado = Math.min(Math.max(meses / mesesTotais, 0), 1)
  return { pctDepreciado: Math.round(pctDepreciado * 100), valorAtual: valor * (1 - pctDepreciado) }
}

const formVazio = { id: '', nome: '', tipo: 'impressora', valor: '', aquisicao: '', status: 'OK', vida_util_anos: '3', potencia_w: '' }
const formManutencaoVazio = { data: '', horario: '' }

export function Maquinario() {
  const { data, loading, error, reload } = useApi<EquipamentoApiRow[]>('/api/equipamentos', [])
  const { data: agendaData, reload: reloadAgenda } = useApi<AgendaApiRow[]>('/api/agenda', [])
  const [modalOpen, setModalOpen] = useState(false)
  const [modalManutencao, setModalManutencao] = useState<EquipamentoUI | null>(null)
  const [formManutencao, setFormManutencao] = useState(formManutencaoVazio)
  const [salvando, setSalvando] = useState(false)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)
  const [form, setForm] = useState(formVazio)

  const usandoMock = !loading && !!error
  const vazio = !loading && !error && data.length === 0
  const equipamentos = usandoMock
    ? equipamentosMock.map(e => ({ ...e, vidaUtilAnos: 3, potenciaW: null as string | null }))
    : data.map(e => ({ id: e.id, nome: e.nome, tipo: e.tipo, valor: Number(e.valor), aquisicao: e.aquisicao, status: e.status, vidaUtilAnos: e.vida_util_anos ?? 3, potenciaW: e.potencia_w }))

  const impressoras = equipamentos.filter(e => e.tipo === 'impressora')
  const ferramentas = equipamentos.filter(e => e.tipo === 'ferramenta')
  const totalInvestido = equipamentos.reduce((s, e) => s + e.valor, 0)
  const pendentes = equipamentos.filter(e => e.status.toLowerCase().includes('pendente') || e.status.toLowerCase().includes('desgast'))

  function proximaManutencao(equipamentoId: string) {
    const hoje = soData(new Date().toISOString())
    return agendaData
      .filter(a => a.equipamento_id === equipamentoId && a.tipo === 'manutencao' && soData(a.data) >= hoje)
      .sort((a, b) => soData(a.data).localeCompare(soData(b.data)))[0]
  }

  function abrirNovo() { setForm(formVazio); setModalOpen(true) }
  function abrirEdicao(e: typeof equipamentos[number]) {
    setForm({ id: e.id, nome: e.nome, tipo: e.tipo, valor: String(e.valor).replace('.', ','), aquisicao: e.aquisicao?.slice(0, 10) ?? '', status: e.status, vida_util_anos: String(e.vidaUtilAnos), potencia_w: e.potenciaW ?? '' })
    setModalOpen(true)
  }

  async function handleSalvar(e: FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) return
    setSalvando(true)
    try {
      const payload = {
        nome: form.nome, tipo: form.tipo, valor: Number(form.valor.replace(',', '.')) || 0,
        aquisicao: form.aquisicao || null, status: form.status, vida_util_anos: Number(form.vida_util_anos) || 3,
        potencia_w: form.potencia_w ? Number(form.potencia_w.replace(',', '.')) : null
      }
      if (form.id) await api.patch(`/api/equipamentos?id=${form.id}`, payload)
      else await api.post('/api/equipamentos', payload)
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
      await api.del(`/api/equipamentos?id=${id}`)
      setConfirmandoId(null)
      reload()
    } catch (err) {
      console.error('[Excluir] erro:', err)
      alert('Não deu pra excluir. Confere a conexão com o banco.')
    }
  }

  async function agendarManutencao(e: FormEvent) {
    e.preventDefault()
    if (!modalManutencao || !formManutencao.data) return
    setSalvando(true)
    try {
      await api.post('/api/agenda', {
        data: formManutencao.data,
        horario: formManutencao.horario || null,
        titulo: `Manutenção — ${modalManutencao.nome}`,
        descricao: null,
        tipo: 'manutencao',
        equipamento_id: modalManutencao.id
      })
      setModalManutencao(null)
      setFormManutencao(formManutencaoVazio)
      reloadAgenda()
      alert('Manutenção agendada! Aparece na Agenda também.')
    } catch (err) {
      console.error('[Agendar manutenção] erro:', err)
      alert('Não deu pra agendar. Confere a conexão com o banco.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-semibold m-0">Maquinário e ferramentas</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-0.5">Seus equipamentos, valor investido e manutenção {usandoMock && '(sem conexão com o banco)'}</p>
        </div>
        <Button variant="gradient" onClick={abrirNovo}><Plus size={15} />Novo equipamento</Button>
      </div>

      <div className="flex gap-4 flex-wrap">
        <Card className="flex-1 min-w-[190px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><Wrench size={14} />Equipamentos ativos</div>
          <div className="text-2xl font-extrabold">{equipamentos.length}</div>
        </Card>
        <Card className="flex-1 min-w-[190px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><Banknote size={14} />Total investido</div>
          <div className="text-2xl font-extrabold"><Money value={totalInvestido} /></div>
        </Card>
        <Card className="flex-1 min-w-[190px]">
          <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><AlertTriangle size={14} />Manutenção pendente</div>
          <div className="text-2xl font-extrabold">{pendentes.length} {pendentes.length === 1 ? 'item' : 'itens'}</div>
        </Card>
      </div>

      <h2 className="text-[1.05rem] font-semibold mt-6 mb-3">Impressoras</h2>
      {vazio || impressoras.length === 0 ? (
        <Card><div className="text-center py-6 text-sm text-[var(--muted-foreground)]">Nenhuma impressora cadastrada ainda.</div></Card>
      ) : (
      <div className="flex gap-4 flex-wrap">
        {impressoras.map(e => {
          const dep = calcularDepreciacao(e.valor, e.aquisicao, e.vidaUtilAnos)
          const proxima = proximaManutencao(e.id)
          return (
            <Card key={e.id} className="flex-1 min-w-[270px]">
              <div className="flex justify-between items-start">
                <b className="text-sm">{e.nome}</b>
                <div className="flex items-center gap-2">
                  <Badge color={badgeColor(e.status)}>{e.status}</Badge>
                  {confirmandoId === e.id ? null : !usandoMock && (
                    <div className="flex gap-1">
                      <button onClick={() => abrirEdicao(e)} className="w-6 h-6 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)]"><Pencil size={12} /></button>
                      <button onClick={() => setConfirmandoId(e.id)} className="w-6 h-6 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-600"><Trash2 size={12} /></button>
                    </div>
                  )}
                </div>
              </div>
              {confirmandoId === e.id && <div className="mt-2"><InlineConfirm onCancel={() => setConfirmandoId(null)} onConfirm={() => excluir(e.id)} /></div>}
              <div className="text-xs text-[var(--muted-foreground)] mt-1.5">
                Comprada em {e.aquisicao ? formatarDataBR(e.aquisicao) : '—'} · <Money value={e.valor} />
              </div>

              <div className="bg-[var(--muted)] rounded-lg p-2.5 mt-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-[var(--muted-foreground)]"><TrendingDown size={12} />Depreciação ({e.vidaUtilAnos} anos)</span>
                  <span className="font-bold">{dep.pctDepreciado}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden mt-1.5">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${dep.pctDepreciado}%` }} />
                </div>
                <div className="text-xs text-[var(--muted-foreground)] mt-1">Valor estimado hoje: {formatMoney(dep.valorAtual)}</div>
              </div>

              <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-[var(--border)]">
                {proxima ? (
                  <span className="text-xs text-[var(--muted-foreground)]">Próxima manutenção: <b className="text-[var(--foreground)]">{formatarDataBR(proxima.data)}</b></span>
                ) : (
                  <span className="text-xs text-[var(--muted-foreground)]">Sem manutenção agendada</span>
                )}
                {!usandoMock && (
                  <button onClick={() => setModalManutencao(e)} className="text-xs font-semibold text-[var(--primary)] flex items-center gap-1">
                    <CalendarPlus size={13} />Agendar
                  </button>
                )}
              </div>
            </Card>
          )
        })}
      </div>
      )}

      <h2 className="text-[1.05rem] font-semibold mt-6 mb-3">Ferramentas</h2>
      <Card className="p-0">
        {vazio || ferramentas.length === 0 ? (
          <div className="text-center py-6 text-sm text-[var(--muted-foreground)]">Nenhuma ferramenta cadastrada ainda.</div>
        ) : (
        <table className="w-full border-collapse text-[13.5px]">
          <thead>
            <tr>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Item</th>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Valor</th>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Aquisição</th>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Status</th>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]"></th>
            </tr>
          </thead>
          <tbody>
            {ferramentas.map((e, i) => {
              const last = i === ferramentas.length - 1
              return (
                <tr key={e.id}>
                  <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>{e.nome}</td>
                  <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}><Money value={e.valor} /></td>
                  <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>{e.aquisicao ? mesAno(e.aquisicao).split('-').reverse().join('/') : '—'}</td>
                  <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}><Badge color={badgeColor(e.status)}>{e.status}</Badge></td>
                  <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>
                    {confirmandoId === e.id ? (
                      <InlineConfirm onCancel={() => setConfirmandoId(null)} onConfirm={() => excluir(e.id)} />
                    ) : !usandoMock && (
                      <div className="flex gap-1">
                        <button onClick={() => abrirEdicao(e)} className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)]"><Pencil size={13} /></button>
                        <button onClick={() => setConfirmandoId(e.id)} className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Editar equipamento' : 'Novo equipamento'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="gradient" disabled={salvando} onClick={handleSalvar}><Plus size={15} />{salvando ? 'Salvando...' : 'Salvar'}</Button>
          </>
        }
      >
        <Label>Nome</Label>
        <Input placeholder="Ex: Bambu Lab A1 ou Espátula" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
        <div className="grid grid-cols-2 gap-x-4">
          <div>
            <Label>Tipo</Label>
            <Select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
              <option value="impressora">Impressora</option>
              <option value="ferramenta">Ferramenta</option>
            </Select>
          </div>
          <div><Label>Valor (R$)</Label><Input placeholder="0,00" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} /></div>
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          <div><Label>Data de aquisição</Label><Input type="date" value={form.aquisicao} onChange={e => setForm(f => ({ ...f, aquisicao: e.target.value }))} /></div>
          <div><Label>Vida útil (anos)</Label><Input placeholder="3" value={form.vida_util_anos} onChange={e => setForm(f => ({ ...f, vida_util_anos: e.target.value }))} /></div>
        </div>
        {form.tipo === 'impressora' && (
          <>
            <Label>Potência média imprimindo (W)</Label>
            <Input placeholder="120" value={form.potencia_w} onChange={e => setForm(f => ({ ...f, potencia_w: e.target.value }))} />
            <div className="text-[11px] text-[var(--muted-foreground)] -mt-2 mb-3">
              Mede com medidor de tomada durante uma impressão de verdade. Parada, a impressora consome bem menos e o cálculo fica irreal.
            </div>
          </>
        )}
        <Label>Status</Label>
        <Input placeholder="OK" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} />
      </Modal>

      <Modal
        open={!!modalManutencao}
        onClose={() => setModalManutencao(null)}
        title={`Agendar manutenção — ${modalManutencao?.nome ?? ''}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalManutencao(null)}>Cancelar</Button>
            <Button variant="gradient" disabled={salvando} onClick={agendarManutencao}><CalendarPlus size={15} />{salvando ? 'Agendando...' : 'Agendar'}</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-x-4">
          <div><Label>Data</Label><Input type="date" value={formManutencao.data} onChange={e => setFormManutencao(f => ({ ...f, data: e.target.value }))} /></div>
          <div><Label>Horário (opcional)</Label><Input type="time" value={formManutencao.horario} onChange={e => setFormManutencao(f => ({ ...f, horario: e.target.value }))} /></div>
        </div>
        <div className="text-xs text-[var(--muted-foreground)]">Isso cria um compromisso do tipo "Manutenção" na sua Agenda automaticamente.</div>
      </Modal>
    </div>
  )
}
