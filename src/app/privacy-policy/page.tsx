import Link from "next/link";

import { LegalDocument } from "@/components/marketing/legal-document";

export const metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for the widget AI customer support platform.",
};

const effectiveDate = "June 30, 2026";

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      description="This Privacy Policy explains how Widget Inc. collects, uses, shares, and protects information when you use widget."
      effectiveDate={effectiveDate}
      sections={[
        {
          title: "1. Who we are",
          content: (
            <p>
              Widget Inc. (&quot;widget,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;)
              provides an AI customer support platform for businesses. This policy applies to
              visitors of our website, account holders, workspace members, and end users who
              interact with the widget embedded on our customers&apos; websites.
            </p>
          ),
        },
        {
          title: "2. Information we collect",
          content: (
            <>
              <p>Depending on how you interact with widget, we may collect:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-foreground">Account information:</strong> name, email
                  address, profile image, and authentication identifiers provided through Google
                  OAuth
                </li>
                <li>
                  <strong className="text-foreground">Workspace and configuration data:</strong>{" "}
                  workspace settings, widget appearance, authorized domains, knowledge base sources,
                  and integration settings
                </li>
                <li>
                  <strong className="text-foreground">Conversation and support data:</strong>{" "}
                  messages, attachments, visitor metadata, lead capture details, feedback, and
                  assignment or escalation history
                </li>
                <li>
                  <strong className="text-foreground">Usage and technical data:</strong> log data,
                  device/browser information, IP address, timestamps, and product analytics needed
                  to operate and secure the service
                </li>
                <li>
                  <strong className="text-foreground">Contact form data:</strong> information you
                  submit when contacting us, such as name, email, company, subject, and message
                </li>
              </ul>
            </>
          ),
        },
        {
          title: "3. How we use information",
          content: (
            <>
              <p>We use information to:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Provide, operate, and maintain the widget platform and dashboard</li>
                <li>Authenticate users and manage workspace access</li>
                <li>
                  Generate AI-assisted responses based on customer-configured knowledge and settings
                </li>
                <li>Enable integrations you choose to connect</li>
                <li>Monitor performance, troubleshoot issues, and prevent abuse or fraud</li>
                <li>Respond to support requests and communicate about the service</li>
                <li>Comply with legal obligations and enforce our Terms of Service</li>
              </ul>
            </>
          ),
        },
        {
          title: "4. AI processing",
          content: (
            <>
              <p>
                widget processes conversation content and knowledge base materials to generate
                support responses and related features. Our customers control what content is
                uploaded and how the widget behaves on their sites.
              </p>
              <p>
                We do not use customer proprietary content to train public foundation models for
                unrelated third-party products. AI processing is performed to deliver the service to
                the customer whose workspace owns the data.
              </p>
            </>
          ),
        },
        {
          title: "5. How we share information",
          content: (
            <>
              <p>We may share information with:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-foreground">Service providers:</strong> infrastructure,
                  hosting, storage, analytics, and AI providers that help us operate widget
                </li>
                <li>
                  <strong className="text-foreground">Integrations you enable:</strong> third-party
                  services such as Google or Slack when a workspace connects them
                </li>
                <li>
                  <strong className="text-foreground">Workspace members:</strong> other authorized
                  users within the same customer workspace
                </li>
                <li>
                  <strong className="text-foreground">Legal and safety recipients:</strong> when
                  required by law, to protect rights and safety, or in connection with a merger,
                  acquisition, or asset sale
                </li>
              </ul>
              <p>We do not sell personal information.</p>
            </>
          ),
        },
        {
          title: "6. Data retention",
          content: (
            <p>
              We retain information for as long as needed to provide the services, comply with legal
              obligations, resolve disputes, and enforce agreements. Retention periods may vary
              based on data type, workspace settings, and customer requests. Customers may request
              deletion of workspace data subject to applicable law and technical limitations.
            </p>
          ),
        },
        {
          title: "7. Security",
          content: (
            <p>
              We use administrative, technical, and organizational safeguards designed to protect
              information, including encryption in transit, access controls, and tenant isolation
              for workspace data. No method of transmission or storage is completely secure, and we
              cannot guarantee absolute security.
            </p>
          ),
        },
        {
          title: "8. International transfers",
          content: (
            <p>
              widget may process and store information in the United States and other countries
              where we or our service providers operate. When information is transferred
              internationally, we take steps designed to provide appropriate protections consistent
              with applicable law.
            </p>
          ),
        },
        {
          title: "9. Your rights and choices",
          content: (
            <>
              <p>Depending on your location, you may have rights to:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Access, correct, or delete certain personal information</li>
                <li>Object to or restrict certain processing</li>
                <li>Withdraw consent where processing is based on consent</li>
                <li>Request portability of certain information</li>
              </ul>
              <p>
                Account holders can manage much of their information through the dashboard. Other
                requests can be submitted through our{" "}
                <Link
                  href="/contact"
                  className="text-primary underline underline-offset-4 hover:text-foreground"
                >
                  contact page
                </Link>
                . We may need to verify your identity before responding.
              </p>
            </>
          ),
        },
        {
          title: "10. End users and website visitors",
          content: (
            <p>
              If you interact with widget on a customer&apos;s website, that customer is generally
              the controller of your interaction data. widget processes that data on the
              customer&apos;s instructions to provide the embedded support experience. Privacy
              questions about a specific website&apos;s use of widget should be directed to that
              website operator, who may also provide their own privacy policy in the widget.
            </p>
          ),
        },
        {
          title: "11. Children",
          content: (
            <p>
              widget is not directed to children under 13, and we do not knowingly collect personal
              information from children under 13. If you believe a child has provided us personal
              information, contact us and we will take appropriate steps.
            </p>
          ),
        },
        {
          title: "12. Changes to this policy",
          content: (
            <p>
              We may update this Privacy Policy from time to time. If we make material changes, we
              will post the updated policy on this page and update the effective date. Your
              continued use of widget after changes become effective constitutes acceptance of the
              revised policy.
            </p>
          ),
        },
        {
          title: "13. Contact us",
          content: (
            <p>
              For privacy questions or requests, contact us through our{" "}
              <Link
                href="/contact"
                className="text-primary underline underline-offset-4 hover:text-foreground"
              >
                contact page
              </Link>
              .
            </p>
          ),
        },
      ]}
    />
  );
}
