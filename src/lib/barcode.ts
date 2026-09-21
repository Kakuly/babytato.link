import JsBarcode from 'jsbarcode';
import { DOMImplementation, XMLSerializer } from '@xmldom/xmldom';

export interface BarcodeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Code128Barcode {
  viewBox: string;
  rects: BarcodeRect[];
}

const BARCODE_HEIGHT = 40;
const BARCODE_PADDING_Y = 4;

export function getCode128Barcode(value: string): Code128Barcode {
  const document = new DOMImplementation().createDocument(
    'http://www.w3.org/2000/svg',
    'svg',
    null,
  );
  const svg = document.documentElement;

  JsBarcode(svg, value, {
    xmlDocument: document,
    format: 'CODE128',
    displayValue: false,
    margin: 0,
    width: 2,
    height: BARCODE_HEIGHT,
    lineColor: '#000000',
  });

  const xml = new XMLSerializer().serializeToString(svg);
  const viewBoxMatch = xml.match(/viewBox="([^"]+)"/);
  const [, , rawWidth] = (viewBoxMatch?.[1] ?? `0 0 0 ${BARCODE_HEIGHT}`).split(/\s+/).map(Number);
  const width = Number.isFinite(rawWidth) ? rawWidth : 0;

  const rects: BarcodeRect[] = [];
  const rectPattern =
    /<rect x="(\d+(?:\.\d+)?)" y="(\d+(?:\.\d+)?)" width="(\d+(?:\.\d+)?)" height="(\d+(?:\.\d+)?)"/g;

  for (const match of xml.matchAll(rectPattern)) {
    const x = Number(match[1]);
    const y = Number(match[2]);
    const rectWidth = Number(match[3]);
    const rectHeight = Number(match[4]);

    if (rectWidth >= width || rectHeight !== BARCODE_HEIGHT) continue;

    rects.push({
      x,
      y: y + BARCODE_PADDING_Y,
      width: rectWidth,
      height: rectHeight,
    });
  }

  const viewBoxHeight = BARCODE_HEIGHT + BARCODE_PADDING_Y * 2;

  return {
    viewBox: `0 0 ${width} ${viewBoxHeight}`,
    rects,
  };
}
