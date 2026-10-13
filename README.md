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
