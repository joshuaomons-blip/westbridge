import {
  Anchor,
  Box,
  Briefcase,
  Car,
  Container,
  FileText,
  Globe,
  Headset,
  MapPin,
  Package,
  Plane,
  Ship,
  Truck,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

export const SERVICE_ICONS: Record<string, LucideIcon> = {
  package: Package,
  globe: Globe,
  truck: Truck,
  container: Container,
  briefcase: Briefcase,
  "map-pin": MapPin,
  headset: Headset,
  plane: Plane,
  ship: Ship,
  warehouse: Warehouse,
  box: Box,
  anchor: Anchor,
  "file-text": FileText,
  car: Car,
};

export function ServiceIcon({ name, className }: { name: string; className?: string }) {
  const Icon = SERVICE_ICONS[name] ?? Package;
  return <Icon className={className} aria-hidden />;
}
