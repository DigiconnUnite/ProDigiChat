'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { TemplatePreviewProps, TemplateVariable } from '@/types/template';
import { 
  ImageIcon, 
  FileText, 
  Video, 
  Phone, 
  VideoOff, 
  MoreVertical, 
  ChevronLeft,
  CheckCheck,
  Star
} from 'lucide-react';

interface TemplatePreviewComponentProps {
  preview: TemplatePreviewProps;
  className?: string;
}

export function TemplatePreview({ preview, className }: TemplatePreviewComponentProps) {
  const renderFormattedText = (text: string) => {
    // Split text by markdown formatting
    const parts = text.split(/(\*\*.*?\*\*|_.*?_|~.*?~|`.*?`)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('_') && part.endsWith('_')) {
        return <em key={index} className="italic">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('~') && part.endsWith('~')) {
        return <s key={index} className="line-through">{part.slice(1, -1)}</s>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={index} className="font-mono bg-gray-100 px-1 rounded text-xs">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  const replaceVariables = (text: string): string => {
    let result = text;
    preview.variables.forEach((variable: TemplateVariable) => {
      const regex = new RegExp(`\\{\\{${variable.index}\\}\\}`, 'g');
      result = result.replace(regex, variable.sampleValue || `{{${variable.index}}}`);
    });
    return result;
  };

  const renderHeader = () => {
    if (!preview.header) return null;

    switch (preview.header.type) {
      case 'text':
        return (
          <div className="font-semibold text-base mb-1.5 text-gray-900">
            {renderFormattedText(preview.header.text || '')}
          </div>
        );
      case 'image':
        return (
          <div className="mb-2 -mx-3 -mt-3 overflow-hidden rounded-t-2xl">
            {preview.header.mediaUrl ? (
              <img 
                src={preview.header.mediaUrl} 
                alt="Header" 
                className="w-full h-40 object-cover"
              />
            ) : (
              <div className="w-full h-40 bg-gray-200 flex items-center justify-center">
                <ImageIcon className="w-10 h-10 text-gray-400" />
              </div>
            )}
          </div>
        );
      case 'video':
        return (
          <div className="mb-2 -mx-3 -mt-3 overflow-hidden rounded-t-2xl bg-black">
            {preview.header.mediaUrl ? (
              <video 
                src={preview.header.mediaUrl} 
                className="w-full h-40 object-cover"
                controls={false}
              />
            ) : (
              <div className="w-full h-40 bg-gray-800 flex items-center justify-center">
                <Video className="w-10 h-10 text-gray-500" />
              </div>
            )}
          </div>
        );
      case 'document':
        return (
          <div className="mb-2 p-3 bg-gray-50 rounded-lg flex items-center gap-3 border border-gray-100">
            <div className="p-2 bg-blue-100 rounded">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-800 truncate">{preview.header.filename || 'Document.pdf'}</p>
              <p className="text-xs text-gray-500">PDF Document</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderFooter = () => {
    if (!preview.footer) return null;
    return (
      <p className="text-xs text-gray-500 mt-1.5">
        {preview.footer}
      </p>
    );
  };

  const renderButtons = () => {
    if (!preview.buttons || preview.buttons.length === 0) return null;

    return (
      <div className="mt-3 pt-2 border-t border-gray-100 space-y-1">
        {preview.buttons.map((button, index) => (
          <button
            key={button.id || index}
            className={cn(
              'w-full py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 active:scale-[0.98]',
              button.type === 'quick_reply' 
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'text-green-600 hover:bg-green-50'
            )}
          >
            {button.text}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className={cn("flex justify-center p-4", className)}>
      {/* Realistic Phone Mockup Container */}
      <div className="relative w-[320px] h-[680px] bg-black rounded-[50px] px-1 py-2 shadow-2xl border-[8px] border-gray-900">
        {/* Screen Area */}
        <div className="relative w-full h-full bg-white rounded-[40px] overflow-hidden flex flex-col">
          {/* Status Bar (iOS Style) */}
          <div className="bg-green-900 px-6 pt-2 pb-1 flex justify-between items-center text-white text-xs font-semibold">
            <span className="w-8">9:41</span>
            <div className="flex-1" /> {/* Spacer for notch area */}
            <div className="flex items-center gap-1 w-8 justify-end">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 3C7.46 3 3.34 4.78.29 7.67c-.18.18-.29.43-.29.71 0 .28.11.53.29.71l11 11c.39.39 1.02.39 1.41 0l11-11c.18-.18.29-.43.29-.71 0-.28-.11-.53-.29-.71C20.66 4.78 16.54 3 12 3z" />
              </svg>
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M2 22h20V2z" />
              </svg>
              <div className="flex items-center">
                <div className="w-6 h-3 border border-white rounded-sm p-0.5">
                  <div className="w-full h-full bg-white rounded-xs" />
                </div>
              </div>
            </div>
          </div>

          {/* Chat Background */}
          <div
            className="flex-1 relative px-2 py-3 overflow-y-auto"
            style={{
              backgroundColor: "#ECE5DD",
              backgroundImage: `url("/whatsapp-doodle-bg.png")`,
              backgroundSize: "100% 100%",
            }}
          >
            {/* Date Badge */}
            <div className="flex justify-center mb-3">
              <span className="bg-white/80 text-gray-600 text-xs px-3 py-1 rounded-lg shadow-sm font-medium">
                Today
              </span>
            </div>

            {/* Message Bubble with Tail */}
            <div className="flex justify-start">
              <div className="relative max-w-[260px]">


                {/* Bubble Content */}
                <div className="bg-white rounded-tl-2xl rounded-br-2xl rounded-bl-none rounded-tr-2xl p-3 shadow-sm border border-gray-100">
                  {/* Header */}
                  {renderHeader()}

                  {/* Body */}
                  <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {renderFormattedText(replaceVariables(preview.body))}
                  </div>

                  {/* Footer */}
                  {renderFooter()}

                  {/* Buttons */}
                  {renderButtons()}

                  {/* Time and Ticks */}
                  <div className="flex justify-end items-center gap-1 mt-1 text-right">
                    <span className="text-[10px] text-gray-500">10:30 AM</span>
                    <CheckCheck className="w-4 h-4 text-blue-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TemplatePreview;