# AssetVault - IT Asset Management SaaS

## Overview

AssetVault is a comprehensive IT Asset Management (IT AM) SaaS application built with modern web technologies. The platform provides multi-tenant support for organizations to manage their IT assets throughout their entire lifecycle, from procurement to disposal. The application features AI-powered optimization recommendations using LLM integration, software license management, compliance tracking, and comprehensive asset analytics.

The system is designed as a full-stack web application with a React-based frontend and Express.js backend, utilizing PostgreSQL for data persistence and incorporating third-party AI services for intelligent asset optimization suggestions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side is built as a Single Page Application (SPA) using React with TypeScript. The architecture follows modern React patterns with functional components and hooks. Key design decisions include:

- **React Router Alternative**: Uses Wouter for lightweight client-side routing, providing a smaller bundle size compared to React Router
- **State Management**: Leverages React Query (TanStack Query) for server state management, eliminating the need for complex global state solutions like Redux
- **UI Component System**: Implements shadcn/ui components built on Radix UI primitives, providing accessible and customizable components
- **Styling Strategy**: Uses Tailwind CSS with CSS variables for theming, supporting both light and dark modes
- **Form Management**: Integrates React Hook Form with Zod validation for type-safe form handling

### Backend Architecture
The server-side follows a RESTful API architecture built with Express.js and Node.js:

- **Authentication Strategy**: Implements JWT-based authentication with role-based access control (RBAC) supporting three role levels: read-only, it-manager, and admin
- **Database Layer**: Uses Drizzle ORM with PostgreSQL for type-safe database operations and schema management
- **Multi-tenancy**: Implements tenant isolation at the database level, ensuring data separation between organizations
- **API Design**: RESTful endpoints organized by resource type (assets, licenses, recommendations) with consistent response patterns
- **Middleware Architecture**: Custom authentication middleware for protected routes and request logging for debugging

### Data Storage Solutions
The application uses a relational database approach with PostgreSQL:

- **Database Choice**: PostgreSQL selected for ACID compliance, complex queries, and JSON support for flexible asset specifications
- **ORM Integration**: Drizzle ORM provides type-safe database operations with automatic TypeScript type generation
- **Schema Design**: Normalized relational schema with proper foreign key constraints and indexes for performance
- **Migration Strategy**: Schema versioning through Drizzle migrations for safe database updates across environments

### Authentication and Authorization
Security is implemented through a multi-layered approach:

- **JWT Implementation**: Stateless authentication using JSON Web Tokens with configurable expiration
- **Password Security**: Uses bcrypt for password hashing with configurable salt rounds
- **Role-based Access**: Hierarchical permission system where higher roles inherit lower role permissions
- **Route Protection**: Both frontend and backend route protection ensuring unauthorized access prevention

### AI Integration Architecture
The system incorporates Large Language Model capabilities for intelligent recommendations:

- **OpenAI Integration**: Uses OpenAI's GPT models for analyzing asset utilization patterns and generating optimization suggestions
- **Data Pipeline**: Collects asset utilization metrics (CPU, RAM, disk usage) and processes them for AI analysis
- **Recommendation Engine**: Structured prompts generate actionable insights for asset optimization, license management, and cost reduction
- **Feedback Loop**: Recommendations can be accepted or dismissed, allowing for system learning over time

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL database driver optimized for edge deployment
- **OpenAI**: Official OpenAI JavaScript client for LLM integration and AI-powered recommendations
- **Express.js**: Web application framework for building the REST API server
- **React**: Frontend library for building the user interface with component-based architecture

### Authentication and Security
- **jsonwebtoken**: JWT implementation for secure authentication token management
- **bcrypt**: Password hashing library for secure credential storage
- **connect-pg-simple**: PostgreSQL session store integration (configured but not actively used due to JWT strategy)

### Database and ORM
- **Drizzle ORM**: Type-safe ORM with PostgreSQL support and automatic TypeScript type generation
- **PostgreSQL**: Primary database system for persistent data storage with ACID compliance

### UI and Component Libraries
- **Radix UI**: Comprehensive collection of accessible UI primitives for building the component system
- **Tailwind CSS**: Utility-first CSS framework for styling with design system support
- **Lucide React**: Icon library providing consistent iconography throughout the application

### Development and Build Tools
- **Vite**: Modern build tool for fast development and optimized production builds
- **TypeScript**: Static type checking for improved code quality and developer experience
- **ESBuild**: Fast JavaScript bundler used by Vite for production builds

### Form and Data Management
- **React Hook Form**: Performant form library with minimal re-renders
- **Zod**: TypeScript-first schema validation for API endpoints and form validation
- **TanStack React Query**: Server state management for efficient data fetching and caching

### Development Environment
- **Replit Integration**: Custom Vite plugins for Replit development environment support
- **Hot Module Replacement**: Development-time feature for instant code updates without full page reloads