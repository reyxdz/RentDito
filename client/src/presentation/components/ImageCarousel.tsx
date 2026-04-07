import { useState, useCallback } from 'react';
import { Box, IconButton } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';

interface ImageCarouselProps {
  images: string[];
  height?: number | string;
  borderRadius?: number;
}

export default function ImageCarousel({
  images,
  height = 220,
  borderRadius = 12,
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    },
    [images.length]
  );

  const handleNext = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    },
    [images.length]
  );

  const handleDot = useCallback((e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setCurrentIndex(index);
  }, []);

  if (!images.length) {
    return (
      <Box
        sx={{
          height,
          borderRadius: `${borderRadius}px`,
          bgcolor: 'action.hover',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.secondary',
          fontSize: '0.875rem',
        }}
      >
        No images available
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'relative',
        height,
        borderRadius: `${borderRadius}px`,
        overflow: 'hidden',
        '&:hover .carousel-controls': { opacity: 1 },
      }}
    >
      {/* Image slides */}
      <Box
        sx={{
          display: 'flex',
          transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: `translateX(-${currentIndex * 100}%)`,
          height: '100%',
        }}
      >
        {images.map((src, i) => (
          <Box
            key={i}
            component="img"
            src={src}
            alt={`Slide ${i + 1}`}
            loading="lazy"
            sx={{
              minWidth: '100%',
              height: '100%',
              objectFit: 'cover',
              flexShrink: 0,
            }}
          />
        ))}
      </Box>

      {/* Prev / Next arrows — only show when multiple images */}
      {images.length > 1 && (
        <Box
          className="carousel-controls"
          sx={{
            opacity: 0,
            transition: 'opacity 0.25s ease',
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 0.5,
            pointerEvents: 'none',
          }}
        >
          <IconButton
            onClick={handlePrev}
            size="small"
            sx={{
              pointerEvents: 'auto',
              bgcolor: 'rgba(0,0,0,0.45)',
              color: '#fff',
              width: 32,
              height: 32,
              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
            }}
          >
            <ChevronLeft fontSize="small" />
          </IconButton>
          <IconButton
            onClick={handleNext}
            size="small"
            sx={{
              pointerEvents: 'auto',
              bgcolor: 'rgba(0,0,0,0.45)',
              color: '#fff',
              width: 32,
              height: 32,
              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
            }}
          >
            <ChevronRight fontSize="small" />
          </IconButton>
        </Box>
      )}

      {/* Dot indicators */}
      {images.length > 1 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 0.75,
          }}
        >
          {images.map((_, i) => (
            <Box
              key={i}
              onClick={(e) => handleDot(e, i)}
              sx={{
                width: i === currentIndex ? 18 : 7,
                height: 7,
                borderRadius: 4,
                bgcolor: i === currentIndex ? '#fff' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
