# Hardware integration

| Device | Today (demo) | Production |
|---|---|---|
| **Touch screen** | any browser, full screen (F11) | 15" POS touch screen, kiosk-mode browser or Electron shell |
| **Barcode scanner** | Settings → *Hardware test bench* → Scan; or type a code fast + Enter | any USB "keyboard wedge" scanner — no driver, nothing to configure. The register buffers fast keystroke bursts ending with Enter and treats them as scans, so a physical keyboard still works. |
| **Deli / meat scale** | test bench generates the label barcode | scale prints a price-embedded UPC (`2 IIIII PPPPP C`): item code = PLU, price in cents. The register finds the product and computes the weight = price ÷ price-per-kg. |
| **Payment terminal** | simulated terminal (tap / decline buttons, optional auto-approve) | semi-integrated Interac terminal (Moneris / Global Payments cloud or LAN API): the register sends the amount, the customer pays on the PIN pad, the approval + auth code come back and are stored on the tender. Adapter interface: `src/hardware/terminal.ts` (`PaymentTerminal`). Until then, *stand-alone terminal* mode asks the cashier to confirm the approval. |
| **Customer display** | open `/customer` in a second window | second monitor: drag the window there, press F11. State travels over a BroadcastChannel (same machine, no network). |
| **Receipt printer** | browser print dialog, 80 mm layout | ESC/POS thermal printer via the OS driver or a local print agent; receipt text is already generated in 42-column thermal format (`receiptText()`). |
| **Cash drawer** | sound + logged event | printer-driven drawer (RJ12) kicked on cash sales and *No Sale*. |
| **Back office** | http://localhost:4000 | the API on the store's PC or a small cloud server; each register gets its own device key. |

Barcode formats handled by `src/core/barcode.ts`: UPC-A (12), EAN-13 (13, incl. leading-zero UPC),
GS1 check digits, price-embedded type-2 UPC, and 3–6 digit PLU codes.
