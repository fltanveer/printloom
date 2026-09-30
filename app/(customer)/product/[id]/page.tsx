'use client';
import * as React from 'react';
import { useParams } from 'next/navigation';
import { ListSkeleton } from '@/components/shared/bits';
import { Customizer } from '@/components/customizer/Customizer';

function Inner() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id ?? '';
  return <Customizer key={id} productId={id} />;
}

export default function ProductPage() {
  return (
    <React.Suspense fallback={<ListSkeleton className="p-4" />}>
      <Inner />
    </React.Suspense>
  );
}
