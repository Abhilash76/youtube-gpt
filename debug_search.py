import json
import httpx

# Monkey patch to fix httpx compatibility issue with youtube-search-python
# Newer httpx versions don't accept 'proxies' in post()/get() directly
# MUST be done before importing VideosSearch
def patch_youtube_search_httpx():
    """Fix httpx compatibility for youtube-search-python library."""
    from youtubesearchpython.core.requests import RequestCore
    from youtubesearchpython.core.constants import userAgent
    
    def fixed_sync_post(self):
        """Fixed syncPostRequest that works with newer httpx versions."""
        if self.proxy:
            # Use httpx.Client with proxies for newer httpx versions
            with httpx.Client(proxies=self.proxy) as client:
                return client.post(
                    self.url,
                    headers={"User-Agent": userAgent},
                    json=self.data,
                    timeout=self.timeout
                )
        else:
            return httpx.post(
                self.url,
                headers={"User-Agent": userAgent},
                json=self.data,
                timeout=self.timeout
            )
    
    def fixed_sync_get(self):
        """Fixed syncGetRequest that works with newer httpx versions."""
        if self.proxy:
            with httpx.Client(proxies=self.proxy) as client:
                return client.get(
                    self.url,
                    headers={"User-Agent": userAgent},
                    timeout=self.timeout,
                    cookies={'CONSENT': 'YES+1'}
                )
        else:
            return httpx.get(
                self.url,
                headers={"User-Agent": userAgent},
                timeout=self.timeout,
                cookies={'CONSENT': 'YES+1'}
            )
    
    # Apply the patch
    RequestCore.syncPostRequest = fixed_sync_post
    RequestCore.syncGetRequest = fixed_sync_get

# Apply the patch BEFORE importing VideosSearch
try:
    patch_youtube_search_httpx()
except Exception as e:
    print(f"Warning: Could not patch youtube-search-python: {e}")

from youtubesearchpython import VideosSearch

search = VideosSearch('quantum computing', limit=1)
results = search.result()["result"]
print(json.dumps(results, indent=2))
