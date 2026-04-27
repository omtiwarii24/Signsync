"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Video, BookOpen, Gamepad2, Settings, Zap } from "lucide-react";

const navItems = [
  { name: "Translate", href: "/", icon: Video },
  { name: "Dictionary", href: "/dictionary", icon: BookOpen },
  { name: "Practice", href: "/practice", icon: Gamepad2 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen hidden md:flex flex-col bg-slate-950/80 backdrop-blur-xl border-r border-white/10 text-slate-300 fixed left-0 top-0 z-50">
      
      {/* Logo Area */}
      <div className="h-20 flex items-center px-8 border-b border-white/10">
        <Zap className="text-purple-500 w-6 h-6 mr-3 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
        <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
          SignSync
        </h1>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-8 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-4 py-3 rounded-xl font-medium transition-all duration-200 group relative overflow-hidden ${
                isActive
                  ? "bg-purple-500/10 text-white shadow-[0_0_15px_rgba(168,85,247,0.1)]"
                  : "hover:bg-white/[0.02] hover:text-white"
              }`}
            >
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-purple-500 rounded-r-full shadow-[0_0_10px_rgba(168,85,247,0.8)]"></div>}
              <item.icon 
                className={`w-5 h-5 mr-4 transition-colors relative z-10 ${
                  isActive ? "text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" : "text-slate-500 group-hover:text-cyan-400"
                }`} 
              />
              <span className="relative z-10">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Area */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center px-4 py-3 bg-white/[0.02] rounded-xl border border-white/5 backdrop-blur-sm">
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse mr-3 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
          <span className="text-xs font-bold text-slate-400 tracking-wider">AI ACTIVE</span>
        </div>
      </div>
    </aside>
  );
}