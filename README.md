# Norvane Express

Shipping website with shipment tracking, in five languages (English, Polish, Japanese, Spanish, German), plus a private administrator dashboard.

Built with **Next.js 15**, **TypeScript**, **Tailwind CSS 4**, **next-intl** and **Supabase** (PostgreSQL database, login, file storage).

> **Status of this code:** The database (schema, security rules, tracking logic) was tested on a real PostgreSQL server — 70 checks pass. The application code passed a TypeScript check and 25 unit tests, and pages were rendered and screenshotted at desktop and mobile sizes. **It has not yet been installed with `npm install` or built with `next build`**, because the workspace it was written in could not download npm packages. Step 4 below is the first real build — if anything fails there, copy the error message and ask for help.

---

## Contents

1. [What you need](#1-what-you-need)
2. [Create the Supabase project](#2-create-the-supabase-project)
3. [Set up the database](#3-set-up-the-database)
4. [Run the website on your computer](#4-run-the-website-on-your-computer)
5. [Create your first administrator account](#5-create-your-first-administrator-account)
6. [Email templates (invites & password reset)](#6-email-templates-invites--password-reset)
7. [Try it with demonstration data](#7-try-it-with-demonstration-data)
8. [Put the website online (deploy)](#8-put-the-website-online-deploy)
9. [Custom domain and HTTPS](#9-custom-domain-and-https)
10. [Before you launch — checklist](#10-before-you-launch--checklist)
11. [Everyday use of the dashboard](#11-everyday-use-of-the-dashboard)
12. [Backups and restoring](#12-backups-and-restoring)
13. [Recovering administrator access](#13-recovering-administrator-access)
14. [Updating the application safely](#14-updating-the-application-safely)
15. [Tests](#15-tests)
16. [How security works](#16-how-security-works)
17. [Project structure](#17-project-structure)

---

## 1. What you need

| Software | Why | Where |
|---|---|---|
| **Node.js 20.9 or newer** (22 LTS recommended) | Runs the website | https://nodejs.org |
| **A Supabase account** (free plan is fine to start) | Database, logins, image storage | https://supabase.com |
| **A Vercel account** (or another Next.js host) | Puts the site online | https://vercel.com |
| **Git** + a GitHub account (recommended) | Stores your code; Vercel deploys from it | https://github.com |
| A code editor, e.g. VS Code (optional) | Editing files | https://code.visualstudio.com |

Check Node is installed: open a terminal and run `node -v`. It should print `v20.9.0` or higher.

## 2. Create the Supabase project

1. Sign in at https://supabase.com and click **New project**.
2. Choose a name (e.g. `norvane`), a strong **database password** (save it in a password manager), and the region closest to your customers.
3. Wait for the project to finish setting up.
4. Open **Project Settings → API**. You will need three values from this page:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (secret — never share it, never put it in browser code)

## 3. Set up the database

The database is created by five SQL files in `supabase/migrations/`. Run them **in order**.

**Option A — Supabase dashboard (easiest):**

1. In Supabase, open **SQL Editor → New query**.
2. Open `supabase/migrations/20261017000001_schema.sql` in a text editor, copy everything, paste it into the SQL editor, click **Run**.
3. Repeat for `…02_functions.sql`, `…03_security.sql`, `…04_storage.sql`, `…05_starter_services.sql`.

**Option B — Supabase CLI (for developers):**

```bash
npx supabase login
npx supabase link --project-ref YOUR-PROJECT-REF
npx supabase db push
```

What gets created: tables for shipments, tracking events, customers, inquiries, services, website content, translations, administrators and the audit log; all security rules; an image storage bucket (`site-media`); and six **unpublished** starter service listings.

## 4. Run the website on your computer

```bash
# in the project folder
npm install
cp .env.example .env.local      # Windows: copy .env.example .env.local
```

Open `.env.local` and fill in the values from step 2:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RATE_LIMIT_SALT=paste-a-long-random-string-here
```

Generate `RATE_LIMIT_SALT` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Start the site:

```bash
npm run dev
```

Open http://localhost:3000 — you'll be sent to http://localhost:3000/en. Try the language selector at the top right.

Check that everything builds (do this before deploying):

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## 5. Create your first administrator account

There is **no built-in password** and no hidden admin login. You create the first owner yourself:

1. In Supabase, open **Authentication → Users → Add user → Create new user**.
2. Enter your email and a strong password (12+ characters). Tick **Auto Confirm User**. Click **Create user**.
3. Copy the new user's **UID** from the users list.
4. Open **SQL Editor** and run (replace the two values):

```sql
insert into public.administrator_profiles (id, email, full_name, role_code)
values ('PASTE-THE-UID-HERE', 'you@yourcompany.com', 'Your Name', 'owner');
```

5. Go to http://localhost:3000/admin/login and sign in.

Additional staff: sign in as owner → **Administrator Accounts → Invite**. They get an email and choose their own password.

**Roles**

| Role | Can do |
|---|---|
| **Owner** | Everything, including administrator accounts and settings |
| **Manager** | Shipments (incl. archiving), events, customers, inquiries, services, website content, translations, activity log |
| **Operator** | Create/edit shipments, add tracking events, customers, inquiries |
| **Viewer** | Read-only access to shipments, customers, inquiries |

At least one active owner must always exist — the database refuses to remove the last one.

## 6. Email templates (invites & password reset)

So that invitation and password-reset links work in any browser, update two email templates in Supabase.

Open **Authentication → Email Templates**:

- **Invite user** — replace the link with:
  ```html
  <a href="{{ .SiteURL }}/admin/auth/confirm?token_hash={{ .TokenHash }}&type=invite">Accept the invitation</a>
  ```
- **Reset Password** — replace the link with:
  ```html
  <a href="{{ .SiteURL }}/admin/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset your password</a>
  ```

Then open **Authentication → URL Configuration**:

- **Site URL:** your website address (`http://localhost:3000` while testing; your real domain later).
- **Redirect URLs:** add `http://localhost:3000/**` and `https://YOUR-DOMAIN/**`.

For real-world email volume, connect your own email provider under **Project Settings → Authentication → SMTP** (Supabase's built-in sender is rate-limited and meant for testing).

## 7. Try it with demonstration data

To see the site working before you have real shipments:

1. Run `supabase/demo_data.sql` in the Supabase SQL editor. It adds 3 sample shipments (tracking numbers `DEMO00000001`, `DEMO00000002`, `DEMO00000003`), sample customers and an inquiry, and switches **demo mode on**.
2. Visit http://localhost:3000/en/track and enter `DEMO00000001`.

Demo records are clearly labelled **sample** everywhere, are excluded from statistics unless demo mode is on, and are invisible to the public when demo mode is off. Staff cannot create demo-flagged records from the dashboard.

**Removing demo data (before launch):** run `supabase/demo_remove.sql` in the SQL editor. It deletes only rows marked as demo and switches demo mode off. You can also switch demo mode off in **Dashboard → Settings**.

## 8. Put the website online (deploy)

Recommended host: **Vercel** (made by the creators of Next.js).

1. Put the project on GitHub (`git init`, commit, push to a new **private** repository). `.env.local` is ignored by git on purpose — never commit it.
2. In Vercel: **Add New → Project**, import the repository. Framework preset: **Next.js**.
3. Under **Environment Variables**, add the same five variables as in `.env.local` — but set `NEXT_PUBLIC_SITE_URL` to your real address (e.g. `https://www.norvaneexpress.com`).
4. Click **Deploy**. When it finishes, open the URL Vercel gives you.
5. In Supabase **Authentication → URL Configuration**, set the **Site URL** to the live address and add it to **Redirect URLs**.

Every time you push to the main branch, Vercel redeploys automatically.

Other hosts that run Next.js (Netlify, Render, a VPS with `npm run build && npm start`) also work; set the same environment variables there.

## 9. Custom domain and HTTPS

1. In Vercel: **Project → Settings → Domains → Add**, type your domain.
2. Vercel shows DNS records (usually an `A` record and/or a `CNAME`). Add them at the company where you bought the domain.
3. HTTPS certificates are issued and renewed automatically once DNS is correct (can take up to a few hours).
4. Update `NEXT_PUBLIC_SITE_URL` in Vercel to the new domain, redeploy, and update the Supabase **Site URL** and **Redirect URLs**.

The site already sends strict security headers, including HSTS (forces HTTPS).

## 10. Before you launch — checklist

- [ ] **Services:** Dashboard → Services. Edit the six starter listings so they describe what you really offer, then publish only those.
- [ ] **Contact details:** Dashboard → Website Content → Contact details. Add your real phone, email, address and hours, then **Publish**.
- [ ] **About page:** add a factual company description (no unverified claims about size, history, offices or certifications).
- [ ] **Hero photo:** upload a photo of your own vehicles, team or facility (Website Content → Homepage hero image).
- [ ] **Privacy policy & terms:** replace the placeholder text and have it reviewed for the countries you operate in. The pages show a “draft” warning until you do.
- [ ] **Translations:** have a native speaker check your custom texts in each language (Languages & Translations shows the English next to each).
- [ ] **Demo data removed** and demo mode **off** (Settings shows the count of demo records).
- [ ] **Email templates** and **SMTP** set up (section 6).
- [ ] **Backups** enabled (section 12).
- [ ] At least **two owner accounts** so you can't be locked out.

## 11. Everyday use of the dashboard

Sign in at `https://YOUR-DOMAIN/admin/login` (works on phone and computer).

**Create a shipment** → *Create Shipment*. Fill in sender, recipient and package. Click **Create shipment & generate tracking number**. A unique number (e.g. `WB48203917564`) is generated by the database; the last digit is a check digit that catches typos.

**Share the tracking number** → on the shipment page use **Copy tracking no.** or **Public page** to see exactly what the customer sees.

**Add a tracking event** → on the shipment page, *Add tracking event*: status, date/time (UTC), location, short description, and visibility:
- **Public** — appears on the customer's tracking page.
- **Internal** — staff only, never shown publicly.

The shipment's status updates automatically from the latest event.

**Correct a mistake** → under the event, *Correct or void this event*. A reason is required. The original and corrected values are kept in the audit history; events are never deleted.

**Hide or archive** → *Hide* removes a shipment from public tracking; *Archive* (managers/owners) moves it out of active lists. Both can be undone.

**Find a shipment** → the search box at the top searches tracking numbers, references, names and emails.

**Inquiries** → contact-form messages appear under *Contact Inquiries* with a badge for new ones. Set status, add private notes, reply by email.

**Website text** → *Website Content*: edit, **Save draft**, **Preview drafts** (only you see them), then **Publish**. *Languages & Translations* lets you change any interface text in any language.

**What customers never see:** sender/recipient names, emails, phone numbers, street addresses, internal notes, internal events, voided events.

## 12. Backups and restoring

**Automatic:** Supabase takes daily backups on paid plans (**Project → Database → Backups**). Point-in-time recovery is available as an add-on. The free plan does **not** include downloadable backups — upgrade before relying on the system for real business.

**Manual backup** (any plan; needs PostgreSQL tools installed):

```bash
# Connection string: Supabase → Project Settings → Database → Connection string (URI)
pg_dump "postgresql://postgres:PASSWORD@db.xxxx.supabase.co:5432/postgres" \
  --schema=public --format=custom --file=norvane-$(date +%F).dump
```

Store backups somewhere other than Supabase (encrypted cloud storage).

**Restore** into a new/empty Supabase project:

1. Run the five migration files (section 3) on the new project **only if** you're restoring data-only; otherwise restore the full dump:
   ```bash
   pg_restore --clean --if-exists --no-owner \
     -d "postgresql://postgres:PASSWORD@db.NEWPROJECT.supabase.co:5432/postgres" norvane-2026-10-17.dump
   ```
2. Update the environment variables in Vercel to the new project's URL and keys, and redeploy.

Note: login accounts live in Supabase's `auth` schema. A dashboard backup/restore keeps them; a `--schema=public` dump does not — after restoring that way, recreate administrators (section 5) and re-invite staff.

Practice a restore into a test project at least once.

## 13. Recovering administrator access

- **Forgot password:** `/admin/forgot-password` → email link → choose a new password.
- **Another owner exists:** they can reactivate you or change your role in *Administrator Accounts*.
- **Locked out completely** (no owner can sign in): in Supabase,
  1. **Authentication → Users** → find your user → **Send password recovery** (or create a new user as in section 5).
  2. In **SQL Editor**, make sure the account is an active owner:
     ```sql
     update public.administrator_profiles
        set role_code = 'owner', is_active = true
      where email = 'you@yourcompany.com';
     ```
     (If the profile doesn't exist, use the `insert` from section 5.)
- **Someone left the company:** deactivate them in *Administrator Accounts* (access stops immediately), and optionally delete their login in Supabase **Authentication → Users**.
- **Suspected compromise:** in Supabase rotate the API keys (**Project Settings → API**), update them in Vercel, redeploy, and review **Activity Logs**.

## 14. Updating the application safely

1. Make changes on a separate git branch; Vercel creates a **preview deployment** for every branch — test there first.
2. Database changes go in a **new** migration file in `supabase/migrations/` (never edit old ones). Test it on a copy of the database (a second Supabase project) before production.
3. Take a backup before applying migrations to production.
4. Run `npm run check` (typecheck, lint, tests, build) before merging.
5. Updating packages: `npm outdated`, then update one major package at a time and re-run `npm run check`.

## 15. Tests

```bash
npm test               # unit tests: validation, tracking numbers, all 5 translation files complete
npm run typecheck
npm run lint
npm run build
```

**Database security tests** (`supabase/tests/security_tests.sql`) check, among other things, that anonymous visitors can't read private tables, that public tracking never returns names/emails/addresses/internal notes, that unknown tracking numbers return nothing, that duplicate tracking numbers are rejected, that events can't be edited without a correction reason or deleted, that only authorized roles can archive or change roles, and that the audit log can't be altered. Run them against a **test** database (not production) that has the migrations and `demo_data.sql` loaded:

```bash
psql "postgresql://...TEST-DATABASE..." -v ON_ERROR_STOP=1 -f supabase/tests/security_tests.sql
```

(`supabase/tests/supabase_stub.sql` lets you run the same tests on a plain local PostgreSQL without Supabase.)

**Manual checks** worth doing after deploying: sign in/out; open `/admin/dashboard` in a private window (must redirect to login); create a shipment and track it publicly; add an internal event and confirm it isn't shown publicly; switch through all five languages on the tracking page (the entered number is kept); submit the contact form; check pages on a phone.

## 16. How security works

- **Logins** use Supabase Auth (hashed passwords, secure HTTP-only cookies). There is no hard-coded or hidden admin account.
- **Every admin page and action checks on the server** that you are signed in, that your administrator profile is active, and that your role has the needed permission.
- **The database enforces the same rules again** with Row Level Security, so even a bug in the website code can't expose or change data a role isn't allowed to touch.
- **Public visitors never query tables directly.** Tracking uses one database function that returns only: status, dates, origin/destination city & country, estimated delivery, package count, service name and public events.
- **The service-role key** is used only on the server to invite administrators, after a permission check.
- **Rate limits:** tracking 30/min, contact form 5/hour, sign-in 8 per 15 min (per IP and per email), password reset 3/hour. IPs are stored only as salted hashes.
- **Contact form spam protection:** rate limiting, a hidden honeypot field and a minimum fill time.
- **Uploads:** images only (JPG/PNG/WebP/AVIF), max 5 MB, file signature checked, stored in Supabase Storage (never executed).
- **Audit log:** every insert/update/delete on business data, plus sign-ins, is recorded with who and when, and can't be edited or deleted.
- **Headers:** Content-Security-Policy, HSTS, X-Frame-Options, nosniff, strict referrer policy; admin pages are `noindex` and never cached.
- **SEO privacy:** admin pages and individual tracking lookups are excluded from search engines and the sitemap; tracking numbers never appear in page titles.

## 17. Project structure

```
messages/                 Interface text: en, pl, ja, es, de
public/                   Icon
src/
  app/[locale]/           Public pages: home, track, services, about, contact, privacy, terms
  app/admin/              Login, password reset, dashboard (inside (panel)/)
  actions/                Server actions (contact form, all admin operations)
  components/site/        Public website components
  components/admin/       Dashboard components
  i18n/                   Language routing (next-intl)
  lib/                    Auth, database clients, validation, rate limiting, content, statuses
  middleware.ts           Language routing + admin session refresh
supabase/
  migrations/             Database schema, functions, security rules, storage, starter services
  demo_data.sql           Sample records (demo mode)
  demo_remove.sql         Removes all sample records
  tests/                  Database security tests
tests/                    Unit tests
```

Not included (can be added later): integration with outside carriers (FedEx, DHL…), online payments, customer accounts, automatic customer email/SMS notifications.
