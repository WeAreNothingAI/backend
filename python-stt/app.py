from fastapi import FastAPI, File, UploadFile
import whisper
import tempfile
import os
import uvicorn

app = FastAPI()
model = whisper.load_model("base")

@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):

    # 확장자 추출 (예: .mp3, .mp4, .m4a 등)
    suffix = os.path.splitext(audio.filename)[-1]

    # 임시 파일로 저장하고 Whisper로 변환
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name
  
    # Whisper로 음성 인식
    result = model.transcribe(tmp_path)

    # 임시 파일 삭제
    os.remove(tmp_path)

    return {"text": result["text"]}

if __name__ == "__main__":
  uvicorn.run(app, host="localhost", port=5000)
