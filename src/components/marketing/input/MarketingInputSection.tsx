/**
 * Marketing Input Section Component (Sprint 8.5.2)
 *
 * Component cho phần "Nhập số" - kết nối với Product Module hiện có.
 * Sử dụng:
 * - Categories → Products → Combos từ Product Module
 * - Landing Parser lookup từ MongoDB
 * - Push to Sale với productId, comboId, price
 */

"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Card,
  Button,
  Input,
  Select,
  Form,
  Modal,
  Space,
  InputNumber,
  Popover,
  Image,
  DatePicker,
} from "antd";
import dayjs from "dayjs";
import {
  SendOutlined,
  ClearOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  SnippetsOutlined,
  TeamOutlined,
  InfoCircleOutlined,
  EditOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Tooltip } from "antd";
import { toast } from "@/components/common/feedback/Toast";
import CheckCustomerForm from "./CheckCustomerForm";
import BatchCheckCustomersModal from "./BatchCheckCustomersModal";
import FieldOrderPreview from "./FieldOrderPreview";
import PasteTable from "./PasteTable";
import {
  useProductsByCategory,
  useCombosWithProduct,
  useAllCombosNormalized,
  type ComboWithProduct,
} from "@/hooks/useProducts";
import { useCreateLead, useMarketingLeads, useLeadsCount } from "@/hooks/useMarketingLeads";
import { usePushLeadsToSale } from "@/hooks/usePushLeadsToSale";
import { useActiveFacebookPages } from "@/hooks/useFacebookPages";
import { LeadSource } from "@/constants/leadSource";
import FacebookPageDrawer from "@/app/(protected)/facebook-pages/FacebookPageDrawer";
import styles from "./MarketingInputSection.module.css";
import QuickProductDrawer from "./QuickProductDrawer";
import QuickComboDrawer from "./QuickComboDrawer";
import ColumnMappingModal from "./ColumnMappingModal";
import { useColumnMapping, type ColumnMappings, type InputMode } from "./useColumnMapping";
import { COLUMN_FIELDS } from "./columnLayouts";

const { TextArea } = Input;

/** Map field key → label ngắn cho placeholder & hint. */
const COLUMN_FIELD_LABELS: Record<string, string> = Object.fromEntries(
  COLUMN_FIELDS.map((f) => [f.key, f.label])
);

function formatDateTime(dateStr: string | undefined): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export interface StagedLead {
  id: string;
  customerName: string;
  phone: string;
  /** Optional địa chỉ (Landing mode là cột riêng, Comment mode lấy từ cột 3). */
  address?: string;
  source: LeadSource;
  productId: string;
  productName: string;
  comboId: string;
  comboName: string;
  price: number;
  /** Facebook Page ID assigned to this lead (Sprint 8.6). */
  facebookPageId?: string;
  /** Cached page name for display in the staging list. */
  facebookPageName?: string;
  /** Cached page avatar URL for display in the staging list. */
  facebookPageAvatarUrl?: string;
  /** Ngày giờ từ Landing page (Sprint 8.x). */
  leadDate?: string;
  /** Ghi chú cho đơn hàng (Sprint 8.x). */
  note?: string;
  /** Thời gian đơn hàng - khi khách đặt (Sprint 8.x). */
  orderDate?: string;
  error?: string;
}

export interface MarketingInputSectionProps {
  onLeadsCreated?: () => void;
}

