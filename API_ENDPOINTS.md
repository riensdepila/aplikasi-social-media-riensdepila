# Sociality API endpoint mapping

The base URL is configured with `NEXT_PUBLIC_API_BASE_URL` and defaults to `https://be-social-media-api-production.up.railway.app/api`. Private requests automatically include a bearer token.

| Endpoint | Access | UI surface |
|---|---|---|
| `POST /auth/register` | Public | `/register`; name, username, email, password, optional phone number; automatic sign-in after registration |
| `POST /auth/login` | Public | `/login`; persistent session and `returnTo` support |
| `GET /me`, `PATCH /me` | Private | `/me`, `/me/edit`; profile editing including multipart avatar upload |
| `GET /feed` | Private | `/feed`; infinite scrolling |
| `GET /posts`, `GET /me/posts` | Private | Explore posts and the current user's posts |
| `POST /posts`, `GET /posts/{id}`, `DELETE /posts/{id}` | Create/delete private; details public | `/posts/new`, `/posts/{id}`, owner-only delete action |
| `POST/DELETE /posts/{id}/like` | Private | Optimistic like toggle on cards and details |
| `GET /posts/{id}/likes`, `GET /me/likes` | Private | “Liked by” dialog and `/me/likes` page |
| `GET /posts/{id}/comments`, `POST /posts/{id}/comments`, `DELETE /comments/{id}` | Read public; write/delete private | Comments section on post details |
| `POST/DELETE /follow/{username}` | Private | Follow/unfollow buttons on profiles and user cards |
| `GET /users/{username}/followers`, `GET /users/{username}/following` | Public | `/profile/{username}/followers` and `/following` |
| `GET /me/followers`, `GET /me/following` | Private | `/me/followers`, `/me/following` |
| `POST/DELETE /posts/{id}/save`, `GET /me/saved` | Private | Bookmark toggle and `/me/saved` |
| `GET /users/search?q=…` | Public | `/users/search` with debounced search |
| `GET /users/{username}`, `GET /users/{username}/posts`, `GET /users/{username}/likes` | Public | Public profile, posts tab, and liked posts tab |

All lists use the `page` and `limit` parameters documented in Swagger. The feed and post lists request 20 items per page; comments request 10. Toggle buttons are disabled while a request is pending, then server data is refreshed to reconcile counters.
