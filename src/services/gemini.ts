import { GoogleGenAI, Type, Content } from '@google/genai';
import { MeetingAgenda, UploadedFile, ChatMessage } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateAgenda(files: UploadedFile[]): Promise<MeetingAgenda> {
  const parts = files.map((file) => ({
    inlineData: {
      mimeType: file.type,
      data: file.data,
    },
  }));

  const prompt = `
    Analyze the provided documents and create a structured meeting agenda.
    Identify the key stakeholders required for this meeting.
    Extract the main topics to be discussed, estimate a reasonable duration (in minutes) for each topic, and provide a brief description.
    Calculate the total duration of the meeting.
    Optionally, suggest a start time for each topic assuming the meeting starts at 10:00 AM.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: {
      parts: [...parts, { text: prompt }],
    },
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: 'A concise and descriptive title for the meeting.',
          },
          stakeholders: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'List of required attendees or roles.',
          },
          topics: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                duration: { type: Type.NUMBER, description: 'Duration in minutes' },
                description: { type: Type.STRING },
                startTime: { type: Type.STRING, description: 'Suggested start time, e.g., 10:00 AM' },
              },
              required: ['title', 'duration', 'description'],
            },
          },
          totalDuration: {
            type: Type.NUMBER,
            description: 'Total duration of the meeting in minutes.',
          },
        },
        required: ['title', 'stakeholders', 'topics', 'totalDuration'],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Failed to generate agenda');
  }

  return JSON.parse(text) as MeetingAgenda;
}

let chatHistory: Content[] = [];
let currentFiles: UploadedFile[] = [];
let currentAgenda: MeetingAgenda | null = null;

export function initChatSession(files: UploadedFile[], agenda: MeetingAgenda | null) {
  chatHistory = [];
  currentFiles = files;
  currentAgenda = agenda;
}

export function restoreChatHistory(messages: ChatMessage[]) {
  chatHistory = messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text }]
  }));
}

export async function sendChatMessage(message: string, signal?: AbortSignal): Promise<{ text: string; sources?: { title: string; uri: string }[] }> {
  const parts: any[] = [];
  
  // If this is the first message, attach the files and agenda context
  if (chatHistory.length === 0) {
    if (currentFiles.length > 0) {
      currentFiles.forEach(file => {
        parts.push({
          inlineData: {
            mimeType: file.type,
            data: file.data,
          }
        });
      });
    }
    
    let context = `You are ꧁Rᴀʙʙʏ Eғᴛʏ꧂, a helpful assistant. `;
    if (currentAgenda) {
      context += `\n\nA meeting agenda has been generated based on the uploaded documents:\n${JSON.stringify(currentAgenda, null, 2)}\n\n`;
    }
    context += `User question: ${message}`;
    parts.push({ text: context });
  } else {
    parts.push({ text: message });
  }

  const userContent: Content = { role: 'user', parts };
  
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: [...chatHistory, userContent],
    config: {
      systemInstruction: "You are ꧁Rᴀʙʙʏ Eғᴛʏ꧂, a helpful AI assistant. You are part of the ꧁Rᴀʙʙʏ Eғᴛʏ꧂ suite of tools, which includes image generation, video creation, and more. Always identify yourself as ꧁Rᴀʙʙʏ Eғᴛʏ꧂ if asked.",
      tools: [{ googleSearch: {} }],
    },
  });

  if (signal?.aborted) {
    throw new Error('Aborted');
  }

  const responseText = response.text || 'Sorry, I could not generate a response.';
  
  // Extract URLs
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  let sources: { title: string; uri: string }[] | undefined = undefined;
  
  if (chunks && chunks.length > 0) {
    sources = chunks
      .filter(chunk => chunk.web?.uri && chunk.web?.title)
      .map(chunk => ({
        title: chunk.web!.title,
        uri: chunk.web!.uri
      }));
  }
  
  // Update history
  chatHistory.push(userContent);
  chatHistory.push({ role: 'model', parts: [{ text: responseText }] });

  return { text: responseText, sources };
}

export interface ArenaResult {
  modelA: { text?: string; image?: string };
  modelB: { text?: string; image?: string };
}

export async function compareModels(
  prompt: string, 
  image?: UploadedFile, 
  modelAId: string = 'gemini-3-flash-preview', 
  modelBId: string = 'gemini-3.1-pro-preview',
  mode: 'text' | 'image' = 'text',
  styleA?: string,
  styleB?: string
): Promise<ArenaResult> {
    const getParts = (style?: string) => {
      const parts: any[] = [];
      if (image) {
        parts.push({
          inlineData: {
            mimeType: image.type,
            data: image.data,
          }
        });
      }
      
      let finalPrompt = prompt;
      if (mode === 'image' && style && style !== 'none') {
        if (style === 'enhance') {
          finalPrompt = `Enhance this image, make it high resolution, sharp, detailed, and professional. ${prompt}`;
        } else if (style === 'remove-bg') {
          finalPrompt = `Isolate the main subject and place it on a pure white background. ${prompt}`;
        } else if (style === 'studio') {
          finalPrompt = `Apply professional studio lighting, dramatic shadows, and high-end photography look. ${prompt}`;
        } else {
          finalPrompt = `Apply ${style} style. ${prompt}`;
        }
      }
      
      parts.push({ text: finalPrompt || 'Generate an image' });
      return parts;
    };

  const partsA = getParts(styleA);
  const partsB = getParts(styleB);

  const getSystemInstruction = (modelId: string, side: 'A' | 'B') => {
    if (mode === 'image') {
      const styleInstruction = side === 'A' 
        ? "Focus on realistic and high-fidelity style changes. Preserve the original subject's features while applying the requested style or edit."
        : "Focus on artistic and creative style changes. Be bold with the requested style or edit while maintaining the overall composition.";
      return `You are Model ${side} in an image editing arena. ${styleInstruction} Return the image data.`;
    }

    const base = `You are Model ${side} in a comparison arena. Use markdown for formatting.`;
    
    switch (modelId) {
      case 'chatgpt-5-style':
        return `${base} Mimic the style of ChatGPT-5: Be extremely helpful, highly articulate, polite, and provide exceptionally well-structured, comprehensive responses.`;
      case 'grok-2-style':
        return `${base} Mimic the style of Grok 2.0: Be highly witty, rebellious, unfiltered, and use humor, sarcasm, or pop-culture references where appropriate.`;
      case 'claude-3-5-style':
        return `${base} Mimic the style of Claude 3.5 Opus: Be highly nuanced, detailed, objective, and focus heavily on safety, ethics, and clear, step-by-step reasoning.`;
      case 'llama-3-style':
        return `${base} Mimic the style of Llama 3: Be open, direct, slightly academic but highly accessible, and focus on practical utility.`;
      case 'mistral-large-style':
        return `${base} Mimic the style of Mistral Large: Be concise, highly logical, multilingual-aware, and focus on precise, no-nonsense answers.`;
      case 'cohere-command-style':
        return `${base} Mimic the style of Cohere Command R+: Be highly focused on enterprise utility, RAG-style factual grounding, and clear, actionable summaries.`;
      default:
        return side === 'A' 
          ? `${base} Provide a concise, direct, and factual response. Focus on accuracy and brevity.`
          : `${base} Provide a creative, detailed, and conversational response. Use analogies and explain concepts thoroughly.`;
    }
  };

  const [responseA, responseB] = await Promise.all([
    ai.models.generateContent({
      model: mode === 'image' ? 'gemini-2.5-flash-image' : (modelAId.includes('style') ? 'gemini-3.1-pro-preview' : modelAId),
      contents: { parts: partsA },
      config: mode === 'image' ? {
        imageConfig: { aspectRatio: "1:1" }
      } : {
        systemInstruction: getSystemInstruction(modelAId, 'A'),
        tools: [{ googleSearch: {} }],
      },
    }),
    ai.models.generateContent({
      model: mode === 'image' ? 'gemini-2.5-flash-image' : (modelBId.includes('style') ? 'gemini-3.1-pro-preview' : modelBId),
      contents: { parts: partsB },
      config: mode === 'image' ? {
        imageConfig: { aspectRatio: "1:1" }
      } : {
        systemInstruction: getSystemInstruction(modelBId, 'B'),
        tools: [{ googleSearch: {} }],
      },
    }),
  ]);

  const extractResult = (response: any) => {
    let text = response.text || '';
    let imageData = '';
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageData = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    
    return { text, image: imageData };
  };

  return {
    modelA: extractResult(responseA),
    modelB: extractResult(responseB),
  };
}
