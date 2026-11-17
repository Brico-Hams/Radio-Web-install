#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Compatibilidade com a v0.1: `python ftx1_cat_menu.py` continua funcionando.
O código agora vive no pacote `ftx1cat` (use `python -m ftx1cat --help`).
"""

import sys

from ftx1cat.__main__ import main

if __name__ == "__main__":
    sys.exit(main())
