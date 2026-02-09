import re
from fastapi import HTTPException
import traceback

class MindMapService:
    @staticmethod
    def generate_mind_map(transcript_text, llm):
        try:
            prompt = f"""
            Based on the following transcript, create a comprehensive mind map in Mermaid.js format.
            The mind map should capture the main topics, subtopics, and key details.
            Use the 'mindmap' syntax of Mermaid.js.
            
            Example format:
            mindmap
                root((Main Topic))
                    Subtopic 1
                        Detail 1
                        Detail 2
                    Subtopic 2
                        Detail 3
            
            Return ONLY the Mermaid.js code block, starting with 'mindmap'.
            Do not include any other text or explanations.
            
            Transcript:
            {transcript_text[:4000]}
            """
            
            response = llm.invoke(prompt)
            content = response.content.strip()
            
            # Clean thinking/thought tags if present
            content = re.sub(r'<thought>.*?</thought>', '', content, flags=re.DOTALL)
            content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL)
            
            # Extract mermaid code block if LLM included it in markdown
            mermaid_match = re.search(r'```(?:mermaid)?(.*?)```', content, re.DOTALL)
            if mermaid_match:
                content = mermaid_match.group(1).strip()
            
            # Remove any trailing text that LLM might have added
            lines = content.split('\n')
            clean_lines = []
            for line in lines:
                if line.strip().startswith('mindmap') or (clean_lines and line.strip()):
                    clean_lines.append(line)
            content = '\n'.join(clean_lines)

            # Ensure it starts with mindmap
            if 'mindmap' not in content.lower():
                # If keyword is missing, prepend it and assume root indentation
                content = "mindmap\n    root((" + (transcript_text[:50].replace('\n', ' ') + "...") + "))\n" + content
            elif not content.strip().startswith('mindmap'):
                # Try to find where mindmap starts
                start_idx = content.lower().find('mindmap')
                if start_idx != -1:
                    content = content[start_idx:]
            
            return content.strip()
        except Exception as e:
            print(f"Mind map generation error: {e}")
            print(traceback.format_exc())
            raise HTTPException(status_code=500, detail=str(e))
