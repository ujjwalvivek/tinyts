const _cache = new Map<string, HTMLCanvasElement>();

/**
 * Create a procedural texture canvas.
 * @param draw - Drawing callback function.
 * @param key - Optional cache key.
 */
export function createTexture(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  key?: string,
): HTMLCanvasElement {
  if (key && _cache.has(key)) return _cache.get(key)!;

  const scale = 2;
  const w = 16 * scale, h = 16 * scale;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, w, h);

  if (key) _cache.set(key, canvas);
  return canvas;
}

/** Clear the procedural texture cache. */
export function clearTextureCache(): void {
  _cache.clear();
}

// ─── Procedural Canvas Geometry Drawing Primitives ───────────────────

/** Draw a procedural rectangle. */
export function drawProceduralRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fillColor?: string,
  strokeColor?: string,
  strokeWidth: number = 1,
): void {
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, w, h);
  }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.strokeRect(x, y, w, h);
  }
}

/** Draw a procedural circle. */
export function drawProceduralCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  fillColor?: string,
  strokeColor?: string,
  strokeWidth: number = 1,
): void {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

/** Draw a procedural line. */
export function drawProceduralLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  thickness: number = 1,
): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.stroke();
}

/** Represents a 2D point. */
export interface Point2D {
  /** X coordinate. */
  x: number;
  /** Y coordinate. */
  y: number;
}

/** Draw a procedural polygon from a list of points. */
export function drawProceduralPolygon(
  ctx: CanvasRenderingContext2D,
  points: Point2D[],
  fillColor?: string,
  strokeColor?: string,
  strokeWidth: number = 1,
): void {
  if (points.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

/** Draw a procedural arc. */
export function drawProceduralArc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
  fillColor?: string,
  strokeColor?: string,
  strokeWidth: number = 1,
): void {
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, endAngle);
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

/** Draw a procedural ellipse. */
export function drawProceduralEllipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotation: number,
  fillColor?: string,
  strokeColor?: string,
  strokeWidth: number = 1,
): void {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, rotation, 0, Math.PI * 2);
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

/** Draw a procedural cubic Bezier curve. */
export function drawProceduralBezierCurve(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  cp1x: number,
  cp1y: number,
  cp2x: number,
  cp2y: number,
  endX: number,
  endY: number,
  color: string,
  thickness: number = 1,
): void {
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.stroke();
}

/** Draw procedural text. */
export function drawProceduralText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  color: string,
  align: CanvasTextAlign = 'left',
  baseline: CanvasTextBaseline = 'top',
): void {
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(text, x, y);
}

/** Represents a color stop for a gradient. */
export interface ColorStop {
  /** Offset between 0 and 1. */
  offset: number;
  /** CSS color string. */
  color: string;
}

/** Draw a procedural rectangle filled with a gradient. */
export function drawProceduralGradientRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  colorStops: ColorStop[],
  gradientType: 'linear' | 'radial' = 'linear',
  radialParams?: { cx1: number; cy1: number; r1: number; cx2: number; cy2: number; r2: number },
): void {
  let grad: CanvasGradient;
  if (gradientType === 'radial' && radialParams) {
    grad = ctx.createRadialGradient(
      radialParams.cx1,
      radialParams.cy1,
      radialParams.r1,
      radialParams.cx2,
      radialParams.cy2,
      radialParams.r2,
    );
  } else {
    grad = ctx.createLinearGradient(x, y, x + w, y + h);
  }

  for (const stop of colorStops) {
    grad.addColorStop(stop.offset, stop.color);
  }

  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
}

/** Draw a procedural grid pattern. */
export function drawProceduralGridPattern(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  gridSpacing: number,
  color: string,
  thickness: number = 1,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.beginPath();
  for (let x = 0; x <= w; x += gridSpacing) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = 0; y <= h; y += gridSpacing) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();
}

/** Draw a procedural rounded rectangle. */
export function drawProceduralRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radii: number | number[],
  fillColor?: string,
  strokeColor?: string,
  strokeWidth: number = 1,
): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radii);
  } else {
    const r = typeof radii === 'number' ? radii : (radii[0] || 0);
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
  }
  ctx.closePath();
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

/** Draw a procedural regular polygon. */
export function drawProceduralRegularPolygon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  sides: number,
  rotation: number = 0,
  fillColor?: string,
  strokeColor?: string,
  strokeWidth: number = 1,
): void {
  if (sides < 3) return;
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = rotation + (i * 2 * Math.PI) / sides;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

/** Draw a procedural star. */
export function drawProceduralStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  innerRadius: number,
  outerRadius: number,
  rotation: number = 0,
  fillColor?: string,
  strokeColor?: string,
  strokeWidth: number = 1,
): void {
  let rot = (Math.PI / 2) * 3 + rotation;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.closePath();
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

/** Draw a procedural ring (donut shape). */
export function drawProceduralRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  fillColor?: string,
  strokeColor?: string,
  strokeWidth: number = 1,
): void {
  ctx.beginPath();
  ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2, false);
  ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2, true);
  ctx.closePath();
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

/** Draw a procedural sector (pie slice). */
export function drawProceduralSector(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  fillColor?: string,
  strokeColor?: string,
  strokeWidth: number = 1,
): void {
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, radius, startAngle, endAngle);
  ctx.closePath();
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

/** Draw a procedural capsule between two points. */
export function drawProceduralCapsule(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  radius: number,
  fillColor?: string,
  strokeColor?: string,
  strokeWidth: number = 1,
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);

  if (len === 0) {
    drawProceduralCircle(ctx, x1, y1, radius, fillColor, strokeColor, strokeWidth);
    return;
  }

  const nx = -dy / len;
  const ny = dx / len;

  ctx.beginPath();
  const startAngle = Math.atan2(-ny, -nx);
  ctx.arc(x1, y1, radius, startAngle, startAngle + Math.PI);
  const endAngle = Math.atan2(ny, nx);
  ctx.arc(x2, y2, radius, endAngle, endAngle + Math.PI);
  ctx.closePath();

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

/** Draw a procedural quadratic Bezier curve. */
export function drawProceduralQuadraticCurve(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  cpx: number,
  cpy: number,
  endX: number,
  endY: number,
  color: string,
  thickness: number = 1,
): void {
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.quadraticCurveTo(cpx, cpy, endX, endY);
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.stroke();
}

