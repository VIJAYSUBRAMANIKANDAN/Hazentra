import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const jobs = await prisma.dehazeJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json({ jobs });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const job = await prisma.dehazeJob.create({
      data: {
        filename: body.filename,
        hazyImageUrl: body.hazyImageUrl,
        transmissionMapUrl: body.transmissionMapUrl,
        dehazedImageUrl: body.dehazedImageUrl,
        psnr: body.psnr,
        ssim: body.ssim,
        mae: body.mae,
        rmse: body.rmse,
        processingTimeSeconds: body.processingTimeSeconds,
        benchmarked: body.benchmarked ?? true,
      },
    });
    return NextResponse.json({ job }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save job" }, { status: 500 });
  }
}
