
import os
import time
from typing import List, Protocol
from abc import ABC, abstractmethod
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_core.prompts import PromptTemplate
from loguru import logger
from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type, RetryError
from google.api_core.exceptions import ResourceExhausted

load_dotenv()

class AIServiceInterface(ABC):
    @abstractmethod
    def summarize(self, text: str) -> dict:
        pass

    @abstractmethod
    def embed(self, text: str) -> List[float]:
        pass

class BaseAIService(AIServiceInterface):
    def __init__(self):
        self.summary_prompt = PromptTemplate.from_template(
            """
            System: You are a professional news editor and sentiment analyst.
            Task: 
            1. Summarize the following news article into 3 concise bullet points in English.
            2. Analyze the sentiment of the article and assign a score between 0.0 (Negative/Disaster) and 1.0 (Positive/Development).
            3. Categorize the article into ONE of the following: Politics, Economy, Sports, Technology, Entertainment, Local, Disaster, Other.
            
            Constraints:
            - Output MUST be a valid JSON object.
            - Keys: "summary" (string bullet points), "sentiment_score" (float), "category" (string).
            - Start each bullet point in the summary with "* ".
            - Do NOT include markdown code blocks (```json ... ```). Just the raw JSON string.
            
            Article:
            {text}
            
            Output JSON:
            """
        )

# --- Gemini Service ---
class GeminiAIService(BaseAIService):
    def __init__(self):
        super().__init__()
        google_api_key = os.getenv("GOOGLE_API_KEY")
        if not google_api_key:
            raise ValueError("GOOGLE_API_KEY is not set in environment variables.")

        # Rate Limiting Configuration (Free Tier: 15 RPM)
        self.rpm_limit = 15
        self.min_interval = 60.0 / self.rpm_limit 
        self.last_call_time = 0.0

        # Gemini 2.5 Flash
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash", 
            google_api_key=google_api_key,
            temperature=0.3
        )
        
        # Google Text Embeddings 004 (768 Dimensions)
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/text-embedding-004", 
            google_api_key=google_api_key
        )
        
        self.summary_chain = self.summary_prompt | self.llm

    def _wait_for_rate_limit(self):
        """Enforce strict 15 RPM limit by waiting."""
        current_time = time.time()
        elapsed = current_time - self.last_call_time
        if elapsed < self.min_interval:
            sleep_time = self.min_interval - elapsed
            logger.info(f"Rate Limiting: Sleeping for {sleep_time:.2f}s...")
            time.sleep(sleep_time)
        self.last_call_time = time.time()

    @retry(
        retry=retry_if_exception_type(ResourceExhausted),
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=2, min=4, max=60),
        before_sleep=lambda retry_state: logger.warning(f"Rate Limit Hit (429) on [gemini-2.5-flash]. Retrying in {retry_state.next_action.sleep}s...")
    )
    def summarize(self, text: str) -> dict:
        self._wait_for_rate_limit()
        try:
            truncated_text = text[:10000]
            response = self.summary_chain.invoke({"text": truncated_text})
            content = response.content.strip()
            
            # Simple cleanup if model sends markdown
            if content.startswith("```json"):
                content = content.replace("```json", "").replace("```", "")
            if content.startswith("```"):
                 content = content.replace("```", "")
                 
            import json
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                logger.error(f"JSON Parsing failed. Raw content: {content}")
                # Fallback: try to just return summary structure if possible or empty
                return {"summary": content, "sentiment_score": 0.5, "category": "General"}

        except ResourceExhausted as e:
            raise e
        except RetryError as e:
            raise e
        except Exception as e:
            logger.error(f"Error generating summary: {e}")
            return {}

    @retry(
        retry=retry_if_exception_type(ResourceExhausted),
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=2, min=4, max=60),
        before_sleep=lambda retry_state: logger.warning(f"Rate Limit Hit (429) on [text-embedding-004]. Retrying in {retry_state.next_action.sleep}s...")
    )
    def embed(self, text: str) -> List[float]:
        self._wait_for_rate_limit()
        try:
            clean_text = text.replace("\n", " ")
            vector = self.embeddings.embed_query(clean_text)
            return vector
        except ResourceExhausted as e:
            raise e
        except RetryError as e:
            raise e
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            return []

# --- Ollama Service ---
class OllamaAIService(BaseAIService):
    def __init__(self):
        super().__init__()
        self.base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.model = os.getenv("OLLAMA_MODEL", "llama3.1:latest")
        
        logger.info(f"Initializing Ollama Service with URL={self.base_url}, Model={self.model}")

        self.llm = ChatOllama(
            base_url=self.base_url,
            model=self.model,
            temperature=0.3
        )

        self.embeddings = OllamaEmbeddings(
            base_url=self.base_url,
            model="nomic-embed-text" 
        )
        
        self.summary_chain = self.summary_prompt | self.llm

    def summarize(self, text: str) -> dict:
        try:
            # Check context window limits if necessary, but Ollama handles it or truncates
            # We can still truncate to be safe/faster
            truncated_text = text[:10000]
            response = self.summary_chain.invoke({"text": truncated_text})
            content = response.content.strip()

            # Simple cleanup if model sends markdown
            if content.startswith("```json"):
                content = content.replace("```json", "").replace("```", "")
            if content.startswith("```"):
                 content = content.replace("```", "")
                 
            import json
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                logger.error(f"JSON Parsing failed (Ollama). Raw content: {content}")
                 # Fallback
                return {"summary": content, "sentiment_score": 0.5, "category": "General"}

        except Exception as e:
            logger.error(f"Error generating summary (Ollama): {e}")
            return {}

    def embed(self, text: str) -> List[float]:
        try:
            clean_text = text.replace("\n", " ")
            # Truncate to avoid context length errors:
            # nomic-embed-text v1.5: 8192, but older/default might be 2048
            # Safe limit: 6000 chars (approx 1500 tokens)
            truncated_text = clean_text[:6000] 
            vector = self.embeddings.embed_query(truncated_text)
            return vector
        except Exception as e:
            logger.error(f"Error generating embedding (Ollama): {e}")
            return []

# --- Factory ---
def get_ai_service() -> AIServiceInterface:
    provider = os.getenv("LLM_PROVIDER", "gemini").lower()
    
    if provider == "ollama":
        return OllamaAIService()
    elif provider == "gemini":
        return GeminiAIService()
    else:
        logger.warning(f"Unknown LLM_PROVIDER '{provider}', defaulting to Gemini")
        return GeminiAIService()
