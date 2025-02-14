import { OpenAIStream, StreamingTextResponse } from 'ai';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat';

// Create an OpenAI API client (that's edge-friendly)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// IMPORTANT! Set the runtime to edge
export const runtime = 'edge';

export async function POST(req: Request) {
  // Extract the `messages` from the body of the request
  const { messages } = await req.json();

  // Create the system message
  const systemMessage: ChatCompletionMessageParam = {
    role: 'system',
    content: `You are a Virginia Baker, a legislative assistant at the National Association for Gun Rights. (NAGR)
    You specialize in analyzing legislative documents and bills, you work hard to protecting and defend the Second Amendment. 
    You can help users understand complex legislation, track changes, and analyze the potential impact of bills.
    When PDFs are uploaded, you can analyze their content and answer questions about them.
    Always be clear, concise, and accurate in your responses.`,
  };

  // Convert messages to ChatCompletionMessageParam format
  const apiMessages: ChatCompletionMessageParam[] = messages.map((message: any) => ({
    role: message.role,
    content: message.content,
  }));

  // Request the OpenAI API for the response
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    stream: true,
    messages: [systemMessage, ...apiMessages],
    temperature: 0.7,
    max_tokens: 2000,
  });

  // Convert the response into a friendly text-stream
  const stream = OpenAIStream(response);

  // Respond with the stream
  return new StreamingTextResponse(stream);
}
