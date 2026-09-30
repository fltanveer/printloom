# Printloom prototype

Clickable, frontend-only prototype of a three-sided custom print marketplace (customers, print shops, designers, plus admin). Built from `BUILD_SPEC.md`.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # pricing engine, state machines, seed integrity (Vitest)
npm run build      # production build
```

## Tour

- The dark **Demo Bar** at the top switches role (Customer, Vendor, Designer, Admin) and persona, shows notifications for the active persona, and has a **Simulate** menu for the edge cases in spec section 14. On mobile it is a floating "Demo" pill.
- `/journeys` links to every screen with "Open as [persona]".
- All data lives in `localStorage` (`printloom-demo-v1`). **Reset** in the Demo Bar re-seeds it.

## Where things live

- `lib/pricing.ts`: the single pricing engine (section 7.9). `lib/pricing.test.ts` asserts the worked example (৳675, ৳715, ৳6,910, split ৳757.20 / ৳5,552.80).
- `lib/store.ts`: one Zustand store for every role; actions write timeline entries and cross-role notifications.
- `lib/selectors.ts`: derived data shared by all panels (vendor matching, cart flags, earnings, payouts).
- `app/(customer)`, `app/vendor`, `app/designer`, `app/admin`: role screens.
- Stock photos in `public/stock` and raster designs in `public/designs` come from Magnific (Freepik) stock previews.
