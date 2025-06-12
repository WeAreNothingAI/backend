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

def gpt_weekly_report_all(journalSummary, clientName, birthDate, guardianContact, reportDate, socialWorkerName):
    text = "\n".join([
        f"{j['date']} {j['careWorker']} {j['service']} {j['notes']}" for j in journalSummary
    ])
    prompt = (
        f"아래는 요양보호 일지 5개의 요약이야.\n{text}\n\n"
        "아래 항목들은 반드시 모두 포함해서 반환해줘. (누락 없이, 빈 값이라도 반드시 포함)\n"
        "기본 정보(대상자 이름, 생년월일, 보호자 연락처, 보고서 작성일, 작성자(복지사))는 아래 입력값을 그대로 사용하고, "
        "나머지 항목(요양 등급, 건강 및 생활상태 요약, 위험요소, 평가 및 제언, 추천사항, 신체 상태 변화, 정신/정서 상태, 식사 및 수면 패턴, 일지 요약 표)은 네가 생성해줘.\n"
        "기본 정보는 절대 임의로 생성하지 말고, 아래 입력값을 그대로 반환해.\n"
        "입력값:\n"
        f"clientName: {clientName}\n"
        f"birthDate: {birthDate}\n"
        f"guardianContact: {guardianContact}\n"
        f"reportDate: {reportDate}\n"
        f"socialWorkerName: {socialWorkerName}\n"
        "추가 지침:\n"
        "- 보고서 제목은 반드시 'YYYY년 M월 N주차 요양보호 주간보고서' 형식으로, 기간(periodStart~periodEnd) 또는 일지들의 날짜(journalSummary의 date)를 바탕으로 주차를 자동으로 추론해서 작성해줘.\n"
        "- '요양보호 일지 요약' 표 부분은 간결하게, 불필요하게 길지 않게 작성해줘.\n"
        "- 아래 세 항목(3. 건강 및 생활 상태 요약, 4. 위험 요소 및 주의사항, 5. 복지사 평가 및 제언)은 반드시 존댓말(정중한 서술체)로, 실무적으로 신뢰감 있게, 충분히 상세하게 작성해줘. (짧은 단문, 명령문, 생략체 금지)\n"
        "- journalSummary 배열에는 같은 날짜에 여러 개의 일지가 있을 수 있으니, 날짜가 같아도 모든 일지를 표에 빠짐없이 모두 넣어줘.\n"
        "- 절대 날짜별로 하나만 남기거나 합치지 말고, 전달받은 journalSummary 배열의 모든 항목을 표에 그대로 넣어줘.\n"
        "- 아래 JSON 형식으로 반환해줘. (코드블록 없이, 설명 없이, key와 value 모두 쌍따옴표로 감싸고, 모든 항목을 반드시 포함)\n"
        "{\n"
        "  \"title\": \"\",\n"
        "  \"clientName\": \"입력값 그대로\",\n"
        "  \"birthDate\": \"입력값 그대로\",\n"
        "  \"careLevel\": \"\",\n"
        "  \"guardianContact\": \"입력값 그대로\",\n"
        "  \"reportDate\": \"입력값 그대로\",\n"
        "  \"socialWorkerName\": \"입력값 그대로\",\n"
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
        "- 요양 등급(careLevel)은 반드시 어르신의 상태와 일지 내용을 바탕으로 추정해서 채워줘. (예: '요양 2등급', '요양 3등급' 등, 빈 값 금지)\n"
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
    def generate_weekly_report(data: dict):
        try:
            # GPT로 모든 항목 자동 생성 (기본 정보는 입력값 그대로 전달)
            gpt_result = gpt_weekly_report_all(
                data["journalSummary"],
                data.get("clientName", ""),
                data.get("birthDate", ""),
                data.get("guardianContact", ""),
                data.get("reportDate", ""),
                data.get("socialWorkerName", "")
            )
            tpl = DocxTemplate("주간보고서양식.docx")
            context = {
                "title": gpt_result.get("title", ""),
                "clientName": data.get("clientName", ""),
                "birthDate": data.get("birthDate", ""),
                "careLevel": gpt_result.get("careLevel", ""),
                "guardianContact": data.get("guardianContact", ""),
                "reportDate": data.get("reportDate", ""),
                "periodStart": data.get("periodStart", data.get("period_start", "")),
                "periodEnd": data.get("periodEnd", data.get("period_end", "")),
                "socialWorkerName": data.get("socialWorkerName", ""),
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
        s3 = boto3.client('s3', region_name='ap-northeast-2')
        file_name = req.file_name.strip()
        docx_s3_key = f"weekly-report/docx/{file_name}"
        try:
            url = s3.generate_presigned_url(
                ClientMethod='get_object',
                Params={'Bucket': BUCKET_NAME, 'Key': docx_s3_key},
                ExpiresIn=60 * 10  # 10분
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
        return {"download_url": url}

    @app.post("/download-weekly-pdf-url")
    def get_weekly_pdf_download_url(req: FileDownloadRequest):
        BUCKET_NAME = 'oncare-backend'
        s3 = boto3.client('s3', region_name='ap-northeast-2')
        file_name = req.file_name.strip()
        pdf_s3_key = f"weekly-report/pdf/{file_name}"
        try:
            url = s3.generate_presigned_url(
                ClientMethod='get_object',
                Params={'Bucket': BUCKET_NAME, 'Key': pdf_s3_key},
                ExpiresIn=60 * 10  # 10분
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
        return {"download_url": url}

    return app