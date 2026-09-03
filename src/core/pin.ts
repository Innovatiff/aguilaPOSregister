/** SHA-256 hex of `${employeeId}:${pin}` — same scheme the back office stores. */
export async function hashPin(employeeId: string, pin: string): Promise<string> {
  const data = new TextEncoder().encode(`${employeeId}:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
