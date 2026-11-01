---
name: expo-feature-conventions
description: Use when creating or reviewing screens, features, forms, utils or API code in an Expo Router + NativeWind app, to enforce feature-based structure, safe fintech handling and shared utilities.
---

# Expo feature conventions

Stack assumed: Expo (SDK 54+), Expo Router, TypeScript strict, NativeWind (className only), React Hook Form + Zod, TanStack Query, Zustand, native `fetch`. Explain the reason for any new pattern in plain language before or beside the code. Prefer the simpler pattern when two reach the same goal. Fix only what was asked; do not redesign existing UI. When writing code, output complete copy-paste-ready files, not partial diffs.

## 1. Folder structure (feature-based)

```
src/
  app/                      # ROUTES ONLY. Thin files: import a screen, render it.
    _layout.tsx
    index.tsx
    (auth)/ sign-in.tsx, (sign-up)/step1.tsx ...
    (root)/(tabs)/ home.tsx, history.tsx, profile.tsx, _layout.tsx
    (root)/(screens)/ _layout.tsx, airtime.tsx
  features/
    <feature>/              # auth, airtime, wallet, history, profile ...
      screens/              # full screens (XxxScreen.tsx)
      components/           # UI used only by this feature
      hooks/                # useXxx (queries, mutations, local logic)
      api/                  # fetch calls for this feature
      schemas/              # Zod schemas + inferred types
      store/                # Zustand store, only if needed
      types.ts
      constants.ts
      index.ts              # public exports of the feature (barrel)
  components/               # SHARED, feature-agnostic UI (Button, Input, Header, Keypad, Screen)
    icons/                  # SVG icon components + index.ts barrel
  lib/                      # app-wide infrastructure: api client, query client, secure storage
  utils/                    # pure helper functions (money, phone, date, strings)
  hooks/                    # shared hooks (useDebounce, useTimeout)
  constants/                # colors, limits, layout
  config/env.ts
  types/                    # global types, image/svg declarations
  mocks/                    # only if used; delete dead mocks
assets/                     # images, fonts only (no code)
```

Rules:
- Route files contain no business logic, no Zod schemas and no hardcoded data. A route file is `export { default } from ...` or renders one screen.
- Anything inside `src/app/` becomes a route. Never put schemas, helpers, components or tests there.
- A feature never imports from another feature's internals. Import only from that feature's `index.ts`. Shared code moves up to `components/`, `hooks/` or `utils/`.
- Use path aliases (`@/...`), never `../../../`. Use a separate alias for assets (e.g. `@assets/*`) so it does not collide with `@/*`.
- One component per file, PascalCase file name. Hooks `useXxx.ts`. Utils camelCase. Schemas `xxx.schema.ts`.
- Delete commented-out code, dead mocks, unused dependencies, duplicate assets and template leftovers (`react-logo`, `expo-badge`, scaffolds like `my-expo-app/`). Git keeps history.
- Asset names: kebab-case, no spaces, no hashes. Compress large PNGs (aim under ~200 KB).

## 2. Coding conventions

