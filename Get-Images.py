import os
import re
import csv
import time
import requests
import pandas as pd
from bs4 import BeautifulSoup
from PIL import Image
from io import BytesIO
import urllib3
from urllib.parse import quote_plus, urljoin

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE = r"C:\Users\cmcneill6\arthurs-shop"
CSV_FILE = os.path.join(BASE, "inventory images.csv")
FINAL_DIR = os.path.join(BASE, "FinalImages")
MISSING_FILE = os.path.join(BASE, "missing.txt")
MATCHES_FILE = os.path.join(BASE, "image_matches.csv")

os.makedirs(FINAL_DIR, exist_ok=True)

HEADERS = {
    "User-Agent": "Mozilla/5.0"
}

def clean_filename(name):
    return re.sub(r'[\\/*?:"<>|]', "", str(name)).strip()[:120]

def get_page(url):
    r = requests.get(url, headers=HEADERS, verify=False, timeout=25)
    r.raise_for_status()
    return r.text

def find_product_page(product):
    query = quote_plus(product)

    search_urls = [
        f"https://www.licorea.com/advanced_search_result.php?keywords={query}&language=en",
        f"https://www.licorea.com/index.php?keywords={query}&language=en",
        f"https://www.licorea.com/?keywords={query}&language=en",
    ]

    for url in search_urls:
        try:
            html = get_page(url)
            soup = BeautifulSoup(html, "html.parser")

            links = []

            for a in soup.find_all("a", href=True):
                text = a.get_text(" ", strip=True)
                href = urljoin("https://www.licorea.com/", a["href"])

                if "licorea.com" not in href:
                    continue

                score = 0
                product_words = product.lower().split()
                link_text = text.lower()
                link_url = href.lower()

                for word in product_words:
                    if word in link_text or word in link_url:
                        score += 1

                if score >= max(1, len(product_words) // 2):
                    links.append((score, href, text))

            if links:
                links.sort(reverse=True, key=lambda x: x[0])
                return links[0][1]

        except Exception:
            pass

    return None

def find_image_on_product_page(product_url):
    html = get_page(product_url)
    soup = BeautifulSoup(html, "html.parser")

    og = soup.find("meta", property="og:image")
    if og and og.get("content"):
        return urljoin(product_url, og["content"])

    imgs = []

    for img in soup.find_all("img"):
        src = img.get("src") or img.get("data-src")
        alt = img.get("alt", "")

        if not src:
            continue

        src = urljoin(product_url, src)

        if any(x in src.lower() for x in ["logo", "icon", "banner", "flag"]):
            continue

        score = 0

        if "images" in src.lower():
            score += 2

        if alt:
            score += 1

        imgs.append((score, src))

    if imgs:
        imgs.sort(reverse=True, key=lambda x: x[0])
        return imgs[0][1]

    return None

def save_image(image_url, output_path):
    r = requests.get(image_url, headers=HEADERS, verify=False, timeout=30)
    r.raise_for_status()

    img = Image.open(BytesIO(r.content)).convert("RGBA")
    img.thumbnail((900, 900), Image.LANCZOS)

    canvas = Image.new("RGBA", (1000, 1000), (255, 255, 255, 255))
    x = (1000 - img.width) // 2
    y = (1000 - img.height) // 2
    canvas.paste(img, (x, y), img)

    canvas.convert("RGB").save(output_path, "PNG")

df = pd.read_csv(CSV_FILE, header=None)

open(MISSING_FILE, "w", encoding="utf-8").close()

with open(MATCHES_FILE, "w", newline="", encoding="utf-8") as match_csv:
    writer = csv.writer(match_csv)
    writer.writerow(["Product", "Product Page", "Image URL", "Saved File"])

    for product in df[0]:
        product = str(product).strip()

        if not product or product.lower() == "nan":
            continue

        safe_name = clean_filename(product)
        output_path = os.path.join(FINAL_DIR, safe_name + ".png")

        if os.path.exists(output_path):
            print(f"Already exists: {product}")
            continue

        print(f"Searching Licorea: {product}")

        try:
            product_page = find_product_page(product)

            if not product_page:
                print(f"Missing: {product}")
                with open(MISSING_FILE, "a", encoding="utf-8") as f:
                    f.write(product + "\n")
                continue

            image_url = find_image_on_product_page(product_page)

            if not image_url:
                print(f"No image on page: {product}")
                with open(MISSING_FILE, "a", encoding="utf-8") as f:
                    f.write(product + "\n")
                continue

            save_image(image_url, output_path)

            writer.writerow([product, product_page, image_url, output_path])
            print(f"Saved: {output_path}")

            time.sleep(1)

        except Exception as e:
            print(f"Failed: {product} - {e}")
            with open(MISSING_FILE, "a", encoding="utf-8") as f:
                f.write(product + "\n")

print("Done.")
print("Missing list created: missing.txt")
print("Matches created: image_matches.csv")