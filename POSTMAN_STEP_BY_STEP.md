# Kudos API - Postman Step-by-Step Testing Guide

## 🚀 Getting Started with Postman

### Step 0: Open Postman
1. Launch Postman application
2. Create a new Collection called "Kudos Inventory API"
3. We'll organize requests into folders

---

## 📁 Collection Structure

Create these folders in your collection:
- 1. Authentication
- 2. Materials
- 3. Products
- 4. BOM
- 5. Locations
- 6. Receipts
- 7. Production
- 8. Shipments
- 9. Inventory & Reports

---

## ⚙️ Setting Up Environment (Recommended)

### Create Environment Variables:

1. Click on "Environments" in left sidebar
2. Click "+" to create new environment
3. Name it "Kudos Local"
4. Add these variables:

| Variable | Initial Value | Current Value |
|----------|--------------|---------------|
| baseUrl | http://localhost:4000 | http://localhost:4000 |
| token | (leave empty) | (will auto-fill) |

5. Save and select "Kudos Local" from environment dropdown

**Benefits**:
- Use `{{baseUrl}}` instead of typing full URL
- Auto-save token after login

---

## 🔐 Test 1: Login and Get Token

### Step 1.1: Create Login Request

1. **In folder "1. Authentication"**, click "Add request"
2. Name it: `Login - Admin`
3. Set method to: **POST**
4. URL: `{{baseUrl}}/auth/login`
   - Or: `http://localhost:4000/auth/login` (if not using variables)

### Step 1.2: Set Headers

1. Click **Headers** tab
2. Add header:
   - Key: `Content-Type`
   - Value: `application/json`

### Step 1.3: Set Body

1. Click **Body** tab
2. Select **raw**
3. Select **JSON** from dropdown (right side)
4. Enter:
```json
{
  "email": "admin@kudos.local",
  "password": "Admin123!"
}
```

### Step 1.4: Add Auto-Save Token Script (Optional but Recommended)

1. Click **Tests** tab
2. Add this code:
```javascript
// Auto-save the access token to environment
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("token", response.accessToken);
    console.log("Token saved:", response.accessToken);
}
```

### Step 1.5: Send Request

1. Click **Send** button
2. Check response at bottom:

**Expected Response (200 OK)**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Step 1.6: Copy Token

**If you used the Tests script**: Token is auto-saved to environment ✓

**If you didn't**:
1. Copy the `accessToken` value (everything between the quotes)
2. Store it somewhere - you'll need it for every other request

---

## 🔑 Setting Up Authorization for Other Requests

### Option A: Using Environment Variable (If You Set It Up)

For every request after login:
1. Go to **Authorization** tab
2. Type: Select **Bearer Token**
3. Token: Enter `{{token}}`

### Option B: Manual Token (If No Environment)

For every request after login:
1. Go to **Headers** tab
2. Add header:
   - Key: `Authorization`
   - Value: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (paste your actual token after "Bearer ")

**Note**: There must be a space between "Bearer" and the token!

---

## 📦 Test 2: View Materials

### Step 2.1: Create Request

1. In folder "2. Materials", add request
2. Name: `Get All Materials`
3. Method: **GET**
4. URL: `{{baseUrl}}/materials`

### Step 2.2: Set Authorization

- Authorization tab → Bearer Token → `{{token}}`
- Or Headers tab → Add `Authorization: Bearer YOUR_TOKEN`

### Step 2.3: Send

Click **Send**

**Expected Response (200 OK)**:
```json
[
  {
    "id": 1,
    "sku": "MAT-STEEL-001",
    "name": "Steel Sheet 4x8",
    "uom": "SHEET",
    "minStock": "50.000",
    "active": true,
    "createdAt": "2024-11-21T02:53:18.000Z",
    "updatedAt": "2024-11-21T02:53:18.000Z"
  },
  ... 3 more materials
]
```

**What You Should See**:
- 4 materials from seed data
- All fields populated
- Timestamps present

---

## ➕ Test 3: Create a Material