- **Styling:** NativeWind `className` only. No `StyleSheet` and no inline `style` except for values that are truly dynamic (measured sizes, animated values). Put brand colors in `tailwind.config.js` (`brand`, `brand-ink`, `surface`) and use `bg-brand`, never raw hex repeated across files. Register custom fonts with `useFonts` and a `fontFamily` entry in Tailwind. Add `./src/**/*.{ts,tsx}` to Tailwind `content`.
- Class-name typos fail silently. After writing UI, re-read each className for: missing `#` in `bg-[#...]`, `w-fit` (invalid in RN), dangling `font-`, `text-whit`.
- `react-native-svg` does not read `className` unless wrapped with `cssInterop`. Pass `width`/`height`/`style` to `Svg` or wrap it in a styled `View`.
- **Components:** function components, `Pressable` (not TouchableOpacity), typed props via `interface XxxProps`, `export default` for screens and components. Extract repeated blocks (form field, header, PIN entry) as soon as they appear twice.
- **Lists:** use `FlatList`/`FlashList` with a stable `keyExtractor`; never `key={index}` for data that can change. Long screens use `ScrollView` and `SafeAreaView` (from `react-native-safe-area-context`); the tab bar must respect the bottom inset (`useSafeAreaInsets`).
- **Status bar:** one `<StatusBar style="dark" />` from `expo-status-bar` in the root layout, not per screen.
- **Navigation:** after login/sign-up/logout use `router.replace`, not `push`. Tab route names must match file names exactly. Add a `_layout.tsx` to every route group you navigate into.
- **TypeScript:** no `any`. Type icon names with `ComponentProps<typeof Ionicons>["name"]`. Enable `noUnusedLocals` and `noUncheckedIndexedAccess`. Use `useWindowDimensions()` instead of `Dimensions.get` at module level.
- **Effects and timers:** every `setTimeout`/listener started in a component is cleared in cleanup. Do not mark a handler `async` unless it awaits.
- **Forms:** React Hook Form + Zod resolver. Use `useForm` only for real forms; plain `useState` for simple UI state. Build one reusable `FormTextField` (Controller + label + error) instead of repeating it per field. Keep schemas in `features/<x>/schemas/`.
- **Data:** server state in TanStack Query, client/session state in Zustand, forms in RHF. Do not mix. Multi-step flows (sign-up) keep collected data in a small Zustand store so the last step can submit everything.
- **Network:** native `fetch` through the one `apiFetch` helper below. Never hardcode `localhost`; read the base URL from `config/env.ts` (Android emulator needs `10.0.2.2`). Provide `.env.example`.
- **Accessibility:** every icon-only `Pressable` gets `accessibilityRole="button"` and `accessibilityLabel`. Touch targets at least 44x44 (use `hitSlop` if the visual is smaller). Inputs get `accessibilityLabel` and the right `keyboardType`, `autoComplete`, `textContentType`.
- **Images:** use `expo-image` for remote/large images; local assets are required with the alias. No third-party stock URLs (Unsplash, pravatar) in shipped code.
- **Hardcoded data** (names, balances, account numbers, transaction lists) lives in a `mocks/` or `__fixtures__` module and is replaced by API data, never inline in JSX.
- Config hygiene: set a real `name`, `slug`, `scheme`, `ios.bundleIdentifier`, `android.package` in `app.json`. Only enable `reactCompiler` if `babel-plugin-react-compiler` is installed. Install `eslint`, `eslint-config-expo`, `prettier`, `prettier-plugin-tailwindcss` and run `expo lint` plus `tsc --noEmit` before finishing.

## 3. Security and fintech rules

- Never `console.log` passwords, PINs, tokens, phone numbers, emails or request bodies. Use the `logger` util below, and only for non-sensitive info.
- PIN/passcode and password checks happen on the server (or secure hardware via biometrics). No hardcoded PINs in the client. Add server-side attempt limits and lockout.
- Tokens go in `expo-secure-store`, never AsyncStorage.
- Money is an integer in **kobo** everywhere in state and API. Convert only at the edges with `formatNaira` and `parseNairaToKobo`. Never use floats for amounts. Keep limits (min/max airtime) in one constants file.
- Nigerian phone numbers are normalized to `234XXXXXXXXXX` before validation and sending.
- Send an idempotency key with every payment/transfer request and disable the submit button while the mutation is pending.
- Release builds must use HTTPS.

## 4. Utilities to create

Create these as separate files. They are pure, dependency-free and easy to unit test.

### `src/utils/money.ts`

```ts
/** Format kobo as Naira: 2545300 -> "₦25,453.00". Manual grouping avoids Intl differences on Hermes. */
export function formatNaira(kobo: number, options: { showSymbol?: boolean; showDecimals?: boolean } = {}): string {
  const { showSymbol = true, showDecimals = true } = options;
  const negative = kobo < 0;
  const abs = Math.abs(Math.round(kobo));
  const naira = Math.floor(abs / 100);
  const decimals = String(abs % 100).padStart(2, "0");
  const grouped = String(naira).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const body = showDecimals ? `${grouped}.${decimals}` : grouped;
  return `${negative ? "-" : ""}${showSymbol ? "₦" : ""}${body}`;
}

/** Parse user input like "1,500.50" into kobo (150050). Returns null if invalid. String-based to avoid float errors. */
export function parseNairaToKobo(input: string): number | null {
  const cleaned = input.replace(/[₦,\s]/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const [whole = "0", frac = ""] = cleaned.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

export const isAmountInRange = (kobo: number, minNaira: number, maxNaira: number): boolean =>
  kobo >= minNaira * 100 && kobo <= maxNaira * 100;
```

### `src/utils/phone.ts`

```ts
/** Normalize Nigerian numbers to 234XXXXXXXXXX. Accepts 0801..., +234801..., 801.... Returns null if not a valid mobile. */
export function normalizeNgPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  let national: string;
  if (digits.startsWith("234")) national = digits.slice(3);
  else if (digits.startsWith("0")) national = digits.slice(1);
  else national = digits;
  return /^[789][01]\d{8}$/.test(national) ? `234${national}` : null;
}

export const isValidNgPhone = (input: string): boolean => normalizeNgPhone(input) !== null;

/** 2348012345678 -> 0801 234 5678 */
export function formatNgPhoneLocal(input: string): string {
  const normalized = normalizeNgPhone(input);
  if (!normalized) return input;
  const local = `0${normalized.slice(3)}`;
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}

/** 08012345678 -> 0801****678 */
export function maskPhone(input: string): string {
  const normalized = normalizeNgPhone(input);
  if (!normalized) return input;
  const local = `0${normalized.slice(3)}`;
  return `${local.slice(0, 4)}****${local.slice(-3)}`;
}
```

