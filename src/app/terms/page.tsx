import type { Metadata } from "next";
import { Header } from "@/components/header";
import { PublicFooter } from "@/components/public-footer";

export const metadata: Metadata = {
  title: "Terms of Service | WhatsApp Marketing Tool",
  description: "Our Terms of Service outline the rules and guidelines for using our WhatsApp marketing platform.",
};

export default function TermsPage() {
  return (
    <>
      <Header variant="public" className="fixed top-0 left-0 right-0 z-50" />
      
      {/* Main Content - Green background matching main website */}
      <div className="min-h-screen bg-green-950 pt-20">
        {/* Content Container with dark styling */}
        <main className="container mx-auto px-4 py-12 max-w-4xl">
          <div className="bg-green-900/30 rounded-4xl p-8 md:p-12 border border-green-800/50">
            <h1 className="text-4xl font-bold text-white mb-4">Terms of Service</h1>
            
            <p className="text-green-200 mb-8">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <div className="space-y-8">
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
                <p className="text-green-100/80 leading-relaxed">
                  By accessing and using WhatsApp Marketing Tool ("the Service"), you accept and agree to be bound 
                  by the terms and provision of this agreement. If you do not agree to abide by these terms, please 
                  do not use this Service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">2. Description of Service</h2>
                <p className="text-green-100/80 leading-relaxed">
                  WhatsApp Marketing Tool is a platform that enables businesses to manage WhatsApp marketing campaigns, 
                  automate messaging, manage contacts, and analyze campaign performance through the WhatsApp Business API.
                </p>
                <p className="text-green-100/80 leading-relaxed mt-4">
                  The Service includes:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4 text-green-100/80">
                  <li>Campaign creation and management</li>
                  <li>Contact management and segmentation</li>
                  <li>Automated messaging workflows</li>
                  <li>Template message management</li>
                  <li>Analytics and reporting</li>
                  <li>WhatsApp Business API integration</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">3. User Accounts</h2>
                <p className="text-green-100/80 leading-relaxed mb-4">
                  To use our Service, you must create an account. You agree to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-green-100/80">
                  <li>Provide accurate and complete registration information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Promptly update any changes to your information</li>
                  <li>Accept responsibility for all activities that occur under your account</li>
                  <li>Notify us immediately of any unauthorized use of your account</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">4. Acceptable Use</h2>
                <p className="text-green-100/80 mb-4">You agree not to use the Service to:</p>
                <ul className="list-disc pl-6 space-y-2 text-green-100/80">
                  <li>Send spam, phishing, or unsolicited messages</li>
                  <li>Harass, abuse, or harm others</li>
                  <li>Violate any applicable laws or regulations</li>
                  <li>Infringe upon the rights of others</li>
                  <li>Distribute malware, viruses, or other harmful code</li>
                  <li>Engage in any activity that violates WhatsApp's Terms of Service</li>
                  <li>Send messages to contacts who have not consented to receive communications</li>
                  <li>Attempt to gain unauthorized access to the Service or its systems</li>
                </ul>
                <p className="text-green-100/80 mt-4 leading-relaxed">
                  We reserve the right to suspend or terminate accounts that violate these terms.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">5. Compliance with WhatsApp Policies</h2>
                <p className="text-green-100/80 leading-relaxed mb-4">
                  By using our Service, you agree to comply with WhatsApp's Business and Commerce Policies, 
                  including but not limited to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-green-100/80">
                  <li>Only sending messages to users who have opted in to receive communications</li>
                  <li>Providing clear opt-out mechanisms in all messages</li>
                  <li>Not sending prohibited content (adult content, illegal goods, etc.)</li>
                  <li>Maintaining proper consent records</li>
                  <li>Responding to user inquiries within 24 hours</li>
                </ul>
                <p className="text-green-100/80 mt-4 leading-relaxed">
                  Violation of WhatsApp policies may result in your WhatsApp Business account being suspended or 
                  terminated by Meta/WhatsApp, which is outside our control.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">6. Payment and Billing</h2>
                <p className="text-green-100/80 leading-relaxed mb-4">
                  Some features of the Service require payment. You agree to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-green-100/80">
                  <li>Pay all fees associated with your subscription plan</li>
                  <li>Provide valid payment information</li>
                  <li>Authorize us to charge your payment method for any fees</li>
                  <li>Notify us of any changes to your payment information</li>
                </ul>
                <p className="text-green-100/80 mt-4 leading-relaxed">
                  Fees are non-refundable unless otherwise specified. We reserve the right to change our 
                  pricing at any time with 30 days' notice.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">7. Intellectual Property</h2>
                <p className="text-green-100/80 leading-relaxed">
                  The Service and its original content, features, and functionality are owned by WhatsApp 
                  Marketing Tool and are protected by international copyright, trademark, patent, trade 
                  secret, and other intellectual property laws.
                </p>
                <p className="text-green-100/80 leading-relaxed mt-4">
                  You may not reproduce, distribute, modify, create derivative works of, publicly display, 
                  publicly perform, republish, download, store, or transmit any of the material on our 
                  website without our prior written consent.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">8. User Content</h2>
                <p className="text-green-100/80 leading-relaxed">
                  You retain ownership of any content you submit to the Service ("User Content"). By submitting 
                  User Content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, 
                  modify, adapt, publish, translate, and distribute it in connection with providing the Service.
                </p>
                <p className="text-green-100/80 leading-relaxed mt-4 mb-4">
                  You represent and warrant that:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-green-100/80">
                  <li>You own or have the right to use the User Content</li>
                  <li>The User Content does not violate any third-party rights</li>
                  <li>The User Content complies with these Terms</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">9. Disclaimers</h2>
                <p className="text-green-100/80 leading-relaxed">
                  THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. WE MAKE NO REPRESENTATIONS 
                  OR WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, ABOUT THE COMPLETENESS, ACCURACY, RELIABILITY, 
                  OR AVAILABILITY OF THE SERVICE.
                </p>
                <p className="text-green-100/80 leading-relaxed mt-4">
                  WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE. 
                  ANY MATERIAL OBTAINED THROUGH THE SERVICE IS AT YOUR OWN RISK.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">10. Limitation of Liability</h2>
                <p className="text-green-100/80 leading-relaxed mb-4">
                  IN NO EVENT SHALL WHATSAPP MARKETING TOOL, ITS OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS, 
                  BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING 
                  WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, 
                  RESULTING FROM:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-green-100/80">
                  <li>YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE SERVICE</li>
                  <li>ANY CONDUCT OR CONTENT OF ANY THIRD PARTY ON THE SERVICE</li>
                  <li>ANY CONTENT OBTAINED FROM THE SERVICE</li>
                  <li>UNAUTHORIZED ACCESS, USE, OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">11. Indemnification</h2>
                <p className="text-green-100/80 leading-relaxed">
                  You agree to defend, indemnify, and hold harmless WhatsApp Marketing Tool and its officers, 
                  directors, employees, and agents from and against any claims, liabilities, damages, judgments, 
                  awards, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out 
                  of or relating to your violation of these Terms or your use of the Service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">12. Termination</h2>
                <p className="text-green-100/80 leading-relaxed">
                  We may terminate or suspend your account and access to the Service immediately, without 
                  prior notice or liability, for any reason, including breach of these Terms.
                </p>
                <p className="text-green-100/80 leading-relaxed mt-4">
                  Upon termination, your right to use the Service will immediately cease. If you wish to 
                  terminate your account, you may simply discontinue using the Service or contact us to 
                  request account deletion.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">13. Governing Law</h2>
                <p className="text-green-100/80 leading-relaxed">
                  These Terms shall be governed and construed in accordance with the laws of the jurisdiction 
                  in which our company is registered, without regard to its conflict of law provisions.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">14. Changes to Terms</h2>
                <p className="text-green-100/80 leading-relaxed">
                  We reserve the right to modify these Terms at any time. We will provide notice of any 
                  material changes by posting the new Terms on this page and updating the "last updated" date.
                </p>
                <p className="text-green-100/80 leading-relaxed mt-4">
                  Your continued use of the Service after any such changes constitutes your acceptance of 
                  the new Terms.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">15. Contact Us</h2>
                <p className="text-green-100/80 mb-4">
                  If you have any questions about these Terms, please contact us:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-green-100/80">
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