### Step 3.1: Create Request

1. In folder "2. Materials", add request
2. Name: `Create Material`
3. Method: **POST**
4. URL: `{{baseUrl}}/materials`

### Step 3.2: Set Authorization & Headers

- Authorization: Bearer Token → `{{token}}`
- Headers tab:
  - `Content-Type: application/json`

### Step 3.3: Set Body

1. Body tab → raw → JSON
2. Enter:
```json
{
  "sku": "MAT-COPPER-001",
  "name": "Copper Wire 12 AWG",
  "uom": "METER",
  "minStock": 500
}
```

### Step 3.4: Send

**Expected Response (201 Created)**:
```json
{
  "id": 5,
  "sku": "MAT-COPPER-001",
  "name": "Copper Wire 12 AWG",
  "uom": "METER",
  "minStock": "500.000",
  "active": true,
  "updatedAt": "2024-11-21T...",
  "createdAt": "2024-11-21T..."
}
```

### Step 3.5: Verify

Go back to "Get All Materials" and Send again - you should now see 5 materials!

---

## 📍 Test 4: View Locations

### Step 4.1: Create Request

1. In folder "5. Locations", add request
2. Name: `Get All Locations`
3. Method: **GET**
4. URL: `{{baseUrl}}/locations`
5. Authorization: Bearer Token → `{{token}}`

### Step 4.2: Send

**Expected Response**: 3 locations (MAIN, DOCK, PROD)

---

## 📥 Test 5: Create Receipt (Receive Materials)

This is a **complex request** - it receives multiple materials at once.

### Step 5.1: Create Request

1. In folder "6. Receipts", add request
2. Name: `Create Receipt - Bulk Receive`
3. Method: **POST**
4. URL: `{{baseUrl}}/receipts`

### Step 5.2: Set Authorization & Headers

- Authorization: Bearer Token → `{{token}}`
- Headers: `Content-Type: application/json`

### Step 5.3: Set Body

