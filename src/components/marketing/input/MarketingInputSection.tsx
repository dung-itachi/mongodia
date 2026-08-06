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
import { Card, Button, Input, message } from "antd";
import {
  SendOutlined,
  ClearOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import {
  useProductsByCategory,
  useCombosWithProduct,
  useAllCombosNormalized,
  type ComboWithProduct,
} from "@/hooks/useProducts";
import { useCreateLead, useMarketingLeads } from "@/hooks/useMarketingLeads";
import { usePushLeadsToSale } from "@/hooks/usePushLeadsToSale";
import { LeadSource } from "@/constants/leadSource";
import styles from "./MarketingInputSection.module.css";

const { TextArea } = Input;

export interface StagedLead {
  id: string;
  customerName: string;
  phone: string;
  source: LeadSource;
  productId: string;
  productName: string;
  comboId: string;
  comboName: string;
  price: number;
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
  const [inputText, setInputText] = useState("");
  const [inputType, setInputType] = useState<"comment" | "ladi">("comment");
  const [stagedLeads, setStagedLeads] = useState<StagedLead[]>([]);

  // ============================================================
  // QUERIES - Fetch from Product Module
  // ============================================================

  // Fetch categories with products (isActive = true)
  const { categories, loading: categoriesLoading, error: categoriesError } = useProductsByCategory();

  // Fetch combos for selected product (isActive = true)
  const { combos: productCombos, loading: combosLoading } =
    useCombosWithProduct(selectedProductId);

  // Fetch ALL combos for landing parser lookup
  const { comboByNameMap, loading: allCombosLoading } = useAllCombosNormalized();

  // Fetch existing leads for stats
  const { leads: existingLeads, refetch: refetchLeads } = useMarketingLeads({
    page: 1,
    limit: 1000,
  });

  // Mutations
  const createLeadMutation = useCreateLead();
  const pushToSaleMutation = usePushLeadsToSale();

  // ============================================================
  // COMPUTED VALUES
  // ============================================================

  // Get selected combo info from product combos
  const selectedCombo = useMemo(() => {
    return productCombos.find((c) => c._id === selectedComboId);
  }, [productCombos, selectedComboId]);

  // Stats for cards
  const stats = useMemo(() => {
    const pushedCount = existingLeads.length;
    const stagingCount = stagedLeads.length;
    const commentCount = stagedLeads.filter(
      (l) => l.source === LeadSource.FACEBOOK_COMMENT
    ).length;
    const ladiCount = stagedLeads.filter(
      (l) => l.source === LeadSource.LANDING_PAGE
    ).length;
    const errorCount = stagedLeads.filter((l) => l.error).length;
    return { pushedCount, stagingCount, commentCount, ladiCount, errorCount };
  }, [existingLeads, stagedLeads]);

  // ============================================================
  // HANDLERS
  // ============================================================

  // Handle product selection
  const handleSelectProduct = useCallback((productId: string) => {
    setSelectedProductId(productId);
    setSelectedComboId(null);
  }, []);

  // Handle combo selection
  const handleSelectCombo = useCallback((comboId: string) => {
    setSelectedComboId(comboId);
  }, []);

  // Handle input type change
  const handleInputTypeChange = useCallback((type: "comment" | "ladi") => {
    setInputType(type);
  }, []);

  // Parse leads from input text - SPRINT 8.5.2 ENHANCED
  const handleParseLeads = useCallback(() => {
    if (!selectedProductId) {
      void message.warning("Vui lòng chọn sản phẩm trước");
      return;
    }

    const lines = inputText.trim().split("\n").filter((l) => l.trim());
    if (lines.length === 0) {
      void message.warning("Vui lòng nhập thông tin lead");
      return;
    }

    const newLeads: StagedLead[] = [];
    let leadIdCounter = Date.now();
    let errorCount = 0;
    let autoDetectCount = 0;

    // Create combo lookup by price (primary) and by partial name match
    const combosByPrice: Record<number, ComboWithProduct> = {};
    const combosByPartialName: Record<string, ComboWithProduct> = {};
    
    Object.values(comboByNameMap).forEach((combo) => {
      if (combo.sellingPrice) {
        combosByPrice[combo.sellingPrice] = combo;
      }
      // Store partial name matches (lowercase)
      const comboNameLower = combo.name.toLowerCase();
      combosByPartialName[comboNameLower] = combo;
      // Also store key parts of name
      const parts = comboNameLower.split(/\s+/);
      parts.forEach(part => {
        if (part.length > 3) {
          combosByPartialName[part] = combo;
        }
      });
    });

    lines.forEach((line) => {
      const parts = line.split("\t").map((p) => p.trim());

      if (inputType === "comment") {
        // Format: Name Tab Phone (or just Phone)
        const phone = parts[0] || "";
        const name = parts[1] || "";

        if (phone) {
          // Use selected combo or first available combo for this product
          const comboToUse = selectedCombo || Object.values(comboByNameMap)[0];
          newLeads.push({
            id: `staged-${leadIdCounter++}`,
            customerName: name || "Khách hàng",
            phone,
            source: LeadSource.FACEBOOK_COMMENT,
            productId: selectedProductId,
            productName: comboToUse?.productName || "",
            comboId: comboToUse?._id || "",
            comboName: comboToUse?.name || "",
            price: comboToUse?.sellingPrice || 0,
          });
        }
      } else {
        // Format: Date Tab Name Tab Phone Tab Address Tab ComboInfo
        // ComboInfo could be: "✅99,000₮-өөр 4 нь 10 нь үнэгүй" or just "99,000"
        const dateStr = parts[0] || "";
        const name = parts[1] || "Khách hàng";
        const phone = parts[2] || "";
        const address = parts[3] || "";
        const comboInfo = parts[4] || "";

        if (!phone) return;

        // Auto-detect combo from comboInfo text
        let combo: ComboWithProduct | undefined;
        let comboError: string | undefined;

        // Strategy 1: Look for price pattern in comboInfo (e.g., "99,000₮" or "99,000")
        const priceMatch = comboInfo.match(/(\d[\d,]*)\s*[₮₹$]?/);
        if (priceMatch) {
          const price = parseInt(priceMatch[1].replace(/,/g, ""), 10);
          if (price && combosByPrice[price]) {
            combo = combosByPrice[price];
          }
        }

        // Strategy 2: Look for exact or partial name match in comboInfo
        if (!combo && comboInfo) {
          const comboInfoLower = comboInfo.toLowerCase();
          // Check if any combo name is contained in the combo info
          for (const [key, c] of Object.entries(combosByPartialName)) {
            if (comboInfoLower.includes(key) || key.includes(comboInfoLower.substring(0, 10))) {
              combo = c;
              break;
            }
          }
        }

        // Strategy 3: Use selected combo if provided
        if (!combo && selectedCombo) {
          combo = selectedCombo;
        }

        // Strategy 4: Use first available combo for this product
        if (!combo) {
          const availableCombos = Object.values(comboByNameMap).filter(
            (c) => !c.productId || c.productId === selectedProductId
          );
          combo = availableCombos[0];
        }

        if (!combo) {
          comboError = "Không tìm thấy combo";
          errorCount++;
        }

        if (combo) {
          if (!comboError) autoDetectCount++;
          newLeads.push({
            id: `staged-${leadIdCounter++}`,
            customerName: name,
            phone,
            source: LeadSource.LANDING_PAGE,
            productId: combo.productId || selectedProductId,
            productName: combo.productName || "",
            comboId: combo._id,
            comboName: combo.name,
            price: combo.sellingPrice,
            error: comboError,
          });
        } else {
          newLeads.push({
            id: `staged-${leadIdCounter++}`,
            customerName: name,
            phone,
            source: LeadSource.LANDING_PAGE,
            productId: "",
            productName: "",
            comboId: "",
            comboName: "",
            price: 0,
            error: comboError || "Không tìm thấy combo",
          });
        }
      }
    });

    setStagedLeads((prev) => [...prev, ...newLeads]);
    setInputText("");

    if (errorCount > 0) {
      void message.warning(
        `Đã thêm ${newLeads.length} lead, có ${errorCount} lỗi không tìm thấy combo`
      );
    } else if (autoDetectCount > 0) {
      void message.success(`Đã thêm ${newLeads.length} lead (tự động detect ${autoDetectCount} combo)`);
    } else {
      void message.success(`Đã thêm ${newLeads.length} lead vào staging`);
    }
  }, [inputText, inputType, selectedCombo, selectedProductId, comboByNameMap]);

  // Handle remove staged lead
  const handleRemoveStagedLead = useCallback((id: string) => {
    setStagedLeads((prev) => prev.filter((l) => l.id !== id));
  }, []);

  // Handle clear all staged leads
  const handleClearAll = useCallback(() => {
    setStagedLeads([]);
    void message.success("Đã xóa tất cả leads trong staging");
  }, []);

  // Handle push to Sale - SPRINT 8.5.2 ENHANCED
  const handlePushToSale = useCallback(async () => {
    if (stagedLeads.length === 0) {
      void message.warning("Không có lead nào để đẩy");
      return;
    }

    // Filter out leads with errors
    const validLeads = stagedLeads.filter((l) => !l.error);
    if (validLeads.length === 0) {
      void message.error("Tất cả leads đều có lỗi, không thể đẩy");
      return;
    }

    if (validLeads.length < stagedLeads.length) {
      void message.warning(
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
          sourceType: lead.source,
          // Sprint 8.5.2: Include product/combo info for Order
          productId: lead.productId,
          comboId: lead.comboId,
        } as never);
        leadIds.push(result._id);
      } catch (err) {
        console.error("Failed to create lead:", err);
      }
    }

    if (leadIds.length === 0) {
      void message.error("Không thể tạo leads");
      return;
    }

    // Then push to sale
    try {
      await pushToSaleMutation.mutateAsync({ leadIds });
      setStagedLeads([]);
      void message.success(`Đã đẩy ${leadIds.length} lead sang Sale`);
      onLeadsCreated?.();
    } catch (err) {
      void message.error(`Lỗi: ${(err as Error).message}`);
    }
  }, [stagedLeads, createLeadMutation, pushToSaleMutation, onLeadsCreated]);

  // ============================================================
  // RENDER
  // ============================================================

  const isLoading = categoriesLoading || combosLoading || allCombosLoading;

  return (
    <div className={styles.container}>
      {/* Stats Cards */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.pushedCount}</div>
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

      {/* Product Selection - SPRINT 8.5.2: From Product Module */}
      <Card title="① Chọn sản phẩm" size="small" className={styles.card}>
        {categoriesError && (
          <div className={styles.empty} style={{ color: "#ff4d4f", marginBottom: 8 }}>
            Lỗi: {categoriesError}
          </div>
        )}
        {isLoading ? (
          <div className={styles.loading}>Đang tải sản phẩm...</div>
        ) : categories.length === 0 && !categoriesError ? (
          <div className={styles.empty}>
            Chưa có sản phẩm nào - liên hệ Admin
          </div>
        ) : (
          <div className={styles.productGrid}>
            {categories.map((category) => (
              <div key={category._id} className={styles.productCategory}>
                <div className={styles.categoryName}>
                  {category.name || "Khác"}
                </div>
                <div className={styles.productList}>
                  {category.products.map((product) => (
                    <button
                      key={product._id}
                      className={`${styles.productBtn} ${
                        selectedProductId === product._id ? styles.selected : ""
                      }`}
                      onClick={() => handleSelectProduct(product._id)}
                    >
                      {product.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Combo Selection - SPRINT 8.5.2: From Product Module */}
        {selectedProductId && (
          <div className={styles.comboSection}>
            <div className={styles.comboLabel}>Combos (từ MongoDB):</div>
            {combosLoading ? (
              <div className={styles.loading}>Đang tải combos...</div>
            ) : productCombos.length === 0 ? (
              <div className={styles.noCombo}>
                Chưa có combo - liên hệ Admin tạo combo cho sản phẩm này
              </div>
            ) : (
              <div className={styles.comboList}>
                {productCombos.map((combo) => (
                  <button
                    key={combo._id}
                    className={`${styles.comboBtn} ${
                      selectedComboId === combo._id ? styles.selected : ""
                    }`}
                    onClick={() => handleSelectCombo(combo._id)}
                  >
                    <span>{combo.name}</span>
                    <span className={styles.comboPrice}>
                      {combo.sellingPrice.toLocaleString()}₮
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Lead Input */}
      <Card title="② Dán số" size="small" className={styles.card}>
        <div className={styles.inputTypeTabs}>
          <button
            className={`${styles.inputTab} ${
              inputType === "comment" ? styles.active : ""
            }`}
            onClick={() => handleInputTypeChange("comment")}
          >
            📝 Comment
            <div className={styles.inputHint}>Tên + SĐT</div>
          </button>
          <button
            className={`${styles.inputTab} ${
              inputType === "ladi" ? styles.active : ""
            }`}
            onClick={() => handleInputTypeChange("ladi")}
          >
            🌐 Landing
            <div className={styles.inputHint}>Ngày · Tên · SĐT · Đ/c · Combo</div>
          </button>
        </div>

        <TextArea
          placeholder={
            inputType === "comment"
              ? "Nhập thông tin: Tên\tSĐT\nHoặc chỉ SĐT\n(Combo sẽ tự động detect từ text hoặc dùng combo đã chọn)"
              : "Nhập thông tin theo format:\nNgày\tTên\tSĐT\tĐịa chỉ\tCombo\nCombo sẽ được tự động detect từ text"
          }
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          rows={4}
          className={styles.textArea}
          disabled={!selectedProductId}
        />

        <div className={styles.inputActions}>
          <Button
            type="primary"
            onClick={handleParseLeads}
            disabled={!selectedProductId || !inputText.trim()}
          >
            Phân loại
          </Button>
          <Button onClick={() => setInputText("")} disabled={!inputText}>
            Xóa
          </Button>
        </div>
      </Card>

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
                  <th></th>
                  <th>#</th>
                  <th>Nguồn</th>
                  <th>Sản phẩm</th>
                  <th>Tên</th>
                  <th>SĐT</th>
                  <th>Combo</th>
                  <th>Giá</th>
                </tr>
              </thead>
              <tbody>
                {stagedLeads.map((lead, index) => (
                  <tr
                    key={lead.id}
                    className={lead.error ? styles.errorRow : ""}
                  >
                    <td>
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemoveStagedLead(lead.id)}
                        danger
                      />
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
                    <td>{lead.comboName || "-"}</td>
                    <td className={styles.price}>
                      {lead.price > 0 ? `${lead.price.toLocaleString()}₮` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
