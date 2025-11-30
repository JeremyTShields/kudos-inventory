# Kudos Inventory API - Postman Testing Guide

## Base URL
```
http://localhost:4000
```

## Test Users (from seed data)
- **Admin**: `admin@kudos.local` / `Admin123!`
- **Associate**: `john@kudos.local` / `Associate123!`

---

## 1. Authentication Flow

### 1.1 Register New User
**POST** `/auth/register`

**Body (JSON)**:
```json
{
  "name": "Test User",
  "email": "test@kudos.local",
  "password": "Test123!",
  "role": "ASSOCIATE"
}
```

**Response**:
```json
{
  "user": {
    "id": 3,
    "name": "Test User",
    "email": "test@kudos.local",
    "role": "ASSOCIATE"
  }
}
```

---

### 1.2 Login
**POST** `/auth/login`

**Body (JSON)**:
```json
{
  "email": "admin@kudos.local",
  "password": "Admin123!"
}
```

**Response**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**⚠️ IMPORTANT**: Copy the `accessToken` - you'll need it for all subsequent requests!

---

### 1.3 Set Up Authorization in Postman
For all requests below, add this header:
```
Authorization: Bearer YOUR_ACCESS_TOKEN_HERE
```

**In Postman**:
1. Go to the request's **Headers** tab
2. Add key: `Authorization`
3. Add value: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (paste your actual token after "Bearer ")

---

## 2. Materials API

### 2.1 Get All Materials
**GET** `/materials`

**Response**:
```json
[
  {
    "id": 1,
    "sku": "MAT-STEEL-001",
    "name": "Steel Sheet 4x8",
    "uom": "SHEET",
    "minStock": "50.000",
    "active": true
  }
]
```

---

### 2.2 Create Material
**POST** `/materials`

**Body (JSON)**:
```json
{
  "sku": "MAT-ALUMINUM-001",
  "name": "Aluminum Sheet 4x8",
  "uom": "SHEET",
  "minStock": 30
}
```

---

### 2.3 Update Material
**PUT** `/materials/1`

**Body (JSON)**:
```json
{
  "minStock": 75
}
```

---

### 2.4 Get Material by ID
**GET** `/materials/1`

---

## 3. Products API

### 3.1 Get All Products
**GET** `/products`

---

### 3.2 Create Product
**POST** `/products`

**Body (JSON)**:
```json
{
  "sku": "PROD-ASSEMBLY-X1",
  "name": "Assembly Model X1",
  "uom": "UNIT"
}
```

---

### 3.3 Get Product with BOM
**GET** `/products/1`

