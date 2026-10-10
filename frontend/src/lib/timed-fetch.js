// Android WebViews may support AbortController but not AbortSignal.timeout.
// Keep the timer until response-body parsing completes; never retry mutations.
export async function timedFetch(url, options = {}, timeoutMs = 15000, read = response => response.text()) {
  const controller = new AbortController();
  const upstream = options.signal;
  const abort = () => controller.abort();
  if (upstream?.aborted) abort();
  else upstream?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return { response, data: await read(response) };
  } finally {
    clearTimeout(timer);
    upstream?.removeEventListener('abort', abort);
  }
}
