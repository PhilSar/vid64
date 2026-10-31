import base64
import binascii
import os
import sys
import tempfile
from collections.abc import Callable, Mapping
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps


IMAGE_MODEL = "gemini-nano-banana-2.1"
MAX_IMAGE_BYTES = 500_000
GENERATION_TIMEOUT_SECONDS = 600
IMAGE_JOBS = (
    (
        "chimney-components.webp",
        "Photorealistic product editorial image of stainless-steel chimney components: "
        "straight pipe sections, an elbow, and a rain cap arranged neatly on a dark neutral "
        "industrial work surface. Brushed metal, precise seams, soft studio lighting, "
        "landscape composition. No logos, readable text, labels, people, or identifiable "
        "company or workshop details.",
    ),
    (
        "ventilation-components.webp",
        "Photorealistic product editorial image of galvanized-steel ventilation ductwork: "
        "round duct sections, elbows, reducers, and connectors arranged neatly in a clean "
        "industrial setting. Visible galvanized metal texture, soft directional light, "
        "landscape composition. No logos, readable text, labels, people, or identifiable "
        "company or workshop details.",
    ),
    (
        "laser-cutting.webp",
        "Photorealistic industrial close-up of a CNC laser cutting machine cutting a precise "
        "pattern into a flat stainless-steel sheet, with a small controlled cutting glow "
        "and realistic metal surface detail. Clean modern manufacturing environment, "
        "landscape composition. No logos, readable text, labels, people, or identifiable "
        "company or workshop details.",
    ),
)


def require_api_key(environment: Mapping[str, str]) -> str:
    api_key = environment.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY is missing. Add it to the project-root .env file before "
            "running this script."
        )
    return api_key


def extract_image_bytes(image_output: object | None) -> bytes:
    if getattr(image_output, "type", None) != "image":
        raise ValueError("Gemini response did not contain image data in its output.")

    encoded_data = getattr(image_output, "data", None)
    if not isinstance(encoded_data, str) or not encoded_data:
        raise ValueError("Gemini image output did not contain inline image data.")

    try:
        return base64.b64decode(encoded_data, validate=True)
    except (binascii.Error, ValueError) as error:
        raise ValueError("Gemini returned invalid base64 image data.") from error


def to_webp(image_data: bytes, max_bytes: int = MAX_IMAGE_BYTES) -> bytes:
    if max_bytes < 1:
        raise ValueError("The maximum image size must be greater than zero.")
    if not image_data:
        raise ValueError("Gemini returned empty image data.")

    try:
        source = Image.open(BytesIO(image_data))
        source.load()
        source = ImageOps.exif_transpose(source)
    except (Image.DecompressionBombError, OSError, ValueError) as error:
        raise ValueError("Gemini returned invalid image data.") from error

    if "A" in source.getbands() or "transparency" in source.info:
        rgba = source.convert("RGBA")
        image = Image.new("RGB", rgba.size, (255, 255, 255))
        image.paste(rgba, mask=rgba.getchannel("A"))
    else:
        image = source.convert("RGB")

    image.thumbnail((1600, 1200), Image.Resampling.LANCZOS)

    while True:
        for quality in (88, 80, 72, 64, 56, 48):
            output = BytesIO()
            try:
                image.save(output, format="WEBP", quality=quality, method=6)
            except OSError as error:
                raise ValueError("Unable to convert Gemini image to WebP.") from error

            encoded_image = output.getvalue()
            if len(encoded_image) <= max_bytes:
                return encoded_image

        width, height = image.size
        smaller_size = (max(1, int(width * 0.85)), max(1, int(height * 0.85)))
        if smaller_size == image.size:
            raise ValueError(f"Unable to fit generated image under {max_bytes} bytes.")
        image = image.resize(smaller_size, Image.Resampling.LANCZOS)


def generate_images(
    generate: Callable[[str], bytes],
    output_dir: Path,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    for filename, prompt in IMAGE_JOBS:
        image_data = to_webp(generate(prompt))
        temporary_path: Path | None = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="wb",
                dir=output_dir,
                prefix=f".{filename}.",
                suffix=".tmp",
                delete=False,
            ) as temporary_file:
                temporary_path = Path(temporary_file.name)
                temporary_file.write(image_data)
                temporary_file.flush()
                os.fsync(temporary_file.fileno())

            if temporary_path is None:
                raise RuntimeError("Temporary image file was not created.")

            os.chmod(temporary_path, 0o644)
            os.replace(temporary_path, output_dir / filename)
        finally:
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)


def main() -> int:
    repository_root = Path(__file__).resolve().parent

    try:
        from dotenv import load_dotenv
    except ImportError as error:
        raise RuntimeError(
            "Image generator dependencies are missing. Install them with "
            "python3 -m pip install -r requirements-image-gen.txt."
        ) from error

    load_dotenv(repository_root / ".env")
    try:
        api_key = require_api_key(os.environ)
    except ValueError as error:
        print(error, file=sys.stderr)
        return 1

    try:
        from google import genai
    except ImportError as error:
        raise RuntimeError(
            "Image generator dependencies are missing. Install them with "
            "python3 -m pip install -r requirements-image-gen.txt."
        ) from error

    client = genai.Client(api_key=api_key)

    def generate(prompt: str) -> bytes:
        response = client.interactions.create(
            model=IMAGE_MODEL,
            input=prompt,
            response_format={
                "type": "image",
                "mime_type": "image/jpeg",
                "aspect_ratio": "3:2",
                "image_size": "1K",
            },
            timeout=GENERATION_TIMEOUT_SECONDS,
        )
        return extract_image_bytes(response.output_image)

    output_dir = repository_root / "public" / "images"
    generate_images(generate, output_dir)
    print(f"Generated {len(IMAGE_JOBS)} images in {output_dir}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
