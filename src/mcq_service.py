import json
import re

class MCQService:
    @staticmethod
    def generate_mcqs_from_text(transcript_text: str, llm):
        """Generates MCQs using the provided LLM instance."""
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
            # Construct message for LangChain LLM
            prompt = f"{system_prompt}\n\n{user_prompt}"
            response = llm.invoke(prompt)
            content = response.content.strip()
            
            # Clean thinking tags if present
            content = re.sub(r'<thought>.*?</thought>', '', content, flags=re.DOTALL)
            content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL)
            content = content.strip()
            
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
    def grade_mcq_answers(transcript_text: str, questions: list, user_answers: dict, llm):
        """Implements LLM-as-a-judge with a formal grading rubric"""
        
        qa_text = ""
        for q in questions:
            ua = user_answers.get(str(q['id'])) or user_answers.get(q['id'])
            qa_text += f"Q{q['id']}: {q['question']}\nOptions: {q['options']}\nUser Answer: {ua}\n\n"

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
            prompt = f"{system_prompt}\n\n{user_prompt}"
            response = llm.invoke(prompt)
            content = response.content.strip()
            
            # Clean thinking tags
            content = re.sub(r'<thought>.*?</thought>', '', content, flags=re.DOTALL)
            content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL)
            content = content.strip()
            
            # Clean and extract JSON
            content = re.sub(r'^```json\s*', '', content, flags=re.MULTILINE)
            content = re.sub(r'^```\s*', '', content, flags=re.MULTILINE)
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                content = json_match.group(0)
            
            # Additional cleaning
            content = re.sub(r',(\s*[}\]])', r'\1', content)
            
            return json.loads(content)
        except Exception as e:
            print(f"Error grading answers: {e}")
            raise e