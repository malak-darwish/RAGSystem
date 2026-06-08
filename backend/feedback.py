import os
from typing import Optional
from uuid import UUID

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langsmith import Client
from pydantic import BaseModel, Field

load_dotenv()

app = FastAPI(
    title="RAG Feedback API",
    description="Human-in-the-loop feedback collection via LangSmith",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_methods=["POST"],
    allow_headers=["*"],
)


langsmith_client = Client()


class FeedbackRequest(BaseModel):
    run_id: UUID = Field(
        ...,
        description="LangSmith run ID of the RAG trace you want to annotate.",
        json_schema_extra={"example": "123e4567-e89b-12d3-a456-426614174000"},
    )
    score: int = Field(
        ...,
        ge=-1,
        le=1,
        description="Thumbs up = 1, thumbs down = -1. (0 is neutral if you need it.)",
    )
    comment: Optional[str] = Field(
        default=None,
        max_length=2000,
        description="Optional free-text feedback from the user.",
    )


class FeedbackResponse(BaseModel):
    status: str
    feedback_id: str
    message: str

@app.post(
    "/api/feedback",
    response_model=FeedbackResponse,
    summary="Submit thumbs up/down + optional comment for a RAG run",
)
async def submit_feedback(body: FeedbackRequest) -> FeedbackResponse:
    """
    Logs human feedback to LangSmith for the given RAG run.

    - **run_id**: The LangSmith run UUID (your RAG backend should expose this).
    - **score**: `1` = 👍  |  `-1` = 👎
    - **comment**: Optional text box content from the user.
    """
    try:
        feedback = langsmith_client.create_feedback(
            run_id=str(body.run_id),
            key="user_feedback",          # label shown in LangSmith UI
            score=body.score,             # 1 or -1
            comment=body.comment or "",
            feedback_source_type="api",   # marks it as programmatic, not in-UI
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"LangSmith error: {str(exc)}",
        ) from exc

    label = "👍 positive" if body.score == 1 else "👎 negative"
    return FeedbackResponse(
        status="ok",
        feedback_id=str(feedback.id),
        message=f"Feedback recorded as {label}.",
    )

@app.get("/health", include_in_schema=False)
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("feedback:app", host="0.0.0.0", port=8000, reload=True)