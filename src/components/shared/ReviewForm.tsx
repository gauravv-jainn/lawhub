'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Star } from 'lucide-react'

interface ReviewFormProps {
  caseId: string
  lawyerId: string
  lawyerName: string
}

export default function ReviewForm({ caseId, lawyerId, lawyerName }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [review, setReview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function submit() {
    if (rating === 0) { setError('Please select a rating'); return }
    if (review.trim().length < 20) { setError('Please write at least 20 characters'); return }

    setSubmitting(true)
    setError(null)

    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        case_id: caseId,
        lawyer_id: lawyerId,
        rating,
        review: review.trim(),
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to submit review')
      setSubmitting(false)
      return
    }

    setDone(true)
    router.refresh()
  }

  if (done) {
    return (
      <div className="bg-law-green/10 border border-law-green/30 rounded-xl p-6 text-center">
        <div className="text-2xl mb-2">⭐</div>
        <p className="text-ink font-semibold">Review submitted!</p>
        <p className="text-sm text-ink/60 mt-1">Thank you for your feedback.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-ink/10 p-6">
      <h3 className="font-cormorant text-xl text-ink mb-1">Rate your experience</h3>
      <p className="text-sm text-ink/50 mb-5">How was working with Adv. {lawyerName}?</p>

      {/* Star rating */}
      <div className="flex gap-1 mb-5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => setRating(star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`w-8 h-8 transition-colors ${
                star <= (hovered || rating)
                  ? 'fill-gold text-gold'
                  : 'text-ink/20'
              }`}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 self-center text-sm text-ink/50">
            {['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][rating]}
          </span>
        )}
      </div>

      {/* Written review */}
      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        rows={4}
        placeholder="Share your experience — was the advocate responsive, professional, and effective in handling your case?"
        className="w-full px-4 py-3 rounded-lg border border-ink/15 bg-cream text-ink text-sm resize-none focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30"
      />

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

      <button
        onClick={submit}
        disabled={submitting}
        className="mt-4 px-6 py-2.5 bg-gold text-ink text-sm font-semibold rounded-lg hover:bg-gold-light transition-colors disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit Review'}
      </button>
    </div>
  )
}
