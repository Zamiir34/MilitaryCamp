/**
 * Download a QRCodeSVG (or any SVG inside a container) as a plain PNG image.
 */
export function downloadQrAsPng(selectorOrElement, filename = 'qr-code.png', size = 512) {
  const root = typeof selectorOrElement === 'string'
    ? document.querySelector(selectorOrElement)
    : selectorOrElement;
  const svg = root?.tagName?.toLowerCase() === 'svg' ? root : root?.querySelector?.('svg');
  if (!svg) return false;

  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svg);
  if (!source.includes('xmlns=')) {
    source = source.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();

  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    URL.revokeObjectURL(url);

    const pngUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.download = filename.endsWith('.png') ? filename : `${filename}.png`;
    a.href = pngUrl;
    a.click();
  };

  img.onerror = () => {
    URL.revokeObjectURL(url);
  };

  img.src = url;
  return true;
}
