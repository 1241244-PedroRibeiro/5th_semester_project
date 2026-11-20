import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './presentation/app.module';
import { configureTrustedProxy } from './presentation/trusted-proxy';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureTrustedProxy(app.getHttpAdapter().getInstance());
  const port = Number(process.env.PORT) || 3000;

  app.use(cookieParser());
  app.enableCors();
  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');
  console.log(`LaPrizza Back-End online na porta ${port}`);
}

bootstrap();
