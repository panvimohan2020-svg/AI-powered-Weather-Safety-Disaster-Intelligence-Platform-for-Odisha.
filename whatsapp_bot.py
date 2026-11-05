from fastapi import APIRouter, Request, Form, Response
from twilio.twiml.messaging_response import MessagingResponse
import httpx
import json

whatsapp_router = APIRouter()

# Odia Translations Dictionary for Task-Specific Directives
ODIA_TRANSLATIONS = {
    "GREEN": "🟢 ସବୁଜ ସଙ୍କେତ: କାମ କରିବା ପାଇଁ ପାଗ ଅନୁକୂଳ ଅଟେ। (Safe to work)",
    "YELLOW": "🟡 ସତର୍କ ସୂଚନା: ମଧ୍ୟମ ଧରଣର ବିପଦ। ଛାଇରେ ବିଶ୍ରାମ ନିଅନ୍ତୁ ଏବଂ ପାଣି ପିଅନ୍ତୁ। (Moderate risk. Rest in shade and drink water)",
    "ORANGE": "🟠 ଉଚ୍ଚ ସତର୍କତା: ଉଚ୍ଚ ବିପଦ। ବାହାରେ କାମ ସୀମିତ ରଖନ୍ତୁ ଏବଂ ସତର୍କ ରୁହନ୍ତୁ। (Elevated risk. Restrict heavy outdoor labor)",
    "RED": "🔴 ବିପଦ: ବାହାରେ କାମ କରିବା ସମ୍ପୂର୍ଣ୍ଣ ମନା! ପ୍ରବଳ ଖରା କିମ୍ବା ବର୍ଷା ଆଶଙ୍କା। (Danger! Outdoor work strictly prohibited!)",
    "ERROR": "କ୍ଷମା କରିବେ, ଆମେ ଆପଣଙ୍କର ସ୍ଥାନ ଖୋଜିବାରେ ଅସମର୍ଥ। ଦୟାକରି ଆପଣଙ୍କର ଲୋକେସନ୍ (Location) ପୁଣିଥରେ ପଠାନ୍ତୁ।" 
}

@whatsapp_router.post("/api/whatsapp")
async def whatsapp_webhook(
    request: Request,
    Latitude: float = Form(None),
    Longitude: float = Form(None),
    Body: str = Form("")
):
    """
    Twilio Webhook Endpoint for WhatsApp.
    Receives incoming WhatsApp messages, extracts location, and returns an Odia directive.
    """
    resp = MessagingResponse()
    
    # 1. Zero-Input Friction Validation
    if Latitude is None or Longitude is None:
        # Prompt user to send a location pin if they just typed text
        resp.message("ନମସ୍କାର! ଆପଣଙ୍କ ଅଞ୍ଚଳର ପାଗ ଏବଂ କାମ କରିବାର ସୁରକ୍ଷା ଜାଣିବା ପାଇଁ, ଦୟାକରି ଆପଣଙ୍କର WhatsApp 'Location' 📍 ପଠାନ୍ତୁ।")
        return Response(content=str(resp), media_type="application/xml")
        
    # 2. Call the internal WRI Zero-Input Pipeline
    # We call our own local FastAPI server so we reuse the exact same ML model and logic
    async with httpx.AsyncClient() as client:
        try:
            # Note: In production, you might want to call the internal python function directly 
            # instead of an HTTP request to yourself to save latency, but this keeps domains isolated.
            api_resp = await client.post(
                "http://127.0.0.1:8000/api/predict", 
                json={"latitude": Latitude, "longitude": Longitude},
                timeout=10.0
            )
            api_resp.raise_for_status()
            data = api_resp.json()
        except Exception as e:
            print(f"Internal API Error: {e}")
            resp.message(ODIA_TRANSLATIONS["ERROR"])
            return Response(content=str(resp), media_type="application/xml")
            
    # 3. Task-Specific Directive Translation
    zone = data["wri"]["zone"]
    score = data["wri"]["wri_score"]
    
    # 4. Formulate the Odia WhatsApp Payload
    odia_msg = f"📍 ଓଡିଶା WRI ରିପୋର୍ଟ\n\n"
    odia_msg += ODIA_TRANSLATIONS.get(zone, "") + "\n\n"
    odia_msg += f"📊 ରିସ୍କ ସ୍କୋର (Risk Score): {score:.1f}/10\n"
    
    resp.message(odia_msg)
    
    return Response(content=str(resp), media_type="application/xml")
