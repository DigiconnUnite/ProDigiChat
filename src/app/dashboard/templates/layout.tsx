import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Templates - ProDigiChat',
  description: 'Manage your WhatsApp message templates',
};

export default function TemplatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
