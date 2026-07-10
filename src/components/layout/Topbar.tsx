import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Eye, EyeOff, Sun, Moon, LogOut } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useValuesVisibility } from '@/context/ValuesVisibilityContext'
import { useAuth } from '@/context/AuthContext'

function scoutReplyFor(question: string) {
  const q = question.toLowerCase()
  if (q.includes('lucr')) return 'Esse mês o lucro estimado é de R$ 1.480 (margem de 45%) — 3 pedidos ainda em produção não entraram nessa conta.'
  if (q.includes('orçamento') || q.includes('orcamento')) return 'Beleza — abre a tela de Orçamento que eu já deixo os campos de peso, tempo e material prontos pra calcular.'
  if (q.includes('estoque') || q.includes('filamento')) return 'PLA Branco e PETG Preto estão com estoque baixo. Quer que eu já sugira quantidade de reposição?'
  if (q.includes('atrasad') || q.includes('pedido')) return 'Nenhum pedido atrasado agora — o mais próximo do prazo é o de Marcos Silva, entrega dia 12/07.'
  return 'Anotado! Já registrei isso pra você.'
}

export function Topbar() {
  const { theme, toggleTheme } = useTheme()
  const { hideValues, toggleHideValues } = useValuesVisibility()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [question, setQuestion] = useState('')
  const [reply, setReply] = useState<string | null>(null)

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const inicial = user?.email?.[0]?.toUpperCase() ?? 'D'

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && question.trim()) {
      setReply(scoutReplyFor(question))
      setQuestion('')
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-2.5 mb-3">
        <Sparkles size={18} className="text-[var(--primary)] flex-shrink-0" />
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Peça para a Scout: 'quanto lucrei esse mês' ou 'orçamento de 80g PLA, 6h'... (Enter pra enviar)"
          className="flex-1 border-none bg-transparent outline-none text-sm"
        />
        <span className="text-[12.5px] font-bold text-[var(--secondary)] whitespace-nowrap cursor-pointer">Scout organiza</span>

        <button
          onClick={toggleHideValues}
          title="Mostrar/ocultar valores"
          className={`w-[34px] h-[34px] rounded-full flex items-center justify-center flex-shrink-0
          ${hideValues ? 'bg-[var(--accent)] text-[var(--primary)]' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'}`}
        >
          {hideValues ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
        <button
          onClick={toggleTheme}
          title="Alternar tema"
          className="w-[34px] h-[34px] rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] flex items-center justify-center flex-shrink-0"
        >
          {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        <button
          onClick={handleLogout}
          title="Sair"
          className="w-[34px] h-[34px] rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] flex items-center justify-center flex-shrink-0"
        >
          <LogOut size={16} />
        </button>
        <div
          title={user?.email ?? ''}
          className="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 text-white flex items-center justify-center text-[13px] font-extrabold flex-shrink-0 cursor-pointer"
        >
          {inicial}
        </div>
      </div>

      {reply && (
        <div className="bg-[var(--accent)] border border-[var(--border)] rounded-lg px-3.5 py-2.5 text-sm mb-5 flex gap-2 items-start">
          <Sparkles size={15} className="text-[var(--secondary)] flex-shrink-0 mt-0.5" />
          <span>{reply}</span>
        </div>
      )}
    </>
  )
}
