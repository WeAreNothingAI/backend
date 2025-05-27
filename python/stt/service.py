from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse
import tempfile
import os
import traceback
from transformers import pipeline, WhisperForConditionalGeneration, WhisperProcessor
from pydub import AudioSegment  # 추가
import time  # 처리 시간 측정용
import glob  # 파일 삭제용

model_id = "SungBeom/whisper-small-ko"
model = WhisperForConditionalGeneration.from_pretrained(model_id)
processor = WhisperProcessor.from_pretrained(model_id)

# 최신 transformers가 아니더라도, config에 명시적으로 세팅
if not hasattr(model.generation_config, "no_timestamps_token_id"):
    model.generation_config.no_timestamps_token_id = processor.tokenizer.convert_tokens_to_ids("<|notimestamps|>")

pipe = pipeline(
    "automatic-speech-recognition",
    model=model,
    tokenizer=processor.tokenizer,
    feature_extractor=processor.feature_extractor,
    return_timestamps=False,
    device=-1
)

def create_stt_app() -> FastAPI:
    app = FastAPI()

    # CORS 설정
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

    @app.options("/")
    async def transcribe_options():
        return JSONResponse(
            content={},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
            },
        )

    @app.post("/")
    async def transcribe_buffer(request: Request):
        temp_file = None
        start_time = time.time()  # 처리 시간 측정 시작
        try:
            content = await request.body()
            content_size = len(content)

            if content_size == 0:
                raise Exception("빈 오디오 데이터를 받았습니다.")

            # 임시 디렉토리 설정
            try:
                temp_dir = os.path.join(os.getcwd(), 'temp')
                os.makedirs(temp_dir, exist_ok=True)
            except Exception:
                temp_dir = tempfile.gettempdir()

            # 오디오 파일 저장
            try:
                temp_file = os.path.join(temp_dir, f'audio_{os.getpid()}_{id(content)}.webm')
                with open(temp_file, 'wb') as f:
                    f.write(content)
                    f.flush()
                    os.fsync(f.fileno())
            except Exception as e:
                traceback.print_exc()
                raise Exception("오디오 데이터를 임시 파일로 저장하는 중 오류가 발생했습니다.")

            if not os.path.exists(temp_file) or os.path.getsize(temp_file) == 0:
                raise Exception("유효한 오디오 파일이 생성되지 않았습니다.")

            # webm 오디오를 20초씩 분할하여 Whisper로 각각 처리
            try:
                audio = AudioSegment.from_file(temp_file, format="webm")
                chunk_length_ms = 20 * 1000  # 20초
                chunks = [audio[i:i+chunk_length_ms] for i in range(0, len(audio), chunk_length_ms)]
                transcripts = []
                for idx, chunk in enumerate(chunks):
                    chunk_path = os.path.join(temp_dir, f"chunk_{os.getpid()}_{id(content)}_{idx}.wav")
                    chunk.export(chunk_path, format="wav")
                    result = pipe(chunk_path, return_timestamps=False)
                    transcripts.append(result["text"].strip())
                    os.remove(chunk_path)
                transcribed_text = " ".join(transcripts).strip()
                if not transcribed_text:
                    raise Exception("음성 인식 결과가 비어있습니다.")
                end_time = time.time()
                print(f"STT 전체 처리 시간: {end_time - start_time:.2f}초")
                return {"text": transcribed_text}
            except Exception as e:
                traceback.print_exc()
                raise Exception(f"Whisper 처리 중 오류가 발생했습니다: {str(e)}")
        except Exception as e:
            traceback.print_exc()
            return JSONResponse(
                status_code=500,
                content={"error": str(e)}
            )
        finally:
            # 임시 파일 삭제
            try:
                if temp_file and os.path.exists(temp_file):
                    os.remove(temp_file)
                temp_dir = os.path.dirname(temp_file) if temp_file else tempfile.gettempdir()
                # chunk_*.wav 파일 모두 삭제
                for chunk_file in glob.glob(os.path.join(temp_dir, "chunk_*.wav")):
                    try:
                        os.remove(chunk_file)
                    except Exception:
                        pass
                # audio_*.webm 파일 모두 삭제
                for webm_file in glob.glob(os.path.join(temp_dir, "audio_*.webm")):
                    try:
                        os.remove(webm_file)
                    except Exception:
                        pass
            except Exception:
                traceback.print_exc()
    # ffmpeg가 시스템에 설치되어 있어야 webm → wav 변환이 정상 동작합니다.

    return app 