'use client'
import { useEffect, useState } from 'react'

type Project = { id: string; name: string; client_name: string; status: string; scheduled_date: string; priority: string }
const STATUS_COLORS: Record<string, string> = { scheduled:'bg-blue-100 text-blue-700', in_progress:'bg-amber-100 text-amber-700', completed:'bg-green-100 text-green-700', invoiced:'bg-purple-100 text-purple-700' }

export default function CalendarPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth())
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => { fetch('/api/projects').then(r=>r.json()).then(setProjects) }, [])

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthStr = `${year}-${String(month+1).padStart(2,'0')}`
  const monthProjects = projects.filter(p => p.scheduled_date?.startsWith(monthStr))
  const byDay: Record<string, Project[]> = {}
  for (const p of monthProjects) {
    const day = p.scheduled_date.slice(8, 10)
    if (!byDay[day]) byDay[day] = []
    byDay[day].push(p)
  }

  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const today = new Date().toISOString().slice(0, 10)
  const selectedProjects = selected ? (byDay[selected] ?? []) : []

  function prev() { if (month === 0) { setMonth(11); setYear(y=>y-1) } else setMonth(m=>m-1) }
  function next() { if (month === 11) { setMonth(0); setYear(y=>y+1) } else setMonth(m=>m+1) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Project Calendar</h1>
        <div className="flex items-center gap-3">
          <button onClick={prev} className="btn-secondary text-xs px-3 py-1.5">← Prev</button>
          <span className="text-sm font-semibold text-gray-700 w-36 text-center">
            {new Date(year, month).toLocaleDateString('en-IN', { month:'long', year:'numeric' })}
          </span>
          <button onClick={next} className="btn-secondary text-xs px-3 py-1.5">Next →</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {dayNames.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">{d}</div>
        ))}
        {[...Array(firstDay)].map((_,i) => <div key={`e${i}`} />)}
        {[...Array(daysInMonth)].map((_, i) => {
          const day = String(i+1).padStart(2,'0')
          const dateStr = `${monthStr}-${day}`
          const dayProjects = byDay[day] ?? []
          const isToday = dateStr === today
          const isSelected = selected === day
          return (
            <div key={day} onClick={() => setSelected(isSelected ? null : day)}
              className={`min-h-[80px] rounded-lg p-1.5 cursor-pointer border transition-all ${isToday ? 'border-amber-400 bg-amber-50' : isSelected ? 'border-blue-400 bg-blue-50' : dayProjects.length ? 'border-gray-200 bg-white hover:border-amber-300' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'}`}>
              <p className={`text-xs font-bold mb-1 ${isToday ? 'text-amber-600' : 'text-gray-600'}`}>{i+1}</p>
              {dayProjects.slice(0,2).map(p => (
                <div key={p.id} className={`text-[10px] px-1 py-0.5 rounded mb-0.5 truncate font-medium ${STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>{p.name}</div>
              ))}
              {dayProjects.length > 2 && <div className="text-[10px] text-gray-400 font-medium">+{dayProjects.length-2} more</div>}
            </div>
          )
        })}
      </div>

      {selectedProjects.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Jobs on {new Date(year, month, parseInt(selected!)).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}
          </h3>
          <div className="space-y-2">
            {selectedProjects.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.client_name}</p>
                </div>
                <span className={`badge ${STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>{p.status.replace('_',' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {monthProjects.length === 0 && (
        <div className="card text-center py-8 text-gray-400">
          <p className="text-2xl mb-2">📅</p>
          <p className="font-medium">No projects scheduled this month</p>
        </div>
      )}
    </div>
  )
}
