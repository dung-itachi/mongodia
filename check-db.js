const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    
    // Check orders
    const orders = db.collection('orders');
    console.log('Total orders:', await orders.countDocuments());
    
    // Get order statuses
    const statuses = await orders.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray();
    console.log('\nOrder statuses:');
    statuses.forEach(s => console.log(' -', s._id + ':', s.count));
    
    // Find warehouse tasks collection
    const collections = await db.listCollections().toArray();
    const warehouseTasksColl = collections.find(c => c.name.includes('warehouse') && c.name.includes('task'));
    console.log('\nWarehouse tasks collection:', warehouseTasksColl?.name || 'NOT FOUND');
    
    if (warehouseTasksColl) {
      const tasks = db.collection(warehouseTasksColl.name);
      console.log('Total warehouse tasks:', await tasks.countDocuments());
    }
    
    // Check warehouse tasks in all collections
    console.log('\nAll warehouse-related collections:');
    collections.filter(c => c.name.includes('warehouse')).forEach(c => {
      const count = db.collection(c.name).countDocuments();
      console.log(' -', c.name + ':', count);
    });
    
    await mongoose.disconnect();
  } catch(e) {
    console.error('Error:', e.message);
  }
}
check();
