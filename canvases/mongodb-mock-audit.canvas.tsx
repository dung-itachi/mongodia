// @ts-ignore
import {
  Card,
  CardBody,
  CardHeader,
  Divider,
  Grid,
  H1,
  H2,
  Pill,
  Stack,
  Table,
  Text,
  useHostTheme,
} from "cursor/canvas";

const rows = [
  {
    module: "Dashboard",
    mongo: "❌",
    mock: "✅",
    notes:
      "/api/dashboard và /api/dashboard/charts trả object hardcode; hooks chỉ fetch qua API này. Không có Model/Service/Repository trong luồng dashboard hiện tại.",
  },
  {
    module: "Marketing Dashboard",
    mongo: "❌",
    mock: "✅",
    notes:
      "/api/marketing/dashboard trả mockData hardcode; useMarketingDashboard chỉ gọi route này. Không thấy truy cập Mongo thật trong luồng dashboard marketing.",
  },
  {
    module: "Marketing CRUD",
    mongo: "❌",
    mock: "✅",
    notes:
      "GET/POST/PATCH/DELETE ở /api/marketing/leads và /api/marketing/leads/[id] dùng mockMarketingLeads. leadService và leadRepository có MongoDB logic nhưng chưa được route này dùng.",
  },
  {
    module: "Database layer",
    mongo: "✅",
    mock: "❌",
    notes:
      "Có Mongoose Model/Repository/Service thật cho Lead: lead.repository.ts và lead.service.ts dùng Lead, LeadHistory, Counter, aggregate-style query/filter, populate, countDocuments.",
  },
];

const progressChecks = [
  {
    topic: "Dashboard",
    status: "Đúng một phần",
    detail:
      "PROJECT_PROGRESS.md ghi /api/dashboard và /api/dashboard/charts là mock; code hiện tại khớp với ghi chú đó. Không có lệch trạng thái ở module này.",
  },
  {
    topic: "Marketing Dashboard",
    status: "Đúng một phần",
    detail:
      "PROJECT_PROGRESS.md ghi /api/marketing/dashboard (mock). Code hiện tại cũng vẫn mockData hardcode. Chưa có Mongo aggregation thật.",
  },
  {
    topic: "Marketing Lead CRUD",
    status: "Lệch nhẹ",
    detail:
      "PROJECT_PROGRESS.md đã ghi 'Completed' cho CRUD Foundation nhưng lại cũng ghi rõ endpoint vẫn là mock. Code xác nhận đúng là mock store shared, chưa dùng leadService. Nghĩa là tiến độ 'hoàn thành' ở đây chỉ là foundation/mock CRUD, chưa phải production Mongo.",
  },
  {
    topic: "Mongo layer",
    status: "Có sẵn nhưng chưa nối",
    detail:
      "Repository/service đã tồn tại và trông production-ready về mặt cấu trúc, nhưng route marketing CRUD hiện chưa gọi vào chúng.",
  },
];

export default function MongodbMockAuditCanvas() {
  const theme = useHostTheme();
  const accent = theme.accent;

  return (
    <Stack gap={16} style={{ padding: 20, color: theme.textPrimary, background: theme.surface }}>
      <H1>MongoDB vs Mock Audit</H1>
      <Text tone="secondary">
        Đối chiếu trực tiếp source hiện có với <code>PROJECT_PROGRESS.md</code>. Không suy đoán.
      </Text>

      <Grid columns={2} gap={16}>
        <Card>
          <CardHeader title="Kết luận ngắn" />
          <CardBody>
            <Stack gap={12}>
              <Text><strong>Dashboard:</strong> mock</Text>
              <Text><strong>Marketing Dashboard:</strong> mock</Text>
              <Text><strong>Marketing Lead CRUD:</strong> mock store, chưa nối Mongo</Text>
              <Text><strong>Mongo layer:</strong> có Repository/Service thật, nhưng chưa được route marketing CRUD sử dụng</Text>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Ưu tiên chuyển mock → Mongo" />
          <CardBody>
            <Stack gap={12}>
              <Text>1. Marketing Lead CRUD</Text>
              <Text>2. Marketing Dashboard</Text>
              <Text>3. Dashboard tổng quan</Text>
              <Text tone="secondary">Vì CRUD đã có repository/service sẵn, nên đây là điểm có nền để chuyển trước.</Text>
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <Card>
        <CardHeader title="Bảng kết luận" trailing={<Pill tone="info">Audit</Pill>} />
        <CardBody>
          <Table
            columns={[
              { key: "module", title: "Module", width: 200 },
              { key: "mongo", title: "MongoDB thật", width: 120 },
              { key: "mock", title: "Mock", width: 100 },
              { key: "notes", title: "Ghi chú" },
            ]}
            rows={rows}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Đối chiếu PROJECT_PROGRESS.md" />
        <CardBody>
          <Stack gap={12}>
            {progressChecks.map((item) => (
              <Stack key={item.topic} gap={6}>
                <Text weight="semibold" style={{ color: accent }}>{item.topic}</Text>
                <Text>{item.status}: {item.detail}</Text>
              </Stack>
            ))}
          </Stack>
        </CardBody>
      </Card>

      <Divider />
      <Text tone="secondary">
        Bằng chứng chính nằm ở các route `src/app/api/dashboard/route.ts`, `src/app/api/dashboard/charts/route.ts`, `src/app/api/marketing/dashboard/route.ts`, `src/app/api/marketing/leads/route.ts`, `src/app/api/marketing/leads/[id]/route.ts`, cùng `src/repositories/lead.repository.ts` và `src/services/lead.service.ts`.
      </Text>
    </Stack>
  );
}
