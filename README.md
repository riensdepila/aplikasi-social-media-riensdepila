# Sociality

A social media MVP built with Next.js, TypeScript, Tailwind CSS v4, and shadcn/ui-inspired components. The interface follows the supplied Figma references with a dark theme, violet accents, responsive navigation, post cards, profiles, and authentication forms.

## Run the application

Use Node.js 20.9 or newer.

```bash
npm install
```

Copy `.env.example` to `.env.local` if you want to change the API URL. The default points to the Sociality API:

```env
NEXT_PUBLIC_API_BASE_URL=https://be-social-media-api-production.up.railway.app/api
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`. New users can register at `/register`; after registration, the app attempts to sign in automatically and opens the feed.

### In VS Code

1. Open this project folder with **File → Open Folder**.
2. If dependencies are not installed, choose **Terminal → Run Task → Sociality: install dependencies**.
3. Press **F5** and select **Sociality: Next.js dev**, or run **Terminal → Run Task → Sociality: dev**.
4. Open `http://localhost:3000`.

VS Code configuration is in `.vscode/`.

The reference photo `public/assets/girl-girl.png` is available to try in the create post form.

## Available user flows

- Register, sign in, persist the session token, sign out, and return to the requested private page after signing in.
- Private feed with infinite scrolling; post cards support like/unlike, save/unsave, liked-by lists, details, and owner-only deletion.
- Create a post with one JPG/PNG/WEBP image up to 5 MB, preview, drag-and-drop, and a caption.
- Public post details with paginated comments, optimistic comment submission, and owner-only comment deletion.
- Own and public profiles, profile editing for name/username/phone/bio/avatar, posts and liked-post tabs, and connection statistics.
- Debounced user search, follow/unfollow, and public or private followers/following lists.
- Liked and saved post pages with incremental loading.
- Loading, empty, error, retry, media placeholder, keyboard focus, and action feedback states.

## API endpoints

See [API_ENDPOINTS.md](./API_ENDPOINTS.md) for route and access mappings. Source specification: [Sociality API Swagger](https://be-social-media-api-production.up.railway.app/api-swagger/).

The session token is stored in `localStorage` and automatically sent as `Authorization: Bearer …`. Lightweight UX events (`post_view`, `like`, `unlike`, `follow`, `unfollow`, `save`, `unsave`, `comment_submit`, `post_create`) are stored locally as `sociality_analytics` and emitted as `sociality:analytics` in the browser; no data is sent to an external analytics service.
