import { useMemo, useState, useEffect } from 'react'
import { Send } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Label, Input, Select } from '@/components/ui/Input'
import { formatMoney } from '@/components/ui/Money'
import { useApi } from '@/lib/useApi'
import { materiais as materiaisMock } from '@/data/mockData'
import { carregarPreferencias } from '@/lib/settings'

interface MaterialApiRow {
  id: string
  nome: string
  preco_kg: string
}

export function Orcamento() {
  const { data, loading, error } = useApi<MaterialApiRow[]>('/api/materiais', [])
  const usandoMock = !loading && (error || data.length === 0)
  const materiais = usandoMock
    ? materiaisMock.map(m => ({ id: m.id, nome: m.nome, precoKg: m.precoKg }))
    : data.map(m => ({ id: m.id, nome: m.nome, precoKg: Number(m.preco_kg) }))

  const prefs = carregarPreferencias()

  const [nome, setNome] = useState('')
  const [peso, setPeso] = useState('80')
  const [materialIdx, setMaterialIdx] = useState(0)
  const [horas, setHoras] = useState('6')
  const [custoEnergiaHora, setCustoEnergiaHora] = useState(prefs.custoEnergiaPadrao)
  const [margem, setMargem] = useState(prefs.margemPadrao)
  const [quantidade, setQuantidade] = useState('1')

  useEffect(() => { setMaterialIdx(0) }, [materiais.length])

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
  }, [peso, materialIdx, horas, custoEnergiaHora, margem, quantidade, materiais])

  function enviarWhatsApp() {
    const texto = `Olá! Segue o orçamento${nome ? ` da peça "${nome}"` : ''}: ${formatMoney(resultado.precoFinal)}.`
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
  }

  function gerarPdf() {
    const janela = window.open('', '_blank', 'width=650,height=800')
    if (!janela) return
    janela.document.write(`
      <html>
        <head>
          <title>Orçamento${nome ? ' — ' + nome : ''}</title>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #0F172A; }
            .logo { width: 56px; height: 56px; margin-bottom: 8px; }
            h1 { font-size: 20px; margin: 0 0 2px 0; }
            .sub { color: #64748B; font-size: 13px; margin-bottom: 28px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            td { padding: 8px 0; border-bottom: 1px solid #E2E8F0; font-size: 14px; }
            td:last-child { text-align: right; }
            .total { background: #E0F9FF; border-radius: 10px; padding: 16px 20px; margin-top: 8px; }
            .total .label { font-size: 12px; color: #64748B; font-weight: 600; }
            .total .valor { font-size: 26px; font-weight: 800; color: #7C3AED; }
            .footer { margin-top: 40px; font-size: 11px; color: #94A3B8; }
          </style>
        </head>
        <body>
          <img class="logo" src="${window.location.origin}/logo.png" />
          <h1>DeCaires 3D — Orçamento</h1>
          <div class="sub">${new Date().toLocaleDateString('pt-BR')}${nome ? ' · ' + nome : ''}</div>
          <table>
            <tr><td>Peça</td><td>${nome || 'Peça personalizada'}</td></tr>
            <tr><td>Quantidade</td><td>${quantidade}</td></tr>
            <tr><td>Prazo estimado</td><td>A combinar</td></tr>
          </table>
          <div class="total">
            <div class="label">VALOR TOTAL</div>
            <div class="valor">${formatMoney(resultado.precoFinal)}</div>
          </div>
          <div class="footer">Orçamento gerado por DeCaires 3D. Válido por 7 dias — sujeito a alteração conforme detalhes finais da peça.</div>
        </body>
      </html>
    `)
    janela.document.close()
    janela.focus()
    setTimeout(() => janela.print(), 300)
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold m-0">Orçamento</h1>
      <p className="text-[var(--muted-foreground)] text-sm mt-0.5 mb-5">Calcula custo e preço sugerido pela peça {usandoMock && '(materiais de exemplo)'}</p>

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
          <Button variant="gradient" className="w-full mt-3.5" onClick={gerarPdf}><Send size={15} />Gerar orçamento PDF</Button>
          <Button variant="whatsapp" className="w-full mt-2" onClick={enviarWhatsApp}>Enviar por WhatsApp</Button>
        </Card>
      </div>
    </div>
  )
}
