import { useState, FormEvent } from 'react'
import { Plus, Pencil, Trash2, ImageOff, EyeOff, Eye as EyeIcon, Boxes } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { InlineConfirm } from '@/components/ui/InlineConfirm'
import { Label, Input } from '@/components/ui/Input'
import { formatMoney } from '@/components/ui/Money'
import { useApi } from '@/lib/useApi'
import { api } from '@/lib/api'

interface ProdutoApiRow {
  id: string; nome: string; descricao: string | null; imagem_url: string | null
  preco: string; material: string | null; ativo: boolean
}
interface ProdutoProntoApiRow {
  id: string; nome: string; material: string | null; quantidade: number; preco_venda: string
}

const formVazio = { id: '', nome: '', descricao: '', imagem_url: '', preco: '', material: '' }

export function Catalogo() {
  const { data, loading, error, reload } = useApi<ProdutoApiRow[]>('/api/catalogo', [])
  const { data: produtosProntos, reload: reloadProntos } = useApi<ProdutoProntoApiRow[]>('/api/produtos-prontos', [])
  const [modalOpen, setModalOpen] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [importando, setImportando] = useState(false)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)
  const [form, setForm] = useState(formVazio)

  const usandoMock = !loading && !!error
  const vazio = !loading && !error && data.length === 0
  const produtos = usandoMock ? [] : data

  const naoImportados = produtosProntos.filter(pp => !produtos.some(p => p.nome === pp.nome))

  async function importarDoEstoque() {
    if (naoImportados.length === 0) return
    setImportando(true)
    try {
      for (const pp of naoImportados) {
        await api.post('/api/catalogo', {
          nome: pp.nome,
          descricao: null,
          imagem_url: null,
          preco: Number(pp.preco_venda) || 0,
          material: pp.material
        })
      }
      reload()
      alert(`${naoImportados.length} produto(s) importado(s) do estoque! Falta só adicionar a imagem de cada um.`)
    } catch (err) {
      console.error('[Importar do estoque] erro:', err)
      alert('Não deu pra importar. Confere a conexão com o banco.')
    } finally {
      setImportando(false)
      reloadProntos()
    }
  }

  function abrirNovo() { setForm(formVazio); setModalOpen(true) }
  function abrirEdicao(p: ProdutoApiRow) {
    setForm({ id: p.id, nome: p.nome, descricao: p.descricao ?? '', imagem_url: p.imagem_url ?? '', preco: String(p.preco).replace('.', ','), material: p.material ?? '' })
    setModalOpen(true)
  }

  async function handleSalvar(e: FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) return
    setSalvando(true)
    try {
      const payload = {
        nome: form.nome, descricao: form.descricao || null, imagem_url: form.imagem_url || null,
        preco: Number(form.preco.replace(',', '.')) || 0, material: form.material || null
      }
      if (form.id) await api.patch(`/api/catalogo?id=${form.id}`, payload)
      else await api.post('/api/catalogo', payload)
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

  async function alternarAtivo(p: ProdutoApiRow) {
    try {
      await api.patch(`/api/catalogo?id=${p.id}`, { ativo: !p.ativo })
      reload()
    } catch (err) {
      console.error('[Alternar ativo] erro:', err)
    }
  }

  async function excluir(id: string) {
    try {
      await api.del(`/api/catalogo?id=${id}`)
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
          <h1 className="text-2xl font-semibold m-0">Catálogo</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-0.5">Produtos prontos pra mostrar e vender {usandoMock && '(sem conexão com o banco)'}</p>
        </div>
        <div className="flex items-center gap-2">
          {naoImportados.length > 0 && (
            <Button variant="ghost" onClick={importarDoEstoque} disabled={importando}>
              <Boxes size={15} />{importando ? 'Importando...' : `Importar do estoque (${naoImportados.length})`}
            </Button>
          )}
          <Button variant="gradient" onClick={abrirNovo}><Plus size={15} />Novo produto</Button>
        </div>
      </div>

      {vazio ? (
        <Card><div className="text-center py-10 text-sm text-[var(--muted-foreground)]">Nenhum produto no catálogo ainda. Clica em "Novo produto" pra começar.</div></Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {produtos.map(p => (
            <Card key={p.id} className="p-0 overflow-hidden flex flex-col">
              <div className="w-full aspect-square bg-[var(--muted)] flex items-center justify-center overflow-hidden">
                {p.imagem_url ? (
                  <img src={p.imagem_url} alt={p.nome} className="w-full h-full object-cover" onError={ev => { (ev.target as HTMLImageElement).style.display = 'none' }} />
                ) : (
                  <ImageOff size={32} className="text-[var(--muted-foreground)]" />
                )}
              </div>
              <div className="p-3 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <b className="text-sm">{p.nome}</b>
                  {!p.ativo && <Badge color="gray">Oculto</Badge>}
                </div>
                {p.material && <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{p.material}</div>}
                <div className="text-base font-extrabold text-[var(--secondary)] mt-1.5">{formatMoney(Number(p.preco))}</div>

                {confirmandoId === p.id ? (
                  <div className="mt-2"><InlineConfirm onCancel={() => setConfirmandoId(null)} onConfirm={() => excluir(p.id)} /></div>
                ) : (
                  <div className="flex items-center gap-1 mt-auto pt-2">
                    <button onClick={() => alternarAtivo(p)} title={p.ativo ? 'Ocultar' : 'Mostrar'} className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)]">
                      {p.ativo ? <EyeIcon size={13} /> : <EyeOff size={13} />}
                    </button>
                    <button onClick={() => abrirEdicao(p)} className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)]"><Pencil size={13} /></button>
                    <button onClick={() => setConfirmandoId(p.id)} className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Editar produto' : 'Novo produto'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="gradient" disabled={salvando} onClick={handleSalvar}><Plus size={15} />{salvando ? 'Salvando...' : 'Salvar'}</Button>
          </>
        }
      >
        <Label>Nome do produto</Label>
        <Input placeholder="Ex: Suporte de celular" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
        <Label>Link da imagem</Label>
        <Input placeholder="https://..." value={form.imagem_url} onChange={e => setForm(f => ({ ...f, imagem_url: e.target.value }))} />
        {form.imagem_url && (
          <img src={form.imagem_url} alt="Pré-visualização" className="w-full h-32 object-cover rounded-lg mb-3" onError={ev => { (ev.target as HTMLImageElement).style.display = 'none' }} />
        )}
        <div className="grid grid-cols-2 gap-x-4">
          <div><Label>Preço (R$)</Label><Input placeholder="0,00" value={form.preco} onChange={e => setForm(f => ({ ...f, preco: e.target.value }))} /></div>
          <div><Label>Material</Label><Input placeholder="Ex: PLA Azul" value={form.material} onChange={e => setForm(f => ({ ...f, material: e.target.value }))} /></div>
        </div>
        <Label>Descrição</Label>
        <Input placeholder="Detalhe opcional sobre o produto" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
        <div className="text-xs text-[var(--muted-foreground)] mt-1">Por enquanto o link precisa ser de uma imagem já hospedada em algum lugar (Google Drive público, Imgur etc.) — upload direto de arquivo é próxima melhoria.</div>
      </Modal>
    </div>
  )
}
