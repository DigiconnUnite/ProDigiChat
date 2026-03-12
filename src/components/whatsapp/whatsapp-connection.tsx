"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  MessageCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Shield,
  Phone,
  Building2,
  Key,
  Clock,
  Globe,
  Copy,
  Check,
  User,
  CreditCard,
  Zap,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Types/Interfaces
interface PhoneNumber {
  id: string;
  display_phone_number: string;
  verified_name: string;
  quality_rating: string;
  messaging_limit_tier: string;
  status: string;
  name_status?: string;
}

interface WABAAccount {
  id: string;
  name: string;
  currency?: string;
  timezone_id?: string;
  message_template_namespace?: string;
  account_review_status?: string;
  phone_numbers?: PhoneNumber[];
}

interface ConnectionData {
  success: boolean;
  user?: {
    id: string;
    name: string;
    email?: string;
    picture?: string;
  };
  accessToken: string;
  accounts: WABAAccount[];
  tokenInfo?: any;
  connectedAt: string;
}

// Helper functions
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers or permission issues
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      return true;
    } catch (fallbackErr) {
      console.error("Failed to copy text:", fallbackErr);
      return false;
    }
  }
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Unknown Date";
  }
}

function getQualityColor(rating: string): string {
  switch (rating?.toUpperCase()) {
    case "GREEN":
      return "bg-green-500";
    case "YELLOW":
      return "bg-yellow-500";
    case "RED":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
}

function getStatusBadge(status: string): React.ReactNode {
  const statusLower = status?.toLowerCase();

  if (statusLower === "connected" || statusLower === "ready") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
        <CheckCircle2 className="w-3 h-3" />
        Connected
      </span>
    );
  }

  if (statusLower === "pending") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
        <Clock className="w-3 h-3" />
        Pending
      </span>
    );
  }

  if (statusLower === "disconnected" || statusLower === "error") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
        <XCircle className="w-3 h-3" />
        Disconnected
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">
      <AlertCircle className="w-3 h-3" />
      {status || "Unknown"}
    </span>
  );
}

