export function GET() {
  return Response.json({ error: "Recent widget sessions are not available." }, { status: 410 });
}
