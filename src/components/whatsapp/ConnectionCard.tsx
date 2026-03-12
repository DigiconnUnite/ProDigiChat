'use client';

import { Shield, Settings2, CheckCircle, ArrowRight, Facebook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ConnectionCardProps {
  type: 'embedded' | 'manual';
  title: string;
  description: string;
  features: string[];
  onClick: () => void;
  isLoading?: boolean;
  recommended?: boolean;
  className?: string;
}

export function ConnectionCard({
  type,
  title,
  description,
  features,
  onClick,
  isLoading,
  recommended,
  className
}: ConnectionCardProps) {
  const isEmbedded = type === 'embedded';

  return (
    <div
      className={cn(
        "relative border-2 rounded-xl p-6 transition-all duration-200 cursor-pointer",
        "hover:shadow-lg hover:border-opacity-80",
        recommended
          ? "border-green-500 bg-green-50/50 hover:border-green-600"
          : "border-gray-200 bg-white hover:border-gray-300",
        className
      )}
      onClick={isLoading ? undefined : onClick}
    >
      {/* Recommended Badge */}
      {recommended && (
        <div className="absolute -top-3 left-4">
          <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Recommended
          </span>
        </div>
      )}

      {/* Icon */}
      <div className={cn(
        "w-14 h-14 rounded-xl flex items-center justify-center mb-4",
        isEmbedded ? "bg-blue-100" : "bg-orange-100"
      )}>
        {isEmbedded ? (
          <Facebook className="w-7 h-7 text-blue-600" />
        ) : (
          <Settings2 className="w-7 h-7 text-orange-600" />
        )}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-4">
        {description}
      </p>

      {/* Features */}
      <ul className="space-y-2 mb-6">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
            <CheckCircle className={cn(
              "w-4 h-4 mt-0.5 shrink-0",
              isEmbedded ? "text-green-500" : "text-orange-500"
            )} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {/* Button */}
      <Button
        className={cn(
          "w-full",
          isEmbedded
            ? "bg-blue-600 hover:bg-blue-700"
            : "bg-gray-900 hover:bg-gray-800"
        )}
        disabled={isLoading}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Connecting...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            {isEmbedded ? "Connect via Facebook" : "Connect Manually"}
            <ArrowRight className="w-4 h-4" />
          </span>
        )}
      </Button>
    </div>
  );
}

// Pre-configured cards for the entry screen
export function EmbeddedSignupCard({
  onClick,
  isLoading,
  className
}: {
  onClick: () => void;
  isLoading?: boolean;
  className?: string;
}) {
  return (
    <ConnectionCard
      type="embedded"
      title="Connect with Meta (Embedded Signup)"
      description="The easiest way to connect your WhatsApp Business account."
      features={[
        "No technical setup required",
        "Automatically creates WABA",
        "Automatic token refresh",
        "Recommended for new users"
      ]}
      onClick={onClick}
      isLoading={isLoading}
      recommended={true}
      className={className}
    />
  );
}

export function ManualCredentialCard({
  onClick,
  isLoading,
  className
}: {
  onClick: () => void;
  isLoading?: boolean;
  className?: string;
}) {
  return (
    <ConnectionCard
      type="manual"
      title="Connect Using Existing Credentials"
      description="Use this if you already have a WhatsApp Business Account."
      features={[
        "For existing WABA owners",
        "Requires API credentials",
        "More control over settings",
        "Manual token management"
      ]}
      onClick={onClick}
      isLoading={isLoading}
      className={className}
    />
  );
}

export default ConnectionCard;
