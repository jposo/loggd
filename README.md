# loggd

A web application for the Geometry Dash community.

## Features

- **User Authentication:** Secure signup and login functionality.
- **Level Browser:** Search and view details for Geometry Dash levels.
- **levelguessr:** A fun game to guess levels.
- **User Profiles:** View and edit user profiles.
- **Admin Dashboard:** For managing application data.

## Built With

- [SvelteKit](https://kit.svelte.dev/)
- [Supabase](https://supabase.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Deno](https://deno.land/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)

## Getting Started

### Prerequisites

- Node.js
- Deno
- A Supabase account

### Installation

1.  Clone the repo
    ```sh
    git clone https://github.com/jposo/loggd.git
    ```
2.  Install Deno & NPM packages
    ```sh
    deno install
    ```
3.  Set up your Supabase environment variables. You will need to create a `.env` file in the root of the project with your Supabase URL and anon key.
    ```
    PUBLIC_SUPABASE_PROJECT_ID="<your_project_id>"
    DATABASE_URL="<your_database_url>"
    SUPABASE_API_KEY="<your_supabase_api_key>"
    SUPABASE_PROJECT_URL="<your_supabase_project_url>"
    ```

### Development

Start the development server:

```sh
deno run dev
```

### Building

To create a production version of your app:

```sh
deno run build
```

You can preview the production build with `npm run preview`.
