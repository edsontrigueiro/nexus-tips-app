import Image from "next/image";

// Usa a versão transparente da marca (nx-mark-white.png) — funciona sobre qualquer
// fundo escuro do produto sem precisar de caixa/contorno.
export function Logo({
  size = 28,
  withWordmark = true,
  className = "",
}: {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Image
        src="/nx-mark-white.png"
        alt="Nexus Tips"
        width={size}
        height={size}
        className="flex-none"
        priority
      />
      {withWordmark && (
        <div className="flex items-baseline gap-1.5">
          <span className="font-bold text-[17px] tracking-wide">NEXUS</span>
          <span className="text-sm tracking-[3px] text-text2">TIPS</span>
        </div>
      )}
    </div>
  );
}
