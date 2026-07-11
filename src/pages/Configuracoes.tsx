import { useState } from 'react'
import { Sun, Moon, Eye, EyeOff, Check, Plus, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Label, Input } from '@/components/ui/Input'
import { useTheme } from '@/context/ThemeContext'
import { useValuesVisibility } from '@/context/ValuesVisibilityContext'
import { useApi } from '@/lib/useApi'
import { api } from '@/lib/api'
import { carregarPreferencias, salvarPreferencias } from '@/lib/settings'

interface OpcaoApiRow { id: string; categoria: 'tipo' | 'cor'; nome: string }

export function Configuracoes() {
  const { theme, toggleTheme } = useTheme()
  const { hideValues, toggleHideValues } = useValuesVisibility()

  const [prefs, setPrefs] = useState(carregarPreferencias())
  const [salvo, setSalvo] = useState(false)

  const { data: opcoes, reload: reloadOpcoes } = useApi<OpcaoApiRow[]>('/api/opcoes-material', [])
  const [novoTipo, setNovoTipo] = useState('')
  const [novaCor, setNovaCor] = useState('')

  function handleSalvar() {
    salvarPreferencias(prefs)
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2000)
  }

  async function adicionarOpcao(categoria: 'tipo' | 'cor', nome: string) {
    if (!nome.trim()) return
    try {
      await api.post('/api/opcoes-material', { categoria, nome: nome.trim() })
      if (categoria === 'tipo') setNovoTipo(''); else setNovaCor('')
      reloadOpcoes()
    } catch (err) {
      console.error('[Adicionar opção] erro:', err)
      alert('Não deu pra adicionar — pode já existir uma opção com esse nome.')
    }
  }

  async function removerOpcao(id: string) {
    try {
      await api.del(`/api/opcoes-material?id=${id}`)
      reloadOpcoes()
    } catch (err) {
      console.error('[Remover opção] erro:', err)
      alert('Não deu pra remover.')
    }
  }

  const tipos = opcoes.filter(o => o.categoria === 'tipo')
  const cores = opcoes.filter(o => o.categoria === 'cor')

  return (
    <div>
      <h1 className="text-2xl font-semibold m-0">Configurações</h1>
      <p className="text-[var(--muted-foreground)] text-sm mt-0.5 mb-5">Preferências e categorias do seu jeito</p>

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

      <Card className="mt-4 max-w-[420px]">
        <div className="text-xs font-bold text-[var(--muted-foreground)] mb-3">PADRÕES DO ORÇAMENTO</div>
        <Label>Margem de lucro padrão (%)</Label>
        <Input value={prefs.margemPadrao} onChange={e => setPrefs(p => ({ ...p, margemPadrao: e.target.value }))} />
        <Label>Custo de energia padrão (R$/h)</Label>
        <Input value={prefs.custoEnergiaPadrao} onChange={e => setPrefs(p => ({ ...p, custoEnergiaPadrao: e.target.value }))} />
        <Button variant="primary" onClick={handleSalvar}>
          {salvo ? <><Check size={15} />Salvo!</> : 'Salvar'}
        </Button>
        <div className="text-xs text-[var(--muted-foreground)] mt-2">
          Esses valores viram o ponto de partida toda vez que você abrir a tela de Orçamento.
        </div>
      </Card>

      <div className="flex gap-4 flex-wrap mt-4">
        <Card className="flex-1 min-w-[300px]">
          <div className="text-xs font-bold text-[var(--muted-foreground)] mb-3">TIPOS DE MATERIAL</div>
          <div className="flex flex-wrap gap-2 mb-3">
            {tipos.length === 0 && <span className="text-xs text-[var(--muted-foreground)]">Nenhum tipo cadastrado ainda.</span>}
            {tipos.map(t => (
              <span key={t.id} className="inline-flex items-center gap-1.5 bg-[var(--muted)] rounded-full px-3 py-1.5 text-xs font-semibold">
                {t.nome}
                <button onClick={() => removerOpcao(t.id)} className="text-[var(--muted-foreground)] hover:text-red-600"><X size={12} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={novoTipo}
              onChange={e => setNovoTipo(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && adicionarOpcao('tipo', novoTipo)}
              placeholder="Ex: PC, HIPS..."
              className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] text-sm"
            />
            <button onClick={() => adicionarOpcao('tipo', novoTipo)} className="w-9 h-9 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center flex-shrink-0">
              <Plus size={16} />
            </button>
          </div>
        </Card>

        <Card className="flex-1 min-w-[300px]">
          <div className="text-xs font-bold text-[var(--muted-foreground)] mb-3">CORES DISPONÍVEIS</div>
          <div className="flex flex-wrap gap-2 mb-3">
            {cores.length === 0 && <span className="text-xs text-[var(--muted-foreground)]">Nenhuma cor cadastrada ainda.</span>}
            {cores.map(c => (
              <span key={c.id} className="inline-flex items-center gap-1.5 bg-[var(--muted)] rounded-full px-3 py-1.5 text-xs font-semibold">
                {c.nome}
                <button onClick={() => removerOpcao(c.id)} className="text-[var(--muted-foreground)] hover:text-red-600"><X size={12} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={novaCor}
              onChange={e => setNovaCor(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && adicionarOpcao('cor', novaCor)}
              placeholder="Ex: Rosa, Dourado..."
              className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] text-sm"
            />
            <button onClick={() => adicionarOpcao('cor', novaCor)} className="w-9 h-9 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center flex-shrink-0">
              <Plus size={16} />
            </button>
          </div>
        </Card>
      </div>
      <p className="text-xs text-[var(--muted-foreground)] mt-2">
        Esses tipos e cores aparecem na hora de cadastrar um novo material no Estoque, pra montar o nome certinho (ex: PLA + Azul).
      </p>
    </div>
  )
}
