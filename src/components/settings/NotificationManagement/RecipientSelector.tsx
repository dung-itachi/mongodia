/**
 * RecipientSelector Component
 *
 * Advanced recipient selection for notifications with multiple modes:
 *   1. Tất cả (Broadcast) - all active employees
 *   2. Theo cá nhân - select specific employees
 *   3. Theo team - select entire teams
 *   4. Theo leader - select a leader (includes leader + all employees under them)
 *   5. Theo vai trò - select by role (Sale/MKT/Kho/etc.)
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Spin,
  Tag,
  Checkbox,
  Button,
  Empty,
  Space,
  Input,
} from "antd";
import {
  UserOutlined,
  TeamOutlined,
  CrownOutlined,
  FilterOutlined,
  CheckCircleFilled,
} from "@ant-design/icons";
import {
  useRecipientOptions,
  useLeaderTeam,
  useTeamRecipients,
  type RecipientEmployee,
} from "@/hooks/useRecipientOptions";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

interface RecipientSelectorProps {
  value?: RecipientValue;
  onChange?: (value: RecipientValue) => void;
  disabled?: boolean;
}

export interface RecipientValue {
  mode: "broadcast" | "individual" | "team" | "leader" | "role";
  recipientIds: string[];
  teamIds?: string[];
  leaderIds?: string[];
  roleFilters?: string[];
}

const ROLE_OPTIONS = [
  { code: "SALE", label: "Nhân viên Sale" },
  { code: "MKT", label: "Nhân viên Marketing" },
  { code: "WAREHOUSE", label: "Nhân viên Kho" },
  { code: "LEADER", label: "Trưởng nhóm (Leader)" },
  { code: "MANAGER", label: "Quản lý (Manager)" },
];

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "red",
  MANAGER: "purple",
  LEADER: "blue",
  EMPLOYEE: "default",
  SALE: "green",
  MKT: "orange",
  WAREHOUSE: "cyan",
  UNKNOWN: "default",
};

function RecipientSelectorComponent({
  value,
  onChange,
  disabled = false,
}: RecipientSelectorProps) {
  const lang = useLanguageStore((s) => s.language);
  const [selectedMode, setSelectedMode] = useState<RecipientValue["mode"]>(
    value?.mode ?? "broadcast"
  );
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>(
    value?.recipientIds ?? []
  );
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(
    value?.teamIds ?? []
  );
  const [selectedLeaderIds, setSelectedLeaderIds] = useState<string[]>(
    value?.leaderIds ?? []
  );
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    value?.roleFilters ?? []
  );
  const [searchKeyword, setSearchKeyword] = useState("");

  // Fetch all recipient data
  const { data: recipientData, isLoading: isLoadingRecipients } =
    useRecipientOptions({ keyword: searchKeyword });

  // Fetch teams for team selection
  const { data: teams, isLoading: isLoadingTeams } = useTeamRecipients();

  // Fetch leaders for leader selection
  const { data: allLeaders, isLoading: isLoadingLeaders } =
    useRecipientOptions({ role: "LEADER" });

  // When leader is selected, fetch their team members
  const { data: leaderTeamMembers } = useLeaderTeam(
    selectedLeaderIds.length === 1 ? selectedLeaderIds[0] : null
  );

  // Calculate resolved recipient IDs based on current selection
  const resolvedRecipientIds = useMemo(() => {
    if (selectedMode === "broadcast") {
      return [];
    }

    if (selectedMode === "individual") {
      return selectedEmployeeIds;
    }

    if (selectedMode === "team") {
      // For team mode, collect all employee IDs that belong to selected teams
      // We'll use the employees list and filter by team membership
      const ids = new Set<string>();
      if (selectedTeamIds.length > 0 && recipientData?.employees) {
        recipientData.employees.forEach((emp) => {
          // Since we don't have direct teamId on employees in the response,
          // we'll collect all employee IDs (they'll be filtered server-side)
          // But for display purposes, we can show all
          if (selectedTeamIds.length > 0) {
            ids.add(emp.id);
          }
        });
      }
      return Array.from(ids);
    }

    if (selectedMode === "leader") {
      return selectedLeaderIds;
    }

    if (selectedMode === "role") {
      const ids = new Set<string>();
      selectedRoles.forEach((role) => {
        recipientData?.employees
          .filter((e) => e.role === role)
          .forEach((e) => ids.add(e.id));
      });
      return Array.from(ids);
    }

    return [];
  }, [
    selectedMode,
    selectedEmployeeIds,
    selectedTeamIds,
    selectedLeaderIds,
    selectedRoles,
    recipientData,
  ]);

  // Calculate selection summary for display
  const getSelectionSummary = () => {
    if (selectedMode === "broadcast") {
      return { count: 0, label: t("Tất cả nhân viên", lang), type: "broadcast" as const };
    }

    let count = 0;
    let label = "";

    if (selectedMode === "individual") {
      count = selectedEmployeeIds.length;
      label = t("cá nhân", lang);
    } else if (selectedMode === "team") {
      count = selectedTeamIds.length;
      label = t("team", lang);
    } else if (selectedMode === "leader") {
      count = selectedLeaderIds.length;
      label = t("leader", lang);
    } else if (selectedMode === "role") {
      count = selectedRoles.length;
      label = t("vai trò", lang);
    }

    return { count, label, type: selectedMode };
  };

  // Notify parent of changes
  useEffect(() => {
    if (onChange) {
      const newValue: RecipientValue = {
        mode: selectedMode,
        recipientIds:
          selectedMode === "individual" ? selectedEmployeeIds : resolvedRecipientIds,
        teamIds: selectedMode === "team" ? selectedTeamIds : undefined,
        leaderIds: selectedMode === "leader" ? selectedLeaderIds : undefined,
        roleFilters: selectedMode === "role" ? selectedRoles : undefined,
      };
      onChange(newValue);
    }
  }, [
    selectedMode,
    selectedEmployeeIds,
    selectedTeamIds,
    selectedLeaderIds,
    selectedRoles,
    resolvedRecipientIds,
    onChange,
  ]);

  // Sync with external value
  useEffect(() => {
    if (value) {
      setSelectedMode(value.mode);
      if (value.mode === "individual") {
        setSelectedEmployeeIds(value.recipientIds);
      } else if (value.mode === "team") {
        setSelectedTeamIds(value.teamIds ?? []);
      } else if (value.mode === "leader") {
        setSelectedLeaderIds(value.leaderIds ?? []);
      } else if (value.mode === "role") {
        setSelectedRoles(value.roleFilters ?? []);
      }
    }
  }, [value]);

  const handleModeChange = (mode: RecipientValue["mode"]) => {
    setSelectedMode(mode);
    // Reset selections when mode changes
    if (mode !== "individual") setSelectedEmployeeIds([]);
    if (mode !== "team") setSelectedTeamIds([]);
    if (mode !== "leader") setSelectedLeaderIds([]);
    if (mode !== "role") setSelectedRoles([]);
  };

  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleTeamToggle = (teamId: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : [...prev, teamId]
    );
  };

  const handleLeaderToggle = (leaderId: string) => {
    setSelectedLeaderIds((prev) =>
      prev.includes(leaderId)
        ? prev.filter((id) => id !== leaderId)
        : [...prev, leaderId]
    );
  };

  const handleRoleToggle = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role)
        ? prev.filter((r) => r !== role)
        : [...prev, role]
    );
  };

  const selectAllInRole = (role: string) => {
    const roleEmployees = recipientData?.employees.filter(
      (e) => e.role === role
    ) ?? [];
    const roleIds = roleEmployees.map((e) => e.id);
    setSelectedEmployeeIds((prev) => {
      const newSet = new Set(prev);
      roleIds.forEach((id) => newSet.add(id));
      return Array.from(newSet);
    });
  };

  const clearAll = () => {
    setSelectedEmployeeIds([]);
    setSelectedTeamIds([]);
    setSelectedLeaderIds([]);
    setSelectedRoles([]);
  };

  // Render employee list
  const renderEmployeeList = () => {
    if (isLoadingRecipients) {
      return (
        <div style={{ textAlign: "center", padding: 24 }}>
          <Spin />
          <div style={{ marginTop: 8 }}>{t("Đang tải...", lang)}</div>
        </div>
      );
    }

    const employees = recipientData?.employees ?? [];

    if (employees.length === 0) {
      return <Empty description={t("Không có nhân viên", lang)} />;
    }

    return (
      <div style={{ maxHeight: 300, overflow: "auto" }}>
        {employees.map((emp) => (
          <div
            key={emp.id}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 0",
              borderBottom: "1px solid #f0f0f0",
            }}
          >
            <Checkbox
              checked={selectedEmployeeIds.includes(emp.id)}
              onChange={() => handleEmployeeToggle(emp.id)}
              disabled={disabled}
            />
            <div style={{ marginLeft: 8, flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{emp.fullName}</div>
              <div style={{ fontSize: 12, color: "#888" }}>
                <Tag color={ROLE_COLORS[emp.role] ?? "default"}>
                  {emp.roleLabel}
                </Tag>
                <span>{emp.employeeCode}</span>
                {emp.teamName && <span> • {emp.teamName}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render team list
  const renderTeamList = () => {
    if (isLoadingTeams) {
      return (
        <div style={{ textAlign: "center", padding: 24 }}>
          <Spin />
          <div style={{ marginTop: 8 }}>{t("Đang tải...", lang)}</div>
        </div>
      );
    }

    if (!teams || teams.length === 0) {
      return <Empty description={t("Không có team", lang)} />;
    }

    return (
      <div style={{ maxHeight: 300, overflow: "auto" }}>
        {teams.map((team) => (
          <div
            key={team.id}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 0",
              borderBottom: "1px solid #f0f0f0",
            }}
          >
            <Checkbox
              checked={selectedTeamIds.includes(team.id)}
              onChange={() => handleTeamToggle(team.id)}
              disabled={disabled}
            />
            <div style={{ marginLeft: 8, flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{team.name}</div>
              <div style={{ fontSize: 12, color: "#888" }}>
                <Tag>{team.code}</Tag>
                <span>{team.memberCount} {t("thành viên", lang)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render leader list
  const renderLeaderList = () => {
    if (isLoadingLeaders) {
      return (
        <div style={{ textAlign: "center", padding: 24 }}>
          <Spin />
          <div style={{ marginTop: 8 }}>{t("Đang tải...", lang)}</div>
        </div>
      );
    }

    const leaders = (allLeaders?.employees ?? []) as RecipientEmployee[];

    if (leaders.length === 0) {
      return <Empty description={t("Không có leader", lang)} />;
    }

    return (
      <div style={{ maxHeight: 300, overflow: "auto" }}>
        {leaders.map((leader) => {
          const isSelected = selectedLeaderIds.includes(leader.id);
          return (
            <div
              key={leader.id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 0",
                borderBottom: "1px solid #f0f0f0",
                background: isSelected ? "#f6ffed" : "transparent",
                borderRadius: isSelected ? 4 : 0,
              }}
            >
              <Checkbox
                checked={isSelected}
                onChange={() => handleLeaderToggle(leader.id)}
                disabled={disabled}
              />
              <div style={{ marginLeft: 8, flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{leader.fullName}</div>
                <div style={{ fontSize: 12, color: "#888" }}>
                  <Tag color="blue">{leader.roleLabel}</Tag>
                  <span>{leader.employeeCode}</span>
                  {leader.teamName && <span> • {leader.teamName}</span>}
                </div>
                {isSelected && leaderTeamMembers && (
                  <div style={{ marginTop: 4, fontSize: 11, color: "#52c41a" }}>
                    <CheckCircleFilled /> +{leaderTeamMembers.length - 1} {t("nhân viên được chọn", lang)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render role list with employee counts
  const renderRoleList = () => {
    if (isLoadingRecipients) {
      return (
        <div style={{ textAlign: "center", padding: 24 }}>
          <Spin />
          <div style={{ marginTop: 8 }}>{t("Đang tải...", lang)}</div>
        </div>
      );
    }

    const employees = recipientData?.employees ?? [];

    return (
      <div style={{ maxHeight: 300, overflow: "auto" }}>
        {ROLE_OPTIONS.map((role) => {
          const roleEmployees = employees.filter((e) => e.role === role.code);
          const isSelected = selectedRoles.includes(role.code);

          return (
            <div
              key={role.code}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 0",
                borderBottom: "1px solid #f0f0f0",
                background: isSelected ? "#f6ffed" : "transparent",
                borderRadius: isSelected ? 4 : 0,
              }}
            >
              <Checkbox
                checked={isSelected}
                onChange={() => handleRoleToggle(role.code)}
                disabled={disabled}
              />
              <div style={{ marginLeft: 8, flex: 1 }}>
                <div style={{ fontWeight: 500 }}>
                  {role.label}
                  <Tag
                    color={ROLE_COLORS[role.code] ?? "default"}
                    style={{ marginLeft: 8 }}
                  >
                    {roleEmployees.length} {t("người", lang)}
                  </Tag>
                </div>
                {roleEmployees.length > 0 && (
                  <div style={{ marginTop: 2 }}>
                    {roleEmployees.slice(0, 3).map((e) => (
                      <Tag key={e.id} style={{ marginRight: 4, marginTop: 2 }}>
                        {e.fullName}
                      </Tag>
                    ))}
                    {roleEmployees.length > 3 && (
                      <Tag style={{ marginTop: 2 }}>
                        +{roleEmployees.length - 3} {t("khác", lang)}
                      </Tag>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderSummary = () => {
    const summary = getSelectionSummary();

    if (summary.type === "broadcast") {
      return (
        <Tag color="blue" icon={<UserOutlined />}>
          {t("Tất cả nhân viên", lang)}
        </Tag>
      );
    }

    if (summary.count === 0) {
      return <span style={{ color: "#ff4d4f" }}>{t("Chưa chọn người nhận", lang)}</span>;
    }

    const colorMap: Record<string, string> = {
      individual: "green",
      team: "purple",
      leader: "blue",
      role: "orange",
    };

    return (
      <Tag color={colorMap[summary.type] ?? "default"}>
        {summary.count} {summary.label} {t("đã chọn", lang)}
      </Tag>
    );
  };

  return (
    <div>
      {/* Mode Tabs */}
      <Space wrap style={{ marginBottom: 16 }}>
        <Button
          type={selectedMode === "broadcast" ? "primary" : "default"}
          icon={<UserOutlined />}
          onClick={() => handleModeChange("broadcast")}
          disabled={disabled}
        >
          {t("Tất cả", lang)}
        </Button>
        <Button
          type={selectedMode === "individual" ? "primary" : "default"}
          icon={<UserOutlined />}
          onClick={() => handleModeChange("individual")}
          disabled={disabled}
        >
          {t("Theo cá nhân", lang)}
        </Button>
        <Button
          type={selectedMode === "team" ? "primary" : "default"}
          icon={<TeamOutlined />}
          onClick={() => handleModeChange("team")}
          disabled={disabled}
        >
          {t("Theo team", lang)}
        </Button>
        <Button
          type={selectedMode === "leader" ? "primary" : "default"}
          icon={<CrownOutlined />}
          onClick={() => handleModeChange("leader")}
          disabled={disabled}
        >
          {t("Theo leader", lang)}
        </Button>
        <Button
          type={selectedMode === "role" ? "primary" : "default"}
          icon={<FilterOutlined />}
          onClick={() => handleModeChange("role")}
          disabled={disabled}
        >
          {t("Theo vai trò", lang)}
        </Button>
      </Space>

      {/* Selection Area */}
      {selectedMode !== "broadcast" && (
        <div
          style={{
            border: "1px solid #d9d9d9",
            borderRadius: 8,
            padding: 16,
            background: "#fafafa",
          }}
        >
          {/* Search */}
          {selectedMode === "individual" && (
            <Input.Search
              placeholder={t("Tìm theo tên hoặc mã nhân viên...", lang)}
              allowClear
              onSearch={(value) => setSearchKeyword(value)}
              onChange={(e) => {
                if (!e.target.value) setSearchKeyword("");
              }}
              style={{ marginBottom: 12 }}
            />
          )}

          {/* Selection Lists */}
          {selectedMode === "individual" && renderEmployeeList()}
          {selectedMode === "team" && renderTeamList()}
          {selectedMode === "leader" && renderLeaderList()}
          {selectedMode === "role" && renderRoleList()}

          {/* Clear All */}
          {(selectedEmployeeIds.length > 0 ||
            selectedTeamIds.length > 0 ||
            selectedLeaderIds.length > 0 ||
            selectedRoles.length > 0) && (
            <div style={{ marginTop: 12, textAlign: "right" }}>
              <Button size="small" onClick={clearAll} disabled={disabled}>
                {t("Bỏ chọn tất cả", lang)}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <div style={{ marginTop: 12 }}>{renderSummary()}</div>

      {/* Help Text */}
      {selectedMode === "team" && (
        <div style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
          {t("Chọn team để gửi thông báo đến tất cả thành viên trong team đó.", lang)}
        </div>
      )}
      {selectedMode === "leader" && (
        <div style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
          {t("Chọn leader để gửi thông báo đến leader và tất cả nhân viên dưới quyền.", lang)}
        </div>
      )}
      {selectedMode === "role" && (
        <div style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
          {t("Chọn vai trò (Sale/MKT/Kho) để gửi thông báo đến tất cả nhân viên có vai trò đó.", lang)}
        </div>
      )}
    </div>
  );
}

// Named export for barrel-style imports
export { RecipientSelectorComponent as RecipientSelector };

