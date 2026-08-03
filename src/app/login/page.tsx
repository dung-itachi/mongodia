"use client";

import { App } from "antd";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { useAuthStore } from "@/store/auth.store";
import { LoginForm } from "@/utils/validator";

import styles from "./login.module.css";

const VIDEO_ID = "sF3i-LHRMcw";
const VIDEO_LENGTH = 10800;
const MIN_START = 20;
const MAX_START = VIDEO_LENGTH - 300;

function getRandomStart() {
  return Math.floor(Math.random() * (MAX_START - MIN_START + 1)) + MIN_START;
}

function LoginPage() {
  const [isMuted, setIsMuted] = useState(true);
  const [startTime, setStartTime] = useState(0);
  const router = useRouter();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { message } = App.useApp();

  useEffect(() => {
    setStartTime(getRandomStart());
  }, []);

  const toggleMute = () => {
    const iframe = document.querySelector("iframe[name=ytplayer]") as HTMLIFrameElement | null;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: isMuted ? "unMute" : "mute",
        }),
        "*"
      );
      setIsMuted(!isMuted);
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const values: LoginForm = {
      username: formData.get("username") as string,
      password: formData.get("password") as string,
    };

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (!response.ok) {
        message.error(result.message || "Đăng nhập thất bại");
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
      message.error("Không thể kết nối máy chủ");
      setLoading(false);
    }
  };

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  const videoSrc = `https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&mute=1&controls=0&loop=1&playlist=${VIDEO_ID}&start=${startTime}&modestbranding=1&rel=0&playsinline=1&iv_load_policy=3&disablekb=1&fs=0&enablejsapi=1`;

  return (
    <App>
      <div className={styles.videoBg}>
        <iframe
          name="ytplayer"
          src={videoSrc}
          title="Background"
          frameBorder="0"
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
        <div className={styles.overlay} />
        <div className={styles.container}>
          <div className={styles.card}>
            <h1>Welcome</h1>
            <p>Đăng nhập hệ thống</p>

            <form onSubmit={onSubmit}>
              <input
                className={styles.input}
                type="text"
                name="username"
                placeholder="Username"
                required
              />

              <div className={styles.passwordBox}>
                <input
                  id="password"
                  className={styles.input}
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  required
                />
                <span className={styles.show} onClick={togglePassword}>
                  {showPassword ? "👁" : "👁"}
                </span>
              </div>

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? "ĐANG ĐĂNG NHẬP..." : "LOGIN"}
              </button>
            </form>

            <div className={styles.links}>
              <a href="#">Quên mật khẩu?</a>
              <a href="/register">Đăng ký</a>
            </div>

            <div className={styles.footer}>MongoDia - Quản lý dữ liệu</div>
          </div>
        </div>
        <button className={styles.muteBtn} onClick={toggleMute}>
          {isMuted ? "🔇" : "🔊"}
        </button>
      </div>
    </App>
  );
}

export default LoginPage;
