// Common types used across the application

export interface MessageContent {
  text?: string;
  caption?: string;
  mediaUrl?: string;
  type?: 'text' | 'image' | 'video' | 'document' | 'template';
  template?: any;
  [key: string]: any;
}

export interface ContactAttributes {
  [key: string]: string | number | boolean;
}

export function parseMessageContent(content: string | MessageContent): MessageContent {
  if (typeof content === 'object') {
    return content;
  }
  
  // Handle empty or null content
  if (!content || content.trim() === '') {
    return { text: '', type: 'text' };
  }
  
  // If it's obviously not JSON, treat as plain text
  if (!content.trim().startsWith('{') && !content.trim().startsWith('[')) {
    return { text: content, type: 'text' };
  }
  
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === 'object' && parsed !== null) {
      // Handle template messages specially
      if (parsed.type === 'template') {
        let extractedText = '';
        
        // Extract text from template components
        if (parsed.template && Array.isArray(parsed.template.components)) {
          for (const component of parsed.template.components) {
            if (component.type === 'body' && Array.isArray(component.parameters)) {
              // Extract all text parameters and concatenate them
              const textParams = component.parameters
                .filter((param: any) => param.type === 'text' && param.text)
                .map((param: any) => param.text);
              extractedText += textParams.join(' ');
            } else if (component.type === 'header' && component.text) {
              extractedText += component.text + ' ';
            } else if (component.type === 'footer' && component.text) {
              extractedText += component.text + ' ';
            }
          }
        }
        
        // Also check for direct template text field
        if (parsed.template && parsed.template.text) {
          extractedText += parsed.template.text;
        }
        
        // If no text extracted, use template name or provide a default
        if (!extractedText.trim()) {
          if (parsed.templateName) {
            // Convert template name to readable format
            extractedText = parsed.templateName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          } else if (parsed.templateId) {
            extractedText = `Template (${parsed.templateId.substring(0, 8)}...)`;
          } else {
            extractedText = 'Template Message';
          }
        }
        
        return {
          text: extractedText.trim(),
          caption: '',
          mediaUrl: '',
          type: 'template',
          template: parsed.template
        };
      }
      
      // Ensure the parsed object has required fields
      return {
        text: parsed.text || '',
        caption: parsed.caption || '',
        mediaUrl: parsed.mediaUrl || '',
        type: parsed.type || 'text',
        template: parsed.template || undefined,
        ...parsed
      };
    }
  } catch (e) {
    // If JSON parsing fails, treat as plain text
    return { text: content, type: 'text' };
  }
  
  return { text: content, type: 'text' };
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
