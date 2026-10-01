# Esports E-Certificate Portal

A MongoDB-backed certificate portal for authorized esports participants. The backend owns eligibility, certificate IDs, PDF generation, and QR verification; the React frontend is only a client of those APIs.

## Structure

- `frontend/` Vite + React public portal, verification page, and admin entry point.
- `backend/` Express API, Mongoose models, JWT admin login, spreadsheet import, PDF/QR generation.
- `backend/api/index.js` Vercel serverless entrypoint. `backend/server.js` runs the same app locally.
- `backend/assets/` contains the mandatory default `kl esports logo.png` and `sac logo.png` assets used by certificate PDFs.

## Local setup

1. Copy `backend/.env.example` to `backend/.env` and fill in MongoDB Atlas, JWT, admin, and URL values.
2. Generate an admin password hash with `node -e "console.log(require('bcryptjs').hashSync('replace-me', 12))"` and store only the hash in `ADMIN_PASSWORD_HASH`.
3. Start the API: `cd backend && npm install && npm run dev`.
4. Start the frontend in another terminal: `cd frontend && npm install && npm run dev`.
5. Open the Vite URL shown in the terminal. Set `frontend/.env` with `VITE_API_URL=http://localhost:4000/api` when the API is not on its default URL.

Open the website at `http://localhost:5173` or `http://localhost:5174` if Vite selects the next port. `http://localhost:4000` is the backend API, not the website; its root response is only an API status message. Admin sign-in is at `/admin/login` on the frontend URL.

MongoDB Atlas must allow the API deployment's outbound IP range and contain a database user with access to the configured database. The server recalculates `certificateEligible` from attendance on every participant save/import and checks it again before issuing a certificate.

## Import format

Use `backend/data/sample-participants.csv` as a starting point. Required columns are `ID`, `Name`, `Event`, `Event Date`, `Attendance`, and `Result`. Attendance accepts `YES`, `TRUE`, or `1`; results are `PARTICIPATION`, `WINNER`, or `RUNNER_UP`. Duplicate IDs inside one upload are reported without aborting the remaining rows.

## API

- `POST /api/certificates/request` with `{ "participantId": "KL2026CS1234" }`
- `GET /api/certificates/verify/:certificateId`
- `GET /api/certificates/:certificateId/download`
- `POST /api/admin/login`
- `GET /api/admin/participants` (JWT)
- `GET /api/admin/statistics` (JWT)
- `POST /api/admin/import` (JWT multipart field: `file`)

## Vercel deployment

Deploy `frontend/` as one Vercel project with `VITE_API_URL` pointing at the deployed backend. Deploy `backend/` as a second Vercel project; its `vercel.json` maps all requests to the serverless Express handler. Configure `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `FRONTEND_URL`, and `BACKEND_URL` in the backend project. Configure `VITE_API_URL` in the frontend project.

For production, set these exact Vercel variables before redeploying:

- Frontend project: `VITE_API_URL=https://YOUR-BACKEND.vercel.app/api`
- Backend project: `FRONTEND_URL=https://YOUR-FRONTEND.vercel.app`
- Backend project: `BACKEND_URL=https://YOUR-BACKEND.vercel.app`

Do not leave `VITE_API_URL` as `http://localhost:4000/api` in the deployed frontend. The backend root redirects to `FRONTEND_URL` when that variable is a deployed URL; the user-facing website is still the frontend domain. The frontend includes a Vercel SPA rewrite so `/admin/login` and `/verify/:certificateId` also work on direct page loads.

The current PDF template deliberately uses replaceable text and vector styling. Logo, signature, and event-specific template assets should be added to a storage-backed event branding model before production branding is finalized; the API does not rely on local persistent files.

The included club and SAC logos are mandatory defaults. On first branding access, they are seeded into the MongoDB branding record from `backend/assets/`; certificate generation fails safely if either required logo is unavailable. Optional signature and future event assets can be added from the admin Branding panel.
