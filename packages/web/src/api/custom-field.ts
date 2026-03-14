import request from './request'

export const getFieldDefinitions = () => request.get('/custom-fields')

export const createFieldDefinition = (data: Record<string, unknown>) =>
  request.post('/custom-fields', data)

export const updateFieldDefinition = (id: number, data: Record<string, unknown>) =>
  request.put(`/custom-fields/${id}`, data)

export const deleteFieldDefinition = (id: number) => request.delete(`/custom-fields/${id}`)
