import { useState, FormEvent } from 'react'
import { Plus, AlertTriangle, Trash2, Boxes, Banknote, TrendingUp, Pencil } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Money } from '@/components/ui/Money'
import { Modal } from '@/components/ui/Modal'
import { InlineConfirm } from '@/components/ui/InlineConfirm'
import { Label, Input, Select } from '@/components/ui/Input'
import { useApi } from '@/lib/useApi'
import { api } from '@/lib/api'
import { formatarDataBR } from '@/lib/date'
import { materiais as materiaisMock, produtosProntos as produtosMock } from '@/data/mockData'

interface MaterialApiRow { id: string; nome: string; preco_kg: string; estoque_g: string; capacidade_g: string; alerta_estoque_g: string | null; marca: string | null }
interface ProdutoApiRow { id: string; nome: string; material: string | null; quantidade: number; custo_unitario: string; preco_venda: string }
interface PerdaApiRow { id: string; peso_perdido_g: string; motivo: string | null; custo: string | null; data: string; material_id: string | null; material_nome: string | null }

function statusMaterial(pct: number, estoqueG?: number, alertaG?: number | null): { color: 'red' | 'amber' | 'green'; label: string; bar: string } {
  // Se você definiu um alerta em gramas, ele manda. Senão cai no percentual.
  if (alertaG && alertaG > 0 && estoqueG !== undefined) {
    if (estoqueG <= alertaG) return { color: 'red', label: 'Baixo', bar: 'var(--destructive)' }
    if (estoqueG <= alertaG * 2) return { color: 'amber', label: 'Médio', bar: '#F59E0B' }
    return { color: 'green', label: 'OK', bar: '#10B981' }
  }
  if (pct <= 25) return { color: 'red', label: 'Baixo', bar: 'var(--destructive)' }
  if (pct <= 50) return { color: 'amber', label: 'Médio', bar: '#F59E0B' }
  return { color: 'green', label: 'OK', bar: '#10B981' }
}

const formMaterialVazio = { id: '', nome: '', marca: '', preco_kg: '', estoque_g: '1000', capacidade_g: '1000', alerta_estoque_g: '' }
const formProdutoVazio = { id: '', nome: '', material: '', quantidade: '1', custo_unitario: '', preco_venda: '' }
const formPerdaVazio = { id: '', material_id: '', peso_perdido_g: '', motivo: '', custo: '', data: '' }

