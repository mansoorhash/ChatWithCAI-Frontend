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

## Overview

This repository contains the React frontend for **ChatWithCAI (CAI)**, a multi-provider AI chat product. Instead of requiring users to select a model for every request, CAI evaluates each prompt and routes it through the model pool available to that user.

The routing engine and model integrations live in the CAI backend. This frontend provides the product experience around that system: authentication, streamed conversations, session management, model preferences, account controls, usage reporting, and the public-facing website.

CAI is currently in active beta development, so product behavior, model availability, and usage limits may change.

## Highlights

- **Automatic model routing** across eligible OpenAI, Anthropic, and Google Gemini models.
- **Incremental response streaming** from newline-delimited JSON events, including routing status, partial content, final responses, and errors.
- **Conversation management** with persistent sessions, cursor-based history pagination, automatic titles, renaming, deletion, and responsive navigation.
- **Message actions** for copying, rating, and regenerating responses.
- **Model preferences** that let users enable or disable models while respecting plan-level access.
- **Authentication lifecycle** with protected routes, credentialed requests, in-memory access tokens, serialized refreshes, and automatic request retry after token expiration.
- **Account and privacy controls** for profile updates, email verification, account deletion, and model-training consent.
- **Usage and subscription views** with model-level activity summaries and plan availability.
- **Responsive theming** with light, dark, and system preferences.
- **Public product pages** for plans, models, status, changelog, FAQ, contact, copyright, privacy, and terms.
- **Discovery metadata** including a generated sitemap, `robots.txt`, `auth.md`, and a well-known API catalog.

## Technology

| Area | Technology |
| --- | --- |
| UI | React 19, JavaScript, JSX, CSS |
| Routing | React Router 7 |
| Markdown | React Markdown, Remark GFM, Rehype Raw |
| Icons | Lucide React, React Icons |
| Tooling | Vite 8, ESLint 9 |
| Testing | Vitest, React Testing Library, Jest DOM |
| API communication | Fetch API, streamed response readers, cookie credentials, bearer access tokens |

## Application structure

```text
src/
├── api/                    # API client, authentication, chat, and account requests
├── authentication/         # Login, registration, verification, and password recovery
├── components/             # Shared layout, feedback, loading, and popup components
├── protected/
│   ├── chat/               # Chat state, streaming, messages, and actions
│   └── sidebar/            # Sessions, settings, subscription, and usage views
├── public/                 # Marketing, product, status, support, and legal pages
└── utils/                  # Authentication context, theme context, constants, and helpers

public/
├── .well-known/            # API discovery catalog
├── legal/                  # Privacy policy and terms
├── provider-logos/         # Provider artwork used by the model catalog
├── LLMs.json               # Model catalog grouped by plan
└── auth.md                 # Machine-readable registration and authentication guidance

scripts/                    # Sitemap and public metadata validation scripts
```

At runtime, the frontend loads its model catalog from `public/LLMs.json` and sends authenticated requests to the configured CAI API. The backend owns routing decisions, provider communication, persistence, quotas, and authorization.

## Local development

### Prerequisites

- Node.js 22.12 or newer and npm
- Access to a compatible CAI backend API for authenticated and chat functionality

### Setup

1. Install the locked dependencies:

   ```bash
   npm ci
   ```

2. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

   On Windows PowerShell, use:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Set the backend origin in `.env` if you are not using the default API:

   ```dotenv
   VITE_BACKEND_SERVER=https://api.example.com
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

The application opens at `http://localhost:5173` by default. The backend must allow the local frontend origin when credentialed authentication requests are used.

> [!IMPORTANT]
> Vite embeds every variable prefixed with `VITE_` into the browser bundle. Never place secrets or private credentials in these variables.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_BACKEND_SERVER` | Yes | Absolute origin of the CAI-compatible backend API. Do not include a trailing slash. |

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` / `npm start` | Starts the Vite development server. |
| `npm test` | Runs the Vitest test suite once. |
| `npm run test:watch` | Runs Vitest in watch mode. |
| `npm run lint` | Checks JavaScript, JSX, TypeScript, and TSX source with ESLint. |
| `npm run build` | Validates public metadata and creates an optimized production build in `build/`. |
| `npm run preview` | Serves the production build locally for a final check. |
| `npm run check` | Runs lint, tests, metadata validation, and the production build. |
| `npm run generate:sitemap` | Rebuilds `public/sitemap.xml` from the public route definitions. |
| `npm run validate:api-catalog` | Validates `public/.well-known/api-catalog`. |
| `npm run validate:auth-md` | Checks the required structure of `public/auth.md`. |

The `prebuild` hook runs the sitemap generator and both metadata validators automatically before every production build.

## Backend integration

The frontend expects a CAI-compatible API that supports:

- Account registration, login, verification, password recovery, logout, and session refresh.
- Credentialed identity checks and short-lived bearer access tokens.
- Chat session creation, pagination, editing, deletion, and streamed generation.
- Model preferences, subscription details, usage summaries, message reviews, and data controls.
- Public service-status responses.

The production service advertises its OpenAPI description and documentation through [`public/.well-known/api-catalog`](./public/.well-known/api-catalog).

## Production deployment

Create a production bundle with:

```bash
npm run build
```

Deploy the generated `build/` directory to a static host. Because the application uses browser-based routing, configure the host to serve `index.html` as the fallback for routes such as `/chat/:id`, `/models`, `/login`, and `/register`.

For production authentication, serve the frontend and API over HTTPS and configure the backend's allowed origins and cookie policy for the deployed frontend domain.

## Project status

CAI is under active beta development. The public model catalog, plan structure, limits, and individual features are expected to evolve as the routing system is tested.

Bug reports and product questions can be submitted through the [contact page](https://chatwithcai.com/contact) or sent to [support@chatwithcai.com](mailto:support@chatwithcai.com).

## License

Copyright © 2026 Mansoor Hashemi, operating as ChatWithCAI. All Rights Reserved.

This repository is publicly viewable but proprietary; it is not an open-source project. See the [proprietary software notice](./LICENSE) for the permissions and restrictions that apply.
