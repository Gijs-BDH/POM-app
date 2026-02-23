base = "pom-app/src/components/"

with open(base+"InfoCard.jsx", "w", encoding="utf-8") as f:
    f.write("""export default function InfoCard({ children }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
      <div className="font-semibold mb-1">\u2139 Info</div>
      {children}
    </div>
  )
}
""")

with open(base+"DashboardCard.jsx", "w", encoding="utf-8") as f:
    f.write("""import { calcTotaalBVO, calcKosten, formatEuro } from '../utils/calculations'

export default function DashboardCard({ voorzieningen }) {
  const totaalBVO = calcTotaalBVO(voorzieningen)
  const { bouwkosten, tco } = calcKosten(totaalBVO)

  return (
    <div className="bg-white rounded-xl shadow p-4 min-w-[220px]">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-3 font-semibold">Dashboard</div>
      <div className="space-y-3">
        <div>
          <div className="text-xs text-gray-400">Totaal BVO</div>
          <div className="text-lg font-bold text-gray-800">{totaalBVO.toLocaleString('nl-NL')} m²</div>
        </div>
        <div className="border-t pt-2">
          <div className="text-xs text-gray-400">Bouwkosten (indicatief)</div>
          <div className="text-lg font-bold text-purple-700">{formatEuro(bouwkosten)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">TCO 50 jaar (indicatief)</div>
          <div className="text-lg font-bold text-orange-600">{formatEuro(tco)}</div>
        </div>
        <div className="text-xs text-gray-300 italic">* placeholder formules</div>
      </div>
    </div>
  )
}
""")

with open(base+"NavPanel.jsx", "w", encoding="utf-8") as f:
    f.write("""import { useNavigate, useParams } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'

export default function NavPanel() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getProject } = useProject()
  const project = getProject(id)

  if (\!project) return null

  const hasPVE = project.pve \!== null
  const hasGebied = project.gebiedVarianten && project.gebiedVarianten.length > 0
  const hasGebouw = project.gebouwVarianten && project.gebouwVarianten.length > 0

  const items = [
    {
      label: 'PVE',
      path: `/project/${id}/pve/stap-1`,
      highlight: \!hasPVE,
      enabled: true,
    },
    {
      label: 'Gebied',
      path: `/project/${id}/gebied/stap-1`,
      highlight: hasPVE && \!hasGebied,
      enabled: hasPVE,
    },
    {
      label: 'Gebouw',
      path: `/project/${id}/gebouw`,
      highlight: hasPVE && hasGebied && \!hasGebouw,
      enabled: hasPVE && hasGebied,
    },
    {
      label: 'Besluit',
      path: `/project/${id}/besluit`,
      highlight: hasPVE && hasGebied && hasGebouw,
      enabled: hasPVE && hasGebied && hasGebouw,
    },
  ]

  return (
    <div className="w-40 bg-white shadow-md rounded-xl p-3 flex flex-col gap-2">
      {items.map(item => (
        <button
          key={item.label}
          onClick={() => item.enabled && navigate(item.path)}
          disabled={\!item.enabled}
          className={`
            w-full py-2 px-3 rounded-lg text-sm font-semibold text-left transition-colors
            ${item.highlight
              ? 'bg-purple-600 text-white shadow-md'
              : item.enabled
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-gray-50 text-gray-300 cursor-not-allowed'
            }
          `}
