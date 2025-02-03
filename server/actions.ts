'use server';

import { updateRoomTopic as updateTopic } from './store';

interface PerplexityResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  citations: string[];
  choices: {
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
    delta: {
      role: string;
      content: string;
    };
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function fetchAgents(page = 1) {
  const response = await fetch(
    `${process.env.COOKIE_API_URL}?interval=_7Days&page=${page}&pageSize=5`,
    {
      headers: {
        'x-api-key': process.env.COOKIE_API_KEY || ''
      }
    }
  );
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
}

export async function updateRoomTopicAction(roomId: string, topic: string) {
  return updateTopic(roomId, topic);
}

export async function callPerplexity(content: string): Promise<PerplexityResponse> {  
 
  const response = await fetch(process.env.PERPLEXITY_API_URL!, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: `${process.env.PERPLEXITY_MODEL}`,
      messages: [
        {
          role: "system",
          content: "Be precise and concise."
        },
        {
          role: "user",
          content: content
        }
      ],
      temperature: 0.2,
      top_p: 0.9
    })
  });

  return response.json();
}