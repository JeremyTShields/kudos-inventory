# Kudos Inventory API - Complete Testing Workflow

## Overview
This guide walks through testing your entire inventory management system end-to-end, simulating real warehouse operations.

---

## 🎯 Testing Scenario

**Scenario**: You're managing a small manufacturing warehouse that:
1. Receives raw materials from suppliers
2. Manufactures products from those materials
3. Ships finished products to customers
4. Tracks all inventory movements
5. Monitors which employees performed each action

---

## Phase 1: Authentication & User Management

### Test 1.1: Register a New User (Optional)
**Purpose**: Test user registration system

**Request**:
```
POST http://localhost:4000/auth/register
Content-Type: application/json

{
  "name": "Sarah Johnson",
  "email": "sarah@kudos.local",
  "password": "Sarah123!",
  "role": "ASSOCIATE"
}
```

**Expected Result**:
```json
{
  "user": {
    "id": 3,
    "name": "Sarah Johnson",
    "email": "sarah@kudos.local",
    "role": "ASSOCIATE"
  }
}
```

**What This Tests**:
- User registration works
- Email uniqueness (try registering twice - should fail)
- Password hashing (password not returned)
- Role assignment

---

### Test 1.2: Login as Admin
**Purpose**: Get authentication token for admin operations

**Request**:
```
POST http://localhost:4000/auth/login
Content-Type: application/json

{
  "email": "admin@kudos.local",
  "password": "Admin123!"
}
```

**Expected Result**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtY..."
}
```

**What This Tests**:
- Login functionality
- JWT token generation
- Credentials validation

**⚠️ SAVE THIS TOKEN!** You'll use it in all subsequent requests.

**In Postman**: Copy the `accessToken` value

---

### Test 1.3: Test Invalid Login
**Purpose**: Verify security - wrong password should fail

**Request**:
```
POST http://localhost:4000/auth/login
Content-Type: application/json

{
  "email": "admin@kudos.local",
  "password": "WrongPassword"
}
```

**Expected Result**: Should fail with 401 Unauthorized

**What This Tests**:
- Authentication security
- Error handling

---

## Phase 2: Master Data Setup

### Test 2.1: View All Locations
**Purpose**: See available warehouse locations

**Request**:
```
GET http://localhost:4000/locations
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected Result**:
```json
[
  {
    "id": 1,
    "code": "MAIN",
    "description": "Main Warehouse",
    "createdAt": "2024-11-21T02:53:18.000Z",
    "updatedAt": "2024-11-21T02:53:18.000Z"
  },
  {
    "id": 2,
    "code": "DOCK",
    "description": "Receiving Dock"
  },
  {
    "id": 3,
    "code": "PROD",
    "description": "Production Floor"
  }
]
```

**What This Tests**:
- JWT authentication (with Bearer token)
- GET endpoint functionality
- Seed data was loaded correctly

---

### Test 2.2: Create New Location
**Purpose**: Add a new warehouse area

**Request**:
```
POST http://localhost:4000/locations
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "code": "SHIP",
  "description": "Shipping Bay"
}
```

**Expected Result**:
```json
{
  "id": 4,
  "code": "SHIP",
  "description": "Shipping Bay",
  "updatedAt": "2024-11-21T...",
  "createdAt": "2024-11-21T..."
}
```

**What This Tests**:
- POST endpoint
- Data creation
- Auto-generated timestamps

---

### Test 2.3: View All Materials
**Purpose**: See raw materials in the system

