import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Trade" },
      { name: "description", content: "Gestionale commerciale: DDT, magazzino, lotti, listini, ordini." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/cruscotto" });
  },
});
