import { NextResponse } from 'next/server';

const MAX_TEXT_LENGTH = 50_000;
const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 254;
const MAX_PHONE_LENGTH = 40;
const MAX_ATTACHMENTS = 5;

function escapeHtml(value: string) {
	return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
}

function boundedString(value: unknown, maxLength: number) {
	return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const text = boundedString(body.text, MAX_TEXT_LENGTH);
		const anonymous = body.anonymous === true;
		const name = boundedString(body.name, MAX_NAME_LENGTH);
		const email = boundedString(body.email, MAX_EMAIL_LENGTH);
		const phone = boundedString(body.phone, MAX_PHONE_LENGTH);
		const attachments = Array.isArray(body.attachments) ? body.attachments.slice(0, MAX_ATTACHMENTS) : [];

		if (!text || typeof text !== 'string' || text.trim().length === 0) {
			return NextResponse.json({ error: 'Message is required' }, { status: 400 });
		}

		const senderInfo = anonymous
			? 'Anonymous'
			: [
					name ? `Name: ${name}` : null,
					email ? `Email: ${email}` : null,
					phone ? `Phone: ${phone}` : null,
				]
					.filter(Boolean)
					.join('\n');

		const subject = anonymous
			? '[INTHEMAKING] Anonymous Note'
			: `[INTHEMAKING] Note from ${name || 'Unknown'}`;

		if (email && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
			return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
		}

		const attachmentCount = attachments.length;

		const htmlBody = `
			<div style="font-family: 'Courier New', monospace; color: #333; max-width: 600px;">
				<p style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: #999; margin-bottom: 24px;">
					${anonymous ? 'Anonymous Note' : 'Identified Note'}
				</p>
				${
					!anonymous
						? `<div style="border-left: 2px solid #eee; padding-left: 16px; margin-bottom: 24px; font-size: 13px; color: #666;">
						${name ? `<p><strong>Name:</strong> ${escapeHtml(name)}</p>` : ''}
						${email ? `<p><strong>Email:</strong> ${escapeHtml(email)}</p>` : ''}
						${phone ? `<p><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : ''}
					</div>`
						: ''
				}
				<div style="white-space: pre-wrap; font-size: 14px; line-height: 1.7; color: #222;">
					${escapeHtml(text)}
				</div>
				${
					attachmentCount > 0
						? `<p style="font-size: 11px; color: #999; margin-top: 24px;">${attachmentCount} attachment${attachmentCount > 1 ? 's' : ''} included below</p>`
						: ''
				}
				<hr style="border: none; border-top: 1px solid #eee; margin: 32px 0 16px;" />
				<p style="font-size: 10px; color: #bbb; text-transform: uppercase; letter-spacing: 0.15em;">
					Sent via INTHEMAKING
				</p>
			</div>
		`;

		// Try Resend if API key is available
		const resendKey = process.env.RESEND_API_KEY;
		if (resendKey) {
			// Build Resend attachments from base64 data URIs
			const resendAttachments = (attachments || []).map(
				(att: { name: string; type: string; data: string }) => {
					// data is a data URI like "data:image/png;base64,iVBO..."
					const base64Content = att.data.split(',')[1] || att.data;
					return {
						filename: att.name,
						content: base64Content,
					};
				}
			);

			const res = await fetch('https://api.resend.com/emails', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${resendKey}`,
				},
				body: JSON.stringify({
					from: 'INTHEMAKING <onboarding@resend.dev>',
					to: 'skybrunofilms@gmail.com',
					subject,
					html: htmlBody,
					reply_to: !anonymous && email ? email : undefined,
					attachments: resendAttachments.length > 0 ? resendAttachments : undefined,
				}),
			});

			if (res.ok) {
				return NextResponse.json({ success: true });
			}

			const errBody = await res.text();
			console.error(`[INTHEMAKING] Resend error ${res.status}: ${errBody}`);
			// Still return success to the user -- note was received, just email delivery failed
			return NextResponse.json({ success: true, emailDelivery: false });
		}

		// No Resend key -- log to server console
		console.log(`[INTHEMAKING NOTE] ${subject}\n${senderInfo}\n\n${text.trim()}`);
		return NextResponse.json({ success: true, emailDelivery: false });
	} catch {
		return NextResponse.json({ error: 'Internal error' }, { status: 500 });
	}
}
