# Kudos API - Quick Start Guide

## ✅ Your API is Running!
- Server: **http://localhost:4000**
- Status: **ACTIVE** ✓
- Database: **kudos** (MySQL) ✓

---

## 🔐 Test Credentials

### Admin User
```
Email: admin@kudos.local
Password: Admin123!
```

### Associate User
```
Email: john@kudos.local
Password: Associate123!
```

---

## 🚀 Quick Test in Postman

### 1. Login (Get Token)
**POST** `http://localhost:4000/auth/login`

**Headers:**
- `Content-Type: application/json`

**Body (raw JSON):**
```json
{
  "email": "admin@kudos.local",
  "password": "Admin123!"
}
```

**You'll get back:**
```json
{
  "accessToken": "eyJhbGci..."
}
```
**Copy this token!** You need it for all other requests.

---

### 2. Get Materials (Test Auth)
**GET** `http://localhost:4000/materials`

**Headers:**
- `Authorization: Bearer YOUR_TOKEN_HERE`

(Replace `YOUR_TOKEN_HERE` with the actual token from step 1)

**You should see:** 4 materials (Steel, Plastic, Screws, Paint)

---

### 3. Create a Receipt (Test Transaction)
**POST** `http://localhost:4000/receipts`

**Headers:**
- `Authorization: Bearer YOUR_TOKEN_HERE`
- `Content-Type: application/json`

**Body (raw JSON):**
```json
{
  "supplierName": "Test Supplier",
  "receivedAt": "2024-11-21T10:00:00Z",
  "lines": [
    {
      "materialId": 1,
      "qty": 100,
      "locationId": 1
    }
  ]
}
```

**This receives:** 100 units of Steel (material 1) into Main Warehouse (location 1)

---

### 4. Check Inventory
**GET** `http://localhost:4000/inventory/stock`

**Headers:**
- `Authorization: Bearer YOUR_TOKEN_HERE`

**You should see:** Your 100 steel sheets in inventory!

---

## 📋 Available Data (from seed)

### Materials (ID | SKU | Name)
1. MAT-STEEL-001 - Steel Sheet 4x8 (SHEET)
2. MAT-PLASTIC-001 - ABS Plastic Pellets (KG)
3. MAT-SCREW-001 - M6 Screws (PCS)
4. MAT-PAINT-001 - Black Paint (LITER)

### Products (ID | SKU | Name)
1. PROD-WIDGET-A1 - Widget Model A1 (UNIT)
   - BOM: 2.5 KG Plastic, 8 Screws, 0.1 L Paint
2. PROD-PANEL-B2 - Control Panel B2 (UNIT)
   - BOM: 0.5 Steel Sheet, 12 Screws, 0.2 L Paint

### Locations (ID | Code)
1. MAIN - Main Warehouse
2. DOCK - Receiving Dock
3. PROD - Production Floor

---

## 📚 All API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login (get token)

### Materials
- `GET /materials` - List all materials
- `GET /materials/:id` - Get one material
- `POST /materials` - Create material
- `PUT /materials/:id` - Update material
- `DELETE /materials/:id` - Deactivate material

### Products
- `GET /products` - List all products
- `GET /products/:id` - Get product with BOM
- `POST /products` - Create product
- `PUT /products/:id` - Update product
- `DELETE /products/:id` - Deactivate product

### BOM (Bill of Materials)
- `GET /bom/product/:productId` - Get BOM for product
- `POST /bom` - Add material to product
- `PUT /bom/:id` - Update quantity
- `DELETE /bom/:id` - Remove from BOM

### Locations
- `GET /locations` - List all locations
- `POST /locations` - Create location
- `PUT /locations/:id` - Update location
- `DELETE /locations/:id` - Delete location

### Receipts (Receiving)
- `GET /receipts` - List all receipts
- `GET /receipts/:id` - Get receipt details
- `POST /receipts` - Receive materials
- `DELETE /receipts/:id` - Delete receipt

### Production
- `GET /production` - List all production runs
- `GET /production/:id` - Get run details
- `POST /production` - Run production (consumes materials, creates products)
- `DELETE /production/:id` - Delete run

### Shipments
- `GET /shipments` - List all shipments
- `GET /shipments/:id` - Get shipment details
- `POST /shipments` - Ship products
- `DELETE /shipments/:id` - Delete shipment

### Inventory & Reports
- `GET /inventory/stock` - Current stock levels
- `GET /inventory/stock/:itemType/:itemId` - Stock for specific item
- `GET /inventory/transactions` - Transaction history
- `GET /inventory/low-stock` - Materials below minimum
- `GET /inventory/user-activity` - User activity tracking

---

## 💡 Testing Tips

1. **Always login first** to get your access token
2. **Use the token** in Authorization header for all other requests
3. **Create receipts** to add materials to inventory
4. **Run production** to convert materials into products
5. **Create shipments** to ship products out
6. **Check inventory** to see real-time stock levels
7. **View transactions** to see complete audit trail

---

## 📖 Full Documentation
See [POSTMAN_GUIDE.md](./POSTMAN_GUIDE.md) for detailed examples of every endpoint.

---

## 🔄 Re-seed Database
If you want to reset to fresh test data:
```bash
cd server
npm run seed
```

---

## 🎯 Complete Test Workflow

1. Login → Get token ✓
2. Get materials → See 4 items ✓
3. Create receipt → Add 100 steel, 200 plastic ✓
4. Check stock → See materials ✓
5. Create production → Make 10 Widget A1 ✓
6. Check stock → Materials consumed, products created ✓
7. Create shipment → Ship 5 widgets ✓
8. Check stock → Products reduced ✓
9. View transactions → See complete audit trail ✓
10. Check low stock → See if materials need reorder ✓

**Your API handles all of this automatically!** 🚀
