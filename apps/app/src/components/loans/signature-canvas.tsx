import { useEffect, useRef } from 'react';
import { Button, cn } from '@workspace/ui';
import type SignaturePad from 'signature_pad';

interface SignatureCanvasProps {
  onSave?: (dataUrl: string) => void;
  className?: string;
  isPending?: boolean;
  saveLabel?: string;
}

export function SignatureCanvas({
  onSave,
  className,
  isPending = false,
  saveLabel = 'Submit Signature',
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let isMounted = true;
    let resizeCanvas = () => {};

    async function initializeSignaturePad() {
      const { default: SignaturePad } = await import('signature_pad');

      if (!isMounted) {
        return;
      }

      const pad = new SignaturePad(canvas, {
        backgroundColor: 'rgba(255, 255, 255, 0)',
        penColor: '#000000',
      });
      padRef.current = pad;

      resizeCanvas = () => {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext('2d')?.scale(ratio, ratio);
        pad.clear();
      };

      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
    }

    void initializeSignaturePad();

    return () => {
      isMounted = false;
      window.removeEventListener('resize', resizeCanvas);
      padRef.current?.off();
      padRef.current = null;
    };
  }, []);

  function handleClear() {
    padRef.current?.clear();
  }

  function handleSave() {
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) return;
    onSave?.(pad.toDataURL('image/png'));
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <canvas
          ref={canvasRef}
          className="w-full h-40 rounded-md border border-border bg-white cursor-crosshair touch-none"
      />
      <div className="flex items-center gap-2 justify-end">
        <Button variant="ghost" size="sm" type="button" onClick={handleClear}>
          Clear
        </Button>
        <Button size="sm" type="button" onClick={handleSave} disabled={isPending}>
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}
