from fastapi import Request, APIRouter
from starlette.responses import JSONResponse
import tempfile
import os
import traceback
from transformers import pipeline

router = APIRouter()

# HuggingFace Whisper 파이프라인 로드 (한국어 특화 모델 사용)
pipe = pipeline(
    "automatic-speech-recognition",
    model="SungBeom/whisper-small-ko",
    device=-1  # CUDA 사용 시 0, CPU 사용 시 -1
)

@router.options("/transcribe")
async def transcribe_options():
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
        },
    )

@router.post("/transcribe")
async def transcribe_buffer(request: Request):
    temp_file = None

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

        # Whisper로 음성 인식
        try:
            result = pipe(temp_file)
            transcribed_text = result["text"].strip()

            if not transcribed_text:
                raise Exception("음성 인식 결과가 비어있습니다.")

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
        try:
            if temp_file and os.path.exists(temp_file):
                os.remove(temp_file)
        except Exception:
            traceback.print_exc()
