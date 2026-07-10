import { Sun, Moon, Eye, EyeOff } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Label, Input } from '@/components/ui/Input'
import { useTheme } from '@/context/ThemeContext'
import { useValuesVisibility } from '@/context/ValuesVisibilityContext'

export function Configuracoes() {
  const { theme, toggleTheme } = useTheme()
  const { hideValues, toggleHideValues } = useValuesVisibility()

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
        <Label>Margem de lucro padrão (%)</Label>
        <Input defaultValue="60" />
        <Label>Custo de energia padrão (R$/h)</Label>
        <Input defaultValue="0,45" />
        <Button variant="primary">Salvar</Button>
      </Card>
    </div>
  )
}