export function Estoque() {
  const [aba, setAba] = useState<'materia' | 'produtos'>('materia')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalPerdaOpen, setModalPerdaOpen] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)
  const [formMaterial, setFormMaterial] = useState(formMaterialVazio)
  const [formProduto, setFormProduto] = useState(formProdutoVazio)
  const [formPerda, setFormPerda] = useState(formPerdaVazio)

  const { data: matApi, loading: matLoading, error: matError, reload: reloadMat } = useApi<MaterialApiRow[]>('/api/materiais', [])
  const { data: prodApi, loading: prodLoading, error: prodError, reload: reloadProd } = useApi<ProdutoApiRow[]>('/api/produtos-prontos', [])
  const { data: perdasApi, loading: perdasLoading, error: perdasError, reload: reloadPerdas } = useApi<PerdaApiRow[]>('/api/perdas', [])

  const matMock = !matLoading && !!matError
  const matVazio = !matLoading && !matError && matApi.length === 0
  const materiais = matMock
    ? materiaisMock.map(m => ({ id: m.id, nome: m.nome, marca: '', estoqueG: m.estoqueG, capacidadeG: m.capacidadeG, precoKg: m.precoKg, alertaEstoqueG: null }))
    : matApi.map(m => ({ id: m.id, nome: m.nome, marca: m.marca ?? '', estoqueG: Number(m.estoque_g), capacidadeG: Number(m.capacidade_g), precoKg: Number(m.preco_kg), alertaEstoqueG: m.alerta_estoque_g ? Number(m.alerta_estoque_g) : null }))

  const prodMock = !prodLoading && !!prodError
  const prodVazio = !prodLoading && !prodError && prodApi.length === 0
  const produtos = prodMock
    ? produtosMock
    : prodApi.map(p => ({ id: p.id, nome: p.nome, material: p.material ?? '', quantidade: p.quantidade, custoUnitario: Number(p.custo_unitario), precoVenda: Number(p.preco_venda) }))

  const perdasMock = !perdasLoading && !!perdasError
  const perdasVazio = !perdasLoading && !perdasError && perdasApi.length === 0
  const perdas = perdasMock
    ? [
        { id: '1', data: '2026-07-06', materialId: '', material: 'PETG Preto', peso: 65, motivo: 'Descolou da mesa', custo: 6.17 },
        { id: '2', data: '2026-07-02', materialId: '', material: 'PLA Vermelho', peso: 30, motivo: 'Warping', custo: 2.4 }
      ]
    : perdasApi.map(p => ({ id: p.id, data: p.data, materialId: p.material_id ?? '', material: p.material_nome ?? '—', peso: Number(p.peso_perdido_g), motivo: p.motivo ?? '—', custo: Number(p.custo ?? 0) }))

  const baixos = materiais.filter(m => statusMaterial((m.estoqueG / m.capacidadeG) * 100, m.estoqueG, m.alertaEstoqueG).color === 'red')

  function abrirNovo() {
    if (aba === 'materia') setFormMaterial(formMaterialVazio)
    else setFormProduto(formProdutoVazio)
    setModalOpen(true)
  }
  function abrirEdicaoMaterial(m: typeof materiais[number]) {
    setFormMaterial({ id: m.id, nome: m.nome, marca: m.marca ?? '', preco_kg: String(m.precoKg).replace('.', ','), estoque_g: String(m.estoqueG), capacidade_g: String(m.capacidadeG), alerta_estoque_g: m.alertaEstoqueG ? String(m.alertaEstoqueG) : '' })
    setModalOpen(true)
  }
  function abrirEdicaoProduto(p: typeof produtos[number]) {
    setFormProduto({ id: p.id, nome: p.nome, material: p.material, quantidade: String(p.quantidade), custo_unitario: String(p.custoUnitario).replace('.', ','), preco_venda: String(p.precoVenda).replace('.', ',') })
    setModalOpen(true)
  }
  function abrirNovaPerda() {
    setFormPerda({ ...formPerdaVazio, material_id: materiais[0]?.id ?? '' })
    setModalPerdaOpen(true)
  }
  function abrirEdicaoPerda(p: typeof perdas[number]) {
    setFormPerda({ id: p.id, material_id: p.materialId, peso_perdido_g: String(p.peso), motivo: p.motivo === '—' ? '' : p.motivo, custo: String(p.custo).replace('.', ','), data: p.data.slice(0, 10) })
    setModalPerdaOpen(true)
  }

  async function handleSalvarMaterial(e: FormEvent) {
    e.preventDefault()
    if (!formMaterial.nome.trim()) return
    setSalvando(true)
    try {
      const payload = {
        nome: formMaterial.nome,
        marca: formMaterial.marca || null,
        preco_kg: Number(formMaterial.preco_kg.replace(',', '.')) || 0,
        estoque_g: Number(formMaterial.estoque_g) || 0,
        capacidade_g: Number(formMaterial.capacidade_g) || 1000,
        alerta_estoque_g: formMaterial.alerta_estoque_g ? Number(formMaterial.alerta_estoque_g) : null
      }
      if (formMaterial.id) await api.patch(`/api/materiais?id=${formMaterial.id}`, payload)
      else await api.post('/api/materiais', payload)
      setModalOpen(false)
      setFormMaterial(formMaterialVazio)
      reloadMat()
    } catch (err) {
      console.error('[Salvar] erro:', err)
      alert('Não deu pra salvar — confere se o banco (Neon) está conectado e as variáveis de ambiente configuradas.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleSalvarProduto(e: FormEvent) {
    e.preventDefault()
    if (!formProduto.nome.trim()) return
    setSalvando(true)
    try {
      const payload = {
        nome: formProduto.nome,
        material: formProduto.material || null,
        quantidade: Number(formProduto.quantidade) || 0,
        custo_unitario: Number(formProduto.custo_unitario.replace(',', '.')) || 0,
        preco_venda: Number(formProduto.preco_venda.replace(',', '.')) || 0
      }
      if (formProduto.id) await api.patch(`/api/produtos-prontos?id=${formProduto.id}`, payload)
      else await api.post('/api/produtos-prontos', payload)
      setModalOpen(false)
      setFormProduto(formProdutoVazio)
      reloadProd()
    } catch (err) {
      console.error('[Salvar] erro:', err)
      alert('Não deu pra salvar — confere se o banco (Neon) está conectado e as variáveis de ambiente configuradas.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleSalvarPerda(e: FormEvent) {
    e.preventDefault()
    if (!formPerda.material_id || !formPerda.peso_perdido_g) return
    setSalvando(true)
    try {
      const payload = {
        material_id: formPerda.material_id,
        peso_perdido_g: Number(formPerda.peso_perdido_g) || 0,
        motivo: formPerda.motivo || null,
        custo: Number(formPerda.custo.replace(',', '.')) || 0,
        data: formPerda.data || new Date().toISOString().slice(0, 10)
      }
      if (formPerda.id) await api.patch(`/api/perdas?id=${formPerda.id}`, payload)
      else await api.post('/api/perdas', payload)
      setModalPerdaOpen(false)
      setFormPerda(formPerdaVazio)
      reloadPerdas()
    } catch (err) {
      console.error('[Salvar] erro:', err)
      alert('Não deu pra salvar — confere se o banco (Neon) está conectado e as variáveis de ambiente configuradas.')
    } finally {
      setSalvando(false)
    }
  }

  async function excluirMaterial(id: string) {
    try { await api.del(`/api/materiais?id=${id}`); setConfirmandoId(null); reloadMat() }
    catch (err) { console.error('[Excluir] erro:', err); alert('Não deu pra excluir.') }
  }
  async function excluirProduto(id: string) {
    try { await api.del(`/api/produtos-prontos?id=${id}`); setConfirmandoId(null); reloadProd() }
    catch (err) { console.error('[Excluir] erro:', err); alert('Não deu pra excluir.') }
  }
  async function excluirPerda(id: string) {
    try { await api.del(`/api/perdas?id=${id}`); setConfirmandoId(null); reloadPerdas() }
    catch (err) { console.error('[Excluir] erro:', err); alert('Não deu pra excluir.') }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-semibold m-0">Estoque</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-0.5">Matéria-prima e produtos prontos</p>
        </div>
        <Button variant="gradient" onClick={abrirNovo}>
          <Plus size={15} />{aba === 'materia' ? 'Novo material' : 'Novo produto pronto'}
        </Button>
      </div>

      <div className="mb-4 flex gap-2">
        {(['materia', 'produtos'] as const).map(tab => (
          <span
            key={tab}
            onClick={() => setAba(tab)}
            className={`inline-flex px-4 py-1.5 rounded-full text-[13px] font-semibold cursor-pointer border
            ${aba === tab ? 'bg-[var(--accent)] text-[var(--primary)] border-[var(--primary)]' : 'bg-[var(--muted)] text-[var(--muted-foreground)] border-transparent'}`}
          >
            {tab === 'materia' ? 'Matéria-prima' : 'Produtos prontos'}
          </span>
        ))}
      </div>

      {aba === 'materia' && (
        <>
          {baixos.length > 0 && (
            <div className="bg-[#FEF2F2] border border-red-300 text-[#991B1B] rounded-lg px-3.5 py-2.5 text-sm font-semibold flex items-center gap-2 mb-4">
              <AlertTriangle size={16} /> {baixos.length} materiais com estoque baixo — repor em breve
            </div>
          )}
          {matVazio ? (
            <Card><div className="text-center py-6 text-sm text-[var(--muted-foreground)]">Nenhum material cadastrado ainda. Clica em "Novo material" pra começar.</div></Card>
          ) : (
          <div className="flex gap-4 flex-wrap">
            {materiais.map(m => {
              const pct = (m.estoqueG / m.capacidadeG) * 100
              const s = statusMaterial(pct, m.estoqueG, m.alertaEstoqueG)
              return (
                <Card key={m.id} className="flex-1 min-w-[220px]">
                  <div className="flex justify-between items-start">
                    <div>
                      <b className="text-sm">{m.nome}</b>
                      {m.marca && <div className="text-[11px] text-[var(--muted-foreground)]">{m.marca}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color={s.color}>{s.label}</Badge>
                      {!matMock && confirmandoId !== m.id && (
                        <div className="flex gap-1">
                          <button onClick={() => abrirEdicaoMaterial(m)} className="w-6 h-6 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)]"><Pencil size={12} /></button>
                          <button onClick={() => setConfirmandoId(m.id)} className="w-6 h-6 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-600"><Trash2 size={12} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                  {confirmandoId === m.id ? (
                    <div className="mt-2"><InlineConfirm onCancel={() => setConfirmandoId(null)} onConfirm={() => excluirMaterial(m.id)} /></div>
                  ) : (
                    <>
                      <div className="text-xs text-[var(--muted-foreground)] mt-1">{m.estoqueG}g restantes de {m.capacidadeG / 1000}kg</div>
                      <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden mt-1.5">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.bar }} />
                      </div>
                    </>
                  )}
                </Card>
              )
            })}
          </div>
          )}

          <h2 className="text-[1.05rem] font-semibold mt-6 mb-3">Perdas / falhas de impressão</h2>
          <Card className="p-0">
            {perdasVazio ? (
              <div className="text-center py-8 text-sm text-[var(--muted-foreground)]">Nenhuma perda registrada ainda.</div>
            ) : (
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr>
                  <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Data</th>
                  <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Material</th>
                  <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Peso perdido</th>
                  <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Motivo</th>
                  <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Custo</th>
                  <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]"></th>
                </tr>
              </thead>
              <tbody>
                {perdas.map((p, i) => {
                  const last = i === perdas.length - 1
                  return (
                    <tr key={p.id}>
                      <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>{formatarDataBR(p.data)}</td>
                      <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>{p.material}</td>
                      <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>{p.peso}g</td>
                      <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>{p.motivo}</td>
                      <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}><Money value={p.custo} /></td>
                      <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>
                        {confirmandoId === p.id ? (
                          <InlineConfirm onCancel={() => setConfirmandoId(null)} onConfirm={() => excluirPerda(p.id)} />
                        ) : !perdasMock && (
                          <div className="flex gap-1">
                            <button onClick={() => abrirEdicaoPerda(p)} className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)]"><Pencil size={13} /></button>
                            <button onClick={() => setConfirmandoId(p.id)} className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
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
          <Button variant="ghost" className="mt-2.5" onClick={abrirNovaPerda}><Trash2 size={14} />Registrar perda</Button>
        </>
      )}

      {aba === 'produtos' && (
        <>
          <div className="flex gap-4 flex-wrap">
            <Card className="flex-1 min-w-[190px]">
              <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><Boxes size={14} />Peças em estoque</div>
              <div className="text-2xl font-extrabold">{produtos.reduce((s, p) => s + p.quantidade, 0)}</div>
            </Card>
            <Card className="flex-1 min-w-[190px]">
              <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><Banknote size={14} />Valor parado (custo)</div>
              <div className="text-2xl font-extrabold"><Money value={produtos.reduce((s, p) => s + p.custoUnitario * p.quantidade, 0)} /></div>
            </Card>
            <Card className="flex-1 min-w-[190px]">
              <div className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5 mb-2"><TrendingUp size={14} />Valor de venda potencial</div>
              <div className="text-2xl font-extrabold"><Money value={produtos.reduce((s, p) => s + p.precoVenda * p.quantidade, 0)} /></div>
            </Card>
          </div>

          <h2 className="text-[1.05rem] font-semibold mt-6 mb-3">Produtos prontos pra vender</h2>
          <Card className="p-0">
            {prodVazio ? (
              <div className="text-center py-8 text-sm text-[var(--muted-foreground)]">Nenhum produto pronto cadastrado ainda.</div>
            ) : (
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr>
                  <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Produto</th>
                  <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Material</th>
                  <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Qtd</th>
                  <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Custo/un.</th>
                  <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Preço venda</th>
                  <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]"></th>
                  <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]"></th>
                </tr>
              </thead>
              <tbody>
                {produtos.map((p, i) => {
                  const last = i === produtos.length - 1
                  return (
                    <tr key={p.id}>
                      <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>{p.nome}</td>
                      <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>{p.material}</td>
                      <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>{p.quantidade}</td>
                      <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}><Money value={p.custoUnitario} /></td>
                      <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}><Money value={p.precoVenda} /></td>
                      <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>
                        <Badge color={p.quantidade <= 1 ? 'amber' : 'green'}>{p.quantidade <= 1 ? 'Última unidade' : 'Disponível'}</Badge>
                      </td>
                      <td className={`px-2.5 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>
                        {confirmandoId === p.id ? (
                          <InlineConfirm onCancel={() => setConfirmandoId(null)} onConfirm={() => excluirProduto(p.id)} />
                        ) : !prodMock && (
                          <div className="flex gap-1">
                            <button onClick={() => abrirEdicaoProduto(p)} className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)]"><Pencil size={13} /></button>
                            <button onClick={() => setConfirmandoId(p.id)} className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
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
          <div className="text-center py-6 text-[var(--muted-foreground)] text-[13px]">
            Produto vendido some daqui automaticamente quando o pedido é marcado como Entregue.
          </div>
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          aba === 'materia'
            ? (formMaterial.id ? 'Editar material' : 'Novo material')
            : (formProduto.id ? 'Editar produto' : 'Novo produto pronto')
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="gradient" disabled={salvando} onClick={aba === 'materia' ? handleSalvarMaterial : handleSalvarProduto}>
              <Plus size={15} />{salvando ? 'Salvando...' : 'Salvar'}
            </Button>
          </>
        }
      >
        {aba === 'materia' ? (
          <>
            <div className="grid grid-cols-2 gap-x-4">
              <div><Label>Nome do material</Label><Input placeholder="Ex: PLA Azul" value={formMaterial.nome} onChange={e => setFormMaterial(f => ({ ...f, nome: e.target.value }))} /></div>
              <div><Label>Marca (opcional)</Label><Input placeholder="Ex: Voolt3D" value={formMaterial.marca} onChange={e => setFormMaterial(f => ({ ...f, marca: e.target.value }))} /></div>
            </div>
            <Label>Preço por kg (R$)</Label>
            <Input placeholder="79,90" value={formMaterial.preco_kg} onChange={e => setFormMaterial(f => ({ ...f, preco_kg: e.target.value }))} />
            <div className="grid grid-cols-2 gap-x-4">
              <div><Label>Estoque atual (g)</Label><Input value={formMaterial.estoque_g} onChange={e => setFormMaterial(f => ({ ...f, estoque_g: e.target.value }))} /></div>
              <div><Label>Capacidade do rolo (g)</Label><Input value={formMaterial.capacidade_g} onChange={e => setFormMaterial(f => ({ ...f, capacidade_g: e.target.value }))} /></div>
            </div>
            <Label>Alerta de estoque baixo (g)</Label>
            <Input placeholder="Ex: 100" value={formMaterial.alerta_estoque_g} onChange={e => setFormMaterial(f => ({ ...f, alerta_estoque_g: e.target.value }))} />
            <div className="text-[11px] text-[var(--muted-foreground)] -mt-2 mb-3">
              Te avisa quando sobrar essa quantidade ou menos. Deixa vazio pra usar o padrão de 25% do rolo.
            </div>
          </>
        ) : (
          <>
            <Label>Nome do produto</Label>
            <Input placeholder="Ex: Suporte de celular" value={formProduto.nome} onChange={e => setFormProduto(f => ({ ...f, nome: e.target.value }))} />
            <Label>Material</Label>
            <Select value={formProduto.material} onChange={e => setFormProduto(f => ({ ...f, material: e.target.value }))}>
              <option value="">Selecione...</option>
              {materiais.map(m => <option key={m.id} value={m.nome}>{m.nome}</option>)}
            </Select>
            <div className="grid grid-cols-2 gap-x-4">
              <div><Label>Quantidade</Label><Input value={formProduto.quantidade} onChange={e => setFormProduto(f => ({ ...f, quantidade: e.target.value }))} /></div>
              <div><Label>Custo unitário (R$)</Label><Input placeholder="0,00" value={formProduto.custo_unitario} onChange={e => setFormProduto(f => ({ ...f, custo_unitario: e.target.value }))} /></div>
            </div>
            <Label>Preço de venda (R$)</Label>
            <Input placeholder="0,00" value={formProduto.preco_venda} onChange={e => setFormProduto(f => ({ ...f, preco_venda: e.target.value }))} />
          </>
        )}
      </Modal>

      <Modal
        open={modalPerdaOpen}
        onClose={() => setModalPerdaOpen(false)}
        title={formPerda.id ? 'Editar perda' : 'Registrar perda'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalPerdaOpen(false)}>Cancelar</Button>
            <Button variant="gradient" disabled={salvando} onClick={handleSalvarPerda}>
              <Plus size={15} />{salvando ? 'Salvando...' : 'Salvar'}
            </Button>
          </>
        }
      >
        <Label>Material</Label>
        <Select
          value={formPerda.material_id}
          onChange={e => {
            const materialId = e.target.value
            const precoKg = materiais.find(m => m.id === materialId)?.precoKg ?? 0
            const pesoG = Number(formPerda.peso_perdido_g.replace(',', '.')) || 0
            const custoCalc = (pesoG / 1000) * precoKg
            setFormPerda(f => ({ ...f, material_id: materialId, custo: custoCalc ? custoCalc.toFixed(2).replace('.', ',') : f.custo }))
          }}
        >
          {materiais.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </Select>
        <div className="grid grid-cols-2 gap-x-4">
          <div>
            <Label>Peso perdido (g)</Label>
            <Input
              value={formPerda.peso_perdido_g}
              onChange={e => {
                const pesoStr = e.target.value
                const precoKg = materiais.find(m => m.id === formPerda.material_id)?.precoKg ?? 0
                const pesoG = Number(pesoStr.replace(',', '.')) || 0
                const custoCalc = (pesoG / 1000) * precoKg
                setFormPerda(f => ({ ...f, peso_perdido_g: pesoStr, custo: custoCalc ? custoCalc.toFixed(2).replace('.', ',') : f.custo }))
              }}
            />
          </div>
          <div>
            <Label>Custo (R$)</Label>
            <Input placeholder="0,00" value={formPerda.custo} onChange={e => setFormPerda(f => ({ ...f, custo: e.target.value }))} />
            <div className="text-[11px] text-[var(--muted-foreground)] -mt-2">Calculado automático — pode ajustar se quiser.</div>
          </div>
        </div>
        <Label>Motivo</Label>
        <Input placeholder="Ex: Descolou da mesa, warping..." value={formPerda.motivo} onChange={e => setFormPerda(f => ({ ...f, motivo: e.target.value }))} />
        <Label>Data</Label>
        <Input type="date" value={formPerda.data} onChange={e => setFormPerda(f => ({ ...f, data: e.target.value }))} />
      </Modal>
    </div>
  )
}
