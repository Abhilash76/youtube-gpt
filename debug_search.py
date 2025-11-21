from youtubesearchpython import VideosSearch
import json

search = VideosSearch('quantum computing', limit=1)
results = search.result()["result"]
print(json.dumps(results, indent=2))
