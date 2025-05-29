import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
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
}
