import React from 'react'

export default function Home() {
  return (
    <div className="card">
      <h1 className="text-2xl font-bold">Healthcare DSS (Structured)</h1>
      <p className="mt-2">This app supports three structured decisions:
        staffing (hard coverage), inventory (fixed service level), and patient flow (SLA-based capacity).
      </p>
      <ul className="list-disc pl-6 my-3 space-y-1">
        <li>Staffing — meet coverage at minimum cost</li>
        <li>Inventory — EOQ/ROP under fixed policy SL</li>
        <li>Patient Flow — choose smallest s meeting wait/utilization targets</li>
      </ul>
      <p className="small">Use the navigation bar above to open each page.</p>
    </div>
  )
}
