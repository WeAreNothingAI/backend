import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ClientService } from './client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('client')
@Controller('client')
export class ClientController {
  constructor(private clientService: ClientService) {}

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
  async postClient(@Body() data: CreateClientDto) {
    return await this.clientService.createClient(data);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '노인 정보 목록',
    description: '노인 정보 목록을 보여줍니다..',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '노인 정보 목록 가져오기 성공',
  })
  async getManyClient() {
    return await this.clientService.fetchManyClient(2);
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
  async getClient(@Param('id', ParseIntPipe) id: number) {
    return await this.clientService.fetchClient(id);
  }
}
