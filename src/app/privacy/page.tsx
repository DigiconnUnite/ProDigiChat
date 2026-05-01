import type { Metadata } from "next";
import { Header } from "@/components/header";
import { PublicFooter } from "@/components/public-footer";

export const metadata: Metadata = {
  title: "Privacy Policy | WhatsApp Marketing Tool",
  description: "Our Privacy Policy explains how we collect, use, and protect your personal information when using our WhatsApp marketing platform.",
};

export default function PrivacyPage() {
  return (
    <>
      <Header variant="public" className="fixed top-0 left-0 right-0 z-50" />

      {/* Main Content - Light background requires dark text */}
      <div className="min-h-screen bg-background pt-20  border">
        {/* Content Container */}
        <main className="container mx-auto px-4 py-12 max-w-6xl">
          <div className="rounded-4xl p-8 md:p-12 ">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Privacy Policy
            </h1>

            <p className="text-green-700 mb-8">
              Last updated:{" "}
              {new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>

            <div className="space-y-8">
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  1. Introduction
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  Welcome to WhatsApp Marketing Tool ("we," "our," or "us"). We
                  are fully committed to protecting your privacy and safeguarding your personal information. This Privacy Policy
                  explains how your personal information is collected, used, and
                  disclosed by WhatsApp Marketing Tool when you use our website
                  and services.
                </p>
                <p className="text-gray-600 leading-relaxed mt-4">
                  By using our service, you agree to the collection and use of
                  information in accordance with this policy.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  2. Information We Collect
                </h2>
                <h3 className="text-xl font-medium text-green-700 mb-3">
                  Personal Information
                </h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-600">
                  <li>Account information (name, email, phone number)</li>
                  <li>Business information (company name, business type)</li>
                  <li>
                    Payment information (processed securely through our payment
                    providers)
                  </li>
                  <li>WhatsApp Business account information</li>
                </ul>

                <h3 className="text-xl font-medium text-green-700 mb-3 mt-6">
                  Automatically Collected Information
                </h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-600">
                  <li>
                    Device information (IP address, browser type, operating
                    system)
                  </li>
                  <li>Usage data (pages visited, features used, time spent)</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  3. How We Use Your Information
                </h2>
                <p className="text-gray-600 mb-4">
                  We use the information we collect to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-600">
                  <li>Provide, maintain, and improve our services</li>
                  <li>
                    Process your transactions and send related information
                  </li>
                  <li>
                    Send you technical notices, updates, and support messages
                  </li>
                  <li>Respond to your comments, questions, and requests</li>
                  <li>
                    Communicate with you about products, services, and events
                  </li>
                  <li>Monitor and analyze trends, usage, and activities</li>
                  <li>
                    Detect, investigate, and prevent fraudulent transactions and
                    illegal activities
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  4. Information Sharing
                </h2>
                <p className="text-gray-600 mb-4">
                  We may share your information with:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-600">
                  <li>
                    <strong className="text-green-800">
                      Service Providers:
                    </strong>{" "}
                    Companies that help us operate our business (hosting,
                    payment processing, analytics)
                  </li>
                  <li>
                    <strong className="text-green-800">WhatsApp/Meta:</strong>{" "}
                    As required for providing WhatsApp Business API services
                  </li>
                  <li>
                    <strong className="text-green-800">
                      Legal Requirements:
                    </strong>{" "}
                    When required by law or in response to valid requests
                  </li>
                  <li>
                    <strong className="text-green-800">
                      Business Transfers:
                    </strong>{" "}
                    In connection with mergers, acquisitions, or asset sales
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  5. Data Security
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  We implement appropriate technical and organizational measures
                  to protect your personal information, including industry-standard encryption of
                  data in transit and at rest, regular security assessments, and
                  strict access controls. However, no method of transmission over the
                  Internet or electronic storage is 100% secure, and we cannot
                  guarantee absolute security. We continuously work to improve our security practices.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  6. Data Retention
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  We retain your personal information for as long as your
                  account is active or as needed to provide you services. We
                  will retain and use your information as necessary to comply
                  with our legal obligations, resolve disputes, and enforce our
                  agreements.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  7. Your Rights
                </h2>
                <p className="text-gray-600 mb-4">
                  You have the following rights regarding your personal
                  information:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-600">
                  <li>
                    <strong className="text-green-800">Access:</strong> Request
                    a copy of the personal information we hold about you
                  </li>
                  <li>
                    <strong className="text-green-800">Correction:</strong>{" "}
                    Request correction of inaccurate personal information
                  </li>
                  <li>
                    <strong className="text-green-800">Deletion:</strong>{" "}
                    Request deletion of your personal information
                  </li>
                  <li>
                    <strong className="text-green-800">
                      Data Portability:
                    </strong>{" "}
                    Request a copy of your data in a structured,
                    machine-readable format
                  </li>
                  <li>
                    <strong className="text-green-800">Opt-out:</strong>{" "}
                    Unsubscribe from marketing communications at any time
                  </li>
                </ul>
                <p className="text-gray-600 mt-4">
                  To exercise these rights, please contact us at
                  support@whatsappmarketingtool.com.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  8. Third-Party Services
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  Our service may contain links to third-party websites or
                  services. We are not responsible for the privacy practices of
                  these third parties. We encourage you to review the privacy
                  policies of any third-party services you use.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  9. Children's Privacy
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  Our service is not intended for children under 13 years of
                  age. We do not knowingly collect personal information from
                  children under 13. If you are a parent or guardian and believe
                  your child has provided us with personal information, please
                  contact us.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  10. Changes to This Privacy Policy
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  We may update this Privacy Policy from time to time. We will
                  notify you of any changes by posting the new Privacy Policy on
                  this page and updating the "last updated" date. You are
                  advised to review this Privacy Policy periodically for any
                  changes.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  11. Contact Us
                </h2>
                <p className="text-gray-600 mb-4">
                  If you have any questions about this Privacy Policy, please
                  contact us:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-600">
                  <li>Email: support@whatsappmarketingtool.com</li>
                  <li>Website: www.whatsappmarketingtool.com</li>
                </ul>
              </section>
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <PublicFooter />
    </>
  );
}