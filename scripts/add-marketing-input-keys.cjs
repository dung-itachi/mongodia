/**
 * Add new i18n keys for /marketing/input page wrapping
 */
const fs = require('fs');
const path = require('path');

const i18nPath = path.join(__dirname, '..', 'src', 'lib', 'i18n.ts');
let content = fs.readFileSync(i18nPath, 'utf8');

// New keys with EN and MN translations
const newKeys = [
  // Stats
  ['Đã đẩy', 'Pushed', 'Түлхсэн'],
  ['Staging', 'Staging', 'Stage'],
  ['Lỗi', 'Error', 'Алдаа'],
  ['Lỗi:', 'Error:', 'Алдаа:'],
  // Page 1 Card
  ['Chọn sản phẩm', 'Select product', 'Бүтээгдэхүүн сонгох'],
  ['Thêm nhanh', 'Quick add', 'Хурдан нэмэх'],
  // Filter/Sort
  ['Mới tạo nhất', 'Newest first', 'Шинээр үүсгэсэн'],
  ['Cũ nhất', 'Oldest first', 'Хуучин'],
  ['Tên A → Z', 'Name A → Z', 'Нэр А → Я'],
  ['Tên Z → A', 'Name Z → A', 'Нэр Я → А'],
  ['Mã sản phẩm', 'Product code', 'Бүтээгдэхүүний код'],
  ['Tất cả danh mục', 'All categories', 'Бүх ангилал'],
  ['Hiển thị', 'Showing', 'Харуулж байна'],
  ['Xóa tìm kiếm', 'Clear search', 'Хайлтыг цэвэрлэх'],
  ['sản phẩm', 'products', 'бүтээгдэхүүн'],
  ['Khác', 'Other', 'Бусад'],
  // Manual order button
  ['Nhập đơn hàng thủ công', 'Add manual order', 'Гараар захиалга нэмэх'],
  // Modal buttons
  ['Hủy', 'Cancel', 'Цуцлах'],
  ['Lưu', 'Save', 'Хадгалах'],
  ['Thêm vào staging', 'Add to staging', 'Stage-д нэмэх'],
  // Combo
  ['Combo', 'Combo', 'Комбо'],
  ['Vui lòng chọn combo', 'Please select combo', 'Комбо сонгоно уу'],
  // Lead input actions
  ['Phân loại', 'Classify', 'Ангилах'],
  ['Dán', 'Paste', 'Буулгах'],
  ['Cấu hình cột', 'Configure columns', 'Багана тохируулах'],
  ['Xóa', 'Delete', 'Устгах'],
  ['Nhập dữ liệu trước', 'Enter data first', 'Эхлээд өгөгдөл оруулна уу'],
  // Staging card
  ['Đang staging', 'Staging', 'Stage хийж байна'],
  ['Thao tác', 'Actions', 'Үйлдэл'],
  ['Ảnh page', 'Page image', 'Хуудасны зураг'],
  ['Nguồn', 'Source', 'Эх сурвалж'],
  ['Sản phẩm', 'Product', 'Бүтээгдэхүүн'],
  ['Tên', 'Name', 'Нэр'],
  ['SĐT', 'Phone', 'Утас'],
  ['Địa chỉ', 'Address', 'Хаяг'],
  ['Giá', 'Price', 'Үнэ'],
  ['TG Đặt', 'Order date', 'Захиалгын хугацаа'],
  ['Check khách loạt', 'Bulk customer check', 'Үйлчлүүлэгч бөөнөөр шалгах'],
  ['Đẩy sang Sale', 'Push to Sale', 'Борлуулалтад түлхэх'],
  // Facebook Page select
  ['Không có trang nào đang hoạt động', 'No active pages', 'Идэвхтэй хуудас байхгүй'],
  ['Tạo Facebook Page', 'Create Facebook Page', 'Facebook хуудас үүсгэх'],
  ['Tạo mới', 'Create new', 'Шинээр үүсгэх'],
  ['Tất cả lead paste phía dưới sẽ được gắn với trang đã chọn cho đến khi bạn đổi trang khác.', 'All leads pasted below will be tagged with the selected page until you change to a different page.', 'Доор буулгасан бүх лид сонгосон хуудастай холбогдох бөгөөд та өөр хуудас сонгох хүртэл хүчинтэй.'],
  // Edit modal
  ['Sửa đơn hàng', 'Edit order', 'Захиалга засах'],
  // Lead push messages
  ['Không có lead nào để đẩy', 'No leads to push', 'Түлхэх лид байхгүй'],
  ['Vui lòng chọn trang Facebook cho tất cả lead trước khi đẩy', 'Please select Facebook page for all leads before pushing', 'Түлхэхээс өмнө бүх лидэд Facebook хуудас сонгоно уу'],
  ['Tất cả leads đều có lỗi, không thể đẩy', 'All leads have errors, cannot push', 'Бүх лид алдаатай тул түлхэх боломжгүй'],
  ['Bỏ qua', 'Skip', 'Алгасах'],
  ['leads có lỗi', 'leads with errors', 'алдаатай лид'],
  ['Không thể tạo leads', 'Cannot create leads', 'Лид үүсгэх боломжгүй'],
  ['Lỗi khi đẩy sang Sale:', 'Error pushing to Sale:', 'Борлуулалтад түлхэхэд алдаа:'],
  ['Đã đẩy', 'Pushed', 'Түлхсэн'],
  ['lead sang Sale', 'leads to Sale', 'лидийг борлуулалтад'],
  // Toast messages
  ['Trình duyệt không hỗ trợ đọc clipboard. Vui lòng dùng Ctrl+V.', 'Browser does not support reading clipboard. Please use Ctrl+V.', 'Хөтөч clipboard уншихад дэмжлэг үзүүлэхгүй. Ctrl+V ашиглана уу.'],
  ['Clipboard trống', 'Clipboard is empty', 'Clipboard хоосон байна'],
  ['Đã dán dữ liệu từ clipboard', 'Data pasted from clipboard', 'Clipboard-аас өгөгдөл буулгасан'],
  ['Không thể đọc clipboard. Vui lòng dùng Ctrl+V.', 'Cannot read clipboard. Please use Ctrl+V.', 'Clipboard уншиж чадсангүй. Ctrl+V ашиглана уу.'],
  ['Vui lòng chọn trang Facebook trước', 'Please select Facebook page first', 'Эхлээд Facebook хуудас сонгоно уу'],
  ['Vui lòng nhập thông tin lead', 'Please enter lead information', 'Лидийн мэдээлэл оруулна уу'],
  ['dòng thiếu phone.', 'lines missing phone.', 'утсны дугаар дутуу мөр.'],
  ['Đã thêm', 'Added', 'Нэмсэн'],
  ['lead, BỎ QUA', 'leads, SKIPPED', 'лид, АЛГАСАХ'],
  ['Mẫu:', 'Sample:', 'Жишээ:'],
  ['Phone phải là 6-11 chữ số liên tục (vd "96621013"). Nếu paste từ nguồn không có tab, hệ thống sẽ tự tìm phone bằng regex — đảm bảo có ít nhất 1 chuỗi số điện thoại rõ ràng trong dòng.', 'Phone must be 6-11 continuous digits (e.g. "96621013"). If pasting from source without tab, system will auto-find phone by regex — ensure at least 1 clear phone number in the line.', 'Утас нь 6-11 оронтой дараалсан тоо байх ёстой (жнь "96621013"). Хэрэв tab-гүй эх сурвалжаас буулгаж байгаа бол систем regex ашиглан утас хайж олох болно — мөрөнд дор хаяж 1 тодорхой утасны дугаар байгаа эсэхийг шалгаарай.'],
  ['Đã thêm đơn hàng thủ công', 'Added manual order', 'Гараар захиалга нэмсэн'],
  ['Đã xóa tất cả leads trong staging', 'Cleared all staging leads', 'Stage дахь бүх лидийг цэвэрлэсэн'],
  ['Đã cập nhật đơn hàng', 'Order updated', 'Захиалга шинэчлэгдлээ'],
  // PasteTable
  ['Cấu trúc dán số', 'Paste structure', 'Буулгах бүтэц'],
  ['Chế độ bảng Excel', 'Excel table mode', 'Excel хүснэгт горим'],
  ['Bảng', 'Table', 'Хүснэгт'],
  ['Chế độ văn bản', 'Text mode', 'Текст горим'],
  ['Text', 'Text', 'Текст'],
  ['Paste dữ liệu vào bảng hoặc nhấn Ctrl+V ở bảng này', 'Paste data into table or press Ctrl+V in this table', 'Энэ хүснэгтэд өгөгдөл буулгах эсвэл Ctrl+V дарна уу'],
  ['Thêm dòng', 'Add row', 'Мөр нэмэх'],
  ['Nhập dữ liệu (TAB separated):', 'Enter data (TAB separated):', 'Өгөгдөл оруулах (TAB тусгаарлагчтай):'],
  ['Cấu hình:', 'Config:', 'Тохиргоо:'],
  ['Thời gian', 'Time', 'Хугацаа'],
  ['Tên khách', 'Customer name', 'Үйлчлүүлэгчийн нэр'],
  ['Số điện thoại', 'Phone number', 'Утасны дугаар'],
  ['Combo/Giá', 'Combo/Price', 'Комбо/Үнэ'],
  ['FB Page', 'FB Page', 'FB Хуудас'],
  ['Comment', 'Comment', 'Сэтгэгдэл'],
  ['Landing', 'Landing', 'Landing'],
  // Manual order
  ['Trang Facebook', 'Facebook page', 'Facebook хуудас'],
  ['Tên khách hàng', 'Customer name', 'Үйлчlүүлэгчийн нэр'],
  ['Nhập tên khách hàng', 'Enter customer name', 'Үйлчлүүлэгчийн нэр оруулна уу'],
  ['Vui lòng nhập tên', 'Please enter name', 'Нэр оруулна уу'],
  ['Nhập số điện thoại', 'Enter phone number', 'Утасны дугаар оруулна уу'],
  ['Vui lòng nhập SĐT', 'Please enter phone', 'Утасны дугаар оруулна уу'],
  ['SĐT không hợp lệ', 'Invalid phone', 'Утасны дугаар буруу'],
  ['Nhập địa chỉ (tùy chọn)', 'Enter address (optional)', 'Хаяг оруулах (заавал биш)'],
  ['Thời gian đặt hàng', 'Order time', 'Захиалгын хугацаа'],
  ['Ngày giờ khách đặt hàng. Nếu để trống sẽ lấy thời gian hiện tại.', 'Customer order date/time. If left empty, current time will be used.', 'Үйлчлүүлэгч захиалга өгсөн огноо/цаг. Хоосон орхивол одоогийн цаг ашиглагдана.'],
  ['Ngày giờ khách đặt hàng.', 'Customer order date/time.', 'Үйлчлүүлэгч захиалга өгсөн огноо/цаг.'],
  ['Chọn ngày giờ', 'Select date/time', 'Огноо/цаг сонгох'],
  ['Chọn sản phẩm', 'Select product', 'Бүтээгдэхүүн сонгох'],
  ['Vui lòng chọn sản phẩm', 'Please select product', 'Бүтээгдэхүүн сонгоно уу'],
  ['Chọn combo', 'Select combo', 'Комбо сонгох'],
  ['Chọn sản phẩm trước', 'Select product first', 'Эхлээд бүтээгдэхүүн сонгоно уу'],
  ['cái', 'pcs', 'ш'],
  ['Tạo combo mới cho sản phẩm này', 'Create new combo for this product', 'Энэ бүтээгдэхүүнд шинэ комбо үүсгэх'],
  ['Ghi chú', 'Note', 'Тэмдэглэл'],
  ['Nhập ghi chú (tùy chọn)', 'Enter note (optional)', 'Тэмдэглэл оруулах (заавал биш)'],
];