**Request**:
```
GET http://localhost:4000/materials
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected Result**: 4 materials (Steel, Plastic, Screws, Paint)

**What This Tests**:
- Materials endpoint
- Seed data
- Alphabetical sorting (by name)

---

### Test 2.4: Create New Material
**Purpose**: Add a new raw material

**Request**:
```
POST http://localhost:4000/materials
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "sku": "MAT-COPPER-001",
  "name": "Copper Wire 12 AWG",
  "uom": "METER",
  "minStock": 500
}
```

**Expected Result**:
```json
{
  "id": 5,
  "sku": "MAT-COPPER-001",
  "name": "Copper Wire 12 AWG",
  "uom": "METER",
  "minStock": "500.000",
  "active": true,
  "updatedAt": "...",
  "createdAt": "..."
}
```

**What This Tests**:
- Material creation
- SKU uniqueness
- Default active status
- Decimal precision for minStock

---

### Test 2.5: Test Duplicate SKU (Should Fail)
**Purpose**: Verify SKU uniqueness constraint

**Request**:
```
POST http://localhost:4000/materials
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "sku": "MAT-COPPER-001",
  "name": "Another Copper Wire",
  "uom": "METER",
  "minStock": 100
}
```

**Expected Result**: 409 Conflict - "SKU already exists"

**What This Tests**:
- Database constraints
- Error handling
- Data integrity

---

### Test 2.6: View All Products
**Purpose**: See finished products

**Request**:
```
GET http://localhost:4000/products
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected Result**: 2 products (Widget A1, Panel B2)

---

### Test 2.7: View Product with BOM
**Purpose**: See what materials are needed for a product

**Request**:
```
GET http://localhost:4000/products/1
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected Result**:
```json
{
  "id": 1,
  "sku": "PROD-WIDGET-A1",
  "name": "Widget Model A1",
  "uom": "UNIT",
  "active": true,
  "BomItems": [
    {
      "id": 1,
      "productId": 1,
      "materialId": 2,
      "qtyPerUnit": "2.500",
      "Material": {
        "id": 2,
        "sku": "MAT-PLASTIC-001",
        "name": "ABS Plastic Pellets",
        "uom": "KG"
      }
    },
    {
      "id": 2,
      "productId": 1,
      "materialId": 3,
      "qtyPerUnit": "8.000",
      "Material": {
        "id": 3,
        "sku": "MAT-SCREW-001",
        "name": "M6 Screws",
        "uom": "PCS"
      }
    },
    {
      "id": 3,
      "productId": 1,
      "materialId": 4,
      "qtyPerUnit": "0.100",
      "Material": {
        "id": 4,
        "sku": "MAT-PAINT-001",
        "name": "Black Paint",
        "uom": "LITER"
      }
    }
  ]
}
```

**What This Tests**:
- Product-BOM relationships
- Nested includes (Sequelize associations)
- Many-to-many relationship data

**Key Information**: To make 1 Widget A1, you need:
- 2.5 KG of Plastic
- 8 Screws
- 0.1 Liters of Paint

---

## Phase 3: Inventory Operations - Receiving

### Test 3.1: Check Current Inventory (Should Be Empty)
**Purpose**: Verify starting state

**Request**:
```
GET http://localhost:4000/inventory/stock
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected Result**: `[]` (empty array - no inventory yet)

**What This Tests**:
- Inventory calculation
- Empty state handling

---

### Test 3.2: Receive Materials from Supplier
**Purpose**: Add materials to inventory

**Request**:
```
POST http://localhost:4000/receipts
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "supplierName": "ABC Steel & Materials",
  "receivedAt": "2024-11-21T08:00:00Z",
  "lines": [
    {
      "materialId": 1,
      "qty": 200,
      "locationId": 2
    },
    {
      "materialId": 2,
      "qty": 500,
      "locationId": 2
    },
    {
      "materialId": 3,
      "qty": 5000,
      "locationId": 2
    },
    {
      "materialId": 4,
      "qty": 50,
      "locationId": 2
    }
  ]
}
```

**What This Does**:
- Receives 200 Steel Sheets to DOCK (location 2)
- Receives 500 KG Plastic to DOCK
- Receives 5000 Screws to DOCK
- Receives 50 Liters Paint to DOCK
- Creates 4 inventory transactions (MATERIAL_IN)
- Records you (admin user) as the receiver

**Expected Result**: Receipt created with all lines

