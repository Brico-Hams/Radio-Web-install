import os
import sys

mode = os.environ.get("FAKE_MODE", "ok")
if sys.argv[1:] != ["-r"]:
    sys.exit(9)
if mode == "noradio":
    print("Cannot open HID device", file=sys.stderr)
    sys.exit(255)
header = b"XXXX" if mode == "badheader" else b"1801"
open("device.img", "wb").write(header + bytes(1024))
open("device.conf", "w").write("synthetic\n")
