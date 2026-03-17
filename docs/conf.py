"""Sphinx configuration for policy-sentinel documentation."""

project = "policy-sentinel"
author = "ATNI Climate Resilience Program"
copyright = "2026, ATNI Climate Resilience Program"  # noqa: A001

extensions = [
    "sphinx.ext.napoleon",
    "sphinx.ext.intersphinx",
    "sphinx.ext.viewcode",
    "autoapi.extension",
    "sphinx_autodoc_typehints",
    "myst_parser",
    "sphinx_design",
    "sphinx_copybutton",
]

# Theme
html_theme = "furo"
html_theme_options = {
    "source_repository": "https://github.com/atniclimate/policy-sentinel",
    "source_branch": "main",
    "source_directory": "docs/",
}

# Napoleon (NumPy docstrings)
napoleon_numpy_docstring = True
napoleon_google_docstring = False

# AutoAPI (static analysis — no imports)
autoapi_dirs = ["../src/policy_sentinel"]
autoapi_type = "python"

# MyST (Markdown narrative pages)
myst_enable_extensions = ["colon_fence", "deflist"]

# Intersphinx
intersphinx_mapping = {
    "python": ("https://docs.python.org/3", None),
    "pydantic": ("https://docs.pydantic.dev/latest/", None),
}
