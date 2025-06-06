import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ClientService } from './client.service';
import {
  ClientListResponseDto,
  CreateClientDto,
} from './dto/create-client.dto';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JournalService } from '../journal/journal.service';
import { JournalListItemDto } from '../journal/dto/journal-list-item.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import {
  UpdateClientByCareWorkerDto,
  UpdateClientDto,
} from './dto/update-client.dto';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
@ApiTags('client')
@Controller('client')
export class ClientController {
  constructor(
    private readonly clientService: ClientService,
    private readonly journalService: JournalService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '노인 정보 생성',
    description: '노인 초기 정보를 등록합니다.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '노인 초기 정보 등록 성공',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '성별은 `여` 또는 `남`만 가능합니다.',
  })
  async postClient(
    @Body() data: CreateClientDto,
    @CurrentUser() user: { id: number; role: string },
  ) {
    if (user.role !== 'socialWorker') {
      throw new ForbiddenException('복지사만 이용할 수 있습니다.');
    }

    return await this.clientService.createClient(data, user.id);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '노인 정보 목록',
    description: '본인이 담당하는 노인 정보 목록을 보여줍니다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '노인 정보 목록 가져오기 성공',
    type: [ClientListResponseDto],
  })
  async getManyClient(@CurrentUser() user) {
    const socialWorkerId = user.role === 'socialWorker' ? user.id : undefined;
    const careWorkerId = user.role === 'careWorker' ? user.id : undefined;

    return await this.clientService.findManyClient({
      socialWorkerId,
      careWorkerId,
    });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '노인 정보 상세보기',
    description: '노인 정보를 상세하게 볼 수 있습니다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '노인 정보 상세보기 성공',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '해당 노인은 존재하지 않습니다.',
  })
  async getClient(@Param('id', ParseIntPipe) id: number, @CurrentUser() user) {
    // 역할에 따라 적절한 ID를 넘김

    const socialWorkerId = user.role === 'socialWorker' ? user.id : undefined;
    const careWorkerId = user.role === 'careWorker' ? user.id : undefined;

    return this.clientService.findClient({ id, socialWorkerId, careWorkerId });
  }

  @Get(':clientId/journal')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '특정 노인별 상담일지 목록 조회',
    description: '특정 노인(client)의 일지 id, 생성일자만 반환',
  })
  @ApiOkResponse({
    description: '상담일지 목록',
    type: [JournalListItemDto],
  })
  async getJournalListByClient(
    @Param('clientId', ParseIntPipe) clientId: number,
    @CurrentUser() user,
  ): Promise<JournalListItemDto[]> {
    // 역할에 따라 적절한 ID를 넘김
    const socialWorkerId = user.role === 'socialWorker' ? user.id : undefined;
    const careWorkerId = user.role === 'careWorker' ? user.id : undefined;

    return this.journalService.findJournalListByClient({
      clientId,
      socialWorkerId,
      careWorkerId,
    });
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '특정 노인 정보 수정',
    description: '특정 노인의 정보를 수정합니다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '해당 노인 정보 변경 성공',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '해당 노인은 존재하지 않습니다.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '권한이 없습니다.',
  })
  async putClient(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user,
    @Body() data: UpdateClientDto,
  ) {
    const socialWorkerId = user.role === 'socialWorker' ? user.id : undefined;
    const careWorkerId = user.role === 'careWorker' ? user.id : undefined;

    return this.clientService.updateClient({
      id,
      socialWorkerId,
      careWorkerId,
      data,
    });
  }

  @Patch(':id/care-worker')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '특정 노인의 담당 요양보호사 수정',
    description: '특정 노인의 담당 요양보호사를 변경합니다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '해당 노인 담당 요양보호사 변경 성공',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '해당 노인은 존재하지 않습니다.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '권한이 없습니다.',
  })
  async patchClientByCareWorker(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user,
    @Body() { careWorkerId }: UpdateClientByCareWorkerDto,
  ) {
    if (user.role !== 'socialWorker') {
      throw new UnauthorizedException('복지사만 수정할 수 있습니다.');
    }

    return this.clientService.updateClientByCareWorker({
      id,
      socialWorkerId: user.id,
      careWorkerId,
    });
  }
}
