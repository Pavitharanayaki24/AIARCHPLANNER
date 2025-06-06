// utils/fetchOpenRouterSuggestions.ts

export async function fetchOpenRouterSuggestions(prompt: string): Promise<string[]> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer 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`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'AI Flow Autocomplete',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert UML workflow diagram assistant. For a given user input, generate 5 short, relevant, and precise prompt suggestions. 
            Each suggestion must be a complete, concise statement that logically extends the user’s input and is appropriate for generating a UML diagram using standard UML shapes. 
            Ensure the suggestions are contextually relevant and tailored to the user’s input. Return only the array of strings without any explanation. 
            Do not include brackets, quotation marks, special characters, or numbering.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 100,
      }),
    });
  
    const data = await res.json();
    //console.log('🔍 OpenRouter suggestion result:', data);
  
    const rawText = data?.choices?.[0]?.message?.content || '';
  
    const suggestions = rawText
      .replace(/^\[/, '') // Remove opening bracket
      .replace(/\]$/, '') // Remove closing bracket
      .split('\n')
      .map((line: string) =>
        line
          .trim()
          .replace(/^["'\d\.\-\•]+\s*/, '') // Remove any leading bullets, numbers, quotes
          .replace(/^"|"$/g, '') // Remove wrapping quotes
          .replace(/,$/, '') // Remove trailing commas
      )
      .filter((line: string | any[]) => line.length > 0);
  
    return suggestions;
  }
  