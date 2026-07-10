// Camada fina pra chamar as funções serverless em /api.
async function lerErro(res: Response): Promise<string> {
  try {
    const texto = await res.text()
    return `${res.status} ${res.statusText} — ${texto.slice(0, 300)}`
  } catch {
    return `${res.status} ${res.statusText}`
  }
}

export const api = {
  async get<T>(path: string): Promise<T> {
    const res = await fetch(path, { cache: 'no-store' })
    if (!res.ok) {
      const detalhe = await lerErro(res)
      // eslint-disable-next-line no-console
      console.error(`[api] GET ${path} falhou:`, detalhe)
      throw new Error(detalhe)
    }
    return res.json()
  },
  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      const detalhe = await lerErro(res)
      // eslint-disable-next-line no-console
      console.error(`[api] POST ${path} falhou:`, detalhe)
      throw new Error(detalhe)
    }
    return res.json()
  },
  async patch<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      const detalhe = await lerErro(res)
      // eslint-disable-next-line no-console
      console.error(`[api] PATCH ${path} falhou:`, detalhe)
      throw new Error(detalhe)
    }
    return res.json()
  },
  async del(path: string): Promise<void> {
    const res = await fetch(path, { method: 'DELETE' })
    if (!res.ok) {
      const detalhe = await lerErro(res)
      // eslint-disable-next-line no-console
      console.error(`[api] DELETE ${path} falhou:`, detalhe)
      throw new Error(detalhe)
    }
  }
}
