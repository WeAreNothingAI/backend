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
  @ApiOperation({ summary: '카카오 로그인 콜백' })
  @ApiResponse({
    status: 200,
    description: '로그인 성공 후 토큰을 쿠키에 설정하고 리디렉션',
  })
  async kakaoCallback(
    @Req() req: Request & { user: Member; isNewUser?: boolean },
    @Res() res: Response,
  ) {
    const user = req.user;
    const tokens = await this.authService.generateTokens(user);

    // 쿠키에 토큰 설정
    this.setTokenCookies(res, tokens);

    // 새 회원가입인 경우와 기존 로그인인 경우를 구분하여 리디렉션
    const redirectUrl = req.isNewUser
      ? `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/signup-success`
      : `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/login-success`;

    res.redirect(redirectUrl);
  }

  @Post('refresh')
  @ApiOperation({ summary: '토큰 갱신' })
  @ApiResponse({ status: 200, description: '토큰 갱신 성공' })
  async refresh(@Req() req: Request, @Res() res: Response) {
    const refreshToken = req.cookies['refresh_token'];

    if (!refreshToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: 'Refresh token not found',
      });
    }

    try {
      const tokens = await this.authService.refreshTokens(refreshToken);
      this.setTokenCookies(res, tokens);

      return res.status(HttpStatus.OK).json({
        message: 'Tokens refreshed successfully',
      });
    } catch (error) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: 'Invalid refresh token',
      });
    }
  }

  @Get('logout')
  @ApiOperation({ summary: '로그아웃' })
  @ApiResponse({ status: 200, description: '로그아웃 성공' })
  async logout(@Req() req: Request, @Res() res: Response) {
    try {
      // JWT 토큰이 있다면 검증
      const token = req.cookies['access_token'];
      if (token) {
        try {
          await this.authService.verifyToken(token);
        } catch (error) {
          // 토큰이 유효하지 않아도 로그아웃은 진행
        }
      }

      // 쿠키 삭제
      res.clearCookie('access_token');
      res.clearCookie('refresh_token');

      // 카카오 로그아웃 URL로 리다이렉트
      const kakaoLogoutUrl = `https://kauth.kakao.com/oauth/logout?client_id=${this.configService.get('KAKAO_CLIENT_ID')}&logout_redirect_uri=${encodeURIComponent(process.env.FRONTEND_URL || 'http://localhost:3001')}/auth/logout-success`;

      res.redirect(kakaoLogoutUrl);
    } catch (error) {
      // 에러가 발생해도 로그아웃은 진행
      res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/logout-success`,
      );
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '현재 사용자 정보 조회' })
  @ApiResponse({ status: 200, description: '사용자 정보 반환' })
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
  async deleteAccount(@CurrentUser() user: Member, @Res() res: Response) {
    await this.authService.deleteAccount(user.id);

    // 쿠키 삭제
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

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

  private setTokenCookies(res: Response, tokens: TokenPair) {
    // HTTP-Only 쿠키로 토큰 설정
    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15분
    });

    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
    });
  }
}
