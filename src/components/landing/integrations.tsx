"use client";

import Image from "next/image";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SectionLayout } from "./section-layout";

/**
 * All icons sourced from /public/assets/icons/.
 * Light-variant files (cal-com-light, pipedrive-light, resend-light, typeform-light)
 * are excluded: they render invisibly on a white background.
 */
const INTEGRATIONS = [
  { name: "Gmail", src: "/assets/icons/gmail.svg" },
  { name: "Slack", src: "/assets/icons/slack.svg" },
  { name: "HubSpot", src: "/assets/icons/hubspot.png" },
  { name: "Salesforce", src: "/assets/icons/salesforce.svg" },
  { name: "Stripe", src: "/assets/icons/stripe.svg" },
  { name: "Zapier", src: "/assets/icons/zapier.webp" },
  { name: "WhatsApp", src: "/assets/icons/whatsapp.svg" },
  { name: "Telegram", src: "/assets/icons/telegram.svg" },
  { name: "Facebook", src: "/assets/icons/facebook.png" },
  { name: "Meta", src: "/assets/icons/meta.png" },
  { name: "Messenger", src: "/assets/icons/messenger.webp" },
  { name: "Dropbox", src: "/assets/icons/dropbox.svg" },
  { name: "Microsoft Teams", src: "/assets/icons/microsoft-teams.svg" },
  { name: "Microsoft OneDrive", src: "/assets/icons/microsoft-onedrive.svg" },
  { name: "Google", src: "/assets/icons/google.svg" },
  { name: "Google Calendar", src: "/assets/icons/google-calendar.svg" },
  { name: "Google Drive", src: "/assets/icons/drive.svg" },
  { name: "Calendly", src: "/assets/icons/calendly.png" },
  { name: "Cal.com", src: "/assets/icons/cal-com.svg" },
  { name: "Brevo", src: "/assets/icons/brevo.svg" },
  { name: "Mailchimp", src: "/assets/icons/mailchimp.jpeg" },
  { name: "Resend", src: "/assets/icons/resend-dark.svg" },
  { name: "SendGrid", src: "/assets/icons/sendgrid.webp" },
  { name: "Typeform", src: "/assets/icons/typeform.svg" },
  { name: "Tally", src: "/assets/icons/tally.jpeg" },
  { name: "Jotform", src: "/assets/icons/jotform.svg" },
  { name: "Pipedrive", src: "/assets/icons/pipedrive.png" },
  { name: "Polar", src: "/assets/icons/polar.svg" },
  { name: "Razorpay", src: "/assets/icons/razorpay.png" },
  { name: "Zoho", src: "/assets/icons/zoho.png" },
] as const;

export function Integrations() {
  return (
    <SectionLayout id="integrations">
      <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">
        {/* ── Left: text content ── */}
        <div className="flex-shrink-0 lg:w-[36%]">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            Integrations
          </p>
          <h2 className="text-3xl font-bold tracking-[-0.025em] text-gray-900 sm:text-4xl lg:text-[2.5rem] lg:leading-[1.15]">
            Explore integrations
            <br />
            for your stack.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-gray-500">
            Save time and start faster with pre-built integrations for every tool your support team
            already uses.
          </p>
        </div>

        {/* ── Right: icon grid with tooltips ── */}
        <div className="flex-1">
          <div className="grid grid-cols-5 gap-3 sm:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6">
            {INTEGRATIONS.map((item) => (
              <Tooltip key={item.name}>
                <TooltipTrigger
                  render={
                    <div className="group flex aspect-square cursor-default items-center justify-center rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:border-gray-200 hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)]" />
                  }
                >
                  <Image
                    src={item.src}
                    alt={item.name}
                    width={36}
                    height={36}
                    unoptimized
                    className="size-full max-h-8 max-w-8 object-contain transition-transform duration-200 group-hover:scale-110"
                  />
                </TooltipTrigger>
                <TooltipContent side="top">{item.name}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>
    </SectionLayout>
  );
}
