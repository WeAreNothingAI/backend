import os
from fastapi import FastAPI, Body, HTTPException
from pydantic import BaseModel
from docxtpl import DocxTemplate
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import uuid
import json
import time
import subprocess
import boto3
import tempfile
import platform

# 개발 환경에서만 dotenv 사용
if os.environ.get("ENV", "local") == "local":
     from dotenv import load_dotenv
     load_dotenv(dotenv_path=os.path.abspath(os.path.join(os.path.dirname(__file__), '../../.env')))
     

client = OpenAI()

class JournalRequest(BaseModel):
    text: str
    editedTranscript: str = None
    date: str
    service: str
    manager: str      
    method: str
    type: str
    time: str
    title: str
    category: str
    client: str
    contact: str
    opinion: str = ""
    result: str = ""    
    note: str = ""

class PdfConvertRequest(BaseModel):
    file_name: str

class FileDownloadRequest(BaseModel):
    file_name: str

def convert_docx_to_pdf(docx_path, pdf_path):
    if platform.system() == "Windows":
        try:
            from docx2pdf import convert
            convert(docx_path, pdf_path)
        except Exception as e:
            raise Exception(f"docx2pdf(MS Word) PDF 변환 실패(Windows): {e}")
    else:
        output_dir = os.path.dirname(pdf_path)
        try:
            subprocess.run([
                "libreoffice",
                "--headless",
                "--convert-to", "pdf",
                "--outdir", output_dir,
                docx_path
            ], check=True)
        except Exception as e:
            raise Exception(f"LibreOffice PDF 변환 실패(Linux/Unix): {e}")
    # libreoffice는 파일명을 자동으로 맞춰줌
    # 변환된 파일이 output_dir에 생성됨

