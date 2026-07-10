import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] erro capturado:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--background,#F8FAFC)] px-6">
          <div className="max-w-md text-center">
            <div className="text-lg font-bold mb-2">Algo deu errado</div>
            <p className="text-sm text-gray-500 mb-4">
              A tela quebrou por um erro inesperado. Abre o console do navegador (F12) pra ver o
              detalhe técnico abaixo, ou recarrega a página.
            </p>
            <pre className="text-left text-xs bg-gray-100 text-red-700 rounded-lg p-3 overflow-auto max-h-40">
              {this.state.error.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold"
            >
              Recarregar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
