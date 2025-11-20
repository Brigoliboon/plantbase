
---

# PlantBase 🌱

A modern web system for tracking plant samples, researchers, field locations, and environmental data—built with [Next.js](https://nextjs.org/) and [Supabase](https://supabase.com/) (Postgres). Includes rich map/charts UI, fully RESTful API, and authentication-ready flows.

---

## Features

- **Dashboard**: Overview of research activity, metrics, latest samples, and charts.
- **Plant Samples**: Add/view/filter plant records with environmental info (soil pH, humidity, etc.), location & researcher links.
- **Sampling Locations**: Geographic catalogue (with interactive Mapbox map), search, and edit.
- **Researchers**: Manage scientist contact details, link to their samples.
- **Reports (in progress)**: Visual analytics, trend charts.
- **REST API**: Fully CRUD endpoints for all entities; easy Supabase database integration.
- **Auth-Ready**: Sign-up/sign-in UI and Supabase authentication hooks.

---

## Getting Started

### Prerequisites

- Node.js v18+ and npm
- [Supabase](https://app.supabase.com/) account (free)
- (Optional: Mapbox account for maps)

### Setup Instructions

1. **Clone the repository**

    ```bash
    git clone https://github.com/Brigoliboon/plantbase.git
    cd plantbase
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Environment configuration**

    - Create a `.env.local` file in project root with:
      ```
      NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
      NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
      NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token  # (optional for map features)
      ```

4. **Database setup**

    - In the Supabase dashboard, create tables matching your schema. (Model: `researcher`, `sampling_location`, `plant_sample`, `environmental_condition`.)
    - See your project’s `/app/api/*/route.ts` and `/types/index.ts` for field details.
    - Enable Row-Level Security (RLS) and configure policies as needed.

5. **Run the app**

    ```bash
    npm run dev
    # open http://localhost:3000
    ```

---

## Project Structure

```
plantbase/
├── app/
│   ├── api/                # REST API for data
│   ├── (authenticated)/    # Protected app pages (dashboard, ... )
│   ├── (unauthenticated)/  # Auth/sign-in pages
│   └── ...
├── components/             # UI components
├── lib/                    # Supabase clients
├── types/                  # Global types
├── hooks/                  # (Potential) React hooks
├── public/                 # Static assets like icons
└── ...
```

---

## API Overview

- `GET /api/samples` — fetch all plant samples
- `POST /api/samples` — create new sample
- `GET/PUT/DELETE /api/samples/[id]` — manage a sample
- ... equivalent for `/locations` and `/researchers`

You can extend or use the REST API in external tools.

---

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL` (from Supabase Project > Settings > API)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_MAPBOX_TOKEN` (from mapbox.com, for map features)

---

## Development

- TypeScript strict
- Modern Next.js (App Router)
- End-to-End tested (manually)
- Lint with:
    ```
    npm run lint
    ```

---

## Roadmap / TODO

- [x] CRUD/core UI flows
- [x] Browser auth (sign in/up)
- [X] Role-based/protected routes
- [ ] Real-time data updates  
- [ ] filters/reporting

---

## License

This repository is under a custom “view-only” license.  
You may view and read the code for educational purposes only.  
You may **not** modify, distribute, or use it outside of this project without permission.

---                                                                                                                                                