# Two Together - Date Ideas App

A React TypeScript application for couples to manage and track date ideas together.

## Features

- 🔐 User authentication with encrypted passwords
- 👥 Partner pairing system for couples
- 📝 Add, edit, delete, and tick off date ideas
- ⭐ Mark favourite date ideas
- ✅ Track completed dates
- 💕 "Should Do This Again" list for memorable dates
- 📅 Shared calendar for planning dates
- 🔄 Google Calendar sync (instant updates)
- 📱 iCal subscription for Apple Calendar
- 🖼️ Custom background image with low contrast overlay

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up PostgreSQL database:**
   ```bash
   # Create the database
   createdb twotogether

   # Run initial schema
   psql -h localhost -U postgres -d twotogether -f database/init.sql

   # Run migrations
   psql -h localhost -U postgres -d twotogether -f database/migration-001-add-couples-and-voting.sql
   psql -h localhost -U postgres -d twotogether -f database/migration-002-add-background-image.sql
   psql -h localhost -U postgres -d twotogether -f database/migration-003-add-admin-features.sql
   psql -h localhost -U postgres -d twotogether -f database/migration-004-add-calendar-events.sql
   psql -h localhost -U postgres -d twotogether -f database/migration-005-add-calendar-token.sql
   psql -h localhost -U postgres -d twotogether -f database/migration-006-add-google-calendar-tokens.sql
   ```

3. **Set up Google Calendar API (Optional - for instant Google Calendar sync):**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable the Google Calendar API
   - Create OAuth 2.0 credentials (Web application type)
   - Add authorised redirect URI: `http://localhost:3000/api/google-calendar/callback`
   - Copy the Client ID and Client Secret

4. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and update:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `JWT_SECRET`: A secure random string for JWT token signing
   - `PORT`: Server port (default: 5000)
   - `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID (optional)
   - `GOOGLE_CLIENT_SECRET`: Your Google OAuth Client Secret (optional)
   - `GOOGLE_REDIRECT_URI`: OAuth callback URL (default: http://localhost:3000/api/google-calendar/callback)

5. **Run the application:**
   ```bash
   # Development mode (runs both frontend and backend)
   npm run dev

   # Or run separately:
   npm run server  # Backend on port 5000
   npm run client  # Frontend on port 3000
   ```

6. **Build for production:**
   ```bash
   npm run build
   ```

## Usage

### Getting Started
1. Register a new account or login
2. Pair with your partner using their username
3. Add your background image (optional) - use the "Change Background" button

### Managing Date Ideas
4. Start adding date ideas!
5. Check off dates as you complete them
6. Mark favourites with the star button
7. Add completed dates to "Should Do This Again" list

### Calendar & Syncing
8. Go to the Calendar page to schedule your dates
9. Create events linked to date ideas
10. Click "Sync Calendar" to set up calendar integration:
    - **Google Calendar**: Click "Connect Google Calendar" for instant sync
    - **Apple Calendar**: Copy the iCal subscription URL and add it to your calendar app
11. Events will automatically appear in your connected calendars

## Project Structure

```
twotogether/
├── src/
│   ├── client/          # React frontend
│   │   ├── components/  # React components
│   │   ├── App.tsx      # Main app component
│   │   ├── api.ts       # API client
│   │   └── types.ts     # TypeScript types
│   └── server/          # Express backend
│       ├── routes/      # API routes
│       ├── middleware/  # Auth middleware
│       └── index.ts     # Server entry point
├── database/
│   └── schema.sql       # Database schema
├── public/
│   └── index.html       # HTML template
└── webpack.config.js    # Webpack configuration
```

## Technologies Used

- **Frontend:** React, TypeScript, CSS
- **Backend:** Express.js, Node.js
- **Database:** PostgreSQL
- **Authentication:** JWT, bcrypt
- **Calendar Sync:** Google Calendar API, iCal/ICS format
- **Build Tools:** Webpack, ts-loader

## Security

- Passwords are hashed using bcrypt before storage
- JWT tokens are used for authentication
- All API routes (except auth) are protected with authentication middleware

