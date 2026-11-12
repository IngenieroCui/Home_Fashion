const { randomUUID } = require('node:crypto');

if (process.env.NODE_ENV !== 'test' || process.env.E2E_DEDICATED !== 'true' ||
    process.env.DB_HOST !== '127.0.0.1' || process.env.HF_E2E_ISOLATED_CLOUDINARY === 'true') {
  throw new Error('Controlled media requires the isolated E2E process');
}

process.env.CLOUDINARY_CLOUD_NAME = 'hf-e2e-controlled';
process.env.CLOUDINARY_API_KEY = 'controlled-key';
process.env.CLOUDINARY_API_SECRET = 'controlled-fixture';

const fetchUpstream = globalThis.fetch;
globalThis.fetch = async (input, options) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (url.hostname !== 'api.cloudinary.com') return fetchUpstream(input, options);
  const form = options?.body;
  const folder = form instanceof FormData ? form.get('folder') : undefined;
  if (url.pathname !== '/v1_1/hf-e2e-controlled/image/upload' ||
      !folder?.startsWith(`${process.env.CLOUDINARY_ROOT_FOLDER}/`) ||
      form.get('type') !== 'authenticated' || !(form.get('file') instanceof Blob)) {
    return Response.json({}, { status: 400 });
  }
  const publicId = `${folder}/${randomUUID()}`;
  return Response.json({
    public_id: publicId,
    secure_url: `https://res.cloudinary.com/hf-e2e-controlled/image/authenticated/v1/${publicId}.webp`
  });
};
