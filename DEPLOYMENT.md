# Kudos Inventory Management System - Deployment Guide

This guide covers multiple deployment options for the Kudos Inventory Management System.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Deployment Options](#deployment-options)
  - [Option 1: Cloud Platform (Recommended)](#option-1-cloud-platform-recommended)
  - [Option 2: Docker Deployment](#option-2-docker-deployment)
  - [Option 3: Traditional VPS](#option-3-traditional-vps)
- [Database Setup](#database-setup)
- [Post-Deployment](#post-deployment)

## Prerequisites

- Node.js 18+ and npm
- MySQL 8.0+
- Git

## Environment Configuration

### Backend Environment Variables

Create a `.env` file in the `server/` directory:

```env
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://your-frontend-domain.com
DB_HOST=your-database-host
DB_PORT=3306
DB_NAME=kudos
DB_USER=your-db-user
DB_PASS=your-db-password
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES=24h
JWT_REFRESH_EXPIRY=7d
```

### Frontend Environment Variables

Create a `.env.production` file in the `client/` directory:

```env
VITE_API_URL=https://your-backend-domain.com
```

---

## Deployment Options

### Option 1: Cloud Platform (Recommended)

This option uses modern cloud platforms for easy deployment and scaling.

#### Frontend: Vercel/Netlify

**Using Vercel:**

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy from the client directory:
```bash
cd client
vercel --prod
```

3. Configure:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. Add environment variable in Vercel dashboard:
   - `VITE_API_URL` = your backend URL

**Using Netlify:**

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Deploy:
```bash
cd client
netlify deploy --prod
```

3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`

#### Backend: Railway/Render

**Using Railway:**

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login and initialize:
```bash
railway login
cd server
railway init
```

3. Add MySQL database in Railway dashboard

4. Set environment variables in Railway dashboard (use the .env values)

5. Deploy:
```bash
railway up
```

**Using Render:**

1. Create a new Web Service on [render.com](https://render.com)
2. Connect your GitHub repository
3. Configure:
   - Build Command: `cd server && npm install && npm run build`
   - Start Command: `cd server && npm start`
   - Add environment variables from your `.env` file
4. Create a MySQL database on Render and link it

---

### Option 2: Docker Deployment

#### Using Docker Compose (Full Stack)

1. Make sure Docker and Docker Compose are installed

2. Build and run:
```bash
docker-compose up -d
```

3. The application will be available at:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000

4. View logs:
```bash
docker-compose logs -f
```

5. Stop services:
```bash
docker-compose down
```

#### Using Docker (Individual Services)

**Build Backend:**
```bash
cd server
docker build -t kudos-api .
docker run -d -p 4000:4000 --env-file .env kudos-api
```

**Build Frontend:**
```bash
cd client
docker build -t kudos-client .
docker run -d -p 3000:80 kudos-client
```

---

### Option 3: Traditional VPS (AWS EC2, DigitalOcean, etc.)

#### Initial Server Setup

1. SSH into your server:
```bash
ssh user@your-server-ip
```

2. Install dependencies:
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Install Nginx
sudo apt install -y nginx

# Install PM2 for process management
sudo npm install -g pm2
```

#### Deploy Backend

1. Clone repository:
```bash
cd /var/www
sudo git clone https://github.com/JeremyTShields/kudos-inventory.git
sudo chown -R $USER:$USER kudos-inventory
cd kudos-inventory/server
```

2. Install dependencies and build:
```bash
npm install
npm run build
```

3. Create .env file with production values

4. Start with PM2:
```bash
pm2 start dist/server.js --name kudos-api
pm2 save
pm2 startup
```

#### Deploy Frontend

1. Build the frontend:
```bash
cd /var/www/kudos-inventory/client
npm install
npm run build
```

2. Configure Nginx:
```bash
sudo nano /etc/nginx/sites-available/kudos
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/kudos-inventory/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/kudos /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Setup SSL with Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Database Setup

### Create Database and Tables

1. Connect to MySQL:
```bash
mysql -u root -p
```

2. Create database:
```sql
CREATE DATABASE kudos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'kudos_user'@'localhost' IDENTIFIED BY 'your-secure-password';
GRANT ALL PRIVILEGES ON kudos.* TO 'kudos_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

3. Run migrations (tables will be created automatically by Sequelize on first run)

4. Seed initial data:
```bash
cd server
npm run seed
```

### Default Admin Account

After seeding, you can login with:
- Email: `admin@kudos.local`
- Password: `Admin123!`

**IMPORTANT:** Change this password immediately after first login in production!

---

## Post-Deployment

### Security Checklist

- [ ] Change default admin password
- [ ] Update JWT_SECRET to a strong random value
- [ ] Configure firewall (UFW on Ubuntu):
  ```bash
  sudo ufw allow OpenSSH
  sudo ufw allow 'Nginx Full'
  sudo ufw enable
  ```
- [ ] Set up automated backups for database
- [ ] Enable HTTPS/SSL
- [ ] Review and restrict CORS_ORIGIN to only your frontend domain
- [ ] Set up monitoring (PM2 monitoring, error tracking, etc.)
- [ ] Configure database backups

### Monitoring

**PM2 Monitoring:**
```bash
pm2 monit
pm2 logs kudos-api
```

**Check application status:**
```bash
pm2 status
```

### Updates and Maintenance

**Update application:**
```bash
cd /var/www/kudos-inventory
git pull origin master

# Update backend
cd server
npm install
npm run build
pm2 restart kudos-api

# Update frontend
cd ../client
npm install
npm run build
```

### Backup Database

```bash
# Create backup
mysqldump -u kudos_user -p kudos > kudos_backup_$(date +%Y%m%d).sql

# Restore backup
mysql -u kudos_user -p kudos < kudos_backup_20250130.sql
```

---

## Troubleshooting

### Backend Issues

**Check logs:**
```bash
pm2 logs kudos-api
```

**Restart service:**
```bash
pm2 restart kudos-api
```

### Frontend Issues

**CORS errors:**
- Verify `CORS_ORIGIN` in server/.env matches your frontend domain
- Check that backend is accessible from frontend

**Build errors:**
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`
- Check Node.js version: `node --version` (should be 18+)

### Database Issues

**Connection errors:**
- Verify database credentials in .env
- Check MySQL is running: `sudo systemctl status mysql`
- Test connection: `mysql -u kudos_user -p -h localhost kudos`

**Reset database:**
```bash
mysql -u root -p
DROP DATABASE kudos;
CREATE DATABASE kudos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
cd server && npm run seed
```

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/JeremyTShields/kudos-inventory/issues
- Documentation: See project README.md

---

## Quick Reference

| Service | Development | Production |
|---------|-------------|------------|
| Frontend | http://localhost:5173 | https://your-domain.com |
| Backend API | http://localhost:4000 | https://api.your-domain.com |
| Database | localhost:3306 | your-db-host:3306 |