import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeRendererProps {
  value: string;
  format?: 'CODE128' | 'EAN13' | 'UPC' | 'pharmacode';
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  fontOptions?: string;
  font?: string;
  textAlign?: string;
  textPosition?: string;
  textMargin?: number;
  fontSizeCustom?: number;
  background?: string;
  lineColor?: string;
  margin?: number;
  className?: string;
}

export const BarcodeRenderer: React.FC<BarcodeRendererProps> = ({
  value,
  format = 'CODE128',
  width = 1.6,
  height = 42,
  displayValue = true,
  fontSize = 12,
  background = 'transparent',
  lineColor = '#0f172a',
  margin = 0,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;

    try {
      // Validate or fallback format
      let actualFormat = format;
      const cleanVal = String(value).trim();

      // If EAN13 is specified but length isn't 12 or 13, fallback to CODE128
      if (format === 'EAN13' && cleanVal.length !== 12 && cleanVal.length !== 13) {
        actualFormat = 'CODE128';
      }

      JsBarcode(svgRef.current, cleanVal, {
        format: actualFormat,
        width: Math.max(1, width),
        height: Math.max(20, height),
        displayValue,
        fontSize,
        background,
        lineColor,
        margin,
        font: 'monospace',
        textMargin: 2,
        valid: () => true
      });
    } catch {
      // If specific format failed, try fallback to CODE128
      try {
        if (svgRef.current) {
          JsBarcode(svgRef.current, String(value).trim(), {
            format: 'CODE128',
            width: Math.max(1, width),
            height: Math.max(20, height),
            displayValue,
            fontSize,
            background,
            lineColor,
            margin,
            font: 'monospace',
          });
        }
      } catch {
        // Suppress invalid barcode render crash
      }
    }
  }, [value, format, width, height, displayValue, fontSize, background, lineColor, margin]);

  if (!value) {
    return <div className="text-xs text-slate-400 font-mono">No Barcode</div>;
  }

  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <svg ref={svgRef} className="max-w-full overflow-visible" />
    </div>
  );
};
