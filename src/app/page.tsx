"use client";

import React from "react";
import DrawingMachineContainer from "@/components/drawing-machine/DrawingMachineContainer";
import { Award } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#090a0f] bg-radial-[at_50%_0%] from-zinc-900/60 via-[#090a0f] to-[#050608] text-zinc-100 flex flex-col items-center py-4 px-3 sm:px-6 lg:px-8">
      {/* Standalone Brand & Navigation Bar */}
      <header className="w-full max-w-6xl flex items-center justify-between py-2 px-1 mb-3">
        <div className="flex items-center gap-3">
          {/* Iconic 5-Petal Fortune Flower Emblem (Cánh hoa may mắn) */}
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-rose-500/30 via-red-600/20 to-amber-500/20 p-[1.5px] shadow-lg shadow-rose-500/20 flex items-center justify-center shrink-0">
            <div className="w-full h-full rounded-[14px] bg-zinc-950 flex items-center justify-center p-1 relative overflow-hidden group cursor-pointer border border-rose-500/30">
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_rgba(239,68,68,0.7)] transition-transform duration-300 group-hover:scale-105">
                <defs>
                  <radialGradient id="petalGrad" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#ff4d62" />
                    <stop offset="45%" stopColor="#e11d48" />
                    <stop offset="100%" stopColor="#881337" />
                  </radialGradient>
                  <linearGradient id="centerStarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="50%" stopColor="#fef08a" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>

                {/* 5 Distinct Spherical Flower Petals */}
                {[0, 72, 144, 216, 288].map((angle, idx) => (
                  <g key={idx} transform={`rotate(${angle} 50 50)`}>
                    <path
                      d="M 50 8 A 42 42 0 0 1 85 24 L 62 42 L 50 32 L 38 42 Z"
                      fill="url(#petalGrad)"
                      stroke="#fecdd3"
                      strokeWidth="0.8"
                      strokeLinejoin="round"
                    />
                  </g>
                ))}

                {/* Center 5-Point Brilliant Star */}
                <polygon
                  points="50,22 56.5,35 71,35 59.5,44 64,58 50,49 36,58 40.5,44 29,35 43.5,35"
                  fill="url(#centerStarGrad)"
                  stroke="#ffffff"
                  strokeWidth="1.0"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-normal bg-gradient-to-r from-amber-400 via-orange-400 to-rose-500 bg-clip-text text-transparent">
                Lụmlott
              </h1>
            </div>
            <p className="text-[11px] text-zinc-400 font-medium">
              Lụm bộ số, nhặt ước mơ
            </p>
          </div>
        </div>
      </header>

      {/* Main Simulation Viewport */}
      <main className="w-full max-w-6xl flex-1 flex flex-col justify-center mb-4">
        <DrawingMachineContainer />
      </main>

      {/* Sleek Minimal Footer */}
      <footer className="w-full max-w-6xl py-3 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-500 gap-2">
        <div className="flex items-center gap-2">
          <Award className="w-3.5 h-3.5 text-amber-500/70" />
          <span>Lụmlott &copy; 2026 &bull; Lụm bộ số, nhặt ước mơ</span>
        </div>
        <div className="text-zinc-600 text-[11px]">
          <span>Hệ thống quay số trúng thưởng tự động</span>
        </div>
      </footer>
    </div>
  );
}
