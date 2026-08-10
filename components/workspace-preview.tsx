/**
 * A stylized frame of the workspace, not a screenshot. It exists to show the
 * shape of the product (one window, many surfaces) without claiming pixel
 * fidelity.
 *
 * TODO(cryozen): replace with a real capture of the running app once there is
 * a canonical light-on-dark screenshot to ship.
 */
const surfaces = [
  "Chat",
  "Agents",
  "Research",
  "Documents",
  "Mail",
  "Calendar",
  "Contacts",
  "Images",
  "Models",
];

const transcript = [
  { role: "you", text: "Summarize the three contracts in /legal and flag renewal dates." },
  {
    role: "cryozen",
    text: "Indexed 3 documents locally. Two auto-renew on 01 Mar; one needs 60 days notice.",
  },
  { role: "you", text: "Draft the notice email and hold it for my review." },
];

export function WorkspacePreview() {
  return (
    <div className="panel overflow-hidden rounded-2xl">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-hairline bg-elevated/60 px-4 py-3">
        <span className="size-2.5 rounded-full bg-[#2b3a49]" />
        <span className="size-2.5 rounded-full bg-[#2b3a49]" />
        <span className="size-2.5 rounded-full bg-[#2b3a49]" />
        <span className="ml-3 font-mono text-[11px] text-muted">127.0.0.1:7860</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[172px_1fr]">
        <aside className="hidden border-r border-hairline bg-surface/50 p-3 sm:block">
          <ul className="space-y-0.5">
            {surfaces.map((surface, index) => (
              <li key={surface}>
                <span
                  className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] ${
                    index === 0 ? "bg-primary/10 text-core" : "text-muted"
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      index === 0 ? "bg-primary" : "bg-hairline"
                    }`}
                  />
                  {surface}
                </span>
              </li>
            ))}
          </ul>
        </aside>

        <div className="space-y-4 p-5 sm:p-7">
          {transcript.map((line) => (
            <div
              key={line.text}
              className={line.role === "you" ? "flex justify-end" : "flex justify-start"}
            >
              <p
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-[13px]/6 ${
                  line.role === "you"
                    ? "bg-primary/12 text-core"
                    : "border border-hairline bg-elevated/70 text-ink"
                }`}
              >
                {line.text}
              </p>
            </div>
          ))}

          <div className="flex items-center gap-2 rounded-xl border border-hairline bg-elevated/50 px-4 py-3">
            <span className="size-1.5 animate-ember rounded-full bg-primary" />
            <span className="font-mono text-[11px] text-muted">
              local model · llama-3.1-70b · running on your GPU
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
