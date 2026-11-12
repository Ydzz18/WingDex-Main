# Wingdex

Wingdex is a cross-platform Palawan bird field guide built with Expo and React Native.

## Application overview

### Objectives
- Help users identify birds quickly by uploading a photo.
- Provide an easy-to-use bird reference guide with names, scientific names, and regional information.
- Support bird learning and field observation tracking on mobile devices.
- Let users save and revisit identified or observed birds in a personal collection.
- Make bird recognition more accessible without requiring expert knowledge.

### Features
- Photo-based bird identification using AI.
- Searchable bird directory with bird names, scientific names, and region filters.
- Regional filtering for easier browsing and species discovery.
- Saved bird collection / Pokedex for keeping track of favorites and sightings.
- Observation history stored locally on the device.
- Daily featured bird spotlight for learning and discovery.
- Cross-platform mobile app built with Expo and React Native.
- Confidence threshold checks to keep uncertain matches from being treated as valid identifications.

### Problem that can be solved
- Many people struggle to identify birds from photos or in the field.
- Birding often requires expert knowledge, printed guides, or internet research.
- Users may want a simple way to record and remember birds they see.
- This app bridges that gap by combining AI recognition, a local bird guide, and personal bird tracking.

### Pros and cons

#### Pros
- User-friendly mobile experience.
- Convenient photo-based identification.
- Good for learning and casual bird watching.
- Local saving of sightings and favorites.
- Search and filter functionality makes browsing easier.
- Works as both a guide and a personal collection tracker.
- Cross-platform support through Expo.

#### Cons
- AI identification may be inaccurate if the photo is blurry, poorly lit, or unclear.
- The worldwide bird list is only a starter set, not a complete global checklist.
- Range information is estimated rather than taken from a verified scientific distribution database.
- Accuracy depends on the backend API and image quality.
- Some features require a working backend and API key configuration.
- It is best viewed as a learning and reference app rather than a formal scientific bird database.
	
## Run locally

```sh
npm install
npx expo start
```

Open the QR code with Expo Go, or press `a` in the terminal for an Android emulator. Building/running iOS locally requires macOS; EAS Build can create iOS builds from the cloud.

## Build an Android APK

The `preview` EAS profile creates an installable APK. Before building:

1. Install the EAS CLI with `npm install --global eas-cli` and sign in using `eas login`.
2. Run `eas build:configure` once to link this app to your Expo account.
3. In the Expo dashboard, add these app environment variables to the `preview` environment: `EXPO_PUBLIC_WINGDEX_API_URL`, `EXPO_PUBLIC_SUPABASE_URL`, and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Use your deployed HTTPS backend URL for the API. These `EXPO_PUBLIC_` values are included in the app; never add server secrets such as Gemini, eBird, or Supabase secret keys.
4. Start the APK build from the project root:

   ```sh
   eas build --platform android --profile preview
   ```

5. When EAS finishes, open its build link and download the `.apk` to the Android device, then open it to install. If Android blocks the installation, allow installs from that browser or file manager in Android settings.

Use the `production` profile to create an Android App Bundle (`.aab`) for Google Play instead of an APK.

## Current implementation

- Photo-library selection and preview.
- Searchable directory of 100 worldwide starter species; directory photos remain question marks until identified.
- Gemini bird identification worldwide, with offline-first observation records and continent-scale range filters.
- Saved species and observation records remain available on-device and sync to the signed-in user’s Supabase account when online.
- Confidence threshold and schema validation for worldwide identification responses.

Live identification uses the separate Node backend in `backend/`. The app sends a multipart `photo` field to `POST /identify`; Gemini can return bird species worldwide as `{ "commonName": "Atlantic Puffin", "scientificName": "Fratercula arctica", "confidence": 0.91, "regions": ["Europe", "North America"] }`. For recognized birds, the backend matches the scientific name (then common name) against eBird taxonomy and includes the matching species record in the response. An eBird lookup failure does not invalidate Gemini's identification and is reported separately. An unclear image returns null names and no regions. Confident observations save their names, approximate range, date, eBird taxonomy (when matched), and a private local copy of the selected photo. Apply the Supabase migration in `supabase/migrations/20261112000100_add_ebird_taxonomy_to_observations.sql` to sync eBird taxonomy with observations. Unidentified attempts appear with a question mark and do not retain the photo. The geographic range labels are model estimates, not GPS location or a verified distribution database. The worldwide 100-species starter directory is separate from the three-species Palawan reference guide. Keep the Gemini key on the backend, never in the app.

