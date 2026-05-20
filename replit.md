# NutriScan - AI-Powered Nutrition Analysis App

## Overview

NutriScan is a mobile-first health and nutrition application that allows users to scan product barcodes to receive AI-driven health insights. The app features barcode scanning, product nutritional analysis with health scoring, AI chat for nutrition consultations, and user profile management. Built as a full-stack TypeScript application with React frontend and Express backend, it integrates with Replit Auth for authentication and OpenAI for AI features.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, bundled via Vite
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query for server state, React hooks for local state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom emerald/health-themed color palette
- **Animations**: Framer Motion for smooth transitions and interactions
- **Barcode Scanning**: html5-qrcode library for camera-based barcode detection

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Session Management**: express-session with connect-pg-simple for PostgreSQL session storage
- **Authentication**: Replit Auth via OpenID Connect (OIDC)
- **AI Integration**: OpenAI API via Replit AI Integrations for chat and image generation

### Key Design Patterns
- **Monorepo Structure**: Shared code between client and server in `/shared` directory
- **Type-Safe API**: Zod schemas define API contracts in `/shared/routes.ts`
- **Integration Modules**: Replit integrations organized in `/server/replit_integrations/` with auth, chat, image, and batch processing utilities
- **Storage Pattern**: Database operations abstracted through storage interfaces (IStorage, IAuthStorage, IChatStorage)

### Data Flow
1. Frontend uses custom hooks (`use-auth`, `use-products`, `use-chat`, `use-profile`) to interact with API
2. API routes defined in Express handle requests, validate with Zod schemas
3. Storage layer interfaces with PostgreSQL via Drizzle ORM
4. AI features stream responses from OpenAI through SSE endpoints

### Database Schema
- **users**: User profiles with id, email, name, age, gender, profile image
- **sessions**: Express session storage for authentication
- **conversations**: AI chat conversation metadata
- **messages**: Individual chat messages linked to conversations
- **moroccan_products**: Local database of 59+ Moroccan products with barcodes, nutritional data, halal certification status, and ingredients (brands: Centrale Laitière, Koutoubia, Bimo, Tria, Lesieur Cristal, Aicha, Agros, Chlef, Doha, Oulmès, Sidi Ali, etc.)

## Mobile App (Android / Play Store)

NutriScan est configuré avec **Capacitor** pour être publié sur le Play Store.

### Configuration Capacitor
- Config: `capacitor.config.ts` (appId: `ma.nutriscan.app`)
- Web dir: `dist/public`
- Plateforme Android: dossier `android/`

### AdMob
- Plugin: `@capacitor-community/admob`
- AndroidManifest.xml contient le meta-data AdMob App ID (à remplacer par le vrai ID)
- IDs de test utilisés en développement
- Bannières affichées uniquement pour les utilisateurs gratuits (free tier)

### Build Android (à faire localement)
1. Télécharger le projet complet
2. Ouvrir `android/` dans Android Studio
3. Remplacer l'App ID AdMob dans `AndroidManifest.xml` et `capacitor.config.ts`
4. Build → Generate Signed APK / AAB
5. Publier sur Google Play Console

### Mise à jour après modifications web
```bash
npm run build
npx cap sync android
```

## External Dependencies

### Third-Party Services
- **Replit Auth**: OIDC-based authentication (redirect to `/api/login`)
- **OpenAI API**: AI chat completions and image generation via Replit AI Integrations
- **OpenFoodFacts API**: Free product database for barcode lookups (`https://world.openfoodfacts.org/api/v0/product/{barcode}.json`)

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries with schema defined in `/shared/models/`
- **Schema Push**: Use `npm run db:push` to sync schema changes

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption
- `REPL_ID`: Replit environment identifier (auto-provided in Replit)
- `AI_INTEGRATIONS_OPENAI_API_KEY`: OpenAI API key for AI features
- `AI_INTEGRATIONS_OPENAI_BASE_URL`: OpenAI API base URL

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit`: Database ORM and migrations
- `@tanstack/react-query`: Server state management
- `html5-qrcode`: Barcode/QR code scanning
- `framer-motion`: Animation library
- `openai`: OpenAI SDK for AI integrations
- `passport` / `openid-client`: Authentication handling