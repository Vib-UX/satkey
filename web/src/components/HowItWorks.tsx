const STEPS = [
  {
    num: "01",
    title: "Configure your VPS",
    desc: "Pick CPU, RAM, storage, region, and an optional stack preset. The configurator produces a protocol-compliant Access Resource definition.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Mint or buy an Access Ordinal",
    desc: "The Access Token is inscribed on-chain as a Bitcoin ordinal. Buy one from the marketplace or mint your own when self-hosting.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9 12h6M9 9h6M9 15h4" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Prove ownership → get access",
    desc: "Sign a challenge with your wallet. The verifier checks ordinal ownership on-chain, then grants SSH or API access. No accounts, no passwords.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <circle cx="12" cy="16" r="1" />
      </svg>
    ),
  },
];

export function HowItWorks() {
  return (
    <section className="border-t border-zinc-800/40 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <h2 className="section-heading">How SatKey works</h2>
          <p className="mt-3 text-zinc-400">Three steps from configuration to SSH access.</p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.num} className="card p-6 relative group">
              <div className="absolute -top-3 -left-2 text-5xl font-extrabold text-zinc-800/60 select-none group-hover:text-btc-500/20 transition-colors">
                {step.num}
              </div>
              <div className="relative">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-btc-500/10 text-btc-400">
                  {step.icon}
                </div>
                <h3 className="text-lg font-semibold text-zinc-100">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
