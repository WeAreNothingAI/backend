import {
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  Res,
  Body,
  HttpStatus,
  Delete,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService, TokenPair } from './auth.service';
import { KakaoAuthGuard } from './guards/kakao-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Member } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { CompleteSignupDto } from './dto/complete-signup.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LoginResponseDto } from './dto/login-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Get('kakao')
  @UseGuards(KakaoAuthGuard)
  @ApiOperation({ summary: '카카오 로그인 시작' })
  async kakaoLogin() {
    // 카카오 로그인 페이지로 리디렉션
  }

  @Get('kakao/callback')
  @UseGuards(KakaoAuthGuard)
  @ApiOperation({
    summary: '카카오 로그인 콜백 (Swagger 테스트용)',
    description:
      '로그인/회원가입 성공 후, access/refresh 토큰을 JSON 형태로 반환합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '로그인/회원가입 성공. 토큰과 신규가입 여부를 반환.',
    type: LoginResponseDto,
  })
  async kakaoCallback(
    @Req() req: Request & { user: Member & { isNewUser?: boolean } },
  ): Promise<LoginResponseDto> {
    const isNewUser = !!req.user.isNewUser;
    const { isNewUser: _, ...user } = req.user;
    const tokens = await this.authService.generateTokens(user);

    const response = {
      ...tokens,
      isNewUser,
    };

    return response;
  }

  @Post('refresh')
  @ApiOperation({ summary: '액세스 토큰 갱신' })
  @ApiResponse({
    status: 200,
    description: '새로운 액세스/리프레시 토큰 반환',
    type: TokenPair,
  })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<TokenPair> {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @Get('logout')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '로그아웃' })
  @ApiResponse({
    status: 302,
    description:
      '카카오 로그아웃 후 프론트엔드 로그아웃 성공 페이지로 리디렉션',
  })
  @ApiBearerAuth('JWT')
  async logout(@Res() res: Response) {
    // .env 파일 또는 기본값으로 프론트엔드 URL을 가져옵니다.
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'https://oncare.vercel.app';
    const logoutRedirectUrl = `${frontendUrl.replace(
      /\/$/,
      '',
    )}/auth/logout-success`;

    // 카카오 로그아웃 URL로 리다이렉트
    const kakaoLogoutUrl = `https://kauth.kakao.com/oauth/logout?client_id=${this.configService.get(
      'KAKAO_CLIENT_ID',
    )}&logout_redirect_uri=${encodeURIComponent(logoutRedirectUrl)}`;

    res.redirect(kakaoLogoutUrl);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '현재 사용자 정보 조회' })
  @ApiResponse({ status: 200, description: '사용자 정보 반환' })
  @ApiBearerAuth('JWT')
  async getProfile(@CurrentUser() user: Member) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '회원 탈퇴' })
  @ApiResponse({ status: 200, description: '회원 탈퇴 성공' })
  @ApiBearerAuth('JWT')
  async deleteAccount(
    @CurrentUser() user: Member,
    @Res() res: Response,
  ): Promise<Response> {
    await this.authService.deleteAccount(user.id);

    return res.status(HttpStatus.OK).json({
      message: 'Account deleted successfully',
    });
  }

  @Post('complete-signup')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '회원가입 완료 (역할 선택)' })
  @ApiResponse({ status: 200, description: '회원가입 완료 성공' })
  @ApiBearerAuth('JWT')
  async completeSignup(
    @CurrentUser() user: Member,
    @Body() dto: CompleteSignupDto,
  ) {
    return this.authService.completeSignup(user.id, dto.role);
  }
}
