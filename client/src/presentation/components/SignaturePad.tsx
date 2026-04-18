import React, { useRef, useState, useEffect } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import { ClearRounded, CheckRounded } from '@mui/icons-material';

interface SignaturePadProps {
  onSign: (signatureDataUrl: string) => void;
  onClear?: () => void;
  width?: number | string;
  height?: number;
}

export default function SignaturePad({ onSign, onClear, width = '100%', height = 200 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Resize canvas to match container width on mount and window resize
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        // Set actual size in memory (scaled to account for extra pixel density if needed)
        // Here we keep it simple 1:1, but could use devicePixelRatio
        canvas.width = container.clientWidth;
        canvas.height = height;
        
        // Reset state & context
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#000000';
          // Fill white background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        setHasSignature(false);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Cleanup
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [height]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    
    if (!hasSignature) setHasSignature(true);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.closePath();
      }
      setIsDrawing(false);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
    setHasSignature(false);
    if (onClear) onClear();
  };

  const handleSubmit = () => {
    const canvas = canvasRef.current;
    if (canvas && hasSignature) {
      const dataUrl = canvas.toDataURL('image/png');
      onSign(dataUrl);
    }
  };

  return (
    <Paper 
      elevation={0}
      sx={{ 
        width, 
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'primary.50' }}>
        <Typography variant="subtitle2" color="primary.main" fontWeight={600}>
          Digital Signature
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Please sign within the box below
        </Typography>
      </Box>

      <Box ref={containerRef} sx={{ position: 'relative', width: '100%', height }}>
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
            cursor: 'crosshair',
            touchAction: 'none', // Prevent scrolling on touch
            display: 'block'
          }}
        />
        {!hasSignature && (
          <Box 
            sx={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              opacity: 0.3
            }}
          >
            <Typography variant="h5" color="text.secondary" sx={{ userSelect: 'none' }}>
              Sign Here
            </Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'flex-end', gap: 1, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
        <Button 
          variant="outlined" 
          color="inherit" 
          size="small" 
          onClick={handleClear}
          startIcon={<ClearRounded />}
        >
          Clear
        </Button>
        <Button 
          variant="contained" 
          color="primary" 
          size="small"
          onClick={handleSubmit}
          disabled={!hasSignature}
          startIcon={<CheckRounded />}
        >
          Submit
        </Button>
      </Box>
    </Paper>
  );
}
