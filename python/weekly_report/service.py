import os
import uuid
import platform
import subprocess
import boto3
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from docxtpl import DocxTemplate
from openai import OpenAI
from docx import Document

from fastapi.middleware.cors import CORSMiddleware

# OpenAI API 키 로딩 (환경변수)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class WeeklyReportRequest(BaseModel):
    journalSummary: list  # [{date, careWorker, service, notes}, ...]
    summary: str = None
    riskNotes: str = None
    evaluation: str = None
    suggestion: str = None
    # 기본 정보도 GPT가 생성하므로 입력값에서 제외

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

def gpt_weekly_report_all(journalSummary):
    text = "\n".join([
        f"{j['date']} {j['careWorker']} {j['service']} {j['notes']}" for j in journalSummary
    ])
    prompt = (
        f"아래는 요양보호 일지 5개의 요약이야.\n{text}\n\n"
        "이 내용을 바탕으로 주간보고서의 모든 기본 정보 항목(보고서 제목, 대상자 이름, 생년월일, 요양 등급, 보호자 연락처, 보고서 작성일, 작성자(복지사))와 "
        "건강 및 생활상태 요약, 위험요소, 복지사 평가 및 제언, 추천사항을 아래 JSON 형식으로 만들어줘. "
        "각 항목은 대화에 정보가 없더라도 맥락을 바탕으로 반드시 추정해서 한 문장 이상으로 작성해줘. "
        "특히 기본 정보 항목도 빈 문자열로 두지 말고, 대화에서 유추해서라도 반드시 채워줘. "
        "그리고, 아래 5개 일지를 표에 넣을 수 있도록 각 일지별로 date, careWorker, service, notes를 한 줄로 요약해서 배열(journalSummary)로 만들어줘. "
        "또한, 아래 항목도 반드시 포함해서 작성해줘.\n"
        "physicalStatus: 신체 상태 변화 한 문장 요약\n"
        "mentalStatus: 정신/정서 상태 한 문장 요약\n"
        "mealSleepPattern: 식사 및 수면 패턴 한 문장 요약\n"
        "아래 JSON 형식으로 반환해줘.\n"
        "{\n"
        "  \"title\": \"\",\n"
        "  \"clientName\": \"\",\n"
        "  \"birthDate\": \"\",\n"
        "  \"careLevel\": \"\",\n"
        "  \"guardianContact\": \"\",\n"
        "  \"reportDate\": \"\",\n"
        "  \"socialWorkerName\": \"\",\n"
        "  \"summary\": \"\",\n"
        "  \"riskNotes\": \"\",\n"
        "  \"evaluation\": \"\",\n"
        "  \"suggestion\": \"\",\n"
        "  \"physicalStatus\": \"\",\n"
        "  \"mentalStatus\": \"\",\n"
        "  \"mealSleepPattern\": \"\",\n"
        "  \"journalSummary\": [\n"
        "    {\"date\": \"\", \"careWorker\": \"\", \"service\": \"\", \"notes\": \"\"},\n"
        "    ...\n"
        "  ]\n"
        "}\n"
        "반드시 코드블록 없이, key와 value 모두 쌍따옴표로 감싼 올바른 JSON만 반환해줘. 설명, 주석, 코드블록, 불필요한 텍스트 없이 JSON만 출력해."
    )
    response = client.chat.completions.create(
        model="gpt-4.1",
        messages=[{"role": "system", "content": prompt}]
    )
    content = response.choices[0].message.content.strip()
    # 코드블록 제거
    if content.startswith("```"):
        import re
        content = re.sub(r"^```[a-zA-Z]*\n?", "", content)
        content = re.sub(r"\n?```$", "", content)
    import json as pyjson
    return pyjson.loads(content)

def remove_empty_table_rows(docx_path):
    doc = Document(docx_path)
    for table in doc.tables:
        rows_to_remove = []
        for i, row in enumerate(table.rows):
            if all(cell.text.strip() == "" for cell in row.cells):
                rows_to_remove.append(i)
        for i in reversed(rows_to_remove):
            tbl = table._tbl
            tr = table.rows[i]._tr
            tbl.remove(tr)
    doc.save(docx_path)

