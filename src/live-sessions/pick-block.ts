/**
 * Hàm này dùng để chọn block theo trọng số
 * @param items - Danh sách các block
 * @param random - Hàm random
 * @returns Block được chọn
 */
export function pickWeighted<T extends { weight: number }>(
  items: T[],
  random: () => number = Math.random,
): T | undefined {
  if (items.length === 0) return undefined;
  // Tính tổng trọng số của các block
  const total = items.reduce((sum, item) => sum + Math.max(item.weight, 1), 0);
  // Tạo con trỏ
  let cursor = random() * total;
  // Duyệt qua các block
  for (const item of items) {
    // Trừ trọng số của block khỏi con trỏ
    cursor -= Math.max(item.weight, 1);
    // Nếu con trỏ nhỏ hơn 0 thì trả về block hiện tại
    if (cursor <= 0) return item;
  }
  // Trả về block cuối cùng
  return items[items.length - 1];
}

/**
 * Hàm này dùng để sắp xếp các block theo thời gian sử dụng
 * @param items - Danh sách các block
 * @returns Danh sách các block được sắp xếp theo thời gian sử dụng
 */
export function preferUnused<T extends { lastUsedAt: Date | null }>(items: T[]): T[] {
  // Sắp xếp các block theo thời gian sử dụng
  return [...items].sort((a, b) => {
    // Lấy thời gian sử dụng của block a
    const aTime = a.lastUsedAt?.getTime() ?? 0;
    // Lấy thời gian sử dụng của block b
    const bTime = b.lastUsedAt?.getTime() ?? 0;
    // Trả về sự khác biệt giữa thời gian sử dụng của block a và block b
    return aTime - bTime;
  });
}