### Start the backend

1. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/apikey).
2. Request an [eBird API key](https://ebird.org/api/keygen) and add it as `EBIRD_API_KEY` in the same backend `.env` file. eBird taxonomy, nearby sightings, hotspots, and regional checklists are proxied by the backend; the key is never included in the app.
3. In `backend/`, copy `.env.example` to `.env` and set `GEMINI_API_KEY` and `EBIRD_API_KEY`. This file is ignored by Git. For Supabase access, set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and the server-only `SUPABASE_SECRET_KEY`. Configure `ADMIN_USER_IDS` with a comma-separated list of operator UUIDs from Supabase Auth. `CORS_ORIGIN` should contain the exact deployed admin origin (comma-separated if multiple); for local portal development use `http://localhost:4174`.
4. Install and start the service:

	```sh
	cd backend
	npm install
	npm run dev
	```

4. In the project root, copy `.env.example` to `.env.local`. Set `EXPO_PUBLIC_WINGDEX_API_URL` to `http://localhost:3001` for a simulator, or to `http://<your-computer-LAN-IP>:3001` for a physical phone. Restart Expo after changing it.

The backend accepts JPEG, PNG, WebP, HEIC, and HEIF photos up to 10 MB and limits requests to 10 per IP every 15 minutes. Run its checks with `npm test` and `npm run typecheck` from `backend/`.

### Configure app sign-in

Copy the root `.env.example` to `.env.local` and set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from your Supabase project's API settings. Keep the Supabase secret key out of all app environment files; the public publishable key is intended for client apps and is protected by Row Level Security. Restart Expo after changing environment variables. The app requires a Supabase sign-in; without these values, the sign-in screen explains which settings are missing and app screens remain unavailable.

Enable the Email, Google, Facebook, and GitHub providers in Supabase **Authentication → Providers**. Configure each OAuth provider with its client credentials, and add the callback URL shown by Supabase (usually `https://<project-ref>.supabase.co/auth/v1/callback`) to the corresponding OAuth app settings. In Supabase **Authentication → URL Configuration**, set **Site URL** to the deployed website's root URL and add the app's exact web callback URL under **Redirect URLs**: the auth screen redirects to `<current web origin>/auth` (for example, `http://localhost:3000/auth` only when the app is running at that origin). Also allow `wingdex://auth` for installed builds and the development URL generated by Expo for Expo Go. If a requested callback is not on the redirect allowlist, Supabase falls back to Site URL, which can return users to the website root instead of the auth screen. These redirects are used for email confirmation, password recovery, and Google/Facebook/GitHub sign-in or account creation.

The backend exports a lazy Supabase client from `backend/src/supabase.ts`; it requires `SUPABASE_URL` and `SUPABASE_SECRET_KEY` when privileged operations are used. Keep the secret key on the backend only; it has elevated access and bypasses Row Level Security. The publishable key is intended for app/admin browser authentication, while user-owned collection sync is constrained by RLS.

### Set up Supabase tables and storage

The migrations in [`supabase/migrations/`](./supabase/migrations/) prepare matching `saved_birds` and `observations` tables, a private `observation-photos` bucket limited to 10 MB bird images, a user `profiles` table, admin-managed app content, and collection sync identity/coordinates.

To create these resources, open your Supabase project's **SQL Editor**, paste and run the migration files in timestamp order, including `20261111000100_admin_content_and_collection_sync.sql`. Do not run these migrations against production without reviewing them and taking a backup. The migration backfills stable client IDs for any existing remote observations. Supabase Auth manages credentials in `auth.users`; the profile migration maintains `public.profiles`. Configure and enable sign-in providers in **Authentication** settings in the Supabase dashboard. Storage paths must start with the owner's Supabase Auth user ID, for example `<user-id>/<observation-id>.jpg`.

The app shows its splash screen first, then requires a valid Supabase session before opening app screens. Signed-out users are sent to the auth screen, which supports email sign-in, registration, password recovery, Google sign-in, Facebook sign-in, and sign-out. Local saved birds and observations are merged with that user’s remote records on app focus; new writes persist locally first and upload when possible. On first upgrade, legacy unscoped local records are assigned to the first signed-in account on that device; subsequent accounts get separate local storage namespaces. Sync errors are visible in My Collection and can be retried. Remote rows are never removed just because a device is offline or missing local data; only explicit saved-species removals are queued for sync. Stable `(user_id, client_id)` observation identities make retries idempotent, and coordinates are synced when available. Photos remain local in this MVP: the app does not upload observation media or rewrite local photo references. Field announcements and published badge/rank definitions are read from public, read-only RLS policies; notifications still include existing local sample entries. Never put the Supabase secret key in the mobile app.

### Admin portal

The web-only operator console lives in `admin/` and is a separate Vite + React build surface. It signs operators in with Supabase Auth using the public publishable key, then waits for the backend to validate the access token and match the verified user ID against `ADMIN_USER_IDS` before showing any admin data. No client role or profile metadata grants access. All `/admin/*` API calls repeat this check and use the backend-only Supabase secret key. Missing/invalid allowlist configuration disables admin access.

See the dedicated [Admin Portal README](./admin/README.md) for setup, local development, deployment, access-control, and collection-sync instructions.

1. Apply the migration above and create or invite operator accounts through Supabase Auth.
2. Add each approved account’s UUID to `backend/.env` as `ADMIN_USER_IDS`. Do not add a role field to client metadata as an authorization shortcut.
3. Configure `admin/.env.local` from [`admin/.env.example`](./admin/.env.example) with `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_ADMIN_API_URL` (local default `http://localhost:3001`). These are browser-visible values; never add a secret/service-role key to the admin package.
4. If operators use Google or Facebook, enable those Auth providers and allow the local portal URL (`http://localhost:4174`) and deployed portal URL in Supabase **Authentication → URL Configuration → Redirect URLs**.
5. In separate terminals, start `backend/` with `npm run dev`, then run:

   ```sh
   cd admin
   npm install
   npm run dev
   ```

   Open `http://localhost:4174`. Production builds use `npm run build`; serve the generated `admin/dist/` over HTTPS and set the Vite environment variables at build time.

The portal includes overview metrics, searchable/paginated read-only users and collections, and badge/rank/announcement content management. User suspension, deletion, and collection moderation are intentionally not available. Badge rules are limited to unique identified species, observation count, or saved species; rank thresholds must be unique positive integers. Announcements target all users and appear in the app only while published. Content tables grant public clients read access only to active/published definitions; all writes are handled through the allowlisted backend API. For production, use HTTPS for the portal and API, set `CORS_ORIGIN` to exact trusted portal origins, keep backend secrets in the hosting provider’s secret store, and restrict `ADMIN_USER_IDS` to current operators. The API also rate-limits admin requests.

The backend Vitest suite covers authorization, content mutations, and collection merge/error behavior. `supabase/tests/admin_content_rls.sql` contains pgTAP checks for published-only public reads and denied app-client writes; run it against a local Supabase database with `supabase test db` after applying the migrations. Do not execute migrations or tests against a live project as a substitute for review.

For backend deployment, set `GEMINI_API_KEY`, `GEMINI_MODEL`, `EBIRD_API_KEY`, `PORT`, `CORS_ORIGIN`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `ADMIN_USER_IDS` in the hosting provider's environment settings. Admin authorization is enforced server-side for every admin route; do not make the secret key available to either client bundle. Use HTTPS for the portal and API and keep the allowlist current. The in-memory rate limit is a basic guard and should be replaced or complemented by production-grade distributed abuse controls when scaling horizontally.

The bird index searches eBird's worldwide taxonomy. The Nearby screen loads recent observations and hotspots around a location after permission is granted, and can list checklists for an eBird region code and today's date. eBird sightings are not a complete worldwide live feed, and the API does not expose a user's private checklist history. Species recordings open the corresponding [Macaulay Library audio catalog](https://search.macaulaylibrary.org/catalog); playback is hosted by Cornell Lab. See the [eBird API 2.0 documentation](https://documenter.getpostman.com/view/664302/S1ENwy59) for available data and limits. The local 100-species directory remains a starter list, and the three-species Palawan guide's rarity values are provisional. Image credits and license links for guide photos are stored alongside each guide record in `src/data/birds.ts`.