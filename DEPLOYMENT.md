# Vercel Monorepo Deployment

Deploy from the repository root. Vercel will install both workspaces, build the Vite frontend, and serve the Express API through `api/[...path].js`.

## Vercel Settings

- Framework Preset: Other
- Root Directory: repository root
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `frontend/dist`

These settings are also captured in `vercel.json`.

## Required Environment Variables

Set these in Vercel Project Settings:

```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=replace-with-a-long-random-secret
REFRESH_TOKEN_SECRET=replace-with-a-different-long-random-secret
FRONTEND_URL=https://your-vercel-domain.vercel.app
NODE_ENV=production
```

Optional email variables:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@example.com
FROM_NAME=BOM Engineers
```

The frontend uses same-origin API calls by default: `/api/v1`. For a separate API host, set `VITE_API_BASE_URL` before building.
