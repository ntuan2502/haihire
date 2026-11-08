"use client";

import {
  LandingNavbar,
  LandingHero,
  LandingAtsPreview,
  LandingMetrics,
  LandingBentoGrid,
  LandingWorkflow,
  LandingComparison,
  LandingCta,
  LandingFooter,
} from "@/components/landing";

export default function HomePage() {
  return (
    <div className="relative min-h-screen w-full bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-white selection:bg-blue-500 selection:text-white transition-colors duration-300">
      {/* Sticky Glassmorphic Navbar */}
      <LandingNavbar />

      {/* Main Content Flow */}
      <main className="relative z-10 flex flex-col overflow-x-clip">
        {/* 1. Hero Section */}
        <LandingHero />

        {/* 2. Tangible ATS Live Interactive Window (Matching Real Internal Pipeline) */}
        <LandingAtsPreview />

        {/* 3. Performance Metrics Strip */}
        <LandingMetrics />

        {/* 4. Bento Grid Feature Ecosystem */}
        <LandingBentoGrid />

        {/* 5. 3-Step Streamlined Workflow */}
        <LandingWorkflow />

        {/* 6. Side-by-Side Comparison Table */}
        <LandingComparison />

        {/* 7. Bottom Conversion CTA Banner */}
        <LandingCta />
      </main>

      {/* 8. Comprehensive SaaS Footer */}
      <LandingFooter />
    </div>
  );
}
