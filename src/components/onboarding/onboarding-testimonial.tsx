"use client";

import { TESTIMONIALS } from "@/features/onboarding/constants";

type OnboardingTestimonialProps = {
  index?: number;
};

export function OnboardingTestimonial({ index = 0 }: OnboardingTestimonialProps) {
  const testimonial = TESTIMONIALS[index % TESTIMONIALS.length];

  return (
    <div className="relative z-10 flex h-full flex-col justify-center px-10 xl:px-16">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <p className="text-lg font-bold tracking-wide text-gray-400">{testimonial.company}</p>
          <blockquote className="mt-4 text-base leading-relaxed text-gray-700">
            &ldquo;{testimonial.quote}&rdquo;
          </blockquote>
          <p className="mt-5 text-sm text-gray-500">
            <span className="font-semibold text-gray-900">{testimonial.author}</span>
            {", "}
            {testimonial.role}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-5 gap-px overflow-hidden rounded-lg bg-white/10">
          {[
            "Bridgestone",
            "Miele",
            "Opal",
            "Chuck E. Cheese",
            "Jumia",
            "National Grid",
            "Sage",
            "IHG",
            "F45",
            "Noon",
          ].map((name) => (
            <div
              key={name}
              className="flex h-12 items-center justify-center bg-white/5 px-2 text-center text-[10px] font-medium text-white/70"
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
