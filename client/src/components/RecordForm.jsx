import { useState } from 'react'
import { addRecord } from '../db.js'

const CATEGORIES = ['Inspection', 'Maintenance', 'Survey', 'Safety Audit', 'Environmental', 'General']
const PRIORITIES  = ['Low', 'Medium', 'High', 'Critical']
const STATUSES    = ['Open', 'In Progress', 'Resolved']

const EMPTY = { title: '', category: 'Inspection', priority: 'Medium', status: 'Open', location: '', notes: '' }

const PRIORITY_COLORS = { Low: '#22c55e', Medium: '#f59e0b', High: '#f97316', Critical: '#ef4444' }

export default function RecordForm({ onAdded, isOnline, serverIsUp }) {
  const [form, setForm]     = useState(EMPTY)
  const [busy, setBusy]     = useState(false)
  const [toast, setToast]   = useState(null) // { type, msg }
  const [error, setError]   = useState(null)

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  function showToast(type, msg) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) { setError('Title is required.'); return }
    setBusy(true)
    setError(null)
    try {
      await addRecord({
        title:    form.title.trim(),
        category: form.category,
        priority: form.priority.toLowerCase(),
        status:   form.status.toLowerCase().replace(' ', '_'),
        location: form.location.trim(),
        notes:    form.notes.trim(),
      })
      setForm(EMPTY)
      const syncHint = isOnline && serverIsUp
        ? 'Syncing to server…'
        : 'Queued locally — will sync when online.'
      showToast('success', `Record saved. ${syncHint}`)
      onAdded?.()
    } catch {
      setError('Failed to save record locally.')
    } finally {
      setBusy(false)
    }
  }

  const priColor = PRIORITY_COLORS[form.priority] ?? '#94a3b8'

  return (
    <section className="form-card">
      {/* Toast */}
      {toast && (
        <div className={`form-toast form-toast--${toast.type}`}>
          {toast.type === 'success' ? '✓' : '!'} {toast.msg}
        </div>
      )}

      <div className="form-card__header">
        <div className="form-card__title-row">
          <span className="form-card__icon">📋</span>
          <h2 className="form-card__title">New Field Record</h2>
        </div>
        <span className="form-card__mode-pill" style={{ background: isOnline && serverIsUp ? 'rgba(34,197,94,.12)' : 'rgba(245,158,11,.12)', color: isOnline && serverIsUp ? '#16a34a' : '#d97706' }}>
          {isOnline && serverIsUp ? '● Live sync' : '● Offline mode'}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="record-form" noValidate>

        {/* Title */}
        <div className="field">
          <label className="field__label" htmlFor="title">Title <span className="field__req">*</span></label>
          <input
            id="title"
            className="field__input"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="e.g. Pump Station Inspection — Zone 4"
            required
          />
        </div>

        {/* Row: category / priority / status */}
        <div className="field-row">
          <div className="field">
            <label className="field__label" htmlFor="category">Category</label>
            <select id="category" className="field__input" value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field__label" htmlFor="priority">
              Priority
              <span className="priority-dot" style={{ background: priColor }} />
            </label>
            <select id="priority" className="field__input" value={form.priority} onChange={e => set('priority', e.target.value)}>
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field__label" htmlFor="status">Status</label>
            <select id="status" className="field__input" value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Location */}
        <div className="field">
          <label className="field__label" htmlFor="location">📍 Location</label>
          <input
            id="location"
            className="field__input"
            value={form.location}
            onChange={e => set('location', e.target.value)}
            placeholder="e.g. Site B — Building 3, Floor 2"
          />
        </div>

        {/* Notes */}
        <div className="field">
          <label className="field__label" htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            className="field__input field__textarea"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            rows={3}
            placeholder="Observations, measurements, action items…"
          />
        </div>

        {error && <p className="field__error">{error}</p>}

        <button type="submit" className="submit-btn" disabled={busy}>
          {busy
            ? <><span className="submit-spinner" />Saving…</>
            : <><span>+</span> Submit Record</>
          }
        </button>
      </form>
    </section>
  )
}