export default function MarketingInputSection({
  onLeadsCreated,
}: MarketingInputSectionProps) {
  // State
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedComboId, setSelectedComboId] = useState<string | null>(null);
  /** Sprint 8.6: Facebook Page that all newly-staged leads will be tagged with. */
  const [selectedFacebookPageId, setSelectedFacebookPageId] = useState<string | null>(null);
  const [facebookPageDrawerOpen, setFacebookPageDrawerOpen] = useState(false);
  const [quickProductDrawerOpen, setQuickProductDrawerOpen] = useState(false);
  /** Sprint 8.x: Drawer thêm combo nhanh cho sản phẩm đang chọn */
  const [quickComboDrawerOpen, setQuickComboDrawerOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [inputType, setInputType] = useState<"comment" | "ladi">("ladi");
  const [stagedLeads, setStagedLeads] = useState<StagedLead[]>([]);
  /** Sprint 8.x: cấu hình thứ tự cột khi dán (lưu localStorage theo user). */
  const columnMapping = useColumnMapping();
  /** Sprint 8.x: Modal sửa lead trong staging. */
  const [editLeadModalOpen, setEditLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<StagedLead | null>(null);
  /** Sprint 8.x: Form sửa lead. */
  const [editLeadForm] = Form.useForm();
  const [columnMappingOpen, setColumnMappingOpen] = useState(false);
  /**
   * Draft layout cho CẢ 2 mode (comment + ladi). User có thể switch tab
   * trong modal để sửa cả 2 cùng lúc; apply khi bấm "Xong".
   */
  const [columnMappingDraft, setColumnMappingDraft] = useState<ColumnMappings>(
    () => ({
      comment: columnMapping.getLayout("comment"),
      ladi: columnMapping.getLayout("ladi"),
    })
  );
  /** Tab đang active trong modal (controlled). */
  const [columnMappingActiveMode, setColumnMappingActiveMode] =
    useState<InputMode>("comment");
  // Bộ lọc & sắp xếp sản phẩm
  const [productSearch, setProductSearch] = useState("");
  const [productSort, setProductSort] = useState<"newest" | "oldest" | "name-asc" | "name-desc" | "code">("newest");
  const [productCategoryFilter, setProductCategoryFilter] = useState<string | "all">("all");
  /** Combo list collapse state - true = thu gọn (chỉ 4 đầu), false = mở rộng hết */
  const [comboExpanded, setComboExpanded] = useState(false);
  /** Product categories expanded state - Set of category IDs that are expanded */
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  /** Sprint 8.7: Manual order input */
  const [manualOrderOpen, setManualOrderOpen] = useState(false);
  const [manualOrderForm] = Form.useForm();
  /** Check khách loạt — dùng từ staging sau khi parse leads. */
  const [batchCheckOpen, setBatchCheckOpen] = useState(false);

  // ============================================================
  // QUERIES - Fetch from Product Module
  // ============================================================

  // Fetch categories with products (isActive = true)
  const { categories, loading: categoriesLoading, error: categoriesError } = useProductsByCategory();

  // Fetch combos for selected product (isActive = true)
  const { combos: productCombos, loading: combosLoading } =
    useCombosWithProduct(selectedProductId);

  // Fetch ALL combos for landing parser lookup
  const { comboByNameMap, comboMap, loading: allCombosLoading } = useAllCombosNormalized();

  // Fetch leads count (leads with marketingEmployeeId = current user, matches /marketing/orders)
  const { leadCount, refetch: refetchLeadsCount } = useLeadsCount();

  // Fetch existing leads for staging count
  const { leads: existingLeads } = useMarketingLeads({
    page: 1,
    limit: 1000,
  });

  // Sprint 8.6: Load active Facebook Pages for the page selector
  const { pages: facebookPages, loading: pagesLoading } = useActiveFacebookPages();

  // Mutations
  const createLeadMutation = useCreateLead();
  const pushToSaleMutation = usePushLeadsToSale();

  // ============================================================
  // COMPUTED VALUES
  // ============================================================

  // Lọc + sắp xếp sản phẩm theo danh mục, tìm kiếm, sort
  const filteredCategories = useMemo(() => {
    const search = productSearch.trim().toLowerCase();

    // 1) Lọc theo category & search
    const filtered = categories
      .filter((cat) => {
        if (productCategoryFilter !== "all" && cat._id !== productCategoryFilter) {
          return false;
        }
        return true;
      })
      .map((cat) => {
        const matchedProducts = cat.products.filter((p) => {
          if (!search) return true;
          return (
            p.name.toLowerCase().includes(search) ||
            p.code.toLowerCase().includes(search) ||
            (p.categoryName ?? "").toLowerCase().includes(search)
          );
        });
        return { ...cat, products: matchedProducts };
      })
      .filter((cat) => cat.products.length > 0);

    // 2) Sort products trong mỗi category
    const sortFn = (
      a: typeof filtered[number]["products"][number],
      b: typeof filtered[number]["products"][number]
    ) => {
      switch (productSort) {
        case "name-asc":
          return a.name.localeCompare(b.name, "vi");
        case "name-desc":
          return b.name.localeCompare(a.name, "vi");
        case "code":
          return a.code.localeCompare(b.code, "vi");
        case "oldest": {
          const aT = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bT = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return aT - bT;
        }
        case "newest":
        default: {
          const aT = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bT = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bT - aT;
        }
      }
    };

    filtered.forEach((cat) => {
      cat.products.sort(sortFn);
    });

    return filtered;
  }, [categories, productSearch, productCategoryFilter, productSort]);

  const totalProductsCount = useMemo(
    () => categories.reduce((sum, c) => sum + c.products.length, 0),
    [categories]
  );

  const filteredProductsCount = useMemo(
    () => filteredCategories.reduce((sum, c) => sum + c.products.length, 0),
    [filteredCategories]
  );

  // Get selected combo info from product combos
  const selectedCombo = useMemo(() => {
    return productCombos.find((c) => c._id === selectedComboId);
  }, [productCombos, selectedComboId]);

  /** Tên sản phẩm đang được chọn (flat lookup qua categories). */
  const selectedProductName = useMemo(() => {
    for (const cat of filteredCategories) {
      const p = cat.products.find((x) => x._id === selectedProductId);
      if (p) return p.name;
    }
    return "";
  }, [filteredCategories, selectedProductId]);

  /** Product code của sản phẩm đang chọn (cần cho Combo API). */
  const selectedProductCode = useMemo(() => {
    for (const cat of filteredCategories) {
      const p = cat.products.find((x) => x._id === selectedProductId);
      if (p) return p.code;
    }
    return undefined;
  }, [filteredCategories, selectedProductId]);

  // Stats for cards
  const stats = useMemo(() => {
    const stagingCount = stagedLeads.length;
    const commentCount = stagedLeads.filter(
      (l) => l.source === LeadSource.FACEBOOK_COMMENT
    ).length;
    const ladiCount = stagedLeads.filter(
      (l) => l.source === LeadSource.LANDING_PAGE
    ).length;
    const errorCount = stagedLeads.filter((l) => l.error).length;
    // Sprint 8.X: leadCount from API (refetched after push)
    return { leadCount, stagingCount, commentCount, ladiCount, errorCount };
  }, [leadCount, stagedLeads]);

  /** Unique SĐT từ staging (dùng cho "Check khách loạt"). */
  const stagingPhones = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const lead of stagedLeads) {
      const raw = (lead.phone ?? "").trim();
      if (!raw) continue;
      const key = raw.replace(/[\s.-]/g, "");
      if (!seen.has(key)) {
        seen.add(key);
        ordered.push(raw);
      }
    }
    return ordered;
  }, [stagedLeads]);

  /** Sprint 8.x: Memoized product options for Select */
  const productSelectOptions = useMemo(
    () =>
      categories.flatMap((c) =>
        (c.products || []).map((p) => ({
          value: p._id,
          label: `${p.name}${p.code ? ` (${p.code})` : ""}`,
        }))
      ),
    [categories]
  );

  // ============================================================
  // HANDLERS
  // ============================================================

  // Handle product selection (toggle: click lại để bỏ chọn)
  const handleSelectProduct = useCallback((productId: string) => {
    setSelectedProductId((prev) => (prev === productId ? null : productId));
    // Bỏ combo khi đổi product hoặc bỏ chọn product
    setSelectedComboId(null);
    setComboExpanded(false);
  }, []);

  // Handle combo selection (toggle: click lại để bỏ chọn)
  const handleSelectCombo = useCallback((comboId: string) => {
    setSelectedComboId((prev) => (prev === comboId ? null : comboId));
  }, []);

  // Handle input type change
  const handleInputTypeChange = useCallback((type: "comment" | "ladi") => {
    setInputType(type);
  }, []);

  const handleFacebookPageCreated = useCallback((page?: { _id: string }) => {
    if (page) setSelectedFacebookPageId(page._id);
    setFacebookPageDrawerOpen(false);
  }, []);

  // Handle paste from clipboard
  const handlePasteFromClipboard = useCallback(async () => {
    try {
      if (!navigator.clipboard?.readText) {
        toast.warning("Trình duyệt không hỗ trợ đọc clipboard. Vui lòng dùng Ctrl+V.");
        return;
      }
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast.warning("Clipboard trống");
        return;
      }
      setInputText(text);
      toast.success("Đã dán dữ liệu từ clipboard");
    } catch (err) {
      console.error("Clipboard read error:", err);
      toast.warning("Không thể đọc clipboard. Vui lòng dùng Ctrl+V.");
    }
  }, []);

  // Handle manual order add
  const handleManualOrderAdd = useCallback(() => {
    manualOrderForm.validateFields().then((values) => {
      const { facebookPageId, customerName, phone, address, note, productId, comboId, orderDate: formOrderDate } = values;

      if (!facebookPageId) {
        toast.warning("Vui lòng chọn trang Facebook");
        return;
      }

      // Find selected combo info
      const combo = comboMap[comboId];
      const product = categories
        .flatMap(c => c.products || [])
        .find(p => p._id === productId);

      // Sprint 8.x: Parse orderDate from form (dayjs) or use current time
      const finalOrderDate = formOrderDate
        ? formOrderDate.toDate().toISOString()
        : new Date().toISOString();

      const newLead: StagedLead = {
        id: `staged-${Date.now()}`,
        customerName: customerName || "Khách hàng",
        phone,
        address: address || undefined,
        source: LeadSource.FACEBOOK_COMMENT,
        productId: productId || "",
        productName: product?.name || combo?.productName || "",
        comboId: comboId || "",
        comboName: combo?.name || "",
        price: combo?.sellingPrice || 0,
        facebookPageId,
        facebookPageName: facebookPages.find(p => p._id === facebookPageId)?.name,
        facebookPageAvatarUrl: facebookPages.find(p => p._id === facebookPageId)?.avatarUrl,
        // Sprint 8.x: ghi chú đơn hàng
        note: note || undefined,
        orderDate: finalOrderDate,
      };

      setStagedLeads(prev => [...prev, newLead]);
      toast.success("Đã thêm đơn hàng thủ công");
      manualOrderForm.resetFields();
      setManualOrderOpen(false);
    }).catch(() => {
      // Validation failed
    });
  }, [facebookPages, comboMap, categories, manualOrderForm]);

  // Handle quick product created
  const handleQuickProductCreated = useCallback(
    (productId: string, productName: string, comboIds: string[]) => {
      setSelectedProductId(productId);
      // Tự chọn combo đầu tiên sau khi tạo
      setSelectedComboId(comboIds[0] ?? null);
    },
    []
  );

  // Handle quick combo created (cho sản phẩm đang chọn)
  const handleQuickComboCreated = useCallback((comboIds: string[]) => {
    // Tự chọn combo đầu tiên vừa tạo
    if (comboIds[0]) {
      setSelectedComboId(comboIds[0]);
    }
  }, []);

  // Parse leads from input text - SPRINT 8.5.2 ENHANCED
  const handleParseLeads = useCallback(() => {
    // Chỉ cần chọn Facebook page là được điền (sản phẩm có thể nằm trong form)
    if (!selectedFacebookPageId) {
      toast.warning("Vui lòng chọn trang Facebook trước");
      return;
    }

    const lines = inputText.trim().split("\n").filter((l) => l.trim());
    if (lines.length === 0) {
      toast.warning("Vui lòng nhập thông tin lead");
      return;
    }

    const newLeads: StagedLead[] = [];
    let leadIdCounter = Date.now();
    let errorCount = 0;
    let autoDetectCount = 0;
    let noProductInfoCount = 0;
    /** Lưu STT (1-based) của các dòng thiếu product info trong staging. */
    const noProductInfoRows: number[] = [];
    /**
     * Số dòng bị SKIP hoàn toàn (không tạo lead, không có trong staging).
     * Nguyên nhân thường gặp: thiếu cột phone, hoặc paste từ nguồn làm tab
     * bị convert thành space (Google Sheets).
     */
    let skippedCount = 0;
    /**
     * Sample 3 dòng đầu bị skip (để hiển thị trong toast cho user debug).
     */
    const skippedSamples: string[] = [];

    // Lấy layout cột theo mode hiện tại (do MKT tự cấu hình)
    const currentLayout = columnMapping.getLayout(inputType);

    // Helper: build object {name, phone, address, combo, product, date, facebookPage, orderDate}
    // từ mảng parts theo layout. Field nào không có trong layout → "".
    function parseRowByLayout(
      parts: string[]
    ): Record<string, string> {
      const out: Record<string, string> = {
        name: "",
        phone: "",
        address: "",
        combo: "",
        product: "",
        date: "",
        facebookPage: "",
        orderDate: "",
      };
      currentLayout.forEach((key, idx) => {
        out[key] = (parts[idx] || "").trim();
      });
      // Nếu layout có date, copy sang orderDate
      if (out.date && !out.orderDate) {
        out.orderDate = out.date;
      }
      return out;
    }

    /**
     * Tách 1 dòng dán thành các cột theo separator.
     * Thử theo thứ tự:
     *   1. TAB (`\t`) — Excel, comment Facebook copy-as-text
     *   2. 2+ spaces (`\s{2,}`) — Google Sheets thường convert tab thành spaces
     *   3. Nếu cả 2 đều chỉ ra 1 phần tử → giữ nguyên 1 phần tử
     *
     * Vấn đề lịch sử: nếu user paste từ Google Sheets mà chỉ thấy 0 lead,
     * nguyên nhân là Sheets chuyển tab → space, khiến `split("\t")` chỉ ra
     * 1 cột → phone rỗng → skip toàn bộ dòng.
     */
    function splitRow(line: string): string[] {
      const tabParts = line.split("\t");
      if (tabParts.length > 1) {
        return tabParts.map((p) => p.trim());
      }
      const spaceParts = line.split(/\s{2,}/);
      if (spaceParts.length > 1) {
        return spaceParts.map((p) => p.trim());
      }
      // Fallback: giữ nguyên dòng (sẽ fail ở validate phone → báo lỗi)
      return [line.trim()];
    }

    /**
     * Heuristic parser — dùng khi split theo tab/2-space thất bại.
     *
     * Logic mới: dùng **productName làm anchor chính** (lấy từ DB).
     *
     *   1. Date + optional Time ở đầu (Landing mode)
     *   2. Tìm productName trong line (sort theo độ dài desc) → out.product
     *   3. Từ productName match → tìm combo thuộc product đó match với afterPhone
     *      → out.combo
     *   4. Tìm phone (8-11 digits) ở giữa line
     *   5. Trước phone = name (loại bỏ time/time sót nếu có)
     *   6. Sau phone = address (cắt bỏ comboText nếu đã match ở step 3)
     *
     * Ưu điểm: dựa trên dữ liệu DB → không phụ thuộc format pattern cứng.
     * Combo description match exact (lowercase compare) với combo.name trong DB.
     */
    function smartParseRow(
      line: string,
      productNames: string[],
      productIdByName: Record<string, string>,
      combosByProductId: Record<string, Array<{ name: string; sellingPrice?: number }>>
    ): Record<string, string> {
      const out: Record<string, string> = {
        name: "",
        phone: "",
        address: "",
        combo: "",
        product: "",
        date: "",
        facebookPage: "",
      };

      // 1. Date + optional Time ở đầu dòng (Landing mode)
      // Sprint 8.x: Capture full datetime (YYYY-MM-DD HH:mm:ss hoặc YYYY-MM-DD HH:mm)
      // Chỉ capture date và time, KHÔNG consume delimiter (tab/space) phía sau
      const dateTimeMatch = line.match(
        /^(\d{4}-\d{1,2}-\d{1,2})[T\s]+(\d{1,2}:\d{2}(?::\d{2})?)/i
      );
      if (dateTimeMatch) {
        // Build full ISO datetime string
        const dateStr = dateTimeMatch[1]; // YYYY-MM-DD
        const timeStr = dateTimeMatch[2]; // HH:mm hoặc HH:mm:ss
        const [hours, minutes, seconds] = timeStr.split(":");
        out.date = `${dateStr}T${hours}:${minutes}:${seconds || "00"}`;
        // Sprint 8.x: copy date to orderDate for use in StagedLead
        out.orderDate = out.date;
        // Remove date+time portion (including the space/tab delimiter)
        line = line.substring(dateTimeMatch[0].length).trim();
      }

      // 2. Tìm productName trong line (anchor chính)
      const sortedProducts = [...productNames].sort((a, b) => b.length - a.length);
      let productNameMatch: string | null = null;
      for (const productName of sortedProducts) {
        if (line.toLowerCase().includes(productName.toLowerCase())) {
          productNameMatch = productName;
          break;
        }
      }
      if (productNameMatch) out.product = productNameMatch;

      // 3. Tìm phone (6-11 digits) - hỗ trợ các format:
      // - 89016888 (thường)
      // - -89016888 (có dấu - đằng trước)
      // - 89016888)- (có dấu )- đằng sau)
      // - -89016888)- (cả 2)
      const phoneMatch = line.match(/(?:^|[^\d-])(\d{6,11})(?:\D|$|-)*/);
      if (!phoneMatch) return out;
      out.phone = phoneMatch[1];
      const phoneStartIdx = phoneMatch.index! + (phoneMatch[0].indexOf(phoneMatch[1]));
      const phoneEndIdx = phoneStartIdx + phoneMatch[1].length;

      const beforePhone = line.substring(0, phoneStartIdx).trim();
      const afterPhone = line.substring(phoneEndIdx).trim();

      // 4. Tìm combo trong afterPhone — luôn luôn tìm, không cần productNameMatch
      // Nếu có productNameMatch → ưu tiên combos của product đó
      // Nếu không → tìm trong tất cả combos (user đã chọn product ở trên)
      // Dữ liệu layout: name | phone | combo | address
      // => combo nằm trước address, nên address = text SAU combo
      let comboText = "";
      let addressText = "";

      // Helper function để tìm và extract combo từ text
      // Trả về: { comboName, remainingAfter (text sau combo) }
      const findComboInText = (
        text: string,
        combos: Array<{ name: string; sellingPrice?: number }>
      ): { comboName: string; remainingAfter: string } => {
        let found = "";
        let remainingAfter = text;
        const sortedCombos = [...combos].sort((a, b) => b.name.length - a.name.length);

        for (const c of sortedCombos) {
          const comboLower = c.name.toLowerCase();
          const idx = text.toLowerCase().indexOf(comboLower);
          if (idx !== -1) {
            found = c.name;
            // Lấy text SAU combo (không phải trước!)
            const afterIdx = idx + c.name.length;
            remainingAfter = text.substring(afterIdx).trim();
            break;
          }
        }

        return { comboName: found, remainingAfter };
      };

      // Lấy tất cả combos (ưu tiên product đã chọn, nếu không thì tất cả)
      let allCombos: Array<{ name: string; sellingPrice?: number }> = [];
      if (productNameMatch) {
        const matchedProductId = productIdByName[productNameMatch.toLowerCase()];
        allCombos = matchedProductId ? (combosByProductId[matchedProductId] || []) : [];
      }
      // Fallback: tìm trong tất cả combos nếu không có product match
      if (allCombos.length === 0) {
        allCombos = Object.values(combosByProductId).flat();
      }

      // Tìm combo bằng name (sort theo độ dài để match longest trước)
      const nameResult = findComboInText(afterPhone, allCombos);
      if (nameResult.comboName) {
        comboText = nameResult.comboName;
        addressText = nameResult.remainingAfter;
      }

      // Nếu không tìm được bằng name, thử match bằng price
      if (!comboText) {
        const priceMatch = afterPhone.match(/(\d[\d,]*)\s*[₮₹$]/);
        if (priceMatch) {
          const priceStr = priceMatch[1].replace(/,/g, "");
          const price = parseInt(priceStr, 10);
          // Tìm combo có sellingPrice = price
          for (const combos of Object.values(combosByProductId)) {
            const matchedCombo = combos.find(c => c.sellingPrice === price);
            if (matchedCombo) {
              comboText = matchedCombo.name;
              // Address = text sau price
              const priceIdx = afterPhone.indexOf(priceMatch[0]);
              if (priceIdx !== -1) {
                addressText = afterPhone.substring(priceIdx + priceMatch[0].length).trim();
              }
              break;
            }
          }
        }
      }

      // Nếu vẫn không tìm được, thử tìm keywords trong combo description
      if (!comboText && allCombos.length > 0) {
        for (const c of allCombos) {
          // Tách các từ khóa từ combo name (các từ > 3 ký tự)
          const keywords = c.name.split(/\s+/).filter(w => w.length > 3);
          // Đếm số từ khóa match trong afterPhone
          const matchedKeywords = keywords.filter(kw =>
            afterPhone.toLowerCase().includes(kw.toLowerCase())
          );
          // Nếu match >= 50% keywords hoặc >= 2 keywords
          if (matchedKeywords.length >= Math.max(2, Math.ceil(keywords.length * 0.5))) {
            comboText = c.name;
            // Address = text SAU combo keywords
            const lastMatchIdx = matchedKeywords.reduce((maxIdx, kw) => {
              const idx = afterPhone.toLowerCase().lastIndexOf(kw.toLowerCase());
              return idx > maxIdx ? idx : maxIdx;
            }, 0);
            if (lastMatchIdx > 0 && lastMatchIdx + matchedKeywords[0].length < afterPhone.length) {
              addressText = afterPhone.substring(lastMatchIdx + matchedKeywords[0].length).trim();
            }
            break;
          }
        }
      }

      // 5. Tách name (loại bỏ time sót nếu có)
      let nameText = beforePhone
        .replace(/^\d{1,2}:\d{2}(?::\d{2})?\s*/, "")
        .trim();

      // 6. Address đã được tính ở trên nếu có combo, ngược lại dùng full afterPhone
      if (!comboText) {
        addressText = afterPhone;
      }

      // Fallback: nếu không tìm được combo trong DB → extract raw combo info
      // (emoji + price + description) từ afterPhone để resolveComboAndProduct
      // có thể match bằng price hoặc partial name
      if (!comboText) {
        const comboStart = afterPhone.match(
          /[✅📦🎁⭐🌟].*/
        );
        if (comboStart) {
          comboText = comboStart[0].trim();
          const idx = afterPhone.indexOf(comboStart[0]);
          // Address = text SAU emoji combo
          addressText = afterPhone.substring(idx + comboStart[0].length).trim();
        }
      }

      out.name = nameText;
      out.address = addressText;
      out.combo = comboText;
      return out;
    }

    // Build product maps để dùng cho smartParseRow (productName là anchor)
    const productNames = categories.flatMap((c) =>
      (c.products || []).map((p) => p.name)
    );
    // productIdByName: productName -> productId
    const productIdByName: Record<string, string> = {};
    categories.forEach((c) => {
      (c.products || []).forEach((p) => {
        productIdByName[p.name.toLowerCase()] = p._id;
      });
    });
    // combosByProductId: productId -> [{name, sellingPrice}]
    const combosByProductId: Record<
      string,
      Array<{ name: string; sellingPrice?: number }>
    > = {};
    Object.values(comboByNameMap).forEach((combo) => {
      const pid = combo.productId;
      if (!pid) return;
      if (!combosByProductId[pid]) combosByProductId[pid] = [];
      combosByProductId[pid].push({
        name: combo.name,
        sellingPrice: combo.sellingPrice,
      });
    });

    /**
     * Chọn parser: tab-split (chuẩn) nếu được, heuristic (fallback) nếu không.
     *
     * - Line bắt đầu bằng `YYYY-MM-DD` (Landing mode date) → dùng smartParseRow
     *   vì layout chuẩn không có date ở cột 0, nên splitRow sẽ bị dính date+time
     *   vào name.
     * - Tab/double-space đủ parts theo layout VÀ KHÔNG bắt đầu bằng date
     *   → position-based parse (giữ nguyên hành vi hiện tại).
     * - Ngược lại → heuristic dùng productName làm anchor.
     *
     * Đảm bảo luôn parse được kể cả khi paste từ nguồn single-space.
     */
    function parseRowSmart(line: string): Record<string, string> {
      const trimmed = line.trimStart();
      // Ưu tiên check date (Landing mode) TRƯỚC khi split
      // vì Landing data có thể có tab/space separation nhưng cần smartParseRow
      // để tách date+time riêng và extract combo → address đúng cách.
      if (/^\d{4}-\d{1,2}-\d{1,2}\b/.test(trimmed)) {
        return smartParseRow(line, productNames, productIdByName, combosByProductId);
      }
      const parts = splitRow(line);
      // Nếu split được nhiều cột → dùng position-based theo layout user đã cấu hình
      if (parts.length > 1 && parts.length >= Math.min(3, currentLayout.length)) {
        return parseRowByLayout(parts);
      }
      // Fallback: heuristic parse với productName anchor
      return smartParseRow(line, productNames, productIdByName, combosByProductId);
    }

    // Create combo lookup by price (primary) and by partial name match.
    // Lưu ý: mỗi combo đè key của các part > 3 chars. Nếu nhiều combo chung
    // một part (vd "үнэгүй") thì part đó sẽ trỏ vào combo insert sau.
    // Vì vậy khi iterate để match, ta sort key DESC theo độ dài để combo name
    // đầy đủ (length lớn) match trước các part nhỏ.
    const combosByPrice: Record<number, ComboWithProduct> = {};
    const combosByPartialName: Record<string, ComboWithProduct> = {};

    Object.values(comboByNameMap).forEach((combo) => {
      if (combo.sellingPrice) {
        combosByPrice[combo.sellingPrice] = combo;
      }
      const comboNameLower = combo.name.toLowerCase();
      combosByPartialName[comboNameLower] = combo;
      const parts = comboNameLower.split(/\s+/);
      parts.forEach(part => {
        if (part.length > 3) {
          combosByPartialName[part] = combo;
        }
      });
    });

    /**
     * Resolve combo + product cho 1 lead, có tính đến selection của user.
     *
     * Ưu tiên:
     *   1. selectedCombo (nếu có) → dùng luôn, kể cả khi parsedCombo khác
     *   2. selectedProduct (nếu có) → dùng luôn, kể cả khi parsedProduct khác
     *   3. Nếu chỉ có product mà chưa có combo → tìm combo thuộc product đó
     *   4. Auto-detect từ parsed (giống logic cũ) nếu không có selection
     *
     * Trả về warnings nếu parsed ≠ selected (để hiển thị toast).
     */
    function resolveComboAndProduct(
      comboInfo: string,
      productInfo: string
    ): {
      combo: ComboWithProduct | undefined;
      comboError: string | undefined;
      resolvedProductId: string;
      resolvedProductName: string;
      warnings: string[];
    } {
      const warnings: string[] = [];

      // ----- Auto-detect combo từ comboInfo -----
      let autoCombo: ComboWithProduct | undefined;
      let comboError: string | undefined;

      // Strategy A: price match
      const priceMatch = comboInfo.match(/(\d[\d,]*)\s*[₮₹$]?/);
      if (priceMatch) {
        const price = parseInt(priceMatch[1].replace(/,/g, ""), 10);
        if (price && combosByPrice[price]) autoCombo = combosByPrice[price];
      }
      // Strategy B: tên combo exact/partial — sort keys desc theo độ dài
      // để match longest name trước (combo name đầy đủ hơn part).
      if (!autoCombo && comboInfo) {
        const comboInfoLower = comboInfo.toLowerCase();
        const sortedKeys = Object.keys(combosByPartialName).sort(
          (a, b) => b.length - a.length
        );
        for (const key of sortedKeys) {
          if (comboInfoLower.includes(key) || key.includes(comboInfoLower.substring(0, 10))) {
            autoCombo = combosByPartialName[key];
            break;
          }
        }
      }

      // ----- Auto-detect product từ productInfo -----
      let autoProductId = "";
      let autoProductName = "";
      if (productInfo) {
        const productInfoLower = productInfo.toLowerCase();
        for (const c of Object.values(comboByNameMap)) {
          const pn = (c.productName || "").toLowerCase();
          if (pn && productInfoLower.includes(pn)) {
            autoProductId = c.productId || "";
            autoProductName = c.productName || "";
            break;
          }
        }
      }

      // ----- Resolution theo selection của user -----
      let finalCombo: ComboWithProduct | undefined;
      let finalProductId = "";
      let finalProductName = "";

      if (selectedCombo) {
        // User đã chọn combo → dùng combo đó làm anchor
        finalCombo = selectedCombo;
        finalProductId = selectedCombo.productId || "";
        finalProductName = selectedCombo.productName || "";

        // Nếu parsed product khác với selectedProduct → warn
        if (selectedProductName && autoProductName &&
            selectedProductName.toLowerCase() !== autoProductName.toLowerCase()) {
          warnings.push(
            `Sản phẩm "${autoProductName}" trong dữ liệu KHÔNG khớp sản phẩm đang chọn "${selectedProductName}"`
          );
        }
        // Nếu parsed combo khác với selectedCombo → warn
        if (autoCombo && autoCombo._id !== selectedCombo._id) {
          warnings.push(
            `Combo "${autoCombo.name}" trong dữ liệu KHÔNG khớp combo đang chọn "${selectedCombo.name}"`
          );
        }
      } else if (selectedProductId && selectedProductName) {
        // User đã chọn product nhưng chưa chọn combo
        finalProductId = selectedProductId;
        finalProductName = selectedProductName;

        // Thử tìm combo thuộc product đang chọn
        const productCombos = Object.values(comboByNameMap).filter(
          (c) => c.productId === selectedProductId
        );

        // Ưu tiên: autoCombo nếu thuộc product đang chọn
        if (autoCombo && autoCombo.productId === selectedProductId) {
          finalCombo = autoCombo;
        } else if (autoCombo && autoCombo.productId &&
                   autoCombo.productId !== selectedProductId) {
          // autoCombo thuộc product khác → warn, KHÔNG fallback về combo đầu tiên
          warnings.push(
            `Combo "${autoCombo.name}" thuộc sản phẩm "${autoCombo.productName || "?"}" ` +
            `KHÔNG khớp sản phẩm đang chọn "${selectedProductName}"`
          );
          // KHÔNG gán combo → giữ trống để user tự chọn
        }
        // Nếu autoCombo undefined (text không khớp combo nào trong DB) → giữ trống, không gán combo

        // Nếu parsed product khác → warn
        if (autoProductName && autoProductName.toLowerCase() !== selectedProductName.toLowerCase()) {
          warnings.push(
            `Sản phẩm "${autoProductName}" trong dữ liệu KHÔNG khớp sản phẩm đang chọn "${selectedProductName}"`
          );
        }
      } else {
        // Không có selection → dùng auto-detect
        finalCombo = autoCombo;
        finalProductId = autoProductId;
        finalProductName = autoProductName;

        // Nếu chỉ có combo mà chưa có product → lấy từ combo
        if (autoCombo && !finalProductId) {
          finalProductId = autoCombo.productId || "";
          finalProductName = autoCombo.productName || "";
        }

        // Fallback: nếu vẫn chưa có combo nhưng có productId → lấy combo đầu tiên
        if (!finalCombo && finalProductId) {
          finalCombo = Object.values(comboByNameMap).find(
            (c) => c.productId === finalProductId
          );
        }
      }

      if (!finalCombo) {
        comboError = "Không tìm thấy combo";
      }

      return {
        combo: finalCombo,
        comboError,
        resolvedProductId: finalProductId,
        resolvedProductName: finalProductName,
        warnings,
      };
    }

    // Track warnings từ tất cả lead trong batch
    const allWarnings: string[] = [];

    lines.forEach((line) => {
      if (inputType === "comment") {
        // Format: layout do MKT cấu hình (default: Tên · SĐT · Đ/c · Combo · SP)
        // Ví dụ:
        //   Гантуяа Толя	96621013	Баянчандман	✅99,000₮-өөр 4 нь 10 нь үнэгүй	EYE
        const parsed = parseRowSmart(line);
        const { name, phone, address, combo: comboInfo, product: productInfo } = parsed;

        if (!phone) {
          skippedCount++;
          if (skippedSamples.length < 3) {
            skippedSamples.push(
              `[name=${name || "?"}] thiếu phone — line: "${line.substring(0, 60)}${line.length > 60 ? "..." : ""}"`
            );
          }
          return;
        }

        // ---- Resolve combo + product (có tính đến selection) ----
        const { combo, comboError, resolvedProductId, resolvedProductName, warnings } =
          resolveComboAndProduct(comboInfo, productInfo);
        allWarnings.push(...warnings);

        if (comboError) errorCount++;
        if (!comboError && combo) autoDetectCount++;

        // Detect: nếu dữ liệu paste không có comboInfo lẫn productInfo
        // VÀ hệ thống cũng không resolve được combo (không có selection để fallback)
        // → báo "CHƯA CÓ thông tin sản phẩm/combo"
        if (!comboInfo && !productInfo && !combo) {
          noProductInfoCount++;
          // STT trong staging = số lead đã có + số lead mới đã thêm trong batch + 1
          const stagedSoFar = stagedLeads.length + newLeads.length;
          noProductInfoRows.push(stagedSoFar + 1);
        }

        const finalProductId = combo?.productId || resolvedProductId || "";
        const finalProductName = combo?.productName || resolvedProductName || "";

        if (combo) {
          newLeads.push({
            id: `staged-${leadIdCounter++}`,
            customerName: name || "Khách hàng",
            phone,
            address: address || undefined,
            source: LeadSource.FACEBOOK_COMMENT,
            productId: finalProductId,
            productName: finalProductName,
            comboId: combo._id,
            comboName: combo.name,
            price: combo.sellingPrice,
            facebookPageId: selectedFacebookPageId ?? undefined,
            facebookPageName:
              facebookPages.find((p) => p._id === selectedFacebookPageId)?.name ??
              undefined,
            facebookPageAvatarUrl:
              facebookPages.find((p) => p._id === selectedFacebookPageId)?.avatarUrl ??
              undefined,
          });
        } else {
          // Vẫn push lead với error để user thấy trong staging
          newLeads.push({
            id: `staged-${leadIdCounter++}`,
            customerName: name || "Khách hàng",
            phone,
            address: address || undefined,
            source: LeadSource.FACEBOOK_COMMENT,
            productId: finalProductId,
            productName: finalProductName,
            comboId: "",
            comboName: "",
            price: 0,
            facebookPageId: selectedFacebookPageId ?? undefined,
            facebookPageName:
              facebookPages.find((p) => p._id === selectedFacebookPageId)?.name ??
              undefined,
            facebookPageAvatarUrl:
              facebookPages.find((p) => p._id === selectedFacebookPageId)?.avatarUrl ??
              undefined,
            error: comboError,
            // Sprint 8.x: thời gian đơn hàng
            orderDate: new Date().toISOString(),
          });
        }
      } else {
        // Format: layout do MKT cấu hình (default: Ngày · Tên · SĐT · Đ/c · Combo · SP)
        // ComboInfo có thể là: "✅99,000₮-өөр 4 нь 10 нь үнэгүй" hoặc chỉ "99,000"
        const parsed = parseRowSmart(line);
        const {
          name,
          phone,
          address,
          combo: comboInfo,
          product: productInfo,
          date: leadDate,
          orderDate: parsedOrderDate,
        } = parsed;

        // Sprint 8.x: Use orderDate from parsed data, fallback to leadDate or current time
        // Nếu không có giá trị → orderDate = receivedDate (thời gian push/hiện tại)
        const currentTime = new Date().toISOString();
        const finalOrderDate = parsedOrderDate || leadDate || currentTime;

        if (!phone) {
          skippedCount++;
          if (skippedSamples.length < 3) {
            skippedSamples.push(
              `[name=${name || "?"}] thiếu phone — line: "${line.substring(0, 60)}${line.length > 60 ? "..." : ""}"`
            );
          }
          return;
        }

        // ---- Resolve combo + product (có tính đến selection) ----
        const { combo, comboError, resolvedProductId, resolvedProductName, warnings } =
          resolveComboAndProduct(comboInfo, productInfo);
        allWarnings.push(...warnings);

        if (comboError) errorCount++;
        if (!comboError && combo) autoDetectCount++;

        // Detect: nếu dữ liệu paste không có comboInfo lẫn productInfo
        // VÀ hệ thống cũng không resolve được combo (không có selection để fallback)
        // → báo "CHƯA CÓ thông tin sản phẩm/combo"
        if (!comboInfo && !productInfo && !combo) {
          noProductInfoCount++;
          const stagedSoFar = stagedLeads.length + newLeads.length;
          noProductInfoRows.push(stagedSoFar + 1);
        }

        const finalProductId = combo?.productId || resolvedProductId || "";
        const finalProductName = combo?.productName || resolvedProductName || "";

        if (combo) {
          newLeads.push({
            id: `staged-${leadIdCounter++}`,
            customerName: name,
            phone,
            address: address || undefined,
            source: LeadSource.LANDING_PAGE,
            productId: finalProductId,
            productName: finalProductName,
            comboId: combo._id,
            comboName: combo.name,
            price: combo.sellingPrice,
            facebookPageId: selectedFacebookPageId ?? undefined,
            facebookPageName:
              facebookPages.find((p) => p._id === selectedFacebookPageId)?.name ??
              undefined,
            facebookPageAvatarUrl:
              facebookPages.find((p) => p._id === selectedFacebookPageId)?.avatarUrl ??
              undefined,
            // Sprint 8.x: leadDate từ Landing page
            leadDate: leadDate || undefined,
            error: comboError,
            // Sprint 8.x: thời gian đơn hàng
            orderDate: finalOrderDate || new Date().toISOString(),
          });
        } else {
          newLeads.push({
            id: `staged-${leadIdCounter++}`,
            customerName: name,
            phone,
            address: address || undefined,
            source: LeadSource.LANDING_PAGE,
            productId: finalProductId,
            productName: finalProductName,
            comboId: "",
            comboName: "",
            price: 0,
            facebookPageId: selectedFacebookPageId ?? undefined,
            facebookPageName:
              facebookPages.find((p) => p._id === selectedFacebookPageId)?.name ??
              undefined,
            facebookPageAvatarUrl:
              facebookPages.find((p) => p._id === selectedFacebookPageId)?.avatarUrl ??
              undefined,
            // Sprint 8.x: leadDate từ Landing page
            leadDate: leadDate || undefined,
            error: comboError || "Không tìm thấy combo",
            // Sprint 8.x: thời gian đơn hàng
            orderDate: finalOrderDate || new Date().toISOString(),
          });
        }
      }
    });

    setStagedLeads((prev) => [...prev, ...newLeads]);
    setInputText("");

    // Deduplicate warnings (nhiều dòng có cùng lỗi → chỉ hiện 1 lần)
    const uniqueWarnings = [...new Set(allWarnings)];

    if (skippedCount > 0) {
      // Báo cụ thể dòng bị skip + gợi ý lý do để user tự debug
      const sampleText = skippedSamples.join("\n• ");
      toast.warning(
        `Đã thêm ${newLeads.length} lead, BỎ QUA ${skippedCount} dòng thiếu phone.\n` +
          `Mẫu:\n• ${sampleText}\n` +
          `💡 Phone phải là 6-11 chữ số liên tục (vd "96621013"). ` +
          `Nếu paste từ nguồn không có tab, hệ thống sẽ tự tìm phone bằng regex — ` +
          `đảm bảo có ít nhất 1 chuỗi số điện thoại rõ ràng trong dòng.`,
        8
      );
    } else if (errorCount > 0) {
      toast.warning(
        `Đã thêm ${newLeads.length} lead, có ${errorCount} lỗi không tìm thấy combo`
      );
    } else if (autoDetectCount > 0) {
      toast.success(`Đã thêm ${newLeads.length} lead (tự động detect ${autoDetectCount} combo)`);
    } else {
      toast.success(`Đã thêm ${newLeads.length} lead vào staging`);
    }

    // Trường hợp paste không có thông tin sản phẩm/combo → báo ngắn gọn
    if (noProductInfoCount > 0) {
      const rowsText = noProductInfoRows.join(", ");
      toast.warning(
        `⚠ Dòng STT: ${rowsText} đang thiếu dữ liệu sản phẩm/combo — hãy chọn sản phẩm/combo ở trên.`,
        6
      );
    }

    // Cảnh báo mismatch giữa dữ liệu paste và sản phẩm/combo đang chọn
    if (uniqueWarnings.length > 0) {
      const warningText =
        `⚠ Dữ liệu paste KHÔNG trùng khớp sản phẩm/combo đang chọn:\n` +
        `• ${uniqueWarnings.slice(0, 3).join("\n• ")}` +
        (uniqueWarnings.length > 3
          ? `\n• ... và ${uniqueWarnings.length - 3} cảnh báo khác`
          : "");
      toast.warning(warningText, 8);
    }
  }, [inputText, inputType, selectedCombo, selectedProductId, selectedProductName, comboByNameMap, selectedFacebookPageId, facebookPages]);

  // Handle remove staged lead
  const handleRemoveStagedLead = useCallback((id: string) => {
    setStagedLeads((prev) => prev.filter((l) => l.id !== id));
  }, []);

  // Handle clear all staged leads
  const handleClearAll = useCallback(() => {
    setStagedLeads([]);
    toast.success("Đã xóa tất cả leads trong staging");
  }, []);

  // Sprint 8.x: Mở modal sửa lead
  const handleOpenEditLead = useCallback((lead: StagedLead) => {
    setEditingLead(lead);
    editLeadForm.setFieldsValue({
      customerName: lead.customerName,
      phone: lead.phone,
      address: lead.address || "",
      note: lead.note || "",
      productId: lead.productId || undefined,
      comboId: lead.comboId || undefined,
      orderDate: lead.orderDate
        ? dayjs(lead.orderDate)
        : undefined,
    });
    setEditLeadModalOpen(true);
  }, [editLeadForm]);

  // Sprint 8.x: Lưu đơn hàng sau khi sửa
  const handleSaveEditLead = useCallback(() => {
    editLeadForm.validateFields().then((values) => {
      if (!editingLead) return;
      const { customerName, phone, address, note, productId, comboId, orderDate: formOrderDate } = values;
      // Resolve productName và comboName
      const allProducts = categories.flatMap((c) => c.products);
      const product = allProducts.find((p) => p._id === productId);
      const combo = productId && comboId ? comboMap[comboId] : undefined;
      const comboPrice = combo?.sellingPrice ?? 0;
      // Sprint 8.x: Nếu không nhập orderDate → dùng current time (= receivedDate khi push)
      const finalOrderDate = formOrderDate
        ? formOrderDate.toDate().toISOString()
        : new Date().toISOString();
      setStagedLeads((prev) =>
        prev.map((l) =>
          l.id === editingLead.id
            ? {
                ...l,
                customerName: customerName || "Khách hàng",
                phone,
                address: address || undefined,
                note: note || undefined,
                productId: productId || "",
                productName: product?.name || "",
                comboId: comboId || "",
                comboName: combo?.name || "",
                price: comboPrice,
                orderDate: finalOrderDate,
                error: undefined,
              }
            : l
        )
      );
      toast.success("Đã cập nhật đơn hàng");
      setEditLeadModalOpen(false);
      setEditingLead(null);
      editLeadForm.resetFields();
    });
  }, [editingLead, editLeadForm, categories, comboMap]);

  // Handle push to Sale - SPRINT 8.5.2 ENHANCED
  const handlePushToSale = useCallback(async () => {
    if (stagedLeads.length === 0) {
      toast.warning("Không có lead nào để đẩy");
      return;
    }

    const leadsWithoutFacebookPage = stagedLeads.filter((lead) => !lead.facebookPageId);
    if (leadsWithoutFacebookPage.length > 0) {
      toast.error("Vui lòng chọn trang Facebook cho tất cả lead trước khi đẩy");
      return;
    }

    // Filter out leads with errors
    const validLeads = stagedLeads.filter((l) => !l.error);
    if (validLeads.length === 0) {
      toast.error("Tất cả leads đều có lỗi, không thể đẩy");
      return;
    }

    if (validLeads.length < stagedLeads.length) {
      toast.warning(
        `Bỏ qua ${stagedLeads.length - validLeads.length} leads có lỗi`
      );
    }

    // First, create all leads with product/combo info
    const leadIds: string[] = [];

    for (const lead of validLeads) {
      try {
        const result = await createLeadMutation.mutateAsync({
          customerName: lead.customerName,
          phone: lead.phone,
          address: lead.address,
          sourceType: lead.source,
          productId: lead.productId,
          comboId: lead.comboId,
          facebookPageId: lead.facebookPageId,
          unitPriceMNT: lead.price,
          // Sprint 8.x: leadDate từ Landing page
          leadDate: lead.leadDate,
          // Sprint 8.x: ghi chú đơn hàng
          note: lead.note,
          // Sprint 8.x: thời gian đơn hàng
          orderDate: lead.orderDate,
        } as never);
        leadIds.push(result._id);
      } catch (err) {
        console.error("Failed to create lead:", err);
      }
    }

    if (leadIds.length === 0) {
      toast.error("Không thể tạo leads");
      return;
    }

    // Then push to sale
    try {
      const result = await pushToSaleMutation.mutateAsync({ leadIds });
      setStagedLeads([]);
      toast.success(`Đã đẩy ${result?.pushedCount ?? leadIds.length} lead sang Sale`);
      onLeadsCreated?.();
      refetchLeadsCount();
    } catch (err) {
      // Log chi tiết lỗi để debug
      console.error("Push to sale error:", err);
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || (err as Error).message;
      toast.error(`Lỗi khi đẩy sang Sale: ${errorMessage}`);
      // Giữ stagedLeads để user có thể thử lại
    }
  }, [stagedLeads, createLeadMutation, pushToSaleMutation, onLeadsCreated, refetchLeadsCount]);

  // ============================================================
  // RENDER
  // ============================================================

  const isLoading = categoriesLoading || combosLoading || allCombosLoading;

  return (
    <div className={styles.container}>
      {/* Check khách — form tra cứu độc lập, đặt ở trên cùng */}
      <CheckCustomerForm />

      {/* Stats Cards */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.leadCount}</div>
          <div className={styles.statLabel}>Đã đẩy</div>
        </div>
        <div className={styles.statCard}>
          <div
            className={styles.statValue}
            style={{ color: stats.errorCount > 0 ? "#ff4d4f" : "#722ed1" }}
          >
            {stats.stagingCount}
          </div>
          <div className={styles.statLabel}>Staging ⬆</div>
        </div>
        {stats.errorCount > 0 && (
          <div className={styles.statCard}>
            <div className={styles.statValue} style={{ color: "#ff4d4f" }}>
              {stats.errorCount}
            </div>
            <div className={styles.statLabel}>Lỗi ⚠</div>
          </div>
        )}
      </div>

      {/* Sprint 8.6: Facebook Page selection. Persists across batches
          until the user changes it or clears it. */}
      <Card
        title="① Chọn trang Facebook"
        size="small"
        className={styles.card}
      >
        <div className={styles.facebookPageRow}>
          <div className={styles.facebookPageActions}>
            <Select
              style={{ width: "100%" }}
              loading={pagesLoading}
              value={selectedFacebookPageId ?? undefined}
              onChange={(value: string | undefined) =>
                setSelectedFacebookPageId(value ?? null)
              }
              placeholder={
                pagesLoading
                  ? "Đang tải danh sách trang..."
                  : facebookPages.length === 0
                    ? "Chưa có Facebook Page nào (liên hệ Admin)"
                    : "Vui lòng chọn trang Facebook"
              }
              showSearch
              optionFilterProp="label"
              disabled={pagesLoading || facebookPages.length === 0}
              notFoundContent={
                pagesLoading ? null : "Không có trang nào đang hoạt động"
              }
            >
              {facebookPages.map((page) => (
                <Select.Option
                  key={page._id}
                  value={page._id}
                  label={`${page.name} (${page.code})`}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {page.avatarUrl ? (
                      <Image
                        src={page.avatarUrl}
                        width={36}
                        height={36}
                        style={{ borderRadius: 8, objectFit: "cover" }}
                        fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
                      />
                    ) : (
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: "#f0f0f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        color: "#999"
                      }}>
                        {page.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 500 }}>{page.name}</div>
                      <div style={{ fontSize: 11, color: "#999" }}>{page.code}</div>
                    </div>
                  </div>
                </Select.Option>
              ))}
            </Select>
            <Button
              icon={<PlusOutlined />}
              onClick={() => setFacebookPageDrawerOpen(true)}
              aria-label="Tạo Facebook Page"
              title="Tạo Facebook Page"
            >
              Tạo mới
            </Button>
          </div>
          {selectedFacebookPageId && (
            <div className={styles.facebookPageHint}>
              Tất cả lead paste phía dưới sẽ được gắn với trang đã chọn cho đến
              khi bạn đổi trang khác.
            </div>
          )}
        </div>
      </Card>

      <FacebookPageDrawer
        mode="create"
        open={facebookPageDrawerOpen}
        onClose={() => setFacebookPageDrawerOpen(false)}
        onSuccess={handleFacebookPageCreated}
      />

      {/* Product Selection - SPRINT 8.5.2: From Product Module */}
      <Card
        title={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>① Chọn sản phẩm</span>
            <Button
              type="default"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setQuickProductDrawerOpen(true)}
            >
              Thêm nhanh
            </Button>
          </div>
        }
        size="small"
        className={styles.card}
      >
        {categoriesError && (
          <div className={styles.empty} style={{ color: "#ff4d4f", marginBottom: 8 }}>
            Lỗi: {categoriesError}
          </div>
        )}

        {/* Bộ lọc & sắp xếp sản phẩm */}
        {categories.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 12,
              alignItems: "center",
            }}
          >
            <Input
              allowClear
              placeholder="Tìm theo tên, mã SP, danh mục..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              style={{ flex: 1, minWidth: 180 }}
              prefix={<SearchOutlined />}
            />
            <Select
              value={productCategoryFilter}
              onChange={setProductCategoryFilter}
              style={{ minWidth: 160 }}
              placeholder="Tìm kiếm danh mục..."
              showSearch
              allowClear
              filterOption={(input, option) =>
                (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              options={[
                { value: "all", label: `Tất cả danh mục (${categories.length})` },
                ...categories.map((c) => ({
                  value: c._id,
                  label: `${c.name} (${c.products.length})`,
                })),
              ]}
            />
            <Select
              value={productSort}
              onChange={setProductSort}
              style={{ minWidth: 160 }}
              options={[
                { value: "newest", label: "Mới tạo nhất" },
                { value: "oldest", label: "Cũ nhất" },
                { value: "name-asc", label: "Tên A → Z" },
                { value: "name-desc", label: "Tên Z → A" },
                { value: "code", label: "Mã sản phẩm" },
              ]}
            />
          </div>
        )}

        {productSearch || productCategoryFilter !== "all" ? (
          <div
            style={{
              fontSize: 12,
              color: "#666",
              marginBottom: 8,
            }}
          >
            Hiển thị {filteredProductsCount}/{totalProductsCount} sản phẩm
            {productSearch && (
              <Button
                type="link"
                size="small"
                onClick={() => setProductSearch("")}
              >
                Xóa tìm kiếm
              </Button>
            )}
          </div>
        ) : null}

        {isLoading ? (
          <div className={styles.loading}>Đang tải sản phẩm...</div>
        ) : categories.length === 0 && !categoriesError ? (
          <div className={styles.empty}>
            Chưa có sản phẩm nào - liên hệ Admin
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className={styles.empty}>
            Không tìm thấy sản phẩm phù hợp
          </div>
        ) : (
          <div className={styles.productGrid}>
            {filteredCategories.map((category) => {
              const maxVisibleProducts = 6;
              const isExpanded = expandedCategories.has(category._id);
              const visibleProducts = isExpanded
                ? category.products
                : category.products.slice(0, maxVisibleProducts);
              const hiddenCount = category.products.length - maxVisibleProducts;
              return (
                <div key={category._id} className={styles.productCategory}>
                  <div className={styles.categoryName}>
                    {category.name || "Khác"}
                    <span style={{ fontSize: 11, color: "#999", marginLeft: 6 }}>
                      ({category.products.length})
                    </span>
                  </div>
                  <div className={styles.productList}>
                    {visibleProducts.map((product) => (
                      <button
                        key={product._id}
                        className={`${styles.productBtn} ${
                          selectedProductId === product._id ? styles.selected : ""
                        }`}
                        onClick={() => handleSelectProduct(product._id)}
                        title={product.code}
                      >
                        {product.name}
                      </button>
                    ))}
                  </div>
                  {hiddenCount > 0 && (
                    <Button
                      type="link"
                      size="small"
                      onClick={() => {
                        setExpandedCategories((prev) => {
                          const next = new Set(prev);
                          if (next.has(category._id)) {
                            next.delete(category._id);
                          } else {
                            next.add(category._id);
                          }
                          return next;
                        });
                      }}
                      style={{ padding: 0, marginTop: 4, fontSize: 12 }}
                    >
                      {isExpanded
                        ? `Thu gọn (${hiddenCount} sản phẩm ẩn)`
                        : `Mở rộng (+${hiddenCount} sản phẩm)`}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Combo Selection - SPRINT 8.5.2: From Product Module */}
        {selectedProductId && (
          <div className={styles.comboSection}>
            <div className={styles.comboHeader}>
              <span className={styles.comboLabel}>Combos (từ MongoDB):</span>
              <Button
                type="link"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => setQuickComboDrawerOpen(true)}
                className={styles.addComboBtn}
              >
                Thêm combo
              </Button>
            </div>
            {combosLoading ? (
              <div className={styles.loading}>Đang tải combos...</div>
            ) : productCombos.length === 0 ? (
              <div className={styles.noCombo}>
                Chưa có combo - liên hệ Admin tạo combo cho sản phẩm này
              </div>
            ) : (
              <>
                <div className={styles.comboList}>
                  {(comboExpanded
                    ? productCombos
                    : productCombos.slice(0, 4)
                  ).map((combo) => (
                    <button
                      key={combo._id}
                      className={`${styles.comboBtn} ${
                        selectedComboId === combo._id ? styles.selected : ""
                      }`}
                      onClick={() => handleSelectCombo(combo._id)}
                    >
                      <span style={{ flex: 1, textAlign: "left" }}>
                        <span>{combo.name}</span>
                        <span
                          style={{
                            marginLeft: 6,
                            fontSize: 11,
                            color:
                              selectedComboId === combo._id
                                ? "rgba(255,255,255,0.85)"
                                : "#888",
                            fontWeight: 500,
                          }}
                        >
                          ({combo.packageQuantity} SP
                          {combo.giftQuantity ? ` + ${combo.giftQuantity} quà` : ""})
                        </span>
                      </span>
                      <span className={styles.comboPrice}>
                        {combo.sellingPrice.toLocaleString()}₮
                      </span>
                    </button>
                  ))}
                </div>
                {productCombos.length > 4 && (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => setComboExpanded((v) => !v)}
                    style={{ padding: 0, marginTop: 4 }}
                  >
                    {comboExpanded
                      ? `Thu gọn (${productCombos.length - 4} combo ẩn)`
                      : `Mở rộng (còn ${productCombos.length - 4} combo)`}
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </Card>

      <QuickProductDrawer
        open={quickProductDrawerOpen}
        onClose={() => setQuickProductDrawerOpen(false)}
        onSuccess={handleQuickProductCreated}
      />

      <QuickComboDrawer
        open={quickComboDrawerOpen}
        onClose={() => setQuickComboDrawerOpen(false)}
        onSuccess={handleQuickComboCreated}
        productId={selectedProductId}
        productCode={selectedProductCode}
        productName={selectedProductName}
      />

      {/* Lead Input */}
      <Card
        title="② Dán số"
        size="small"
        className={styles.card}
        extra={
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setManualOrderOpen(true)}
          >
            Nhập đơn hàng thủ công
          </Button>
        }
      >
        <div className={styles.inputTypeTabs}>
          <button
            className={`${styles.inputTab} ${
              inputType === "comment" ? styles.active : ""
            }`}
            onClick={() => handleInputTypeChange("comment")}
          >
            📝 Comment
            <div className={styles.inputHint}>
              {columnMapping.getLayout("comment").map(k => COLUMN_FIELD_LABELS[k]).join(" · ")}
            </div>
          </button>
          <button
            className={`${styles.inputTab} ${
              inputType === "ladi" ? styles.active : ""
            }`}
            onClick={() => handleInputTypeChange("ladi")}
          >
            🌐 Landing
            <div className={styles.inputHint}>
              {columnMapping.getLayout("ladi").map(k => COLUMN_FIELD_LABELS[k]).join(" · ")}
            </div>
          </button>
        </div>

        {!selectedFacebookPageId ? (
          <Tooltip title="Vui lòng chọn trang Facebook" mouseEnterDelay={0}>
            <PasteTable
              inputType={inputType}
              layout={columnMapping.getLayout(inputType)}
              value={inputText}
              onChange={setInputText}
            />
          </Tooltip>
        ) : (
          <PasteTable
            inputType={inputType}
            layout={columnMapping.getLayout(inputType)}
            value={inputText}
            onChange={setInputText}
          />
        )}

        <div className={styles.inputActions}>
          <Tooltip title={!selectedFacebookPageId ? "Vui lòng chọn trang Facebook" : !inputText.trim() ? "Nhập dữ liệu trước" : ""} mouseEnterDelay={0}>
            <Popover
              content={<div style={{ width: 520, maxWidth: "90vw" }}><FieldOrderPreview inputType={inputType} /></div>}
              title={null}
              trigger="hover"
              placement="topLeft"
              mouseEnterDelay={0}
            >
              <Button
                type="primary"
                icon={<InfoCircleOutlined />}
                onClick={handleParseLeads}
                disabled={!selectedFacebookPageId || !inputText.trim()}
              >
                Phân loại
              </Button>
            </Popover>
          </Tooltip>
          <Tooltip title={!selectedFacebookPageId ? "Vui lòng chọn trang Facebook" : ""} mouseEnterDelay={0}>
            <Button
              icon={<SnippetsOutlined />}
              onClick={handlePasteFromClipboard}
              disabled={!selectedFacebookPageId}
            >
              Dán
            </Button>
          </Tooltip>
          <Button
            icon={<SettingOutlined />}
            onClick={() => {
              // Mở modal với layout hiện tại của CẢ 2 mode (sync cả Landing
              // dù user đang ở tab Comment, để có thể switch và sửa luôn).
              setColumnMappingDraft({
                comment: columnMapping.getLayout("comment"),
                ladi: columnMapping.getLayout("ladi"),
              });
              setColumnMappingActiveMode(inputType);
              setColumnMappingOpen(true);
            }}
            title="Cấu hình thứ tự cột khi dán"
          >
            Cấu hình cột
          </Button>
          <Button onClick={() => setInputText("")} disabled={!inputText}>
            Xóa
          </Button>
        </div>
      </Card>

      {/* Manual Order Modal */}
      <Modal
        title="Nhập đơn hàng thủ công"
        open={manualOrderOpen}
        onCancel={() => {
          setManualOrderOpen(false);
        }}
        footer={
          <Space>
            <Button onClick={() => {
              setManualOrderOpen(false);
            }}>
              Hủy
            </Button>
            <Button type="primary" onClick={handleManualOrderAdd}>
              Thêm vào staging
            </Button>
          </Space>
        }
        width={520}
      >
        <Form
          form={manualOrderForm}
          layout="vertical"
        >
          <Form.Item
            name="facebookPageId"
            label="Trang Facebook"
            rules={[{ required: true, message: "Vui lòng chọn trang Facebook" }]}
          >
            <Select
              placeholder="Chọn trang Facebook"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              options={facebookPages.map(p => ({
                value: p._id,
                label: p.name,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="customerName"
            label="Tên khách hàng"
            rules={[{ required: true, message: "Vui lòng nhập tên" }]}
          >
            <Input placeholder="Nhập tên khách hàng" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Số điện thoại"
            rules={[
              { required: true, message: "Vui lòng nhập SĐT" },
              { pattern: /^[0-9]{6,15}$/, message: "SĐT không hợp lệ" }
            ]}
          >
            <Input placeholder="Nhập số điện thoại" />
          </Form.Item>

          <Form.Item name="address" label="Địa chỉ">
            <Input placeholder="Nhập địa chỉ (tùy chọn)" />
          </Form.Item>

          <Form.Item
            name="orderDate"
            label="Thời gian đặt hàng"
            tooltip="Ngày giờ khách đặt hàng. Nếu để trống sẽ lấy thời gian hiện tại."
          >
            <DatePicker
              showTime
              needConfirm
              classNames={{ popup: { root: "picker-with-time" } }}
              format="DD/MM/YYYY HH:mm"
              style={{ width: "100%" }}
              placeholder="Chọn ngày giờ"
            />
          </Form.Item>

          <Form.Item
            name="productId"
            label="Sản phẩm"
            rules={[{ required: true, message: "Vui lòng chọn sản phẩm" }]}
          >
            <Select
              placeholder="Chọn sản phẩm"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              options={productSelectOptions}
            />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.productId !== currentValues.productId}
          >
            {({ getFieldValue }) => {
              const productId = getFieldValue("productId");
              const combosForProduct = Object.values(comboByNameMap).filter(
                c => c.productId === productId
              );

              return (
                <Form.Item
                  name="comboId"
                  label="Combo"
                  rules={[{ required: true, message: "Vui lòng chọn combo" }]}
                >
                  <Select
                    placeholder={productId ? "Chọn combo" : "Chọn sản phẩm trước"}
                    disabled={!productId}
                    options={[
                      ...combosForProduct.map(c => ({
                        value: c._id,
                        label: `${c.name} - ${c.sellingPrice?.toLocaleString()}₫ (${c.packageQuantity} cái)`,
                      })),
                      ...(productId ? [{
                        value: "__create_new__",
                        label: "+ Tạo combo mới cho sản phẩm này",
                      }] : []),
                    ]}
                    onChange={(value) => {
                      if (value === "__create_new__") {
                        manualOrderForm.setFieldValue("comboId", undefined);
                        // Open quick product drawer với product đã chọn
                        setQuickProductDrawerOpen(true);
                      }
                    }}
                  />
                </Form.Item>
              );
            }}
          </Form.Item>

          <Form.Item
            name="note"
            label="Ghi chú"
          >
            <Input.TextArea
              placeholder="Nhập ghi chú (tùy chọn)"
              autoSize={{ minRows: 2, maxRows: 10 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Sprint 8.x: Modal sửa đơn hàng trong staging */}
      <Modal
        title={`Sửa đơn hàng — STT: ${editingLead ? stagedLeads.indexOf(editingLead) + 1 : ""}`}
        open={editLeadModalOpen}
        onOk={handleSaveEditLead}
        onCancel={() => {
          setEditLeadModalOpen(false);
          setEditingLead(null);
          editLeadForm.resetFields();
        }}
        okText="Lưu"
        cancelText="Hủy"
        width={480}
      >
        <Form
          form={editLeadForm}
          layout="vertical"
        >
          <Form.Item
            name="customerName"
            label="Tên khách hàng"
            rules={[{ required: true, message: "Vui lòng nhập tên" }]}
          >
            <Input placeholder="Nhập tên khách hàng" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Số điện thoại"
            rules={[{ required: true, message: "Vui lòng nhập SĐT" }]}
          >
            <Input placeholder="Nhập số điện thoại" />
          </Form.Item>

          <Form.Item name="address" label="Địa chỉ">
            <Input placeholder="Nhập địa chỉ (tùy chọn)" />
          </Form.Item>

          <Form.Item
            name="orderDate"
            label="Thời gian đặt hàng"
            tooltip="Ngày giờ khách đặt hàng."
          >
            <DatePicker
              showTime
              needConfirm
              classNames={{ popup: { root: "picker-with-time" } }}
              format="DD/MM/YYYY HH:mm"
              style={{ width: "100%" }}
              placeholder="Chọn ngày giờ"
            />
          </Form.Item>

          <Form.Item
            name="productId"
            label="Sản phẩm"
            rules={[{ required: true, message: "Vui lòng chọn sản phẩm" }]}
          >
            <Select
              placeholder="Chọn sản phẩm"
              showSearch
              optionFilterProp="label"
              options={productSelectOptions}
              onChange={() => {
                editLeadForm.setFieldValue("comboId", undefined);
              }}
            />
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.productId !== curr.productId}>
            {({ getFieldValue }) => {
              const productId = getFieldValue("productId");
              const combosForProduct = productId
                ? Object.values(comboByNameMap).filter((c) => c.productId === productId)
                : [];

              return (
                <Form.Item name="comboId" label="Combo">
                  <Select
                    placeholder={productId ? "Chọn combo" : "Chọn sản phẩm trước"}
                    allowClear
                    options={combosForProduct.map((c) => ({
                      value: c._id,
                      label: `${c.name} — ${(c.sellingPrice ?? 0).toLocaleString()}₮`,
                    }))}
                  />
                </Form.Item>
              );
            }}
          </Form.Item>

          <Form.Item
            name="note"
            label="Ghi chú"
          >
            <Input.TextArea
              placeholder="Nhập ghi chú (tùy chọn)"
              autoSize={{ minRows: 2, maxRows: 10 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Quick Product Drawer */}
      <QuickProductDrawer
        open={quickProductDrawerOpen}
        onClose={() => setQuickProductDrawerOpen(false)}
        onSuccess={(productId, productName, comboIds) => {
          // Set product and auto-select first combo
          manualOrderForm.setFieldsValue({
            productId,
            comboId: comboIds[0] ?? undefined,
          });
          setSelectedProductId(productId);
          setSelectedComboId(comboIds[0] ?? null);
        }}
      />

      {/* Sprint 8.x: Modal cấu hình thứ tự cột khi dán */}
      <ColumnMappingModal
        open={columnMappingOpen}
        activeMode={columnMappingActiveMode}
        onActiveModeChange={setColumnMappingActiveMode}
        mappings={columnMappingDraft}
        onChange={(mode, next) => {
          // Cập nhật draft đúng field theo mode đang chỉnh
          setColumnMappingDraft((prev) => ({ ...prev, [mode]: next }));
        }}
        onClose={() => {
          // Apply draft của CẢ 2 mode vào mapping khi đóng
          columnMapping.setModeLayout("comment", columnMappingDraft.comment);
          columnMapping.setModeLayout("ladi", columnMappingDraft.ladi);
          setColumnMappingOpen(false);
        }}
      />

      {/* Staging Area */}
      {stagedLeads.length > 0 && (
        <Card
          title={
            <div className={styles.stagingHeader}>
              <span className={styles.stagingCount}>{stagedLeads.length}</span>
              <span>Đang staging</span>
              <div className={styles.stagingStats}>
                <span>📝{stats.commentCount}</span>
                <span>🌐{stats.ladiCount}</span>
                {stats.errorCount > 0 && (
                  <span style={{ color: "#ff4d4f" }}>⚠{stats.errorCount}</span>
                )}
              </div>
            </div>
          }
          size="small"
          className={styles.stagingCard}
          extra={
            <div className={styles.stagingActions}>
              <Button
                size="small"
                icon={<TeamOutlined />}
                onClick={() => setBatchCheckOpen(true)}
                disabled={stagingPhones.length === 0}
                title="Tra cứu tất cả SĐT trong staging để biết khách cũ / khách mới"
              >
                Check khách loạt ({stagingPhones.length})
              </Button>
              <Button
                size="small"
                icon={<ClearOutlined />}
                onClick={handleClearAll}
              >
                Xóa
              </Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={
                  createLeadMutation.isPending || pushToSaleMutation.isPending
                }
                onClick={handlePushToSale}
              >
                Đẩy sang Sale ({stagedLeads.filter((l) => !l.error).length})
              </Button>
            </div>
          }
        >
          <div className={styles.stagingTable}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Thao tác</th>
                  <th>Ảnh page</th>
                  <th>#</th>
                  <th>Nguồn</th>
                  <th>Sản phẩm</th>
                  <th>Tên</th>
                  <th>SĐT</th>
                  <th>Địa chỉ</th>
                  <th>Combo</th>
                  <th>Giá</th>
                  <th>TG Đặt</th>
                </tr>
              </thead>
              <tbody>
                {stagedLeads.map((lead, index) => (
                  <tr
                    key={lead.id}
                    className={lead.error ? styles.errorRow : ""}
                  >
                    <td style={{ width: 60 }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <Button
                          type="text"
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveStagedLead(lead.id)}
                          danger
                        />
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => handleOpenEditLead(lead)}
                          title="Sửa"
                        />
                      </div>
                    </td>
                    <td>
                      {lead.facebookPageAvatarUrl ? (
                        <Image
                          src={lead.facebookPageAvatarUrl}
                          width={28}
                          height={28}
                          style={{ borderRadius: 4, objectFit: "cover" }}
                          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
                        />
                      ) : (
                        <div style={{
                          width: 28,
                          height: 28,
                          borderRadius: 4,
                          background: "#f0f0f0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          color: "#999"
                        }}>
                          {lead.facebookPageName?.charAt(0).toUpperCase() || "?"}
                        </div>
                      )}
                    </td>
                    <td>{index + 1}</td>
                    <td>
                      <span
                        className={`${styles.sourceTag} ${
                          lead.source === LeadSource.FACEBOOK_COMMENT
                            ? styles.comment
                            : styles.lading
                        }`}
                      >
                        {lead.source === LeadSource.FACEBOOK_COMMENT
                          ? "Comment"
                          : "Landing"}
                      </span>
                    </td>
                    <td>{lead.productName || "-"}</td>
                    <td>
                      {lead.customerName}
                      {lead.error && (
                        <span className={styles.errorBadge}>
                          ⚠ {lead.error}
                        </span>
                      )}
                    </td>
                    <td>{lead.phone}</td>
                    <td className={styles.addressCell}>
                      {lead.address || <span className={styles.addressEmpty}>—</span>}
                    </td>
                    <td>{lead.comboName || "-"}</td>
                    <td className={styles.price}>
                      {lead.price > 0 ? `${lead.price.toLocaleString()}₮` : "-"}
                    </td>
                    <td>
                      {lead.orderDate
                        ? formatDateTime(lead.orderDate)
                        : <span className={styles.addressEmpty}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Check khách loạt — modal tra cứu nhiều SĐT cùng lúc */}
      <BatchCheckCustomersModal
        open={batchCheckOpen}
        phones={stagingPhones}
        onClose={() => setBatchCheckOpen(false)}
      />
    </div>
  );
}
