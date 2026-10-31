import base64
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest

from PIL import Image

from generate_product_images import (
    IMAGE_JOBS,
    extract_image_bytes,
    generate_images,
    require_api_key,
    to_webp,
)


def create_png(size: tuple[int, int] = (120, 80)) -> bytes:
    image = Image.effect_noise(size, 80).convert("RGB")
    output = BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


class GenerateProductImagesTests(unittest.TestCase):
    def test_require_api_key_rejects_missing_key(self) -> None:
        with self.assertRaisesRegex(ValueError, "GEMINI_API_KEY"):
            require_api_key({})

    def test_extract_image_bytes_decodes_base64_from_an_image_output(self) -> None:
        image_data = b"image bytes"
        outputs = [
            SimpleNamespace(type="text", text="Generated image"),
            SimpleNamespace(type="image", data=base64.b64encode(image_data).decode("ascii")),
        ]

        self.assertEqual(extract_image_bytes(outputs), image_data)

    def test_extract_image_bytes_rejects_missing_or_malformed_data(self) -> None:
        with self.assertRaisesRegex(ValueError, "image"):
            extract_image_bytes(None)

        with self.assertRaisesRegex(ValueError, "image"):
            extract_image_bytes([SimpleNamespace(type="text", text="No image returned")])

        with self.assertRaisesRegex(ValueError, "base64"):
            extract_image_bytes([SimpleNamespace(type="image", data="not base64!")])

    def test_to_webp_returns_a_valid_image_under_the_size_limit(self) -> None:
        result = to_webp(create_png((1800, 1200)), max_bytes=500_000)

        with Image.open(BytesIO(result)) as image:
            self.assertEqual(image.format, "WEBP")
            self.assertLessEqual(len(result), 500_000)

    def test_to_webp_rejects_invalid_image_data(self) -> None:
        with self.assertRaisesRegex(ValueError, "image"):
            to_webp(b"not an image")

    def test_generate_images_writes_the_three_named_assets(self) -> None:
        image_data = create_png()
        prompts: list[str] = []

        with TemporaryDirectory() as temporary_directory:
            output_dir = Path(temporary_directory)
            generate_images(lambda prompt: prompts.append(prompt) or image_data, output_dir)

            expected_names = {
                "chimney-components.webp",
                "ventilation-components.webp",
                "laser-cutting.webp",
            }
            self.assertEqual({path.name for path in output_dir.iterdir()}, expected_names)
            self.assertEqual(len(prompts), 3)
            self.assertEqual(len(IMAGE_JOBS), 3)

    def test_failed_regeneration_preserves_the_existing_asset(self) -> None:
        image_data = create_png()
        prior_asset = to_webp(image_data)

        with TemporaryDirectory() as temporary_directory:
            output_dir = Path(temporary_directory)
            output_dir.mkdir(exist_ok=True)
            existing_asset = output_dir / "ventilation-components.webp"
            existing_asset.write_bytes(prior_asset)
            calls = 0

            def fail_on_second_image(prompt: str) -> bytes:
                nonlocal calls
                calls += 1
                if calls == 2:
                    raise RuntimeError("API request failed")
                return image_data

            with self.assertRaisesRegex(RuntimeError, "API request failed"):
                generate_images(fail_on_second_image, output_dir)

            self.assertEqual(existing_asset.read_bytes(), prior_asset)


if __name__ == "__main__":
    unittest.main()
