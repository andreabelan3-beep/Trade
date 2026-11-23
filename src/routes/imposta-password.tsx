import { createFileRoute } from "@tanstack/react-router";
import { SetPasswordForm } from "@/components/app/SetPasswordForm";

export const Route = createFileRoute("/imposta-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Benvenuto in Trade — Trade" },
      { name: "description", content: "Scegli la password per il tuo nuovo account." },
      { property: "og:title", content: "Benvenuto in Trade — Trade" },
      { property: "og:description", content: "Scegli la password per il tuo nuovo account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <SetPasswordForm
      title="Benvenuto in Trade"
      subtitle="Scegli la password per il tuo nuovo account."
    />
  ),
});
