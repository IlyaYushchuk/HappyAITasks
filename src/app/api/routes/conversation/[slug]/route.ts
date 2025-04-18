/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { env } from "~/env";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const slug = (await params).slug;

  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversations/${slug}`,
    {
      method: "GET",
      headers: {
        "xi-api-key": `${env.NEXT_PUBLIC_ELEVENLABS_API_KEY}`,
      },
    },
  );

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
