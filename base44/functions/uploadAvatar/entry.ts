import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Uploads and sets user avatar with server-side validation.
// Validates: real file type (magic bytes), size (≤5MB), format (JPG/PNG/WebP).
// Stores permanently via UploadPublicFile (service role).
// Updates user.avatar_url (service role to bypass RLS).
// Client-side handles crop/resize/EXIF removal via canvas before sending base64.

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF....WEBP
};

function checkMagicBytes(bytes, type) {
  const sig = ALLOWED_TYPES[type];
  if (!sig) return false;
  for (let i = 0; i < sig.length; i++) {
    if (bytes[i] !== sig[i]) return false;
  }
  // WebP: also check WEBP at offset 8
  if (type === 'image/webp') {
    const webpTag = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (webpTag !== 'WEBP') return false;
  }
  return true;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'غير مصرح — يجب تسجيل الدخول' }, { status: 401 });

    const body = await req.json();
    const { image_base64, content_type, remove } = body;

    // Handle avatar removal
    if (remove) {
      const oldUrl = user.avatar_url || '';
      await base44.asServiceRole.entities.User.update(user.id, { avatar_url: '' });
      return Response.json({ avatar_url: '', removed: true });
    }

    if (!image_base64 || !content_type) {
      return Response.json({ error: 'الصورة ونوعها مطلوبان' }, { status: 400 });
    }

    // Validate content type
    if (!ALLOWED_TYPES[content_type]) {
      return Response.json({ error: 'صيغة غير مدعومة — JPG أو PNG أو WebP فقط' }, { status: 400 });
    }

    // Decode base64 to bytes
    const binaryString = atob(image_base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Validate size
    if (bytes.length > MAX_SIZE_BYTES) {
      return Response.json({ error: 'حجم الصورة يتجاوز 5 ميجابايت' }, { status: 400 });
    }

    if (bytes.length < 100) {
      return Response.json({ error: 'ملف الصورة غير صالح' }, { status: 400 });
    }

    // Validate real type via magic bytes (not just extension/content_type header)
    if (!checkMagicBytes(bytes, content_type)) {
      return Response.json({ error: 'نوع الملف الفعلي لا يطابق الامتداد — ملف غير صالح' }, { status: 400 });
    }

    // Create Blob and File for upload
    const ext = content_type === 'image/jpeg' ? 'jpg' : content_type === 'image/png' ? 'png' : 'webp';
    const fileName = `avatar_${user.id}_${Date.now()}.${ext}`;
    const blob = new Blob([bytes], { type: content_type });
    const file = new File([blob], fileName, { type: content_type });

    // Upload to permanent public storage (service role)
    const result = await base44.asServiceRole.integrations.Core.UploadPublicFile({ file });
    const newUrl = result.file_url;

    if (!newUrl) {
      return Response.json({ error: 'فشل رفع الصورة — حاول مرة أخرى' }, { status: 500 });
    }

    // Update user avatar (service role to bypass RLS — only self can call this function)
    const oldUrl = user.avatar_url || '';
    await base44.asServiceRole.entities.User.update(user.id, { avatar_url: newUrl });

    return Response.json({ avatar_url: newUrl, old_url: oldUrl, updated: true });
  } catch (error) {
    return Response.json({ error: error.message || 'خطأ داخلي في الخادم' }, { status: 500 });
  }
}