// Function to check if key exists in block
function existsInBlock(content, lang, key) {
  // Escape special regex chars in key
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`"${escapedKey}":`, 'g');
  // Check within the lang block only
  const langKey = `${lang}: {`;
  const langStart = content.indexOf(langKey);
  if (langStart === -1) return false;
  const langEnd = content.indexOf('},', langStart);
  if (langEnd === -1) {
    const langEnd2 = content.indexOf('}\n', langStart);
    const finalEnd = langEnd === -1 ? (langEnd2 === -1 ? content.length : langEnd2) : langEnd;
    const block = content.substring(langStart, finalEnd);
    return regex.test(block);
  }
  const block = content.substring(langStart, langEnd);
  return regex.test(block);
}

// Insert new keys into en and mn blocks
function addKey(content, lang, vi, en, mn) {
  const langKey = `${lang}: {`;
  const langStart = content.indexOf(langKey);
  if (langStart === -1) {
    console.log(`Could not find ${langKey}`);
    return content;
  }
  // Find the end of opening block
  const blockStart = content.indexOf('{', langStart) + 1;
  // Find the matching close - need to track brace depth
  let depth = 1;
  let i = blockStart;
  while (i < content.length && depth > 0) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') depth--;
    i++;
  }
  const blockEnd = i - 1;
  // Get the last newline before insertion
  const beforeInsert = content.substring(0, blockEnd);
  // Find the indentation by looking at the last line before blockEnd
  const lastNewline = beforeInsert.lastIndexOf('\n');
  const indentLine = beforeInsert.substring(lastNewline + 1);
  const indentMatch = indentLine.match(/^(\s*)/);
  const baseIndent = indentMatch ? indentMatch[1] : '    ';
  const value = lang === 'en' ? en : mn;
  // Check if key already exists
  const escapedKey = vi.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const keyRegex = new RegExp(`"${escapedKey}":\\s*"`, 'g');
  const blockContent = content.substring(blockStart, blockEnd);
  if (keyRegex.test(blockContent)) {
    console.log(`[${lang}] Skipping existing: "${vi}"`);
    return content;
  }
  // Insert before blockEnd
  const insertion = `\n${baseIndent}"${vi}": "${value.replace(/"/g, '\\"')}",`;
  return content.substring(0, blockEnd) + insertion + content.substring(blockEnd);
}

let enCount = 0;
let mnCount = 0;

for (const [vi, en, mn] of newKeys) {
  const before = content;
  content = addKey(content, 'en', vi, en, mn);
  if (content !== before) enCount++;
  const before2 = content;
  content = addKey(content, 'mn', vi, en, mn);
  if (content !== before2) mnCount++;
}

fs.writeFileSync(i18nPath, content, 'utf8');
console.log(`Added ${enCount} keys to en, ${mnCount} keys to mn.`);
