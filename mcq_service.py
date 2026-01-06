import os
import json
import re
from huggingface_hub import InferenceClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
HF_TOKEN = os.getenv("HF_TOKEN")

# Models suggested for high-quality RAG/MCQ workflows
# Qwen3-8B for fast, accurate generation
GENERATION_MODEL = "Qwen/Qwen3-8B" 
# Prometheus is the gold-standard open-source judge model
JUDGE_MODEL = "Qwen/Qwen2.5-7B-Instruct"

# Initialize Hugging Face Inference Client (Model is specified in the call now)
hf_client = InferenceClient(
    token=HF_TOKEN,
    timeout=120
)

class MCQService:
    @staticmethod
    def generate_mcqs_from_text(transcript_text: str):
        """Generates MCQs using the Chat Completion API (Conversational Task)"""
        system_prompt = "You are an expert teacher. Create 5 multiple choice questions (MCQs) based on the provided transcript."
        user_prompt = f"""Return ONLY a raw JSON object.
        The JSON structure must be:
        {{
            "questions": [
                {{
                    "id": 1,
                    "question": "Question text here",
                    "options": ["Option A", "Option B", "Option C", "Option D"]
                }},
                ...
            ]
        }}

        Transcript:
        {transcript_text[:15000]}
        """
        
        try:
            # Use chat_completion to satisfy the "conversational" task requirement
            response = hf_client.chat_completion(
                model=GENERATION_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=1000,
                temperature=0.5,
                top_p=0.9
            )
            
            content = response.choices[0].message.content.strip()
            
            # Clean and extract JSON
            content = re.sub(r'^```json\s*', '', content, flags=re.MULTILINE)
            content = re.sub(r'^```\s*', '', content, flags=re.MULTILINE)
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                content = json_match.group(0)
            
            return json.loads(content)
        except Exception as e:
            print(f"Error generating MCQs: {e}")
            raise e

    @staticmethod
    def grade_mcq_answers(transcript_text: str, questions: list, user_answers: dict):
        """Implements LLM-as-a-judge with a formal grading rubric"""
        
        qa_text = ""
        for q in questions:
            ua = user_answers.get(str(q['id'])) or user_answers.get(q['id'])
            qa_text += f"Q{q['id']}: {q['question']}\nOptions: {q['options']}\nUser Answer: {ua}\n\n"

        # Grading Rubric as suggested for LLM-as-a-judge
        rubric = """
        ### Grading Rubric:
        1. Accuracy: Is the user's answer factually supported by the transcript?
        2. Correctness: Compare the user's answer to the context.
        3. Logic: Provide a clear explanation for WHY the answer is correct or incorrect based on the text.
        """

        system_prompt = f"You are a strict but fair grader. {rubric}"
        user_prompt = f"""Grade the user's answers based on the transcript. 
        Return ONLY a raw JSON object.
        {{
            "score": "X/Y",
            "feedback": [
                {{
                    "question_id": 1,
                    "correct": true/false,
                    "correct_answer": "Text of correct option",
                    "explanation": "Brief rubric-based explanation"
                }}
            ]
        }}

        Transcript:
        {transcript_text[:15000]}

        User's Q&A:
        {qa_text}
        """

        try:
            response = hf_client.chat_completion(
                model=JUDGE_MODEL, # Using specialized Judge model
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=1200,
                temperature=0.2, # Lower temperature for objective grading
                top_p=0.9
            )
            
            content = response.choices[0].message.content.strip()
            
            # Clean and extract JSON
            content = re.sub(r'^```json\s*', '', content, flags=re.MULTILINE)
            content = re.sub(r'^```\s*', '', content, flags=re.MULTILINE)
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                content = json_match.group(0)
            
            # Additional cleaning: remove trailing commas before closing braces/brackets
            content = re.sub(r',(\s*[}\]])', r'\1', content)
            
            return json.loads(content)
        except Exception as e:
            print(f"Error grading answers: {e}")
            raise e