import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JournalService } from './journal.service';
import { Injectable, Logger } from '@nestjs/common';

interface AudioDataPayload {
  audio: number[];
  clientId: number;
  careWorkerId: number;
}

interface AudioRecord {
  buffer: Buffer;
  transcript: string;
  timestamp: number;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class JournalGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private audioData: { [key: string]: AudioRecord[] } = {};
  private readonly logger = new Logger(JournalGateway.name);

  constructor(private journalService: JournalService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.audioData[client.id] = [];
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    delete this.audioData[client.id];
  }

  @SubscribeMessage('startRecording')
  async handleStartRecording(client: Socket) {
    try {
      this.audioData[client.id] = [];
      client.emit('recordingStarted');
      this.logger.log(`Recording started for client: ${client.id}`);
    } catch (error) {
      this.logger.error(`Error starting recording for client ${client.id}:`, error);
      client.emit('error', { message: '녹음 시작 중 오류가 발생했습니다.' });
    }
  }

  @SubscribeMessage('audioData')
  async handleAudioData(client: Socket, payload: AudioDataPayload) {
    try {
      this.logger.debug(`Received complete audio data from client ${client.id}`);
      
      const audioBuffer = Buffer.from(payload.audio);
      this.logger.debug(`Processing audio of size ${audioBuffer.length} bytes`);

      const text = await this.journalService.transcribeAudioStream(audioBuffer);
      this.logger.debug(`Transcription result: ${text}`);

      if (!text) {
        throw new Error('음성 인식 결과가 비어있습니다.');
      }

      // 일지 저장
      await this.journalService.createJournal({
        clientId: payload.clientId,
        careWorkerId: payload.careWorkerId,
        audioBuffer,
        transcript: text,
      });
      
      client.emit('transcription', { text });
      
    } catch (error) {
      this.logger.error(`Error processing audio data for client ${client.id}:`, error);
      client.emit('error', { 
        message: 'STT 처리 중 오류가 발생했습니다.',
        details: error.message
      });
    }
  }

  @SubscribeMessage('stopRecording')
  async handleStopRecording(client: Socket, payload: { clientId: number; careWorkerId: number }) {
    try {
      const audioRecords = this.audioData[client.id];
      this.logger.log(`Processing ${audioRecords.length} audio records for client ${client.id}`);
      
      if (audioRecords.length === 0) {
        throw new Error('녹음된 데이터가 없습니다.');
      }

      // Sort records by timestamp to ensure correct order
      audioRecords.sort((a, b) => a.timestamp - b.timestamp);
      
      const fullTranscript = audioRecords
        .map(record => record.transcript.trim())
        .filter(text => text.length > 0)
        .join(' ');
      
      this.logger.debug(`Final transcript for client ${client.id}: ${fullTranscript}`);
      
      if (!fullTranscript) {
        throw new Error('변환된 텍스트가 없습니다.');
      }

      const result = await this.journalService.createJournal({
        clientId: payload.clientId,
        careWorkerId: payload.careWorkerId,
        audioBuffer: Buffer.concat(audioRecords.map(r => r.buffer)),
        transcript: fullTranscript,
      });
      
      this.logger.log(`Successfully saved journal for client ${client.id}`);
      client.emit('recordingStopped', { success: true });
    } catch (error) {
      this.logger.error(`Error saving journal for client ${client.id}:`, error);
      client.emit('recordingStopped', { 
        success: false, 
        error: error.message || '일지 저장 중 오류가 발생했습니다.' 
      });
    } finally {
      this.audioData[client.id] = [];
    }
  }
}
