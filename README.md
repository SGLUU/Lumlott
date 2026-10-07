# Xịt Lốp 3D (Lucky Arena) — 3D Physics Lottery Drawing Machine

Dự án mô phỏng lồng cầu quay số xổ số 3D thời gian thực dựa trên động cơ vật lý Rapier3D và Three.js, xây dựng trên nền tảng Next.js (App Router).

## 🌟 Tính năng nổi bật
- **Mô phỏng vật lý 100% (Rapier3D Wasm)**: Toàn bộ quá trình rơi, va đập cánh quạt và đón bóng dựa trên mô phỏng vật lý thực tế.
- **Hệ thống ống nạp bóng tự động**: Phân bổ bóng theo dải số vào các ống acrylic trong suốt phía trên lồng và mở cửa xả tuần tự.
- **Cửa gắp đón bóng & Cảm biến**: Tự động nhận diện quả bóng đầu tiên lọt vào phễu và đóng cửa ngăn quả thứ hai.
- **Ống trượt & Khay chứa kết quả**: Hoạt ảnh trượt bóng qua đường ống acrylic 3D đến từng ô số trên khay vinh danh.
- **Cơ chế Hồi bóng (Return Loop)**: Xử lý các quy tắc giới hạn khoảng số từng ô và tự động đưa bóng về tâm lồng nếu không thỏa điều kiện.
- **Âm thanh chân thực**: Web Audio API tổng hợp tiếng cơ khí, va đập bóng, còi hú gắp bóng, tiếng vỗ tay chiến thắng mà không phụ thuộc file audio ngoài.

## 🚀 Hướng dẫn cài đặt & chạy

```bash
# 1. Cài đặt dependencies
npm install

# 2. Chạy môi trường phát triển
npm run dev

# 3. Mở trình duyệt
# http://localhost:3000
```

## 🛠️ Công nghệ
- **Next.js 15** + React 19
- **Three.js** + Canvas 3D
- **@dimforge/rapier3d-compat** (Wasm Physics)
- **Tailwind CSS** + Lucide Icons
