import asyncio
from email.header import Header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from pathlib import Path
import re
import smtplib
from typing import Any, Dict, List, Optional, Union

from app.core.config import settings
from app.shared.logger import get_logger

logger = get_logger(__name__)


def render_html_string(template_content: str, context: Optional[Dict[str, Any]] = None) -> str:
    """
    Renders an HTML template string with dynamic context variables.
    Supports Jinja2 if installed, and falls back to regex placeholder
    replacement for {{ key }} and ${key}.
    """
    context = context or {}

    try:
        import jinja2
        template = jinja2.Template(template_content)
        return template.render(**context)
    except ImportError:
        pass

    result = template_content
    for key, value in context.items():
        pattern = re.compile(r"\{\{\s*" + re.escape(str(key)) + r"\s*\}\}")
        result = pattern.sub(str(value), result)
        dollar_pattern = re.compile(r"\$\{\s*" + re.escape(str(key)) + r"\s*\}")
        result = dollar_pattern.sub(str(value), result)

    return result


def load_and_render_template(
    template_path: Union[str, Path],
    context: Optional[Dict[str, Any]] = None
) -> str:
    """
    Reads an HTML file from disk and renders it with context variables.
    """
    path = Path(template_path)

    if not path.is_absolute():
        path = settings.EMAIL_TEMPLATES_DIR / path

    if not path.exists():
        raise FileNotFoundError(f"Email template file not found at: {path}")

    content = path.read_text(encoding="utf-8")
    return render_html_string(content, context)


class EmailService:
    """
    Service for rendering HTML templates and dispatching emails via SMTP.
    Works seamlessly with Mailpit for local testing and any production SMTP provider.
    """

    def __init__(self):
        self.host = settings.SMTP_HOST
        self.port = settings.SMTP_PORT
        self.user = settings.SMTP_USER
        self.password = settings.SMTP_PASSWORD
        self.tls = settings.SMTP_TLS
        self.ssl = settings.SMTP_SSL
        self.from_email = settings.SMTP_FROM_EMAIL
        self.from_name = settings.SMTP_FROM_NAME
        self.enabled = settings.EMAILS_ENABLED

    def _build_message(
        self,
        to: List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
    ) -> MIMEMultipart:
        """
        """
        sender_email = from_email or self.from_email
        sender_name = from_name or self.from_name

        message = MIMEMultipart("alternative")
        message["Subject"] = Header(subject, "utf-8").encode()
        message["From"] = formataddr((str(Header(sender_name, "utf-8")), sender_email))
        message["To"] = ", ".join(to)

        if text_content:
            part_text = MIMEText(text_content, "plain", "utf-8")
            message.attach(part_text)

        part_html = MIMEText(html_content, "html", "utf-8")
        message.attach(part_html)

        return message

    def _send_sync(
        self,
        to_list: List[str],
        message: MIMEMultipart
    ) -> bool:
        """
        Synchronous SMTP dispatch.
        """
        if not self.enabled:
            logger.info(f"[Email Disabled] Skipped sending '{message['Subject']}' to {to_list}")
            return False

        try:
            if self.ssl:
                server = smtplib.SMTP_SSL(self.host, self.port, timeout=10)
            else:
                server = smtplib.SMTP(self.host, self.port, timeout=10)

            with server:
                if self.tls and not self.ssl:
                    server.starttls()

                if self.user and self.password:
                    server.login(self.user, self.password)

                server.sendmail(message["From"], to_list, message.as_string())

            logger.info(f"Email '{message['Subject']}' sent successfully to {to_list}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_list}: {e}")
            raise e

    async def send_email(
        self,
        to: Union[str, List[str]],
        subject: str,
        template_name: Optional[str] = None,
        template_path: Optional[Union[str, Path]] = None,
        html_content: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        text_content: Optional[str] = None,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
    ) -> bool:
        """
        Asynchronously sends an email rendering an HTML template with dynamic variables.

        Args:
            to: Destination email address or list of addresses.
            subject: Email subject line.
            template_name: File name relative to EMAIL_TEMPLATES_DIR (e.g. 'welcome.html').
            template_path: Absolute or relative Path to template file.
            html_content: Raw HTML string if not using a file.
            context: Dictionary of variables to inject into template (e.g. {{ name }}).
            text_content: Optional plain-text fallback.
            from_email: Optional sender address override.
            from_name: Optional sender display name override.

        Returns:
            bool: True if sent successfully, False otherwise.
        """
        to_list = [to] if isinstance(to, str) else to

        if template_name:
            rendered_html = load_and_render_template(template_name, context)
        elif template_path:
            rendered_html = load_and_render_template(template_path, context)
        elif html_content:
            rendered_html = render_html_string(html_content, context)
        else:
            raise ValueError("Must provide either 'template_name', 'template_path' or 'html_content'.")

        message = self._build_message(
            to=to_list,
            subject=subject,
            html_content=rendered_html,
            text_content=text_content,
            from_email=from_email,
            from_name=from_name,
        )

        return await asyncio.to_thread(self._send_sync, to_list, message)


emailer = EmailService()

