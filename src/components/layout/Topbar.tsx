import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Eye, EyeOff, Sun, Moon, LogOut } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useValuesVisibility } from '@/context/ValuesVisibilityContext'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'

export function Topbar() {
  const { theme, toggleTheme } = useTheme()
  const { hideValues, toggleHideValues } = useValuesVisibility()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [question, setQuestion] = useState('')
  const [reply, setReply] = useState<string | null>(null)
  const [pensando, setPensando] = useState(false)

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const inicial = user?.email?.[0]?.toUpperCase() ?? 'D'

  async function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter' || !question.trim() || pensando) return
    const pergunta = question
    setQuestion('')
    setPensando(true)
    setReply(null)
    try {
      const { reply: resposta } = await api.post<{ reply: string }>('/api/scout', { question: pergunta })
      setReply(resposta)
    } catch {
      setReply('Não consegui falar com a Scout agora — confere se ANTHROPIC_API_KEY está configurada na Vercel.')
    } finally {
      setPensando(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-2.5 mb-3">
        <Sparkles size={18} className={`text-[var(--primary)] flex-shrink-0 ${pensando ? 'animate-pulse' : ''}`} />
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={pensando}
          placeholder={pensando ? 'Scout pensando...' : "Peça para a Scout: 'quanto lucrei esse mês' ou 'orçamento de 80g PLA, 6h'... (Enter pra enviar)"}
          className="flex-1 border-none bg-transparent outline-none text-sm disabled:opacity-60"
        />
        <span className="text-[12.5px] font-bold text-[var(--secondary)] whitespace-nowrap">Scout organiza</span>

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
