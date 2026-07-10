import { FormEvent, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { FirebaseError } from 'firebase/app'
import { useAuth } from '@/context/AuthContext'

function mensagemErro(err: unknown): string {
  if (err instanceof FirebaseError) {
    // eslint-disable-next-line no-console
    console.error('[Login] código do erro Firebase:', err.code, err.message)
    switch (err.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Email ou senha incorretos.'
      case 'auth/invalid-api-key':
      case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
        return 'Configuração do Firebase inválida — confere as variáveis VITE_FIREBASE_* no .env.'
      case 'auth/too-many-requests':
        return 'Muitas tentativas seguidas. Espera um minuto e tenta de novo.'
      case 'auth/network-request-failed':
        return 'Falha de rede — confere sua conexão.'
      case 'auth/operation-not-allowed':
        return 'Login por email/senha não está ativado no Firebase (Authentication → Sign-in method).'
      default:
        return `Erro ao entrar (${err.code}). Detalhe no console (F12).`
    }
  }
  // eslint-disable-next-line no-console
  console.error('[Login] erro inesperado:', err)
  return 'Erro inesperado ao entrar. Detalhe no console (F12).'
}

export function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  const destino = (location.state as { from?: string })?.from || '/'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)
    try {
      await signIn(email.trim(), senha)
      navigate(destino, { replace: true })
    } catch (err) {
      setErro(mensagemErro(err))
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm p-8">
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.png" alt="DeCaires" className="w-16 h-16 object-contain mb-2" />
          <div className="font-bold text-lg">DeCaires 3D</div>
          <div className="text-xs text-[var(--muted-foreground)] font-semibold">Gestão</div>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="text-xs font-semibold text-[var(--muted-foreground)] block mb-1">Email</label>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] text-sm mb-3"
            placeholder="voce@exemplo.com"
          />
          <label className="text-xs font-semibold text-[var(--muted-foreground)] block mb-1">Senha</label>
          <div className="relative mb-4">
            <input
              type={mostrarSenha ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              className="w-full px-3 py-2 pr-10 rounded-lg border border-[var(--border)] bg-[var(--muted)] text-sm"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setMostrarSenha(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
              tabIndex={-1}
            >
              {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {erro && <div className="text-xs text-red-600 font-semibold mb-3">{erro}</div>}

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
