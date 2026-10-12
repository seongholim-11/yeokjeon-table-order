"""Export the shared Python menu data for the browser-only GitHub Pages app."""
import json
from pathlib import Path

from menu_data import CATEGORIES, MENU, ROULETTE_PRIZES, STAFF_CALLS, STORE
from recommendations import DISCOUNT_PERCENT, DRINKS, PAIRINGS

root = Path(__file__).parent
target = root / "docs"
target.mkdir(exist_ok=True)
data = dict(store=STORE, categories=CATEGORIES, menu=MENU, prizes=ROULETTE_PRIZES,
            staffCalls=STAFF_CALLS, pairings=PAIRINGS, drinks=DRINKS,
            discountPercent=DISCOUNT_PERCENT)
(target / "data.mjs").write_text("export default " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
(target / "original.css").write_text((root / "app.css").read_text(encoding="utf-8"), encoding="utf-8")
(target / ".nojekyll").touch()
print("GitHub Pages assets exported to docs/")
