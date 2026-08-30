# Demo sandbox

Open `/demo/` or select **Try it with sample data** on the landing page. The desktop first-run screen also provides **Load sample project**.

The sample is `monthly-orders.csv`: five realistic monthly orders across North, West, and South regions. The demo lets a visitor filter order status and export the resulting sample CSV.

The web demo keeps its state in page memory only. It never reads a real file or writes to localStorage, IndexedDB, or the desktop app namespace. **Reset demo** restores all five rows. **Start for real** returns to the landing page and discards the demo state. The native sample is bundled under the app resource directory and is only opened when the visitor selects it.
