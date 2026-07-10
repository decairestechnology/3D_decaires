// Camada fina pra chamar as funções serverless em /api.
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
  },
  async patch<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!res.ok) throw new Error(`Erro ao atualizar ${path}`)
    return res.json()
  },
  async del(path: string): Promise<void> {
    const res = await fetch(path, { method: 'DELETE' })
    if (!res.ok) throw new Error(`Erro ao apagar ${path}`)
  }
}
