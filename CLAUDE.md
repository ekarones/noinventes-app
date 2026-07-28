# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Monatekeda** — a mobile app for a retail business, backed by a Laravel API at
`https://inventario.monatekeda.com/api/mobile`. One login, **two interfaces** chosen by the
user's role:

- **Seller** — a point-of-sale: browse the catalog, build a cart, check out a sale, review
  sales history and dashboard statistics. Everything is scoped to the seller's own branch.
- **Admin** — global management: cross-seller dashboard, all sales (view / receipt / cancel /
  trash), and CRUD of the master catalog (products with images & variations, categories, tags,
  attributes, branches, users).

Admins are rejected (`403`) from seller endpoints and vice-versa.

## Stack

Expo (managed workflow) + React Native + TypeScript. Created with `create-expo-app` (`blank-typescript`).

- Expo SDK `~56.0`, React Native `0.85.3`, React `19.2.3`, TypeScript `~6.0.3`.
- Navigation: `@react-navigation/*` (bottom tabs + native-stack).
- Native modules in use: `expo-camera` (QR scanning), `expo-image-picker` (product images),
  `expo-secure-store` (token), `expo-file-system` + `expo-sharing` (download & share the receipt
  PDF), `expo-haptics`, `@react-native-async-storage`.
- **IMPORTANT (from AGENTS.md):** Expo changes between versions. Read the exact versioned docs at
  https://docs.expo.dev/versions/v56.0.0/ before writing code that touches Expo APIs or native modules.

## Commands

```bash
npm start          # Start Metro + Expo dev server (scan QR with Expo Go app)
npm run android    # Open on Android emulator/device
npm run ios        # Open on iOS (requires macOS; otherwise use Expo Go)
npm run web        # Run in the browser
npx tsc --noEmit   # Type-check (there is no lint or test runner configured)
```

This is a **Windows** machine without Java/Android Studio installed, so native builds
(`expo prebuild`, `npm run android`) won't work locally. The dev loop is `npm start` + the
**Expo Go** app on a physical phone (same Wi-Fi). Native builds are produced via **EAS**
(`eas.json`: APK for `preview`, app-bundle for `production`).

## Architecture

Layered, with a clean split between the network layer and the UI.

- **`src/api/`** — the network layer. `client.ts` wraps `fetch`, throws a typed `ApiError`
  (status + Laravel field errors), enforces WAF-friendly requests (always sends a JSON body +
  `Content-Type` on mutations) and passes `FormData` through untouched for uploads.
  `session.ts` holds the Bearer token in memory and a global 401 handler. `config.ts` holds
  `API_BASE_URL` (switch to a LAN IP for local dev).
  - Seller endpoints: `auth`, `products`, `sales`, `boleta`.
  - Admin endpoints: **`src/api/admin/`** — `dashboard`, `sales`, `boleta`, `products`,
    `productImages`, `categories`, `tags`, `attributes`, `branches`, `users`.
  - Every module **normalizes the server's snake_case + string-decimals into camelCase +
    `number`** before the data reaches the UI.
- **`src/types/index.ts`** — shared domain types, both seller (`Product`, `CartItem`, `SaleDetail`)
  and admin (`AdminProductDetail`, `AdminSaleSummary`, `AdminCategory`, `StockByBranch`, …).
  These are the normalized shapes, not the raw API shapes.
- **`src/context/`** — global state via React Context: `AuthContext` (token in secure-store,
  validated against `/me` on startup, exposes `user.role`, global sign-out on 401), `CartContext`
  (cart persisted to AsyncStorage, clamped to available stock), `ToastContext`.
- **`src/navigation/`** — two roots, picked by role in `App.tsx`:
  - `AppNavigator` (seller) — tabs: Inicio / Catálogo / Ventas / Historial.
  - `AdminNavigator` (admin) — tabs: Inicio / Ventas / Productos / Más.
  Param lists for both live in `types.ts`.
- **`src/screens/`** — seller screens (Login, Dashboard, Catalog, ProductDetail, Cart, Checkout,
  Orders, OrderDetail, Profile) and `Admin*` screens for each admin area.
- **`src/theme/`** — `colors.ts` and **`tokens.ts`**, the single source of truth for size, rhythm
  and shape. Screens do **not** write raw numbers for type, spacing or radius — they read a token.
