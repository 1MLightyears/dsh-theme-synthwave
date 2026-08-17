// 请求体读取工具：把 HTTP 请求体安全地读成 Buffer 或 JSON，供上传与配置接口复用。

/** 把请求体流式读入单个 Buffer，超过 maxBytes 或出错时返回 null。 */
export async function readBody(req: any, maxBytes: number): Promise<Buffer | null> {
  const chunks: Buffer[] = []
  let total = 0
  try {
    for await (const chunk of req as AsyncIterable<Buffer | string>) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))
      total += buf.length
      if (total > maxBytes) return null
      chunks.push(buf)
    }
  } catch { return null }
  return Buffer.concat(chunks)
}

/** 读取并解析 JSON 请求体（上限 1MB），失败返回 null。 */
export async function readJsonBody(req: any): Promise<any | null> {
  const buf = await readBody(req, 1024 * 1024)
  if (buf === null) return null
  try { return JSON.parse(buf.toString('utf8')) } catch { return null }
}
