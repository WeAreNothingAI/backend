import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ResponseInterceptor } from './config/response/response.interceptor';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 설정
  app.enableCors({
    origin: ['http://localhost:3000'], // Next.js 기본 포트
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true, // 쿠키, 인증 헤더 등을 포함
  });

  // 보안 미들웨어
  app.use(helmet()); // 기본적인 보안 헤더 설정

  // 전역 파이프 설정
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // DTO 클래스로 자동 변환
      whitelist: true, // DTO에 정의되지 않은 속성 제거
      forbidNonWhitelisted: true, // DTO에 정의되지 않은 속성이 있으면 요청 자체를 막음
    }),
  );

  // 전역 인터셉터 설정
  app.useGlobalInterceptors(new ResponseInterceptor());

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
    },
    customSiteTitle: 'Oncare API Docs',
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
