import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: { origin: '*' },
  });

  // Global validation pipe – strips unknown properties and auto-transforms
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      skipMissingProperties: false,
    }),
  );

  // Swagger documentation (always on in development; gate with NODE_ENV in production)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Partnership Management Information System API')
      .setDescription(
        'Partnership Management Information System (PMIS) API boilerplate.\n\n' +
          'Covers user auth (JWT), employee auth (JWT), RBAC (roles / resources / actions), ' +
          'OTP verification, refresh tokens, and notifications.',
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'bearer',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    console.log(
      `Swagger UI available at http://localhost:${process.env.PORT ?? 3000}/api/docs`,
    );
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
