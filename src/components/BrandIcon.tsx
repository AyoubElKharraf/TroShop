/** Icône boîte TrocSpot (fichier dans /public/favicon.png) */
export function BrandIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <img
      src="/favicon.png"
      alt=""
      className={`object-contain ${className}`}
      draggable={false}
    />
  );
}
