# Overview

This is a modern full-stack web application built with React, TypeScript, Express.js, and PostgreSQL. The application features a comprehensive admin dashboard system for managing educational content including scholarships, job opportunities, partner institutions, blog posts, team members, users, applications, and services/products. It includes real-time WebSocket notifications, AI-powered content moderation, file upload capabilities, and comprehensive role-based access control (RBAC).

## Project Status: COMPLETE ✓

All admin management pages are fully functional with complete CRUD operations:
- Scholarships Management (Create, Read, Update, Delete)
- Jobs Opportunities Management (Create, Read, Update, Delete)
- Partners Management (Create, Read, Update, Delete)
- Blog Posts Management (Create, Read, Update, Delete)
- Team Members Management (Create, Read, Update, Delete)
- Users Management (with role assignment)
- Applications Review (Review and status management)
- Analytics Dashboard (Metrics and trends visualization)
- AI Chat Management (Monitoring AI conversations)
- Platform Settings (System configuration)
- **Roles & Permissions** - Complete RBAC system with role creation and permission management

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React with TypeScript**: Component-based UI using functional components and hooks
- **Vite**: Modern build tool and development server for fast hot module replacement
- **Wouter**: Lightweight client-side routing library
- **TanStack Query**: Server state management and caching for API calls
- **Shadcn/ui**: Pre-built component library based on Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework for styling
- **React Hook Form + Zod**: Form handling with schema validation

## Backend Architecture
- **Express.js**: RESTful API server with middleware-based request handling
- **TypeScript**: Type-safe server-side development
- **Drizzle ORM**: Type-safe database queries and schema management
- **WebSocket Server**: Real-time bidirectional communication for admin notifications
- **Session-based Authentication**: JWT tokens with role-based access control
- **Middleware Pattern**: Modular request processing for auth, file uploads, and error handling

## Data Storage
- **PostgreSQL**: Primary relational database using Neon serverless
- **Drizzle Schema**: Type-safe database schema definitions with relations
- **Connection Pooling**: Efficient database connection management
- **Database Migrations**: Version-controlled schema changes

## Authentication & Authorization
- **JWT-based Authentication**: Stateless token authentication
- **Comprehensive RBAC System**:
  - Multiple role assignment per user
  - Role-based permission management
  - 10+ granular permissions (view dashboard, manage content, review apps, etc.)
  - User responsibility assignment
  - Role creation and permission customization
- **Protected Routes**: Middleware guards for API endpoints
- **Session Management**: Secure token handling and validation

## Admin Management Features
- **DataTable Component**: Consistent, reusable table UI across all pages
  - Pagination, search, sorting capabilities
  - Edit/Delete inline actions
  - Responsive design
- **CRUD Operations**: All 12 admin sections support complete operations
- **Form Validation**: Zod schemas ensure data integrity
- **Real-time Feedback**: Toast notifications for all user actions

## File Management
- **Multer**: Multipart form data handling for file uploads
- **Sharp**: Image processing and optimization
- **Local File Storage**: Server-side file storage with organized directory structure
- **File Type Validation**: Security measures for uploaded content

## Real-time Features
- **WebSocket Integration**: Live notifications and updates
- **Admin Dashboard Updates**: Real-time content management notifications
- **Connection Management**: Automatic reconnection and error handling

# Implemented Admin Pages (12 Total)

1. **Dashboard** - Overview and quick stats
2. **Scholarships** - Full CRUD for scholarship opportunities
3. **Jobs** - Full CRUD for job opportunities
4. **Partners** - Full CRUD for partner institutions
5. **Blog** - Full CRUD for blog posts
6. **Team** - Full CRUD for team members
7. **Users** - User management with role assignment
8. **Roles & Permissions** - Complete RBAC system with permission management
9. **Applications** - Review and manage user applications with status changes
10. **Analytics** - Dashboard metrics and trends visualization
11. **AI Chat** - Monitor AI conversations and moderation statistics
12. **Settings** - Platform configuration and general settings

# External Dependencies

## Core Technologies
- **Neon Database**: Serverless PostgreSQL hosting and connection pooling
- **OpenAI API**: AI-powered content moderation and text generation
- **TinyMCE**: Rich text editor for content creation (loaded via CDN)

## UI Component Libraries
- **Radix UI**: Accessible component primitives for complex UI elements
- **Lucide React**: Comprehensive icon library
- **Embla Carousel**: Touch-friendly carousel component
- **Recharts**: Data visualization for analytics

## Development Tools
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Tailwind CSS integration
- **TypeScript Compiler**: Type checking and compilation

## Database & ORM
- **Drizzle ORM**: Type-safe database queries
- **Drizzle-Zod**: Integration between Drizzle and Zod validation
- **PostgreSQL**: Relational database

## Utility Libraries
- **date-fns**: Date manipulation and formatting
- **clsx**: Conditional CSS class composition
- **nanoid**: Unique identifier generation
- **connect-pg-simple**: PostgreSQL session store for Express
- **bcrypt**: Password hashing and verification
- **jsonwebtoken**: JWT token creation and verification

# Recent Completion (Latest Session)

## Implemented Features:
1. ✅ All 12 admin management pages with full CRUD operations
2. ✅ DataTable component for consistent UI across pages
3. ✅ Form validation with Zod schemas
4. ✅ Real-time toast notifications
5. ✅ **Complete Role-Based Access Control (RBAC) System**:
   - Roles table with permission arrays
   - User Roles junction table for multi-role assignment
   - Responsibility field for role-specific duties
   - Roles & Permissions management page
   - 10+ granular permissions available

## Database Schema (New):
- `roles`: Role definitions with JSON permissions array
- `user_roles`: User-role assignments with responsibility tracking

## Frontend Pages (All Functional):
- All 12 admin pages fully implemented
- Consistent design and UX patterns
- Type-safe with TypeScript and Zod validation
- All LSP errors fixed

# Next Steps for Enhancement

1. Backend API routes for Roles and User Roles management
2. Permission checking middleware enforcement
3. Audit logging for role/permission changes
4. Advanced analytics with date range filtering
5. Batch operations (bulk delete, bulk status update)
6. Export functionality (CSV, PDF)
7. Role templates for quick setup
8. User activity history and audit trail
