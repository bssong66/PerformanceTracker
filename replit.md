# 개인성과 관리앱 (Personal Performance Management App)

## Overview

This is a personal productivity and planning application based on Franklin Planner methodology. It's built as a full-stack web application with a React frontend and Express.js backend, using PostgreSQL as the database with Drizzle ORM for type-safe database operations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **UI Components**: Shadcn/UI component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **State Management**: TanStack Query (React Query) for server state management
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for type safety
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (@neondatabase/serverless)
- **Session Management**: PostgreSQL session store (connect-pg-simple)

### Design System
- **Style**: Minimal design philosophy following the New York variant of Shadcn/UI
- **Colors**: Neutral-based palette with black/white primary colors
- **Typography**: System fonts (Helvetica, Arial)
- **Responsive**: Mobile-first design with responsive breakpoints

## Key Components

### 1. Foundation Module (가치 중심 계획)
- Personal mission statement creation
- Core values definition (3 values maximum)
- Annual goal setting connected to mission and values
- Database tables: `foundations`, `annualGoals`

### 2. Project Management System
- Project creation and lifecycle management
- Project prioritization (high/medium/low)
- Status tracking (planning/in-progress/completed)
- Visual project identification with color coding
- Database table: `projects`

### 3. Task Management with ABC Priority System
- A-level: Critical and urgent tasks
- B-level: Important but not urgent tasks
- C-level: Nice-to-have tasks that can be postponed
- Project-based task organization
- Database table: `tasks` with priority field

### 4. Two-page Daily Management
- Left page: Today's schedule and prioritized tasks
- Right page: Completion tracking, notes, and daily reflection
- Integration with project-based tasks
- Database tables: `tasks`, `timeBlocks`, `dailyReflections`

### 5. Weekly Review System
- Performance tracking: Completed A and B level tasks
- Next week preparation: New priority setting
- Work-life balance check: Work vs personal time ratio
- Values alignment check: Activities alignment with personal values
- Database table: `weeklyReviews`

### 6. Habit Tracking
- Habit creation and management
- Daily habit logging with streak tracking
- Progress visualization
- Database tables: `habits`, `habitLogs`

### 7. Focus Mode
- Pomodoro timer (25-minute sessions)
- A-priority task focus mode
- Distraction blocking features
- Session completion tracking

## Data Flow

### Authentication & User Management
- Mock user system (MOCK_USER_ID = 1) for development
- Session-based authentication ready for implementation
- User-scoped data isolation

### State Management Pattern
- TanStack Query for server state caching and synchronization
- Optimistic updates for better user experience
- Error handling with toast notifications
- Automatic cache invalidation on mutations

### API Design
- RESTful API endpoints following resource-based patterns
- Consistent error handling with appropriate HTTP status codes
- Request/response validation using Zod schemas
- Centralized API client with request/response interceptors

## External Dependencies

### Core Dependencies
- **Database**: Neon PostgreSQL serverless database
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **UI Framework**: Radix UI primitives for accessibility
- **Icons**: Lucide React icon library
- **Date Handling**: date-fns for date manipulation and formatting
- **Form Handling**: React Hook Form with Zod validation

### Development Dependencies
- **Build Tools**: Vite with React plugin
- **Type Checking**: TypeScript with strict configuration
- **CSS Processing**: PostCSS with Tailwind CSS
- **Development**: tsx for TypeScript execution, ESBuild for bundling

### Replit-specific Integrations
- **Error Handling**: @replit/vite-plugin-runtime-error-modal for development
- **Code Navigation**: @replit/vite-plugin-cartographer for file exploration
- **Development Banner**: Replit development banner script

## Deployment Strategy

### Development Environment
- Local development with Vite dev server
- Hot module replacement for fast iteration
- TypeScript compilation checking
- Environment-specific configurations

### Production Build
- Vite build for optimized frontend bundle
- ESBuild for server-side code bundling
- Static file serving through Express
- Environment variable configuration for database connections

### Database Management
- Drizzle migrations for schema versioning
- Database push commands for development
- PostgreSQL connection pooling for production scalability

### File Structure
```
├── client/          # Frontend React application
├── server/          # Backend Express.js application
├── shared/          # Shared types and schemas
├── migrations/      # Database migration files
└── attached_assets/ # Project documentation and requirements
```

### Recent Changes (July 20, 2025)
- Completely redesigned Planning page with simplified, top-to-bottom layout
- Moved project creation to popup dialog for cleaner interface
- Implemented project-centric workflow: select project → view/manage tasks
- Added task creation within selected project context
- Removed complex tabs and filters for streamlined user experience
- Enhanced visual hierarchy with clear project selection and task management sections
- Fixed critical image state management bug where task images disappeared after viewing task details
- Implemented popup image viewers for both project and task images with click-to-view functionality
- Integrated project tasks into daily planning page - tasks automatically appear in today's plan based on start/end dates
- Removed manual task scheduling interface in favor of automatic date-based inclusion
- **Added MS Outlook-style Calendar page with drag-to-create functionality**
- Implemented React Big Calendar with month/week/day views and Korean localization
- Added comprehensive event management with priority levels and repeat functionality
- Integrated all tasks display on calendar with visual distinction from events
- Enhanced schema with event repeat patterns (daily/weekly/monthly/yearly) and weekday selection
- Added calendar navigation to main menu as "일정관리"
- **Implemented event resizing and drag-and-drop functionality**
- Events can be resized by dragging edges to adjust start/end times
- Events can be moved by dragging to different dates/times
- Tasks are read-only on calendar (cannot be resized or moved)
- Real-time updates with backend synchronization for all calendar modifications
- **Implemented comprehensive recurring event functionality**
- Supports daily, weekly (with weekday selection), monthly, and yearly recurrence patterns
- Recurring instances automatically generated and displayed with 🔄 prefix
- Original events remain editable while recurring instances are read-only
- Visual distinction with italic styling and borders for recurring instances

The application follows a monorepo structure with clear separation between frontend, backend, and shared code, enabling efficient development and deployment workflows.