Body → raw → JSON:
```json
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

**What This Means**:
- Receiving from supplier "ABC Steel & Materials"
- 4 different materials
- All going to location 2 (DOCK)
- Receipt timestamp: Nov 21, 2024 at 8:00 AM

### Step 5.4: Send

**Expected Response (201 Created)**: Full receipt with all lines

### Step 5.5: What Happened Behind the Scenes?

The API automatically:
1. Created 1 Receipt record
2. Created 4 ReceiptLine records
3. Created 4 InventoryTxn records (MATERIAL_IN)
4. Recorded your user ID as the receiver

---

## 📊 Test 6: Check Inventory

### Step 6.1: Create Request

1. In folder "9. Inventory & Reports", add request
2. Name: `Get Current Stock`
3. Method: **GET**
4. URL: `{{baseUrl}}/inventory/stock`
5. Authorization: Bearer Token → `{{token}}`

### Step 6.2: Send

**Expected Response**: 4 items showing stock at location 2 (DOCK)

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
      "name": "Steel Sheet 4x8",
      "uom": "SHEET"
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

**Verify**:
- Steel: 200 sheets ✓
- Plastic: 500 KG ✓
- Screws: 5000 PCS ✓
- Paint: 50 L ✓

---

## 🏭 Test 7: Run Production

This is where it gets interesting - the system automatically calculates material consumption!

### Step 7.1: View Product BOM First

1. Create request: `Get Product with BOM`
2. Method: **GET**
3. URL: `{{baseUrl}}/products/1`
4. Authorization: Bearer Token → `{{token}}`
5. Send

**Look at the BOM**: Widget A1 needs:
- 2.5 KG Plastic per unit
- 8 Screws per unit
- 0.1 L Paint per unit

### Step 7.2: Create Production Request

1. In folder "7. Production", add request
2. Name: `Run Production - Widget A1`
3. Method: **POST**
4. URL: `{{baseUrl}}/production`

### Step 7.3: Set Authorization & Headers

- Authorization: Bearer Token → `{{token}}`
- Headers: `Content-Type: application/json`

### Step 7.4: Set Body

Body → raw → JSON:
```json
{
  "productId": 1,
  "quantityProduced": 50,
  "locationId": 2,
  "startedAt": "2024-11-21T10:00:00Z",
  "completedAt": "2024-11-21T14:00:00Z",
  "notes": "First production batch of Widget A1"
}
```

**What This Means**:
- Making 50 Widget A1 units
- At location 2 (DOCK)
- Production took 4 hours (10 AM to 2 PM)

### Step 7.5: Send

**Expected Response (201 Created)**: Production run created

### Step 7.6: What Happened Automatically?

The system calculated:
- Plastic consumed: 50 × 2.5 = **125 KG**
- Screws consumed: 50 × 8 = **400 PCS**
- Paint consumed: 50 × 0.1 = **5 L**

And created 4 transactions:
- 3 negative (material consumption)
- 1 positive (product creation: +50 Widget A1)

---

## 📦 Test 8: Verify Production Impact

### Step 8.1: Check Stock Again

1. Go to your "Get Current Stock" request
2. Send again

**Expected Changes**:
- Plastic at DOCK: 375 KG (was 500, now 500 - 125 = 375) ✓
- Screws at DOCK: 4600 PCS (was 5000, now 5000 - 400 = 4600) ✓
- Paint at DOCK: 45 L (was 50, now 50 - 5 = 45) ✓
- **NEW**: Widget A1 at DOCK: 50 units ✓

### Step 8.2: View Transactions

1. Create request: `Get Transaction History`
2. Method: **GET**
3. URL: `{{baseUrl}}/inventory/transactions`
4. Authorization: Bearer Token → `{{token}}`
5. Send

**You should see**: 8 transactions total
- 4 from receipt (MATERIAL_IN)
- 4 from production (3 MATERIAL_CONSUME, 1 PRODUCT_IN)

---

## 🚚 Test 9: Ship Products

### Step 9.1: Create Shipment Request

1. In folder "8. Shipments", add request
2. Name: `Create Shipment`
3. Method: **POST**
4. URL: `{{baseUrl}}/shipments`
5. Authorization & Headers as usual

### Step 9.2: Set Body

Body → raw → JSON:
```json
{
  "customerName": "Acme Corporation",
  "shippedAt": "2024-11-21T15:00:00Z",
  "lines": [
    {
      "productId": 1,
      "qty": 30,
      "locationId": 2
    }
  ]
}
```

**What This Means**:
- Shipping 30 Widget A1 units to Acme Corporation
- From location 2 (DOCK)

### Step 9.3: Send

**Expected Response (201 Created)**: Shipment created

### Step 9.4: Verify

Check stock again - Widget A1 should now show 20 units (50 - 30 = 20) ✓

---

## 📈 Test 10: View Reports

### Test 10.1: Stock for Specific Item

1. Create request: `Get Stock for Widget A1`
2. Method: **GET**
3. URL: `{{baseUrl}}/inventory/stock/PRODUCT/1`
4. Authorization: Bearer Token
5. Send

**Response Shows**:
- Total stock across all locations
- Breakdown by location
- Item details

### Test 10.2: Low Stock Alert

1. Create request: `Get Low Stock Materials`
2. Method: **GET**
3. URL: `{{baseUrl}}/inventory/low-stock`
4. Send

**Expected**: Currently all materials above minimum, so empty array `[]`

**To Test Low Stock**:
- Run more production to consume materials below minimum
- Or update material minStock values higher

### Test 10.3: User Activity

1. Create request: `Get My Activity`
2. Method: **GET**
3. URL: `{{baseUrl}}/inventory/user-activity?userId=1`
4. Send

**Response Shows**:
- All transactions you performed
- Grouped by transaction type
- Total count

---

## 🎯 Complete Testing Checklist

After following this guide, verify:

### ✅ Authentication
- [ ] Login works
- [ ] Token is saved/copied
- [ ] Token works in other requests

### ✅ Materials
- [ ] Can view all materials (4 from seed)
- [ ] Can create new material
- [ ] Can't create duplicate SKU (test this!)

### ✅ Products & BOM
- [ ] Can view all products
- [ ] Can view product with BOM
- [ ] BOM shows material requirements

### ✅ Locations
- [ ] Can view all locations (3 from seed)
- [ ] Can create new location

### ✅ Receipts
- [ ] Can create receipt with multiple lines
- [ ] Materials appear in inventory
- [ ] Transactions created automatically

### ✅ Production
- [ ] Can run production
- [ ] Materials consumed automatically (based on BOM)
- [ ] Products created in inventory
- [ ] Stock levels updated correctly

### ✅ Shipments
- [ ] Can create shipment
- [ ] Products reduced from inventory
- [ ] Customer name recorded

### ✅ Inventory Reports
- [ ] Current stock shows correct levels
- [ ] Stock by item works
- [ ] Transaction history complete
- [ ] Low stock detection works
- [ ] User activity tracked

---

## 💡 Postman Pro Tips

### Organize Requests
- Use folders to group related endpoints
- Name requests clearly
- Add descriptions to requests

### Use Tests Tab
Auto-verify responses:
```javascript
// Check status code
pm.test("Status is 200", function () {
    pm.response.to.have.status(200);
});

