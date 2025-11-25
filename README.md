## African Corners API

NestJS + TypeORM backend that powers the African Corners platform.

### Prerequisites
- Node.js 20+
- PostgreSQL 14+
- npm

### Environment variables
Use `env.example` as the template and create your own `.env`.

| Name | Description |
| --- | --- |
| `NODE_ENV` | `development` locally, `production` on Railway |
| `PORT` | HTTP port (`4000` default, Railway injects `PORT`) |
| `FRONTEND_URL` | Comma separated list of allowed origins |
| `DATABASE_URL` | Optional Postgres connection string (Railway provides) |
| `DATABASE_HOST/PORT/USER/PASSWORD/NAME` | Standard Postgres parameters when `DATABASE_URL` is empty |
| `DATABASE_SSL` | `true` to force SSL (Railway Postgres) |
| `JWT_SECRET` | Secret used to sign auth tokens |

### Local development
```bash
cp env.example .env
npm install
npm run start:dev
```

### Docker (used by Railway)
```bash
docker build -t corners-api .
docker run --env-file .env -p 4000:4000 corners-api
```

### Deploying on Railway
1. Create a new Railway project and select **Deploy from GitHub**.
2. Add this repository and enable automatic deployments from `main`.
3. Provision a **PostgreSQL** database plugin. Railway will expose `DATABASE_URL`, `DATABASE_HOST`, etc.
4. Set the following variables in the Railway dashboard:
   - `NODE_ENV=production`
   - `DATABASE_URL` (Railway auto-fills when you link the database)
   - `FRONTEND_URL` with your allowed origins
   - `JWT_SECRET` with a strong random value
5. Under **Settings → Build & Deploy**, set:
   - Build command: `npm install && npm run build`
   - Start command: `npm run start`
6. Trigger a deploy. Railway will install dependencies, build the Nest app, and run it via the `Dockerfile`.

### Railway CLI (optional)
```bash
npm i -g @railway/cli
railway login
railway link
railway variables set JWT_SECRET=supersecret
railway up
```

The seed routine runs automatically on boot and is idempotent, so your Railway deployment will always have baseline data.

