"""
Preenche o campo 'Polo' na tabela sum_leads_ganhos do Supabase
buscando as informações no Kommo:
  - Prioridade 1: campo sum_Polo (id: 1475381)
  - Prioridade 2: campo Polo     (id: 412934)
"""

import urllib.request
import urllib.parse
import json
import time

# ─── Configurações ───────────────────────────────────────────
SUPABASE_URL   = "https://tufvduiaybogfhgausqj.supabase.co"
SUPABASE_KEY   = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1ZnZkdWlheWJvZ2ZoZ2F1c3FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA5NTI2OSwiZXhwIjoyMDcyNjcxMjY5fQ.dhfyYnXfPXHsly0YAmpUP7yS7U6CB0qkyihMPlRMfPg"
KOMMO_TOKEN    = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjgyMDIwZGM3OGMxYjgzMWRhZWE4MDNmOWYyMDYyMmYzNWQzNzNhOGU5MjIyNzU3YWVjZDUzZTg5YzE3NmFkMDRjN2Y4OTQyODRhZDRiNzliIn0.eyJhdWQiOiIzOTlhYjUzOS1lMWY5LTQzZjEtOWFhNS1mMzg2MTY0ZDVhYWQiLCJqdGkiOiI4MjAyMGRjNzhjMWI4MzFkYWVhODAzZjlmMjA2MjJmMzVkMzczYThlOTIyMjc1N2FlY2Q1M2U4OWMxNzZhZDA0YzdmODk0Mjg0YWQ0Yjc5YiIsImlhdCI6MTc3NjE5NzYxNCwibmJmIjoxNzc2MTk3NjE0LCJleHAiOjE4MTA3NzEyMDAsInN1YiI6IjExNjE2MDY4IiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjMxNjk3MzQ3LCJiYXNlX2RvbWFpbiI6ImtvbW1vLmNvbSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJwdXNoX25vdGlmaWNhdGlvbnMiLCJmaWxlcyIsImNybSIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiMmE4NjAwZWQtMThmMC00NTdjLWEwNDEtOTUyZjljNmJmMDFlIiwiYXBpX2RvbWFpbiI6ImFwaS1nLmtvbW1vLmNvbSJ9.itYoGOmQISRpO0mO2cXJ3kMv5gYuookH-praHvEjzi3Eg0TbLYxCaxjNjNsAe1dCA5HADi5QwEhC-P-n-PL4tyV7To1AiqiRSQ2_SrV6dmStZP9L35bd1yuIjLiAwD_F4DzJCfhFWlJe2H8WNtucII5keqlK7Ray9sWHkYmXDHWKezWu1vJETljVDhC9fnOMsqth28TF4GkuO9D_wI17TuwT0SHuowOKeOqVQ_EfowRFhwBeLylEwxZrhR7Sie6AWP_hkXl87ejXVqNvHVi33Sct1b_c90XuzN2mVDzi0EeidoHjUj5gwVsE35sFLQFRqhhLZ-4NMIBWSdm4s5xywQ"
KOMMO_SUBDOMAIN = "academicosoead"
TABELA          = "sum_leads_ganhos"
SUM_POLO_ID     = 1475381
POLO_ID         = 412934
BATCH_KOMMO     = 50   # leads por requisição no Kommo


# ─── Helpers ─────────────────────────────────────────────────

def supa_get(path):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    })
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode("utf-8"))


def supa_patch(row_id, data):
    url = f"{SUPABASE_URL}/rest/v1/{TABELA}?id=eq.{row_id}"
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="PATCH", headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    })
    try:
        with urllib.request.urlopen(req) as r:
            return True
    except Exception as e:
        print(f"  ERRO PATCH id={row_id}: {e}")
        return False


