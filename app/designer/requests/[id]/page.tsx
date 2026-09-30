'use client';
import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { MessageCircle, Send, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { formatDateTime } from '@/lib/dates';
import { isRequestPreAccept } from '@/lib/stateMachines';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, SheetContent } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/input';
import { Progress, Skeleton } from '@/components/ui/misc';
import { cn } from '@/components/ui/cn';
import { MoneyText } from '@/components/shared/MoneyText';
import { StatusPill } from '@/components/shared/StatusPill';
import { EmptyState, PageHeader, SafeImage, Timeline, useFakeLoading } from '@/components/shared/bits';
import { RequestBrief, useActiveDesigner } from '@/components/designer/bits';
import { ProposalForm } from '@/components/designer/ProposalForm';
import { DeliveryUploader } from '@/components/designer/DeliveryUploader';

const CAN_DELIVER = ['accepted', 'in_progress', 'revision_requested'];

export default function DesignerRequestDetail() {
  const params = useParams<{ id: string }>();
  const reqId = params?.id ?? '';
  const loading = useFakeLoading();
  const { id } = useActiveDesigner();
  const request = useStore((s) => s.requests[reqId]);
  const customer = useStore((s) => (request ? s.customers[request.customerId] : undefined));
  const settings = useStore((s) => s.settings);
  const sendMessage = useStore((s) => s.sendMessage);
  const declineRequest = useStore((s) => s.declineRequest);
  const [chatOpen, setChatOpen] = React.useState(false);
  const [text, setText] = React.useState('');
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (chatOpen) setTimeout(() => endRef.current?.scrollIntoView({ block: 'end' }), 50);
  }, [chatOpen, request?.messages.length]);

  if (loading) return <Skeleton className="h-[560px]" />;
  if (!request)
    return <EmptyState kind="search" title="Request not found" body="It may have been removed." action={<Button asChild><Link href="/designer/requests">Back to requests</Link></Button>} />;

  const isMine = request.designerId === id;
  const isPublic = !request.designerId && (request.status === 'open' || request.status === 'proposals_received');
  if (!isMine && !isPublic)
    return <EmptyState kind="inbox" title="This request is with another designer" body="Only the assigned designer can open it. Switch persona in the Demo Bar, or find open work on the board." action={<Button asChild><Link href="/designer/requests?tab=open">Open board</Link></Button>} />;

  const accepted = request.proposals.find((p) => p.id === request.acceptedProposalId);
  const allowed = request.revisionLimit + request.extraRevisionsPaid;
  const preAccept = isRequestPreAccept(request.status);
  const canChat = isMine && !preAccept;
  const lastRevisionNote = [...request.timeline].reverse().find((t) => t.status === 'revision_requested')?.note;
  const net = accepted ? Math.round((accepted.price + request.extraRevisionsPaid * request.extraRevisionFee) * (1 - settings.requestFeePct / 100)) : 0;

  const send = () => {
    if (!text.trim()) return;
    sendMessage(request.id, 'designer', id, text.trim());
    setText('');
  };

  return (
    <div>
      <PageHeader
        title={request.title}
        back={{ href: `/designer/requests?tab=${preAccept ? (isMine ? 'direct' : 'open') : ['approved', 'completed'].includes(request.status) ? 'completed' : 'active'}`, label: 'Requests' }}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill status={request.status} /> for {customer?.name ?? 'a customer'}
          </span>
        }
        actions={
          canChat ? (
            <Button variant="secondary" onClick={() => setChatOpen(true)}>
              <MessageCircle className="h-4 w-4" /> Chat {request.messages.length ? <Badge tone="accent">{request.messages.length}</Badge> : null}
            </Button>
          ) : null
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Card className="p-4 sm:p-5">
            <h2 className="mb-3 font-display text-lg font-semibold">Brief</h2>
            <RequestBrief request={request} />
          </Card>

          {request.deliveries.length ? (
            <Card className="p-4 sm:p-5">
              <h2 className="mb-3 font-display text-lg font-semibold">Deliveries</h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[...request.deliveries].reverse().map((d, i) => (
                  <li key={d.id} className={cn('overflow-hidden rounded-card border', i === 0 ? 'border-accent' : 'border-border')}>
                    <div className="relative aspect-square bg-surface-2">
                      <SafeImage src={d.src} alt={`Version ${d.version}`} className="h-full w-full" contain />
                      <Badge tone={i === 0 ? 'solid' : 'dark'} className="absolute left-2 top-2">
                        v{d.version}
                      </Badge>
                    </div>
                    <div className="p-2 text-xs">
                      <p className="line-clamp-2">{d.note}</p>
                      <p className="mt-0.5 text-muted">{formatDateTime(d.at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card className="p-4 sm:p-5">
            <h2 className="mb-3 font-display text-lg font-semibold">Activity</h2>
            <Timeline events={request.timeline} />
          </Card>
        </div>

        <div className="space-y-5">
          {preAccept ? (
            <Card className="p-4 sm:p-5 lg:sticky lg:top-4">
              <h2 className="mb-3 font-display text-lg font-semibold">Send a proposal</h2>
              <ProposalForm request={request} designerId={id} />
              {isMine && request.status === 'sent' ? (
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" className="mt-2 w-full">
                      <X className="h-4 w-4" /> Decline request
                    </Button>
                  }
                  title="Decline this request?"
                  description="The customer will be offered to post it publicly instead."
                  confirmLabel="Decline"
                  danger
                  onConfirm={() => {
                    declineRequest(request.id);
                    toast.success('Declined. The customer has been told.');
                  }}
                />
              ) : null}
            </Card>
          ) : (
            <>
              <Card className="space-y-4 p-4 sm:p-5">
                <h2 className="font-display text-lg font-semibold">Status</h2>
                {accepted ? (
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-input bg-surface-2 p-3">
                      <dt className="text-xs text-muted">Agreed price</dt>
                      <dd className="font-semibold">
                        <MoneyText value={accepted.price} />
                      </dd>
                    </div>
                    <div className="rounded-input bg-surface-2 p-3">
                      <dt className="text-xs text-muted">{['approved', 'completed'].includes(request.status) ? 'You earned' : 'You get on approval'}</dt>
                      <dd className="font-semibold">
                        <MoneyText value={net} />
                      </dd>
                    </div>
                  </dl>
                ) : null}
                <div>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold">
                      Revision {request.revisionsUsed} of {allowed}
                    </span>
                    {request.extraRevisionsPaid ? <span className="text-muted">{request.extraRevisionsPaid} paid extra</span> : null}
                  </div>
                  <Progress value={allowed ? (request.revisionsUsed / allowed) * 100 : 100} />
                  <p className="mt-1 text-xs text-muted">
                    After {allowed} revisions the customer pays <MoneyText value={request.extraRevisionFee} /> per extra revision.
                  </p>
                </div>
                {request.status === 'revision_requested' && lastRevisionNote ? (
                  <div className="rounded-input bg-warning/15 p-3 text-sm">
                    <p className="font-semibold">Customer asked for changes</p>
                    <p className="mt-1">{lastRevisionNote}</p>
                  </div>
                ) : null}
                {request.status === 'delivered' ? <p className="rounded-input bg-surface-2 p-3 text-sm text-muted">Waiting for the customer to review v{request.deliveries.length}.</p> : null}
                {['approved', 'completed'].includes(request.status) ? <p className="rounded-input bg-success/10 p-3 text-sm text-green-700 dark:text-green-300">Approved. The escrow was released to your earnings.</p> : null}
              </Card>

              {isMine && CAN_DELIVER.includes(request.status) ? (
                <Card className="p-4 sm:p-5">
                  <h2 className="mb-3 font-display text-lg font-semibold">Upload a delivery</h2>
                  <DeliveryUploader request={request} />
                </Card>
              ) : null}

              {canChat ? (
                <Button variant="secondary" className="w-full" onClick={() => setChatOpen(true)}>
                  <MessageCircle className="h-4 w-4" /> Open chat with {customer?.name.split(' ')[0] ?? 'customer'}
                </Button>
              ) : null}
            </>
          )}
        </div>
      </div>

      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent
          title={`Chat with ${customer?.name ?? 'customer'}`}
          description={request.title}
          footer={
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <Textarea
                rows={1}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Write a message"
                aria-label="Message"
                className="min-h-[44px] flex-1 resize-none"
              />
              <Button type="submit" size="icon" aria-label="Send message" disabled={!text.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          }
        >
          {request.messages.length ? (
            <ul className="space-y-2">
              {request.messages.map((m) => {
                const me = m.from === 'designer';
                return (
                  <li key={m.id} className={cn('flex', me ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[80%] rounded-card px-3 py-2 text-sm', me ? 'bg-accent text-white' : 'bg-surface-2')}>
                      <p className="whitespace-pre-line">{m.text}</p>
                      <p className={cn('mt-0.5 text-[11px]', me ? 'text-white/75' : 'text-muted')}>{formatDateTime(m.at)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState kind="inbox" body="No messages yet. Say hi and confirm the details." />
          )}
          <div ref={endRef} />
        </SheetContent>
      </Dialog>
    </div>
  );
}
