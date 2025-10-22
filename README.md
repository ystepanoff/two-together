# Two Together - Date Ideas App

A React TypeScript application for couples to manage and track date ideas together.

## Features

- 🔐 User authentication with encrypted passwords
- 📝 Add, edit, delete, and tick off date ideas
- ⭐ Mark favorite date ideas
- ✅ Track completed dates
- 💕 "Should Do This Again" list for memorable dates
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
   # Create the database and tables
   psql -U your_username -f database/schema.sql
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and update:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `JWT_SECRET`: A secure random string for JWT token signing
   - `PORT`: Server port (default: 5000)

4. **Run the application:**
   ```bash
   # Development mode (runs both frontend and backend)
   npm run dev

   # Or run separately:
   npm run server  # Backend on port 5000
   npm run client  # Frontend on port 3000
   ```

5. **Build for production:**
   ```bash
   npm run build
   ```

## Usage

1. Register a new account or login
2. Add your background image (optional) - use the "Change Background" button
3. Start adding date ideas!
4. Check off dates as you complete them
5. Mark favorites with the star button
6. Add completed dates to "Should Do This Again" list

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
- **Build Tools:** Webpack, ts-loader

## Security

- Passwords are hashed using bcrypt before storage
- JWT tokens are used for authentication
- All API routes (except auth) are protected with authentication middleware

