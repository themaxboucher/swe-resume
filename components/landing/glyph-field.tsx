"use client";

import { useEffect, useRef } from "react";

const WIDTH = 1200;
const HEIGHT = 400;
const ROW_HEIGHT = 16;
const ROWS = HEIGHT / ROW_HEIGHT;
const FONT_SIZE = 12;
const TICK_MS = 90;
const GLYPHS = "AISDPEL01<>=+*-#$";
const POINTER_RADIUS = 44;

const MASK =
  "linear-gradient(to bottom, black 50%, transparent 96%), linear-gradient(to right, transparent, black 18%, black 82%, transparent)";

type Column = {
  chars: string[];
  alphas: number[];
  floors: number[];
  glows: number[];
  head: number;
  speed: number;
  maxRow: number;
  brightness: number;
};

const randomGlyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

/**
 * Columns of glyphs that drip down from the top of the page. Each column's head lights a cell,
 * which then fades to a faint resting level; the pointer leaves a small glow.
 */
export function GlyphField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = WIDTH * dpr;
    canvas.height = HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    const { fontFamily, color } = getComputedStyle(canvas);
    const font = `${FONT_SIZE}px ${fontFamily}`;
    ctx.font = font;
    const colWidth = ctx.measureText("0").width * 1.7;
    const colCount = Math.ceil(WIDTH / colWidth);

    function respawn(column: Column, initial = false) {
      column.head = initial ? Math.random() * ROWS * 2 : -Math.random() * ROWS * 1.5;
      column.speed = 0.25 + Math.random() * 0.75;
      if (initial || Math.random() < 0.2) {
        column.maxRow = Math.floor(ROWS * (0.35 + Math.random() * 0.65));
        column.brightness = 0.5 + Math.random() * 0.5;
      }
    }

    const columns: Column[] = Array.from({ length: colCount }, () => {
      const column: Column = {
        chars: Array.from({ length: ROWS }, randomGlyph),
        alphas: Array(ROWS).fill(0),
        floors: Array.from({ length: ROWS }, () => 0.04 + Math.random() * 0.08),
        glows: Array(ROWS).fill(0),
        head: 0,
        speed: 0,
        maxRow: 0,
        brightness: 0,
      };
      respawn(column, true);
      return column;
    });

    function tick() {
      for (const column of columns) {
        column.head += column.speed;
        const headRow = Math.floor(column.head);

        for (let row = 0; row <= column.maxRow; row++) {
          if (column.alphas[row] > 0) {
            column.alphas[row] = Math.max(column.alphas[row] * 0.94, column.floors[row]);
          }
        }
        if (headRow >= 0 && headRow <= column.maxRow && headRow < ROWS) column.alphas[headRow] = 0.8;

        for (let row = 0; row < ROWS; row++) {
          const glow = column.glows[row];
          if (glow > 0) column.glows[row] = glow < 0.03 ? 0 : glow * 0.82;
        }

        if (Math.random() < 0.4) column.chars[Math.floor(Math.random() * ROWS)] = randomGlyph();
        if (headRow > column.maxRow + 4) respawn(column);
      }
    }

    function draw() {
      ctx!.clearRect(0, 0, WIDTH, HEIGHT);
      ctx!.font = font;
      ctx!.textBaseline = "top";
      ctx!.fillStyle = color;

      columns.forEach((column, col) => {
        for (let row = 0; row < ROWS; row++) {
          const alpha = Math.max(column.alphas[row] * column.brightness, column.glows[row]);
          if (alpha < 0.02) continue;
          ctx!.globalAlpha = alpha;
          ctx!.fillText(column.chars[row], col * colWidth, row * ROW_HEIGHT);
        }
      });
      ctx!.globalAlpha = 1;
    }

    // Start mid-animation so the field is already full on first paint.
    for (let i = 0; i < ROWS * 4; i++) tick();
    draw();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.fonts.ready.then(draw);
      return;
    }

    let frame = 0;
    let lastTick = 0;
    let visible = true;
    let redrawQueued = false;

    function loop(now: number) {
      frame = requestAnimationFrame(loop);
      if (now - lastTick < TICK_MS) return;
      lastTick = now;
      tick();
      draw();
    }

    function onPointerMove(event: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x < -POINTER_RADIUS || x > WIDTH + POINTER_RADIUS || y < -POINTER_RADIUS || y > HEIGHT + POINTER_RADIUS) {
        return;
      }

      const firstCol = Math.max(0, Math.floor((x - POINTER_RADIUS) / colWidth));
      const lastCol = Math.min(colCount - 1, Math.ceil((x + POINTER_RADIUS) / colWidth));
      const firstRow = Math.max(0, Math.floor((y - POINTER_RADIUS) / ROW_HEIGHT));
      const lastRow = Math.min(ROWS - 1, Math.ceil((y + POINTER_RADIUS) / ROW_HEIGHT));

      for (let col = firstCol; col <= lastCol; col++) {
        for (let row = firstRow; row <= lastRow; row++) {
          const distance = Math.hypot(col * colWidth + colWidth / 2 - x, row * ROW_HEIGHT + ROW_HEIGHT / 2 - y);
          if (distance > POINTER_RADIUS) continue;
          const glow = 0.95 * (1 - distance / POINTER_RADIUS) ** 1.5;
          columns[col].glows[row] = Math.max(columns[col].glows[row], glow);
        }
      }

      if (!redrawQueued) {
        redrawQueued = true;
        requestAnimationFrame(() => {
          redrawQueued = false;
          draw();
        });
      }
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !visible) frame = requestAnimationFrame(loop);
      if (!entry.isIntersecting) cancelAnimationFrame(frame);
      visible = entry.isIntersecting;
    });
    observer.observe(canvas);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 flex h-[400px] justify-center overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="h-[400px] w-[1200px] shrink-0 font-mono text-primary opacity-60"
        style={{ maskImage: MASK, maskComposite: "intersect", WebkitMaskImage: MASK, WebkitMaskComposite: "source-in" }}
      />
    </div>
  );
}
