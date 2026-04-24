"""
Image Converter Pro
Entry point — delegates everything to the server layer.
"""

from server.app import ServerApp

if __name__ == "__main__":
    ServerApp().run()