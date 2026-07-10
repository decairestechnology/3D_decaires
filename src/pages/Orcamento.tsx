import { useMemo, useState } from 'react'
import { Send } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Label, Input, Select } from '@/components/ui/Input'
import { formatMoney } from '@/components/ui/Money'
import { materiais } from '@/data/mockData'

export function Orcamento() {
  const [nome, setNome] = useState('')
  const [peso, setPeso] = useState('80')
  const [materialIdx, setMaterialIdx] = useState(0)
  const [horas, setHoras] = useState('6')
  const [custoEnergiaHora, setCustoEnergiaHora] = useState('0,45')
  const [margem, setMargem] = useState('60')
  const [quantidade, setQuantidade] = useState('1')

  const resultado = useMemo(() => {
    const pesoG = parseFloat(peso.replace(',', '.')) || 0
    const precoKg = materiais[materialIdx]?.precoKg ?? 0
    const custoMaterial = (pesoG / 1000) * precoKg
    const custoEnergia = (parseFloat(horas.replace(',', '.')) || 0) * (parseFloat(custoEnergiaHora.replace(',', '.')) || 0)
    const custoTotal = custoMaterial + custoEnergia
    const margemNum = (parseFloat(margem.replace(',', '.')) || 0) / 100
    const precoUnitario = custoTotal * (1 + margemNum)
    const qtd = parseFloat(quantidade.replace(',', '.')) || 1
    return { custoMaterial, custoEnergia, custoTotal, precoUnitario, precoFinal: precoUnitario * qtd }
  }, [peso, materialIdx, horas, custoEnergiaHora, margem, quantidade])

  function enviarWhatsApp() {
    const texto = `Olá! Segue o orçamento${nome ? ` da peça "${nome}"` : ''}: ${formatMoney(resultado.precoFinal)}.`
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold m-0">Orçamento</h1>
      <p className="text-[var(--muted-foreground)] text-sm mt-0.5 mb-5">Calcula custo e preço sugerido pela peça</p>

      <div className="flex gap-4 flex-wrap items-start">
        <Card className="flex-1 min-w-[320px]">
          <Label>Nome da peça</Label>
          <Input placeholder="Ex: Suporte de celular" value={nome} onChange={e => setNome(e.target.value)} />
          <div className="grid grid-cols-2 gap-x-4">
            <div><Label>Peso (gramas)</Label><Input value={peso} onChange={e => setPeso(e.target.value)} /></div>
            <div>
              <Label>Material</Label>
              <Select value={materialIdx} onChange={e => setMaterialIdx(Number(e.target.value))}>
                {materiais.map((m, i) => <option key={m.id} value={i}>{m.nome} — {formatMoney(m.precoKg)}/kg</option>)}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4">
            <div><Label>Tempo de impressão (h)</Label><Input value={horas} onChange={e => setHoras(e.target.value)} /></div>
            <div><Label>Custo energia (R$/h)</Label><Input value={custoEnergiaHora} onChange={e => setCustoEnergiaHora(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-x-4">
            <div><Label>Margem de lucro (%)</Label><Input value={margem} onChange={e => setMargem(e.target.value)} /></div>
            <div><Label>Quantidade</Label><Input value={quantidade} onChange={e => setQuantidade(e.target.value)} /></div>
          </div>
        </Card>

        <Card className="flex-1 min-w-[280px]">
          <div className="font-bold mb-2.5">Resultado</div>
          <div className="flex justify-between text-[13px] py-1.5 border-b border-[var(--border)]"><span>Custo material</span><span>{formatMoney(resultado.custoMaterial)}</span></div>
          <div className="flex justify-between text-[13px] py-1.5 border-b border-[var(--border)]"><span>Custo energia</span><span>{formatMoney(resultado.custoEnergia)}</span></div>
          <div className="flex justify-between text-[13px] py-1.5 border-b border-[var(--border)]"><span>Custo total</span><span>{formatMoney(resultado.custoTotal)}</span></div>
          <div className="bg-[var(--accent)] rounded-xl p-4 mt-1.5">
            <div className="text-xs font-semibold text-[var(--muted-foreground)]">Preço sugerido</div>
            <div className="text-2xl font-extrabold text-[var(--secondary)]">{formatMoney(resultado.precoFinal)}</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">Margem de {margem}% aplicada</div>
          </div>
          <Button variant="gradient" className="w-full mt-3.5"><Send size={15} />Gerar orçamento PDF</Button>
          <Button variant="whatsapp" className="w-full mt-2" onClick={enviarWhatsApp}>Enviar por WhatsApp</Button>
        </Card>
      </div>
    </div>
  )
}
