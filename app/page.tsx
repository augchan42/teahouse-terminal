'use client';

import { ThemeToggle } from '@/components/ThemeToggle';
import { FeaturedRoom } from '@/components/FeaturedRoom';
import AgentStats from '@/components/AgentStats';
import AgentList from '@/components/AgentList';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary/10 py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-center sm:text-left">
              It's Always Sunny in Cookiedelphia
            </h1>
            <ThemeToggle />
          </div>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main content */}
          <div className="w-full lg:flex-1 order-2 lg:order-1">
            <FeaturedRoom />
          </div>
          
          {/* Sidebar */}
          <div className="w-full lg:w-80 order-1 lg:order-2">
            <div className="lg:sticky lg:top-6">
              <AgentList />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
