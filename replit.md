# Replit.md - Mtendere Education Platform

## Overview

This is a full-stack web application for Mtendere Education Consultants, an educational consulting platform that helps students find scholarships, educational opportunities, and career guidance. The application is built with a modern tech stack including React, TypeScript, Node.js, Express, and PostgreSQL.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Framework**: Shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom brand colors and design system
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Authentication**: JWT-based authentication with React context

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Authentication**: JWT tokens with bcrypt for password hashing
- **Real-time Communication**: WebSocket integration for live updates
- **AI Integration**: OpenAI API for intelligent chat assistance

### Key Components

1. **Authentication System**
   - JWT-based authentication
   - Role-based access control (user, admin, super_admin)
   - Session management with secure storage

2. **Content Management**
   - Scholarships management with search and filtering
   - Job opportunities tracking
   - Partner institutions management
   - Blog posts and testimonials
   - Team member profiles

3. **Application Tracking**
   - User application submissions
   - Status tracking and updates
   - Admin dashboard for application management

4. **AI Chat Assistant**
   - OpenAI GPT-4 integration
   - Context-aware responses about educational opportunities
   - Real-time chat interface

5. **Analytics Dashboard**
   - User engagement tracking
   - Application metrics
   - Performance monitoring

## Data Flow

1. **User Registration/Login**: Users register and authenticate through JWT tokens
2. **Content Discovery**: Users browse scholarships, jobs, and partner information
3. **Application Process**: Users submit applications tracked in the system
4. **AI Assistance**: Users interact with AI chat for guidance
5. **Admin Management**: Admins manage content and monitor applications
6. **Real-time Updates**: WebSocket connections provide live updates

## External Dependencies

- **Database**: Neon Database (PostgreSQL)
- **AI Service**: OpenAI API for chat functionality
- **WebSocket**: Native WebSocket implementation for real-time features
- **Authentication**: JWT and bcrypt for security
- **UI Components**: Radix UI primitives with Shadcn/ui styling

## Deployment Strategy

- **Build Process**: Vite builds the React frontend, esbuild bundles the Node.js backend
- **Environment**: Supports both development and production environments
- **Database Migrations**: Drizzle Kit for schema management
- **Asset Management**: Static file serving for images and documents
- **Real-time Features**: WebSocket server integrated with HTTP server

## Changelog

- July 08, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.