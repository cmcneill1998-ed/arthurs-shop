from rembg import remove
from PIL import Image
import os

INPUT_FOLDER = "products"
OUTPUT_FOLDER = "transparent"

os.makedirs(OUTPUT_FOLDER, exist_ok=True)

for filename in os.listdir(INPUT_FOLDER):

    if not filename.lower().endswith(
        (".jpg", ".jpeg", ".png", ".webp")
    ):
        continue

    try:
        input_path = os.path.join(INPUT_FOLDER, filename)

        image = Image.open(input_path)

        output = remove(image)

        output_name = os.path.splitext(filename)[0] + ".png"

        output.save(
            os.path.join(
                OUTPUT_FOLDER,
                output_name
            )
        )

        print(f"✓ {filename}")

    except Exception as e:
        print(f"✗ {filename}: {e}")

print("Finished")