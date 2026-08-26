"use client";

import { App } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuthStore } from "@/store/auth.store";
import { LoginForm } from "@/utils/validator";

import EarthBackground from "./EarthBackground";
import styles from "./login.module.css";

function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { message } = App.useApp();

  const cardRef = useRef<HTMLDivElement | null>(null);
  const lightRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<HTMLDivElement | null>(null);

  const isDraggingRef = useRef(false);
  const rotationRef = useRef({ x: 0, y: 0 });
  const lastPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const card = cardRef.current;
    const light = lightRef.current;
    const sceneEl = sceneRef.current;
    if (!card || !light || !sceneEl) return;

    const isInsideFormArea = (x: number, y: number) => {
      const rect = sceneEl.getBoundingClientRect();
      return (
        x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
      );
    };

    const onMouseDown = (e: MouseEvent) => {
      if (!isInsideFormArea(e.clientX, e.clientY)) return;
      const target = e.target as HTMLElement | null;
      if (target && target.closest("input, button, a, label")) return;
      isDraggingRef.current = true;
      lastPosRef.current = { x: e.clientX, y: e.clientY };
      card.style.cursor = "grabbing";
    };

    const onMouseMove = (e: MouseEvent) => {
      const inside = isInsideFormArea(e.clientX, e.clientY);
      const rect = sceneEl.getBoundingClientRect();

      if (inside) {
        light.style.left = `${e.clientX - rect.left}px`;
        light.style.top = `${e.clientY - rect.top}px`;
      }

      if (isDraggingRef.current && inside) {
        const deltaX = e.clientX - lastPosRef.current.x;
        const deltaY = e.clientY - lastPosRef.current.y;
        rotationRef.current.y += deltaX * 0.5;
        rotationRef.current.x -= deltaY * 0.5;
        rotationRef.current.x = Math.max(-90, Math.min(90, rotationRef.current.x));
        card.style.transform = `rotateX(${rotationRef.current.x}deg) rotateY(${rotationRef.current.y}deg) translateZ(30px)`;
        card.style.transition = "none";
        lastPosRef.current = { x: e.clientX, y: e.clientY };
      } else if (inside && !isDraggingRef.current) {
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const tiltY = ((x - centerX) / centerX) * 12;
        const tiltX = ((centerY - y) / centerY) * 12;
        card.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
        card.style.transition = "none";
      } else if (!inside && !isDraggingRef.current) {
        card.style.transform = "rotateX(0deg) rotateY(0deg)";
        card.style.transition = "transform 0.4s ease";
      }
    };

    const onMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        card.style.cursor = "grab";
        card.style.transition =
          "transform 0.6s ease, box-shadow 0.4s ease";
        card.style.transform = "rotateX(0deg) rotateY(0deg) translateZ(0)";
        rotationRef.current = { x: 0, y: 0 };
      }
    };

    card.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    return () => {
      card.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const togglePassword = () => setShowPassword((prev) => !prev);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const formData = new FormData(e.currentTarget);
    const values: LoginForm = {
      username: formData.get("username") as string,
      password: formData.get("password") as string,
    };

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (!response.ok) {
        const errMsg = result.message || "Đăng nhập thất bại";
        setErrorMsg(errMsg);
        message.error(errMsg);
        setLoading(false);
        return;
      }

      login({
        accessToken: result.data.accessToken,
        user: result.data.user,
      });

      message.success("Đăng nhập thành công!");
      setTimeout(() => router.push("/dashboard"), 500);
    } catch {
      const errMsg = "Không thể kết nối máy chủ";
      setErrorMsg(errMsg);
      message.error(errMsg);
      setLoading(false);
    }
  };

  return (
    <App>
      <div className={styles.shell}>
        <EarthBackground />

        <div className={styles.content}>
          <div className={styles.label}>CÔNG TY TNHH LMC GROUPS</div>
          <h1 className={styles.contentHeading}>
            LMC
            <span>GROUP.</span>
          </h1>
          <p className={styles.contentHint}>
            Kéo để xoay &bull; Cuộn để phóng to
          </p>
        </div>

        <div className={styles.scene} ref={sceneRef}>
          <div className={styles.loginCard} id="card" ref={cardRef}>
            <div className={styles.light} ref={lightRef} />
            <div className={styles.loginContent}>
              <div className={styles.logo}>LMC</div>
              <h1>Welcome back</h1>
              <p className={styles.subtitle}>Đăng nhập hệ thống</p>

              <form onSubmit={onSubmit} autoComplete="off">
                <div className={styles.formGroup}>
                  <label htmlFor="username">Username</label>
                  <input
                    id="username"
                    className={styles.input}
                    type="text"
                    name="username"
                    placeholder="Nhập username"
                    required
                    autoComplete="off"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="password">Password</label>
                  <div className={styles.passwordBox}>
                    <input
                      id="password"
                      className={styles.input}
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                    />
                    <span
                      className={styles.passwordToggle}
                      onClick={togglePassword}
                      role="button"
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPassword ? "Ẩn" : "Hiện"}
                    </span>
                  </div>
                </div>

                <div className={styles.options}>
                  <label className={styles.remember}>
                    <input type="checkbox" name="remember" />
                    Remember me
                  </label>
                  <a href="#" className={styles.forgot}>
                    Forgot password?
                  </a>
                </div>

                {errorMsg && <div className={styles.error}>{errorMsg}</div>}

                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={loading}
                >
                  {loading ? "ĐANG ĐĂNG NHẬP..." : "SIGN IN"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </App>
  );
}

export default LoginPage;