**What This Tests**:
- Multi-line receipt creation
- Transaction creation (atomic operation)
- User tracking
- Database transactions (all or nothing)

---

### Test 3.3: Check Inventory Again
**Purpose**: Verify materials were added

**Request**:
```
GET http://localhost:4000/inventory/stock
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected Result**: 4 items showing at location 2 (DOCK)

```json
[
  {
    "itemType": "MATERIAL",
    "itemId": 1,
    "locationId": 2,
    "currentStock": "200.000",
    "item": {
      "id": 1,
      "sku": "MAT-STEEL-001",
      "name": "Steel Sheet 4x8"
    },
    "location": {
      "id": 2,
      "code": "DOCK",
      "description": "Receiving Dock"
    }
  },
  ...
]
```

**What This Tests**:
- Inventory calculation from transactions
- Stock aggregation by location
- Data enrichment (includes item and location details)

---

### Test 3.4: View Transaction History
**Purpose**: See audit trail

**Request**:
```
GET http://localhost:4000/inventory/transactions
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected Result**: 4 transactions, all MATERIAL_IN

```json
[
  {
    "id": 4,
    "txnType": "MATERIAL_IN",
    "entityType": "RECEIPT",
    "entityId": 1,
    "itemType": "MATERIAL",
    "itemId": 4,
    "qty": "50.000",
    "locationId": 2,
    "userId": 1,
    "occurredAt": "2024-11-21T08:00:00.000Z",
    "createdAt": "...",
    "updatedAt": "..."
  },
  ...
]
```

**What This Tests**:
- Complete audit trail
- Transaction logging
- User accountability
- Timestamp tracking

---

### Test 3.5: Create Second Receipt
**Purpose**: Test multiple receipts and stock accumulation

**Request**:
```
POST http://localhost:4000/receipts
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "supplierName": "Global Plastics Co",
  "receivedAt": "2024-11-21T09:30:00Z",
  "lines": [
    {
      "materialId": 2,
      "qty": 300,
      "locationId": 1
    }
  ]
}
```

**What This Does**:
- Receives 300 KG more plastic to MAIN warehouse (location 1)

**What This Tests**:
- Multiple receipts
- Same material in different locations
- Stock aggregation across receipts

---

### Test 3.6: Check Plastic Stock Across All Locations
**Purpose**: See material distribution

**Request**:
```
GET http://localhost:4000/inventory/stock/MATERIAL/2
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected Result**:
```json
{
  "itemType": "MATERIAL",
  "item": {
    "id": 2,
    "sku": "MAT-PLASTIC-001",
    "name": "ABS Plastic Pellets",
    "uom": "KG",
    "minStock": "100.000"
  },
  "stockByLocation": [
    {
      "locationId": 2,
      "currentStock": "500.000",
      "location": {
        "id": 2,
        "code": "DOCK"
      }
    },
    {
      "locationId": 1,
      "currentStock": "300.000",
      "location": {
        "id": 1,
        "code": "MAIN"
      }
    }
  ],
  "totalStock": 800
}
```

**What This Tests**:
- Stock by item across locations
- Total stock calculation
- Location-level visibility

---

## Phase 4: Production Operations

### Test 4.1: Run Production
**Purpose**: Convert materials into products

**Request**:
```
POST http://localhost:4000/production
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "productId": 1,
  "quantityProduced": 50,
  "locationId": 1,
  "startedAt": "2024-11-21T10:00:00Z",
  "completedAt": "2024-11-21T14:00:00Z",
  "notes": "Production run for Widget A1 - first batch"
}
```

**What This Does** (Automatic Material Consumption):
- Produces 50 Widget A1 units
- **Automatically calculates** material consumption from BOM:
  - Plastic: 50 units × 2.5 KG = 125 KG consumed
  - Screws: 50 units × 8 PCS = 400 PCS consumed
  - Paint: 50 units × 0.1 L = 5 L consumed
- Creates 3 MATERIAL_CONSUME transactions (negative qty)
- Creates 1 PRODUCT_IN transaction (positive qty)
- All at location 1 (MAIN warehouse)

**Expected Result**: Production run created

**What This Tests**:
- BOM-based material consumption
- Multi-transaction creation
- Negative quantity handling
- Production tracking

---

### Test 4.2: Check Inventory After Production
**Purpose**: Verify material consumption and product creation

**Request**:
```
GET http://localhost:4000/inventory/stock?locationId=1
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected Result**:
- Plastic at MAIN: 175 KG (300 - 125 = 175)
- Screws at MAIN: Should show negative if we didn't have any there!
- Paint at MAIN: Should show negative if we didn't have any there!
- Widget A1 at MAIN: 50 units (newly created)

