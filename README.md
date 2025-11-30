# Kudos Inventory Management System

A full-stack inventory management system with production tracking, material receipts, shipments, and comprehensive audit logging.

## Features

- **Inventory Management**: Track materials and products across multiple locations
- **Production Tracking**: Record production runs with BOM (Bill of Materials) support
- **Material Receipts**: Process incoming materials from suppliers
- **Product Shipments**: Ship products to customers
- **Audit Logging**: Complete audit trail of all system actions (Admin only)
- **User Management**: Role-based access control (Admin/Associate)
- **Real-time Stock Levels**: Automatic calculation based on transactions

## Tech Stack

### Backend
- Node.js with TypeScript
- Express.js
- Sequelize ORM
- PostgreSQL/MySQL
- JWT Authentication
- Bcrypt for password hashing

### Frontend
- React 18 with TypeScript
- Vite
- Axios
- CSS3

## Getting Started

### Prerequisites
- Node.js 16+
- PostgreSQL or MySQL database

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/kudos-inventory.git
cd kudos-inventory
```

2. Install server dependencies:
```bash
cd server
npm install
```

3. Install client dependencies:
```bash
cd ../client
npm install
```

4. Configure environment variables:

Create `server/.env`:
```
PORT=4000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kudos_db
DB_USER=your_db_user
DB_PASS=your_db_password
DB_DIALECT=postgres
JWT_SECRET=your-secret-key-here
JWT_EXPIRES=15m
CORS_ORIGIN=http://localhost:5173
```

Create `client/.env`:
```
VITE_API_URL=http://localhost:4000
```

5. Start the development servers:

Terminal 1 (Backend):
```bash
cd server
npm run dev
```

Terminal 2 (Frontend):
```bash
cd client
npm run dev
```

6. Access the application at `http://localhost:5173`

### Default Login Credentials
- **Admin**: admin@kudos.local / Admin123!
- **Associate**: john@kudos.local / Associate123!

## Project Structure

```
kudos-inventory/
├── server/               # Backend application
│   ├── src/
│   │   ├── controllers/ # Request handlers
│   │   ├── models/      # Database models
│   │   ├── routes/      # API routes
│   │   ├── middleware/  # Auth & validation
│   │   ├── services/    # Business logic
│   │   └── config/      # Configuration
│   ├── Dockerfile       # Backend Docker config
│   └── package.json
├── client/              # Frontend application
│   ├── src/
│   │   ├── api/        # API client
│   │   ├── components/ # Reusable components
│   │   │   ├── Login.tsx
│   │   │   ├── Navbar.tsx
│   │   │   └── views/  # Feature views
│   │   ├── types/      # TypeScript definitions
│   │   ├── App.tsx     # Main component
│   │   └── App.css     # Styles
│   ├── Dockerfile       # Frontend Docker config
│   ├── nginx.conf       # Nginx configuration
│   └── package.json
├── docker-compose.yml   # Full-stack Docker setup
├── DEPLOYMENT.md        # Deployment guide
├── QUICK_DEPLOY.md      # Quick deployment guide
└── README.md
```

## Deployment

Ready to deploy to production? See our deployment guides:

- **[QUICK_DEPLOY.md](QUICK_DEPLOY.md)** - Quick deployment guide (Docker, Cloud platforms, VPS)
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Comprehensive deployment documentation

### Quick Options:
- **Docker Compose**: `docker-compose up -d` (easiest for local/VPS)
- **Cloud Platform**: Deploy frontend to Vercel, backend to Railway (free tiers available)
- **Traditional VPS**: Ubuntu server with Nginx and PM2

## API Documentation

See [API_TESTING_WORKFLOW.md](API_TESTING_WORKFLOW.md) and [POSTMAN_GUIDE.md](POSTMAN_GUIDE.md) for detailed API documentation.

## Features in Detail

### Materials Management
- Create, view, and edit materials
- Set minimum stock levels
- Track active/inactive status

### Products Management
- Create, view, and edit products
- Define Bill of Materials (BOM)
- Link materials to products

### Inventory Tracking
- Real-time stock levels by location
- Automatic calculation from transactions
- Manual inventory adjustments (Admin only)

### Production
- Record production runs
- Automatic material consumption based on BOM
- Product creation tracking

### Receipts & Shipments
- Multi-line receipts for incoming materials
- Multi-line shipments for outgoing products
- Location-specific transactions

### Audit Log (Admin Only)
- Complete activity tracking
- User action history
- Filterable by action type and entity
- Timestamps for all operations

## License

This is a school project for educational purposes.

## Authors

- Jeremy - SCI Final Project