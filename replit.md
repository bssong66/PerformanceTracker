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

### Recent Changes (July 27, 2025)
- **Local Authentication System Implementation Completed**
- Added bcryptjs password hashing for secure local authentication
- Implemented Passport Local Strategy alongside existing Replit Auth
- Created comprehensive login/signup page (/login) with dual authentication support
- Added password and authType columns to users table via direct SQL migration
- Enhanced upsertUser method to handle both Replit and local authentication data
- Updated Landing page with login redirect to /login page
- Configured logout functionality through existing /api/logout endpoint
- **Foundation Data Empty State Enhancement**
- Modified WeeklyReview and MonthlyReview to show informative empty states
- Changed from hiding sections to displaying "등록된 핵심가치가 없습니다" message
- Added guidance text directing users to set core values in Foundation page
- Ensured proper data isolation between different user accounts
- **Pomodoro Timer Completion Notification System Implementation**
- Added system notification support with browser Notification API
- Implemented completion dialog with multiple action options (task completion, session extension, break start)
- Created comprehensive completion flow with 25/15/10 minute extension options
- Added browser notification permission request functionality
- Replaced basic beep sound with pleasant bell sound using Web Audio API (C-E-G arpeggio)
- Fixed routing issues and added /daily path for Daily Management page
- Enhanced useTimer hook with completion acknowledgment and break management
- **Daily Management Page Tab Structure Implementation**
- Integrated Focus Mode as a tab within Daily Management instead of standalone page
- Created tabbed interface with "일일관리" and "포커스모드" tabs using Shadcn Tabs component
- Removed Focus Mode from main navigation to streamline menu structure
- Implemented Pomodoro timer functionality with 25-minute sessions and break intervals
- Added task selection and completion tracking within Focus Mode
- Created useTimer custom hook for timer functionality
- **Data Integrity and Performance Improvements**
- Fixed Checkbox component type errors with proper CheckedState handling
- Ensured data consistency between daily planning and focus mode tabs
- Removed duplicate API calls and optimized data fetching patterns
- Added comprehensive input validation for tasks and time blocks
- Enhanced error handling with user-friendly toast notifications
- Fixed time block input initialization and validation logic
- Added year parameter to Foundation and Annual Goals API calls for accuracy

### Previous Changes (July 26, 2025)
- **Unified Save System Implementation Completed**
- Removed all section-level save/cancel buttons from Foundation page
- Implemented unified save functionality using only top-level save button
- Added temporary storage system for annual goals with Enter key addition
- Created visual distinction between saved goals and temporary goals ("임시 저장" indicator)
- Implemented year change behavior that discards unsaved temporary data
- Removed individual edit/delete buttons from existing goals for simplified UI
- Streamlined new goal input with full-width textarea and Enter key submission
- **Year-based Foundation Management System Implementation**
- Updated database schema to add year column to foundations table with NOT NULL constraint
- Modified DatabaseStorage and MemStorage classes to support year-based Foundation queries
- Updated API endpoints to accept year parameter for Foundation operations
- Implemented year selector UI with navigation controls (previous/next buttons and dropdown)
- Added current/future/past plan indicators for different years
- Implemented "신규 계획 생성" (New Plan Creation) functionality for independent annual planning
- Added automatic data refresh when year changes with proper cache invalidation
- **Refined Header Layout Design**
- Moved description text to the right of the title in a clean, horizontal layout
- Repositioned action buttons (New Plan, Data Load, Save) below the title for better organization
- Improved Dialog component with proper description text to resolve accessibility warnings
- Enhanced visual hierarchy with proper spacing and alignment

### Previous Changes (July 25, 2025)
- **Database Schema Cleanup: Removed Weekly Goal Fields**
- Removed unused weekly_goal_1, weekly_goal_2, weekly_goal_3 fields from weekly_reviews table
- Updated database schema and removed corresponding frontend state and UI components
- Cleaned up WeeklyReview component by removing goal-related code and functions
- Database migration completed successfully without data loss warnings
- **Verified Monthly Review Schema Integrity**
- Confirmed monthly_reviews table has no monthly_goal fields (already clean)
- Monthly review component was implemented correctly from the start without goal fields

- **Enhanced Individual Task Rollover Functionality**
- Added individual date selection for each incomplete task using calendar pickers
- Each task now has its own rollover date instead of a universal next Monday
- Implemented Calendar component with Popover for date selection interface
- Tasks can be rolled over to any future date chosen by user
- Updated rollover logic to handle individual task dates in backend mutation
- Fixed project name display issue: changed project.name to project.title in task display
- Improved UI with better spacing and visual indicators for rollover dates

### Previous Changes (July 21, 2025)
- **TaskManagement page completely separated from ProjectManagement**
- TaskManagement now only displays standalone tasks (projectId: null)
- Removed project selection from task creation form in TaskManagement
- Removed project filtering options - only shows independent tasks
- Removed project-related visual indicators and color coding
- Tasks created in TaskManagement are always independent (no project association)
- **Fixed SelectItem validation errors in ProjectManagement**
- Resolved duplicate key warnings in select components
- Added debugging information and refresh functionality for foundation data
- **ProjectManagement retains full project-task integration**
- Project-linked tasks remain fully functional within ProjectManagement
- Visual hierarchy preserved with task indentation and connector lines
- Multiple image upload support maintained for both systems

### Previous Changes (July 20, 2025)
- **Restructured main navigation menu as requested by user**
- Changed menu structure to: 대시보드/가치중심계획/일정관리/계획수립/일일관리/리뷰/포커스 모드
- Added back 일일관리 page positioned after 계획수립 as requested
- **계획수립 page now contains three tabs: 프로젝트관리/할일관리/습관관리**
- Created separate components: ProjectManagement.tsx, TaskManagement.tsx, HabitManagement.tsx
- **리뷰 page contains tabs for: 주간리뷰/월간리뷰**
- Created new Review.tsx component integrating existing WeeklyReview with new MonthlyReview
- **Updated Calendar page with Korean recurrence options**
- Changed recurring event options to Korean: "반복없음/일/주/월/연"
- **All existing functionality preserved during reorganization**
- No changes to features or designs - only menu structure and component organization
- All calendar features remain intact: drag-and-drop, recurring events, Korean localization
- All project, task, and habit management features preserved
- Previous changes maintained:
  - MS Outlook-style Calendar with drag-to-create functionality
  - Comprehensive recurring event functionality with 🔄 prefix
  - Event resizing and drag-and-drop with real-time backend sync
  - A-B-C priority task management system
  - Image upload and viewing capabilities for projects and tasks
  - Habit tracking with streak counting and daily completion

The application follows a monorepo structure with clear separation between frontend, backend, and shared code, enabling efficient development and deployment workflows.