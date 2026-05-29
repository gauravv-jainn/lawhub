/**
 * /lawyers — Public lawyer directory.
 * Filterable by practice area, state, experience range.
 * Sortable by rating, experience, case count.
 * No auth required — used by prospective clients.
 */

import prisma from '@/lib/prisma';
import Link from 'next/link';
import RatingStars from '@/components/shared/RatingStars';
import LawyerDirectoryFilters from './LawyerDirectoryFilters';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

const VALID_SORT = ['rating', 'experience', 'cases', 'newest'] as const;
type Sort = typeof VALID_SORT[number];

const PRACTICE_AREAS = [
  'Criminal', 'Property', 'Family', 'Corporate', 'Consumer',
  'Labour', 'Intellectual Property', 'Taxation', 'Civil',
  'Constitutional', 'Immigration', 'Insurance', 'Banking',
];

const EXPERIENCE_RANGES = [
  { label: 'Any',        min: 0,  max: 100 },
  { label: '0–3 yrs',   min: 0,  max: 3 },
  { label: '3–7 yrs',   min: 3,  max: 7 },
  { label: '7–15 yrs',  min: 7,  max: 15 },
  { label: '15+ yrs',   min: 15, max: 100 },
];

const PAGE_SIZE = 24;

export default async function LawyersPage({
  searchParams,
}: {
  searchParams: {
    q?:         string;
    area?:      string;
    state?:     string;
    exp?:       string;
    sort?:      string;
    page?:      string;
  };
}) {
  const q      = searchParams.q?.trim() ?? '';
  const area   = PRACTICE_AREAS.includes(searchParams.area ?? '') ? searchParams.area! : '';
  const state  = searchParams.state?.trim() ?? '';
  const sort   = (VALID_SORT as readonly string[]).includes(searchParams.sort ?? '') ? searchParams.sort as Sort : 'rating';
  const page   = Math.max(1, Number(searchParams.page ?? '1'));

  // Experience range
  const expParam = searchParams.exp ?? '';
  const expRange = EXPERIENCE_RANGES.find(r => `${r.min}-${r.max}` === expParam)
    ?? EXPERIENCE_RANGES[0];

  // Build user sub-filter (merges search query + state filter safely)
  const userWhere: Prisma.UserWhereInput | undefined = (q || state) ? {
    ...(q ? {
      OR: [
        { full_name: { contains: q, mode: 'insensitive' } },
        { city:      { contains: q, mode: 'insensitive' } },
        { state:     { contains: q, mode: 'insensitive' } },
      ],
    } : {}),
    ...(state ? { state: { equals: state } } : {}),
  } : undefined;

  // Build where clause
  const where: Prisma.LawyerProfileWhereInput = {
    verification_status: 'verified',
    ...(area ? { practice_areas: { has: area } } : {}),
    experience_years: { gte: expRange.min, lte: expRange.max },
    ...(userWhere ? { user: userWhere } : {}),
  };

  const orderBy = (() => {
    switch (sort) {
      case 'experience': return { experience_years: 'desc' as const };
      case 'cases':      return { total_cases:      'desc' as const };
      case 'newest':     return { created_at:        'desc' as const };
      default:           return { avg_rating:         'desc' as const };
    }
  })();

  const [lawyers, total, allStates] = await Promise.all([
    prisma.lawyerProfile.findMany({
      where,
      orderBy,
      skip:  (page - 1) * PAGE_SIZE,
      take:  PAGE_SIZE,
      select: {
        id: true,
        primary_court: true,
        experience_years: true,
        practice_areas: true,
        avg_rating: true,
        review_count: true,
        total_cases: true,
        lawyer_type: true,
        bio: true,
        user: { select: { id: true, full_name: true, city: true, state: true } },
      },
    }),
    prisma.lawyerProfile.count({ where }),
    prisma.user.findMany({
      where: { role: 'lawyer', lawyer_profile: { verification_status: 'verified' }, state: { not: null } },
      select: { state: true },
      distinct: ['state'],
      orderBy: { state: 'asc' },
    }),
  ]);

  const pages     = Math.ceil(total / PAGE_SIZE);
  const stateList = allStates.map(u => u.state).filter(Boolean) as string[];

  function buildHref(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { q, area, state, exp: expParam, sort, page: String(page), ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== 'Any') params.set(k, v);
    }
    const str = params.toString();
    return `/lawyers${str ? `?${str}` : ''}`;
  }

  const LAWYER_TYPE_LABEL: Record<string, string> = {
    junior_advocate: 'Junior Advocate',
    senior_advocate: 'Senior Advocate',
    associate:       'Associate',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      {/* Header */}
      <div style={{ background: 'var(--ink-2)', padding: '48px 40px 32px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '11px', color: 'rgba(245,240,232,0.4)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '12px' }}>
            LawHub
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '38px', fontWeight: 600, color: 'var(--cream)', margin: '0 0 8px' }}>
            Find an Advocate
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(245,240,232,0.55)', margin: '0 0 28px' }}>
            {total.toLocaleString()} verified advocates across India
          </p>

          {/* Search + filters — client component */}
          <LawyerDirectoryFilters
            q={q}
            area={area}
            state={state}
            expParam={expParam}
            sort={sort}
            areas={PRACTICE_AREAS}
            states={stateList}
            expRanges={EXPERIENCE_RANGES}
          />
        </div>
      </div>

      {/* Results */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', color: 'rgba(14,12,10,0.45)' }}>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()} advocates
            {area && ` · ${area}`}
            {state && ` · ${state}`}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['rating', 'experience', 'cases'] as Sort[]).map((s) => (
              <a key={s} href={buildHref({ sort: s, page: '1' })} style={{
                padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 500,
                textDecoration: 'none', textTransform: 'capitalize',
                background: sort === s ? 'var(--ink)' : 'rgba(14,12,10,0.06)',
                color: sort === s ? 'white' : 'rgba(14,12,10,0.55)',
              }}>
                {s === 'rating' ? 'Top Rated' : s === 'experience' ? 'Most Experienced' : 'Most Cases'}
              </a>
            ))}
          </div>
        </div>

        {lawyers.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '16px', padding: '64px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔍</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>
              No advocates found
            </div>
            <p style={{ fontSize: '14px', color: 'rgba(14,12,10,0.4)' }}>
              Try adjusting your filters or broadening your search.
            </p>
            <a href="/lawyers" style={{ display: 'inline-block', marginTop: '16px', padding: '9px 20px', borderRadius: '8px', background: 'var(--gold)', color: 'white', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
              Clear all filters
            </a>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {lawyers.map((lp) => {
              const initials = (lp.user.full_name ?? '?')
                .split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
              return (
                <Link
                  key={lp.id}
                  href={`/lawyer-profile/${lp.user.id}`}
                  style={{
                    display: 'block', background: 'white',
                    border: '1px solid rgba(14,12,10,0.08)',
                    borderRadius: '14px', padding: '22px',
                    textDecoration: 'none',
                    transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
                  }}
                  className="lawyer-card"
                >
                  <div style={{ display: 'flex', gap: '14px', marginBottom: '14px' }}>
                    {/* Avatar */}
                    <div style={{
                      width: '52px', height: '52px', borderRadius: '50%',
                      background: 'var(--teal)', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px', fontWeight: 700, fontFamily: "'Cormorant Garamond', serif",
                      flexShrink: 0,
                    }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: '18px', fontWeight: 600, color: 'var(--ink)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {lp.user.full_name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.45)', marginTop: '2px' }}>
                        {LAWYER_TYPE_LABEL[lp.lawyer_type] ?? lp.lawyer_type} · {lp.experience_years} yrs exp
                      </div>
                    </div>
                  </div>

                  {/* Rating + location */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <RatingStars rating={lp.avg_rating} count={lp.review_count} />
                    <div style={{ fontSize: '11px', color: 'rgba(14,12,10,0.4)' }}>
                      {[lp.user.city, lp.user.state].filter(Boolean).join(', ') || lp.primary_court}
                    </div>
                  </div>

                  {/* Practice areas */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: lp.bio ? '12px' : '0' }}>
                    {(lp.practice_areas as string[]).slice(0, 4).map((a) => (
                      <span key={a} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '100px', background: 'rgba(13,115,119,0.08)', color: 'var(--teal)', fontWeight: 500 }}>
                        {a}
                      </span>
                    ))}
                    {(lp.practice_areas as string[]).length > 4 && (
                      <span style={{ fontSize: '10px', color: 'rgba(14,12,10,0.35)', padding: '2px 4px' }}>
                        +{(lp.practice_areas as string[]).length - 4}
                      </span>
                    )}
                  </div>

                  {/* Bio excerpt */}
                  {lp.bio && (
                    <p style={{
                      fontSize: '12px', color: 'rgba(14,12,10,0.5)',
                      lineHeight: 1.5, margin: 0,
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {lp.bio}
                    </p>
                  )}

                  {/* Footer stats */}
                  <div style={{ display: 'flex', gap: '16px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(14,12,10,0.06)' }}>
                    {lp.total_cases > 0 && (
                      <div>
                        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>{lp.total_cases}</div>
                        <div style={{ fontSize: '10px', color: 'rgba(14,12,10,0.4)' }}>cases</div>
                      </div>
                    )}
                    {lp.review_count > 0 && (
                      <div>
                        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>{lp.avg_rating.toFixed(1)}</div>
                        <div style={{ fontSize: '10px', color: 'rgba(14,12,10,0.4)' }}>avg rating</div>
                      </div>
                    )}
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--teal)', fontWeight: 600 }}>View Profile →</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ display: 'flex', gap: '6px', marginTop: '32px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {page > 1 && (
              <a href={buildHref({ page: String(page - 1) })} style={{ padding: '7px 14px', borderRadius: '6px', background: 'rgba(14,12,10,0.06)', color: 'var(--ink)', textDecoration: 'none', fontSize: '12px' }}>
                ← Prev
              </a>
            )}
            {Array.from({ length: Math.min(pages, 8) }, (_, i) => i + 1).map((p) => (
              <a key={p} href={buildHref({ page: String(p) })} style={{
                width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '6px', fontSize: '13px', fontWeight: 500, textDecoration: 'none',
                background: p === page ? 'var(--ink)' : 'rgba(14,12,10,0.06)',
                color: p === page ? 'white' : 'var(--ink)',
              }}>
                {p}
              </a>
            ))}
            {page < pages && (
              <a href={buildHref({ page: String(page + 1) })} style={{ padding: '7px 14px', borderRadius: '6px', background: 'rgba(14,12,10,0.06)', color: 'var(--ink)', textDecoration: 'none', fontSize: '12px' }}>
                Next →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
