import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 쿠키 파서 미들웨어 추가
  app.use(cookieParser());

  // CORS 설정
  app.enableCors({
    origin: [
      'http://localhost:3000', // 프론트엔드 로컬
      'http://localhost:3001', // 백엔드 로컬
      'http://oncare-2087995465.ap-northeast-2.elb.amazonaws.com', // 배포 환경
    ],
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
    customSiteTitle: 'Oncare API Docs.',
  });

  await app.listen(process.env.PORT ?? 80);
}
bootstrap();
