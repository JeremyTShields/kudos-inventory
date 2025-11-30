import { sequelize } from '../config/db';
import { initModels } from './init';

initModels(sequelize);

export { sequelize };