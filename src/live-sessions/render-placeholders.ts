/**
 * Hàm này dùng để render các placeholder trong template
 * @param template - Template
 * @param vars - Các biến
 * @returns Template đã được render
 */
export function renderPlaceholders(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    return vars[key] ?? '';
  });
}

/**
 * Hàm này dùng để tạo các biến cho product
 * @param product - Product
 * @returns Các biến cho product
 */
export function productVars(product: {
  code: string;
  name: string;
  attributes: unknown;
}): Record<string, string> {
  const vars: Record<string, string> = {
    code: product.code,
    name: product.name,
  };
  if (
    product.attributes &&
    typeof product.attributes === 'object' &&
    !Array.isArray(product.attributes)
  ) {
    for (const [key, value] of Object.entries(product.attributes as Record<string, unknown>)) {
      if (value === null || value === undefined) continue;
      vars[key] = String(value);
    }
  }
  return vars;
}
