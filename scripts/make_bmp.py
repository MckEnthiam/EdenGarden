import struct
import os

width = 164
height = 314
filename = os.path.join(os.path.dirname(__file__), "..", "assets", "installer-sidebar.bmp")

# BMP Header
file_type = b"BM"
reserved_1 = 0
reserved_2 = 0
offset = 54

# DIB Header
header_size = 40
planes = 1
bits_per_pixel = 24
compression = 0
image_size = 0  # Can be 0 for uncompressed
x_pixels_per_m = 2835  # 72 DPI
y_pixels_per_m = 2835
colors_used = 0
colors_important = 0

# Terracotta color: (226, 114, 91)
# BGR format: (91, 114, 226) -> but we might want a gradient or just solid
b, g, r = 91, 114, 226

# Create pixels
# Web-safe row padding: row size in bytes must be a multiple of 4
row_padding = (4 - (width * 3) % 4) % 4
pixel_data = bytearray()

for y in range(height):
    for x in range(width):
        pixel_data.extend([b, g, r])
    pixel_data.extend([0] * row_padding)

file_size = offset + len(pixel_data)

with open(filename, "wb") as f:
    # File Header
    f.write(file_type)
    f.write(struct.pack("<I", file_size))
    f.write(struct.pack("<H", reserved_1))
    f.write(struct.pack("<H", reserved_2))
    f.write(struct.pack("<I", offset))
    # DIB Header
    f.write(struct.pack("<I", header_size))
    f.write(struct.pack("<i", width))
    f.write(struct.pack("<i", height))  # Positive height = bottom-up
    f.write(struct.pack("<H", planes))
    f.write(struct.pack("<H", bits_per_pixel))
    f.write(struct.pack("<I", compression))
    f.write(struct.pack("<I", image_size))
    f.write(struct.pack("<i", x_pixels_per_m))
    f.write(struct.pack("<i", y_pixels_per_m))
    f.write(struct.pack("<I", colors_used))
    f.write(struct.pack("<I", colors_important))
    
    # Pixel Data
    f.write(pixel_data)

print("BMP file generated successfully.")
