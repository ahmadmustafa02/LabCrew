import "dotenv/config";
import { chatJson, llmConfigured } from "../src/server/llm/client";

async function main() {
  console.log("configured:", llmConfigured());
  console.log("base:", process.env.LLM_BASE_URL);
  console.log("model:", process.env.LLM_MODEL);
  const r = await chatJson<{ ok: boolean; ping: string }>({
    system: 'Return JSON only like {"ok":true,"ping":"pong"}',
    user: "ping",
    temperature: 0,
  });
  console.log(JSON.stringify(r, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
