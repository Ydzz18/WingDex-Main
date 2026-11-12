# Repository Guidelines

## Project Structure & Module Organization
Wingdex is a monorepo containing a React Native mobile app (root) and a Node.js backend (`/backend`).

- **Mobile App**: Built with Expo and Expo Router. 
  - `app/`: Contains all screens and layouts (file-based routing).
  - `src/`: Contains shared business logic, components, and data.
    - `src/components/`: UI components.
    - `src/data/`: Static bird species and regional data.
    - `src/hooks/`: React hooks for state management (e.g., `useSavedBirds`).
    - `src/services/`: API and local storage abstractions.
- **Backend**: Express server handling AI bird identification.
  - `backend/src/`: Contains server setup, Gemini AI integration, and tests.

## Build, Test, and Development Commands

### Mobile App
- `npm install` — Install dependencies.
- `npm start` — Start Expo development server.
- `npm run android` / `npm run ios` / `npm run web` — Start on specific platform.
- `npm run lint` — Run ESLint.
- `npx tsc --noEmit` — Typecheck the frontend.
- `npx expo install <package>` — Install SDK-compatible packages.

### Backend
- `cd backend && npm install` — Install dependencies.
- `npm run dev` — Start server with hot-reload (via `tsx`).
- `npm test` — Run tests with Vitest.
- `npm run typecheck` — Typecheck the backend.

## Coding Style & Naming Conventions
- **Frontend**: Uses TypeScript with `strict: true`. Follows `eslint-config-expo`.
- **Backend**: Uses TypeScript (ES Modules) and Zod for schema validation.
- **Styling**: Uses a centralized theme defined in `src/theme.ts`.

## Testing Guidelines
- **Backend**: Tests are implemented using Vitest and Supertest. Run via `npm test` in the `backend/` directory.
- **Frontend**: Type-safety is enforced via TypeScript. Run `npx tsc --noEmit` and `npm run lint` before submitting changes.

## Commit & Pull Request Guidelines
- Use concise commit messages (e.g., "update", "initial commit").
- Ensure both frontend and backend typechecks and lints pass before merging.
