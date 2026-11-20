import 'reflect-metadata';
// Only the mocked NestJS connection options use these values. Real database tests use TEST_DATABASE_URL.
process.env.DB_HOST ??= '127.0.0.1';
process.env.DB_USER ??= 'test';
process.env.DB_PASSWORD ??= 'test';
process.env.DB_NAME ??= 'test';
