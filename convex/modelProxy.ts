import { httpAction } from "./_generated/server";

export const modelProxy = httpAction(async (ctx, req) => {
  const { provider, model, ...body } = await req.json();

  let api_key;
  let api_url;

  switch (provider) {
    case "OpenRouter":
      api_key = process.env.OPENROUTER_API_KEY;
      api_url = "https://openrouter.ai/api/v1/chat/completions";
      break;
    case "MiniMax":
      api_key = process.env.MINIMAX_API_KEY;
      api_url = "https://api.minimax.io/v1/text/chatcompletion_v2";
      break;
    case "OpenAI":
      api_key = process.env.OPENAI_API_KEY;
      api_url = "https://api.openai.com/v1/chat/completions";
      break;
    default:
      return new Response("Unsupported provider", { status: 400 });
  }

  if (!api_key) {
    return new Response(`${provider} API key not set`, { status: 500 });
  }

  const response = await fetch(api_url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${api_key}`,
    },
    body: JSON.stringify({ model, ...body }),
  });

  return response;
});
