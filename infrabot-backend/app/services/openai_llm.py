# openai_llm.py

import os
import logging
from typing import Any, Dict
from langchain_openai import AzureChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder

logger = logging.getLogger(__name__)


AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")


class CustomAzureChatOpenAI(AzureChatOpenAI):
    """Custom AzureChatOpenAI with enhanced error handling and consistent parameters."""

    @property
    def _default_params(self) -> Dict[str, Any]:
        """Get the default parameters for calling the API."""
        params = super()._default_params
        params.pop("temperature", None)
        # Add default timeout
        params["timeout"] = 60
        return params


def init_azure_chat_openai():
    """Initialize Azure OpenAI with enhanced error handling."""
    api_key_str = os.getenv("AZURE_OPENAI_API_KEY")
    azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    api_version = os.getenv("AZURE_OPENAI_API_VERSION")
    deployment_name = os.getenv("AZURE_OPENAI_DEPLOYMENT")
    model_name = os.getenv("OPENAI_MODEL_NAME")

    # Validate all required environment variables
    required_vars = {
        "AZURE_OPENAI_API_KEY": api_key_str,
        "AZURE_OPENAI_ENDPOINT": azure_endpoint,
        "AZURE_OPENAI_API_VERSION": api_version,
        "AZURE_OPENAI_DEPLOYMENT": deployment_name
    }
    
    missing_vars = [var for var, value in required_vars.items() if not value]
    if missing_vars:
        raise EnvironmentError(f"Missing required environment variables: {', '.join(missing_vars)}")

    try:
        llm = CustomAzureChatOpenAI(
            azure_deployment=deployment_name,
            model=model_name,
            api_key=api_key_str,  
            azure_endpoint=azure_endpoint,
            api_version=api_version,
            max_retries=3,
            timeout=60,
            temperature=0.1,  # Low temperature for consistent responses
        )
        logger.info(f"AzureChatOpenAI initialized successfully with deployment '{deployment_name}'")
        return llm
    except Exception as e:
        logger.error(f"Failed to initialize Azure OpenAI: {e}")
        raise

def create_chat_prompt_template():
    system_prompt = (
        "Make a friendly and brief engaging greeting response to the user if they greet you or ask about your day\n"
        "You are an AI Assistant for 'Prodapt Global IT' trained to help users solve their IT related issues\n" 
        "You should answer IT related questions based on the retrieved contexts.\n"
        "If the user's IT related query is unclear, ambiguous, or lacks enough detail, "
        "ask the user specific clarifying questions to better understand the problem before attempting to answer.\n"
        "Use only the retrieved content to answer the IT related issues.\n"
        "If you don't know the answer, say that you can't help with the query at the moment or that it is out of scope to answer.\n"
        "try to give answers in clear steps if possible.\n"
        "Answer to the input at hand and do not provide any additional information unless provided in the context.\n"
        "Do not mention about the knowledge base in your responses.\n"
        "If the user asks about any software installation, upgrade or configuration to be done ask them to raise a ticket in the helpdesk portal.\n"
        "If the user asks for information outside IT scope, inform them that it is out of scope.\n"
        "If the user indicates they want to end the conversation, confirm with them and then end the conversation.\n"
        "\n{context}"

    )

    return ChatPromptTemplate.from_messages(
        [
            ("system", system_prompt),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
        ]
    )
