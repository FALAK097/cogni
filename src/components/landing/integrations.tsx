import Image from "next/image";

const integrations = [
  {
    name: "Gmail",
    img: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg",
    invertInDark: false,
  },
  {
    name: "Slack",
    img: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg",
    invertInDark: false,
  },
  {
    name: "HubSpot",
    img: "https://cdn.simpleicons.org/hubspot/FF7A59",
    invertInDark: false,
  },
  {
    name: "Notion",
    img: "https://upload.wikimedia.org/wikipedia/commons/e/e9/Notion-logo.svg",
    invertInDark: true, // Notion logo is black
  },
  {
    name: "GitHub",
    img: "https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg",
    invertInDark: true, // GitHub logo is black
  },
  {
    name: "Discord",
    img: "https://cdn.simpleicons.org/discord/5865F2",
    invertInDark: false,
  },
  {
    name: "Google Calendar",
    img: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg",
    invertInDark: false,
  },
];

export function Integrations() {
  return (
    <section id="integrations" className="bg-background py-28 md:py-36">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-primary">
            Integrations
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Works where your team works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Connect your existing tools with one click — no engineering required.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
          {integrations.map((item) => (
            <div
              key={item.name}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-border hover:shadow-md sm:p-7"
            >
              <div className="flex size-12 items-center justify-center">
                <Image
                  src={item.img}
                  alt={`${item.name} logo`}
                  width={32}
                  height={32}
                  unoptimized
                  className={`size-8 object-contain ${item.invertInDark ? "dark:invert" : ""}`}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
