/**
 * Layered dark background — deep black base + multiple soft glows + grid + vignette.
 * Mount once, fixed under content (`-z-10`). Pure CSS, no JS.
 */
export function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base — deep near-black with subtle vertical fade */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#050505_0%,#0a0a0a_50%,#070707_100%)]" />

      {/* Large warm glow top-left */}
      <div
        className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(80,60,40,0.18) 0%, rgba(40,30,20,0.08) 40%, transparent 70%)",
        }}
      />

      {/* Cool glow bottom-right */}
      <div
        className="absolute -bottom-40 -right-40 h-[700px] w-[700px] rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(40,50,80,0.18) 0%, rgba(20,25,40,0.08) 40%, transparent 70%)",
        }}
      />

      {/* Soft white glow upper-middle */}
      <div
        className="absolute left-1/3 top-0 h-[400px] w-[800px] -translate-x-1/2 opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse, rgba(255,255,255,0.05) 0%, transparent 65%)",
        }}
      />

      {/* Fine grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      {/* Vignette — darker at the edges */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)",
        }}
      />

      {/* Top fade for the topbar area */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/40 to-transparent" />
    </div>
  );
}
