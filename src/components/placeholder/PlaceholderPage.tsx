"use client";

import { ReactNode } from "react";
import { Space, Typography } from "antd";

const { Paragraph } = Typography;

type Props = {
  title: string;
  description?: string;
  badge?: string;
  children?: ReactNode;
};

/**
 * PlaceholderPage — generic placeholder used by every Phase A page.
 *
 * Visual rules live in `src/styles/card.css` (`.card`, `.card-h`,
 * `.card-body`). Class names mirror the original HTML so future
 * content slots can drop in verbatim.
 *
 * No inline styles, no business logic, no API calls.
 */
export default function PlaceholderPage({
  title,
  description,
  badge,
  children,
}: Props) {
  return (
    <div className="card">
      <div className="card-h">
        <h2>{title}</h2>
        {badge && <span className="vb vb-b">{badge}</span>}
      </div>
      <div className="card-body">
        <Space direction="vertical" size="middle">
          <Paragraph type="secondary">
            {description ??
              "Trang này đang được xây dựng trong các Sprint tiếp theo."}
          </Paragraph>
          <div className="card">
            <div className="card-body">{children ?? <DefaultNote />}</div>
          </div>
        </Space>
      </div>
    </div>
  );
}

function DefaultNote() {
  return (
    <span>
      Phase A — chỉ dựng khung giao diện. Chưa kết nối API, chưa gọi mock
      data, chưa xử lý business logic.
    </span>
  );
}
