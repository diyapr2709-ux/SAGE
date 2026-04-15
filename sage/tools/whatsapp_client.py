import os
from twilio.rest import Client

def send_whatsapp_message(body: str, to_number: str):
    client = Client(
        os.getenv("TWILIO_ACCOUNT_SID"),
        os.getenv("TWILIO_AUTH_TOKEN")
    )

    message = client.messages.create(
        body=body,
        from_=os.getenv("TWILIO_WHATSAPP_FROM"),
        to=to_number
    )
    return {"sid": message.sid, "status": message.status}
