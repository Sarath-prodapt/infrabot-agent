# openai_llm.py

import os
import logging
from pydantic import SecretStr
from langchain_openai import AzureChatOpenAI
from langchain.prompts import ChatPromptTemplate


AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")


def init_azure_chat_openai():
    """Initialize Azure OpenAI Chat model."""
    logging.info("Initializing AzureChatOpenAI...")
    if not all([AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_VERSION, AZURE_OPENAI_DEPLOYMENT, os.getenv("AZURE_OPENAI_API_KEY")]):
        raise EnvironmentError(
            "Missing one or more required environment variables for Azure OpenAI: "
            "'AZURE_OPENAI_ENDPOINT', 'AZURE_OPENAI_API_VERSION', 'AZURE_OPENAI_DEPLOYMENT', 'AZURE_OPENAI_API_KEY'."
        )

    llm = AzureChatOpenAI(
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
        api_version=AZURE_OPENAI_API_VERSION,
        azure_deployment=AZURE_OPENAI_DEPLOYMENT,
        api_key=SecretStr(os.getenv("AZURE_OPENAI_API_KEY")), 
        model_kwargs={
            "max_completion_tokens": 1024,
        },
    )
    logging.info(f"AzureChatOpenAI initialized with deployment '{AZURE_OPENAI_DEPLOYMENT}'.")
    return llm

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
        "If the user asks for information outside IT scope, inform them that it is out of scope.\n"
        "If the user indicates they want to end the conversation, confirm with them and then end the conversation.\n"
        "\n{context}"

    )

    return ChatPromptTemplate.from_messages([("system", system_prompt), ("human", "{input}"),])