def create_weekly_report_app() -> FastAPI:
    app = FastAPI(strict_slashes=False)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.post("/")
    def generate_weekly_report(data: WeeklyReportRequest):
        try:
            # GPT로 모든 항목 자동 생성
            gpt_result = gpt_weekly_report_all(data.journalSummary)
            tpl = DocxTemplate("주간보고서양식.docx")
            context = {
                "title": gpt_result.get("title", ""),
                "clientName": gpt_result.get("clientName", ""),
                "birthDate": gpt_result.get("birthDate", ""),
                "careLevel": gpt_result.get("careLevel", ""),
                "guardianContact": gpt_result.get("guardianContact", ""),
                "reportDate": gpt_result.get("reportDate", ""),
                "periodStart": getattr(data, "periodStart", getattr(data, "period_start", "")),
                "periodEnd": getattr(data, "periodEnd", getattr(data, "period_end", "")),
                "socialWorkerName": gpt_result.get("socialWorkerName", ""),
                "journalSummary": gpt_result.get("journalSummary", []),
                "summary": gpt_result.get("summary", ""),
                "riskNotes": gpt_result.get("riskNotes", ""),
                "evaluation": gpt_result.get("evaluation", ""),
                "suggestion": gpt_result.get("suggestion", ""),
                "physicalStatus": gpt_result.get("physicalStatus", ""),
                "mentalStatus": gpt_result.get("mentalStatus", ""),
                "mealSleepPattern": gpt_result.get("mealSleepPattern", ""),
            }
            tpl.render(context)

            # 파일명/경로
            filename = f"weekly-report-{uuid.uuid4()}.docx"
            pdf_filename = filename.replace('.docx', '.pdf')
            os.makedirs("generated", exist_ok=True)
            docx_path = os.path.join("generated", filename)
            pdf_path = os.path.join("generated", pdf_filename)

            # docx 저장
            tpl.save(docx_path)

            # 빈 표 행(빈 줄) 삭제 후처리
            remove_empty_table_rows(docx_path)

            # docx → pdf 변환
            convert_docx_to_pdf(docx_path, pdf_path)

            # S3 업로드
            BUCKET_NAME = 'oncare-backend'
            s3 = boto3.client('s3')
            docx_s3_key = f"weekly-report/docx/{filename}"
            pdf_s3_key = f"weekly-report/pdf/{pdf_filename}"

            s3.upload_file(docx_path, BUCKET_NAME, docx_s3_key)
            s3.upload_file(pdf_path, BUCKET_NAME, pdf_s3_key)

            docx_url = f"https://{BUCKET_NAME}.s3.amazonaws.com/{docx_s3_key}"
            pdf_url = f"https://{BUCKET_NAME}.s3.amazonaws.com/{pdf_s3_key}"

            # (선택) 로컬 파일 삭제
            os.remove(docx_path)
            os.remove(pdf_path)

            return {
                "file": filename,
                "docx_url": docx_url,
                "pdf_url": pdf_url,
                "exportedDocx": docx_url,
                "exportedPdf": pdf_url,
                "periodStart": context["periodStart"],
                "periodEnd": context["periodEnd"],
                **{
                    "title": context["title"],
                    "clientName": context["clientName"],
                    "birthDate": context["birthDate"],
                    "careLevel": context["careLevel"],
                    "guardianContact": context["guardianContact"],
                    "reportDate": context["reportDate"],
                    "socialWorkerName": context["socialWorkerName"],
                    "journalSummary": context["journalSummary"],
                    "summary": context["summary"],
                    "physicalStatus": context["physicalStatus"],
                    "mentalStatus": context["mentalStatus"],
                    "mealSleepPattern": context["mealSleepPattern"],
                    "riskNotes": context["riskNotes"],
                    "evaluation": context["evaluation"],
                    "suggestion": context["suggestion"],
                }
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/download-weekly-docx-url")
    def get_weekly_docx_download_url(req: FileDownloadRequest):
        BUCKET_NAME = 'oncare-backend'
        s3 = boto3.client('s3')
        docx_s3_key = f"weekly-report/docx/{req.file_name}"
        url = s3.generate_presigned_url(
            ClientMethod='get_object',
            Params={'Bucket': BUCKET_NAME, 'Key': docx_s3_key},
            ExpiresIn=60 * 10  # 10분
        )
        return {"download_url": url}

    @app.post("/download-weekly-pdf-url")
    def get_weekly_pdf_download_url(req: FileDownloadRequest):
        BUCKET_NAME = 'oncare-backend'
        s3 = boto3.client('s3')
        pdf_s3_key = f"weekly-report/pdf/{req.file_name}"
        url = s3.generate_presigned_url(
            ClientMethod='get_object',
            Params={'Bucket': BUCKET_NAME, 'Key': pdf_s3_key},
            ExpiresIn=60 * 10  # 10분
        )
        return {"download_url": url}

    return app