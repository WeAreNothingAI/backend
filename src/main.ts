import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // CORS 설정
  const allowedOrigins = [
    'http://localhost:3000', // 프론트엔드 로컬
    'http://localhost:3001', // 백엔드 로컬
    'http://oncare-2087995465.ap-northeast-2.elb.amazonaws.com', // 배포 환경
  ];

  // 환경변수에서 추가 origin 가져오기
  const frontendUrl = configService.get<string>('FRONTEND_URL');
  if (frontendUrl && !allowedOrigins.includes(frontendUrl)) {
    allowedOrigins.push(frontendUrl);
  }

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Oncare API')
    .setDescription('Oncare API Docs')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        in: 'header',
        name: 'JWT',
      },
      'JWT',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      tagsSorter: 'alpha',
      operationsSorter: 'method',
      persistAuthorization: true,
    },
    customSiteTitle: 'Oncare API Docs',
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
