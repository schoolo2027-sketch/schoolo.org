import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for Frontend (Cloudflare / Localhost)
  app.enableCors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    credentials: true,
  });

  // Global Request Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger API Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('School Management & Result API')
    .setDescription('NestJS REST API Documentation for Bangladesh School System')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 5000;
  await app.listen(port);
  console.log(`🚀 NestJS Backend Server running on http://localhost:${port}`);
  console.log(`📑 Swagger Documentation available at http://localhost:${port}/api/docs`);
}
bootstrap();
