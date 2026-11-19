"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { MinusIcon, PlusIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Thumb width in px; tick positions account for it so ticks line up with thumb centers. */
const THUMB_WIDTH = 28;
const MAX_TICKS = 16;

const roundTo = (value: number) => Number(value.toFixed(4));

/**
 * A notched slider with − / + buttons, for design values that move in fixed steps.
 * Values off the step grid (from older documents) still display; the buttons snap to the grid.
 */
export function StepSlider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const stepsFromMin = (value - min) / step;
  const decrement = roundTo(Math.max(min, min + (Math.ceil(stepsFromMin - 1e-6) - 1) * step));
  const increment = roundTo(Math.min(max, min + (Math.floor(stepsFromMin + 1e-6) + 1) * step));

  const positions = Math.round((max - min) / step) + 1;
  const every = Math.ceil(positions / MAX_TICKS);
  const ticks: number[] = [];
  for (let i = 0; i < positions; i += every) ticks.push(i / (positions - 1));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{format(value)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <SliderPrimitive.Root
          value={value}
          min={min}
          max={max}
          step={step}
          thumbAlignment="edge"
          onValueChange={(next) => onChange(roundTo(next))}
          className="min-w-0 flex-1"
        >
          <SliderPrimitive.Control className="relative flex h-9 w-full cursor-pointer touch-none items-center select-none">
            <SliderPrimitive.Track className="relative h-full w-full rounded-md bg-muted">
              {ticks.map((position) => (
                <span
                  key={position}
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-foreground/20"
                  style={{ left: `calc(${THUMB_WIDTH / 2}px + ${position} * (100% - ${THUMB_WIDTH}px))` }}
                />
              ))}
            </SliderPrimitive.Track>
            <SliderPrimitive.Thumb
              getAriaLabel={() => label}
              getAriaValueText={(_, v) => format(v)}
              className="h-9 rounded-md bg-primary outline-none ring-primary/30 transition-shadow hover:ring-4 focus-visible:ring-4 data-dragging:ring-4"
              style={{ width: THUMB_WIDTH }}
            />
          </SliderPrimitive.Control>
        </SliderPrimitive.Root>
        <StepButton label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(decrement)}>
          <MinusIcon />
        </StepButton>
        <StepButton label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(increment)}>
          <PlusIcon />
        </StepButton>
      </div>
    </div>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-muted active:translate-y-px disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4"
    >
      {children}
    </button>
  );
}
