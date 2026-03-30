# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['backend\\main.py'],
    pathex=[],
    binaries=[],
    datas=[('backend/db', 'db'), ('backend/models', 'models'), ('backend/routers', 'routers'), ('backend/services', 'services'), ('backend/schemas', 'schemas')],
    hiddenimports=['chromadb', 'sentence_transformers', 'easyocr', 'fitz', 'fastapi', 'uvicorn', 'sqlalchemy'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='eden-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
