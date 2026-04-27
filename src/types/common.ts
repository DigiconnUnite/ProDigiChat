// Common types used across the application

export interface MessageContent {
  text?: string;
  caption?: string;
  mediaUrl?: string;
  type?: 'text' | 'image' | 'video' | 'document' | 'template';
  [key: string]: any;
}

export interface ContactAttributes {
  [key: string]: string | number | boolean;
}

export function parseMessageContent(content: string | MessageContent): MessageContent {
  if (typeof content === 'object') {
    return content;
  }
  
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === 'object') {
      return parsed as MessageContent;
    }
  } catch (e) {
    // If not valid JSON, treat as plain text
    return { text: content };
  }
  
  return { text: content };
}

export function stringifyMessageContent(content: MessageContent): string {
  return JSON.stringify(content);
}

export function parseTags(tags: string | string[] | null): string[] {
  if (Array.isArray(tags)) {
    return tags.map(tag => String(tag).trim()).filter(Boolean);
  }
  
  if (!tags || typeof tags !== 'string') {
    return [];
  }
  
  try {
    const parsed = JSON.parse(tags);
    if (Array.isArray(parsed)) {
      return parsed.map(tag => String(tag).trim()).filter(Boolean);
    }
  } catch (e) {
    // If not valid JSON, treat as comma-separated
    return tags.split(',').map(tag => tag.trim()).filter(Boolean);
  }
  
  return [];
}

export function stringifyTags(tags: string[]): string {
  return JSON.stringify(tags);
}

export function parseAttributes(attributes: string | Record<string, unknown> | null): ContactAttributes {
  if (typeof attributes === 'object' && attributes !== null) {
    return attributes as ContactAttributes;
  }
  
  if (!attributes || typeof attributes !== 'string') {
    return {};
  }
  
  try {
    const parsed = JSON.parse(attributes);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as ContactAttributes;
    }
  } catch (e) {
    // Return empty object if parsing fails
    return {};
  }
  
  return {};
}

export function stringifyAttributes(attributes: ContactAttributes): string {
  return JSON.stringify(attributes);
}
