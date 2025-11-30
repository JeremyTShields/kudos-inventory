import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import materialRoutes from './routes/material.routes';
import productRoutes from './routes/product.routes';
import bomRoutes from './routes/bom.routes';
import locationRoutes from './routes/location.routes';
import receiptRoutes from './routes/receipt.routes';
import productionRoutes from './routes/production.routes';
import shipmentRoutes from './routes/shipment.routes';
import inventoryRoutes from './routes/inventory.routes';
import auditLogRoutes from './routes/auditLog.routes';
dotenv.config();

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || true, credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());

// Routes
app.get('/health', (_req,res)=>res.json({ok:true}));
app.use('/auth', authRoutes);
app.use('/materials', materialRoutes);
app.use('/products', productRoutes);
app.use('/bom', bomRoutes);
app.use('/locations', locationRoutes);
app.use('/receipts', receiptRoutes);
app.use('/production', productionRoutes);
app.use('/shipments', shipmentRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/audit', auditLogRoutes);

export default app;