def kommo_batch(ids):
    """Busca até BATCH_KOMMO leads de uma vez usando filter[id][]."""
    qs = "&".join(f"filter[id][]={i}" for i in ids)
    url = f"https://{KOMMO_SUBDOMAIN}.kommo.com/api/v4/leads?with=custom_fields&limit={BATCH_KOMMO}&{qs}"
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bearer {KOMMO_TOKEN}",
        "Content-Type": "application/json",
    })
    try:
        with urllib.request.urlopen(req) as r:
            data = json.loads(r.read().decode("utf-8"))
            return data.get("_embedded", {}).get("leads", [])
    except Exception as e:
        print(f"  ERRO Kommo batch: {e}")
        return []


def extrair_polo(lead):
    """Retorna (valor_polo, fonte) para um lead do Kommo."""
    campos = lead.get("custom_fields_values") or []
    sum_polo = ""
    polo = ""
    for c in campos:
        fid = c.get("field_id")
        val = (c.get("values") or [{}])[0].get("value", "")
        if fid == SUM_POLO_ID:
            sum_polo = val or ""
        elif fid == POLO_ID:
            polo = val or ""
    if sum_polo:
        return sum_polo, "sum_Polo"
    if polo:
        return polo, "Polo"
    return "", "vazio"


# ─── 1. Buscar registros com Polo NULL ───────────────────────

print("=" * 60)
print("Buscando registros com Polo NULL no Supabase...")
rows = supa_get(f"{TABELA}?select=id,id_lead,Polo&Polo=is.null&limit=2000")
print(f"  → {len(rows)} registros encontrados")

unique_ids = list({r["id_lead"] for r in rows if r.get("id_lead")})
print(f"  → {len(unique_ids)} id_lead únicos")

# ─── 2. Buscar Polo no Kommo (em lotes) ──────────────────────

print("\nBuscando leads no Kommo em lotes de 50...")
polo_cache = {}   # id_lead → polo_valor

chunks = [unique_ids[i:i+BATCH_KOMMO] for i in range(0, len(unique_ids), BATCH_KOMMO)]
for i, chunk in enumerate(chunks, 1):
    leads = kommo_batch(chunk)
    found_ids = set()
    for lead in leads:
        lid = lead.get("id")
        valor, fonte = extrair_polo(lead)
        polo_cache[lid] = (valor, fonte)
        found_ids.add(lid)
    # IDs não encontrados no Kommo
    for mid in chunk:
        if mid not in found_ids:
            polo_cache[mid] = ("", "nao_encontrado")
    print(f"  Lote {i}/{len(chunks)} — {len(leads)} encontrados ({len(found_ids)}/{len(chunk)})")
    time.sleep(0.3)

# Estatísticas do cache
com_valor = sum(1 for v, _ in polo_cache.values() if v)
print(f"\n  ✓ {com_valor}/{len(polo_cache)} leads com polo preenchido")

# ─── 3. Atualizar Supabase ────────────────────────────────────

print("\nAtualizando Supabase...")
atualizados   = 0
sem_polo      = 0
erros         = 0
log_linhas    = []

for row in rows:
    rid    = row["id"]
    id_lead = row["id_lead"]
    valor, fonte = polo_cache.get(id_lead, ("", "nao_encontrado"))

    if not valor:
        sem_polo += 1
        log_linhas.append(f"SEM_POLO | id={rid} | id_lead={id_lead} | fonte={fonte}")
        continue

    ok = supa_patch(rid, {"Polo": valor})
    if ok:
        atualizados += 1
        log_linhas.append(f"OK       | id={rid} | id_lead={id_lead} | polo={valor} | [{fonte}]")
    else:
        erros += 1
        log_linhas.append(f"ERRO     | id={rid} | id_lead={id_lead}")

# ─── 4. Relatório ─────────────────────────────────────────────

print("\n" + "=" * 60)
print(f"  Atualizados:  {atualizados}")
print(f"  Sem polo:     {sem_polo}")
print(f"  Erros:        {erros}")
print("=" * 60)

log_path = r"c:\Users\user\dash BU\dashboard_bu\log_polo_sumaganhos.txt"
with open(log_path, "w", encoding="utf-8") as f:
    f.write(f"Atualizados: {atualizados} | Sem polo: {sem_polo} | Erros: {erros}\n\n")
    f.write("\n".join(log_linhas))
print(f"\nLog salvo em: {log_path}")
