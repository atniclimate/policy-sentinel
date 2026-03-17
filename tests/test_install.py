"""Smoke tests verifying the package installs and imports correctly."""


def test_import():
    import policy_sentinel

    assert policy_sentinel is not None


def test_version():
    from policy_sentinel import __version__

    assert __version__ == "0.1.0"


def test_cli_import():
    from policy_sentinel.cli import app

    assert app is not None
