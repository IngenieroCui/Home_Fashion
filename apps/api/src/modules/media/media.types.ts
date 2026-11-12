export type MediaKind = 'products' | 'workshop-progress' | 'deliveries' | 'payments';
export type MediaUpload = { secureUrl: string; publicId: string; width?: number; height?: number; bytes?: number; format?: string };
export type ImageFile = { buffer: Buffer; mimetype: string; originalname: string };