**What This Reveals**:
- We have a problem! We consumed materials from MAIN warehouse but we only received them at DOCK!
- This is realistic - shows inventory management challenges
- You can see negative stock (stockout situation)

---

### Test 4.3: Check Transaction History for Production
**Purpose**: See what happened during production

**Request**:
```
GET http://localhost:4000/inventory/transactions?entityType=PRODUCTION
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected Result**: 4 transactions from production run
- 3 negative (materials consumed)
- 1 positive (product created)

**What This Tests**:
- Transaction filtering
- Production audit trail
- Material consumption tracking

---

## Phase 5: Shipping Operations

### Test 5.1: Ship Products to Customer
**Purpose**: Send finished goods out

**Request**:
```
POST http://localhost:4000/shipments
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "customerName": "Acme Corporation",
  "shippedAt": "2024-11-21T15:00:00Z",
  "lines": [
    {
      "productId": 1,
      "qty": 30,
      "locationId": 1
    }
  ]
}
```

**What This Does**:
- Ships 30 Widget A1 units to Acme Corporation
- Creates PRODUCT_OUT transaction (negative qty)
- Reduces product inventory

**Expected Result**: Shipment created

**What This Tests**:
- Shipment creation
- Product reduction
- Customer tracking

---

### Test 5.2: Check Product Inventory
**Purpose**: Verify shipment reduced stock

**Request**:
```
GET http://localhost:4000/inventory/stock/PRODUCT/1
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected Result**:
- Widget A1 at MAIN: 20 units (50 - 30 = 20)

**What This Tests**:
- Product stock calculation
- Shipment impact on inventory

---

## Phase 6: Reporting & Analytics

### Test 6.1: Check Low Stock Materials
**Purpose**: Identify materials that need reordering

**Request**:
```
GET http://localhost:4000/inventory/low-stock
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected Result**: Materials below their minimum stock levels

```json
[
  {
    "material": {
      "id": 3,
      "sku": "MAT-SCREW-001",
      "name": "M6 Screws",
      "minStock": "1000.000"
    },
    "currentStock": -400,
    "minStock": 1000,
    "deficit": 1400
  }
]
```

**What This Tests**:
- Stock level monitoring
- Minimum stock threshold checking
- Reorder alerts

---

### Test 6.2: View User Activity
**Purpose**: See what the admin user has done

**Request**:
```
GET http://localhost:4000/inventory/user-activity?userId=1
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected Result**: Summary of all your transactions

**What This Tests**:
- Employee activity tracking
- Accountability
- Performance monitoring

---

### Test 6.3: Get Complete Transaction History
**Purpose**: Full audit trail

**Request**:
```
GET http://localhost:4000/inventory/transactions?limit=100
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected Result**: All transactions in chronological order

**What This Tests**:
- Complete audit trail
- Transaction history
- Compliance reporting

---

## Phase 7: Advanced Testing

### Test 7.1: Login as Associate User
**Purpose**: Test role-based access

**Request**:
```
POST http://localhost:4000/auth/login
Content-Type: application/json

