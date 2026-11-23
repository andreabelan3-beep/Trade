import { createFileRoute } from "@tanstack/react-router";
import { SetPasswordForm } from "@/components/app/SetPasswordForm";

export const Route = createFileRoute("/reimposta-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reimposta la password — Trade" },
      { name: "description", content: "Scegli una nuova password per il tuo account." },
      { property: "og:title", content: "Reimposta la password — Trade" },
      { property: "og:description", content: "Scegli una nuova password per il tuo account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <SetPasswordForm
      title="Reimposta la password"
      subtitle="Scegli una nuova password per il tuo account."
    />
  ),
});
