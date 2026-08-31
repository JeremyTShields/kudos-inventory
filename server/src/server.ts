import app from './app';
import { sequelize } from './config/db';
import './models'; // ensure models are registered

const port = Number(process.env.PORT||4000);

(async () => {
  try {
    await sequelize.authenticate();
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync(); // for convenience: create missing tables locally
    }
    console.log('DB connected');
    app.listen(port, ()=>console.log(`API on :${port}`));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
