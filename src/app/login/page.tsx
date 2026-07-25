"use client";

import { Button, Card, Form, Input, Typography } from "antd";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { loginSchema, LoginForm } from "@/utils/validator";

const { Title } = Typography;

export default function LoginPage() {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginForm) => {
    console.log(data);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <Card style={{ width: 400 }}>
        <Title level={3} style={{ textAlign: "center" }}>
          Đăng nhập
        </Title>

        <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
          <Form.Item
            label="Tên đăng nhập"
            validateStatus={errors.username ? "error" : ""}
            help={errors.username?.message}
          >
            <Controller
              name="username"
              control={control}
              render={({ field }) => (
                <Input {...field} placeholder="Nhập tên đăng nhập" />
              )}
            />
          </Form.Item>

          <Form.Item
            label="Mật khẩu"
            validateStatus={errors.password ? "error" : ""}
            help={errors.password?.message}
          >
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <Input.Password {...field} placeholder="Nhập mật khẩu" />
              )}
            />
          </Form.Item>

          <Button htmlType="submit" type="primary" block>
            Đăng nhập
          </Button>
        </Form>
      </Card>
    </div>
  );
}