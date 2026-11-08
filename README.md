# Tinzel Frontend

Modern React application powered by Vite, communicating with the Tinzel Express & MongoDB backend.

## Features

- **React + Vite**: Ultra-fast hot module replacement.
- **Lucide Icons**: Crisp SVG typography & status indicators.
- **Backend API Integration**: Built-in proxy and configurable `VITE_API_URL`.
- **Live Diagnostics**: Real-time status cards for Express and MongoDB health.

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Start development server
```bash
npm run dev
```

The frontend will run on `http://localhost:5173` and proxy API calls to the backend on `http://localhost:5000`.

### 4. Build for production
```bash
npm run build
```

## Payment options

Admins manage payment details at **System → Configuration → Payment options** (`/staff/system`). Add up to 20 Lipa Namba, mobile money, bank transfer or other options, including the provider name, payment number, account name and instructions. Kiswahili names and instructions are optional. Options can be reordered, hidden or removed; use **Save payment options** to apply changes.

Enabled options appear after submission and on unpaid orders in the tracking portal. Until these settings are first saved, existing forms retain their legacy payment details. Saving an empty list or hiding every option shows an unavailable-details message and does not restore legacy numbers. New forms have no placeholder payment destination. Payment confirmation remains a manual manager action.

## Branded page states

The shared state family covers loading, empty lists, no matches, unavailable content, retry, stale/partial information, validation, progress, confirmed success, expired access, conflicts and unsaved-work confirmations in English and Kiswahili. Recovery remains local to the affected section and preserves usable data or input.

For local design review, start the development server and open `/__states`. The gallery has 51 page/surface entries, a state selector, language controls, a mobile preview and a confirmation example. All displayed outcomes are samples; the gallery is excluded from production builds.

The approved inventory and implementation evidence are recorded in [the approved page-state plan](docs/page-states-plan.md). The `page-states-*.spec.js` browser checks cover real page behavior using controlled responses, including failed refreshes, uncertainty before resubmitting, independent retries, focus, and bilingual recovery.
