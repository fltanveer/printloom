'use client';
import * as React from 'react';
import * as S from '@radix-ui/react-slider';
import { cn } from './cn';

export function Slider({ className, label = 'Value', ...p }: S.SliderProps & { label?: string }) {
  const values = p.value ?? p.defaultValue ?? [0];
  return (
    <S.Root className={cn('relative flex h-6 w-full touch-none select-none items-center', className)} {...p}>
      <S.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-border">
        <S.Range className="absolute h-full bg-accent" />
      </S.Track>
      {values.map((_, i) => (
        <S.Thumb key={i} className="block h-5 w-5 rounded-full border-2 border-accent bg-white shadow" aria-label={label} />
      ))}
    </S.Root>
  );
}