{
  "email": "john@kudos.local",
  "password": "Associate123!"
}
```

**Get new token, then repeat operations**

**What This Tests**:
- Multiple user sessions
- User attribution (transactions will show userId: 2)
- Associate-level permissions

---

### Test 7.2: Create Receipt as Associate
**Purpose**: Verify associate can perform operations

**Request**: (Use same receipt format as before, but with John's token)

**Expected Result**:
- Receipt created
- Transaction shows userId: 2 (John)

**What This Tests**:
- User tracking
- Associate permissions
- Activity attribution

---

### Test 7.3: Run Second Production Run
**Purpose**: Test multiple production runs

**Request**:
```
POST http://localhost:4000/production
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "productId": 2,
  "quantityProduced": 20,
  "locationId": 1,
  "startedAt": "2024-11-21T16:00:00Z",
  "completedAt": "2024-11-21T18:00:00Z",
  "notes": "Production run for Panel B2"
}
```

**What This Does**:
- Produces 20 Control Panel B2 units
- Consumes materials based on Panel B2 BOM:
  - Steel: 20 × 0.5 = 10 sheets
  - Screws: 20 × 12 = 240 PCS
  - Paint: 20 × 0.2 = 4 L

**What This Tests**:
- Different product BOM
- Multiple production runs
- Material consumption variety

---

## 🎯 Success Criteria

After completing all tests, you should have:

### ✅ Users
- Admin user can login
- Associate user can login
- User activity is tracked

### ✅ Master Data
- Locations created and viewable
- Materials created with SKU uniqueness
- Products with BOM relationships

### ✅ Inventory Operations
- Receipts create MATERIAL_IN transactions
- Production consumes materials based on BOM
- Production creates products
- Shipments reduce product inventory

### ✅ Reporting
- Current stock calculated correctly
- Transaction history complete
- Low stock alerts working
- User activity tracked

### ✅ Data Integrity
- All transactions atomic
- No orphaned records
- Timestamps recorded
- User attribution working

---

## 🔍 Key Things to Verify

1. **Inventory Calculations Are Correct**:
   - Stock = Sum of all transactions for that item at that location
   - Positive = Additions (receipts, production)
   - Negative = Reductions (production consumption, shipments)

2. **BOM Calculations Work**:
   - Production automatically calculates material needs
   - Quantities multiply correctly
   - Multiple materials consumed per product

3. **User Tracking Works**:
   - Every transaction records userId
   - Different users show in transaction history

4. **Locations Work**:
   - Same material can be at multiple locations
   - Stock calculated per location
   - Totals aggregate correctly

5. **Audit Trail Complete**:
   - Every inventory change has a transaction
   - Transaction links to source (receipt/production/shipment)
   - Timestamps preserved

---

## 📊 Expected Final State

After running all tests, your inventory should look like:

### Materials at DOCK (Location 2):
- Steel: 200 sheets
- Plastic: 500 KG
- Screws: 5000 PCS
- Paint: 50 L

### Materials at MAIN (Location 1):
- Steel: -10 sheets (stockout!)
- Plastic: 175 KG (300 received - 125 consumed)
- Screws: -640 PCS (stockout! 0 received - 400 - 240 consumed)
- Paint: -9 L (stockout! 0 received - 5 - 4 consumed)

### Products at MAIN (Location 1):
- Widget A1: 20 units (50 produced - 30 shipped)
- Panel B2: 20 units (20 produced - 0 shipped)

### Low Stock Alerts:
- Screws (way below minimum)
- Possibly others

**This shows realistic inventory management!** You have stockouts at MAIN because you received materials at DOCK but ran production at MAIN without moving inventory.

---

## 🚀 Next Steps

After completing this testing:
1. ✅ You've verified all API endpoints work
2. ✅ You understand the data flow
3. ✅ You see the audit trail
4. ✅ You're ready to build the frontend!

The frontend will need to:
- Show inventory levels by location
- Create receipts (with multiple lines)
- Run production (showing BOM requirements)
- Create shipments
- Display low stock alerts
- Show user activity
- Display transaction history

All the backend logic is working - now you just need a UI on top of it!
