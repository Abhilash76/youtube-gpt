export async function fetchWithRetry(url: string, options: RequestInit, attempts = 5): Promise<Response> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 500) {
        if (i === attempts - 1) {
          throw new Error("The LLM is currently unavailable, Please try again after some time.");
        }
        await new Promise(r => setTimeout(r, 1500));
        continue;
      }
      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status}`);
      }
      return res;
    } catch (err: any) {
      if (err.message === "The LLM is currently unavailable, Please try again after some time.") {
        throw err;
      }
      if (i === attempts - 1) {
        throw new Error("The LLM is currently unavailable, Please try again after some time.");
      }
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  throw new Error("The LLM is currently unavailable, Please try again after some time.");
}
