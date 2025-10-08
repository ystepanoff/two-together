# Deployment Guide

## Production Deployment

### Prerequisites
- Node.js installed
- PostgreSQL database set up
- Environment variables configured

### Build Steps

1. **Run the database migrations:**
   ```bash
   psql -U your_username -d twotogether -f database/schema.sql
   psql -U your_username -d twotogether -f database/migration-001-add-couples-and-voting.sql
   psql -U your_username -d twotogether -f database/migration-002-add-background-image.sql
   ```

2. **Set environment variables:**
   Create a `.env` file with:
   ```
   NODE_ENV=production
   PORT=5000
   DATABASE_URL=postgresql://username:password@localhost:5432/twotogether
   JWT_SECRET=your-secret-key-here
   CLIENT_URL=https://yourdomain.com
   ```

3. **Build the application:**
   ```bash
   npm run build
   ```

   This creates:
   - `dist/` - Contains the built React frontend (bundle.js, index.html)
   - `dist/server/` - Contains the compiled backend code

4. **Start the production server:**
   ```bash
   npm start
   ```

   The server will:
   - Serve the API on `/api/*` routes
   - Serve static frontend files from `dist/`
   - Handle React Router on all non-API routes
   - Run on the port specified in `.env` (default: 5000)

### How It Works

**Development:**
- Frontend runs on `http://localhost:3000` (webpack dev server)
- Backend runs on `http://localhost:5000`
- Webpack proxies `/api/*` requests to the backend
- CORS is configured for `localhost:3000`

**Production:**
- Everything runs on one port (e.g., 5000)
- Backend serves static files from `dist/`
- All `/api/*` requests go to Express routes
- Other requests serve `index.html` for React Router
- CORS is configured for your production domain

### Deployment Platforms

#### Deploy to a VPS (DigitalOcean, Linode, etc.)
1. SSH into your server
2. Clone the repository
3. Install dependencies: `npm install`
4. Follow build steps above
5. Use PM2 to keep the app running:
   ```bash
   npm install -g pm2
   pm2 start npm --name "twotogether" -- start
   pm2 save
   pm2 startup
   ```

#### Deploy to Heroku
1. Add `Procfile`:
   ```
   web: npm start
   ```
2. Set environment variables in Heroku dashboard
3. Add PostgreSQL addon
4. Deploy:
   ```bash
   git push heroku main
   ```

#### Deploy to Render/Railway
1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set start command: `npm start`
4. Add environment variables
5. Deploy

### Important Notes

- Make sure to update `CLIENT_URL` in your `.env` to match your production domain
- The background images are stored as base64 in the database (max 5MB per image)
- Use a strong `JWT_SECRET` in production
- Consider adding HTTPS (use a reverse proxy like nginx or Caddy)
