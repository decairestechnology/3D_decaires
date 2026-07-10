import { useState, FormEvent } from 'react'
import { Plus, AlertTriangle, Trash2, Boxes, Banknote, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Money } from '@/components/ui/Money'
import { Modal } from '@/components/ui/Modal'
import { Label, Input, Select } from '@/components/ui/Input'
import { useApi } from '@/lib/useApi'
import { api } from '@/lib/api'
import { materiais as materiaisMock, produtosProntos as produtosMock } from '@/data/mockData'

interface MaterialApiRow { id: string; nome: string; preco_kg: string; estoque_g: string; capacidade_g: string }
interface ProdutoApiRow { id: string; nome: string; material: string | null; quantidade: number; custo_unitario: string; preco_venda: string }
interface PerdaApiRow { id: string; peso_perdido_g: string; motivo: string | null; custo: string | null; data: string; material_nome: string | null }

function statusMaterial(pct: number): { color: 'red' | 'amber' | 'green'; label: string; bar: string } {
  if (pct <= 20) return { color: 'red', label: 'Baixo', bar: 'var(--destructive)' }
  if (pct <= 50) return { color: 'amber', label: 'Médio', bar: '#F59E0B' }
  return { color: 'green', label: 'OK', bar: '#10B981' }
}

export function Estoque() {
  const [aba, setAba] = useState<'materia' | 'produtos'>('materia')
  const [modalOpen, setModalOpen] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [formMaterial, setFormMaterial] = useState({ nome: '', preco_kg: '', estoque_g: '1000', capacidade_g: '1000' })
  const [formProduto, setFormProduto] = useState({ nome: '', material: '', quantidade: '1', custo_unitario: '', preco_venda: '' })

  const { data: matApi, loading: matLoading, error: matError, reload: reloadMat } = useApi<MaterialApiRow[]>('/api/materiais', [])
  const { data: prodApi, loading: prodLoading, error: prodError, reload: reloadProd } = useApi<ProdutoApiRow[]>('/api/produtos-prontos', [])
  const { data: perdasApi } = useApi<PerdaApiRow[]>('/api/perdas', [])

  const materiais = (!matLoading && (matError || matApi.length === 0))
    ? materiaisMock.map(m => ({ id: m.id, nome: m.nome, estoqueG: m.estoqueG, capacidadeG: m.capacidadeG }))
    : matApi.map(m => ({ id: m.id, nome: m.nome, estoqueG: Number(m.estoque_g), capacidadeG: Number(m.capacidade_g) }))

  const produtos = (!prodLoading && (prodError || prodApi.length === 0))
    ? produtosMock
    : prodApi.map(p => ({ id: p.id, nome: p.nome, material: p.material ?? '', quantidade: p.quantidade, custoUnitario: Number(p.custo_unitario), precoVenda: Number(p.preco_venda) }))

  const perdas = perdasApi.length > 0
    ? perdasApi.map(p => ({ id: p.id, data: p.data, material: p.material_nome ?? '—', peso: Number(p.peso_perdido_g), motivo: p.motivo ?? '—', custo: Number(p.custo ?? 0) }))
    : [
        { id: '1', data: '2026-07-06', material: 'PETG Preto', peso: 65, motivo: 'Descolou da mesa', custo: 6.17 },
        { id: '2', data: '2026-07-02', material: 'PLA Vermelho', peso: 30, motivo: 'Warping', custo: 2.4 }
      ]

  const baixos = materiais.filter(m => (m.estoqueG / m.capacidadeG) * 100 <= 20)

  async function handleSalvarMaterial(e: FormEvent) {
    e.preventDefault()
    if (!formMaterial.nome.trim()) return
    setSalvando(true)
    try {
      await api.post('/api/materiais', {
        nome: formMaterial.nome,
        preco_kg: Number(formMaterial.preco_kg.replace(',', '.')) || 0,
        estoque_g: Number(formMaterial.estoque_g) || 0,
        capacidade_g: Number(formMaterial.capacidade_g) || 1000
      })
      setModalOpen(false)
      setFormMaterial({ nome: '', preco_kg: '', estoque_g: '1000', capacidade_g: '1000' })
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
      await api.post('/api/produtos-prontos', {
        nome: formProduto.nome,
        material: formProduto.material || null,
        quantidade: Number(formProduto.quantidade) || 0,
        custo_unitario: Number(formProduto.custo_unitario.replace(',', '.')) || 0,
        preco_venda: Number(formProduto.preco_venda.replace(',', '.')) || 0
      })
      setModalOpen(false)
      setFormProduto({ nome: '', material: '', quantidade: '1', custo_unitario: '', preco_venda: '' })
      reloadProd()
    } catch (err) {
      console.error('[Salvar] erro:', err)
      alert('Não deu pra salvar — confere se o banco (Neon) está conectado e as variáveis de ambiente configuradas.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3.5">
        <div>
          <h1 className="text-2xl font-semibold m-0">Estoque</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-0.5">Matéria-prima e produtos prontos</p>
        </div>
        <Button variant="gradient" onClick={() => setModalOpen(true)}>
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
          <div className="flex gap-4 flex-wrap">
            {materiais.map(m => {
              const pct = (m.estoqueG / m.capacidadeG) * 100
              const s = statusMaterial(pct)
              return (
                <Card key={m.id} className="flex-1 min-w-[220px]">
                  <div className="flex justify-between">
                    <b className="text-sm">{m.nome}</b>
                    <Badge color={s.color}>{s.label}</Badge>
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-1">{m.estoqueG}g restantes de {m.capacidadeG / 1000}kg</div>
                  <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden mt-1.5">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.bar }} />
                  </div>
                </Card>
              )
            })}
          </div>

          <h2 className="text-[1.05rem] font-semibold mt-7 mb-3">Perdas / falhas de impressão</h2>
          <Card className="p-0">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr>
                  <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Data</th>
                  <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Material</th>
                  <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Peso perdido</th>
                  <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Motivo</th>
                  <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Custo</th>
                </tr>
              </thead>
              <tbody>
                {perdas.map((p, i) => (
                  <tr key={p.id}>
                    <td className={`px-2.5 py-2.5 ${i < perdas.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>{p.data.split('-').reverse().join('/')}</td>
                    <td className={`px-2.5 py-2.5 ${i < perdas.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>{p.material}</td>
                    <td className={`px-2.5 py-2.5 ${i < perdas.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>{p.peso}g</td>
                    <td className={`px-2.5 py-2.5 ${i < perdas.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>{p.motivo}</td>
                    <td className={`px-2.5 py-2.5 ${i < perdas.length - 1 ? 'border-b border-[var(--border)]' : ''}`}><Money value={p.custo} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Button variant="ghost" className="mt-2.5"><Trash2 size={14} />Registrar perda</Button>
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

          <h2 className="text-[1.05rem] font-semibold mt-7 mb-3">Produtos prontos pra vender</h2>
          <Card className="p-0">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr>
                  <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Produto</th>
                  <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Material</th>
                  <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Qtd</th>
                  <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Custo/un.</th>
                  <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Preço venda</th>
                  <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]"></th>
                </tr>
              </thead>
              <tbody>
                {produtos.map((p, i) => (
                  <tr key={p.id}>
                    <td className={`px-2.5 py-2.5 ${i < produtos.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>{p.nome}</td>
                    <td className={`px-2.5 py-2.5 ${i < produtos.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>{p.material}</td>
                    <td className={`px-2.5 py-2.5 ${i < produtos.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>{p.quantidade}</td>
                    <td className={`px-2.5 py-2.5 ${i < produtos.length - 1 ? 'border-b border-[var(--border)]' : ''}`}><Money value={p.custoUnitario} /></td>
                    <td className={`px-2.5 py-2.5 ${i < produtos.length - 1 ? 'border-b border-[var(--border)]' : ''}`}><Money value={p.precoVenda} /></td>
                    <td className={`px-2.5 py-2.5 ${i < produtos.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>
                      <Badge color={p.quantidade <= 1 ? 'amber' : 'green'}>{p.quantidade <= 1 ? 'Última unidade' : 'Disponível'}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <div className="text-center py-6 text-[var(--muted-foreground)] text-[13px]">
            Produto vendido some daqui automaticamente quando o pedido é marcado como Entregue.
          </div>
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={aba === 'materia' ? 'Novo material' : 'Novo produto pronto'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button
              variant="gradient"
              disabled={salvando}
              onClick={aba === 'materia' ? handleSalvarMaterial : handleSalvarProduto}
            >
              <Plus size={15} />{salvando ? 'Salvando...' : 'Salvar'}
            </Button>
          </>
        }
      >
        {aba === 'materia' ? (
          <>
            <Label>Nome do material</Label>
            <Input placeholder="Ex: PLA Azul" value={formMaterial.nome} onChange={e => setFormMaterial(f => ({ ...f, nome: e.target.value }))} />
            <Label>Preço por kg (R$)</Label>
            <Input placeholder="79,90" value={formMaterial.preco_kg} onChange={e => setFormMaterial(f => ({ ...f, preco_kg: e.target.value }))} />
            <div className="grid grid-cols-2 gap-x-4">
              <div><Label>Estoque atual (g)</Label><Input value={formMaterial.estoque_g} onChange={e => setFormMaterial(f => ({ ...f, estoque_g: e.target.value }))} /></div>
              <div><Label>Capacidade do rolo (g)</Label><Input value={formMaterial.capacidade_g} onChange={e => setFormMaterial(f => ({ ...f, capacidade_g: e.target.value }))} /></div>
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
    </div>
  )
}
