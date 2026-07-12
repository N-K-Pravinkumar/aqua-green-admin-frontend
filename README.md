# Aqua Green Agencies — Admin Dashboard

The internal staff dashboard: leads, enquiries, customers, products,
service requests, sales, quotations, stock, employees, billing,
reports, and communication tools.

## Run locally
```bash
npm install
npm start
```
Runs on http://localhost:3000 (change the port if running alongside
the customer app). Talks to the backend at `http://localhost:8080/api`
by default — see `.env.example` to point it at a deployed backend.

## Deploy
Build with `npm run build` and deploy the `build/` folder to its own
host/subdomain, e.g. `admin.aquagreenagencies.com`. Set the
environment variable `REACT_APP_API_URL` to your deployed backend's
URL before building.

Because this is a separate deployment from the public site, admin
login and staff tools are never bundled into the code your regular
website visitors download.

## Related repos
- `customer-frontend` — the public website (separate app, separate deploy)
- `backend` — the Spring Boot API both frontends talk to
