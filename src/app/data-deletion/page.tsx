import type { Metadata } from "next";
import { Header } from "@/components/header";
import { PublicFooter } from "@/components/public-footer";

export const metadata: Metadata = {
  title: "Data Deletion | ProDigiChat",
  description:
    "How to request deletion of your personal data and WhatsApp Business data from ProDigiChat.",
};

export default async function DataDeletionPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  return (
    <>
      <Header variant="public" className="fixed top-0 left-0 right-0 z-50" />

      <div className="min-h-screen bg-background pt-20 border">
        <main className="max-w-[1440px] mx-auto px-4 py-12">
          <div className="rounded-4xl p-8 md:p-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Data Deletion
            </h1>

            <p className="text-green-700 mb-8">
              How to request deletion of your data from ProDigiChat
            </p>

            {id && (
              <div className="mb-8 rounded-xl border border-green-200 bg-green-50 p-6">
                <h2 className="text-lg font-semibold text-green-900 mb-2">
                  Deletion request received
                </h2>
                <p className="text-green-800">
                  Your data deletion request has been received and processed.
                  Confirmation code:{" "}
                  <code className="font-mono font-semibold">{id}</code>
                </p>
                <p className="text-green-800 mt-2">
                  The WhatsApp Business connection and associated access tokens
                  linked to your account have been removed from our systems. If
                  you have any questions, contact us at support@prodigichat.com
                  and quote the confirmation code above.
                </p>
              </div>
            )}

            <div className="space-y-8">
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Your right to deletion
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  ProDigiChat ("we," "our," or "us") respects your right to have
                  your personal data deleted. This page explains how to request
                  deletion of the data we hold about you, including data
                  obtained through the WhatsApp Business Platform provided by
                  Meta.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  How to request deletion
                </h2>
                <p className="text-gray-600 mb-4">
                  You can request deletion of your data in any of the following
                  ways:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-600">
                  <li>
                    <strong className="text-green-800">In the app:</strong> Go
                    to Settings → Account and choose "Delete account". This
                    permanently removes your account and all associated data.
                  </li>
                  <li>
                    <strong className="text-green-800">
                      Disconnect WhatsApp:
                    </strong>{" "}
                    Go to Settings → WhatsApp and disconnect your WhatsApp
                    Business Account to remove the stored connection and access
                    tokens.
                  </li>
                  <li>
                    <strong className="text-green-800">By email:</strong> Send a
                    request to support@prodigichat.com from the email address
                    associated with your account.
                  </li>
                  <li>
                    <strong className="text-green-800">Via Meta:</strong> If you
                    connected through Facebook, removing the ProDigiChat app
                    from your Facebook settings automatically sends us a data
                    deletion request, which we process within 30 days.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  What gets deleted
                </h2>
                <ul className="list-disc pl-6 space-y-2 text-gray-600">
                  <li>Your account and profile information</li>
                  <li>
                    WhatsApp Business Account connection details and encrypted
                    access tokens
                  </li>
                  <li>Contacts, message history, and campaign data</li>
                  <li>Templates and analytics associated with your account</li>
                </ul>
                <p className="text-gray-600 mt-4">
                  We complete deletion within 30 days, except where retention is
                  required to comply with legal obligations. Some records may be
                  retained in encrypted backups for a limited period before they
                  are overwritten.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Contact
                </h2>
                <p className="text-gray-600">
                  Questions about data deletion? Email us at
                  support@prodigichat.com.
                </p>
              </section>
            </div>
          </div>
        </main>
      </div>

      <PublicFooter />
    </>
  );
}
