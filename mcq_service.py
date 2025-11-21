import os
import json
from groq import Groq
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY)

class MCQService:
    @staticmethod
    def generate_mcqs_from_text(transcript_text: str):
        prompt = f"""
        You are an expert teacher. Create 5 multiple choice questions (MCQs) based on the following transcript.
        
        Return ONLY a raw JSON object (no markdown formatting, no ```json blocks).
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
            response = client.chat.completions.create(
                model="groq/compound",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.5,
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content
            return json.loads(content)
        except Exception as e:
            print(f"Error generating MCQs: {e}")
            raise e

    @staticmethod
    def grade_mcq_answers(transcript_text: str, questions: list, user_answers: dict):
        # Construct a representation of Q&A for the LLM
        qa_text = ""
        for q in questions:
            # user_answers keys might be strings or ints, normalize to match question id
            ua = user_answers.get(str(q['id'])) or user_answers.get(q['id'])
            qa_text += f"Q{q['id']}: {q['question']}\nOptions: {q['options']}\nUser Answer: {ua}\n\n"

        prompt = f"""
        You are a strict but fair grader. 
        Based on the transcript provided below, grade the user's answers to the following MCQs.
        
        Return ONLY a raw JSON object (no markdown formatting).
        The JSON structure must be:
        {{
            "score": "X/Y",
            "feedback": [
                {{
                    "question_id": 1,
                    "correct": true/false,
                    "correct_answer": "The correct option text",
                    "explanation": "Brief explanation"
                }},
                ...
            ]
        }}

        Transcript:
        {transcript_text[:15000]}

        User's Q&A:
        {qa_text}
        """

        try:
            response = client.chat.completions.create(
                model="groq/compound",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            print(f"Error grading answers: {e}")
            raise e
