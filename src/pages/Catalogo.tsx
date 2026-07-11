import { useState, FormEvent } from 'react'
import { Plus, Pencil, Trash2, EyeOff, Eye as EyeIcon, Tag, RefreshCw, ImageOff, Link as LinkIcon, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { InlineConfirm } from '@/components/ui/InlineConfirm'
import { Label, Input, Select } from '@/components/ui/Input'
import { formatMoney } from '@/components/ui/Money'
import { useApi } from '@/lib/useApi'
import { api } from '@/lib/api'
import { carregarPreferencias } from '@/lib/settings'

interface ProdutoApiRow {
  id: string; codigo: string; nome: string; material_id: string | null; material_nome: string | null
  peso_padrao_g: string | null; tempo_impressao_h: string | null; preco_padrao: string | null
  descricao: string | null; ativo: boolean; imagem_url: string | null; link_arquivo: string | null
}
interface MaterialApiRow { id: string; nome: string; preco_kg: string }

const formVazio = { id: '', codigo: '', nome: '', material_id: '', peso_padrao_g: '', tempo_impressao_h: '', preco_padrao: '', descricao: '', imagem_url: '', link_arquivo: '' }

export function Catalogo() {
  const { data, loading, error, reload } = useApi<ProdutoApiRow[]>('/api/catalogo', [])
  const { data: materiaisApi } = useApi<MaterialApiRow[]>('/api/materiais', [])
  const [modalOpen, setModalOpen] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)
  const [form, setForm] = useState(formVazio)
  const [imagemAmpliada, setImagemAmpliada] = useState<string | null>(null)

  const usandoMock = !loading && !!error
  const vazio = !loading && !error && data.length === 0
  const produtos = usandoMock ? [] : data

  function gerarProximoCodigo() {
    const numeros = produtos
      .map(p => p.codigo.match(/^PRD-(\d+)$/))
      .filter((m): m is RegExpMatchArray => !!m)
      .map(m => Number(m[1]))
    const proximo = numeros.length > 0 ? Math.max(...numeros) + 1 : 1
    return `PRD-${String(proximo).padStart(3, '0')}`
  }

  function calcularPrecoSugerido(materialId: string, pesoStr: string, horasStr: string) {
    const material = materiaisApi.find(m => m.id === materialId)
    if (!material) return null
    const prefs = carregarPreferencias()
    const precoKg = Number(material.preco_kg)
    const pesoG = Number(pesoStr.replace(',', '.')) || 0
    const horas = Number(horasStr.replace(',', '.')) || 0
    const custoEnergiaHora = Number(prefs.custoEnergiaPadrao.replace(',', '.')) || 0
    const margem = Number(prefs.margemPadrao.replace(',', '.')) || 0
    const custoMaterial = (pesoG / 1000) * precoKg
    const custoEnergia = horas * custoEnergiaHora
    const preco = (custoMaterial + custoEnergia) * (1 + margem / 100)
    return preco > 0 ? preco : null
  }

  function abrirNovo() { setForm({ ...formVazio, codigo: gerarProximoCodigo() }); setModalOpen(true) }
  function abrirEdicao(p: ProdutoApiRow) {
    setForm({
      id: p.id, codigo: p.codigo, nome: p.nome, material_id: p.material_id ?? '',
      peso_padrao_g: p.peso_padrao_g ?? '', tempo_impressao_h: p.tempo_impressao_h ?? '',
      preco_padrao: p.preco_padrao ? String(p.preco_padrao).replace('.', ',') : '', descricao: p.descricao ?? '',
      imagem_url: p.imagem_url ?? '', link_arquivo: p.link_arquivo ?? ''
    })
    setModalOpen(true)
  }

  async function handleSalvar(e: FormEvent) {
    e.preventDefault()
    if (!form.codigo.trim() || !form.nome.trim()) return
    setSalvando(true)
    try {
      const payload = {
        codigo: form.codigo.trim().toUpperCase(), nome: form.nome, material_id: form.material_id || null,
        peso_padrao_g: form.peso_padrao_g ? Number(form.peso_padrao_g) : null,
        tempo_impressao_h: form.tempo_impressao_h ? Number(form.tempo_impressao_h.replace(',', '.')) : null,
        preco_padrao: form.preco_padrao ? Number(form.preco_padrao.replace(',', '.')) : null,
        descricao: form.descricao || null, imagem_url: form.imagem_url || null, link_arquivo: form.link_arquivo || null
      }
      if (form.id) await api.patch(`/api/catalogo?id=${form.id}`, payload)
      else await api.post('/api/catalogo', payload)
      setModalOpen(false)
      setForm(formVazio)
      reload()
    } catch (err) {
      console.error('[Salvar] erro:', err)
      const detalhe = err instanceof Error ? err.message : ''
      alert(`Não deu pra salvar. ${detalhe.slice(0, 200) || 'Confere o console (F12) pra mais detalhe.'}`)
    } finally {
      setSalvando(false)
    }
  }

  async function alternarAtivo(p: ProdutoApiRow) {
    try { await api.patch(`/api/catalogo?id=${p.id}`, { ativo: !p.ativo }); reload() }
    catch (err) { console.error('[Alternar ativo] erro:', err) }
  }

  async function excluir(id: string) {
    try { await api.del(`/api/catalogo?id=${id}`); setConfirmandoId(null); reload() }
    catch (err) { console.error('[Excluir] erro:', err); alert('Não deu pra excluir. Confere a conexão com o banco.') }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-semibold m-0">Catálogo</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-0.5">Produtos com código de referência — usa em Pedido ou Orçamento sem digitar tudo de novo {usandoMock && '(sem conexão com o banco)'}</p>
        </div>
        <Button variant="gradient" onClick={abrirNovo}><Plus size={15} />Novo produto</Button>
      </div>

      {vazio ? (
        <Card><div className="text-center py-10 text-sm text-[var(--muted-foreground)]">Nenhum produto no catálogo ainda. Clica em "Novo produto" pra começar.</div></Card>
      ) : (
        <Card className="p-0">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr>
                <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]"></th>
                <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]">Código</th>
                <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]">Nome</th>
                <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]">Material</th>
                <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]">Peso</th>
                <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]">Preço padrão</th>
                <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]"></th>
                <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-3 py-2.5 border-b border-[var(--border)]"></th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p, i) => {
                const last = i === produtos.length - 1
                return (
                  <tr key={p.id}>
                    <td className={`px-3 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>
                      <div
                        className={`w-9 h-9 rounded-lg bg-[var(--muted)] overflow-hidden flex items-center justify-center flex-shrink-0 ${p.imagem_url ? 'cursor-pointer hover:opacity-80' : ''}`}
                        onClick={() => p.imagem_url && setImagemAmpliada(p.imagem_url)}
                      >
                        {p.imagem_url ? (
                          <img src={p.imagem_url} alt={p.nome} className="w-full h-full object-cover" onError={ev => { (ev.target as HTMLImageElement).style.display = 'none' }} />
                        ) : (
                          <ImageOff size={14} className="text-[var(--muted-foreground)]" />
                        )}
                      </div>
                    </td>
                    <td className={`px-3 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-bold bg-[var(--muted)] px-2 py-1 rounded"><Tag size={11} />{p.codigo}</span>
                    </td>
                    <td className={`px-3 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>
                      <div className="flex items-center gap-1.5">
                        {p.nome}
                        {p.link_arquivo && (
                          <a href={p.link_arquivo} target="_blank" rel="noreferrer" title="Abrir arquivo de impressão" className="text-[var(--muted-foreground)] hover:text-[var(--primary)]">
                            <LinkIcon size={12} />
                          </a>
                        )}
                      </div>
                      {!p.ativo && <Badge color="gray">Oculto</Badge>}
                    </td>
                    <td className={`px-3 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>{p.material_nome ?? '—'}</td>
                    <td className={`px-3 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>{p.peso_padrao_g ? `${p.peso_padrao_g}g` : '—'}</td>
                    <td className={`px-3 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>{p.preco_padrao ? formatMoney(Number(p.preco_padrao)) : '—'}</td>
                    <td className={`px-3 py-2.5 ${!last ? 'border-b border-[var(--border)]' : ''}`}>
                      {confirmandoId === p.id ? (
                        <InlineConfirm onCancel={() => setConfirmandoId(null)} onConfirm={() => excluir(p.id)} />
                      ) : (
                        <div className="flex gap-1">
                          <button onClick={() => alternarAtivo(p)} title={p.ativo ? 'Ocultar' : 'Mostrar'} className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)]">
                            {p.ativo ? <EyeIcon size={13} /> : <EyeOff size={13} />}
                          </button>
                          <button onClick={() => abrirEdicao(p)} className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)]"><Pencil size={13} /></button>
                          <button onClick={() => setConfirmandoId(p.id)} className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Editar produto do catálogo' : 'Novo produto no catálogo'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="gradient" disabled={salvando} onClick={handleSalvar}><Plus size={15} />{salvando ? 'Salvando...' : 'Salvar'}</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-x-4">
          <div>
            <Label>Código de referência</Label>
            <div className="flex gap-2">
              <Input placeholder="Ex: PRD-001" value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))} />
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, codigo: gerarProximoCodigo() }))}
                title="Gerar código automático"
                className="w-9 h-9 rounded-lg bg-[var(--muted)] text-[var(--muted-foreground)] flex items-center justify-center flex-shrink-0 mb-3"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
          <div><Label>Nome do produto</Label><Input placeholder="Ex: Vaso decorativo P" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
        </div>
        <Label>Material padrão</Label>
        <Select
          value={form.material_id}
          onChange={e => {
            const materialId = e.target.value
            const sugerido = calcularPrecoSugerido(materialId, form.peso_padrao_g, form.tempo_impressao_h)
            setForm(f => ({ ...f, material_id: materialId, preco_padrao: sugerido ? sugerido.toFixed(2).replace('.', ',') : f.preco_padrao }))
          }}
        >
          <option value="">Nenhum (escolhe na hora do pedido)</option>
          {materiaisApi.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </Select>
        <div className="grid grid-cols-3 gap-x-4">
          <div>
            <Label>Peso padrão (g)</Label>
            <Input
              placeholder="80"
              value={form.peso_padrao_g}
              onChange={e => {
                const peso = e.target.value
                const sugerido = calcularPrecoSugerido(form.material_id, peso, form.tempo_impressao_h)
                setForm(f => ({ ...f, peso_padrao_g: peso, preco_padrao: sugerido ? sugerido.toFixed(2).replace('.', ',') : f.preco_padrao }))
              }}
            />
          </div>
          <div>
            <Label>Tempo impressão (h)</Label>
            <Input
              placeholder="6"
              value={form.tempo_impressao_h}
              onChange={e => {
                const horas = e.target.value
                const sugerido = calcularPrecoSugerido(form.material_id, form.peso_padrao_g, horas)
                setForm(f => ({ ...f, tempo_impressao_h: horas, preco_padrao: sugerido ? sugerido.toFixed(2).replace('.', ',') : f.preco_padrao }))
              }}
            />
          </div>
          <div>
            <Label>Preço padrão (R$)</Label>
            <Input placeholder="0,00" value={form.preco_padrao} onChange={e => setForm(f => ({ ...f, preco_padrao: e.target.value }))} />
          </div>
        </div>
        {form.material_id ? (
          <div className="text-[11px] text-[var(--muted-foreground)] -mt-2 mb-3">Calculado com sua margem e custo de energia padrão (Configurações) — pode ajustar na mão.</div>
        ) : (
          <div className="text-[11px] text-amber-600 -mt-2 mb-3">Escolhe um material acima pra calcular o preço sugerido automaticamente.</div>
        )}
        <Label>Link da imagem (opcional)</Label>
        <Input placeholder="https://..." value={form.imagem_url} onChange={e => setForm(f => ({ ...f, imagem_url: e.target.value }))} />
        {form.imagem_url && (
          <img
            src={form.imagem_url}
            alt="Pré-visualização"
            className="w-full h-32 object-cover rounded-lg mb-3 cursor-pointer hover:opacity-80"
            onClick={() => setImagemAmpliada(form.imagem_url)}
            onError={ev => { (ev.target as HTMLImageElement).style.display = 'none' }}
          />
        )}
        <Label>Link do arquivo de impressão (STL/3MF)</Label>
        <Input placeholder="https://..." value={form.link_arquivo} onChange={e => setForm(f => ({ ...f, link_arquivo: e.target.value }))} />
        <Label>Descrição</Label>
        <Input placeholder="Detalhe opcional" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
      </Modal>

      {imagemAmpliada && (
        <div
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-8"
          onClick={() => setImagemAmpliada(null)}
        >
          <button
            onClick={() => setImagemAmpliada(null)}
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
          >
            <X size={18} />
          </button>
          <img src={imagemAmpliada} alt="Imagem ampliada" className="max-w-full max-h-full rounded-lg object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}
