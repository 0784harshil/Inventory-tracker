# StockFlow - Cloud Solution

Multi-store inventory tracking system with real-time synchronization.

## Quick Deploy to Vercel

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   - Rename `env.example.txt` to `.env.local`
   - Fill in your Supabase credentials

3. **Deploy**
   ```bash
   npm run build
   vercel --prod
   ```

## Environment Variables

Set these in Vercel Dashboard or `.env.local`:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

## Features

- ✅ Multi-store inventory management
- ✅ Real-time bidirectional sync
- ✅ Inter-store transfers
- ✅ Inventory reports
- ✅ Department management

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)
