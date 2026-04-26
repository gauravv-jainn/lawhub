interface RatingStarsProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  count?: number;
}

export default function RatingStars({ rating, size = 'sm', showValue = true, count }: RatingStarsProps) {
  const sizes = { sm: '13px', md: '16px', lg: '20px' };
  const fontSize = sizes[size];

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <span style={{ color: '#EEC900', fontSize, letterSpacing: '0.5px' }}>
        {Array.from({ length: 5 }).map((_, i) => {
          if (i < Math.floor(rating)) return '★';
          if (i < rating) return '½';
          return '☆';
        }).join('')}
      </span>
      {showValue && (
        <span style={{ fontSize: '12px', color: 'rgba(14,12,10,0.5)', fontWeight: 500 }}>
          {rating.toFixed(1)}
          {count !== undefined && <span style={{ fontWeight: 400 }}> ({count})</span>}
        </span>
      )}
    </span>
  );
}
