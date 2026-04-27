from langchain_ollama import OllamaEmbeddings, ChatOllama
import pydantic

print("OllamaEmbeddings fields:")
try:
    print(OllamaEmbeddings.__fields__.keys())
except:
    try:
        print(OllamaEmbeddings.model_fields.keys())
    except:
        print("Could not find fields")

print("\nChatOllama fields:")
try:
    print(ChatOllama.__fields__.keys())
except:
    try:
        print(ChatOllama.model_fields.keys())
    except:
        print("Could not find fields")
