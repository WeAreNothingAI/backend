import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JounalService } from './jounal.service';
import { Injectable } from '@nestjs/common';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class JounalGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(private jounalService: JounalService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('startRecording')
  async handleStartRecording(client: Socket) {
    client.emit('recordingStarted');
  }

  @SubscribeMessage('audioData')
  async handleAudioData(client: Socket, payload: { audio: Buffer }) {
    try {
      const text = await this.jounalService.transcribeAudioStream(
        payload.audio,
      );
      client.emit('transcription', { text });
    } catch (error) {
      client.emit('error', { message: 'STT 처리 중 오류가 발생했습니다.' });
    }
  }

  @SubscribeMessage('stopRecording')
  async handleStopRecording(client: Socket) {
    client.emit('recordingStopped');
  }
}
