import "flag-icons/css/flag-icons.min.css";
import { flagIso } from "@/lib/flags";

export function Flag({
  code,
  className = "",
}: {
  code: string;
  className?: string;
}) {
  const iso = flagIso(code);
  if (!iso) {
    return <span className={className}>🏳️</span>;
  }
  return (
    <span
      className={`fi fi-${iso} rounded-[3px] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] ${className}`}
      role="img"
      aria-label={`${code} flag`}
    />
  );
}
