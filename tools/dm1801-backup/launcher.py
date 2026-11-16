import sys

sys.path.insert(0, __import__("os").path.join(__import__("os").path.dirname(__import__("os").path.abspath(__file__)), "src"))

from dm1801_backup.__main__ import cli  # noqa: E402

if __name__ == "__main__":
    if len(sys.argv) > 1:
        sys.exit(cli(sys.argv[1:]))
    from dm1801_backup.gui import main
    main()
