from fastapi import APIRouter
from pydantic import BaseModel
from docxtpl import DocxTemplate
import openai
import os
import uuid

openai.api_key = os.getenv("OPENAI_API_KEY")

router = APIRouter()

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


@router.post("/")
def generate_journal_docx(data: JournalRequest):
        # 1. 상담내용 요약 GPT 호출
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
              {
                "role": "system",
                "content": (
                    f"당신은 복지기관에서 사용하는 상담 보고서 요약을 작성하는 역할입니다.\n\n"
                    f"당신에게 제공된 상담 원문을 바탕으로 대상자인 **{data.client}님**의 상태를 자연스럽고 정확하게 요약하세요.\n\n"
                    f"❗️다음 조건을 반드시 지켜주세요:\n"
                    f"- 문장은 '{data.client}님은 ~하고 계십니다'와 같이 3인칭 존칭 시점으로 작성하세요.\n"
                    f"- 첫 문장은 '네,', '안녕하세요' 등으로 시작하지 마세요. → ❌\n"
                    f"- '~입니다.', '~있습니다.', '~어려워하고 계십니다.'와 같이 자연스럽고 진단적인 톤을 사용하세요.\n"
                    f"- GPT형 멘트(예: 요약해 드리겠습니다)는 쓰지 마세요. → ❌\n"
                    f"- 한 문단으로 작성하며, 항목 구분이나 줄바꿈 없이 매끄럽게 연결된 문장으로 서술하세요."
                )
              },
            {
                "role": "user",
                "content": data.text
            }
          ]
        )
        gpt_result = response.choices[0].message.content

        # 2. 조치사항 GPT 호출
        action_response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": (
                        f"당신은 복지기관 상담 보고서의 '조치사항'을 작성하는 역할입니다. "
                        f"아래 상담 내용을 참고하여, 대상자에게 필요한 조치사항을 한 문장으로 작성하세요."
                    )
                },
                {
                    "role": "user",
                    "content": gpt_result
                }
            ]
        )
        gpt_action = action_response.choices[0].message.content

        # 3. 템플릿 채우기
        tpl = DocxTemplate("상담일지양식.docx")
        tpl.render({
            "상담일자": data.date,
            "서비스": data.service,
            "담당자": data.manager,
            "상담유형": data.type,
            "상담방법": data.method,
            "상담시간": data.time,
            "상담제목": data.title,
            "구분": data.category,
            "대상자": data.client,
            "연락처": data.contact,
            "조치사항": gpt_action,
            "상담내용": gpt_result,
            "상담자의견": data.opinion,
            "상담결과": data.result,
            "비고": data.note
        })

        # 4. 저장
        filename = f"journal-{uuid.uuid4()}.docx"
        filepath = f"./generated/{filename}"
        os.makedirs("generated", exist_ok=True)
        tpl.save(filepath)

        # 5. 응답
        return {
            "file": filename,
            "path": filepath
        }
