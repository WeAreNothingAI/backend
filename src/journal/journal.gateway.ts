import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JournalService } from './journal.service';

interface AudioDataPayload {
  audio: number[];
  clientId: number;
}

interface AudioRecord {
  buffer: Buffer;
  transcript: string;
  timestamp: number;
}

@Injectable()
@WebSocketGateway({ cors: { origin: '*' } })
export class JournalGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private audioData: { [key: string]: AudioRecord[] } = {};
  private readonly logger = new Logger(JournalGateway.name);

  constructor(
    private readonly journalService: JournalService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token || client.handshake.query?.token;
      if (!token) throw new Error('Missing token');

      const payload = this.jwtService.verify(token);
      client.data.user = payload; // 예: { sub: 3, role: 'CARE_WORKER' }

      this.logger.log(`Client connected: ${client.id} (user: ${payload.sub})`);
      this.audioData[client.id] = [];
    } catch (error) {
      this.logger.warn(`Authentication failed for client ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    delete this.audioData[client.id];
  }

  @SubscribeMessage('startRecording')
  handleStartRecording(client: Socket) {
    this.audioData[client.id] = [];
    client.emit('recordingStarted');
  }

  @SubscribeMessage('audioData')
  async handleAudioData(client: Socket, payload: AudioDataPayload) {
    const user = client.data.user;
    const careWorkerId = user?.sub;

    try {
      const audioBuffer = Buffer.from(payload.audio);
      const text = await this.journalService.transcribeAudioStream(audioBuffer);

      if (!text) throw new Error('Empty transcription');

      await this.journalService.createJournal({
        clientId: payload.clientId,
        careWorkerId,
        audioBuffer,
        transcript: text,
      });

      client.emit('transcription', { text });
    } catch (error) {
      client.emit('error', {
        message: 'STT 처리 중 오류가 발생했습니다.',
        details: error.message,
      });
    }
  }

  @SubscribeMessage('stopRecording')
  async handleStopRecording(client: Socket, payload: { clientId: number }) {
    const user = client.data.user;
    const careWorkerId = user?.sub;

    try {
      const audioRecords = this.audioData[client.id] || [];

      if (audioRecords.length === 0)
        throw new Error('녹음된 데이터가 없습니다.');

      audioRecords.sort((a, b) => a.timestamp - b.timestamp);
      const fullTranscript = audioRecords
        .map((r) => r.transcript.trim())
        .filter(Boolean)
        .join(' ');

      if (!fullTranscript) throw new Error('변환된 텍스트가 없습니다.');

      await this.journalService.createJournal({
        clientId: payload.clientId,
        careWorkerId,
        audioBuffer: Buffer.concat(audioRecords.map((r) => r.buffer)),
        transcript: fullTranscript,
      });

      client.emit('recordingStopped', { success: true });
    } catch (error) {
      client.emit('recordingStopped', {
        success: false,
        error: error.message,
      });
    } finally {
      this.audioData[client.id] = [];
    }
  }
}
