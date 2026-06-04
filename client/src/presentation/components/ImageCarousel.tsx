import { useState, useCallback } from 'react';
import { Box, IconButton, Dialog, Typography } from '@mui/material';
import { ChevronLeft, ChevronRight, Fullscreen, Close } from '@mui/icons-material';
import { getImageUrl } from '../../infrastructure/api/apiClient';

interface ImageCarouselProps {
  images: string[];
  height?: number | string | Partial<Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', number | string>>;
  borderRadius?: number;
  arrowPosition?: 'inside' | 'outside';
}

export default function ImageCarousel({
  images,
  height = 220,
  borderRadius = 12,
  arrowPosition = 'inside',
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      handleNext();
    }
    if (isRightSwipe) {
      handlePrev();
    }
  };

  const handlePrev = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    },
    [images.length]
  );

  const handleNext = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    },
    [images.length]
  );

  const handleDot = useCallback((e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setCurrentIndex(index);
  }, []);

  // Fullscreen Modal
  if (isFullscreen) {
    return (
      <Dialog
        open={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        maxWidth={false}
        fullWidth
        fullScreen
        PaperProps={{
          sx: {
            bgcolor: 'rgb(0, 0, 0)',
            m: 0,
            maxHeight: '100vh',
            borderRadius: 0,
          },
        }}
      >
        <Box
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            bgcolor: '#000',
          }}
        >
          {/* Close Button */}
          <IconButton
            onClick={() => setIsFullscreen(false)}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              color: '#fff',
              bgcolor: 'rgba(0,0,0,0.5)',
              zIndex: 10,
              '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
            }}
          >
            <Close />
          </IconButton>

          {/* Left Arrow */}
          {images.length > 1 && (
            <IconButton
              onClick={handlePrev}
              sx={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#fff',
                bgcolor: 'rgba(0,0,0,0.5)',
                width: 50,
                height: 50,
                zIndex: 10,
                display: { xs: 'none', sm: 'inline-flex' },
                '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
              }}
            >
              <ChevronLeft sx={{ fontSize: 32 }} />
            </IconButton>
          )}

          <Box
            component="img"
            src={getImageUrl(images[currentIndex])}
            alt={`Slide ${currentIndex + 1}`}
            sx={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
          />

          {/* Right Arrow */}
          {images.length > 1 && (
            <IconButton
              onClick={handleNext}
              sx={{
                position: 'absolute',
                right: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#fff',
                bgcolor: 'rgba(0,0,0,0.5)',
                width: 50,
                height: 50,
                zIndex: 10,
                display: { xs: 'none', sm: 'inline-flex' },
                '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
              }}
            >
              <ChevronRight sx={{ fontSize: 32 }} />
            </IconButton>
          )}

          {/* Dot indicators */}
          {images.length > 1 && (
            <Box
              sx={{
                position: 'absolute',
                bottom: 24,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: 1,
              }}
            >
              {images.map((_, i) => (
                <Box
                  key={i}
                  onClick={(e) => handleDot(e, i)}
                  sx={{
                    width: currentIndex === i ? 32 : 10,
                    height: 10,
                    borderRadius: 1,
                    bgcolor: currentIndex === i ? '#fff' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.8)' },
                  }}
                />
              ))}
            </Box>
          )}

          {/* Image counter */}
          <Typography
            sx={{
              position: 'absolute',
              bottom: 24,
              right: 24,
              color: '#fff',
              bgcolor: 'rgba(0,0,0,0.5)',
              px: 2,
              py: 1,
              borderRadius: 1,
              fontSize: '0.875rem',
            }}
          >
            {currentIndex + 1} / {images.length}
          </Typography>
        </Box>
      </Dialog>
    );
  }

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
if (arrowPosition === 'outside') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {/* Left Arrow */}
        <IconButton
          onClick={handlePrev}
          size="small"
          sx={{
            bgcolor: 'action.hover',
            color: 'text.secondary',
            width: 40,
            height: 40,
            flexShrink: 0,
            display: { xs: 'none', sm: 'inline-flex' },
            '&:hover': { bgcolor: 'primary.main', color: '#fff' },
          }}
        >
          <ChevronLeft />
        </IconButton>

        {/* Carousel */}
        <Box
          sx={{
            position: 'relative',
            height,
            borderRadius: `${borderRadius}px`,
            overflow: 'hidden',
            flex: 1,
            '&:hover .fullscreen-btn': { opacity: 1 },
          }}
        >
          {/* Image slides */}
          <Box
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            sx={{
              display: 'flex',
              transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: `translateX(-${currentIndex * (100 / images.length)}%)`,
              height: '100%',
              width: `${images.length * 100}%`,
            }}
          >
            {images.map((src, i) => (
              <Box
                key={i}
                component="img"
                src={getImageUrl(src)}
                alt={`Slide ${i + 1}`}
                loading="lazy"
                sx={{
                  width: `${100 / images.length}%`,
                  height: '100%',
                  objectFit: 'cover',
                  flexShrink: 0,
                }}
              />
            ))}
          </Box>

          {/* Fullscreen Button */}
          <IconButton
            onClick={() => setIsFullscreen(true)}
            className="fullscreen-btn"
            size="small"
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: 'rgba(0,0,0,0.45)',
              color: '#fff',
              width: 32,
              height: 32,
              opacity: 0,
              transition: 'opacity 0.25s ease',
              zIndex: 5,
              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
            }}
          >
            <Fullscreen fontSize="small" />
          </IconButton>

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
                    width: currentIndex === i ? 24 : 8,
                    height: 8,
                    borderRadius: 1,
                    bgcolor: currentIndex === i ? 'primary.main' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.8)' },
                  }}
                />
              ))}
            </Box>
          )}
        </Box>

        {/* Right Arrow */}
        <IconButton
          onClick={handleNext}
          size="small"
          sx={{
            bgcolor: 'action.hover',
            color: 'text.secondary',
            width: 40,
            height: 40,
            flexShrink: 0,
            display: { xs: 'none', sm: 'inline-flex' },
            '&:hover': { bgcolor: 'primary.main', color: '#fff' },
          }}
        >
          <ChevronRight />
        </IconButton>
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
        '&:hover .fullscreen-btn': { opacity: 1 },
      }}
    >
      {/* Image slides */}
      <Box
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        sx={{
          display: 'flex',
          transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: `translateX(-${currentIndex * (100 / images.length)}%)`,
          height: '100%',
          width: `${images.length * 100}%`,
        }}
      >
        {images.map((src, i) => (
          <Box
            key={i}
            component="img"
            src={getImageUrl(src)}
            alt={`Slide ${i + 1}`}
            loading="lazy"
            sx={{
              width: `${100 / images.length}%`,
              height: '100%',
              objectFit: 'cover',
              flexShrink: 0,
            }}
          />
        ))}
      </Box>

      {/* Fullscreen Button */}
      <IconButton
        onClick={() => setIsFullscreen(true)}
        className="fullscreen-btn"
        size="small"
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          bgcolor: 'rgba(0,0,0,0.45)',
          color: '#fff',
          width: 32,
          height: 32,
          opacity: 0,
          transition: 'opacity 0.25s ease',
          zIndex: 5,
          '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
        }}
      >
        <Fullscreen fontSize="small" />
      </IconButton>

      {/* Prev / Next arrows — only show when multiple images */}
      {images.length > 1 && (
        <Box
          className="carousel-controls"
          sx={{
            opacity: 0,
            transition: 'opacity 0.25s ease',
            position: 'absolute',
            inset: 0,
            display: { xs: 'none', sm: 'flex' },
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
