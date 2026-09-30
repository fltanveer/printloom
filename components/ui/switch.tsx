'use client';
import * as React from 'react';
import * as S from '@radix-ui/react-switch';
import * as C from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from './cn';

export function Switch({ className, ...p }: S.SwitchProps) {
  return (
    <S.Root
      className={cn('relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-border transition-colors data-[state=checked]:bg-accent disabled:cursor-not-allowed disabled:opacity-50', className)}
      {...p}
    >
      <S.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[22px]" />
    </S.Root>
  );
}

export function Checkbox({ className, ...p }: C.CheckboxProps) {
  return (
    <C.Root
      className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-md border border-border bg-surface data-[state=checked]:border-accent data-[state=checked]:bg-accent', className)}
      {...p}
    >
      <C.Indicator>
        <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
      </C.Indicator>
    </C.Root>
  );
}
