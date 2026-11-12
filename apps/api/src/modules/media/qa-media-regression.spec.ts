import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudinaryMediaService } from './cloudinary-media.service';
import { validateMediaFiles } from './validate-media-files';
import { WorkshopOwnJobsController } from '../workshop-jobs/workshop-progress.controller';
import { DeliveriesController } from '../deliveries/deliveries.controller';
import { SalesController } from '../sales/sales.controller';
import type { ImageFile } from './media.types';

const png: ImageFile = { buffer: Buffer.from('89504e470d0a1a0a00000000', 'hex'), mimetype: 'image/png', originalname: 'QA.png' };
describe('QA media validation and post-upload compensation', () => {
  it.each([0, 1, 5])('accepts %i optional workshop photographs', (count) => {
    expect(validateMediaFiles(Array(count).fill(png), 0)).toHaveLength(count);
  });
  it.each([0, 6])('rejects %i required delivery photographs', (count) => {
    expect(() => validateMediaFiles(Array(count).fill(png), 1)).toThrow(BadRequestException);
  });
  it.each([1, 5])('accepts %i required delivery photographs', (count) => {
    expect(validateMediaFiles(Array(count).fill(png), 1)).toHaveLength(count);
  });
  it.each([
    { ...png, mimetype: 'text/plain' },
    { ...png, mimetype: 'image/jpeg' },
    { ...png, buffer: Buffer.from('QA harmless non-image') },
    { ...png, buffer: Buffer.alloc(10 * 1024 * 1024 + 1) }
  ])('rejects invalid MIME, mismatched bytes, non-image and oversized content before upload', (file) => {
    expect(() => validateMediaFiles([file], 0)).toThrow(BadRequestException);
  });
  it('also protects the catalog Cloudinary entrypoint before any network request', () => {
    const media = new CloudinaryMediaService(new ConfigService({}));
    expect(() => media.uploadImage({ ...png, buffer: Buffer.from('QA text') }, 'products')).toThrow(BadRequestException);
  });
  function media() {
    return { uploadImage: jest.fn().mockResolvedValue({ secureUrl: 'https://example.com/qa.png', publicId: 'QA-created-asset' }), scheduleRollback: jest.fn().mockResolvedValue(undefined) };
  }
  it('deletes workshop uploads when the domain changes between precheck and final write', async () => {
    const domainFailure = new BadRequestException('QA concurrent transition');
    const progress = { validateMediaSubmission: jest.fn().mockResolvedValue({ code: 'QA-job', replay: null }), submit: jest.fn().mockRejectedValue(domainFailure) };
    const cloud = media(); const controller = new WorkshopOwnJobsController(progress as never, cloud as never, cloud as never);
    await expect(controller.submitMedia({ id: 'QA-user' }, { id: '1' }, { type: 'PROGRESS', message: 'QA' } as never, [png])).rejects.toBe(domainFailure);
    expect(cloud.scheduleRollback).toHaveBeenCalledWith('workshop-progress', ['QA-created-asset']);
  });
  it('deletes delivery uploads after a domain failure', async () => {
    const failure = new BadRequestException('QA delivery changed');
    const deliveries = { detail: jest.fn().mockResolvedValue({ code: 'QA-delivery' }), complete: jest.fn().mockRejectedValue(failure) };
    const cloud = media(); const controller = new DeliveriesController(deliveries as never, cloud as never, cloud as never);
    await expect(controller.completeMedia({ id: '1' }, { receiverName: 'QA receiver' }, [png], { id: 'QA-user' })).rejects.toBe(failure);
    expect(cloud.scheduleRollback).toHaveBeenCalledWith('deliveries', ['QA-created-asset']);
  });
  it('deletes a payment upload after a concurrent balance change', async () => {
    const failure = new BadRequestException('QA balance changed');
    const sales = { preparePaymentMedia: jest.fn().mockResolvedValue({ code: 'QA-sale' }), registerPayment: jest.fn().mockRejectedValue(failure) };
    const cloud = media(); const controller = new SalesController(sales as never, cloud as never, cloud as never);
    await expect(controller.registerPaymentMedia({ id: '1' }, {} as never, png, { id: 'QA-user' })).rejects.toBe(failure);
    expect(cloud.scheduleRollback).toHaveBeenCalledWith('payments', ['QA-created-asset']);
  });
  it('cleans successful uploads even if another upload fails in the parallel batch', async () => {
    const progress = { validateMediaSubmission: jest.fn().mockResolvedValue({ code: 'QA-job', replay: null }), submit: jest.fn() };
    const cloud = media(); cloud.uploadImage.mockRejectedValueOnce(new Error('QA upload failure'));
    const controller = new WorkshopOwnJobsController(progress as never, cloud as never, cloud as never);
    await expect(controller.submitMedia({ id: 'QA-user' }, { id: '1' }, {} as never, [png, png])).rejects.toThrow('QA upload failure');
    expect(cloud.scheduleRollback).toHaveBeenCalledWith('workshop-progress', ['QA-created-asset']);
    expect(progress.submit).not.toHaveBeenCalled();
  });
});
