import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, Package, Calculator, Users, Boxes,
  Wallet, BarChart2, Wrench, Settings, ChevronLeft, Tag, Receipt
} from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/agenda', label: 'Agenda', icon: Calendar },
  { to: '/pedidos', label: 'Pedidos', icon: Package },
  { to: '/orcamento', label: 'Orçamento', icon: Calculator },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/estoque', label: 'Estoque', icon: Boxes },
  { to: '/catalogo', label: 'Catálogo', icon: Tag },
  { to: '/custos', label: 'Custos', icon: Receipt },
  { to: '/financeiro', label: 'Financeiro', icon: Wallet },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart2 },
  { to: '/maquinario', label: 'Maquinário', icon: Wrench },
  { to: '/configuracoes', label: 'Configurações', icon: Settings }
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <div
      className={`relative bg-[var(--card)] border-r border-[var(--border)] flex flex-col gap-1 min-h-screen transition-all
      ${collapsed ? 'w-[72px] p-2.5' : 'w-[220px] p-3.5'}`}
    >
      <button
        onClick={onToggle}
        className="absolute top-6 -right-3 w-6 h-6 rounded-full bg-[var(--card)] border border-[var(--border)]
        flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--primary)] z-10"
      >
        <ChevronLeft size={14} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
      </button>

      <div className={`flex items-center gap-2.5 pb-5 ${collapsed ? 'justify-center' : 'px-2 pt-1'}`}>
        <img src="/logo.png" alt="DeCaires" className={`${collapsed ? 'w-10 h-10' : 'w-[72px] h-[72px]'} object-contain flex-shrink-0 transition-all`} />
        {!collapsed && (
          <div>
            <div className="font-bold text-[15px] leading-tight">DeCaires 3D</div>
            <div className="text-[11px] text-[var(--muted-foreground)] font-semibold">Gestão</div>
          </div>
        )}
      </div>

      {navItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-lg text-sm font-semibold cursor-pointer
            ${collapsed ? 'justify-center py-2.5' : 'px-3 py-2.5'}
            ${isActive ? 'bg-[var(--accent)] text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'}`
          }
        >
          <Icon size={17} className="flex-shrink-0" />
          {!collapsed && <span>{label}</span>}
        </NavLink>
      ))}
    </div>
  )
}
