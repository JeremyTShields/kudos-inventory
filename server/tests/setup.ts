// Runs before any test module is imported, so the database config picks up
// an isolated in-memory SQLite instance instead of MySQL.
process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'sqlite';
process.env.DB_STORAGE = ':memory:';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES = '15m';
