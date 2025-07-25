/**
 * Test script for the research API integration
 * Run with: pnpm tsx test-research-api.ts
 */

import { createReadStream } from 'fs';

const API_URL = 'http://localhost:3000/api/research';  // This stays as localhost since it's the Next.js dev server

async function testResearchAPI() {
  console.log('Testing Research API...\n');

  const requestBody = {
    messages: [
      {
        role: 'user',
        content: 'Research OpenAI ESG controversies'
      }
    ]
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log('Response headers:', response.headers);
    console.log('\nStreaming response:\n');

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          console.log('Event:', line);
          
          // Parse SSE data
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              console.log('Parsed data:', JSON.stringify(data, null, 2));
            } catch (e) {
              console.log('Raw data:', line.slice(6));
            }
          }
        }
      }
    }

    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testResearchAPI();