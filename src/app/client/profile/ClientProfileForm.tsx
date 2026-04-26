'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { STATES } from '@/types'

interface Profile {
  id: string
  full_name: string
  phone?: string
  city?: string
  state?: string
  avatar_url?: string
}

interface Props {
  profile: Profile | null
  email: string
}

export default function ClientProfileForm({ profile, email }: Props) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? '',
    phone: profile?.phone ?? '',
    city: profile?.city ?? '',
    state: profile?.state ?? '',
  })
  const router = useRouter()

  const initials = (form.full_name || '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  async function save() {
    if (!form.full_name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError(null)

    const res = await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        city: form.city.trim() || null,
        state: form.state || null,
      }),
    })

    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to save profile')
      return
    }
    setSuccess(true)
    setEditing(false)
    router.refresh()
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <div className="bg-white border border-ink/8 rounded-xl p-7">
      {/* Avatar row */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-gold text-white flex items-center justify-center text-xl font-bold">
          {initials}
        </div>
        <div>
          <div className="font-semibold text-base text-ink">{form.full_name || 'Your Name'}</div>
          <div className="text-sm text-ink/45">{email}</div>
        </div>
        <div className="ml-auto">
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 text-sm font-medium border border-gold/60 text-gold rounded-lg hover:bg-gold/5 transition-colors"
            >
              Edit Profile
            </button>
          ) : (
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 text-sm font-medium border border-ink/20 text-ink/50 rounded-lg hover:bg-cream transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {success && (
        <div className="mb-4 px-4 py-3 bg-law-green/10 border border-law-green/30 rounded-lg text-sm text-law-green font-medium">
          Profile updated successfully.
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* Full name */}
        <div>
          <label className="block text-xs font-medium text-ink/45 mb-1.5 uppercase tracking-wide">Full Name</label>
          {editing ? (
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-ink/15 bg-cream text-ink text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30"
            />
          ) : (
            <div className="px-4 py-2.5 bg-cream rounded-lg text-sm text-ink">{form.full_name || '—'}</div>
          )}
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-xs font-medium text-ink/45 mb-1.5 uppercase tracking-wide">Email</label>
          <div className="px-4 py-2.5 bg-cream rounded-lg text-sm text-ink/50">{email}</div>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-xs font-medium text-ink/45 mb-1.5 uppercase tracking-wide">Phone</label>
          {editing ? (
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 98765 43210"
              className="w-full px-4 py-2.5 rounded-lg border border-ink/15 bg-cream text-ink text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30"
            />
          ) : (
            <div className="px-4 py-2.5 bg-cream rounded-lg text-sm text-ink">{form.phone || '—'}</div>
          )}
        </div>

        {/* City */}
        <div>
          <label className="block text-xs font-medium text-ink/45 mb-1.5 uppercase tracking-wide">City</label>
          {editing ? (
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-ink/15 bg-cream text-ink text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30"
            />
          ) : (
            <div className="px-4 py-2.5 bg-cream rounded-lg text-sm text-ink">{form.city || '—'}</div>
          )}
        </div>

        {/* State */}
        <div>
          <label className="block text-xs font-medium text-ink/45 mb-1.5 uppercase tracking-wide">State</label>
          {editing ? (
            <select
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-ink/15 bg-cream text-ink text-sm focus:outline-none focus:border-gold"
            >
              <option value="">Select state</option>
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : (
            <div className="px-4 py-2.5 bg-cream rounded-lg text-sm text-ink">{form.state || '—'}</div>
          )}
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {editing && (
        <button
          onClick={save}
          disabled={saving}
          className="mt-6 w-full py-3 bg-gold text-ink font-semibold rounded-lg hover:bg-gold-light transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      )}
    </div>
  )
}
