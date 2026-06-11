# InvestingAtti AI Stock Analyst Mobile App

A premium, smooth, distraction-free React Native mobile application for the **InvestingAtti AI Stock Analyst**. Designed for reading long AI-generated financial reports, technical indicators, entry/exit zones, and risk logs in a calm, modern layout.

## Stack & Architecture

- **Core**: React Native, Expo, TypeScript
- **Navigation**: React Navigation (Stacks, Bottom Tabs)
- **State Management**: Zustand (Auth, Local Search History Cache)
- **API Cache**: TanStack Query (React Query)
- **UI & Graphics**: React Native SVG (Custom Price Line & Target Charts)
- **Secure Storage**: Expo SecureStore (JWT Token caching)
- **Alert Notifications**: Expo Notifications

---

## Design System & Theme

Uses a premium soft dark slate reading theme optimized to reduce eye strain:

- **Primary Background**: `#0B0F14` (Deep navy charcoal)
- **Card Background**: `#111827` (Soft slate)
- **Elevated Card**: `#162033` (Elevated card slate)
- **Primary Text**: `#E5E7EB` (Comfortable off-white)
- **Secondary Text**: `#94A3B8` (Soft slate gray)
- **Subtle Borders**: `#263244`
- **Tones**: 
  - Buy: Soft Green (`#10B981`)
  - Sell: Soft Red (`#EF4444`)
  - Hold: Warm Amber (`#F59E0B`)
  - Watchlist: Muted Blue (`#3B82F6`)

---

## Features

1. **Briefing Dashboard (Home)**: Daily focuses, active watchlist signals, and local search history cache.
2. **Subscription Roles**: Supports registration and logins under `BASIC`, `PRO`, `MAX`, `ADMIN`, and `SUPERUSER` roles. 
   - *BASIC* users have restricted access to deep fundamental analysis blocks and institutional flows.
3. **AI Stepper loading**: Stepper progress timeline indicating multi-agent tasks during analysis.
4. **Article Reading Mode**: Font size scaling, table of contents jumps, "Key Points Only" filters, and an "Explain Simply" translator button.
5. **Interactive Charts**: Clean custom SVG-based line graphs representing trends, support boundaries, and profit resistance triggers.
6. **Natural Language Alerts**: Create price and indicator alerts by typing natural instructions like `"Alert me when AMD enters accumulation zone"`.

---

## Installation & Running

### 1. Prerequisites
Ensure you have Node.js (v18+) and npm/yarn installed. 

### 2. Configure Backend API
The mobile app automatically routes requests to:
- **Android Emulator**: `http://10.0.2.2:3000` (automatically maps to your localhost)
- **iOS Simulator**: `http://localhost:3000`

If your backend is running on a custom LAN address, edit `app/services/apiClient.ts`:
```typescript
export const API_BASE_URL = 'http://YOUR_LAN_IP:3000';
```

### 3. Install packages
Inside the `mobile-app` directory:
```bash
npm install
```

### 4. Launch the Dev Server
```bash
npm run start
# Press 'a' for Android Emulator
# Press 'i' for iOS Simulator
```

---

## Limitations

- HMR WebSocket requests use `localhost` directly to prevent CORS/Tunnel blockage when developing on the same machine.
- Paper trading is out of scope for this mobile client implementation.
