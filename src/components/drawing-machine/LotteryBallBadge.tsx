"use client";

import React from "react";
import { getBallColor } from "./ball-textures";
import { Crown } from "lucide-react";

interface LotteryBallBadgeProps {
  number: number;
  formatted?: string;
  size?: "sm" | "md" | "lg" | "tray";
  isBonus?: boolean;
  className?: string;
  animate?: boolean;
}

export default function LotteryBallBadge({
  number,
  formatted,
  size = "md",
  isBonus = false,
  className = "",
  animate = false
}: LotteryBallBadgeProps) {
  const numStr = formatted || number.toString().padStart(2, "0");
  const colorInfo = getBallColor(number);

  // Size configurations
  const sizeStyles = {
    sm: {
      ball: "w-7 h-7 sm:w-8 sm:h-8",
      badge: "w-4 h-4 sm:w-4.5 sm:h-4.5",
      text: "text-[11px] sm:text-xs font-black",
      shadow: "shadow-md",
      crown: "w-2.5 h-2.5 -top-1 -right-1"
    },
    md: {
      ball: "w-8 h-8 sm:w-9 sm:h-9",
      badge: "w-5 h-5 sm:w-5.5 sm:h-5.5",
      text: "text-xs sm:text-sm font-black",
      shadow: "shadow-lg",
      crown: "w-3 h-3 -top-1 -right-1"
    },
    lg: {
      ball: "w-10 h-10 sm:w-11 sm:h-11",
      badge: "w-6.5 h-6.5 sm:w-7 sm:h-7",
      text: "text-sm sm:text-base font-black",
      shadow: "shadow-xl",
      crown: "w-3.5 h-3.5 -top-1.5 -right-1.5"
    },
    tray: {
      ball: "w-12 h-12 sm:w-16 sm:h-16 md:w-18 md:h-18",
      badge: "w-7.5 h-7.5 sm:w-10 sm:h-10 md:w-11 md:h-11",
      text: "text-base sm:text-xl md:text-2xl font-black",
      shadow: "shadow-2xl",
      crown: "w-4.5 h-4.5 sm:w-5 sm:h-5 -top-2 -right-1.5"
    }
  };

  const s = sizeStyles[size];

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className} ${
        animate ? "animate-in zoom-in-75 duration-300" : ""
      }`}
    >
      {/* 3D Sphere Outer Body */}
      <div
        style={{
          background: colorInfo.gradient,
          boxShadow: `0 6px 16px -2px ${colorInfo.glow}, inset 0 -3px 6px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.6)`
        }}
        className={`relative ${s.ball} rounded-full flex items-center justify-center border border-white/40 ${s.shadow} transition-transform`}
      >
        {/* Top-left Specular Glass Reflection */}
        <div
          className="absolute top-[8%] left-[12%] w-[45%] h-[35%] rounded-full pointer-events-none opacity-80"
          style={{
            background: "radial-gradient(ellipse at center, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.2) 60%, transparent 100%)",
            transform: "rotate(-25deg)"
          }}
        />

        {/* Center Circular White Badge with Metallic Bezel */}
        <div
          style={{
            background: "radial-gradient(circle at 40% 35%, #ffffff 0%, #f8fafc 70%, #e2e8f0 100%)",
            boxShadow: `inset 0 1px 2px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.35)`
          }}
          className={`relative ${s.badge} rounded-full flex items-center justify-center border-[1.5px] sm:border-2 border-white/95 shrink-0`}
        >
          {/* Number Label */}
          <span
            style={{ color: "#0f172a" }}
            className={`relative leading-none tracking-tight font-extrabold ${s.text}`}
          >
            {numStr}
          </span>
        </div>

        {/* Bottom Ambient Glow / Rim */}
        <div
          className="absolute bottom-0 inset-x-0 h-[25%] rounded-b-full pointer-events-none opacity-30"
          style={{
            background: "linear-gradient(to top, rgba(0,0,0,0.5), transparent)"
          }}
        />
      </div>

      {/* Bonus Ball Crown Tag (For Lotto 5/35 6th ball) */}
      {isBonus && (
        <div
          title="Bóng đặc biệt (Bonus / Jackpot)"
          className={`absolute ${s.crown} rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-zinc-950 p-0.5 sm:p-1 shadow-lg border border-amber-200 z-10 flex items-center justify-center animate-bounce`}
        >
          <Crown className="w-full h-full fill-current" />
        </div>
      )}
    </div>
  );
}
