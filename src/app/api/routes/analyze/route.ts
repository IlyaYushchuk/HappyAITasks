/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { env } from "~/env";
import { openai } from "~/lib/openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

const OptionEnum = z.enum(["N", "2", "1", "0"]);

const enumArraySchema = z.object({
  values: z.array(OptionEnum),
});

// Use the helper to create the proper response format:
const responseFormat = zodResponseFormat(enumArraySchema, "values");

export async function POST(req: Request) {
  const { content } = await req.json();

  const thread = await openai.beta.threads.create();
  console.log(thread);
  await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content: content,
  });

  const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
    assistant_id: env.OPENAI_ASSISTANT_ID,
    response_format: responseFormat,
  });

  if (run.status == "completed") {
    const messages = await openai.beta.threads.messages.list(thread.id);
    const content = messages.data[0]?.content[0];
    return new Response(
      JSON.stringify(content?.type === "text" ? content.text : null),
    );
  }
  return new Response(JSON.stringify({ status: run.status }));
}
