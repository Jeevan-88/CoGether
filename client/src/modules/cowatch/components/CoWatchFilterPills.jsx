import React, { useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import './CoWatchFilterPills.css';

const GENRE_FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'POPULAR', label: 'Popular' },
  { id: 'MOVIES', label: 'Movies' },
  { id: 'SERIES', label: 'Series' },
  { id: 'ANIME', label: 'Anime' },
  { id: 'ACTION', label: 'Action' },
  { id: 'COMEDY', label: 'Comedy' },
  { id: 'DRAMA', label: 'Drama' },
  { id: 'SCI_FI', label: 'Sci-Fi' },
  { id: 'THRILLER', label: 'Thriller' },
  { id: 'HORROR', label: 'Horror' },
  { id: 'ROMANCE', label: 'Romance' },
  { id: 'DOCUMENTARY', label: 'Documentary' }
];

export default function CoWatchFilterPills({
  activeFilter = 'ALL',
  onSelectFilter
}) {
  const scrollRef = useRef(null);

  const handleScrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 240, behavior: 'smooth' });
    }
  };

  return (
    <div className="cowatch-filters-wrapper">
      <div className="cowatch-filters-scroll-track" ref={scrollRef}>
        {GENRE_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`cowatch-filter-pill-btn cowatch-filter-pill ${activeFilter === f.id ? 'active' : ''}`}
            onClick={() => onSelectFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="btn-filter-scroll-arrow"
        onClick={handleScrollRight}
        title="Scroll genres"
        aria-label="Scroll genres"
      >
        <ArrowRight size={15} />
      </button>
    </div>
  );
}
