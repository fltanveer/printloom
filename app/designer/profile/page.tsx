'use client';
import * as React from 'react';
import Link from 'next/link';
import { Eye, ExternalLink, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/misc';
import { EmptyState, PageHeader, useFakeLoading } from '@/components/shared/bits';
import { DesignerPublicProfile, useActiveDesigner } from '@/components/designer/bits';

export default function DesignerProfilePreview() {
  const loading = useFakeLoading();
  const { id, designer } = useActiveDesigner();
  if (!designer) return <EmptyState body="Pick a designer persona in the Demo Bar to preview a profile." />;
  return (
    <div>
      <PageHeader
        title="Public profile"
        subtitle="Exactly what customers see on your page."
        actions={
          <>
            <Button variant="secondary" asChild>
              <Link href="/designer/onboarding">
                <Pencil className="h-4 w-4" /> Edit profile
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/designer-profile/${id}`}>
                <ExternalLink className="h-4 w-4" /> Open public page
              </Link>
            </Button>
          </>
        }
      />
      <p className="mb-4 flex items-center gap-2 rounded-input bg-accent-soft px-3 py-2 text-sm text-accent-text">
        <Eye className="h-4 w-4" /> Preview. Only published designs appear in your portfolio.
      </p>
      {loading ? <Skeleton className="h-[520px]" /> : <DesignerPublicProfile designerId={id} />}
    </div>
  );
}
