// Event helpers: every cross-role effect writes notifications and timeline entries through these.

import { tl, uid } from './orders';
import type { AppData, Notification, SubOrder, TimelineEvent } from './types';

export function notify(data: AppData, personaId: string, type: string, title: string, body: string, link: string): void {
  const n: Notification = { id: uid('n'), personaId, type, title, body, link, read: false, at: new Date().toISOString() };
  data.notifications.unshift(n);
  if (data.notifications.length > 300) data.notifications.length = 300;
}

export function addTimeline(sub: SubOrder, actor: TimelineEvent['actor'], actorName: string, label: string, status?: SubOrder['status'], note?: string): void {
  sub.timeline.push(tl(actor, actorName, label, new Date().toISOString(), status, note));
}

/** Customers whose cart contains a line matching the predicate. */
export function customersWithCartLines(data: AppData, pred: (offeringId: string, designIds: string[]) => boolean): string[] {
  return Object.entries(data.carts)
    .filter(([, lines]) =>
      lines.some((l) =>
        pred(
          l.offeringId,
          l.customization.layers.filter((x) => x.designId).map((x) => x.designId as string),
        ),
      ),
    )
    .map(([cid]) => cid);
}

/** Designers whose royalties are on a sub-order. */
export function designersOn(sub: SubOrder): string[] {
  return sub.split.designers.map((d) => d.designerId);
}
