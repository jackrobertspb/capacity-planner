# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Capacity Planner is a web-based resource management and project scheduling application for developer teams. It recreates and improves upon "Hello Time" functionality, providing visual calendar-based scheduling for efficient resource utilization. The MVP is 97% complete.

**Tech Stack**: Laravel 12 + React 19 + Inertia.js + Filament 4 + Tailwind CSS 4 + shadcn/ui

## Development Commands

```bash
# Initial setup (first time only)
composer setup              # Installs deps, creates .env, runs migrations, builds assets

# Development (runs all services concurrently)
composer dev               # Starts PHP server (8000) + queue listener + Vite (5173)

# Testing
composer test              # Runs PHPUnit test suite

# Asset building
npm run build              # Production Vite build
npm run dev                # Vite dev server only (if not using composer dev)
```

**Access Points**:
- Main app: http://localhost:8000
- Admin panel: http://localhost:8000/admin
- Vite dev: http://localhost:5173

## Architecture

This is a three-tier monolithic application with Inertia.js bridging Laravel and React:

```
React Components (resources/js/)
         ↓
    Inertia.js (bridge layer)
         ↓
Laravel Controllers (app/Http/Controllers/)
         ↓
Eloquent ORM + Database (SQLite dev / MySQL prod)
         +
Filament Admin Panel (/admin)
```

**Key Pattern**: Inertia.js eliminates the need for a separate REST API. Laravel routes render React components server-side, passing data as props. Pages in `resources/js/Pages/` map 1:1 to routes in `routes/web.php`. Data flows: Controller → `Inertia::render('PageName', $data)` → React component receives `$data` as props.

## Data Model & Relationships

**User** (employee)
- Fields: `name`, `email`, `role` (admin/user/guest), `work_days` (array 1-7), `annual_leave_default` (default: 25), `is_visible`
- Relations: `hasMany(ProjectAllocation)`, `hasMany(AnnualLeave)`, `hasMany(CalendarMarker)`

**Project**
- Fields: `name`, `description`, `color`, `status`, `is_visible`
- Relations: `hasMany(ProjectAllocation)`

**ProjectAllocation** (work assignment - the core entity)
- Fields: `user_id`, `project_id`, `type` (project/SLA/misc), `title`, `start_date`, `end_date`, `days_per_week`, `notes`
- Relations: `belongsTo(User)`, `belongsTo(Project)`
- Note: This is effectively a rich join table with extended scheduling data

**AnnualLeave** (time-off records)
- Fields: `user_id`, `start_date`, `end_date`, `days_count`, `notes`
- Relations: `belongsTo(User)`

**CalendarMarker** (custom calendar events)
- Fields: `user_id`, `date`, `title`, `description`, `color`, `type`
- Relations: `belongsTo(User)`

## Frontend Organization

**Inertia Pages** (`resources/js/Pages/`)
- Each `.jsx` file = a route (e.g., `Calendar.jsx` → `/calendar`)
- Receives data from Laravel as React props
- Uses Inertia's `<Head>` component for page titles
- Auth pages live in `Pages/Auth/` subdirectory

**React Components** (`resources/js/Components/`)
- `Allocation/` - Work allocation blocks and forms
- `Calendar/` - Calendar grid, header, cells, marker forms
- `ui/` - shadcn/ui components (button, dialog, select, toast, etc.)
- Built on Radix UI primitives + Tailwind CSS

**State Management**
- No Redux/Zustand/Jotai - uses Inertia's reactive props system
- Form state managed with React controlled components
- Calendar data fetched fresh on each navigation via `CalendarController`

**UI Libraries in Use**:
- Radix UI (dialog, dropdown-menu, select, toast, slot primitives)
- lucide-react (icons)
- date-fns (date utilities)
- dnd-kit (drag-and-drop - partially implemented)
- class-variance-authority, clsx, tailwind-merge (styling utilities)

## Key Controllers

**CalendarController** (`app/Http/Controllers/CalendarController.php`)
- Main data aggregator for the calendar view
- Fetches all visible users, projects, allocations, annual leave, and markers
- Returns comprehensive dataset in single response to minimize queries
- Powers the primary `/calendar` page

