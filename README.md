# Shop POS Mobile

The phone and tablet app for [Shop POS](https://github.com/Zomby010/Shop-POS), built with React Native (Expo).

It talks to the Shop POS website's JSON API (`/api/v1/`), so the app and the website share the same Neon database and the same business logic. The phone never holds the database password: staff sign in with their Shop POS username and password and the app keeps a revocable token in the device's secure storage.

## What it does

- **Sell**: scan with the camera or type a barcode (`12*barcode` for a quantity), search by name, quick-sale tabs, loose goods by quantity or by amount, bulk tiers, presets, items not in the system, hold and resume sales.
- **Pay**: cash, M-Pesa, card, deni (credit) or a split, change worked out like the till, printable/shareable receipt.
- **Sales**: today's and past sales, receipt reprint, refunds and voids with the owner's PIN.
- **Products**: search and filter, add and edit products (prices, bulk tiers, quick-sale buttons, alert levels), check items added at the till, categories and quick-sale tabs, stock history.
- **Stock**: overview, receiving and past purchases, paying suppliers, recounts, converting stock, stock takes, losses, low stock, movements and the loose-goods loss report.
- **More**: customers (balances, deni history, repayments), held sales, expenses, cash-up, reports summary, sign out.

Privileges come from the website: a user only sees what they are allowed to do, and actions that need the owner's PIN ask for it.

## Run it

```bash
npm install
npx expo start
```

Then open it in Expo Go, or build with `npx expo run:android` / `npx expo run:ios`. On the sign-in screen, enter the website's address (for example `https://your-shop-pos.vercel.app`) once; the app remembers it.

The website must have the API deployed first (Shop-POS PR #15).

## Checks

```bash
npm run typecheck
npm test
```

## Layout

- `app/` screens (expo-router)
- `src/api/` API client and types
- `src/domain/` cart, pricing and payment rules, ported from the website so totals show instantly (the server re-prices at checkout)
- `src/store/` session, catalog, cart and scanner state
- `src/components/` shared UI
- `tests/` unit tests for the ported rules
