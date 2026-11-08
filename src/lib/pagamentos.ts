import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Integração com o provedor de Pix. Precisa ser instituição autorizada pelo Banco Central.
 * Regras: só Pix/TED/débito (sem cartão de crédito nem cripto) e a conta precisa ser do
 * mesmo CPF do apostador. Troque esta implementação pela API do provedor contratado.
 */
export interface CobrancaPix { idExterno: string; copiaECola: string; expiraEm: string }

export async function criarCobrancaPix(params: { pagamentoId: string; valor: number; cpf: string }): Promise<CobrancaPix> {
  const url = process.env.PAGAMENTOS_API_URL;
  if (!url) throw new Error("Provedor de pagamento não configurado");
  const resp = await fetch(`${url}/cobrancas`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.PAGAMENTOS_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ referencia: params.pagamentoId, valor: params.valor, cpfPagador: params.cpf }),
  });
  if (!resp.ok) throw new Error(`Falha no provedor: ${resp.status}`);
  return resp.json();
}

/** Confere a assinatura HMAC do webhook para garantir que veio do provedor. */
export function assinaturaValida(corpo: string, assinatura: string | null): boolean {
  const segredo = process.env.PAGAMENTOS_WEBHOOK_SECRET;
  if (!segredo || !assinatura) return false;
  const esperado = createHmac("sha256", segredo).update(corpo).digest("hex");
  const a = Buffer.from(esperado), b = Buffer.from(assinatura);
  return a.length === b.length && timingSafeEqual(a, b);
}
