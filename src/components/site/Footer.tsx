import { getTranslations } from "next-intl/server";
import { Mail, MapPin, Phone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Logo } from "./Logo";
import type { SiteContent } from "@/lib/content";

export async function Footer({ content }: { content: SiteContent }) {
  const t = await getTranslations("footer");
  const nav = await getTranslations("nav");
  const meta = await getTranslations("meta");
  const phone = content.get("contact.phone");
  const email = content.get("contact.email");
  const address = content.get("contact.address");
  const year = new Date().getUTCFullYear();

  return (
    <footer className="mt-auto bg-brand-950 text-white/80">
      <div className="h-1 bg-signal-600" aria-hidden />
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Logo inverted />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/70 whitespace-pre-line">
            {content.get("footer.text") ?? t("description")}
          </p>
          {(phone || email || address) && (
            <ul className="mt-6 space-y-2.5 text-sm text-white/70">
              {phone && (
                <li className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 text-white/50" aria-hidden />
                  <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="hover:text-white">
                    {phone}
                  </a>
                </li>
              )}
              {email && (
                <li className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-white/50" aria-hidden />
                  <a href={`mailto:${email}`} className="hover:text-white">
                    {email}
                  </a>
                </li>
              )}
              {address && (
                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 text-white/50" aria-hidden />
                  <span className="whitespace-pre-line">{address}</span>
                </li>
              )}
            </ul>
          )}
        </div>

        <FooterCol title={t("company")} className="lg:col-span-2">
          <FooterLink href="/about">{nav("about")}</FooterLink>
          <FooterLink href="/services">{nav("services")}</FooterLink>
          <FooterLink href="/contact">{nav("contact")}</FooterLink>
        </FooterCol>
        <FooterCol title={t("help")} className="lg:col-span-2">
          <FooterLink href="/track">{nav("trackShipment")}</FooterLink>
          <FooterLink href="/contact">{nav("contact")}</FooterLink>
        </FooterCol>
        <FooterCol title={t("legal")} className="lg:col-span-3">
          <FooterLink href="/privacy">{t("privacy")}</FooterLink>
          <FooterLink href="/terms">{t("terms")}</FooterLink>
        </FooterCol>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} Westbridge Global Express. {t("rights")}
          </p>
          <p>{meta("tagline")}</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <h2 className="text-sm font-bold text-white">{title}</h2>
      <ul className="mt-4 space-y-2.5 text-sm">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-white/70 transition hover:text-white">
        {children}
      </Link>
    </li>
  );
}
