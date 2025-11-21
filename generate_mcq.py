import os
import json
from groq import Groq
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    print("Error: GROQ_API_KEY not found in .env file.")
    exit(1)

client = Groq(api_key=GROQ_API_KEY)

def get_available_transcripts():
    transcript_dir = "transcripts"
    if not os.path.exists(transcript_dir):
        return []
    return [f for f in os.listdir(transcript_dir) if f.endswith(".txt")]

def select_transcript():
    files = get_available_transcripts()
    if not files:
        print("No transcripts found in 'transcripts' folder.")
        return None
    
    print("\nAvailable Transcripts:")
    for i, f in enumerate(files):
        print(f"{i+1}. {f}")
    
    while True:
        try:
            choice = int(input("\nSelect a transcript (number): "))
            if 1 <= choice <= len(files):
                return os.path.join("transcripts", files[choice-1])
            print("Invalid choice.")
        except ValueError:
            print("Please enter a number.")

def generate_mcqs(transcript_text):
    print("\nGenerating 10 MCQs... (this may take a moment)")
    prompt = f"""
    You are an expert teacher. Create 10 multiple choice questions (MCQs) based on the following transcript.
    
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
            model="groq/compound", # or llama3-70b-8192 or similar if compound not available, assuming compound/mix
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        print(f"Error generating MCQs: {e}")
        # Fallback for models that might not support json mode perfectly or if name is wrong
        # Trying a more standard model name if the above fails is tricky without retry logic, 
        # but let's assume the user's previous code worked with "groq/compound" or similar.
        # Actually, in generate_summary.py it used "groq/compound". 
        return None

def grade_answers(transcript_text, questions, user_answers):
    print("\nGrading your answers... 📝")
    
    # Construct a representation of Q&A for the LLM
    qa_text = ""
    for q in questions:
        ua = user_answers.get(q['id'])
        qa_text += f"Q{q['id']}: {q['question']}\nOptions: {q['options']}\nUser Answer: {ua}\n\n"

    prompt = f"""
    You are a strict but fair grader. 
    Based on the transcript provided below, grade the user's answers to the following 10 MCQs.
    
    For each question:
    1. Indicate if the user was Correct or Incorrect.
    2. If Incorrect, provide the correct answer and a brief explanation.
    
    Finally, provide a total score (e.g., 7/10).

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
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error grading answers: {e}"

def main():
    file_path = select_transcript()
    if not file_path:
        return

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            transcript_text = f.read()
    except Exception as e:
        print(f"Error reading file: {e}")
        return

    mcq_data = generate_mcqs(transcript_text)
    if not mcq_data or "questions" not in mcq_data:
        print("Failed to generate valid MCQs.")
        return

    user_answers = {}
    print("\n--- Quiz Time! ---")
    
    for q in mcq_data["questions"]:
        print(f"\n{q['id']}. {q['question']}")
        for i, opt in enumerate(q['options']):
            print(f"   {chr(65+i)}. {opt}")
        
        while True:
            ans = input("Your answer (A/B/C/D): ").upper().strip()
            if ans in ['A', 'B', 'C', 'D']:
                # Map letter back to option text for the LLM
                user_answers[q['id']] = q['options'][ord(ans) - 65]
                break
            print("Invalid input. Please enter A, B, C, or D.")

    feedback = grade_answers(transcript_text, mcq_data["questions"], user_answers)
    print("\n" + "="*30)
    print("GRADING REPORT")
    print("="*30)
    print(feedback)

if __name__ == "__main__":
    main()
