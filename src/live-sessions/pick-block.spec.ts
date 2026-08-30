import { pickWeighted } from './pick-block';

describe('pickWeighted', () => {
  /**
   * Kiểm tra xem hàm pickWeighted có trả về undefined cho danh sách rỗng không
   */
  it('returns undefined for empty list', () => {
    expect(pickWeighted([])).toBeUndefined();
  });

  /**
   * Kiểm tra xem hàm pickWeighted có chọn được item duy nhất không
   */
  it('picks the only item', () => {
    expect(pickWeighted([{ weight: 3, id: 'a' }])?.id).toBe('a');
  });

  /**
   * Kiểm tra xem hàm pickWeighted có tính đến trọng số không
   */
  it('respects weights', () => {
    const items = [
      { id: 'a', weight: 1 },
      { id: 'b', weight: 9 },
    ];
    expect(pickWeighted(items, () => 0.05)?.id).toBe('a');
    expect(pickWeighted(items, () => 0.5)?.id).toBe('b');
  });
});
