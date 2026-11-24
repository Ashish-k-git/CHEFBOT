# ChefBot 🤖

ChefBot is a full-stack AI recipe platform that helps users discover, generate,
save, and export recipes. It combines a Next.js frontend with a Strapi backend,
Clerk authentication, Google Gemini, TheMealDB, Unsplash, Arcjet protection,
and a PDF export workflow.

## Features

- Discover a daily recipe from TheMealDB
- Browse recipes by category or cuisine
- Generate detailed recipes with Google Gemini
- Scan pantry photos and identify ingredients
- Build pantry suggestions from available ingredients
- Save and remove recipes from a personal collection
- Create Pro and free subscription experiences
- Download recipes as PDF documents
- Protect routes and AI usage with Clerk and Arcjet

## Architecture

```text
Browser
  |
  | Clerk UI and protected routes
  v
Next.js 16 frontend
  |- App Router pages
  |- React client components
  |- Server actions
  |- Typed shared interfaces
  |
  | REST / JSON
  v
Strapi 5 backend
  |- Users-permissions
  |- Recipe content type
  |- Pantry item content type
  |- Saved recipe relations
  |
  v
SQLite, MySQL, or PostgreSQL

External integrations:
Google Gemini -> generated recipe and pantry scan content
TheMealDB -> daily, category, and cuisine recipes
Unsplash -> generated recipe images
Clerk -> identity and subscription checks
Arcjet -> bot, shield, and usage protection
```

## Technology Stack

### Frontend

- Next.js 16 with the App Router
- React 19
- TypeScript with strict mode
- Tailwind CSS
- Clerk Next.js authentication
- Arcjet Next.js protection
- Google Gemini SDK
- React PDF
- React Dropzone
- Sonner notifications
- Base UI components
- Lucide icons

### Backend

- Strapi 5
- Node.js
- TypeScript
- SQLite by default
- PostgreSQL or MySQL support
- Strapi Users & Permissions
- REST API content types

## Project Structure

```text
CHEFBOT/
├── frontend/
│   ├── app/
│   │   ├── (auth)/          # Clerk sign-in and sign-up routes
│   │   ├── (main)/          # Protected dashboard and product pages
│   │   ├── layout.tsx       # Root layout and providers
│   │   └── page.tsx         # Public landing page
│   ├── actions/             # Next.js server actions
│   ├── components/          # Shared and feature components
│   ├── hooks/               # Typed reusable React hooks
│   ├── lib/                 # Integrations, static data, and shared types
│   ├── public/              # Static assets
│   └── package.json
└── backend/
    ├── config/              # Strapi server, database, plugins, and security
    ├── src/api/             # Recipe, pantry, and saved-recipe APIs
    └── package.json
```

## Core Data Model

### Recipe

The backend recipe content type stores:

- Title, description, cuisine, and category
- JSON ingredients and instructions
- Preparation time, cook time, and servings
- JSON nutrition, tips, and substitutions
- Image URL and public status
- Optional relation to the users-permissions user
- Saved-recipe relations

### Pantry Item

Each pantry item stores:

- Name
- Quantity
- Optional image URL
- Relation to its owner

### Saved Recipe

Saved recipes form the user's personal collection:

- Relation to the users-permissions user
- Relation to a recipe
- Saved timestamp

Strapi 5 document IDs and numeric IDs are both accounted for in the frontend
types where their usage differs.

## Application Flow

### Authentication

1. Clerk provides the authenticated browser session.
2. `proxy.ts` protects recipe, pantry, dashboard, and saved-recipe routes.
3. `lib/checkUser.ts` resolves or creates the corresponding Strapi user.
4. The resolved user contains the effective free or Pro subscription tier.

### Pantry Scan

1. `ImageUploader` accepts a photo using drag-and-drop or a file picker.
2. The server action receives it as `FormData`.
3. Gemini Vision analyzes the image.
4. The response is parsed into typed pantry ingredients.
5. Ingredients can be reviewed and submitted to Strapi.

### Recipe Suggestions

1. Pantry items are fetched from Strapi for the current user.
2. Gemini receives the available ingredient list.
3. Gemini returns typed recipe suggestions.
4. The frontend renders matches through `RecipeCard`.

### Recipe Generation

1. A recipe title is normalized.
2. Strapi is searched for an existing recipe.
3. If it does not exist, Gemini generates a complete recipe.
4. Unsplash provides an optional cover image.
5. The recipe is stored in Strapi.
6. The user can save it in their personal collection.
7. `react-pdf` produces a downloadable PDF.

## Environment Variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
NEXT_PUBLIC_ARCJET_KEY=your_arcjet_key
STRAPI_API_TOKEN=your_strapi_api_token
GEMINI_API_KEY=your_google_gemini_key
UNSPLASH_ACCESS_KEY=your_unsplash_access_key

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
```

Create `backend/.env` from `backend/.env.example`, then configure secrets and database values:

```env
HOST=0.0.0.0
PORT=1337

APP_KEYS=key_one,key_two,key_three,key_four
API_TOKEN_SALT=your_api_token_salt
ADMIN_JWT_SECRET=your_admin_jwt_secret
TRANSFER_TOKEN_SALT=your_transfer_token_salt
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key

DATABASE_CLIENT=sqlite
DATABASE_FILENAME=.tmp/data.db
```

For PostgreSQL or MySQL, set the database client, host, port, name, username,
password, schema, and SSL variables supported by `backend/config/database.ts`.
Never commit real keys or secrets.

## Local Development

Requirements:

- Node.js 20 or newer
- npm
- Google Gemini API access
- Clerk application credentials
- Optional Unsplash API key
- Optional Arcjet key

Install and start the backend:

```bash
cd backend
npm install
npm run develop
```

The Strapi admin is available at `http://localhost:1337/admin`.

Install and start the frontend in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## Strapi Setup

After starting Strapi:

1. Create an administrator account.
2. Create an API token for server-side frontend requests.
3. Add the API token to `frontend/.env.local` as `STRAPI_API_TOKEN`.
4. Configure permissions for the required users-permissions and content APIs.
5. Confirm that the recipe, pantry item, and saved recipe schemas are available.

The public application performs authenticated backend calls using the Strapi API token.
Database credentials should be kept in `backend/.env`.

## Scripts

### Frontend

```bash
npm run dev       # Start Next.js development server
npm run build     # Create a production build
npm run start     # Start the production server
npm run lint      # Run ESLint
npx tsc --noEmit  # Run strict TypeScript checking
```

### Backend

```bash
npm run develop   # Start Strapi with hot reload
npm run start     # Start Strapi in production mode
npm run build     # Build the Strapi admin application
npx tsc --noEmit  # Run strict TypeScript checking
```

