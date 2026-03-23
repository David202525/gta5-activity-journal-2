import { Order } from "@/lib/types";

export const ORDER_PREFIXES = ["ФР", "АД", "ОБ", "ОП", "ДС"] as const;

export const ORDER_PREFIX_LABELS: Record<string, string> = {
  ФР: "Фракция",
  АД: "Администрация",
  ОБ: "Общий",
  ОП: "Оперативный",
  ДС: "Дисциплина",
};

export function validateOrderNumber(
  num: string,
  existingOrders: Order[],
): { valid: boolean; error?: string } {
  const trimmed = num.trim().toUpperCase();
  const regex = /^\d{4}-[А-ЯЁA-Z]{2}-\d{2}$/;
  if (!regex.test(trimmed))
    return { valid: false, error: `Неверный формат. Ожидается: ГГГГ-ПЧ-НН (напр. 2026-ФР-01)` };
  const [year, prefix] = trimmed.split("-");
  if (parseInt(year) !== new Date().getFullYear())
    return { valid: false, error: `Год приказа должен быть ${new Date().getFullYear()}` };
  if (!(ORDER_PREFIXES as readonly string[]).includes(prefix))
    return { valid: false, error: `Неизвестный код «${prefix}». Допустимые: ${ORDER_PREFIXES.join(", ")}` };
  if (existingOrders.find(o => o.number.toUpperCase() === trimmed))
    return { valid: false, error: `Приказ ${trimmed} уже существует` };
  return { valid: true };
}