- **`src/components/`** — the UI system. Seller and admin render the *same* components; only the
  data and the actions differ.
  - Layout: `ScreenTitle` (tab-root header), `ScreenHeader` (pushed screen, back chevron),
    `Card` (bordered panel).
  - Controls: `Button`, `IconButton`, `Field` (label + input + hint/error), `SearchBar`, `Chip`,
    `Segmented`, `FilterControls` (the sort/clear pills), `BottomSheet` (every picker and inline
    form in the app).
  - Content: `ProductCard`, `SaleCard`, `KpiCard`, `SaleTotals`, `Row` (`InfoRow` / `ActionRow` /
    `MetaRow` — the rows that live inside a `Card`), `ProductImage`, `QRScannerModal`.
  - States: `LoadingState`, `EmptyState` — between them, every screen's *loading / empty / failed*
    comes from two files.
- **`src/utils/`** — pure helpers: `cart` (line key/price/stock), `format`, `stock`, `payment`,
  `haptics`, `slug` (mirrors Laravel's `Str::slug` for variation codes), `imagePicker`,
  `sortOptions` (the sort presets, shared by both roles). **`src/hooks/`** — `useDebounce`.
- `index.ts` — entry point; `registerRootComponent(App)`. `App.tsx` — providers + auth gate
  (splash while restoring session → LoginScreen if signed out → seller tabs or admin tabs by role).

### Conventions worth keeping

- **The design system is the rule, not a suggestion.** Never write a raw number for a font size, a
  spacing or a radius — every one of them lives in `src/theme/tokens.ts`:
  - Type: `FONT_SIZE` / `FONT_WEIGHT`. There is deliberately no 10 or 17 — a one-point difference is
    invisible, so it only ever means someone eyeballed it.
  - Rhythm: `SPACING`, a 4pt grid. `hairline` (2) is the one step off it, for an optical nudge.
    The screen margin is `SPACING.sm` (8): anything that touches the screen edge uses it
    (the shared `ScreenTitle` / `ScreenHeader` headers and every list / grid / form gutter).
  - Shape: `RADIUS`, four roles — `badge`, `control`, `card`, `pill`. A circle or a pill is
    `RADIUS.pill`, **never** `width / 2`: hard-coding half the height means resizing the box
    silently un-rounds it.
  - Touch: size a control to `TOUCH_MIN` (44) rather than padding it out with `HIT_SLOP`. A hit slop
    makes the tappable area bigger than the thing you can see — it reads as a stray margin and lets
    neighbouring buttons steal taps. Keep it only for a control that genuinely can't grow (an "✕"
    living inside a chip or a text field).
- **Seller and admin render the same components.** They are one product with two scopes, not two
  apps. If a screen needs something the other role also has, it belongs in `src/components/`, not in
  a second copy — that is exactly how the app once ended up with two sale cards, five filter chips
  and ten hand-rolled bottom sheets.
- **Safe-area insets:** the bottom tab bar already reserves the bottom inset, so a screen inside a
  navigator must **not** add `insets.bottom` — that double-counts it. Only `LoginScreen` pays it,
  because it renders outside every navigator. The top is the opposite: navigators run with
  `headerShown: false`, so each screen (or its `ScreenHeader` / `ScreenTitle`) pays `insets.top`.
- **Boundary normalization:** keep snake_case/string-decimal parsing inside `src/api/*` mappers; the
  rest of the app only ever sees camelCase + numbers. Add new endpoints the same way.
- **Errors:** throw/catch `ApiError` — its `message` is already user-friendly (it prefers the
  server message, then the first validation error). A 401 on a session-token request auto-signs-out.
  The API returns `422` with an explanatory message for most business-rule violations (deleting a
  category that has children, an attribute value still in use, self-deletion); surface that message
  rather than inventing one.
- **Sales are NOT idempotent:** `POST /sales` uses a 30s timeout and the checkout screen handles the
  "unknown state" case on timeout. Be careful not to introduce silent retries.
- **Uploads:** pass a `FormData` body to `apiRequest` and it goes out as multipart — never set
  `Content-Type` yourself (fetch adds the boundary). Multipart can't be sent as `PUT`, so updating
  a product with a new image POSTs with `_method=PUT` (Laravel method spoofing).
- **Stock edits merge:** `PUT .../stock` only changes the branches you send; the rest keep theirs.
- **Attribute values:** renaming one must go through `PUT /attributes/{a}/values/{v}` (by id).
  The attribute `PUT` diff-syncs values *by string*, so renaming there would delete and recreate
  the value, breaking the variations that point at it.
- Install native deps with `npx expo install <pkg>` (not plain `npm install`) so versions stay
  SDK-compatible.

## App identity / config

`app.json`: display name **Monatekeda**, slug `mobileapp`, Android package `com.mobileapp.demo`
(still the placeholder — rename before store release). Camera (QR) and photo-library (product
images) permissions are declared. EAS project id and owner (`ekarones`) live under `extra.eas` /
`owner`.
