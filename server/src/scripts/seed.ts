import { sequelize } from '../models';
import { hash } from '../services/hash';

(async () => {
  try {
    await sequelize.sync();
    const { User, Location, Material, Product, BomItem } = sequelize.models;

    // Create users
    console.log('Creating users...');
    const admin = await User.findOne({ where: { email: 'admin@kudos.local' }});
    if (!admin) {
      await User.create({
        name: 'Admin User',
        email: 'admin@kudos.local',
        passwordHash: await hash('Admin123!'),
        role: 'ADMIN'
      });
      console.log('✓ Admin user created (admin@kudos.local / Admin123!)');
    } else {
      console.log('✓ Admin user already exists');
    }

    const associate = await User.findOne({ where: { email: 'john@kudos.local' }});
    if (!associate) {
      await User.create({
        name: 'John Smith',
        email: 'john@kudos.local',
        passwordHash: await hash('Associate123!'),
        role: 'ASSOCIATE'
      });
      console.log('✓ Associate user created (john@kudos.local / Associate123!)');
    } else {
      console.log('✓ Associate user already exists');
    }

    // Create locations
    console.log('\nCreating locations...');
    await Location.findOrCreate({
      where: { code: 'MAIN' },
      defaults: { description: 'Main Warehouse' }
    });
    await Location.findOrCreate({
      where: { code: 'DOCK' },
      defaults: { description: 'Receiving Dock' }
    });
    await Location.findOrCreate({
      where: { code: 'PROD' },
      defaults: { description: 'Production Floor' }
    });
    console.log('✓ Locations created');

    // Create materials
    console.log('\nCreating materials...');
    const [steel] = await Material.findOrCreate({
      where: { sku: 'MAT-STEEL-001' },
      defaults: {
        name: 'Steel Sheet 4x8',
        uom: 'SHEET',
        minStock: 50,
        active: true
      }
    });
    const [plastic] = await Material.findOrCreate({
      where: { sku: 'MAT-PLASTIC-001' },
      defaults: {
        name: 'ABS Plastic Pellets',
        uom: 'KG',
        minStock: 100,
        active: true
      }
    });
    const [screws] = await Material.findOrCreate({
      where: { sku: 'MAT-SCREW-001' },
      defaults: {
        name: 'M6 Screws',
        uom: 'PCS',
        minStock: 1000,
        active: true
      }
    });
    const [paint] = await Material.findOrCreate({
      where: { sku: 'MAT-PAINT-001' },
      defaults: {
        name: 'Black Paint',
        uom: 'LITER',
        minStock: 20,
        active: true
      }
    });
    console.log('✓ Materials created');

    // Create products
    console.log('\nCreating products...');
    const [widget] = await Product.findOrCreate({
      where: { sku: 'PROD-WIDGET-A1' },
      defaults: {
        name: 'Widget Model A1',
        uom: 'UNIT',
        active: true
      }
    });
    const [panel] = await Product.findOrCreate({
      where: { sku: 'PROD-PANEL-B2' },
      defaults: {
        name: 'Control Panel B2',
        uom: 'UNIT',
        active: true
      }
    });
    console.log('✓ Products created');

    // Create BOM items
    console.log('\nCreating BOM items...');
    const widgetId = (widget as any).id;
    const panelId = (panel as any).id;
    const steelId = (steel as any).id;
    const plasticId = (plastic as any).id;
    const screwsId = (screws as any).id;
    const paintId = (paint as any).id;

    // BOM for Widget A1
    await BomItem.findOrCreate({
      where: { productId: widgetId, materialId: plasticId },
      defaults: { qtyPerUnit: 2.5 }
    });
    await BomItem.findOrCreate({
      where: { productId: widgetId, materialId: screwsId },
      defaults: { qtyPerUnit: 8 }
    });
    await BomItem.findOrCreate({
      where: { productId: widgetId, materialId: paintId },
      defaults: { qtyPerUnit: 0.1 }
    });

    // BOM for Panel B2
    await BomItem.findOrCreate({
      where: { productId: panelId, materialId: steelId },
      defaults: { qtyPerUnit: 0.5 }
    });
    await BomItem.findOrCreate({
      where: { productId: panelId, materialId: screwsId },
      defaults: { qtyPerUnit: 12 }
    });
    await BomItem.findOrCreate({
      where: { productId: panelId, materialId: paintId },
      defaults: { qtyPerUnit: 0.2 }
    });
    console.log('✓ BOM items created');

    console.log('\n========================================');
    console.log('✅ Seed data created successfully!');
    console.log('========================================');
    console.log('\nTest Users:');
    console.log('  Admin:     admin@kudos.local / Admin123!');
    console.log('  Associate: john@kudos.local / Associate123!');
    console.log('\nLocations: MAIN, DOCK, PROD');
    console.log('Materials: 4 items');
    console.log('Products:  2 items with BOMs');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
})();
