from fastapi import FastAPI
from pydantic import BaseModel
from docxtpl import DocxTemplate
from fastapi.middleware.cors import CORSMiddleware
import openai
import os
import uuid
from dotenv import load_dotenv
import json
import time

class JournalRequest(BaseModel):
    text: str
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

def create_report_app() -> FastAPI:
    load_dotenv()
    openai.api_key = os.getenv("OPENAI_API_KEY")

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
        transcript = data.text
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
        summary_response = openai.ChatCompletion.create(
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
            "  \"연락처\": \"\",\n"
            "  \"조치사항\": \"\",\n"
            "  \"상담자의견\": \"\",\n"
            "  \"상담결과\": \"\",\n"
            "  \"비고\": \"\"\n"
            "}\n"
            "상담 대화:\n" + transcript
        )
        meta_response = openai.ChatCompletion.create(
            model="gpt-4.1",
            messages=[{"role": "system", "content": meta_prompt}]
        )
        meta_json = json.loads(meta_response.choices[0].message.content)

        # 3. 상담내용(요약)만 summary로 대체
        meta_json["상담내용"] = summary

        # 4. 템플릿 렌더링
        tpl = DocxTemplate("상담일지양식.docx")
        tpl.render(meta_json)

        # 5. 저장
        filename = f"journal-{uuid.uuid4()}.docx"
        filepath = f"./generated/{filename}"
        os.makedirs("generated", exist_ok=True)
        tpl.save(filepath)

        # 6. 응답
        end = time.time()
        print(f"문서 생성 처리 시간: {end - start:.2f}초")
        return {
            "file": filename,
            "path": filepath,
            "summary": summary,
            "recommendations": meta_json["조치사항"],
            "opinion": meta_json["상담자의견"],
            "result": meta_json["상담결과"],
            "note": meta_json["비고"]
        }

    return app 