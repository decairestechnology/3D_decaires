import { Plus } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Money } from '@/components/ui/Money'
import { clientes } from '@/data/mockData'

function iniciais(nome: string) {
  return nome.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
}

export function Clientes() {
  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-semibold m-0">Clientes</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-0.5">Histórico e contato</p>
        </div>
        <Button variant="gradient"><Plus size={15} />Novo cliente</Button>
      </div>
      <Card className="p-0">
        <table className="w-full border-collapse text-[13.5px]">
          <thead>
            <tr>
              <th className="w-12 border-b border-[var(--border)]"></th>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Nome</th>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Contato</th>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Pedidos</th>
              <th className="text-left text-[var(--muted-foreground)] font-semibold text-xs px-2.5 py-2 border-b border-[var(--border)]">Total gasto</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c, i) => (
              <tr key={c.id}>
                <td className={`px-2.5 py-2.5 ${i < clientes.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>
                  <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 text-white flex items-center justify-center text-xs font-extrabold">
                    {iniciais(c.nome)}
                  </div>
                </td>
                <td className={`px-2.5 py-2.5 ${i < clientes.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>{c.nome}</td>
                <td className={`px-2.5 py-2.5 ${i < clientes.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>{c.contato}</td>
                <td className={`px-2.5 py-2.5 ${i < clientes.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>{c.pedidos}</td>
                <td className={`px-2.5 py-2.5 ${i < clientes.length - 1 ? 'border-b border-[var(--border)]' : ''}`}><Money value={c.totalGasto} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
