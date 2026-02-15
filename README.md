# Web Application for Listing and Automatic Notification of Real Estate Offers

Thesis project: a web app for browsing real estate listings and subscribing to notifications (with future Telegram bot integration).

## Tech stack

- **Backend:** Java 21, Spring Boot 3, Spring Security, Spring Data JPA
- **Frontend:** HTML, CSS, JavaScript (static files served by the backend)
- **Databases:** PostgreSQL (main app + separate audit DB)
- **Run:** Docker Compose

## Roles

| Role   | Capabilities |
|--------|----------------|
| **User**   | Browse offers; "Get notified" requires login. After login, can subscribe to offers; will be directed to Telegram bot for updates. |
| **Manager**| View and add offers; see who is subscribed to which property. |
| **Admin**  | All of the above; add/edit/delete offers and users; access audit logs (stored in a separate database, admin-only). |

All actions in the app are logged in the **audit database**; only admin can read these logs.

## Quick start with Docker

```bash
# From project root
docker compose up --build
```

- App: http://localhost:9080  
- **Manager** and **Admin** log in via the same **Log in** form on the home page. After login, you are redirected to the Manager or Admin page. Session stays active across all pages.
- Default users (change in production). Use **exactly** these (username lowercase, password with capital first letter and `!` at the end):
  - **admin** / **Admin1!**
  - **manager** / **Manager1!**
- If login says "Invalid username or password", restart the app once so the initializer can set these passwords: `docker compose down` then `docker compose up --build`.  

Register a new user for the **USER** role. Password rules: min 6 characters, one uppercase, one lowercase, one number, one symbol (allowed: !#$%&*()-_=+[]{}|;:,.?/~). No quotes or angle brackets.

- **Manager** page: http://localhost:9080/manager (requires MANAGER or ADMIN).
- **Admin** page: http://localhost:9080/admin (requires ADMIN).  
Direct URLs `/manager.html` and `/admin.html` are not used; pages are served only via `/manager` and `/admin` after role check.

## Running without Docker (development)

1. **PostgreSQL (main DB)** on `localhost:5432`:
   - Database: `realestate`, user: `app`, password: `appsecret`

2. **PostgreSQL (audit DB)** on `localhost:5433`:
   - Database: `audit`, user: `app`, password: `auditsecret`

3. Run the app:

```bash
cd backend
./mvnw spring-boot:run
```

Or set env vars / `application.yml` to match your DB URLs.

## API overview

- `POST /api/auth/login` — JSON `{ "username", "password" }` → session cookie
- `POST /api/auth/register` — JSON `{ "username", "password", "email?" }`
- `GET /api/auth/current` — current user or null
- `POST /api/auth/logout` — logout
- `GET /api/offers` — list active offers (paginated)
- `GET /api/offers/{id}` — one offer
- `POST /api/offers/{id}/subscribe` — subscribe (requires login); returns 401 with message if not logged in
- `DELETE /api/offers/{id}/subscribe` — unsubscribe
- Manager/Admin: `POST/PUT /api/offers`, `GET /api/offers?all=true`
- Manager/Admin: `GET /api/subscriptions`
- Admin only: `GET/POST/PUT/DELETE /api/admin/users`, `GET /api/admin/audit`

## Telegram bot (planned)

When a user subscribes to an offer, they should be directed to a Telegram bot for updates. The backend stores `telegramChatId` on the user; the bot can be implemented separately and use the same DB or API to send notifications. A placeholder link can be added in the UI (e.g. “Get updates in Telegram”) pointing to your bot.

## Security notes

- Passwords are hashed with BCrypt. Sign-up and admin user creation enforce strong password rules (length, upper/lower/digit/safe symbol; symbols that could aid SQL/XSS are disallowed).
- Manager and Admin pages are served only at `/manager` and `/admin` after authentication and role check; no direct static HTML URLs.
- Audit logs are in a separate DB; only admin can read them.
- Change default admin/manager passwords before any production or public use.
