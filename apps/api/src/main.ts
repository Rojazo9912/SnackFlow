import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { json, urlencoded, type Request, type Response, type NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
    rawBody: true,
  });

  // Increase body size limit for file uploads
  // Increase body size limit for file uploads
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

  // Basic request logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    const startedAt = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - startedAt;
      console.log(`[${req.method}] ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS - permitir web y apps moviles
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'capacitor://localhost',
    'http://localhost',
    'https://localhost',
    process.env.CORS_ORIGIN,
    process.env.WEB_URL,
  ].filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (mobile apps, Postman, etc)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin) || origin.includes('railway.app') || origin.includes('vercel.app')) {
        callback(null, true);
      } else {
        console.log('CORS blocked origin:', origin);
        callback(null, false);
      }
    },
    credentials: true,
  });

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('SnackFlow API')
    .setDescription('API para sistema POS de snacks y dulcerias')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.API_PORT || 3000;
  await app.listen(port);

  console.log(`🚀 SnackFlow API running on: http://localhost:${port}/api`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();


