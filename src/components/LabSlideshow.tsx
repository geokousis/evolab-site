import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { LabPhoto } from '../lib/siteContent';

type Props = {
  photos: LabPhoto[];
  autoPlayInterval?: number;
};

export function LabSlideshow({ photos, autoPlayInterval = 5000 }: Props) {
  const [index, setIndex] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto || photos.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % photos.length), autoPlayInterval);
    return () => clearInterval(id);
  }, [auto, photos.length, autoPlayInterval]);

  if (!photos.length) return null;

  const prev = () => { setAuto(false); setIndex((i) => (i - 1 + photos.length) % photos.length); };
  const next = () => { setAuto(false); setIndex((i) => (i + 1) % photos.length); };
  const goTo = (i: number) => { setAuto(false); setIndex(i); };

  const current = photos[index];

  return (
    <div className="lab-slideshow">
      <div className="lab-slide-frame">
        <img
          key={current.id}
          src={current.imageUrl}
          alt={current.alt || current.caption || `Lab photo ${index + 1}`}
          className="lab-slide-img"
        />

        {current.caption && (
          <div className="lab-slide-caption">
            <p>{current.caption}</p>
          </div>
        )}

        {photos.length > 1 && (
          <>
            <button className="lab-slide-arrow lab-slide-arrow--prev" onClick={prev} aria-label="Previous photo" type="button">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button className="lab-slide-arrow lab-slide-arrow--next" onClick={next} aria-label="Next photo" type="button">
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="lab-slide-counter">{index + 1} / {photos.length}</div>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className="lab-slide-dots">
          {photos.map((_, i) => (
            <button
              key={i}
              className={`lab-slide-dot ${i === index ? 'is-active' : ''}`}
              onClick={() => goTo(i)}
              aria-label={`Go to photo ${i + 1}`}
              type="button"
            />
          ))}
        </div>
      )}
    </div>
  );
}
