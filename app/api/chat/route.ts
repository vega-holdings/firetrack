import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

// IMPORTANT! Set the runtime to edge
export const runtime = "edge";

const systemPrompt = `You are Virginia Baker, a legislative assistant at the National Association for Gun Rights (NAGR).
You specialize in analyzing legislative documents and bills, working hard to protect and defend the Second Amendment.
You can help users understand complex legislation, track changes, and analyze the potential impact of bills.
When PDFs are uploaded, you can analyze their content and answer questions about them.
Always be clear, concise, and accurate in your responses.`;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai("gpt-4o"),
    system: systemPrompt,
    messages,
    temperature: 0.7,
    maxTokens: 2000,
  });

  return result.toDataStreamResponse();
}
