"""
core/converter.py
Responsible for: all image conversion logic using Pillow.
Has zero knowledge of HTTP, templates, or the server layer.
"""

import io

from PIL import Image


class ImageConverter:
    """Converts raw image bytes from one format to another."""

    SUPPORTED_FORMATS: list[str] = ["JPEG", "WEBP", "PNG", "BMP"]
    QUALITY_FORMATS:   list[str] = ["JPEG", "WEBP"]

    # ── Public API ─────────────────────────────────────────────────────────────
    def convert(self, file_data: bytes, fmt: str, quality: int = 90) -> bytes:
        """
        Convert *file_data* to *fmt* at the given *quality*.

        Returns the resulting image as raw bytes.
        Raises ValueError for unsupported formats.
        """
        fmt = fmt.upper()
        if fmt not in self.SUPPORTED_FORMATS:
            raise ValueError(f"Unsupported format: {fmt}. "
                             f"Supported: {', '.join(self.SUPPORTED_FORMATS)}")

        img = Image.open(io.BytesIO(file_data))
        img = self._normalise_mode(img, fmt)

        out = io.BytesIO()
        img.save(out, fmt, **self._save_kwargs(fmt, quality))
        return out.getvalue()

    # ── Private helpers ────────────────────────────────────────────────────────
    @staticmethod
    def _normalise_mode(img: Image.Image, fmt: str) -> Image.Image:
        """
        Flatten transparency for formats that don't support an alpha channel.
        Converts palette-mode images to RGBA first so we can composite properly.
        """
        needs_rgb = fmt in ("JPEG", "BMP")

        if img.mode == "P":
            img = img.convert("RGBA")

        if needs_rgb and img.mode in ("RGBA", "LA"):
            background = Image.new("RGB", img.size, (255, 255, 255))
            mask = img.split()[-1]  # alpha channel
            background.paste(img.convert("RGB"), mask=mask)
            return background

        return img

    @staticmethod
    def _save_kwargs(fmt: str, quality: int) -> dict:
        """Return keyword arguments for Pillow's save() call."""
        if fmt in ("JPEG", "WEBP"):
            return {"quality": quality, "optimize": True}
        return {}
