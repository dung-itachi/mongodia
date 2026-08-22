import { getCurrentUser, UnauthorizedError } from "@/lib/auth";
import { error as errorResponse, success } from "@/utils/response";
import LoginHistory from "@/models/LoginHistory";

/**
 * Check if current user has suspicious login attempts
 * that need attention (not trusted yet, has anomaly reasons).
 *
 * Performance:
 *   - Bỏ N+1: trusted logins được load 1 lần duy nhất (Promise.all với suspicious),
 *     sau đó compare in-memory.
 *   - Index mới: { employeeId, success, isTrusted, loginAt } phục vụ cả 2 query.
 */
export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    const employeeId = currentUser.employee._id;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Bước 1: load song song trusted + suspicious (2 round-trips song song thay vì 1+N).
    const [trustedLogins, suspiciousLogins] = await Promise.all([
      LoginHistory.find({
        employeeId,
        success: true,
        isTrusted: true,
      })
        .sort({ loginAt: -1 })
        .limit(10)
        .select("ip userAgent")
        .lean(),
      LoginHistory.find({
        employeeId,
        success: true,
        isTrusted: false,
        loginAt: { $gte: sevenDaysAgo },
      })
        .sort({ loginAt: -1 })
        .select("ip userAgent loginAt anomalyReason")
        .lean(),
    ]);

    // Bước 2: xử lý anomaly detection thuần in-memory.
    // Pre-compute các pattern của trusted logins 1 lần.
    const extractDevicePattern = (ua: string) => {
      if (ua.includes("Mobile") || ua.includes("Android")) return "mobile";
      if (ua.includes("iPad") || ua.includes("Tablet")) return "tablet";
      return "desktop";
    };
    const extractOsPattern = (ua: string) => {
      if (ua.includes("Windows")) return "windows";
      if (ua.includes("Mac OS")) return "macos";
      if (ua.includes("Linux")) return "linux";
      if (ua.includes("Android")) return "android";
      if (ua.includes("iOS")) return "ios";
      return "other";
    };
    const extractBrowserPattern = (ua: string) => {
      if (ua.includes("Chrome") && !ua.includes("Edg")) return "chrome";
      if (ua.includes("Firefox")) return "firefox";
      if (ua.includes("Safari") && !ua.includes("Chrome")) return "safari";
      if (ua.includes("Edg")) return "edge";
      return "other";
    };

    const knownIpPrefixes = trustedLogins
      .filter((l) => l.ip)
      .map((l) => l.ip!.split(".").slice(0, 2).join("."));
    const knownDevices = trustedLogins.map((l) => extractDevicePattern(l.userAgent));
    const knownOss = trustedLogins.map((l) => extractOsPattern(l.userAgent));
    const knownBrowsers = trustedLogins.map((l) => extractBrowserPattern(l.userAgent));
    const hasTrusted = trustedLogins.length > 0;

    const result = suspiciousLogins.map((login) => {
      const reasons: string[] = [];
      const loginId = login._id.toString();

      if (hasTrusted) {
        if (login.ip) {
          const loginIpPrefix = login.ip.split(".").slice(0, 2).join(".");
          if (
            !knownIpPrefixes.some((prefix) => prefix === loginIpPrefix) &&
            knownIpPrefixes.length > 0
          ) {
            reasons.push("IP lạ");
          }
        }

        if (login.userAgent) {
          const loginDevice = extractDevicePattern(login.userAgent);
          if (!knownDevices.includes(loginDevice) && knownDevices.length > 0) {
            reasons.push(`Thiết bị lạ (${loginDevice})`);
          }

          const loginOs = extractOsPattern(login.userAgent);
          if (!knownOss.includes(loginOs) && knownOss.length > 0) {
            reasons.push(`Hệ điều hành lạ (${loginOs})`);
          }

          const loginBrowser = extractBrowserPattern(login.userAgent);
          if (!knownBrowsers.includes(loginBrowser) && knownBrowsers.length > 0) {
            reasons.push(`Trình duyệt lạ (${loginBrowser})`);
          }
        }
      }

      return {
        _id: loginId,
        ip: login.ip || "",
        userAgent: login.userAgent || "",
        loginAt: login.loginAt,
        anomalyReason: reasons.length > 0 ? reasons.join(", ") : login.anomalyReason,
        isUnusualIp: reasons.includes("IP lạ"),
        isUnusualDevice: reasons.some(
          (r) =>
            r.startsWith("Thiết bị") ||
            r.startsWith("Hệ điều") ||
            r.startsWith("Trình duyệt")
        ),
      };
    });

    const hasAnomalies = result.filter(
      (item) =>
        item.anomalyReason ||
        item.isUnusualIp ||
        item.isUnusualDevice
    );

    return success({
      hasSuspiciousLogins: hasAnomalies.length > 0,
      count: hasAnomalies.length,
      items: hasAnomalies,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return errorResponse(error.message, 401);
    }
    console.error("Check Suspicious Logins Error:", error);
    return errorResponse("Không thể kiểm tra đăng nhập lạ", 500);
  }
}