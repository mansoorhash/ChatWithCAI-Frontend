<p align="center">
  <img src="./public/logo.svg" alt="CAI logo" width="112" />
</p>

<h1 align="center">CAI — Automatic LLM Router</h1>

<p align="center">
  One chat interface that routes each prompt to an eligible AI model based on the task, plan access, and availability.
</p>

<p align="center">
  <a href="https://chatwithcai.com">Live website</a>
  ·
  <a href="https://chatwithcai.com/models">Supported models</a>
  ·
  <a href="https://chatwithcai.com/status">Service status</a>
  ·
  <a href="https://api.chatwithcai.com/docs">API documentation</a>
</p>

## About this project

This directory contains the beta React frontend for **ChatWithCAI (CAI)**. CAI evaluates each prompt and routes it through the model pool available to the user instead of requiring a model choice for every request.

The frontend owns the browser experience: public product pages, authentication, streamed chat, file attachments, conversation history and branches, model preferences, account controls, usage reporting, and subscription views. The backend owns routing decisions, provider integrations, persistence, quotas, and authorization.

This project is under active beta development. Product behavior, model availability, plan access, and usage limits may change.

## Features

- Automatic routing across eligible OpenAI, Anthropic, and Google Gemini models.
- Newline-delimited JSON chat streaming with status, partial, final, and error events.
- Persistent conversations with cursor-based history, automatic titles, renaming, deletion, message editing, regeneration, continuation, and branch navigation.
- Direct-to-storage file uploads through backend-issued presigned URLs, with progress and deletion support.
- Message copying and rating, generation cancellation, and contextual feedback prompts.
- Protected routes and credentialed authentication using in-memory access tokens, serialized refresh, and one retry after token expiry.
- Model preferences, profile and email controls, account deletion, model-training consent, usage summaries, and subscription details.
- Light, dark, and system themes with responsive public and authenticated layouts.
- Public plans, models, status, changelog, FAQ, contact, support, copyright, privacy, and terms pages.
- Search and API discovery assets including `sitemap.xml`, `robots.txt`, `auth.md`, and `.well-known/api-catalog`.

## Tech stack

| Area | Technology |
| --- | --- |
| UI | React 19, JavaScript, JSX, CSS |
| Routing | React Router 7 |
| Markdown | React Markdown, Remark GFM, Rehype Raw |
| Icons | Lucide React, React Icons |
| Build and lint | Vite 8, ESLint 9 |
| Tests | Vitest, React Testing Library, Jest DOM |
| API transport | Fetch API, streamed response readers, XMLHttpRequest for upload progress |

## Getting started

### Requirements

- Node.js 22.12 or newer
- npm
- A compatible CAI backend for authentication and chat features

### Install and run

```bash
npm ci
cp .env.example .env
npm run dev
```

On Windows PowerShell, replace the copy command with:

```powershell
Copy-Item .env.example .env
```

The development server listens on all interfaces and is normally available at `http://localhost:5173`.

Set the API origin in `.env`:

```dotenv
VITE_BACKEND_SERVER=https://api.example.com
```

The value must be an absolute origin without a trailing slash. The backend must allow the development origin when using credentialed requests.

> [!IMPORTANT]
> Vite exposes every `VITE_` variable to browser code. Never store secrets or private credentials in these variables.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite in development mode and listen on all interfaces. |
| `npm start` | Start Vite with its default host behavior. |
| `npm test` | Run the Vitest suite once. |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run lint` | Lint JavaScript, JSX, TypeScript, and TSX files with zero warnings allowed. |
| `npm run build` | Validate public metadata and create an optimized bundle in `build/`. |
| `npm run preview` | Serve the production bundle locally. |
| `npm run check` | Run lint, tests, metadata validation, and the production build. |
| `npm run generate:sitemap` | Regenerate `public/sitemap.xml` from the public route table. |
| `npm run validate:api-catalog` | Validate `public/.well-known/api-catalog`. |
| `npm run validate:auth-md` | Validate the required structure of `public/auth.md`. |

`npm run build` invokes the sitemap generator and both metadata validators through the `prebuild` hook. If public routes change, commit the regenerated sitemap with the route change.

## Project map

```text
beta/
├── public/                    # Static, legal, discovery, and model-catalog assets
├── scripts/                   # Sitemap generation and public metadata validation
├── src/
│   ├── api/                   # Backend request modules and token-refresh transport
│   ├── authentication/        # Login, registration, verification, and recovery
│   ├── components/            # Shared layout, popup, loading, and status UI
│   ├── protected/
│   │   ├── chat/              # Conversation state, streaming, uploads, and messages
│   │   ├── sidebar/           # Sessions, settings, subscription, and usage
│   │   └── utils/             # Protected-area helpers
│   ├── public/                # Public layouts, route definitions, and pages
│   └── utils/                 # Authentication/theme contexts and constants
├── index.html                 # Vite HTML entry point
├── package.json               # Dependencies, commands, and Node requirement
└── vite.config.mjs            # Build and test configuration
```

More detailed notes live beside the areas where they matter:

- [`public/README.md`](./public/README.md) — generated files, discovery metadata, and public asset rules.
- [`src/api/README.md`](./src/api/README.md) — request layering, authentication, and endpoint modules.
- [`src/protected/chat/README.md`](./src/protected/chat/README.md) — chat state, streaming, branches, and attachments.

At runtime, the frontend reads its plan-grouped model catalog from `public/LLMs.json`. Public URLs are defined in `src/public/publicPageRoutes.jsx`; authentication URLs are defined separately in `src/authentication/authPageRoutes.jsx`.

## Backend contract

The frontend expects a CAI-compatible API with:

- Registration, login, verification, password recovery, logout, and token refresh.
- Cookie-backed credentialed requests and short-lived bearer access tokens.
- Session creation, cursor pagination, title editing, deletion, branches, and streamed generation.
- Presigned attachment upload, completion, and deletion endpoints.
- Model selection, subscription, usage, message review, personal-data, and training-consent endpoints.
- A public service-status endpoint.

The production API advertises its OpenAPI description, human-readable documentation, and health endpoint through [`public/.well-known/api-catalog`](./public/.well-known/api-catalog).

## Testing and release checks

Run the complete local gate before merging or deploying:

```bash
npm run check
```

Tests are colocated with the components or utilities they cover. `src/setupTests.js` installs DOM matchers and browser API shims for the jsdom environment.

## Deployment

Create the production bundle with:

```bash
npm run build
```

Deploy `build/` to a static host. Configure an SPA fallback so unknown browser routes serve `index.html`; direct visits to paths such as `/chat/:id`, `/models`, `/login`, and `/register` otherwise fail at the host layer.

Production authentication requires HTTPS plus backend CORS and cookie settings that allow the deployed frontend origin.

## Support and status

Use the [contact page](https://chatwithcai.com/contact), email [support@chatwithcai.com](mailto:support@chatwithcai.com), or check the [service status](https://chatwithcai.com/status).

## License

Copyright © 2026 Mansoor Hashemi, operating as ChatWithCAI. All Rights Reserved.

This repository is publicly viewable but proprietary; it is not an open-source project. See the [proprietary software notice](./LICENSE) for the applicable permissions and restrictions.
