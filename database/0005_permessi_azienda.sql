-- Trade 0005 — anche i permessi per ruolo prendono l'azienda di chi li scrive.
create trigger permessi_azienda before insert on public.permessi_ruolo for each row execute function public.imposta_azienda();
