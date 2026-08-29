# Aqua Flow — Supplier Mobile App

React Native app for Aqua Flow suppliers: run the water shop from a phone —
onboarding and verification, the order inbox, fulfilment with a delivery OTP,
catalog and stock, the container ledger, compliance, earnings and support.

Same account and the same API as the
[supplier web portal](../aqua-flow-supplier-portal1); the code structure follows
[hhcwholesaleapp](../hhcwholesaleapp), and the screens follow the
[Aqua Flow Supplier App design](https://umairhussain123.github.io/Aqua_flow_Desing/Aqua%20Flow%20Supplier%20App.dc.html)
(screens SA1–SA6, SB1–SB6, SC1–SC3; SW1–SW6 in that file are the web portal).

## Stack

- React Native 0.87 · React 19 · TypeScript
- React Navigation 7 (native-stack + bottom-tabs)
- Redux Toolkit + redux-persist (`src/Redux`)
- Axios with a shared instance, Keychain token storage and global 401 handling
  (`src/Server/Config.tsx`)
- Formik + Yup (`src/Formik`)
- react-native-paper, react-native-svg, react-native-linear-gradient,
  react-native-toast-message

## Getting started

```bash
npm install
```

```bash
npm run android
```

```bash
npm run ios
```

iOS also needs `cd ios && pod install` after a fresh `npm install`.

## Structure

```
App.tsx                      Safe area, offline modal, Toast host
index.js                     AppRegistry entry
src/
  Constant/
    Colors.ts                 Design tokens straight from the .dc.html
    Fonts.ts, GlobalStyle.ts
    NavigationStrings.ts      Every route name
  Navigatoin/
    NavigationContainers.tsx   Redux + Paper + NavigationContainer + GlobalLoader
    NavigationService.tsx       navigate/replace/resetTo from outside React
    Routes.tsx                   The one stack
    TabNavigator.tsx              Home · Orders · Catalog · Money · Shop
    index.tsx                      Screen re-exports
  Server/                      One folder per API area
    Config.tsx                  Axios instances, token, interceptors, BASE_URL
    User.tsx                     login / logout / forgot / reset / apply
    Shops/ShopsApi.ts             GET /supplier/shops
    Order/                         Orders + the fulfilment chain
    Product/ProductsApi.ts          Shop products, stock adjustments
    Disputes/DisputesApi.ts          Jar disputes
    Ticket/TicketApi.ts               Support tickets
    ShopSettings/                      Business hours, holidays, service zones
    Dashboard/DashBoardApi.ts           SB1, assembled from orders + products
    Earnings/EarningsApi.ts              SB6, derived from delivered orders
    Container/ContainerApi.ts             Ledger, derived from deposits
    Compliance/ComplianceApi.ts            SC2 — no API yet, see below
  Redux/                       store, persist, slices (user, shop, filter, …)
  Screens/
    Auth/                       SA1–SA6
    Main/                        SB1–SB6, SC1–SC3
  Component/                   Common primitives, cards, icons
  Formik/                      Yup schemas
  helper/                      Money/date formatting, Keychain, local drafts
  hooks/
```

## API

`.env` holds `API_URL`, read through `@env` in `src/Server/Config.tsx` with the
staging URL as a fallback:

```
API_URL=https://auqago-production.up.railway.app/api/v1
```

Every screen below is wired to the live Aquago Supplier API.

### Auth

| Action | Endpoint |
| --- | --- |
| Sign in | `POST /supplier/login` |
| Sign out | `POST /supplier/logout` |
| Request a reset | `POST /supplier/forgot-password` |
| Set a new password | `POST /supplier/reset-password` |
| Apply to become a supplier | `POST /supplier/apply` |

`POST /supplier/login` returns `{ token, user: { id, name, email, roles } }`.
The token goes into the Keychain and onto `privateAPI`; a 401 on any later call
retries once with a freshly-read token and then signs out for real.

Outside production `forgot-password` also returns `reset_token`, so the app
links straight through to the reset form instead of waiting for an inbox.

### Shops

`GET /supplier/shops` — the login response carries no shop info, so this is how
the app learns its `shop_id`. It runs on the splash screen and after sign-in,
and the result lives in the `shop` slice. A `supplier_owner` gets every shop
(the Shop tab lets them switch); a manager or delivery account gets only theirs.

### Orders

| Action | Endpoint |
| --- | --- |
| Inbox | `GET /supplier/shops/{shop}/orders` |
| Detail | `GET /supplier/shops/{shop}/orders/{id}` |
| Accept / reject | `POST .../accept`, `POST .../reject` |
| Filled / out for delivery | `POST .../prepare`, `POST .../dispatch` |
| Delivery OTP | `POST .../deliver` |
| Close | `POST .../complete` |
| Thread | `GET`/`POST .../messages` |

The API filters one status at a time, so a tab covering several ("Preparing" =
accepted + preparing, "Done" = delivered/completed/rejected/cancelled) fetches
each and merges newest-first.

### Shop products

| Action | Endpoint |
| --- | --- |
| List (search, category, brand, low_stock, sort, paginate) | `GET /supplier/shops/{shop}/products` |
| Add a listing | `POST /supplier/shops/{shop}/products` |
| Update price/deposit/stock/return mode/visibility | `PUT .../products/{id}` |
| Remove | `DELETE .../products/{id}` |
| Signed stock change with a reason | `POST .../products/{id}/adjust-stock` |

Two constraints come from the API, not the UI:

- **No catalog browse endpoint** — `/admin/products`, `/admin/categories` and
  `/admin/brands` are admin-only, so "Add product" takes a numeric `product_id`,
  and the category/brand filters are derived from whatever the current listings
  carry.
- **`deposit_amount` only applies to `return_mode: refundable_deposit`** — the
  form forces it to `0` for `refill_only` and `non_returnable`.

### Shop settings

| Action | Endpoint |
| --- | --- |
| Read / replace the week | `GET`, `PUT /supplier/shops/{shop}/business-hours` |
| Holidays | `GET`, `POST`, `DELETE /supplier/shops/{shop}/holidays[/{id}]` |
| Delivery zones | `GET`, `POST`, `PUT`, `DELETE /supplier/shops/{shop}/service-zones[/{id}]` |

`day_of_week` is 0 = Sunday … 6 = Saturday. The PUT **replaces the whole week**,
so all seven days always go out, and the editor back-fills any day the API
omits. A holiday's `date` comes back as a full ISO timestamp but the POST takes
a plain `YYYY-MM-DD` — the day is sliced out of the string rather than parsed
through `Date`, so a midnight-UTC stamp can't slide backwards in a behind-UTC
timezone. The app creates radius zones only; for an existing polygon the form
edits just the fee, minimum and ETA and says so.

### Disputes and support

| Action | Endpoint |
| --- | --- |
| Disputes | `GET`, `POST /supplier/shops/{shop}/disputes`, `GET .../disputes/{id}` |
| Tickets | `GET`, `POST /supplier/support-tickets`, `GET`, `POST /supplier/support-tickets/{id}[/messages]` |

Tickets are **account-scoped, not shop-scoped** — no shop id in the path.
Neither list endpoint takes the filter the tabs need, so Live / Closed partition
the current page locally (open + investigating / open + pending are Live).
Investigating a dispute and closing a ticket are admin-side; the supplier raises
it, replies, and watches `status`, `resolution_notes`,
`financial_adjustment_amount`, `assignee` and `sla_due_at`.

## Derived, not mocked

Three screens the design calls for have no endpoint on the supplier API. Rather
than shipping the portal's `dummy-data.ts`, they are computed from endpoints
that do exist:

- **Dashboard (SB1)** — today's orders, delivered count and revenue from
  `GET .../orders`; low stock from `GET .../products`.
- **Money (SB6) and Statements** — the week's water sales, delivery fees,
  deposits, 10% commission and net payout, from the week's delivered orders.
- **Container ledger** — who's holding jars, folded up from orders with an open
  deposit.
- **Activity feed** — orders awaiting a decision, low stock, live tickets and an
  expiring document.

One screen genuinely has nothing behind it: **Compliance (SC2)**. Documents are
uploaded and verified ops-side, so `src/Server/Compliance/ComplianceApi.ts`
holds local placeholder data in the shape the API is expected to return, and
"Renew" opens a support ticket — the channel that does exist. Swapping it is a
one-file change.

Two more places collect things `POST /supplier/apply` has no field for:

- The application's **documents step (SA4)** records what the supplier has ready
  on the device; ops collect the files during verification.
- The application's **hours and service area (SA5)** are saved as a local draft
  (`src/helper/opsDraft.ts`) and pre-fill Shop settings once the shop exists — a
  shop id is needed before the business-hours and service-zone endpoints can be
  called at all.

## Screens

| Design | Screen |
| --- | --- |
| SA1 | `Screens/Auth/Login` |
| SA2–SA5 | `Screens/Auth/ApplyScreen` (4-step wizard) |
| SA6 | `Screens/Auth/ApplicationStatusScreen` |
| SB1 | `Screens/Main/Dashboard/DashBoardScreen` |
| SB2 | `Screens/Main/Order/OrderScreen` |
| SB3 | `Screens/Main/Order/OrderDetailScreen` |
| SB4 | `Screens/Main/Order/CompleteDeliveryScreen` |
| SB5 | `Screens/Main/Catalog/CatalogScreen` |
| SB6 | `Screens/Main/Money/MoneyScreen` |
| SC1 | `Screens/Main/Shop/ShopScreen` |
| SC2 | `Screens/Main/Compliance/ComplianceScreen` |
| SC3 | `Screens/Main/Support/SupportScreen` |

Beyond the design: forgot/reset password, order messages, the product form,
stock adjustment, container ledger, opening hours, holidays, delivery zones,
ticket detail, dispute list/detail/raise, statements, activity and profile.

## Checks

```bash
npx tsc --noEmit
```

```bash
npm run lint
```

```bash
npm test
```
