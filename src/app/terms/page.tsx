import { LegalDocument } from "@/components/marketing/legal-document";

export const metadata = {
  title: "Terms of Service",
  description: "Terms of Service for the Cogni AI customer support platform.",
};

const effectiveDate = "June 30, 2026";

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      description="These Terms govern your access to and use of Cogni, our AI customer support platform, embedded chat widget, dashboard, and related services."
      effectiveDate={effectiveDate}
      sections={[
        {
          title: "1. Agreement",
          content: (
            <>
              <p>
                These Terms of Service (&quot;Terms&quot;) are a binding agreement between you and
                Cogni Inc. (&quot;Cogni,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
                By creating an account, accessing the dashboard, embedding our Cogni, or otherwise
                using our services, you agree to these Terms and our Privacy Policy.
              </p>
              <p>
                If you use Cogni on behalf of a company or organization, you represent that you have
                authority to bind that organization, and &quot;you&quot; refers to that
                organization.
              </p>
            </>
          ),
        },
        {
          title: "2. Our services",
          content: (
            <>
              <p>
                Cogni provides software that helps teams deliver AI-assisted customer support,
                including an embeddable chat widget, workspace dashboard, conversation inbox,
                knowledge base ingestion, integrations, analytics, and human handoff workflows.
              </p>
              <p>
                We may update, improve, or discontinue features from time to time. We will make
                reasonable efforts to avoid material adverse changes to paid features during an
                active subscription term, where applicable.
              </p>
            </>
          ),
        },
        {
          title: "3. Accounts and authentication",
          content: (
            <>
              <p>
                You must create an account to use the dashboard. Authentication is provided through
                Google OAuth. You are responsible for maintaining the security of the Google account
                used to access Cogni and for all activity that occurs under your workspace.
              </p>
              <p>
                You must provide accurate account information and promptly update it if it changes.
                You may not share credentials in a way that violates these Terms or applicable law.
              </p>
            </>
          ),
        },
        {
          title: "4. Customer content and data",
          content: (
            <>
              <p>
                You retain ownership of content you submit to Cogni, including knowledge base
                materials, website content, conversation data, visitor messages, files, and
                configuration settings (&quot;Customer Content&quot;).
              </p>
              <p>
                You grant Cogni a limited license to host, process, transmit, and display Customer
                Content solely to provide, secure, and improve the services. You are responsible for
                ensuring you have all rights necessary to submit Customer Content and to use Cogni
                with your website visitors and end users.
              </p>
            </>
          ),
        },
        {
          title: "5. Acceptable use",
          content: (
            <>
              <p>You agree not to:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Use Cogni in violation of law or third-party rights</li>
                <li>Upload malware, abusive content, or unlawful material</li>
                <li>
                  Attempt to probe, scan, or test the vulnerability of our systems without
                  authorization
                </li>
                <li>
                  Reverse engineer, copy, or resell the services except as expressly permitted
                </li>
                <li>Use Cogni to send spam or deceptive communications</li>
                <li>
                  Misrepresent AI-generated responses as human when doing so would be misleading or
                  unlawful
                </li>
              </ul>
              <p>
                We may suspend or terminate access if we reasonably believe your use violates these
                Terms or creates risk for Cogni, other customers, or third parties.
              </p>
            </>
          ),
        },
        {
          title: "6. AI-generated output",
          content: (
            <>
              <p>
                Cogni uses artificial intelligence to generate responses based on your configured
                knowledge, prompts, and conversation context. AI output may be inaccurate,
                incomplete, or inappropriate. You are responsible for reviewing AI behavior,
                configuring guardrails, and providing human handoff where required.
              </p>
              <p>
                Cogni does not guarantee that AI responses will be correct, lawful, or suitable for
                every situation. You use AI features at your own discretion and risk.
              </p>
            </>
          ),
        },
        {
          title: "7. Integrations and third-party services",
          content: (
            <>
              <p>
                Cogni may connect with third-party services such as Google, Slack, Gmail, and other
                integrations you enable. Your use of third-party services is subject to their terms
                and privacy policies. We are not responsible for third-party services or for
                outages, data handling, or changes made by third parties.
              </p>
            </>
          ),
        },
        {
          title: "8. Fees and trials",
          content: (
            <>
              <p>
                Some features may be offered on a free or trial basis. If paid plans are introduced
                or you subscribe to a paid plan, fees, billing cycles, and renewal terms will be
                presented at checkout or in an order form. Unless otherwise stated, fees are
                non-refundable except where required by law.
              </p>
            </>
          ),
        },
        {
          title: "9. Confidentiality and security",
          content: (
            <>
              <p>
                We implement administrative, technical, and organizational measures designed to
                protect Customer Content. However, no online service can be guaranteed completely
                secure. You are responsible for configuring authorized domains, workspace
                membership, and access controls appropriately.
              </p>
            </>
          ),
        },
        {
          title: "10. Intellectual property",
          content: (
            <>
              <p>
                Cogni and its software, branding, documentation, and underlying technology are owned
                by Cogni Inc. or its licensors and are protected by intellectual property laws.
                These Terms do not grant you any rights to our trademarks or branding except as
                needed to use the service in accordance with our guidelines.
              </p>
            </>
          ),
        },
        {
          title: "11. Disclaimer of warranties",
          content: (
            <>
              <p>
                THE SERVICES ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE.&quot; TO THE
                MAXIMUM EXTENT PERMITTED BY LAW, WIDGET DISCLAIMS ALL WARRANTIES, WHETHER EXPRESS,
                IMPLIED, OR STATUTORY, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR
                A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>
            </>
          ),
        },
        {
          title: "12. Limitation of liability",
          content: (
            <>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, WIDGET WILL NOT BE LIABLE FOR ANY INDIRECT,
                INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF PROFITS,
                REVENUE, DATA, OR GOODWILL, ARISING OUT OF OR RELATED TO THE SERVICES.
              </p>
              <p>
                OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATING TO THE SERVICES WILL
                NOT EXCEED THE GREATER OF (A) THE AMOUNTS PAID BY YOU TO WIDGET FOR THE SERVICES IN
                THE TWELVE (12) MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM, OR (B) ONE HUNDRED
                U.S. DOLLARS (US$100).
              </p>
            </>
          ),
        },
        {
          title: "13. Termination",
          content: (
            <>
              <p>
                You may stop using Cogni at any time. We may suspend or terminate your access if you
                materially breach these Terms, if required by law, or if continued provision of the
                services becomes impractical. Upon termination, your right to access the dashboard
                ends, subject to any data export or retention obligations described in our Privacy
                Policy.
              </p>
            </>
          ),
        },
        {
          title: "14. Governing law",
          content: (
            <p>
              These Terms are governed by the laws of the State of Delaware, United States, without
              regard to conflict of law principles, except where mandatory local law applies.
              Disputes will be resolved in the courts located in Delaware, unless otherwise required
              by applicable law.
            </p>
          ),
        },
        {
          title: "15. Contact",
          content: (
            <p>
              Questions about these Terms can be sent to{" "}
              <a
                href="mailto:hi@falakgala.dev"
                className="text-primary underline underline-offset-4 hover:opacity-80"
              >
                hi@falakgala.dev
              </a>
              .
            </p>
          ),
        },
      ]}
    />
  );
}
