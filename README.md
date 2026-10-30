# My Calendar

A personal calendar web app that runs on top of my own [Calendar API](https://github.com/Esteban-Jr/calendar-api). Built with React and Vite, works on desktop and phone, and can be installed to the home screen.

## What it does

- **Month, week and day views**, with a phone-first day view and a floating add button
- **Events in cake colours.** Pick a colour, or the app picks one of the least-used ones for you
- **Overnight events** read correctly on each day ("10:00 PM" then "until 2:00 AM")
- **Colombian public holidays** from the API, with an on/off switch
- **Sharing by username.** People you share with can view an event but not change it
- **Reminders.** An in-app banner and, if you allow it, a system notification before an event starts. Works while the app is open
- **Accounts.** Sign up and password reset with a 6-digit code sent by email
- **Installable** (web app manifest and service worker)

## Run it

You need Node 20.19 or newer (or 22.12+) and the Calendar API running locally (see its README).

```bash
npm install
npm run dev
```

Open http://127.0.0.1:5173. In development Vite forwards `/api/...` to the API at `http://127.0.0.1:8000`, so there is no CORS to configure. To use another API server:

```bash
VITE_API_TARGET=https://your-server npm run dev
```

## Build and deploy

```bash
npm run build      # the finished site is in dist/
./deploy.sh        # build, then copy dist/ to the server
```

In production the app and the API are served from the same address by Nginx (the app at `/`, the API under `/api/`), which is why the app uses relative URLs and never needs CORS.

## How it is put together

| File | Job |
|---|---|
| `src/api.js` | Every call to the API, and turning its errors into readable messages |
| `src/auth.js` | Where the login token is kept (localStorage with "Remember me", otherwise sessionStorage) |
| `src/dates.js` | Date helpers, the layout rule for overlapping events, and per-day wording for overnight events |
| `src/colors.js` | The cake colour palette and the "least used" pick |
| `src/reminders.js`, `src/useReminders.js` | Which reminders are due, and the loop that watches for them |
| `src/components/` | The screens: sign-in flow, month, week and day views, event window, banners |
| `public/sw.js` | A tiny service worker that lets phones show notifications |

## Limits

Reminders only fire while the app is open. Reminders with the app closed need a push service and a server job, which this project does not have yet.
