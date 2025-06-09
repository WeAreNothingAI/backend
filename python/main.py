import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from stt.service import create_stt_app
from report.service import create_report_app
from weekly_report.service import create_weekly_report_app

def create_app() -> FastAPI:
    app = FastAPI()
    
    # CORS 설정
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # STT 서비스 마운트
    stt_app = create_stt_app()
    app.mount("/transcribe", stt_app)

    # 리포트 서비스 마운트
    report_app = create_report_app()
    app.mount("/generate-journal-docx", report_app)

    # 주간보고서 서비스 마운트
    weekly_report_app = create_weekly_report_app()
    app.mount("/generate-weekly-report", weekly_report_app)

    return app

app = create_app()

@app.get("/")
def read_root():
    return {"message": "Hello World"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)