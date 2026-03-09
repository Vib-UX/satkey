export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-zinc-800/40">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-btc-500/5 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-4 py-1.5 text-sm text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-btc-500" />
            access-ordinals protocol v0.1
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
            Bitcoin ordinals as keys to{" "}
            <span className="bg-gradient-to-r from-btc-400 to-btc-600 bg-clip-text text-transparent">
              high&#8209;performance VPS
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
            No passwords. No accounts. Own an ordinal, prove it, and get
            SSH access. Configure a VPS, buy the access token on-chain,
            and your sat becomes your server.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href="#configurator" className="btn-primary text-base px-8 py-3">
              Configure VPS
            </a>
            <a href="/marketplace" className="btn-secondary text-base px-8 py-3">
              Browse Marketplace
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
