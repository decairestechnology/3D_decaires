import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Money } from '@/components/ui/Money'
import { Modal } from '@/components/ui/Modal'
import { Label, Input, Select } from '@/components/ui/Input'
import { pedidos as pedidosMock } from '@/data/mockData'
import { StatusPedido } from '@/types'

const colunas: { status: StatusPedido; titulo: string }[] = [
  { status: 'orcamento', titulo: 'ORÇAMENTO' },
  { status: 'producao', titulo: 'EM PRODUÇÃO' },
  { status: 'pronto', titulo: 'PRONTO' },
  { status: 'entregue', titulo: 'ENTREGUE' }
]

export function Pedidos() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-semibold m-0">Pedidos</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-0.5">Fluxo de produção</p>
        </div>
        <Button variant="gradient" onClick={() => setModalOpen(true)}><Plus size={15} />Novo pedido</Button>
      </div>

      <div className="flex gap-3.5 overflow-x-auto">
        {colunas.map(col => {
          const items = pedidosMock.filter(p => p.status === col.status)
          return (
            <div key={col.status} className="bg-[var(--muted)] rounded-xl p-3 min-w-[230px] flex-1">
              <div className="text-[13px] font-bold mb-2.5 flex justify-between text-[var(--muted-foreground)]">
                {col.titulo} <span>{items.length}</span>
              </div>
              {items.map(p => (
                <div key={p.id} className="bg-[var(--card)] border border-[var(--border)] rounded-[10px] p-2.5 mb-2.5 text-[13px] shadow-sm">
                  <div className="font-bold mb-1">{p.clienteNome}</div>
                  {p.peca} — {p.material}
                  <div className="text-xs text-[var(--muted-foreground)] flex justify-between mt-1">
                    <Money value={p.valor} />
                    <span className={col.status === 'orcamento' && p.prazo && new Date(p.prazo) < new Date('2026-07-10') ? 'text-red-500 font-bold' : ''}>
                      {p.prazo ? p.prazo.split('-').slice(1).reverse().join('/') : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Novo pedido"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="gradient" onClick={() => setModalOpen(false)}><Plus size={15} />Salvar pedido</Button>
          </>
        }
      >
        <Label>Cliente</Label>
        <Select><option>Marcos Silva</option><option>Ateliê Flora</option><option>+ Novo cliente</option></Select>
        <Label>Peça</Label>
        <Input placeholder="Ex: Suporte de celular" />
        <div className="grid grid-cols-2 gap-x-4">
          <div><Label>Material</Label><Select><option>PLA</option><option>PETG</option><option>ABS</option></Select></div>
          <div><Label>Quantidade</Label><Input defaultValue={1} /></div>
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          <div><Label>Valor (R$)</Label><Input placeholder="0,00" /></div>
          <div><Label>Prazo de entrega</Label><Input type="date" /></div>
        </div>
        <Label>Status inicial</Label>
        <Select><option>Orçamento</option><option>Em produção</option><option>Pronto</option></Select>
      </Modal>
    </div>
  )
}
