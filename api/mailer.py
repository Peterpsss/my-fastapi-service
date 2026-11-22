"""Tiny SMTP mail sender (standard library only) used for the sign-up confirmation email.

Environment variables (set them in Vercel -> Settings -> Environment Variables):
  SMTP_HOST      e.g. smtp.gmail.com  or  smtp-relay.brevo.com
  SMTP_PORT      587 (STARTTLS, default) or 465 (SSL)
  SMTP_USER      the SMTP login (for Gmail: your full Gmail address)
  SMTP_PASSWORD  the SMTP password (for Gmail: a 16-character "App password", NOT your normal password)
  SMTP_FROM      optional sender address (defaults to SMTP_USER)
  MAIL_FROM_NAME optional display name (default "YouTuber Archive")
"""
import os
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr


def configured() -> bool:
    return bool(os.getenv("SMTP_HOST") and os.getenv("SMTP_USER") and os.getenv("SMTP_PASSWORD"))


def send_mail(to: str, subject: str, text: str, html: str = "") -> None:
    """Send one email. Raises on any failure so the caller can undo whatever depended on it."""
    host = os.getenv("SMTP_HOST", "")
    port = int(os.getenv("SMTP_PORT", "587") or 587)
    user = os.getenv("SMTP_USER", "")
    password = os.getenv("SMTP_PASSWORD", "")
    sender = os.getenv("SMTP_FROM") or user
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = formataddr((os.getenv("MAIL_FROM_NAME", "YouTuber Archive"), sender))
    msg["To"] = to
    msg.set_content(text)
    if html:
        msg.add_alternative(html, subtype="html")
    context = ssl.create_default_context()
    if port == 465:
        server = smtplib.SMTP_SSL(host, port, timeout=15, context=context)
    else:
        server = smtplib.SMTP(host, port, timeout=15)
        server.ehlo()
        server.starttls(context=context)
        server.ehlo()
    try:
        server.login(user, password)
        server.send_message(msg)
    finally:
        try:
            server.quit()
        except Exception:
            pass


def confirmation_email(username: str, link: str):
    """-> (subject, plain text, html) for the 'confirm your email' message."""
    subject = "Confirm your email - YouTuber Archive"
    text = (f"Hi {username},\n\nWelcome to the YouTuber Archive! Confirm your email address to unlock every creator profile, "
            f"channel links and top videos:\n\n{link}\n\nThis link works for 24 hours. If you did not create an account, ignore this email.\n")
    html = f"""<div style="font-family:Roboto,Arial,sans-serif;background:#0f0f0f;padding:32px">
  <div style="max-width:480px;margin:auto;background:#181818;border-radius:16px;padding:32px;color:#f1f1f1">
    <div style="font-size:22px;font-weight:700"><span style="background:#ff0000;color:#fff;border-radius:6px;padding:2px 8px">&#9654;</span> YouTuber Archive</div>
    <h2 style="margin:24px 0 8px">Confirm your email</h2>
    <p style="color:#aaa;line-height:1.5">Hi {username}, one quick step: confirm this address to unlock every creator profile, channel links and top videos.</p>
    <p style="margin:28px 0"><a href="{link}" style="background:#ff0000;color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px;display:inline-block">Confirm my email</a></p>
    <p style="color:#717171;font-size:12px;line-height:1.5">Or paste this link into your browser:<br>{link}<br><br>The link works for 24 hours. If you didn't create an account, you can ignore this message.</p>
  </div></div>"""
    return subject, text, html