export default function WhatsAppConnection() {
  // State Variables
  const [isLoading, setIsLoading] = useState(false);
  const [connectionData, setConnectionData] = useState<ConnectionData | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [manualWabaId, setManualWabaId] = useState("");
  const [manualPhoneId, setManualPhoneId] = useState("");
  const [activeMethod, setActiveMethod] = useState<"oauth" | "manual">("oauth");
  const [popup, setPopup] = useState<Window | null>(null);
  const [isFetchingAccount, setIsFetchingAccount] = useState(false);

  // useEffect for popup message handling
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // FIX: Security check & Type check to prevent crashes from browser extensions
      if (typeof event.data !== "object" || event.data === null) return;

      if (event.data.type === "META_OAUTH_SUCCESS") {
        const data = event.data.data;

        if (data.accessToken) {
          setIsFetchingAccount(true); // Indicate internal fetching
          try {
            const response = await fetch("/api/meta/fetch-account", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                accessToken: data.accessToken,
                wabaId: data.wabaAccounts?.[0]?.id,
              }),
            });

            const result = await response.json();

            if (result.success) {
              // Map phone numbers to accounts safely
              const accounts: WABAAccount[] =
                result.accounts?.map((account: any) => ({
                  id: account.id,
                  name: account.name,
                  currency: account.currency,
                  timezone_id: account.timezone_id,
                  message_template_namespace:
                    account.message_template_namespace,
                  account_review_status: account.account_review_status,
                  phone_numbers: result.phoneNumbers
                    ?.filter((phone: any) => phone.accountId === account.id)
                    .map((phone: any) => ({
                      id: phone.id,
                      display_phone_number: phone.display_phone_number,
                      verified_name: phone.verified_name,
                      quality_rating: phone.quality_rating,
                      messaging_limit_tier: phone.messaging_limit_tier,
                      status: phone.status,
                      name_status: phone.name_status,
                    })),
                })) || [];

              setConnectionData({
                success: true,
                user: data.user,
                accessToken: data.accessToken,
                accounts,
                tokenInfo: result.tokenInfo,
                connectedAt: data.connectedAt || new Date().toISOString(),
              });
              setError(null); // Clear previous errors
            } else {
              setError(result.error || "Failed to fetch account details");
            }
          } catch (err) {
            console.error("Error fetching account:", err);
            setError(
              "Failed to fetch account details. Please check your network.",
            );
          } finally {
            setIsFetchingAccount(false);
            setIsLoading(false);
          }
        }
      } else if (event.data.type === "META_OAUTH_ERROR") {
        const errorData = event.data.data;
        setError(errorData?.error || "Connection failed");
        setIsLoading(false);
        setIsFetchingAccount(false);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // useEffect for popup closed check
  useEffect(() => {
    if (!popup || !isLoading) return;

    const checkPopupClosed = setInterval(() => {
      if (popup.closed) {
        // If we are still loading but popup closed, user likely cancelled
        if (isLoading && !isFetchingAccount) {
          setIsLoading(false);
          setError("Authentication window was closed.");
        }
        clearInterval(checkPopupClosed);
      }
    }, 500);

    return () => clearInterval(checkPopupClosed);
  }, [popup, isLoading, isFetchingAccount]);

  // handleOAuthConnect function
  const handleOAuthConnect = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/meta/connect", { method: "GET" });
      const result = await response.json();

      if (result.success && result.authUrl) {
        const newPopup = window.open(
          result.authUrl,
          "Meta OAuth",
          "width=600,height=700,scrollbars=yes",
        );

        if (newPopup) {
          setPopup(newPopup);
        } else {
          setError("Popup blocked. Please allow popups for this site.");
          setIsLoading(false);
        }
      } else {
        setError(result.error || "Failed to initiate OAuth flow");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("OAuth Error:", err);
      setError("Failed to connect. Please check your connection.");
      setIsLoading(false);
    }
  }, []);

  // handleManualConnect function
  const handleManualConnect = useCallback(async () => {
    if (!manualToken.trim()) {
      setError("Please enter a valid access token");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/meta/fetch-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: manualToken,
          wabaId: manualWabaId || undefined,
          phoneNumberId: manualPhoneId || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const accounts: WABAAccount[] =
          result.accounts?.map((account: any) => ({
            id: account.id,
            name: account.name,
            currency: account.currency,
            timezone_id: account.timezone_id,
            message_template_namespace: account.message_template_namespace,
            account_review_status: account.account_review_status,
            phone_numbers: result.phoneNumbers
              ?.filter((phone: any) => phone.accountId === account.id)
              .map((phone: any) => ({
                id: phone.id,
                display_phone_number: phone.display_phone_number,
                verified_name: phone.verified_name,
                quality_rating: phone.quality_rating,
                messaging_limit_tier: phone.messaging_limit_tier,
                status: phone.status,
                name_status: phone.name_status,
              })),
          })) || [];

        setConnectionData({
          success: true,
          user: result.user || { id: "manual", name: "Manual Connection" },
          accessToken: manualToken,
          accounts,
          tokenInfo: result.tokenInfo,
          connectedAt: new Date().toISOString(),
        });
      } else {
        setError(result.error || "Failed to fetch account information");
      }
    } catch (err) {
      console.error("Manual Connect Error:", err);
      setError("Failed to connect. Please check your token and network.");
    } finally {
      setIsLoading(false);
    }
  }, [manualToken, manualWabaId, manualPhoneId]);

  // handleDisconnect function
  const handleDisconnect = useCallback(() => {
    setConnectionData(null);
    setManualToken("");
    setManualWabaId("");
    setManualPhoneId("");
    setError(null);
    setCopied(false);
    setIsFetchingAccount(false);
    setIsLoading(false);
  }, []);

  // Handle copy to clipboard
  const handleCopy = async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      // Optional: Handle copy failure UI
    }
  };

  // Calculate stats safely
  const totalAccounts = connectionData?.accounts?.length || 0;
  const totalPhones =
    connectionData?.accounts?.reduce(
      (acc, account) => acc + (account.phone_numbers?.length || 0),
      0,
    ) || 0;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-teal-600">
          <MessageCircle className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
            WhatsApp Business
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Connect your WhatsApp Business Account
          </p>
        </div>
      </div>

      {/* Connection Card */}
      <Card className="bg-slate-800 border-slate-700">
        {connectionData ? (
          /* Connected State */
          <>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <CardTitle className="text-white">Connected</CardTitle>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDisconnect}
                  className="bg-red-500/20 hover:bg-red-500/40 text-red-400 border-red-500/50"
                >
                  Disconnect
                </Button>
              </div>
              <CardDescription className="text-slate-400">
                Connected on {formatDate(connectionData.connectedAt)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* User Info */}
              {connectionData.user && (
                <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-700/50">
                  {connectionData.user.picture ? (
                    <img
                      src={connectionData.user.picture}
                      alt={connectionData.user.name}
                      className="w-12 h-12 rounded-full object-cover"
                      onError={(e) => {
                        // Fallback if image fails to load
                        (e.target as HTMLImageElement).style.display = "none";
                        // We can't easily swap to JSX here, so next span handles fallback or we rely on the alt text
                      }}
                    />
                  ) : null}
                  {/* Show icon if no picture or picture failed */}
                  {!connectionData.user.picture && (
                    <div className="w-12 h-12 rounded-full bg-slate-600 flex items-center justify-center">
                      <User className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-white">
                      {connectionData.user.name}
                    </p>
                    {connectionData.user.email && (
                      <p className="text-sm text-slate-400">
                        {connectionData.user.email}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-slate-700/50 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <Building2 className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {totalAccounts}
                    </p>
                    <p className="text-sm text-slate-400">Business Accounts</p>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-slate-700/50 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <Phone className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {totalPhones}
                    </p>
                    <p className="text-sm text-slate-400">Phone Numbers</p>
                  </div>
                </div>
              </div>

              {/* Token Info */}
              <div className="p-4 rounded-lg bg-slate-700/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-300">
                      Access Token
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(connectionData.accessToken)}
                    className="text-slate-400 hover:text-white"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-slate-500 font-mono truncate">
                  {connectionData.accessToken.substring(0, 50)}...
                </p>
              </div>

              {/* WABA Accounts */}
              {connectionData.accounts &&
                connectionData.accounts.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      WhatsApp Business Accounts
                    </h3>
                    {connectionData.accounts.map((account, index) => (
                      <div
                        key={account.id || index}
                        className="p-4 rounded-lg bg-slate-700/30 border border-slate-600/50"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-white">
                              {account.name}
                            </h4>
                            <p className="text-xs text-slate-400 font-mono">
                              ID: {account.id}
                            </p>
                          </div>
                          {account.account_review_status && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                              <Shield className="w-3 h-3" />
                              {account.account_review_status}
                            </span>
                          )}
                        </div>

                        {/* Phone Numbers */}
                        {account.phone_numbers &&
                          account.phone_numbers.length > 0 && (
                            <div className="space-y-2 mt-3 pt-3 border-t border-slate-600/50">
                              {account.phone_numbers.map(
                                (phone, phoneIndex) => (
                                  <div
                                    key={phone.id || phoneIndex}
                                    className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="p-2 rounded-lg bg-green-500/20">
                                        <Phone className="w-4 h-4 text-green-400" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-white">
                                          {phone.display_phone_number}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                          {phone.verified_name}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {getStatusBadge(phone.status)}
                                      <span
                                        className={`w-2 h-2 rounded-full ${getQualityColor(
                                          phone.quality_rating,
                                        )}`}
                                        title={`Quality: ${phone.quality_rating}`}
                                      />
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          )}

                        {(!account.phone_numbers ||
                          account.phone_numbers.length === 0) && (
                          <div className="mt-3 pt-3 border-t border-slate-600/50">
                            <p className="text-sm text-slate-400 flex items-center gap-2">
                              <AlertCircle className="w-4 h-4" />
                              No phone numbers associated with this account
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
            </CardContent>
          </>
        ) : (
          /* Disconnected State - Connection Form */
          <>
            <CardHeader className="pb-4">
              <CardTitle className="text-white">Connect Your Account</CardTitle>
              <CardDescription className="text-slate-400">
                Choose a method to connect your WhatsApp Business Account
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Method Tabs */}
              <div className="flex gap-2 mb-6">
                <Button
                  variant={activeMethod === "oauth" ? "default" : "outline"}
                  onClick={() => setActiveMethod("oauth")}
                  className={
                    activeMethod === "oauth"
                      ? "bg-green-600 hover:bg-green-700"
                      : "border-slate-600 text-slate-400 hover:text-white hover:bg-slate-700"
                  }
                >
                  <Zap className="w-4 h-4 mr-2" />
                  OAuth
                </Button>
                <Button
                  variant={activeMethod === "manual" ? "default" : "outline"}
                  onClick={() => setActiveMethod("manual")}
                  className={
                    activeMethod === "manual"
                      ? "bg-green-600 hover:bg-green-700"
                      : "border-slate-600 text-slate-400 hover:text-white hover:bg-slate-700"
                  }
                >
                  <Key className="w-4 h-4 mr-2" />
                  Manual Token
                </Button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* OAuth Form */}
              {activeMethod === "oauth" && (
                <div className="space-y-4">
                  <div className="p-6 rounded-lg bg-gradient-to-br from-green-500/10 to-teal-500/10 border border-green-500/20 text-center">
                    <div className="p-3 rounded-full bg-green-500/20 w-fit mx-auto mb-4">
                      <Shield className="w-8 h-8 text-green-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Connect with Meta
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">
                      Securely connect your WhatsApp Business Account using your
                      Meta account. This is the recommended method.
                    </p>
                    <Button
                      onClick={handleOAuthConnect}
                      disabled={isLoading}
                      className="bg-green-600 hover:bg-green-700 text-white min-w-[180px]"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {isFetchingAccount ? "Fetching..." : "Connecting..."}
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Connect with Meta
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Manual Token Form */}
              {activeMethod === "manual" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      Access Token <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      placeholder="Enter your Meta access token"
                      className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      WABA ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={manualWabaId}
                      onChange={(e) => setManualWabaId(e.target.value)}
                      placeholder="Enter specific WABA ID"
                      className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Phone Number ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={manualPhoneId}
                      onChange={(e) => setManualPhoneId(e.target.value)}
                      placeholder="Enter specific phone number ID"
                      className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <Button
                    onClick={handleManualConnect}
                    disabled={isLoading || !manualToken.trim()}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Connect
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-slate-400 text-center">
                    You can get your access token from the Meta Developer Portal
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t border-slate-700 pt-4">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Globe className="w-4 h-4" />
                <span>Your data is securely transmitted and stored</span>
              </div>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