### `src/utils/format.ts`

```ts
export const maskAccountNumber = (acct: string): string =>
  acct.length <= 4 ? acct : `${"*".repeat(acct.length - 4)}${acct.slice(-4)}`;

export const toTitleCase = (value: string): string =>
  value.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export const getInitials = (fullName: string): string =>
  fullName.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");

export const truncate = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

export const digitsOnly = (value: string): string => value.replace(/\D/g, "");
```

### `src/utils/date.ts`

```ts
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/** 25 January */
export const formatDay = (date: Date | string): string => {
  const d = new Date(date);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

/** 10:42 AM */
export const formatTime = (date: Date | string): string => {
  const d = new Date(date);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h % 12 || 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
};

/** "5m ago", "2h ago", "3d ago", otherwise "25 January" */
export function timeAgo(date: Date | string, now: Date = new Date()): string {
  const seconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDay(date);
}
```

### `src/utils/async.ts`

```ts
export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Idempotency key for payment requests. */
export const createIdempotencyKey = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
```

### `src/utils/logger.ts`

```ts
/** Dev-only logging. Never pass passwords, PINs, tokens or full personal data. */
export const logger = {
  debug: (...args: unknown[]) => { if (__DEV__) console.log(...args); },
  warn: (...args: unknown[]) => { if (__DEV__) console.warn(...args); },
  error: (...args: unknown[]) => console.error(...args),
};
```

### `src/hooks/useDebounce.ts`

```ts
import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
```

### `src/hooks/useTimeout.ts` (safe timers that clean up)

```ts
import { useCallback, useEffect, useRef } from "react";

export function useTimeout() {
  const ids = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => ids.current.forEach(clearTimeout), []);
  return useCallback((fn: () => void, ms: number) => {
    ids.current.push(setTimeout(fn, ms));
  }, []);
}
```

### `src/config/env.ts`

```ts
const apiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!apiUrl && !__DEV__) {
  throw new Error("EXPO_PUBLIC_API_URL is required in production builds");
}

export const API_URL = apiUrl ?? "http://10.0.2.2:5000/api/v1"; // Android emulator; use LAN IP on a real device
export const API_MOCKING = __DEV__ && process.env.EXPO_PUBLIC_API_MOCKING === "true";
```

### `src/lib/api.ts` (native fetch, timeout, typed errors)

```ts
import { API_URL } from "@/config/env";

export class ApiError extends Error {
  constructor(public status: number, message: string, public data?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  token?: string | null;
  timeoutMs?: number;
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, token, timeoutMs = 15000, headers, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new ApiError(res.status, (data as { message?: string } | null)?.message ?? "Request failed", data);
    }
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if ((error as Error).name === "AbortError") throw new ApiError(0, "Request timed out");
    throw new ApiError(0, "Network error. Check your connection.");
  } finally {
    clearTimeout(timer);
  }
}
```

### `src/features/auth/schemas/auth.schema.ts` (shared validation, Zod 4)

```ts
import { z } from "zod";
import { isValidNgPhone } from "@/utils/phone";

export const personalInfoSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name"),
  phoneNumber: z.string().refine(isValidNgPhone, "Enter a valid Nigerian phone number"),
  email: z.email("Please enter a valid email address"),
});

export const passwordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const passcodeSchema = z.object({
  pin: z.string().length(4).regex(/^\d+$/, "Passcode must contain only numbers"),
});

export type PersonalInfoForm = z.infer<typeof personalInfoSchema>;
export type PasswordForm = z.infer<typeof passwordSchema>;
export type PasscodeForm = z.infer<typeof passcodeSchema>;
```

### `src/constants/limits.ts`

```ts
export const PIN_LENGTH = 4;
export const AIRTIME_MIN_NAIRA = 50;
export const AIRTIME_MAX_NAIRA = 50_000;
```

## 5. Review checklist before finishing any change

1. Route files thin; no schemas/helpers/components inside `src/app/`.
2. Logic lives in `features/<name>/`; cross-feature imports go through `index.ts`.
3. No raw hex repeated, no inline `style` for static values, no class typos.
4. No `any`, unused imports/variables, commented-out code or `console.log` of sensitive data.
5. Money in kobo via `formatNaira`/`parseNairaToKobo`; phone via `normalizeNgPhone`.
6. Every timer cleaned up; `replace` used after auth; tab names match files.
7. Icon-only buttons have accessibility labels; touch targets 44px+.
8. `tsc --noEmit` and `expo lint` pass.

When reviewing existing code, report findings grouped as: broken now, security/fintech, structure, conventions, with the file and line for each, and propose the smallest fix.
