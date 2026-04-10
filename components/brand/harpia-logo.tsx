import { brand } from "../../lib/brand";

type HarpiaLogoVariant = "full" | "compact" | "icon";

type HarpiaLogoProps = {
  variant?: HarpiaLogoVariant;
  className?: string;
  markClassName?: string;
  labelClassName?: string;
  captionClassName?: string;
  showTagline?: boolean;
};

type HarpiaMarkProps = {
  className?: string;
  alt?: string;
  priority?: boolean;
};

function joinClasses(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

function HarpiaWordmark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 182 32"
      aria-hidden="true"
      className={joinClasses("block h-auto w-full", className)}
      fill="currentColor"
    >
      <path d="M2 3H10V13H21V3H29V29H21V19H10V29H2V3Z" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M41 29H33L45 3H54L66 29H58L55.8 23.4H43.2L41 29ZM46 16.9H53L49.5 7.8L46 16.9Z"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M72 3H85.5C92.8 3 97.3 6.9 97.3 13.2C97.3 17.6 95.1 20.8 91.1 22.2L98.7 29H88.9L82.8 23.3H80V29H72V3ZM80 17.3H84.8C88.1 17.3 89.8 15.9 89.8 13.2C89.8 10.5 88.1 9 84.8 9H80V17.3Z"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M103.7 3H116.7C124.4 3 128.9 7 128.9 13.8C128.9 20.5 124.4 24.6 116.7 24.6H111.7V29H103.7V3ZM111.7 18.5H116.2C119.8 18.5 121.5 16.9 121.5 13.8C121.5 10.7 119.8 9.1 116.2 9.1H111.7V18.5Z"
      />
      <path d="M137.2 3H145.2V29H137.2V3Z" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M157 29H149L161 3H170L182 29H174L171.8 23.4H159.2L157 29ZM162 16.9H169L165.5 7.8L162 16.9Z"
      />
    </svg>
  );
}

export function HarpiaMark({
  className,
  alt = "",
  priority: _priority = false
}: HarpiaMarkProps) {
  return (
    <svg
      viewBox="0 0 88 88"
      role={alt ? "img" : undefined}
      aria-hidden={alt ? undefined : true}
      className={joinClasses("block h-auto w-full", className)}
      fill="currentColor"
    >
      {alt ? <title>{alt}</title> : null}
      <path d="M14 14H26V74H14V14Z" />
      <path d="M62 14H74V74H62V14Z" />
      <path d="M26 22H40L62 44H48L26 28V22Z" />
      <path d="M26 46H46L62 60V74H48L34 60H26V46Z" />
      <path d="M38 32L50 44L38 56H26V48H34L42 44L34 40H26V32H38Z" opacity="0.78" />
    </svg>
  );
}

export function HarpiaLogo({
  variant = "full",
  className,
  markClassName,
  labelClassName,
  captionClassName,
  showTagline = false
}: HarpiaLogoProps) {
  if (variant === "icon") {
    return (
      <span className={joinClasses("inline-flex items-center justify-center", className)}>
        <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-[0.95rem] border border-current/10 bg-current/[0.03] px-2.5 py-2 shadow-[0_10px_22px_rgba(0,0,0,0.12)]">
          <span className="absolute inset-[3px] rounded-[0.8rem] border border-current/8" />
          <HarpiaMark className={joinClasses("w-6", markClassName)} alt={brand.name} />
        </span>
      </span>
    );
  }

  const isCompact = variant === "compact";

  return (
    <span className={joinClasses("inline-flex items-center", isCompact ? "gap-3" : "gap-3.5", className)}>
      <span
        className={joinClasses(
          "relative inline-flex shrink-0 items-center justify-center rounded-[0.98rem] border border-current/10 bg-current/[0.03] shadow-[0_12px_26px_rgba(0,0,0,0.12)]",
          isCompact ? "h-10 w-10 px-2.5 py-2" : "h-11 w-11 px-2.5 py-2"
        )}
      >
        <span className="absolute inset-[3px] rounded-[0.82rem] border border-current/8" />
        <HarpiaMark className={joinClasses(isCompact ? "w-[1.45rem]" : "w-6", markClassName)} alt={brand.name} />
      </span>

      <span className="flex min-w-0 flex-col">
        <HarpiaWordmark
          className={joinClasses(
            "text-current",
            isCompact ? "w-[5.85rem]" : "w-[7.15rem]",
            labelClassName
          )}
        />

        {showTagline ? (
          <span
            className={joinClasses(
              "mt-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-current/52",
              captionClassName
            )}
          >
            {brand.tagline}
          </span>
        ) : isCompact ? (
          <span
            className={joinClasses(
              "mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-current/42",
              captionClassName
            )}
          >
            Decision system
          </span>
        ) : null}
      </span>
    </span>
  );
}
