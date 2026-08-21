'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service if available
    console.error('[Error Boundary Caught]:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#fffdf8] flex items-center justify-center p-6 text-center font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl border border-[#fde08b] p-8 shadow-sm">
        <div className="text-6xl mb-6">⚠️</div>
        <h1 className="text-2xl font-bold text-[#d9531e] mb-4">
          Something went wrong
        </h1>
        <p className="text-[#422b22] text-opacity-80 mb-8 leading-relaxed">
          We encountered an unexpected error while loading this page. Our team has been notified.
        </p>
        
        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="w-full py-3 bg-[#d9531e] hover:bg-[#b84318] text-white font-medium rounded-xl transition-colors duration-200"
          >
            Try again
          </button>
          
          <Link
            href="/"
            className="w-full py-3 bg-[#fff9eb] hover:bg-[#fde08b] text-[#d9531e] font-medium rounded-xl transition-colors duration-200 block"
          >
            Go back home
          </Link>
        </div>
      </div>
    </div>
  );
}
