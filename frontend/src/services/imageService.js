import { apiGet, apiUpload, apiDelete } from './apiClient.js';

export function normalizeImage(data) {
  return {
    id: String(data.id),
    patientId: String(data.patientId),
    fileName: data.fileName || '',
    storagePath: data.storagePath || '',
    downloadUrl: data.downloadUrl || '',
    imageType: data.imageType || 'xray',
    toothNumber: data.toothNumber || '',
    notes: data.notes || '',
    uploadedBy: data.uploadedBy || '',
    uploadedByName: data.uploadedByName || '',
    created_at: data.created_at
  };
}

export const imageService = {
  async getByPatient(patientId) {
    const res = await apiGet(`/images/${patientId}`);
    return res.data.map(normalizeImage);
  },

  async uploadXray(patientId, file, { toothNumber, notes, imageType } = {}) {
    if (!file) throw new Error('No file selected');
    if (!file.type.startsWith('image/')) throw new Error('Only image files are allowed');
    if (file.size > 20 * 1024 * 1024) throw new Error('File must be under 20 MB');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('toothNumber', toothNumber || '');
    formData.append('notes', notes || '');
    formData.append('imageType', imageType || 'xray');

    const res = await apiUpload(`/images/${patientId}`, formData);
    return res.data;
  },

  async deleteImage(imageId) {
    await apiDelete(`/images/${imageId}`);
  }
};
