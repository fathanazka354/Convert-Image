"""
core/multipart_parser.py
Responsible for: parsing multipart/form-data from HTTP requests.
"""

class MultipartParser:
    """Parses multipart/form-data bodies manually."""

    def __init__(self, body: bytes, content_type: str):
        self.body = body
        self.content_type = content_type
        self.boundary = self._extract_boundary()

    def parse(self) -> dict[str, bytes]:
        """Parse the body and return a dictionary of {field_name: bytes}."""
        if not self.boundary:
            raise ValueError("No boundary found in Content-Type")

        sep = ("--" + self.boundary).encode()
        parts = {}
        chunks = self.body.split(sep)
        
        for chunk in chunks:
            chunk = chunk.strip(b"\r\n")
            if not chunk or chunk == b"--" or chunk.startswith(b"--"):
                continue

            # Split headers and body
            if b"\r\n\r\n" in chunk:
                headers_raw, data = chunk.split(b"\r\n\r\n", 1)
            elif b"\n\n" in chunk:
                headers_raw, data = chunk.split(b"\n\n", 1)
            else:
                continue
                
            data = data.rstrip(b"\r\n")

            # Parse Content-Disposition to find the field name
            name = None
            for line in headers_raw.decode(errors="ignore").splitlines():
                if "Content-Disposition" in line:
                    for token in line.split(";"):
                        token = token.strip()
                        if token.startswith("name="):
                            name = token[5:].strip('"')
            
            if name:
                parts[name] = data
                
        return parts

    def _extract_boundary(self):
        """Extract the boundary string from the Content-Type header."""
        for part in self.content_type.split(";"):
            part = part.strip()
            if part.startswith("boundary="):
                return part[len("boundary="):].strip()
        return None
