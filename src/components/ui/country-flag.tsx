"use client";

import Image from "next/image";
import React from "react";

interface CountryFlagProps {
  countryCode: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const CountryFlag = ({ countryCode, className = "", size = "md" }: CountryFlagProps) => {
  if (!countryCode) return null;

  const sizeClasses = {
    sm: "w-4 h-3",
    md: "w-6 h-4",
    lg: "w-8 h-6",
  };

  return (
    <div
      className={`inline-block overflow-hidden rounded-sm border border-border/50 align-middle ${sizeClasses[size]} ${className}`}
    >
      <Image
        src={`https://flagcdn.com/w80/${countryCode.toLowerCase()}.png`}
        alt={`${countryCode} flag`}
        width={80}
        height={60}
        unoptimized
        className="w-full h-full object-cover"
      />
    </div>
  );
};
