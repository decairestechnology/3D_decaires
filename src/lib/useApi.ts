import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

// Busca dados reais da API. Enquanto carrega, `data` fica no valor inicial passado.
// Se a chamada falhar (ex: banco ainda sem dados, ou variável de ambiente faltando),
// cai de volta pro valor inicial e marca `error`, sem quebrar a tela.
export function useApi<T>(path: string, initial: T, deps: unknown[] = []) {
  const [data, setData] = useState<T>(initial)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelado = false
    setLoading(true)
    setError(null)
    api
      .get<T>(path)
      .then(res => { if (!cancelado) setData(res) })
      .catch(() => { if (!cancelado) setError('Não foi possível carregar do banco. Mostrando dados de exemplo.') })
      .finally(() => { if (!cancelado) setLoading(false) })
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, reloadKey, ...deps])

  return { data, setData, loading, error, reload: () => setReloadKey(k => k + 1) }
}
