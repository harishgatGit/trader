import requests
import json
from typing import Dict, Any, Optional
from app.config import CURRENT_APP_CALLBACK_URL, CURRENT_APP_CALLBACK_API_KEY

class CallbackService:
    def __init__(self):
        self.url = CURRENT_APP_CALLBACK_URL
        self.api_key = CURRENT_APP_CALLBACK_API_KEY

    def send_callback(self, payload: Dict[str, Any]) -> bool:
        """
        Sends job status changes back to the NestJS backend.
        """
        headers = {
            "Content-Type": "application/json",
            "x-api-key": self.api_key
        }
        
        try:
            print(f"Sending callback to NestJS backend for {payload.get('ticker')} ({payload.get('status')}): {self.url}")
            response = requests.post(
                self.url,
                data=json.dumps(payload),
                headers=headers,
                timeout=10
            )
            if response.status_code in (200, 201):
                print("Callback sent successfully.")
                return True
            else:
                print(f"Callback returned status code {response.status_code}: {response.text}")
                return False
        except Exception as e:
            print(f"Failed to send callback to NestJS backend: {e}")
            return False