**Response** (includes BOM):
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
      "qtyPerUnit": "2.500",
      "Material": {
        "id": 2,
        "name": "ABS Plastic Pellets",
        "uom": "KG"
      }
    }
  ]
}
```

---

## 4. BOM (Bill of Materials) API

### 4.1 Get BOM for Product
**GET** `/bom/product/1`

---

### 4.2 Add Material to Product BOM
**POST** `/bom`

**Body (JSON)**:
```json
{
  "productId": 1,
  "materialId": 2,
  "qtyPerUnit": 5.5
}
```

**Note**: Each product needs 5.5 units of the material

---

### 4.3 Update BOM Item Quantity
**PUT** `/bom/1`

**Body (JSON)**:
```json
{
  "qtyPerUnit": 6.0
}
```

---

## 5. Locations API

### 5.1 Get All Locations
**GET** `/locations`

---

### 5.2 Create Location
**POST** `/locations`

**Body (JSON)**:
```json
{
  "code": "SHIP",
  "description": "Shipping Bay"
}
```

---

## 6. Receipts API (Material Receiving)

### 6.1 Create Receipt
**POST** `/receipts`

**Body (JSON)**:
```json
{
  "supplierName": "Steel Suppliers Inc",
  "receivedAt": "2024-11-20T10:00:00Z",
  "lines": [
    {
      "materialId": 1,
      "qty": 100,
      "locationId": 1
    },
    {
      "materialId": 2,
      "qty": 250,
      "locationId": 1
    }
  ]
}
```

**What this does**:
- Receives 100 sheets of Steel (material 1) to location 1
- Receives 250 KG of Plastic (material 2) to location 1
- Automatically creates MATERIAL_IN inventory transactions
- Records which user performed the receipt

---

### 6.2 Get All Receipts
**GET** `/receipts`

---

### 6.3 Get Receipt Details
**GET** `/receipts/1`

---

## 7. Production Runs API

### 7.1 Create Production Run
**POST** `/production`

**Body (JSON)**:
```json
{
  "productId": 1,
  "quantityProduced": 10,
  "locationId": 1,
  "startedAt": "2024-11-20T08:00:00Z",
  "completedAt": "2024-11-20T12:00:00Z",
  "notes": "First production run"
}
```

**What this does**:
- Produces 10 units of Widget Model A1 (product 1)
- Automatically calculates material consumption from BOM:
  - If Widget A1 BOM says it needs 2.5 KG plastic per unit
  - System will deduct 25 KG plastic (10 units × 2.5 KG)
- Creates MATERIAL_CONSUME transactions (negative qty)
- Creates PRODUCT_IN transaction (positive qty)
- Records which user ran production

---

### 7.2 Get All Production Runs
**GET** `/production`

---

## 8. Shipments API (Product Shipping)

### 8.1 Create Shipment
**POST** `/shipments`

**Body (JSON)**:
```json
{
  "customerName": "Acme Corporation",
  "shippedAt": "2024-11-20T14:00:00Z",
  "lines": [
    {
      "productId": 1,
      "qty": 5,
      "locationId": 1
    }
  ]
}
```

**What this does**:
- Ships 5 units of Widget A1 to Acme Corporation
- Creates PRODUCT_OUT inventory transaction (negative qty)
- Records which user created the shipment

---

### 8.2 Get All Shipments
**GET** `/shipments`

---

## 9. Inventory Reports API

### 9.1 Get Current Stock Levels
**GET** `/inventory/stock`

**Optional Query Parameters**:
- `?itemType=MATERIAL` - Only show materials
- `?itemType=PRODUCT` - Only show products
- `?locationId=1` - Only show stock at location 1

**Response**:
```json
[
  {
    "itemType": "MATERIAL",
    "itemId": 1,
    "locationId": 1,
    "currentStock": "100.000",
    "item": {
      "id": 1,
      "sku": "MAT-STEEL-001",
      "name": "Steel Sheet 4x8"
    },
    "location": {
      "id": 1,
      "code": "MAIN",
      "description": "Main Warehouse"
    }
  }
]
```

---

### 9.2 Get Stock for Specific Item
**GET** `/inventory/stock/MATERIAL/1`

Shows stock levels for Material ID 1 across all locations.

**GET** `/inventory/stock/PRODUCT/1`

Shows stock levels for Product ID 1 across all locations.

---

### 9.3 Get Transaction History
**GET** `/inventory/transactions`

**Optional Query Parameters**:
- `?itemType=MATERIAL`
- `?itemId=1`
- `?locationId=1`
- `?startDate=2024-11-01`
- `?endDate=2024-11-30`
- `?limit=50`

**Response**:
```json
[
  {
    "id": 1,
    "txnType": "MATERIAL_IN",
    "entityType": "RECEIPT",
    "entityId": 1,
    "itemType": "MATERIAL",
    "itemId": 1,
    "qty": "100.000",
    "locationId": 1,
    "userId": 1,
    "occurredAt": "2024-11-20T10:00:00.000Z"
  }
]
```

---

### 9.4 Get Low Stock Materials
**GET** `/inventory/low-stock`

Returns all materials where current stock is below the minimum stock level.

**Response**:
```json
[
  {
    "material": {
      "id": 3,
      "sku": "MAT-SCREW-001",
      "name": "M6 Screws",
      "minStock": "1000.000"
    },
    "currentStock": 500,
    "minStock": 1000,
    "deficit": 500
  }
]
```

---

### 9.5 Get User Activity
**GET** `/inventory/user-activity`

**Optional Query Parameters**:
- `?userId=1`
- `?startDate=2024-11-01`
- `?endDate=2024-11-30`

Shows all inventory transactions by user (for tracking associate performance).

---

## Complete Testing Workflow

### Step-by-Step Test Scenario:

1. **Login** → Get access token
2. **Get Materials** → See available materials (from seed data)
3. **Get Locations** → See warehouse locations
4. **Create Receipt** → Receive 100 steel sheets and 250 KG plastic
5. **Check Stock** → Verify materials were added
6. **Get Products** → See available products
7. **Get Product BOM** → See what materials are needed for Widget A1
8. **Create Production Run** → Produce 10 Widget A1 units
9. **Check Stock Again** → See materials consumed, products created
10. **Create Shipment** → Ship 5 widgets to customer
11. **Check Stock Again** → See products reduced
12. **Get Transaction History** → See complete audit trail
13. **Check Low Stock** → See if any materials are running low
14. **Get User Activity** → See what the current user has done

---

## Common Response Codes

- **200** - Success
- **201** - Created successfully
- **400** - Bad request (missing/invalid data)
- **401** - Unauthorized (missing or invalid token)
- **403** - Forbidden (insufficient permissions)
- **404** - Not found
- **409** - Conflict (duplicate SKU, etc.)
- **500** - Server error

---

## Tips for Postman

1. **Create Environment Variables**:
   - `baseUrl`: `http://localhost:4000`
   - `token`: (save your access token here)
   - Then use `{{baseUrl}}/materials` and `Bearer {{token}}`

2. **Collection Organization**:
   - Create folders: Auth, Materials, Products, BOM, Locations, Receipts, Production, Shipments, Inventory

3. **Tests Tab** (auto-save token):
   In the Login request, go to the **Tests** tab and add:
   ```javascript
   pm.environment.set("token", pm.response.json().accessToken);
   ```

4. **Pre-request Scripts**:
   You can auto-add the Authorization header to all requests in a collection