**ProjectAllocationController**
- Full CRUD for work assignments
- Handles three allocation types: project, SLA, miscellaneous
- Validates date ranges and conflicts

**AnnualLeaveController**
- Manages employee time-off records
- Supports bulk add operations
- Can clear all leave records (admin only)

**CalendarMarkerController**
- User-created custom calendar events/markers
- Standard CRUD operations

**ProfileController**
- User profile and password management
- Standard update/delete operations

## Routing Structure

**Main Routes** (`routes/web.php`)
- `/` → Redirects to `/calendar` (auth) or `/login` (guest)
- `/calendar` → Main calendar view (Inertia page)
- `/projects` → Project management page
- `/profile` → User profile page
- Resource routes: `/allocations`, `/annual-leave`, `/markers` (POST/PATCH/DELETE)

**Auth Routes** (`routes/auth.php`)
- Standard Laravel Breeze-style: `/login`, `/register`, `/forgot-password`, `/reset-password`
- Uses Inertia for React-based auth pages (no Blade views except root template)

## Admin Panel (Filament 4)

Access at `/admin` - requires admin role.

**Resources** (`app/Filament/Resources/`):
- **UserResource** - Employee CRUD (work days, leave defaults, visibility controls)
- **ProjectResource** - Project management (colors, status, visibility)
- **AnnualLeaveResource** - Leave management with bulk operations
- **CalendarMarkerResource** - Custom marker CRUD

Filament auto-generates CRUD interfaces with validation. No need to build admin forms manually.

## Design Constraints

**CRITICAL RULE FROM PROJECT REQUIREMENTS**:
- ❌ **NO GRADIENTS** - Use solid colors only throughout the entire application
- ✅ Use shadows, borders, and solid backgrounds for visual depth
- ✅ Flat, modern aesthetic with Tailwind CSS

This is a hard requirement. When adding UI components or styling, never use CSS gradients (`linear-gradient`, `radial-gradient`, etc.).

## Database

**Development**: SQLite at `database/database.sqlite`
**Production**: MySQL (configure via `.env`)

**Migrations**: 8 total in `database/migrations/`
- Core tables: users, projects, project_allocations, annual_leave, calendar_markers
- Laravel tables: cache, jobs, sessions, password_reset_tokens

Run migrations: `php artisan migrate`

**Default User Settings** (defined in migrations):
- Role: `user`
- Work Days: `[1,2,3,4,5]` (Monday-Friday)
- Annual Leave Default: `25` days
- Visibility: `true`

## Known Gaps & Future Work

**Incomplete Features** (from PROJECT-REQUIREMENTS.md):
- ⚠️ **Drag-and-drop allocation adjustment** on calendar (83% complete)
  - UI libraries (`dnd-kit`) are installed
  - Backend API supports updates
  - Missing: Interactive drag handlers in calendar cells
  - This is the primary outstanding MVP feature

**Default Settings**:
- Admin users must be created manually in database or via Filament
- First user should be promoted to admin role for panel access

## Testing

```bash
composer test              # Runs full PHPUnit suite
```

Config: `phpunit.xml`
Tests directory: `tests/`

## Build & Deploy

**Development Setup**:
1. `composer setup` (first time - installs, migrates, builds)
2. `composer dev` (daily - runs all services)
3. Open http://localhost:8000

**Production Build**:
1. Configure `.env` for production (MySQL connection, APP_ENV=production, etc.)
2. `composer install --no-dev --optimize-autoloader`
3. `php artisan key:generate` (if needed)
4. `php artisan migrate --force`
5. `npm run build`
6. Set appropriate file permissions for `storage/` and `bootstrap/cache/`

Vite compiles assets to `public/build/` - serve `public/` as web root.

## Additional Documentation

For comprehensive feature requirements and specifications, see:
- `PROJECT-REQUIREMENTS.md` - Full feature list, user stories, implementation status
- `README.md` - Standard Laravel readme
- `PRD-COMPLETION-REPORT.md` - Project completion status (if exists)
