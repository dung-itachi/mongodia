import { NextResponse } from "next/server";

export function success(data: unknown = null, message = "Success") {
  return NextResponse.json({
    success: true,
    message,
    data,
  });
}

export function error(message = "Error", status = 400) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    {
      status,
    }
  );
}