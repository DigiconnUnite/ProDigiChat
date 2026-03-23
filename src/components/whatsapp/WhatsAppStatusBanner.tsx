'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, XCircle, CheckCircle, ExternalLink, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ERROR_GUIDE: Record<string, { title: string; steps: string[]; link?: { label: string; url: string } }> = {
  NO_WABA: {
    title: 'No WhatsApp Business Account exists',
    steps: [
      'Go to business.facebook.com and log in',
      'Click "Add" → "WhatsApp accounts" in the left menu',
      'Follow the steps to create a WhatsApp Business Account',
      'Once created, come back here and try connecting again',
    ],
    link: { label: 'Open Meta Business Manager', url: 'https://business.facebook.com' },
  },
  APP_CONFIG: {
    title: 'App configuration error',
    steps: [
      'Check that META_APP_ID and META_APP_SECRET are correctly set in Vercel',
      'Verify your Facebook App is in Live mode (not Development)',
      'Make sure App Domains includes prodigichat.com in Meta App Settings → Basic',
    ],
    link: { label: 'Open Meta App Dashboard', url: 'https://developers.facebook.com/apps' },
  },
  TOKEN_ERROR: {
    title: 'Authentication token error',
    steps: [
      'Your session may have expired — click "Connect WhatsApp" again',
      'Make sure you complete all steps in the Meta popup without closing it',
      'If the error persists, try in an incognito window',
    ],
  },
  REDIRECT_URI: {
    title: 'Redirect URI mismatch',
    steps: [
      'Go to developers.facebook.com → Your App → Facebook Login → Settings',
      'Add https://prodigichat.com/api/whatsapp/oauth/callback to Valid OAuth Redirect URIs',
      'Check that NEXT_PUBLIC_OAUTH_REDIRECT_URI in Vercel matches exactly',
    ],
    link: { label: 'Open Facebook Login Settings', url: 'https://developers.facebook.com/apps' },
  },
  PERMISSIONS: {
    title: 'Missing permissions',
    steps: [
      'Click "Connect WhatsApp" again',
      'In the Meta popup — click "Allow" for ALL requested permissions',
      'Do not uncheck any permissions — all are required',
    ],
  },
  STATE_EXPIRED: {
    title: 'Connection timed out',
    steps: [
      'The 15-minute connection window expired',
      'Click "Connect WhatsApp" and complete all steps within 15 minutes',
    ],
  },
  NETWORK: {
    title: 'Network error',
    steps: [
      'Meta API may be temporarily unavailable',
      'Wait 2-3 minutes and try again',
      'Check status.developer.facebook.com for Meta outages',
    ],
    link: { label: 'Check Meta API Status', url: 'https://metastatus.com' },
  },
  META_ERROR: {
    title: 'Meta returned an error',
    steps: [
      'Make sure you are logged into the correct Facebook account',
      'Ensure your Facebook account has access to the WhatsApp Business Account',
      'Try again — if it keeps failing, check developers.facebook.com for issues',
    ],
  },
  MISSING_CODE: {
    title: 'Authorization incomplete',
    steps: [
      'The WhatsApp connection flow was not completed',
      'Click "Connect WhatsApp" and follow all steps in the popup',
      'Do not close the popup until it redirects automatically',
    ],
  },
  UNKNOWN: {
    title: 'Unexpected error',
    steps: [
      'Check your Vercel function logs for the exact error',
      'Verify all environment variables are set correctly in Vercel',
      'Try connecting again — if it persists, contact support',
    ],
  },
};

interface WhatsAppStatusBannerProps {
  onRetry?: () => void;
}

export function WhatsAppStatusBanner({ onRetry }: WhatsAppStatusBannerProps) {
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<'error' | 'connected' | 'reconnected' | null>(null);
  const [message, setMessage] = useState('');
  const [errorCode, setErrorCode] = useState('UNKNOWN');
  const [needsAccount, setNeedsAccount] = useState(false);

  useEffect(() => {
    const whatsapp = searchParams.get('whatsapp');
    const msg      = searchParams.get('message');
    const code     = searchParams.get('errorCode') || 'UNKNOWN';
    const needs    = searchParams.get('needsAccount') === 'true';

    if (whatsapp === 'error') {
      setStatus('error');
      setMessage(decodeURIComponent(msg || 'An error occurred'));
      setErrorCode(code);
      setNeedsAccount(needs);
      setVisible(true);
      setExpanded(true);
      const url = new URL(window.location.href);
      url.searchParams.delete('whatsapp');
      url.searchParams.delete('message');
      url.searchParams.delete('errorCode');
      url.searchParams.delete('needsAccount');
      window.history.replaceState({}, '', url.toString());
    } else if (whatsapp === 'connected') {
      setStatus('connected');
      setVisible(true);
      window.history.replaceState({}, '', '/dashboard/settings?tab=whatsapp');
    } else if (whatsapp === 'reconnected') {
      setStatus('reconnected');
      setVisible(true);
      window.history.replaceState({}, '', '/dashboard/settings?tab=whatsapp');
    }
  }, [searchParams]);

  if (!visible) return null;

  if (status === 'connected' || status === 'reconnected') {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 px-4 py-3 mb-6">
        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">
            {status === 'reconnected'
              ? 'WhatsApp account reconnected successfully'
              : 'WhatsApp account connected successfully'}
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
            Your account is now active. You can start sending messages.
          </p>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
        >
          <XCircle className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const guide = ERROR_GUIDE[errorCode] || ERROR_GUIDE.UNKNOWN;

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 mb-6 overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3">
        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            WhatsApp connection failed — {guide.title}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 break-words">
            {message}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 flex items-center gap-1 text-xs"
          >
            {expanded ? 'Hide' : 'How to fix'}
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          <button
            onClick={() => setVisible(false)}
            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-red-200 dark:border-red-800 px-4 py-3 bg-red-50/50 dark:bg-red-950/50">
          <p className="text-xs font-medium text-red-700 dark:text-red-300 mb-2">Steps to fix:</p>
          <ol className="space-y-1.5">
            {guide.steps.map((step, i) => (
              <li key={i} className="flex gap-2 text-xs text-red-700 dark:text-red-300">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300 flex items-center justify-center text-[10px] font-medium mt-0.5">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap gap-2 mt-3">
            {onRetry && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900"
                onClick={() => { setVisible(false); onRetry(); }}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Try again
              </Button>
            )}
            {guide.link && (
              <a
                href={guide.link.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  {guide.link.label}
                </Button>
              </a>
            )}
            {needsAccount && (
              <a
                href="https://business.facebook.com/wa/manage/home/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Create WhatsApp Business Account
                </Button>
              </a>
            )}
          </div>

          <p className="text-[10px] text-red-500 dark:text-red-500 mt-2">
            Error code: {errorCode} — Share this with support if the issue persists
          </p>
        </div>
      )}
    </div>
  );
}