// Check response has data
pm.test("Response has data", function () {
    const response = pm.response.json();
    pm.expect(response).to.be.an('array');
    pm.expect(response.length).to.be.greaterThan(0);
});
```

### Save Example Responses
After getting a successful response:
1. Click "Save Response"
2. Click "Save as example"
3. Name it "Success - 200"

Now you can see expected responses without hitting the API!

### Use Collection Variables
For IDs you'll reuse:
```javascript
// In Tests tab after creating material:
const response = pm.response.json();
pm.collectionVariables.set("materialId", response.id);

// Then use {{materialId}} in other requests
```

### Duplicate & Modify
- Right-click request → Duplicate
- Modify for similar operations
- Example: "Create Material - Steel" → Duplicate → "Create Material - Aluminum"

---

## 🐛 Common Issues & Solutions

### "Unauthorized" (401)
**Problem**: Token missing or expired

**Solution**:
1. Check Authorization header
2. Re-login to get fresh token
3. Tokens expire after 15 minutes

### "Forbidden" (403)
**Problem**: Wrong user role

**Solution**: Some operations might require ADMIN role (currently all endpoints allow both)

### "Not Found" (404)
**Problem**: Wrong ID in URL

**Solution**:
1. Check the ID exists (e.g., /materials/999 if only 5 materials exist)
2. Use "Get All" endpoints to see valid IDs

### "Conflict" (409)
**Problem**: Duplicate SKU

**Solution**:
1. Use unique SKU
2. Or update existing material instead

### "Bad Request" (400)
**Problem**: Missing required fields

**Solution**:
1. Check request body
2. Ensure all required fields present
3. Check JSON syntax (use Beautify button)

### Request Hangs
**Problem**: Server not running

**Solution**:
1. Check server terminal
2. Should see "DB connected" and "API on :4000"
3. Restart with `cd server && npm run dev`

---

## 🎬 Quick Start Sequence

If you just want to see it work ASAP:

1. **Login** → Save token
2. **Get Materials** → See 4 materials
3. **Create Receipt** → Receive 200 steel, 500 plastic, 5000 screws, 50 paint
4. **Check Stock** → See materials in inventory
5. **Run Production** → Make 50 Widget A1
6. **Check Stock** → See materials consumed, products created
7. **Create Shipment** → Ship 30 widgets
8. **Check Stock** → See products reduced
9. **Get Transactions** → See complete audit trail

**Time**: ~10 minutes to test full workflow!

---

## 📚 Next Steps

After mastering Postman testing:
1. ✅ You understand all endpoints
2. ✅ You see how data flows
3. ✅ You know what the frontend needs to display
4. ✅ You're ready to build the React UI!

The frontend will basically be a nice UI for these same operations you're doing in Postman!
