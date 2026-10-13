"""Local development settings: verbose errors, relaxed hosts, console email, sandbox gateway."""

from .base import *  # noqa: F401,F403
from .base import REST_FRAMEWORK, config

DEBUG = True
ALLOWED_HOSTS = ["*"]

# Browsable API is handy locally; production serves JSON only.
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "DEFAULT_RENDERER_CLASSES": (
        "djangorestframework_camel_case.render.CamelCaseJSONRenderer",
        "djangorestframework_camel_case.render.CamelCaseBrowsableAPIRenderer",
    ),
}

PAYMENT_GATEWAY = config("PAYMENT_GATEWAY", default="sandbox")
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
