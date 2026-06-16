"""Email service stub — replace with a real SMTP/SES/SendGrid implementation."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, body: str, html_body: str | None = None) -> bool:
    """Send an email. Currently a stub — logs instead of sending.

    Replace this with your preferred email provider:
    - SMTP: smtplib or aiosmtplib
    - AWS SES: boto3.client("ses")
    - SendGrid: sendgrid.SendGridAPIClient
    - Mailgun: requests to Mailgun API
    """
    logger.info(
        "Email send requested (stub)",
        extra={"to": to, "subject": subject},
    )
    # TODO: implement real email sending
    return True


def send_welcome_email(to: str, name: str) -> bool:
    return send_email(
        to=to,
        subject="Welcome!",
        body=f"Hi {name}, welcome to the app.",
    )


def send_password_reset_email(to: str, reset_token: str) -> bool:
    return send_email(
        to=to,
        subject="Password reset request",
        body=f"Use this token to reset your password: {reset_token}",
    )
