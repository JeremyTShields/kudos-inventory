import { Sequelize, DataTypes } from 'sequelize';

export function initModels(sequelize: Sequelize) {
  const User = sequelize.define('User', {
    id:{ type: DataTypes.INTEGER.UNSIGNED, autoIncrement:true, primaryKey:true },
    name:{ type: DataTypes.STRING(120), allowNull:false },
    email:{ type: DataTypes.STRING(180), allowNull:false, unique:true },
    passwordHash:{ type: DataTypes.STRING(255), allowNull:false },
    role:{ type: DataTypes.ENUM('ADMIN','ASSOCIATE'), allowNull:false, defaultValue:'ASSOCIATE' },
    active:{ type: DataTypes.BOOLEAN, defaultValue:true }
  }, { tableName:'users', timestamps:true });

  const Material = sequelize.define('Material', {
    id:{ type: DataTypes.INTEGER.UNSIGNED, autoIncrement:true, primaryKey:true },
    sku:{ type: DataTypes.STRING(64), unique:true, allowNull:false },
    name:{ type: DataTypes.STRING(160), allowNull:false },
    uom:{ type: DataTypes.STRING(20), allowNull:false },
    minStock:{ type: DataTypes.DECIMAL(18,3), defaultValue:0 },
    active:{ type: DataTypes.BOOLEAN, defaultValue:true }
  }, { tableName:'materials', timestamps:true });

  const Product = sequelize.define('Product', {
    id:{ type: DataTypes.INTEGER.UNSIGNED, autoIncrement:true, primaryKey:true },
    sku:{ type: DataTypes.STRING(64), unique:true, allowNull:false },
    name:{ type: DataTypes.STRING(160), allowNull:false },
    uom:{ type: DataTypes.STRING(20), allowNull:false },
    active:{ type: DataTypes.BOOLEAN, defaultValue:true }
  }, { tableName:'products', timestamps:true });

  const BomItem = sequelize.define('BomItem', {
    id:{ type: DataTypes.INTEGER.UNSIGNED, autoIncrement:true, primaryKey:true },
    productId:{ type: DataTypes.INTEGER.UNSIGNED, allowNull:false },
    materialId:{ type: DataTypes.INTEGER.UNSIGNED, allowNull:false },
    qtyPerUnit:{ type: DataTypes.DECIMAL(18,3), allowNull:false }
  }, { tableName:'bom_items', timestamps:true });

  // BOM relationships
  BomItem.belongsTo(Product, { foreignKey:'productId' });
  BomItem.belongsTo(Material, { foreignKey:'materialId' });
  Product.hasMany(BomItem, { foreignKey:'productId' });

  const Location = sequelize.define('Location', {
    id:{ type: DataTypes.INTEGER.UNSIGNED, autoIncrement:true, primaryKey:true },
    code:{ type: DataTypes.STRING(32), unique:true, allowNull:false },
    description:{ type: DataTypes.STRING(200) }
  }, { tableName:'locations', timestamps:true });

  const Receipt = sequelize.define('Receipt', {
    id:{ type: DataTypes.INTEGER.UNSIGNED, autoIncrement:true, primaryKey:true },
    supplierName:{ type: DataTypes.STRING(160), allowNull:false },
    userId:{ type: DataTypes.INTEGER.UNSIGNED, allowNull:false },
    receivedAt:{ type: DataTypes.DATE, allowNull:false }
  }, { tableName:'receipts', timestamps:true });

  const ReceiptLine = sequelize.define('ReceiptLine', {
    id:{ type: DataTypes.INTEGER.UNSIGNED, autoIncrement:true, primaryKey:true },
    receiptId:{ type: DataTypes.INTEGER.UNSIGNED, allowNull:false },
    materialId:{ type: DataTypes.INTEGER.UNSIGNED, allowNull:false },
    qty:{ type: DataTypes.DECIMAL(18,3), allowNull:false },
    locationId:{ type: DataTypes.INTEGER.UNSIGNED, allowNull:false }
  }, { tableName:'receipt_lines', timestamps:true });

  // Receipt relationships
  Receipt.hasMany(ReceiptLine, { foreignKey:'receiptId' });
  ReceiptLine.belongsTo(Material, { foreignKey:'materialId' });
  ReceiptLine.belongsTo(Location, { foreignKey:'locationId' });

  const ProductionRun = sequelize.define('ProductionRun', {
    id:{ type: DataTypes.INTEGER.UNSIGNED, autoIncrement:true, primaryKey:true },
    productId:{ type: DataTypes.INTEGER.UNSIGNED, allowNull:false },
    quantityProduced:{ type: DataTypes.DECIMAL(18,3), allowNull:false },
    userId:{ type: DataTypes.INTEGER.UNSIGNED, allowNull:false },
    startedAt:{ type: DataTypes.DATE, allowNull:false },
    completedAt:{ type: DataTypes.DATE, allowNull:false },
    notes:{ type: DataTypes.TEXT }
  }, { tableName:'production_runs', timestamps:true });

  // Production relationships
  ProductionRun.belongsTo(Product, { foreignKey:'productId' });

  const Shipment = sequelize.define('Shipment', {
    id:{ type: DataTypes.INTEGER.UNSIGNED, autoIncrement:true, primaryKey:true },
    customerName:{ type: DataTypes.STRING(160), allowNull:false },
    userId:{ type: DataTypes.INTEGER.UNSIGNED, allowNull:false },
    shippedAt:{ type: DataTypes.DATE, allowNull:false }
  }, { tableName:'shipments', timestamps:true });

  const ShipmentLine = sequelize.define('ShipmentLine', {
    id:{ type: DataTypes.INTEGER.UNSIGNED, autoIncrement:true, primaryKey:true },
    shipmentId:{ type: DataTypes.INTEGER.UNSIGNED, allowNull:false },
    productId:{ type: DataTypes.INTEGER.UNSIGNED, allowNull:false },
    qty:{ type: DataTypes.DECIMAL(18,3), allowNull:false },
    locationId:{ type: DataTypes.INTEGER.UNSIGNED, allowNull:false }
  }, { tableName:'shipment_lines', timestamps:true });

  // Shipment relationships
  Shipment.hasMany(ShipmentLine, { foreignKey:'shipmentId' });
  ShipmentLine.belongsTo(Product, { foreignKey:'productId' });
  ShipmentLine.belongsTo(Location, { foreignKey:'locationId' });

  const InventoryTxn = sequelize.define('InventoryTxn', {
    id:{ type: DataTypes.INTEGER.UNSIGNED, autoIncrement:true, primaryKey:true },
    txnType:{ type: DataTypes.ENUM('MATERIAL_IN','MATERIAL_CONSUME','PRODUCT_IN','PRODUCT_OUT','ADJUST','TRANSFER_IN','TRANSFER_OUT'), allowNull:false },
    entityType:{ type: DataTypes.ENUM('RECEIPT','PRODUCTION','SHIPMENT','MANUAL','TRANSFER'), allowNull:false },
    entityId:{ type: DataTypes.INTEGER.UNSIGNED, allowNull:false },
    itemType:{ type: DataTypes.ENUM('MATERIAL','PRODUCT'), allowNull:false },
    itemId:{ type: DataTypes.INTEGER.UNSIGNED, allowNull:false },
    qty:{ type: DataTypes.DECIMAL(18,3), allowNull:false },
    locationId:{ type: DataTypes.INTEGER.UNSIGNED, allowNull:false },
    userId:{ type: DataTypes.INTEGER.UNSIGNED, allowNull:false },
    occurredAt:{ type: DataTypes.DATE, allowNull:false }
  }, { tableName:'inventory_txns', timestamps:true });

  const RefreshToken = sequelize.define('RefreshToken', {
    id:{ type: DataTypes.INTEGER.UNSIGNED, autoIncrement:true, primaryKey:true },
    userId:{ type: DataTypes.INTEGER.UNSIGNED, allowNull:false },
    token:{ type: DataTypes.STRING(512), allowNull:false },
    expiresAt:{ type: DataTypes.DATE, allowNull:false },
    revokedAt:{ type: DataTypes.DATE }
  }, { tableName:'refresh_tokens', timestamps:true });

  const AuditLog = sequelize.define('AuditLog', {
    id:{ type: DataTypes.INTEGER.UNSIGNED, autoIncrement:true, primaryKey:true },
    userId:{ type: DataTypes.INTEGER.UNSIGNED, allowNull:false },
    action:{ type: DataTypes.ENUM('CREATE','UPDATE','DELETE','LOGIN','LOGOUT'), allowNull:false },
    entityType:{ type: DataTypes.ENUM('USER','MATERIAL','PRODUCT','LOCATION','RECEIPT','PRODUCTION','SHIPMENT','INVENTORY_ADJUSTMENT','PURCHASE_ORDER','TRANSFER','WORK_STATION','OPERATION'), allowNull:false },
    entityId:{ type: DataTypes.INTEGER.UNSIGNED },
    description:{ type: DataTypes.TEXT, allowNull:false },
    metadata:{ type: DataTypes.JSON }
  }, { tableName:'audit_logs', timestamps:true });

  // Audit log relationships
  AuditLog.belongsTo(User, { foreignKey:'userId' });

  const PurchaseOrder = sequelize.define('PurchaseOrder', {
    id:{ type: DataTypes.INTEGER.UNSIGNED, autoIncrement:true, primaryKey:true },
    supplierName:{ type: DataTypes.STRING(160), allowNull:false },
    status:{ type: DataTypes.ENUM('OPEN','RECEIVED','CANCELLED'), allowNull:false, defaultValue:'OPEN' },
    orderedAt:{ type: DataTypes.DATE, allowNull:false },
    notes:{ type: DataTypes.TEXT },
    userId:{ type: DataTypes.INTEGER.UNSIGNED, allowNull:false }
  }, { tableName:'purchase_orders', timestamps:true });

  const PurchaseOrderLine = sequelize.define('PurchaseOrderLine', {
    id:{ type: DataTypes.INTEGER.UNSIGNED, autoIncrement:true, primaryKey:true },
    purchaseOrderId:{ type: DataTypes.INTEGER.UNSIGNED, allowNull:false },
    materialId:{ type: DataTypes.INTEGER.UNSIGNED, allowNull:false },
    qty:{ type: DataTypes.DECIMAL(18,3), allowNull:false }
  }, { tableName:'purchase_order_lines', timestamps:true });

  // Purchase order relationships
  PurchaseOrder.hasMany(PurchaseOrderLine, { foreignKey:'purchaseOrderId' });
  PurchaseOrderLine.belongsTo(Material, { foreignKey:'materialId' });

  const Transfer = sequelize.define('Transfer', {
    id:{ type: DataTypes.INTEGER.UNSIGNED, autoIncrement:true, primaryKey:true },
    userId:{ type: DataTypes.INTEGER.UNSIGNED, allowNull:false },
    transferredAt:{ type: DataTypes.DATE, allowNull:false },
    notes:{ type: DataTypes.TEXT }
  }, { tableName:'transfers', timestamps:true });

  const TransferLine = sequelize.define('TransferLine', {
    id:{ type: DataTypes.INTEGER.UNSIGNED, autoIncrement:true, primaryKey:true },
    transferId:{ type: DataTypes.INTEGER.UNSIGNED, allowNull:false },
    itemType:{ type: DataTypes.ENUM('MATERIAL','PRODUCT'), allowNull:false },
    itemId:{ type: DataTypes.INTEGER.UNSIGNED, allowNull:false },
    qty:{ type: DataTypes.DECIMAL(18,3), allowNull:false },
    fromLocationId:{ type: DataTypes.INTEGER.UNSIGNED, allowNull:false },
    toLocationId:{ type: DataTypes.INTEGER.UNSIGNED, allowNull:false }
  }, { tableName:'transfer_lines', timestamps:true });

  // Transfer relationships
  Transfer.hasMany(TransferLine, { foreignKey:'transferId' });
  TransferLine.belongsTo(Location, { foreignKey:'fromLocationId', as:'FromLocation' });
  TransferLine.belongsTo(Location, { foreignKey:'toLocationId', as:'ToLocation' });

  const WorkStation = sequelize.define('WorkStation', {
    id:{ type: DataTypes.INTEGER.UNSIGNED, autoIncrement:true, primaryKey:true },
    code:{ type: DataTypes.STRING(32), unique:true, allowNull:false },
    name:{ type: DataTypes.STRING(160), allowNull:false },
    description:{ type: DataTypes.STRING(200) },
    active:{ type: DataTypes.BOOLEAN, defaultValue:true }
  }, { tableName:'work_stations', timestamps:true });

  const Operation = sequelize.define('Operation', {
    id:{ type: DataTypes.INTEGER.UNSIGNED, autoIncrement:true, primaryKey:true },
    code:{ type: DataTypes.STRING(32), unique:true, allowNull:false },
    name:{ type: DataTypes.STRING(160), allowNull:false },
    description:{ type: DataTypes.STRING(200) },
    workStationId:{ type: DataTypes.INTEGER.UNSIGNED },
    active:{ type: DataTypes.BOOLEAN, defaultValue:true }
  }, { tableName:'operations', timestamps:true });

  // Operation relationships
  Operation.belongsTo(WorkStation, { foreignKey:'workStationId' });
  WorkStation.hasMany(Operation, { foreignKey:'workStationId' });

  Object.assign(sequelize.models, {
    User, Material, Product, BomItem, Location, Receipt, ReceiptLine,
    ProductionRun, Shipment, ShipmentLine, InventoryTxn, RefreshToken, AuditLog,
    PurchaseOrder, PurchaseOrderLine, Transfer, TransferLine, WorkStation, Operation
  });
}
