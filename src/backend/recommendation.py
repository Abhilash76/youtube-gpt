import re
import asyncio
from youtubesearchpython import VideosSearch
from fastapi import HTTPException
import traceback

async def get_recommendations(transcript_text, summary, transcript_rag, executor):
    try:
        # Use Ollama via transcript_rag to generate 3 search queries
        prompt_text = f"Based on the following content, suggest 3 specific YouTube search queries for 'Recommended Literature' or advanced study. Return ONLY the queries, one per line.\n\nContent: {summary or transcript_text[:2000]}"
        
        if transcript_rag is None:
            raise HTTPException(status_code=503, detail="RAG service not initialized")

        # Invoke Ollama
        response = transcript_rag.llm.invoke(prompt_text)
        content = response.content.strip()
        
        # Clean thinking/thought tags if present
        content = re.sub(r'<thought>.*?</thought>', '', content, flags=re.DOTALL)
        content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL)
        
        queries = content.strip().split('\n')
        # Clean queries (remove numbers/bullets)
        queries = [re.sub(r'^(\d+\.|\-|\*)\s*', '', q).strip() for q in queries if q.strip() and len(q.strip()) > 5]
        
        all_recommendations = []
        
        async def fetch_recommendations(query):
            def do_search():
                try:
                    search = VideosSearch(query, limit=2)
                    return search.result().get("result", [])
                except Exception as e:
                    print(f"Search error for query '{query}': {e}")
                    return []
            
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(executor, do_search)

        # Fetch in parallel
        tasks = [fetch_recommendations(q) for q in queries[:3]]
        results = await asyncio.gather(*tasks)
        
        for res in results:
            all_recommendations.extend(res)
            
        seen = set()
        unique_recs = []
        for r in all_recommendations:
            if r['link'] not in seen:
                unique_recs.append(r)
                seen.add(r['link'])
        
        return unique_recs[:5]
    except Exception as e:
        print(f"Recommendation error: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
