import { useState } from 'react'
import { Sun, Moon, Eye, EyeOff, Check, Plus, Trash2, Tag } from 'lucide-react'
import { useApi } from '@/lib/useApi'
import { api } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Label, Input } from '@/components/ui/Input'
import { useTheme } from '@/context/ThemeContext'
import { useValuesVisibility } from '@/context/ValuesVisibilityContext'
import { carregarPreferencias, salvarPreferencias } from '@/lib/settings'
import { CardCategorias } from '@/pages/financeiro/CardCategorias'

interface TipoCodigoRow { id: string; prefixo: string; descricao: string }

export function Configuracoes() {
  const { theme, toggleTheme } = useTheme()
  const { hideValues, toggleHideValues } = useValuesVisibility()

  const [prefs, setPrefs] = useState(carregarPreferencias())
  const [salvo, setSalvo] = useState(false)

  const { data: tiposCodigo, error: tiposErro, reload: reloadTipos } = useApi<TipoCodigoRow[]>('/api/custos?tipo=codigos', [])
  const [novoPrefixo, setNovoPrefixo] = useState('')
  const [novaDescricao, setNovaDescricao] = useState('')
  const [salvandoTipo, setSalvandoTipo] = useState(false)

  function motivoErro(err: unknown): string {
    const bruto = err instanceof Error ? err.message : String(err)
    const m = bruto.match(/"error"\s*:\s*"([^"]+)"/)
    return (m ? m[1] : bruto).slice(0, 300)
  }
  async function adicionarTipo() {
    if (!novoPrefixo.trim() || !novaDescricao.trim()) return
    setSalvandoTipo(true)
    try {
      await api.post('/api/custos?tipo=codigos', { prefixo: novoPrefixo, descricao: novaDescricao })
      setNovoPrefixo(''); setNovaDescricao(''); reloadTipos()
    } catch (err) {
      alert('Não deu pra cadastrar o código.\n\nMotivo: ' + motivoErro(err))
    } finally { setSalvandoTipo(false) }
  }
  async function excluirTipo(t: TipoCodigoRow) {
    try { await api.del(`/api/custos?tipo=codigos&id=${t.id}`); reloadTipos() }
    catch (err) { alert('Não deu pra excluir.\n\nMotivo: ' + motivoErro(err)) }
  }

  function handleSalvar() {
    salvarPreferencias(prefs)
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2000)
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold m-0">Configurações</h1>
      <p className="text-[var(--muted-foreground)] text-sm mt-0.5">Preferências e categorias do seu jeito</p>

      <div className="flex gap-4 flex-wrap">
        <Card className="flex-1 min-w-[260px] flex justify-between items-center">
          <div>
            <div className="text-xs font-bold text-[var(--muted-foreground)]">APARÊNCIA</div>
            <div className="text-sm font-bold mt-1">{theme === 'dark' ? 'Tema escuro' : 'Tema claro'}</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-0.5">Fica salvo no seu navegador.</div>
          </div>
          <button
            onClick={toggleTheme}
            className="w-[34px] h-[34px] rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] flex items-center justify-center flex-shrink-0"
          >
            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </Card>
        <Card className="flex-1 min-w-[260px] flex justify-between items-center">
          <div>
            <div className="text-xs font-bold text-[var(--muted-foreground)]">PRIVACIDADE</div>
            <div className="text-sm font-bold mt-1">Valores visíveis</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-0.5">Esconde os números de dinheiro na tela.</div>
          </div>
          <button
            onClick={toggleHideValues}
            className="w-[34px] h-[34px] rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] flex items-center justify-center flex-shrink-0"
          >
            {hideValues ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </Card>
      </div>

      <div className="flex gap-4 flex-wrap items-start">
      <Card className="mt-4 flex-1 min-w-[300px] max-w-[420px] order-2">
        <div className="text-xs font-bold text-[var(--muted-foreground)] mb-1">CÓDIGOS DE MATERIAL</div>
        <div className="text-xs text-[var(--muted-foreground)] mb-3">
          Cada tipo de material extra ganha um prefixo. Ao cadastrar em Custos → Materiais extras você escolhe o tipo e o número sai sozinho (CHV-001, CHV-002...).
        </div>
        <div className="flex items-center gap-2 py-1.5 text-[13px] border-b border-[var(--border)]">
          <span className="inline-flex items-center gap-1 font-mono text-xs font-bold bg-[var(--muted)] px-2 py-1 rounded"><Tag size={11} />FIL</span>
          <span className="flex-1">Filamento</span><span className="text-[11px] text-[var(--muted-foreground)]">fixo</span>
        </div>
        <div className="flex items-center gap-2 py-1.5 text-[13px] border-b border-[var(--border)]">
          <span className="inline-flex items-center gap-1 font-mono text-xs font-bold bg-[var(--muted)] px-2 py-1 rounded"><Tag size={11} />PRD</span>
          <span className="flex-1">Produto do catálogo</span><span className="text-[11px] text-[var(--muted-foreground)]">fixo</span>
        </div>
        {tiposCodigo.map(t => (
          <div key={t.id} className="flex items-center gap-2 py-1.5 text-[13px] border-b border-[var(--border)]">
            <span className="inline-flex items-center gap-1 font-mono text-xs font-bold bg-[var(--muted)] px-2 py-1 rounded"><Tag size={11} />{t.prefixo}</span>
            <span className="flex-1">{t.descricao}</span>
            <button onClick={() => excluirTipo(t)} title="Excluir tipo" className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
          </div>
        ))}
        {tiposErro && (
          <div className="text-xs text-red-600 mt-2">Não deu pra carregar os códigos — confere se a migração 025 foi rodada no Neon.</div>
        )}
        <div className="grid grid-cols-[90px_1fr] gap-x-2 mt-3">
          <div><Label>Prefixo</Label><Input placeholder="CHV" maxLength={6} value={novoPrefixo} onChange={e => setNovoPrefixo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} /></div>
          <div><Label>Descrição</Label><Input placeholder="Chaveiros" value={novaDescricao} onChange={e => setNovaDescricao(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') adicionarTipo() }} /></div>
        </div>
        <Button variant="primary" disabled={salvandoTipo || !novoPrefixo.trim() || !novaDescricao.trim()} onClick={adicionarTipo}>
          <Plus size={15} />{salvandoTipo ? 'Salvando...' : 'Adicionar código'}
        </Button>
        <div className="text-xs text-[var(--muted-foreground)] mt-2">
          Excluir um tipo não mexe nos materiais que já usam esse código.
        </div>
      </Card>

      <CardCategorias className="order-3" />

      <Card className="mt-4 flex-1 min-w-[300px] max-w-[420px] order-1">
        <div className="text-xs font-bold text-[var(--muted-foreground)] mb-3">PADRÕES DO ORÇAMENTO</div>
        <Label>Margem de lucro padrão (%)</Label>
        <Input value={prefs.margemPadrao} onChange={e => setPrefs(p => ({ ...p, margemPadrao: e.target.value }))} />
        <Label>Tarifa de energia (R$/kWh)</Label>
        <Input placeholder="0,90" value={prefs.tarifaKwh} onChange={e => setPrefs(p => ({ ...p, tarifaKwh: e.target.value }))} />
        <div className="text-[11px] text-[var(--muted-foreground)] -mt-2 mb-3">
          O valor do kWh na sua conta de luz, já com impostos e bandeira. Não é por hora — o sistema converte sozinho.
        </div>
        <Label>Potência média da impressora (W)</Label>
        <Input placeholder="120" value={prefs.potenciaPadraoW} onChange={e => setPrefs(p => ({ ...p, potenciaPadraoW: e.target.value }))} />
        <div className="text-[11px] text-[var(--muted-foreground)] -mt-2 mb-3">
          Usada quando a peça não tem impressora escolhida. Mede com um medidor de tomada durante uma impressão real — parada, a impressora consome bem menos e o número fica irreal.
        </div>
        <Label>Custo da sua hora de trabalho (R$/h)</Label>
        <Input placeholder="0,00" value={prefs.custoMaoObraHora} onChange={e => setPrefs(p => ({ ...p, custoMaoObraHora: e.target.value }))} />
        <div className="text-[11px] text-[var(--muted-foreground)] -mt-2 mb-3">
          Quanto vale seu tempo de acabamento, montagem e embalagem. Deixa 0 se não quiser contar.
        </div>
        <Label>Reserva pra manutenção (%)</Label>
        <Input placeholder="0" value={prefs.percentualManutencao} onChange={e => setPrefs(p => ({ ...p, percentualManutencao: e.target.value }))} />
        <div className="text-[11px] text-[var(--muted-foreground)] -mt-2 mb-3">
          Percentual do custo de produção guardado pra bico, correia, peça de reposição. Ex: 5%.
        </div>
        <Button variant="primary" onClick={handleSalvar}>
          {salvo ? <><Check size={15} />Salvo!</> : 'Salvar'}
        </Button>
        <div className="text-xs text-[var(--muted-foreground)] mt-2">
          Esses valores viram o ponto de partida toda vez que você abrir a tela de Orçamento.
        </div>
      </Card>
      </div>
    </div>
  )
}
