"""Download the licensed reference photos used by the thesis demo catalog.

Run from the repository root: python scripts/download-catalog-images.py
The source pages and photographers are recorded in CATALOG_DEMO_IMAGES.md.
"""

from pathlib import Path
from urllib.request import Request, urlopen


DESTINATION = Path(__file__).resolve().parents[1] / "apps/web/public/catalog"
PHOTOS = {
    "sofa-verona": "photo-1771577067936-680c2f795e5f",
    "sofa-boreal": "photo-1786462543687-26614deb2d6f",
    "sofa-lino": "photo-1765425636325-97dbd40b450e",
    "comedor-siena": "photo-1758977403826-01e2c8a3f68f",
    "comedor-roble": "photo-1758977245854-b0ea036e0ce2",
    "comedor-oliva": "photo-1602872030490-4a484a7b3ba6",
    "cama-napoles": "photo-1758974817671-24f627809115",
    "cama-alba": "photo-1773368807946-b1837900939c",
    "cama-nordica": "photo-1774716926071-fc03e73d0806",
}


def main() -> None:
    DESTINATION.mkdir(parents=True, exist_ok=True)
    for slug, photo in PHOTOS.items():
        url = f"https://images.unsplash.com/{photo}?fit=crop&w=1200&q=78&fm=webp"
        request = Request(url, headers={"User-Agent": "HomeFashionThesisDemo/1.0"})
        with urlopen(request, timeout=30) as response:
            image = response.read()
            content_type = response.headers.get("Content-Type", "")
        if content_type != "image/webp" or image[:4] != b"RIFF" or image[8:12] != b"WEBP":
            raise ValueError(f"Unexpected image format for {slug}: {content_type}")
        target = DESTINATION / f"{slug}.webp"
        target.write_bytes(image)
        print(f"{target.name}: {len(image)} bytes")


if __name__ == "__main__":
    main()
