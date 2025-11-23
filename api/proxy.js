
export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  // Define consistent CORS headers for all responses.
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Range",
    "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, Content-Type",
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const requestUrl = new URL(req.url);
    const urlToProxy = requestUrl.searchParams.get("url");

    if (!urlToProxy) {
      return new Response(JSON.stringify({ error: "Missing url parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestHeaders = new Headers(req.headers);
    requestHeaders.delete('host');
    requestHeaders.delete('referer');
    requestHeaders.delete('cookie'); 
    
    if (req.headers.get('range')) {
        requestHeaders.set('Range', req.headers.get('range'));
    }

    const response = await fetch(urlToProxy, {
      method: req.method,
      headers: requestHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : null,
      redirect: 'follow',
    });

    const responseHeaders = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      responseHeaders.set(key, value);
    });
    
    // IMPORTANT: Remove content-encoding to prevent double compression issues
    // and content-length if we are streaming or if it conflicts
    responseHeaders.delete('content-encoding'); 
    responseHeaders.delete('content-length');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

  } catch (err) {
    const errorDetails = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: "Proxy Error", details: errorDetails }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