def create_report_app() -> FastAPI:
    load_dotenv()
    client.api_key = os.getenv("OPENAI_API_KEY")

    app = FastAPI()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.post("/")
    def generate_journal_docx(data: JournalRequest):
        start = time.time()
        # editedTranscript가 None/빈문자/공백일 때도 안전하게 처리
        transcript = data.text
        if data.editedTranscript and data.editedTranscript.strip() != "":
            transcript = data.editedTranscript
        # 1. 상담내용(요약)만 기존 프롬프트로 생성
        summary_prompt = (
            f"당신은 복지기관에서 사용하는 상담 보고서 요약을 작성하는 역할입니다.\n\n"
            f"당신에게 제공된 상담 원문을 바탕으로 대상자인 **{transcript}**의 상태를 자연스럽고 정확하게 요약하세요.\n\n"
            f"❗️다음 조건을 반드시 지켜주세요:\n"
            f"- 문장은 '대상자님은 ~하고 계십니다'와 같이 3인칭 존칭 시점으로 작성하세요.\n"
            f"- 첫 문장은 '네,', '안녕하세요' 등으로 시작하지 마세요. → ❌\n"
            f"- '~입니다.', '~있습니다.', '~어려워하고 계십니다.'와 같이 자연스럽고 진단적인 톤을 사용하세요.\n"
            f"- GPT형 멘트(예: 요약해 드리겠습니다)는 쓰지 마세요. → ❌\n"
            f"- 한 문단으로 작성하며, 항목 구분이나 줄바꿈 없이 매끄럽게 연결된 문장으로 서술하세요."
        )

        summary_response = client.chat.completions.create(
            model="gpt-4.1",
            messages=[
                {"role": "system", "content": summary_prompt},
                {"role": "user", "content": transcript}
            ]
        )
        summary = summary_response.choices[0].message.content

        # 2. 나머지 항목은 한 번에 JSON으로 생성
        meta_prompt = (
            "아래 상담 대화 원문을 바탕으로 상담일지의 모든 항목(상담일자, 서비스, 담당자, 상담유형, 상담방법, 상담시간, 상담제목, 구분, 대상자, 연락처, 조치사항, 상담자의견, 상담결과, 비고)을 아래 JSON 형식으로 만들어줘. "
            "상담내용(요약)은 이미 따로 생성했으니 제외해도 돼. "
            "각 항목은 대화에 정보가 없더라도 상담의 흐름과 맥락을 바탕으로 반드시 추정해서 한 문장 이상으로 작성해줘. "
            "특히 상담결과, 조치사항, 상담자의견, 비고 등은 빈 문자열로 두지 말고, 대화에서 유추해서라도 반드시 채워줘. "
            "상담일자, 서비스, 담당자 등 명확히 알 수 없는 항목은 '정보 없음'으로 채워줘.\n"
            "단, '연락처' 항목은 반드시 입력값 그대로 사용해줘.\n"
            "{\n"
            "  \"상담일자\": \"\",\n"
            "  \"서비스\": \"\",\n"
            "  \"담당자\": \"\",\n"
            "  \"상담유형\": \"\",\n"
            "  \"상담방법\": \"\",\n"
            "  \"상담시간\": \"\",\n"
            "  \"상담제목\": \"\",\n"
            "  \"구분\": \"\",\n"
            "  \"대상자\": \"\",\n"
            "  \"연락처\": \"입력값 그대로\",\n"
            "  \"조치사항\": \"\",\n"
            "  \"상담자의견\": \"\",\n"
            "  \"상담결과\": \"\",\n"
            "  \"비고\": \"\"\n"
            "}\n"
            "상담 대화:\n" + transcript
        )

        meta_response = client.chat.completions.create(
            model="gpt-4.1",
            messages=[{"role": "system", "content": meta_prompt}]
        )
        meta_json = json.loads(meta_response.choices[0].message.content)

        # 3. 상담내용(요약)만 summary로 대체
        meta_json["상담내용"] = summary

        # 4. 연락처를 입력값 그대로 덮어쓰기
        meta_json["연락처"] = data.contact

        # 4. 템플릿 렌더링
        try:
            tpl = DocxTemplate("상담일지양식.docx")
            tpl.render(meta_json)
        except Exception as e:
            print("[템플릿 렌더링 에러]", str(e))
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"템플릿 렌더링 중 오류: {str(e)}")

        # 5. 저장
        filename = f"journal-{uuid.uuid4()}.docx"
        filepath = f"./generated/{filename}"
        os.makedirs("generated", exist_ok=True)
        try:
            tpl.save(filepath)
        except Exception as e:
            print("[파일 저장 에러]", str(e))
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"docx 파일 저장 중 오류: {str(e)}")

        # 5-1. docx -> pdf 변환
        pdf_filename = filename.replace('.docx', '.pdf')
        pdf_filepath = filepath.replace('.docx', '.pdf')
        try:
            convert_docx_to_pdf(filepath, pdf_filepath)
        except Exception as e:
            import traceback
            print(f"[PDF 변환 오류] {e}")
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"PDF 변환 중 오류: {str(e)}")

        BUCKET_NAME = 'oncare-backend'
        s3 = boto3.client('s3')
        docx_s3_key = f"journal/docx/{filename}"
        pdf_s3_key = f"journal/pdf/{pdf_filename}"
        try:
            s3.upload_file(filepath, BUCKET_NAME, docx_s3_key)
        except Exception as e:
            print("[S3 업로드 중 에러 - DOCX]", str(e))
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"S3 DOCX 업로드 중 오류: {str(e)}")
        try:
            s3.upload_file(pdf_filepath, BUCKET_NAME, pdf_s3_key)
        except Exception as e:
            print("[S3 업로드 중 에러 - PDF]", str(e))
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"S3 PDF 업로드 중 오류: {str(e)}")
        docx_url = f"https://{BUCKET_NAME}.s3.amazonaws.com/{docx_s3_key}"
        pdf_url = f"https://{BUCKET_NAME}.s3.amazonaws.com/{pdf_s3_key}"

        # 5-3. (선택) 로컬 파일 삭제
        os.remove(filepath)
        os.remove(pdf_filepath)

        # 6. 응답
        end = time.time()
        print(f"문서 생성 처리 시간: {end - start:.2f}초")
        return {
            "file": filename,
            "docx_url": docx_url,
            "pdf_url": pdf_url,
            "summary": summary,
            "recommendations": meta_json["조치사항"],
            "opinion": meta_json["상담자의견"],
            "result": meta_json["상담결과"],
            "note": meta_json["비고"]
        }

    @app.post("/convert-journal-pdf")
    def convert_journal_pdf(req: PdfConvertRequest):
        file_name = req.file_name
        BUCKET_NAME = 'oncare-backend'
        s3 = boto3.client('s3')
        docx_s3_key = f"journal/docx/{file_name}"
        pdf_file_name = file_name.replace('.docx', '.pdf')
        pdf_s3_key = f"journal/pdf/{pdf_file_name}"
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                docx_path = os.path.join(tmpdir, file_name)
                pdf_path = os.path.join(tmpdir, pdf_file_name)
                # 1. S3에서 docx 다운로드
                s3.download_file(BUCKET_NAME, docx_s3_key, docx_path)
                # 2. 변환 (OS별 분기)
                try:
                    convert_docx_to_pdf(docx_path, pdf_path)
                except Exception as e:
                    import traceback
                    print(f"[PDF 변환 오류] {e}")
                    traceback.print_exc()
                    raise HTTPException(status_code=500, detail=f"PDF 변환 중 오류: {str(e)}")
                # 3. S3 업로드
                s3.upload_file(pdf_path, BUCKET_NAME, pdf_s3_key)
                pdf_url = f"https://{BUCKET_NAME}.s3.amazonaws.com/{pdf_s3_key}"
            return {"pdf_url": pdf_url}
        except Exception as e:
            import traceback
            print(f"[PDF 변환/업로드 오류] {e}")
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"PDF 변환/업로드 중 오류: {str(e)}")

    @app.post("/download-docx-url")
    def get_docx_download_url(req: FileDownloadRequest):
        BUCKET_NAME = 'oncare-backend'
        s3 = boto3.client('s3')
        docx_s3_key = f"journal/docx/{req.file_name}"
        url = s3.generate_presigned_url(
            ClientMethod='get_object',
            Params={'Bucket': BUCKET_NAME, 'Key': docx_s3_key},
            ExpiresIn=60 * 10  # 10분
        )
        return {"download_url": url}

    @app.post("/download-pdf-url")
    def get_pdf_download_url(req: FileDownloadRequest):
        BUCKET_NAME = 'oncare-backend'
        s3 = boto3.client('s3')
        pdf_s3_key = f"journal/pdf/{req.file_name}"
        url = s3.generate_presigned_url(
            ClientMethod='get_object',
            Params={'Bucket': BUCKET_NAME, 'Key': pdf_s3_key},
            ExpiresIn=60 * 10  # 10분
        )
        return {"download_url": url}

    return app 