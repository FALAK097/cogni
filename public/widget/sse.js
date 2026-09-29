/** Read complete SSE events, retaining frames split across network chunks. */
export async function readWidgetTextStream(stream, onText) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) throw new Error("The response stream ended before completion.");
      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const data = frame
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).replace(/^ /, ""))
          .join("\n");
        if (data === "[ERROR]") throw new Error("The assistant could not complete its response.");
        if (data === "[DONE]") {
          if (!text.trim()) throw new Error("The assistant returned an empty response.");
          return text;
        }
        if (data) {
          text += data;
          onText(text);
        }
        boundary = buffer.indexOf("\n\n");
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
