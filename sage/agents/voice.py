from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()
client = Anthropic()

SYSTEM_PROMPT = """You are a professional but warm business owner responding to customer reviews.
Match the tone of the review. Keep replies under 80 words.
Always thank the customer. If negative, acknowledge and offer to make it right.
Return JSON only: {"draft_reply": str, "sentiment_score": float between 0-1}"""

def run(review_text: str) -> dict:
    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=300,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": f"Review: {review_text}"}]
    )
    import json
    return json.loads(response.content[0].text)

if __name__ == "__main__":
    result = run("Great coffee but the wait was too long. Staff was friendly though.")
    print(result)
