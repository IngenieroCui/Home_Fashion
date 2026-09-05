'use client';
import { usePathname } from 'next/navigation';

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname === '/panel' || pathname.startsWith('/panel/')) return null;
  return (
    <footer className="site-footer">
      <div className="page-shell flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="font-serif text-2xl">Home Fashion</span>
          <p className="mt-2">Muebles para hacer hogar.</p>
        </div>
        <p>
          Diseñamos contigo. Hecho para tu vida.
          <br />
          <span className="text-xs">Ibagué, Colombia</span>
        </p>
      </div>
    </footer>
  );
}
