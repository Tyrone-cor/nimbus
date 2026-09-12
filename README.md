# Nimbus

Nimbus is a focused AI chat interface built with Next.js and OpenRouter. It provides streaming responses, Markdown rendering with syntax highlighting, light and dark themes, and a small, readable UI for one conversation at a time.

## Status

Nimbus is suitable for local development and private previews. It is **not ready for an unrestricted public deployment** until the API protections in the security section are implemented. The current chat endpoint forwards requests using the server's OpenRouter key, so an anonymous visitor could consume your provider quota or generate unexpected costs.

## Features

- Streaming assistant responses from OpenRouter
- GitHub-flavored Markdown and highlighted code blocks
- Light and dark themes with persisted preference
- Responsive chat layout
- Server-side API key handling

## Tech stack

- [Next.js 16](https://nextjs.org/)
- React 19 and TypeScript
- [OpenRouter](https://openrouter.ai/) for model access
- `react-markdown`, `remark-gfm`, and `rehype-highlight`

## Run locally

### Requirements

- Node.js 20 or newer
- An OpenRouter API key

Install dependencies and create `.env.local` in the project root:

```bash
npm install
```

```env
OPENROUTER_API_KEY=your-key-here
# Optional:
# OPENROUTER_MODEL=openrouter/free
```

Start the development server:

```bash
npm run dev
```

Open <http://localhost:3000>.

## Commands

```bash
npm run dev       # Start the development server
npm run lint      # Run ESLint
npm run build     # Create a production build
npm run start     # Serve the production build
npm audit         # Check dependency advisories
```

## How it works

The browser sends the current conversation to `POST /api/chat`. The route adds Nimbus's system prompt, keeps the most recent 20 messages, and streams the OpenRouter response back to the browser as server-sent events. The OpenRouter key is read only from the server environment and is never sent to the client.

## Security review before deployment

### Verified

- `npm audit` reports no known vulnerabilities in the installed dependency tree.
- `npm run lint` passes.
- `npm run build` succeeds.
- `.env.local` is ignored by Git and is not tracked in the repository.
- The OpenRouter key is accessed server-side in `app/api/chat/route.ts`.
- Markdown is rendered without enabling `rehype-raw`, so raw HTML is not intentionally enabled in assistant responses.

### Blocking issue: unauthenticated paid proxy

`POST /api/chat` currently has no authentication, rate limiting, abuse detection, or per-user quota. Anyone who can reach the deployed site can call it repeatedly with your server-side key. This can exhaust OpenRouter credits, increase latency for legitimate users, and create an unexpected bill.

Before a public deployment, add all of the following:

1. Authentication or another explicit access-control mechanism.
2. IP and account-based rate limits with a request and token budget.
3. Request-body schema validation, including allowed roles, maximum message count, maximum message length, and a maximum total payload size.
4. Provider spend limits and alerts in OpenRouter.
5. Monitoring for repeated failures, unusual volume, and prompt abuse.

### Additional hardening

- Add security headers, especially a restrictive Content Security Policy, `X-Content-Type-Options: nosniff`, a frame-ancestors policy, and a strict Referrer-Policy.
- Normalize upstream errors before returning them to clients; do not expose provider response details unnecessarily.
- Set request timeouts and handle cancellation so disconnected clients do not keep upstream work alive.
- Keep production secrets in the hosting provider's secret manager, never in the repository or client-side environment variables.
- Add automated tests for validation, authorization, rate limiting, and error paths before accepting public traffic.

This review is a repository-level check, not a penetration test or a guarantee of security. Re-run `npm audit` and review the hosting provider, OpenRouter account, and deployment configuration before every public release.

## Contributing

Issues and pull requests are welcome. For changes that affect the chat API, include the security and cost implications in the pull request description and run `npm run lint` and `npm run build` locally.

## License

No license has been selected yet. Add a license file before publishing this project as open source so users know how they may use, modify, and redistribute it.
