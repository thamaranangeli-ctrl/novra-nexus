import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  nome: z.string(),
  sku: z.string().optional(),
  categoria: z.string().optional(),
  peso_g: z.number().nullable().optional(),
  tempo_min: z.number().nullable().optional(),
  cores: z.array(z.string()).optional(),
  suportes: z.boolean().optional(),
  preco: z.number().nullable().optional(),
  marketplace: z.enum(["shopee", "mercadolivre", "ambos"]).default("ambos"),
  observacoes: z.string().optional(),
});

export const gerarConteudoComercial = createServerFn({ method: "POST" })
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurado");

    const prompt = `Você é especialista em copywriting para marketplaces brasileiros (Shopee e Mercado Livre) de produtos de impressão 3D.

Gere um anúncio completo, otimizado para SEO, persuasivo e honesto para o produto abaixo. Retorne APENAS um JSON válido, sem markdown, sem explicações.

Produto:
- Nome: ${data.nome}
- SKU: ${data.sku ?? "-"}
- Categoria: ${data.categoria ?? "-"}
- Peso: ${data.peso_g ?? "-"}g
- Tempo de impressão: ${data.tempo_min ?? "-"} min
- Cores disponíveis: ${(data.cores ?? []).join(", ") || "-"}
- Necessita suportes: ${data.suportes ? "sim" : "não"}
- Preço sugerido: R$ ${data.preco ?? "-"}
- Observações: ${data.observacoes ?? "-"}
- Marketplace alvo: ${data.marketplace}

Formato JSON esperado:
{
  "titulo_shopee": "máx 100 caracteres, com palavras-chave no início",
  "titulo_mercadolivre": "máx 60 caracteres, direto e claro",
  "descricao_curta": "2-3 frases de destaque",
  "descricao_completa": "descrição rica em markdown leve com bullets, benefícios, especificações técnicas, cuidados e call-to-action",
  "palavras_chave": "10-15 keywords separadas por vírgula",
  "tags": ["array", "de", "5-8", "tags", "curtas"]
}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você retorna apenas JSON válido, sem cercas de código, sem comentários." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      if (res.status === 429) throw new Error("Limite de requisições atingido. Tente novamente em instantes.");
      if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
      throw new Error(`Falha na IA (${res.status}): ${txt.slice(0, 300)}`);
    }

    const json = await res.json();
    const content: string = json.choices?.[0]?.message?.content ?? "";
    const trimmed = content.trim();
    // strip possible ``` fences anywhere and isolate JSON object
    let cleaned = trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) {
      cleaned = cleaned.slice(first, last + 1);
    }
    try {
      return JSON.parse(cleaned) as {
        titulo_shopee: string;
        titulo_mercadolivre: string;
        descricao_curta: string;
        descricao_completa: string;
        palavras_chave: string;
        tags: string[];
      };
    } catch {
      console.error("IA resposta bruta:", content);
      throw new Error("Resposta da IA não foi JSON válido");
    }
  });
