from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import whisper
import tempfile
import os
import uvicorn
from starlette.responses import JSONResponse

app = FastAPI()

# CORS 설정 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

model = whisper.load_model("base")
print("Whisper model loaded successfully")  # 모델 로드 확인

@app.options("/transcribe-buffer")
async def transcribe_buffer_options():
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
        },
    )

@app.post("/transcribe")
async def transcribe_buffer(request: Request):
    try:
        print("\n=== New transcribe-buffer request ===")  # 새 요청 구분자
        # 요청 본문에서 바이너리 데이터 읽기
        content = await request.body()
        print(f"Received audio data length: {len(content)} bytes")  # 데이터 크기 로그
        
        # WAV 파일 헤더 체크
        if len(content) > 44:  # WAV 헤더는 44바이트
            header = content[:44]
            print(f"WAV header: {header[:4]}")  # RIFF 식별자 확인
        
        # 임시 WAV 파일로 저장
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp:
            tmp.write(content)
            tmp_path = tmp.name
            print(f"Saved to temporary file: {tmp_path}")

        # Whisper로 음성 인식
        print("Starting transcription...")
        result = model.transcribe(tmp_path)
        print(f"Transcription result: {result['text']}")

        # 임시 파일 삭제
        os.remove(tmp_path)
        print("Temporary file deleted")

        return {"text": result["text"]}
    except Exception as e:
        print(f"Error in transcribe_buffer: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

if __name__ == "__main__":
    print("Starting FastAPI server...")  # 서버 시작 로그
    uvicorn.run(app, host="localhost", port=5000)
