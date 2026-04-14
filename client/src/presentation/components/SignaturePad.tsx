import { useRef, useEffect, useCallback, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Clear as ClearIcon } from '@mui/icons-material';

interface SignaturePadProps {
  onSignatureChange?: (signatureData: string | null) => void;
  width?: number;
  height?: number;
  disabled?: boolean;
  initialSignature?: string;
}

export default function SignaturePad({
  onSignatureChange,
  height = 200,
  disabled = false,
  initialSignature,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set display size
    canvas.style.width = '100%';
    canvas.style.height = `${height}px`;

    // Set actual canvas resolution
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Set drawing style
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Load initial signature if provided
    if (initialSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasSignature(true);
      };
      img.src = initialSignature;
    }
  }, [height, initialSignature]);

  const getCoordinates = useCallback((
    e: React.MouseEvent | React.TouchEvent
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();

    const coords = getCoordinates(e);
    if (!coords) return;

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  }, [disabled, getCoordinates]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();

    const coords = getCoordinates(e);
    if (!coords) return;

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasSignature(true);
  }, [isDrawing, disabled, getCoordinates]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const signatureData = canvas.toDataURL('image/png');
    onSignatureChange?.(signatureData);
  }, [isDrawing, onSignatureChange]);

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onSignatureChange?.(null);
  }, [onSignatureChange]);

  return (
    <Box>
      <Box
        sx={{
          position: 'relative',
          border: '2px dashed',
          borderColor: disabled
            ? 'action.disabled'
            : hasSignature
              ? 'primary.main'
              : 'divider',
          borderRadius: 3,
          overflow: 'hidden',
          bgcolor: disabled
            ? 'action.disabledBackground'
            : (theme) => theme.palette.mode === 'dark' ? 'grey.900' : '#fafbfc',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          '&:hover': !disabled ? {
            borderColor: 'primary.light',
            boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.08)',
          } : {},
          cursor: disabled ? 'not-allowed' : 'crosshair',
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{
            display: 'block',
            width: '100%',
            height: `${height}px`,
            touchAction: 'none',
          }}
        />

        {/* Signature line */}
        {!hasSignature && !disabled && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 40,
              left: '10%',
              right: '10%',
              borderBottom: '1px solid',
              borderColor: 'divider',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Placeholder text */}
        {!hasSignature && !disabled && (
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{
              position: 'absolute',
              bottom: 16,
              left: 0,
              right: 0,
              textAlign: 'center',
              pointerEvents: 'none',
              fontStyle: 'italic',
            }}
          >
            Sign above this line
          </Typography>
        )}
      </Box>

      {/* Actions */}
      {!disabled && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
          <Button
            size="small"
            startIcon={<ClearIcon />}
            onClick={clearSignature}
            disabled={!hasSignature}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Clear Signature
          </Button>
        </Box>
      )}
    </Box>
  );
}
