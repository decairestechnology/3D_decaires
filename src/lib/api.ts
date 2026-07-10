// Camada fina pra chamar as funções serverless em /api quando o front for
// trocar os dados mock por dados reais. Exemplo de uso numa página:
//
//   import { api } from '@/lib/api'
//   const pedidos = await api.get<Pedido[]>('/api/pedidos')
//
export const api = {
  async get<T>(path: string): Promise<T> {
    const res = await fetch(path)
    if (!res.ok) throw new Error(`Erro ao buscar ${path}`)
    return res.json()
  },
  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!res.ok) throw new Error(`Erro ao enviar pra ${path}`)
    return res.json()
  }
}
