# Quick Deployment Guide

This is a simplified guide to get Kudos deployed quickly. For detailed instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Fastest Way: Docker Compose

### Prerequisites
- Docker and Docker Compose installed
- Port 3000, 4000, and 3306 available

### Steps

1. **Clone the repository**
```bash
git clone https://github.com/JeremyTShields/kudos-inventory.git
cd kudos-inventory
```

2. **Create environment file**
```bash
cp .env.example .env
```

Edit `.env` and update the passwords:
```env
DB_ROOT_PASSWORD=your-secure-root-password
DB_PASS=your-secure-password
JWT_SECRET=your-super-secret-jwt-key
```

3. **Start everything**
```bash
docker-compose up -d
```

4. **Wait for database to initialize** (about 30 seconds)
```bash
docker-compose logs -f database
# Wait until you see "ready for connections"
```

5. **Seed the database**
```bash
docker-compose exec backend npm run seed
```

6. **Access the application**
- Open http://localhost:3000
- Login with:
  - Email: `admin@kudos.local`
  - Password: `Admin123!`

### Manage the Deployment

**View logs:**
```bash
docker-compose logs -f
```

**Stop services:**
```bash
docker-compose down
```

**Restart after code changes:**
```bash
docker-compose down
docker-compose up -d --build
```

---

## Cloud Platform Deployment (Easiest for Production)

### Recommended Stack
- **Frontend:** Vercel or Netlify (Free tier available)
- **Backend:** Railway or Render (Free tier available)
- **Database:** Included with Railway/Render or use PlanetScale

### 1. Deploy Backend on Railway

1. Go to [railway.app](https://railway.app) and sign up
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `kudos-inventory` repository
4. Add a MySQL database from Railway's database menu
5. Add these environment variables in Railway dashboard:
   ```
   NODE_ENV=production
   PORT=4000
   JWT_SECRET=your-super-secret-key
   JWT_EXPIRES=24h
   JWT_REFRESH_EXPIRY=7d
   CORS_ORIGIN=https://your-frontend-domain.vercel.app
   ```
   The database variables (DB_HOST, DB_PORT, etc.) will be automatically set by Railway
6. Set the root directory to `server`
7. The build command: `npm install && npm run build`
8. The start command: `npm start`
9. Copy your Railway backend URL (e.g., `https://kudos-api.railway.app`)

### 2. Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) and sign up
2. Click "New Project" → Import your repository
3. Configure:
   - Framework Preset: Vite
   - Root Directory: `client`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add environment variable:
   ```
   VITE_API_URL=https://your-backend-url.railway.app
   ```
5. Deploy!

### 3. Seed the Database

Use Railway's CLI or web terminal:
```bash
npm run seed
```

Your app is now live!

---

## Traditional Server (VPS) - Quick Version

### Prerequisites
- Ubuntu 20.04+ server
- Root or sudo access
- Domain name (optional but recommended)

### One-Command Setup Script

Run this on your server:

```bash
curl -fsSL https://raw.githubusercontent.com/JeremyTShields/kudos-inventory/master/scripts/deploy.sh | bash
```

Or manually:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Install PM2
sudo npm install -g pm2

# Clone repository
cd /var/www
sudo git clone https://github.com/JeremyTShields/kudos-inventory.git
cd kudos-inventory

# Setup backend
cd server
npm install
npm run build
cp .env.example .env
# Edit .env with your database credentials
pm2 start dist/server.js --name kudos-api

# Setup frontend
cd ../client
npm install
npm run build

# Install and configure Nginx
sudo apt install -y nginx
sudo cp ../scripts/nginx.conf /etc/nginx/sites-available/kudos
sudo ln -s /etc/nginx/sites-available/kudos /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Setup database
mysql -u root -p < scripts/init-db.sql
cd ../server
npm run seed

# Save PM2 config
pm2 save
pm2 startup
```

Access your app at `http://your-server-ip`

---

## Troubleshooting

### Docker Issues

**Port already in use:**
```bash
docker-compose down
# Or change ports in docker-compose.yml
```

**Database connection failed:**
```bash
# Check if database is ready
docker-compose logs database
# Restart backend
docker-compose restart backend
```

### Cloud Platform Issues

**Build fails:**
- Check Node.js version is 18+
- Verify build commands are correct
- Check environment variables are set

**CORS errors:**
- Update `CORS_ORIGIN` in backend to match your frontend URL
- Include the protocol (https://) in the origin

**Database connection fails:**
- Verify database credentials
- Check if database service is running
- Ensure database URL is correctly formatted

### Quick Health Checks

**Test backend:**
```bash
curl http://localhost:4000/health
# Should return: {"ok":true}
```

**Test database connection:**
```bash
# For Docker:
docker-compose exec database mysql -u kudos_user -p kudos

# For local:
mysql -u kudos_user -p kudos
```

**Check logs:**
```bash
# Docker:
docker-compose logs backend

# PM2:
pm2 logs kudos-api

# Railway/Render:
# Use their web dashboard to view logs
```

---

## Next Steps

1. Change the default admin password immediately
2. Set up SSL/HTTPS (use Certbot for VPS, automatic on Vercel/Railway)
3. Configure automated backups
4. Set up monitoring and alerts
5. Review security settings

For detailed instructions, troubleshooting, and advanced configuration, see [DEPLOYMENT.md](DEPLOYMENT.md).